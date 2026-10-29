/** FR-03 public content, FR-04 FAQ chatbot, FR-05 CMS and announcements. */
const router = require('express').Router();
const { Event, Faq, ContactInquiry, Volunteer, Donation, OrganizationInfo } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { logAction, setTarget } = require('../middleware/activityLog');
const mailer = require('../utils/mailer');

/* ---------------------------------------------------------------- public */

/** FR-02 / FR-05 — the About Us content, editable by staff. */
router.get('/organization/public', async (req, res, next) => {
  try {
    const info = await OrganizationInfo.current();
    res.json(info.toObject({ versionKey: false }));
  } catch (err) { next(err); }
});

router.get('/events/public', async (req, res, next) => {
  try {
    const events = await Event.find({ is_published: true })
      .select('type title description event_date event_time venue cover_photo status')
      .sort({ event_date: 1 });
    res.json(events);
  } catch (err) { next(err); }
});

/** FR-04 — the click-based chatbot reads these. */
router.get('/faqs/public', async (req, res, next) => {
  try {
    const faqs = await Faq.find({ is_active: true })
      .select('question answer category display_order')
      .sort({ display_order: 1 });
    res.json(faqs);
  } catch (err) { next(err); }
});

/** FR-03 — contact form. */
router.post('/inquiries', async (req, res, next) => {
  try {
    const { sender_name, contact_info, subject, message } = req.body;
    if (!sender_name || !contact_info || !message) {
      return res.status(400).json({ message: 'Name, contact details and message are required.' });
    }
    await ContactInquiry.create({ sender_name, contact_info, subject, message });
    res.status(201).json({ message: 'Thank you. We will get back to you.' });
  } catch (err) { next(err); }
});

/* ----------------------------------------------------------------- admin */

router.use(requireAuth);

/* ---- events and announcements (FR-05) ---- */

router.get('/events', async (req, res, next) => {
  try {
    const events = await Event.find().populate('created_by', 'full_name').sort({ created_at: -1 });
    res.json(events);
  } catch (err) { next(err); }
});

router.post('/events', logAction('Create', 'Events'), async (req, res, next) => {
  try {
    const b = req.body;
    if (!b.title) return res.status(400).json({ message: 'A title is required.' });
    const event = await Event.create({
      type: b.type || 'Event',
      title: b.title,
      description: b.description,
      event_date: b.event_date || null,
      event_time: b.event_time,
      venue: b.venue,
      status: b.is_published ? 'Upcoming' : 'Draft',
      is_published: Boolean(b.is_published),
      created_by: req.user._id,
    });
    setTarget(res, event._id);
    res.status(201).json(event);
  } catch (err) { next(err); }
});

router.patch('/events/:id', logAction('Update', 'Events'), async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    ['type', 'title', 'description', 'event_date', 'event_time', 'venue', 'status', 'is_published']
      .forEach(f => { if (req.body[f] !== undefined) event[f] = req.body[f]; });
    await event.save();
    setTarget(res, event._id);
    res.json(event);
  } catch (err) { next(err); }
});

/** How many people have opted in — shown on the Events screen. */
router.get('/announcements/recipients', async (req, res, next) => {
  try {
    const volunteers = await Volunteer.countDocuments({ wants_event_emails: true, status: 'Approved' });
    const donors = await Donation.distinct('donor_contact',
      { wants_event_emails: true, donor_contact: { $ne: null } });
    res.json({ volunteers, donors: donors.length, total: volunteers + donors.length });
  } catch (err) { next(err); }
});

/**
 * FR-05 — one email listing every published event in the next 30 days,
 * sent to volunteers and donors who opted in. Consent is required: the
 * query filters on wants_event_emails, never on "everyone on file".
 */
router.post('/announcements/send', logAction('Export', 'Events'),
  async (req, res, next) => {
    try {
      const horizon = new Date();
      horizon.setDate(horizon.getDate() + Number(req.body.days || 30));

      const events = await Event.find({
        is_published: true,
        event_date: { $gte: new Date(), $lte: horizon },
      }).sort({ event_date: 1 });

      if (!events.length) {
        return res.status(409).json({ message: 'There are no published events in that window to announce.' });
      }

      const volunteers = await Volunteer.find({ wants_event_emails: true, status: 'Approved' })
        .select('email');
      const donorContacts = await Donation.distinct('donor_contact',
        { wants_event_emails: true, donor_contact: { $ne: null } });

      const recipients = [...new Set([
        ...volunteers.map(v => v.email),
        ...donorContacts.filter(c => String(c).includes('@')),
      ])];

      if (!recipients.length) {
        return res.status(409).json({ message: 'Nobody has opted in to event updates yet.' });
      }

      for (const to of recipients) {
        await mailer.send(mailer.eventAnnouncement(to, events));
      }

      const now = new Date();
      await Event.updateMany(
        { _id: { $in: events.map(e => e._id) } },
        { $set: { announcement_sent_at: now, recipient_count: recipients.length } });

      res.json({
        message: 'Announcement sent to ' + recipients.length + ' recipients.',
        events: events.length,
        recipients: recipients.length,
        mocked: !mailer.enabled,
      });
    } catch (err) { next(err); }
  });

