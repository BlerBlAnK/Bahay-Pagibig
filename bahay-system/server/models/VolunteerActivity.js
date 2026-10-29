/** volunteer_activities — Appendix H */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  volunteer_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', required: true },
  event_id:             { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  service_date:         { type: Date, required: true },
  hours:                { type: Number, required: true, min: 0 },
  activity_description: { type: String, trim: true },
  recorded_by:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

schema.index({ volunteer_id: 1, service_date: -1 });   // service history + hour totals

module.exports = mongoose.model('VolunteerActivity', schema, 'volunteer_activities');
