/**
 * User Accounts — Super Admin only (panel item 9).
 * Creating, disabling and re-roling staff accounts.
 */
const router = require('express').Router();
const { User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction, setTarget } = require('../middleware/activityLog');

router.use(requireAuth, requireRole('Super Admin'));

router.get('/', async (req, res, next) => {
  try {
    const users = await User.find().sort({ created_at: 1 });
    res.json(users.map(u => u.toSafeJSON()));
  } catch (err) { next(err); }
});

router.post('/', logAction('Create', 'User Accounts', req => 'Added ' + req.body.email),
  async (req, res, next) => {
    try {
      const { full_name, email, password, position, role } = req.body;
      if (!full_name || !email || !password) {
        return res.status(400).json({ message: 'Name, email and password are required.' });
      }
      if (String(password).length < 10) {
        return res.status(422).json({ message: 'Use a password of at least 10 characters.' });
      }
      const user = new User({ full_name, email, position, role: role || 'Admin' });
      await user.setPassword(password);
      await user.save();
      setTarget(res, user._id);
      res.status(201).json(user.toSafeJSON());
    } catch (err) { next(err); }
  });

router.patch('/:id', logAction('Update', 'User Accounts'), async (req, res, next) => {
  try {
    const { full_name, position, role, status } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Account not found.' });

    // A Super Admin must not lock themselves out.
    if (String(user._id) === String(req.user._id) &&
        (status === 'Disabled' || (role && role !== 'Super Admin'))) {
      return res.status(409).json({
        message: 'You cannot disable or demote your own Super Admin account. Ask another Super Admin.',
      });
    }
    if (full_name !== undefined) user.full_name = full_name;
    if (position !== undefined) user.position = position;
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;
    await user.save();
    setTarget(res, user._id);
    res.json(user.toSafeJSON());
  } catch (err) { next(err); }
});

router.post('/:id/password', logAction('Update', 'User Accounts', () => 'Password reset'),
  async (req, res, next) => {
    try {
      const { password } = req.body;
      if (!password || String(password).length < 10) {
        return res.status(422).json({ message: 'Use a password of at least 10 characters.' });
      }
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: 'Account not found.' });
      await user.setPassword(password);
      await user.save();
      setTarget(res, user._id);
      res.json({ message: 'Password updated.' });
    } catch (err) { next(err); }
  });

module.exports = router;
