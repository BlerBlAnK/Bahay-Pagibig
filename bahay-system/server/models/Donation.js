/**
 * donations — Appendix H, extended with the fields FR-11 requires.
 * FR-11 promises the donor submits a reference number, transaction date,
 * amount and proof-of-payment image for dual-party verification, and FR-12
 * requires donor classification. Appendix H lists none of these yet.
 * See DATA-DICTIONARY-NOTES.md.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  donor_classification: { type: String, enum: ['Individual', 'Group / Organization', 'Anonymous'],
                          default: 'Individual' },                       // FR-12
  donor_name:       { type: String, default: null, trim: true },
  donor_contact:    { type: String, default: null, trim: true },
  wants_event_emails: { type: Boolean, default: false },                 // consent, FR-05

  donation_type:    { type: String, enum: ['Monetary', 'In-kind'], required: true },

  // monetary
  amount:           { type: mongoose.Schema.Types.Decimal128, default: null },
  donation_method:  { type: String, trim: true },        // GCash, Maya, Bank transfer, Cash, In person
  reference_number: { type: String, default: null, trim: true },         // FR-11
  transaction_date: { type: Date, default: null },                       // FR-11
  proof_of_payment: { type: String, default: null },                     // FR-11, uploaded file path

  // in-kind
  item_description: { type: String, default: null, trim: true },
  quantity:         { type: Number, default: null },
  wishlist_item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'WishlistItem', default: null },

  date_donated:     { type: Date, required: true, default: Date.now },

  // FR-12 dual-party verification
  verification_status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
  verified_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verified_at:      { type: Date, default: null },

  source:           { type: String, enum: ['Donor report', 'Staff entry'], default: 'Staff entry' },
  recorded_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

schema.index({ date_donated: -1 });        // monthly report aggregation
schema.index({ wishlist_item_id: 1 });     // fulfillment computation
schema.index({ reference_number: 1, date_donated: 1 });   // duplicate detection, panel item 7

/** amount is Decimal128; expose it as a number to the API. */
schema.methods.toJSONWithAmount = function () {
  const o = this.toObject({ virtuals: true });
  o.amount = this.amount == null ? null : parseFloat(this.amount.toString());
  return o;
};

module.exports = mongoose.model('Donation', schema, 'donations');
