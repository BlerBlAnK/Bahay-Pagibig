/** inventory_log — Appendix H */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  wishlist_item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'WishlistItem', required: true },
  action:           { type: String, enum: ['Inflow', 'Outflow'], required: true },
  quantity:         { type: Number, required: true, min: 1 },
  note:             { type: String, trim: true },
  recorded_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp:        { type: Date, default: Date.now },
});

schema.index({ wishlist_item_id: 1, timestamp: -1 });

module.exports = mongoose.model('InventoryLog', schema, 'inventory_log');
