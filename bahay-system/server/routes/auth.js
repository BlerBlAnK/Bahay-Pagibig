/** FR-01 sign in, FR-02 login/logout audit trail. */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User, ActivityLog } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { logAction, setTarget } = require('../middleware/activityLog');

// NFR Security — slow down credential guessing.
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { message: 'Too many sign-in attempts. Try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password_hash');
    // Same message either way so the response never reveals which emails exist.
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'This account has been disabled.' });
    }

    const token = jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET,
                           { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

    await ActivityLog.create({ user_id: user._id, action: 'Login', module: 'Authentication' });
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) { next(err); }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await ActivityLog.create({ user_id: req.user._id, action: 'Logout', module: 'Authentication' });
    res.json({ message: 'Signed out.' });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toSafeJSON() }));

/**
 * A staff member changing their own password. The Super Admin reset at
 * POST /api/users/:id/password exists for a forgotten one; this is the route a
 * staff member uses after being given a temporary password, and it asks for
 * the current password so a borrowed session cannot lock the owner out.
 */
router.post('/password', requireAuth,
  logAction('Update', 'Authentication', () => 'Changed own password'),
  async (req, res, next) => {
    try {
      const { current_password, new_password } = req.body;
      if (!current_password || !new_password) {
        return res.status(400).json({ message: 'Enter your current and new password.' });
      }
      if (String(new_password).length < 10) {
        return res.status(422).json({ message: 'Use a password of at least 10 characters.' });
      }
      if (current_password === new_password) {
        return res.status(422).json({ message: 'The new password must differ from the current one.' });
      }

      const user = await User.findById(req.user._id).select('+password_hash');
      if (!user || !(await user.verifyPassword(current_password))) {
        return res.status(401).json({ message: 'That is not your current password.' });
      }

      await user.setPassword(new_password);
      await user.save();
      setTarget(res, user._id);
      res.json({ message: 'Password updated.' });
    } catch (err) { next(err); }
  });

module.exports = router;
