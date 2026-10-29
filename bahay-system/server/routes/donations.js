/**
 * FR-11 donor report with dual-party verification, FR-12 monitoring and
 * donor classification, FR-13 inventory inflow. Panel item 7: duplicate check.
 */
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Donation, WishlistItem, InventoryLog } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction, setTarget } = require('../middleware/activityLog');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'proof');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) =>
      cb(null, Date.now() + '-' + file.originalname.replace(/[^\w.\-]/g, '_')),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },     // 5 MB, as the form states
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Upload a JPG or PNG image.'), ok);
  },
});

/**
 * Panel item 7 — flag a donation that looks like one already on record.
 * Same reference number, or same donor and amount on the same day.
 */
async function findPossibleDuplicate({ reference_number, donor_name, amount, date_donated }) {
  if (reference_number) {
    const byRef = await Donation.findOne({ reference_number: String(reference_number).trim() });
    if (byRef) return { reason: 'same reference number', existing: byRef };
  }
  if (donor_name && amount != null && date_donated) {
    const day = new Date(date_donated);
    const start = new Date(day); start.setHours(0, 0, 0, 0);
    const end = new Date(day); end.setHours(23, 59, 59, 999);
    const byDonor = await Donation.findOne({
      donor_name, amount, date_donated: { $gte: start, $lte: end },
    });
    if (byDonor) return { reason: 'same donor and amount on the same day', existing: byDonor };
  }
  return null;
}

/* ---------------------------------------------------------------- public */

/** FR-11 — the donor reports an e-wallet or bank transfer they already sent. */
router.post('/report', upload.single('proof_of_payment'), async (req, res, next) => {
  try {
    const b = req.body;
    const required = ['donation_method', 'amount', 'reference_number', 'transaction_date'];
    const missing = required.filter(f => !b[f]);
    if (missing.length) {
      return res.status(400).json({ message: 'Please complete the form.', missing });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Attach a screenshot or photo of your receipt.' });
    }

    const dup = await findPossibleDuplicate({
      reference_number: b.reference_number,
      donor_name: b.donor_name,
      amount: b.amount,
      date_donated: b.transaction_date,
    });
    if (dup) {
      // Not an error for the donor: staff will reconcile it.
      console.warn('[donations] possible duplicate on report:', dup.reason);
    }

    const donation = await Donation.create({
      donor_classification: b.donor_name ? (b.donor_classification || 'Individual') : 'Anonymous',
      donor_name:       b.donor_name || null,
      donor_contact:    b.donor_contact || null,
      wants_event_emails: Boolean(b.wants_event_emails),
      donation_type:    'Monetary',
      amount:           b.amount,
      donation_method:  b.donation_method,
      reference_number: String(b.reference_number).trim(),
      transaction_date: b.transaction_date,
      proof_of_payment: path.relative(path.join(__dirname, '..'), req.file.path),
      date_donated:     b.transaction_date,
      verification_status: 'Pending',
      source:           'Donor report',
    });

    res.status(201).json({
      message: 'Thank you. Your report is with our staff for verification.',
      reference: donation.reference_number,
      possible_duplicate: dup ? dup.reason : null,
    });
  } catch (err) { next(err); }
});

/* ----------------------------------------------------------------- admin */

router.use(requireAuth);

/** FR-12 — the donation monitoring list. */
router.get('/', async (req, res, next) => {
  try {
    const { type, verification, month, q } = req.query;
    const filter = {};
    if (type) filter.donation_type = type;
    if (verification) filter.verification_status = verification;
    if (month) {
      const [m, y] = String(month).split('-').map(Number);
      filter.date_donated = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
    }
    if (q) filter.$or = [
      { donor_name: new RegExp(String(q), 'i') },
      { reference_number: new RegExp(String(q), 'i') },
    ];
    const list = await Donation.find(filter)
      .populate('recorded_by verified_by', 'full_name')
      .populate('wishlist_item_id', 'item_name')
      .sort({ date_donated: -1 })
      .limit(Number(req.query.limit) || 100);
    res.json(list.map(d => d.toJSONWithAmount()));
  } catch (err) { next(err); }
});

router.get('/summary', async (req, res, next) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monetary] = await Donation.aggregate([
      { $match: { donation_type: 'Monetary', date_donated: { $gte: start } } },
      { $group: { _id: null, total: { $sum: '$amount' }, n: { $sum: 1 } } },
    ]);
    const inkind = await Donation.countDocuments({ donation_type: 'In-kind', date_donated: { $gte: start } });
    const pending = await Donation.countDocuments({ verification_status: 'Pending' });
    const donors = await Donation.distinct('donor_name', { date_donated: { $gte: start } });
    res.json({
      monetary_this_month: monetary ? parseFloat(monetary.total.toString()) : 0,
      inkind_items_this_month: inkind,
      donations_logged: (monetary ? monetary.n : 0) + inkind,
      unique_donors: donors.filter(Boolean).length,
      pending_verification: pending,
    });
  } catch (err) { next(err); }
});

