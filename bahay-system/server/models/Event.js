/** events — Appendix H, plus the announcement fields for FR-05 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  type:        { type: String, enum: ['Event', 'Announcement'], default: 'Event' },
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  event_date:  { type: Date },                 // null for an announcement
  event_time:  { type: String, trim: true },
  venue:       { type: String, trim: true },
  cover_photo: { type: String },
  status:      { type: String, enum: ['Draft', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
                 default: 'Draft' },
  is_published: { type: Boolean, default: false },

  // FR-05 announcement to opted-in volunteers and donors
  announcement_sent_at: { type: Date, default: null },
  recipient_count:      { type: Number, default: 0 },

  created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

schema.index({ event_date: 1 });   // upcoming/past listing on the public portal

module.exports = mongoose.model('Event', schema, 'events');
