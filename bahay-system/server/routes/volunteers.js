/** FR-06 registration, FR-07 notifications, FR-08 profiles and hours, FR-09 certificates. */
const router = require('express').Router();
const { Volunteer, VolunteerActivity } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction, setTarget } = require('../middleware/activityLog');
const mailer = require('../utils/mailer');
const pdf = require('../utils/pdf');

/* ---------------------------------------------------------------- public */

/** FR-06 + FR-07: public registration, acknowledgement email sent at once. */
router.post('/apply', async (req, res, next) => {
  try {
    const b = req.body;
    const required = ['full_name', 'email', 'contact_info', 'home_address'];
    const missing = required.filter(f => !b[f]);
    if (missing.length) {
      return res.status(400).json({ message: 'Please complete the form.', missing });
    }

    const volunteer = await Volunteer.create({
      applicant_type:     b.applicant_type,
      full_name:          b.full_name,
      email:              String(b.email).toLowerCase(),
      contact_info:       b.contact_info,
      home_address:       b.home_address,
      gender:             b.gender,
      civil_status:       b.civil_status,
      date_of_birth:      b.date_of_birth || null,
      availability:       b.availability,
      area_of_service:    b.area_of_service,
      reason:             b.reason,
      wants_event_emails: Boolean(b.wants_event_emails),
    });

    await mailer.send(mailer.volunteerAcknowledgement(volunteer));

    res.status(201).json({
      message: 'Application received. Check your email for the confirmation.',
      reference: volunteer._id,
    });
  } catch (err) { next(err); }
});

/* ----------------------------------------------------------------- admin */

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) filter.$or = [
      { full_name: new RegExp(String(q), 'i') },
      { email: new RegExp(String(q), 'i') },
    ];
    const list = await Volunteer.find(filter)
      .populate('reviewed_by', 'full_name')
      .sort({ application_date: -1 })
      .limit(Number(req.query.limit) || 100);
    res.json(list);
  } catch (err) { next(err); }
});

router.get('/counts', async (req, res, next) => {
  try {
    const rows = await Volunteer.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
    const counts = { Pending: 0, Approved: 0, Rejected: 0 };
    rows.forEach(r => { counts[r._id] = r.n; });
    res.json(counts);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const v = await Volunteer.findById(req.params.id).populate('reviewed_by', 'full_name');
    if (!v) return res.status(404).json({ message: 'Volunteer not found.' });
    const activities = await VolunteerActivity.find({ volunteer_id: v._id })
      .populate('recorded_by', 'full_name').sort({ service_date: -1 });
    const total_hours = activities.reduce((s, a) => s + a.hours, 0);
    res.json({ volunteer: v, activities, total_hours });
  } catch (err) { next(err); }
});

/** FR-07 — review decision plus the formal result email. */
router.post('/:id/review', logAction('Update', 'Volunteer Applications',
  req => 'Marked ' + req.body.decision),
  async (req, res, next) => {
    try {
      const { decision, orientation } = req.body;
      if (!['Approved', 'Rejected'].includes(decision)) {
        return res.status(400).json({ message: 'Decision must be Approved or Rejected.' });
      }
      const v = await Volunteer.findById(req.params.id);
      if (!v) return res.status(404).json({ message: 'Volunteer not found.' });
      if (v.status !== 'Pending') {
        return res.status(409).json({ message: 'This application was already ' + v.status.toLowerCase() + '.' });
      }

      v.status = decision;
      v.reviewed_by = req.user._id;
      v.reviewed_at = new Date();
      await v.save();

      await mailer.send(mailer.volunteerDecision(v, decision === 'Approved', orientation));
      setTarget(res, v._id);
      res.json({ message: 'Application ' + decision.toLowerCase() + '. Email sent to ' + v.email + '.', volunteer: v });
    } catch (err) { next(err); }
  });

/** FR-08 — log service hours. */
router.post('/:id/hours', logAction('Create', 'Service Hours'), async (req, res, next) => {
  try {
    const { service_date, hours, activity_description, event_id } = req.body;
    if (!service_date || hours == null) {
      return res.status(400).json({ message: 'Service date and hours are required.' });
    }
    if (Number(hours) <= 0 || Number(hours) > 24) {
      return res.status(422).json({ message: 'Hours must be between 0 and 24 for a single day.' });
    }
    const v = await Volunteer.findById(req.params.id);
    if (!v) return res.status(404).json({ message: 'Volunteer not found.' });
    if (v.status !== 'Approved') {
      return res.status(409).json({ message: 'Only an approved volunteer can have service hours logged.' });
    }
    const activity = await VolunteerActivity.create({
      volunteer_id: v._id,
      event_id: event_id || null,
      service_date,
      hours: Number(hours),
      activity_description,
      recorded_by: req.user._id,
    });
    setTarget(res, activity._id);
    res.status(201).json(activity);
  } catch (err) { next(err); }
});

/** FR-09 — generate the Certificate of Appreciation PDF. */
router.post('/:id/certificate', requireRole('Admin'),
  logAction('Create', 'Certificates'), async (req, res, next) => {
    try {
      const v = await Volunteer.findById(req.params.id);
      if (!v) return res.status(404).json({ message: 'Volunteer not found.' });

      const activities = await VolunteerActivity.find({ volunteer_id: v._id }).sort({ service_date: 1 });
      if (!activities.length) {
        return res.status(409).json({ message: 'No service hours have been logged for this volunteer yet.' });
      }
      const total = activities.reduce((s, a) => s + a.hours, 0);
      const minimum = Number(process.env.CERTIFICATE_MIN_HOURS || 20);
      if (total < minimum) {
        return res.status(409).json({
          message: 'This volunteer has ' + total + ' hours. A certificate needs at least ' + minimum + '.',
          total_hours: total, required: minimum,
        });
      }

      const cert = v.certificates.create({
        activity: req.body.activity || v.area_of_service || 'Volunteer service',
        service_start: activities[0].service_date,
        service_end: activities[activities.length - 1].service_date,
        total_hours: total,
        issued_by: req.user._id,
      });
      cert.file_path = pdf.certificate(v, cert);
      v.certificates.push(cert);
      await v.save();

      setTarget(res, v._id);
      res.status(201).json({ message: 'Certificate generated.', certificate: cert });
    } catch (err) { next(err); }
  });

module.exports = router;