/** Panel item 7 — staff can check before saving. */
router.get('/check-duplicate', async (req, res, next) => {
  try {
    const dup = await findPossibleDuplicate(req.query);
    res.json(dup
      ? { duplicate: true, reason: dup.reason, existing: dup.existing.toJSONWithAmount() }
      : { duplicate: false });
  } catch (err) { next(err); }
});

/** FR-12 + FR-13 — staff log a donation; in-kind adds to the Wishlist. */
router.post('/', logAction('Create', 'Donation Records'), async (req, res, next) => {
  try {
    const b = req.body;
    if (!['Monetary', 'In-kind'].includes(b.donation_type)) {
      return res.status(400).json({ message: 'Donation type must be Monetary or In-kind.' });
    }

    if (!b.force) {
      const dup = await findPossibleDuplicate(b);
      if (dup) {
        return res.status(409).json({
          message: 'A donation with the ' + dup.reason + ' is already on record. ' +
                   'Check it before saving so the same donation is not counted twice.',
          reason: dup.reason,
          existing: dup.existing.toJSONWithAmount(),
          hint: 'Send force: true to record it anyway.',
        });
      }
    }

    const donation = await Donation.create({
      donor_classification: b.donor_classification || 'Individual',
      donor_name:    b.donor_classification === 'Anonymous' ? null : (b.donor_name || null),
      donor_contact: b.donor_contact || null,
      donation_type: b.donation_type,
      amount:            b.donation_type === 'Monetary' ? b.amount : null,
      donation_method:   b.donation_method,
      reference_number:  b.reference_number ? String(b.reference_number).trim() : null,
      transaction_date:  b.transaction_date || null,
      item_description:  b.donation_type === 'In-kind' ? b.item_description : null,
      quantity:          b.donation_type === 'In-kind' ? Number(b.quantity || 0) : null,
      wishlist_item_id:  b.wishlist_item_id || null,
      date_donated:      b.date_donated || new Date(),
      verification_status: b.donation_type === 'Monetary' ? 'Pending' : 'Verified',
      verified_by:  b.donation_type === 'In-kind' ? req.user._id : null,
      verified_at:  b.donation_type === 'In-kind' ? new Date() : null,
      source: 'Staff entry',
      recorded_by: req.user._id,
    });

    // FR-13 inflow: an in-kind donation against a listed need raises the stock.
    let wishlist = null;
    if (donation.donation_type === 'In-kind' && donation.wishlist_item_id && donation.quantity > 0) {
      wishlist = await WishlistItem.findById(donation.wishlist_item_id);
      if (wishlist) {
        wishlist.current_quantity += donation.quantity;
        wishlist.recomputeStatus();
        await wishlist.save();
        await InventoryLog.create({
          wishlist_item_id: wishlist._id,
          action: 'Inflow',
          quantity: donation.quantity,
          note: 'Donation from ' + (donation.donor_name || 'anonymous donor'),
          recorded_by: req.user._id,
        });
      }
    }

    setTarget(res, donation._id);
    res.status(201).json({ donation: donation.toJSONWithAmount(), wishlist });
  } catch (err) { next(err); }
});

/** FR-12 — verify a reported monetary transaction against the facility account. */
router.post('/:id/verify', logAction('Update', 'Donation Records',
  req => 'Marked ' + req.body.decision),
  async (req, res, next) => {
    try {
      const decision = req.body.decision === 'Rejected' ? 'Rejected' : 'Verified';
      const d = await Donation.findById(req.params.id);
      if (!d) return res.status(404).json({ message: 'Donation not found.' });
      d.verification_status = decision;
      d.verified_by = req.user._id;
      d.verified_at = new Date();
      await d.save();
      setTarget(res, d._id);
      res.json(d.toJSONWithAmount());
    } catch (err) { next(err); }
  });

/** Deleting a record is a Super Admin action. */
router.delete('/:id', requireRole('Super Admin'),
  logAction('Delete', 'Donation Records'), async (req, res, next) => {
    try {
      const d = await Donation.findByIdAndDelete(req.params.id);
      if (!d) return res.status(404).json({ message: 'Donation not found.' });
      setTarget(res, d._id);
      res.json({ message: 'Donation record deleted.' });
    } catch (err) { next(err); }
  });

module.exports = router;
