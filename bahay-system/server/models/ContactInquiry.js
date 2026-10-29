/** contact_inquiries — Appendix H */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  sender_name:    { type: String, required: true, trim: true },
  contact_info:   { type: String, required: true, trim: true },
  subject:        { type: String, trim: true },
  message:        { type: String, required: true, trim: true },
  date_submitted: { type: Date, default: Date.now },
  status:         { type: String, enum: ['Unread', 'Read', 'Responded'], default: 'Unread' },
  responded_by:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  responded_at:   { type: Date, default: null },
});

schema.index({ status: 1, date_submitted: -1 });   // unread queue on the Admin Dashboard

module.exports = mongoose.model('ContactInquiry', schema, 'contact_inquiries');
