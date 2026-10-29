/**
 * FR-07 volunteer notifications and FR-05 event announcements.
 * With no SMTP_PASS configured the message is printed to the console instead
 * of being sent, so development never emails real people by accident.
 */
const nodemailer = require('nodemailer');

const enabled = Boolean(process.env.SMTP_PASS);

const transporter = enabled
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function send({ to, subject, text, html }) {
  if (!enabled) {
    console.log('\n[mail: not sent, SMTP_PASS is empty]');
    console.log('  to     :', to);
    console.log('  subject:', subject);
    console.log('  body   :', (text || '').replace(/\n/g, '\n           '), '\n');
    return { mocked: true };
  }
  return transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, text, html });
}

const FACILITY = 'Bahay Pag-ibig';

/** FR-07 — instant acknowledgement on submission. */
function volunteerAcknowledgement(v) {
  return {
    to: v.email,
    subject: 'We received your volunteer application — ' + FACILITY,
    text: [
      'Hello ' + v.full_name + ',',
      '',
      'Thank you for applying to volunteer at ' + FACILITY + '. We have received your',
      'application and our staff will review it.',
      '',
      'Area of service : ' + (v.area_of_service || 'To be assigned'),
      'Availability    : ' + (v.availability || 'To be arranged'),
      'Submitted       : ' + new Date(v.application_date).toLocaleDateString('en-PH'),
      '',
      'You will receive another email once your application has been reviewed.',
      '',
      FACILITY,
    ].join('\n'),
  };
}

/** FR-07 — formal review result with orientation details. */
function volunteerDecision(v, approved, orientation) {
  if (approved) {
    return {
      to: v.email,
      subject: 'Your volunteer application has been approved — ' + FACILITY,
      text: [
        'Hello ' + v.full_name + ',',
        '',
        'Your application to volunteer at ' + FACILITY + ' has been approved.',
        '',
        orientation || 'Our staff will contact you to arrange your orientation and schedule.',
        '',
        'Please bring a valid ID on your first day.',
        '',
        FACILITY,
      ].join('\n'),
    };
  }
  return {
    to: v.email,
    subject: 'Update on your volunteer application — ' + FACILITY,
    text: [
      'Hello ' + v.full_name + ',',
      '',
      'Thank you for your interest in volunteering at ' + FACILITY + '.',
      'After review we are unable to accommodate your application at this time.',
      '',
      'We keep your details on file and would be glad to hear from you again.',
      '',
      FACILITY,
    ].join('\n'),
  };
}

/** FR-05 — one email listing the published events in the next 30 days. */
function eventAnnouncement(recipient, events) {
  const lines = events.map(e => {
    const when = e.event_date
      ? new Date(e.event_date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'Date to be announced';
    return '  • ' + e.title + ' — ' + when + (e.venue ? ', ' + e.venue : '');
  });
  return {
    to: recipient,
    subject: 'Upcoming events at ' + FACILITY,
    text: [
      'Hello,',
      '',
      'Here is what is coming up at ' + FACILITY + ':',
      '',
      ...lines,
      '',
      'You are receiving this because you asked for event updates.',
      'Reply to this email if you would like to stop receiving them.',
      '',
      FACILITY,
    ].join('\n'),
  };
}

module.exports = { send, volunteerAcknowledgement, volunteerDecision, eventAnnouncement, enabled };
