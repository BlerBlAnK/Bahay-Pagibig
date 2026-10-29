/** monthly_reports — Appendix H (FR-15) */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  report_month:             { type: String, required: true, trim: true },   // MM-YYYY
  generated_by:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  total_monetary_donations: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  total_inkind_donations:   { type: Number, default: 0 },
  total_volunteer_hours:    { type: Number, default: 0 },
  total_events:             { type: Number, default: 0 },
  file_path:                { type: String },
  generated_at:             { type: Date, default: Date.now },
});

schema.index({ report_month: 1, generated_at: -1 });

module.exports = mongoose.model('MonthlyReport', schema, 'monthly_reports');