/* ---- FAQ content (FR-04, FR-05) ---- */

router.get('/faqs', async (req, res, next) => {
  try { res.json(await Faq.find().sort({ display_order: 1 })); } catch (err) { next(err); }
});

router.post('/faqs', logAction('Create', 'FAQ Content'), async (req, res, next) => {
  try {
    const { question, answer, category, display_order } = req.body;
    if (!question || !answer) return res.status(400).json({ message: 'Question and answer are required.' });
    const faq = await Faq.create({ question, answer, category, display_order: Number(display_order || 0) });
    setTarget(res, faq._id);
    res.status(201).json(faq);
  } catch (err) { next(err); }
});

router.patch('/faqs/:id', logAction('Update', 'FAQ Content'), async (req, res, next) => {
  try {
    const faq = await Faq.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!faq) return res.status(404).json({ message: 'FAQ not found.' });
    setTarget(res, faq._id);
    res.json(faq);
  } catch (err) { next(err); }
});

/* ---- contact inquiries (FR-03) ---- */

router.get('/inquiries', async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const list = await ContactInquiry.find(filter)
      .populate('responded_by', 'full_name').sort({ date_submitted: -1 });
    res.json(list);
  } catch (err) { next(err); }
});

router.patch('/inquiries/:id', logAction('Update', 'Contact Inquiries'), async (req, res, next) => {
  try {
    const inquiry = await ContactInquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ message: 'Inquiry not found.' });
    if (req.body.status) inquiry.status = req.body.status;
    if (req.body.status === 'Responded') {
      inquiry.responded_by = req.user._id;
      inquiry.responded_at = new Date();
    }
    await inquiry.save();
    setTarget(res, inquiry._id);
    res.json(inquiry);
  } catch (err) { next(err); }
});

/** FR-05 — remove an event or announcement outright. */
router.delete('/events/:id', logAction('Delete', 'Events'), async (req, res, next) => {
  try {
    const ev = await Event.findByIdAndDelete(req.params.id);
    if (!ev) return res.status(404).json({ message: 'Event not found.' });
    setTarget(res, ev._id);
    res.json({ message: 'Event removed.' });
  } catch (err) { next(err); }
});

router.delete('/faqs/:id', logAction('Delete', 'FAQ Content'), async (req, res, next) => {
  try {
    const faq = await Faq.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ message: 'FAQ not found.' });
    setTarget(res, faq._id);
    res.json({ message: 'FAQ removed.' });
  } catch (err) { next(err); }
});

/* ------------------------------------------------- FR-05 organization info */

router.get('/organization', async (req, res, next) => {
  try {
    const info = await OrganizationInfo.current();
    await info.populate('updated_by', 'full_name');
    res.json(info);
  } catch (err) { next(err); }
});

const ORG_TEXT = ['name', 'tagline', 'about', 'mission', 'vision', 'history',
                  'address', 'contact_number', 'email', 'visiting_hours'];

router.patch('/organization', logAction('Update', 'Organization Info'), async (req, res, next) => {
  try {
    const info = await OrganizationInfo.current();
    ORG_TEXT.forEach(f => { if (req.body[f] !== undefined) info[f] = req.body[f]; });

    if (Array.isArray(req.body.facts)) {
      // Replace the whole list: the screen edits it as one block.
      const facts = req.body.facts
        .filter(f => f && String(f.value).trim() && String(f.label).trim())
        .slice(0, 8)
        .map(f => ({ value: String(f.value).trim(), label: String(f.label).trim() }));
      info.facts = facts;
    }

    if (!String(info.name).trim()) {
      return res.status(400).json({ message: 'The organization name cannot be empty.' });
    }

    info.updated_by = req.user._id;
    await info.save();
    setTarget(res, info._id);
    await info.populate('updated_by', 'full_name');
    res.json(info);
  } catch (err) { next(err); }
});

module.exports = router;
