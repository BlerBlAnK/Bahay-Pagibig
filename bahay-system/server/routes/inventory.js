/** FR-13 — the full inflow/outflow history across every item. */
const router = require('express').Router();
const { InventoryLog } = require('../models');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    const log = await InventoryLog.find(filter)
      .populate('wishlist_item_id', 'item_name unit')
      .populate('recorded_by', 'full_name')
      .sort({ timestamp: -1 })
      .limit(Number(req.query.limit) || 100);
    res.json(log);
  } catch (err) { next(err); }
});

module.exports = router;
