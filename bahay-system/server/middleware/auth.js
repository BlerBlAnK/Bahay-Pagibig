/**
 * FR-01 authentication and FR-02 accountability.
 * requireAuth  — verifies the JWT and loads the staff account.
 * requireRole  — Role-Based Access Control (NFR Security).
 */
const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Sign in to continue.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'Account no longer exists.' });
    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'This account has been disabled.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }
}

/** requireRole('Super Admin') — a Super Admin passes every role check. */
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Sign in to continue.' });
    if (req.user.role === 'Super Admin' || allowed.includes(req.user.role)) return next();
    return res.status(403).json({
      message: 'Only a Super Admin can do this.',
      required: allowed,
      yourRole: req.user.role,
    });
  };
}

module.exports = { requireAuth, requireRole };
