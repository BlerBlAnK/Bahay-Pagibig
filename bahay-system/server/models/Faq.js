/** faqs — Appendix H */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  question:      { type: String, required: true, trim: true },
  answer:        { type: String, required: true, trim: true },
  category:      { type: String, trim: true },
  display_order: { type: Number, default: 0 },
  is_active:     { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

schema.index({ is_active: 1, display_order: 1 });

module.exports = mongoose.model('Faq', schema, 'faqs');
