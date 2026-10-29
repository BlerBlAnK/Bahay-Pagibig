/** wishlist_items — Appendix H */
const mongoose = require('mongoose');

const STATUS = ['Needed', 'Partially Fulfilled', 'Fulfilled'];

const schema = new mongoose.Schema({
  item_name:        { type: String, required: true, trim: true },
  category:         { type: String, trim: true },        // Food, Medical supplies, Hygiene, Household
  unit:             { type: String, trim: true },        // sacks, boxes, pieces
  target_quantity:  { type: Number, required: true, min: 1 },
  current_quantity: { type: Number, default: 0, min: 0 },
  min_threshold:    { type: Number, default: 0, min: 0 }, // the Graphical Reports threshold chart
  is_perishable:    { type: Boolean, default: false },
  status:           { type: String, enum: STATUS, default: 'Needed' },
  created_by:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

schema.index({ status: 1 });   // current-needs view on the public portal

/** FR-13: recompute the fulfillment status from the quantities. */
schema.methods.recomputeStatus = function () {
  if (this.current_quantity <= 0) this.status = 'Needed';
  else if (this.current_quantity >= this.target_quantity) this.status = 'Fulfilled';
  else this.status = 'Partially Fulfilled';
  return this.status;
};

schema.statics.STATUS = STATUS;

module.exports = mongoose.model('WishlistItem', schema, 'wishlist_items');
