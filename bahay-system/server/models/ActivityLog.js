/**
 * activity_logs — Appendix H (FR-02).
 * Appendix H omits the timestamp field even though its own index definitions
 * reference activity_logs.timestamp. Included here.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:    { type: String, enum: ['Create', 'Update', 'Delete', 'Login', 'Logout', 'Export'],
               required: true },
  module:    { type: String, required: true, trim: true },
  target_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  detail:    { type: String, trim: true },
  timestamp: { type: Date, default: Date.now },
});

schema.index({ timestamp: -1 });

module.exports = mongoose.model('ActivityLog', schema, 'activity_logs');
