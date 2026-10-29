/**
 * FR-14 Graphical Reports (the panel renamed Analytics to Reporting) and
 * FR-15 the printable monthly report. Aggregation only — no AI, no
 * recommendation engine, matching the Delimitations.
 */
const router = require('express').Router();
const { Donation, VolunteerActivity, Volunteer, WishlistItem, Event, MonthlyReport, ActivityLog } =
  require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction, setTarget } = require('../middleware/activityLog');
const pdf = require('../utils/pdf');

router.use(requireAuth);

/** Dashboard tiles. */
router.get('/overview', async (req, res, next) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const [monetary] = await Donation.aggregate([
      { $match: { donation_type: 'Monetary', verification_status: 'Verified',
                  date_donated: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const [hours] = await VolunteerActivity.aggregate([
      { $match: { service_date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$hours' } } },
    ]);

    res.json({
      active_volunteers: await Volunteer.countDocuments({ status: 'Approved' }),
      pending_applications: await Volunteer.countDocuments({ status: 'Pending' }),
      financial_donations: monetary ? parseFloat(monetary.total.toString()) : 0,
      volunteer_hours: hours ? hours.total : 0,
      pending_verification: await Donation.countDocuments({ verification_status: 'Pending' }),
      low_stock: await WishlistItem.countDocuments({ status: 'Needed' }),
    });
  } catch (err) { next(err); }
});

/** FR-14 — monthly donation trend, last 12 months. */
router.get('/donation-trends', async (req, res, next) => {
  try {
    const months = Number(req.query.months || 12);
    const start = new Date();
    start.setMonth(start.getMonth() - (months - 1));
    start.setDate(1); start.setHours(0, 0, 0, 0);

    const rows = await Donation.aggregate([
      { $match: { date_donated: { $gte: start } } },
      { $group: {
          _id: { y: { $year: '$date_donated' }, m: { $month: '$date_donated' } },
          monetary: { $sum: { $cond: [{ $eq: ['$donation_type', 'Monetary'] }, '$amount', 0] } },
          inkind:   { $sum: { $cond: [{ $eq: ['$donation_type', 'In-kind'] }, 1, 0] } },
          count:    { $sum: 1 },
      } },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]);

    res.json(rows.map(r => ({
      month: String(r._id.m).padStart(2, '0') + '-' + r._id.y,
      monetary: parseFloat(r.monetary.toString()),
      inkind: r.inkind,
      count: r.count,
    })));
  } catch (err) { next(err); }
});

/** FR-14 — volunteer distribution by area of service. */
router.get('/volunteer-distribution', async (req, res, next) => {
  try {
    const rows = await Volunteer.aggregate([
      { $match: { status: 'Approved' } },
      { $group: { _id: { $ifNull: ['$area_of_service', 'Unassigned'] }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]);
    const total = rows.reduce((s, r) => s + r.n, 0);
    res.json({
      total,
      areas: rows.map(r => ({
        area: r._id, count: r.n,
        percent: total ? Math.round((r.n / total) * 100) : 0,
      })),
    });
  } catch (err) { next(err); }
});

/** FR-14 — stock against the minimum threshold. */
router.get('/inventory-levels', async (req, res, next) => {
  try {
    const items = await WishlistItem.find()
      .select('item_name unit current_quantity min_threshold target_quantity status')
      .sort({ item_name: 1 });
    res.json(items.map(i => ({
      item_name: i.item_name,
      unit: i.unit,
      in_stock: i.current_quantity,
      min_threshold: i.min_threshold,
      target_quantity: i.target_quantity,
      status: i.status,
      below_threshold: i.current_quantity < i.min_threshold,
    })));
  } catch (err) { next(err); }
});

/** FR-15 — compile, store and render the monthly report. */
router.post('/monthly', logAction('Export', 'Monthly Reports',
  req => 'Generated ' + req.body.report_month),
  async (req, res, next) => {
    try {
      const month = req.body.report_month;           // MM-YYYY
      if (!/^\d{2}-\d{4}$/.test(String(month || ''))) {
        return res.status(400).json({ message: 'Give the month as MM-YYYY, for example 03-2026.' });
      }
      const [m, y] = month.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      const range = { $gte: start, $lt: end };

      const [monetary] = await Donation.aggregate([
        { $match: { donation_type: 'Monetary', verification_status: 'Verified', date_donated: range } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const [hours] = await VolunteerActivity.aggregate([
        { $match: { service_date: range } },
        { $group: { _id: null, total: { $sum: '$hours' } } },
      ]);

      const report = await MonthlyReport.create({
        report_month: month,
        generated_by: req.user._id,
        total_monetary_donations: monetary ? monetary.total : 0,
        total_inkind_donations: await Donation.countDocuments({ donation_type: 'In-kind', date_donated: range }),
        total_volunteer_hours: hours ? hours.total : 0,
        total_events: await Event.countDocuments({ event_date: range }),
      });

      const donations = await Donation.find({ date_donated: range }).sort({ date_donated: 1 });
      report.file_path = pdf.monthlyReport(
        { ...report.toObject(), total_monetary_donations: monetary ? parseFloat(monetary.total.toString()) : 0 },
        { donations: donations.map(d => d.toJSONWithAmount()) });
      await report.save();

      setTarget(res, report._id);
      res.status(201).json({
        message: 'Report generated.',
        report: { ...report.toObject(),
                  total_monetary_donations: monetary ? parseFloat(monetary.total.toString()) : 0 },
      });
    } catch (err) { next(err); }
  });

router.get('/monthly', async (req, res, next) => {
  try {
    const list = await MonthlyReport.find().populate('generated_by', 'full_name')
      .sort({ generated_at: -1 }).limit(50);
    res.json(list.map(r => ({
      ...r.toObject(),
      total_monetary_donations: parseFloat(r.total_monetary_donations.toString()),
    })));
  } catch (err) { next(err); }
});

/** FR-02 — the audit trail. */
router.get('/activity-log', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.module) filter.module = req.query.module;
    if (req.query.action) filter.action = req.query.action;
    const log = await ActivityLog.find(filter)
      .populate('user_id', 'full_name role')
      .sort({ timestamp: -1 })
      .limit(Number(req.query.limit) || 200);
    res.json(log);
  } catch (err) { next(err); }
});

module.exports = router;
