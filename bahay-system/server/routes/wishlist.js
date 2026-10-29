/** FR-10 public Wishlist, FR-13 inventory inflow and outflow. */
const router = require('express').Router();
const { WishlistItem, InventoryLog } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction, setTarget } = require('../middleware/activityLog');

/** FR-10 — public: the active Wishlist. */
router.get('/public', async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const items = await WishlistItem.find(filter)
      .select('item_name category unit target_quantity current_quantity status')
      .sort({ status: 1, item_name: 1 });
    res.json(items);
  } catch (err) { next(err); }
});

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const items = await WishlistItem.find().populate('created_by', 'full_name').sort({ item_name: 1 });
    res.json(items);
  } catch (err) { next(err); }
});

router.post('/', logAction('Create', 'Wishlist'), async (req, res, next) => {
  try {
    const { item_name, category, unit, target_quantity, min_threshold, is_perishable } = req.body;
    if (!item_name || !target_quantity) {
      return res.status(400).json({ message: 'Item name and target quantity are required.' });
    }
    const item = await WishlistItem.create({
      item_name, category, unit,
      target_quantity: Number(target_quantity),
      min_threshold: Number(min_threshold || 0),
      is_perishable: Boolean(is_perishable),
      created_by: req.user._id,
    });
    item.recomputeStatus();
    await item.save();
    setTarget(res, item._id);
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.patch('/:id', logAction('Update', 'Wishlist'), async (req, res, next) => {
  try {
    const item = await WishlistItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Wishlist item not found.' });
    ['item_name', 'category', 'unit', 'min_threshold', 'is_perishable'].forEach(f => {
      if (req.body[f] !== undefined) item[f] = req.body[f];
    });
    if (req.body.target_quantity !== undefined) item.target_quantity = Number(req.body.target_quantity);
    item.recomputeStatus();
    await item.save();
    setTarget(res, item._id);
    res.json(item);
  } catch (err) { next(err); }
});

/**
 * FR-13 outflow — the facility consumed stock (cooking a sack of rice).
 * Stock is never allowed to go negative.
 */
router.post('/:id/deduct', logAction('Update', 'Inventory Log',
  req => 'Deducted ' + req.body.quantity),
  async (req, res, next) => {
    try {
      const qty = Number(req.body.quantity);
      if (!qty || qty <= 0) {
        return res.status(400).json({ message: 'Enter how many units were used.' });
      }
      const item = await WishlistItem.findById(req.params.id);
      if (!item) return res.status(404).json({ message: 'Wishlist item not found.' });
      if (qty > item.current_quantity) {
        return res.status(409).json({
          message: 'Only ' + item.current_quantity + ' ' + (item.unit || 'units') +
                   ' are on hand. You cannot deduct ' + qty + '.',
          current_quantity: item.current_quantity,
        });
      }
      item.current_quantity -= qty;
      item.recomputeStatus();
      await item.save();
      const log = await InventoryLog.create({
        wishlist_item_id: item._id,
        action: 'Outflow',
        quantity: qty,
        note: req.body.note,
        recorded_by: req.user._id,
      });
      setTarget(res, log._id);
      res.json({ item, log });
    } catch (err) { next(err); }
  });

router.get('/:id/log', async (req, res, next) => {
  try {
    const log = await InventoryLog.find({ wishlist_item_id: req.params.id })
      .populate('recorded_by', 'full_name').sort({ timestamp: -1 }).limit(200);
    res.json(log);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('Super Admin'), logAction('Delete', 'Wishlist'),
  async (req, res, next) => {
    try {
      const item = await WishlistItem.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ message: 'Wishlist item not found.' });
      setTarget(res, item._id);
      res.json({ message: 'Wishlist item deleted.' });
    } catch (err) { next(err); }
  });

module.exports = router;
