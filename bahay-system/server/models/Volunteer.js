/**
 * volunteers — Appendix H, extended with the fields FR-06 requires.
 * FR-06 lists home address, gender, civil status and date of birth, and
 * individual vs group/organization applications; Appendix H does not yet
 * list them. See DATA-DICTIONARY-NOTES.md.
 */
const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  activity:      { type: String, required: true },
  service_start: { type: Date, required: true },
  service_end:   { type: Date, required: true },
  total_hours:   { type: Number, required: true },
  date_issued:   { type: Date, default: Date.now },
  issued_by:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  file_path:     { type: String },
}, { _id: true });
// the sub-document _id is the certificate_id of Appendix H

const volunteerSchema = new mongoose.Schema({
  applicant_type:   { type: String, enum: ['Individual', 'Group or Organization'], default: 'Individual' },
  full_name:        { type: String, required: true, trim: true },
  email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
  contact_info:     { type: String, required: true, trim: true },
  home_address:     { type: String, required: true, trim: true },   // FR-06
  gender:           { type: String, trim: true },                   // FR-06
  civil_status:     { type: String, trim: true },                   // FR-06
  date_of_birth:    { type: Date },                                 // FR-06
  availability:     { type: String, trim: true },
  area_of_service:  { type: String, trim: true },
  reason:           { type: String, trim: true },
  wants_event_emails: { type: Boolean, default: false },            // consent, FR-05 announcements
  application_date: { type: Date, default: Date.now },
  status:           { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  certificates:     { type: [certificateSchema], default: [] },
  reviewed_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewed_at:      { type: Date, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

volunteerSchema.index({ status: 1 });   // pending-applications queue

module.exports = mongoose.model('Volunteer', volunteerSchema, 'volunteers');
