/**
 * FR-02 — record staff actions with a timestamp and user id.
 * Used as route middleware: logAction('Create', 'Donations').
 * It writes only after a 2xx response, so failed requests leave no audit noise.
 */
const { ActivityLog } = require('../models');

function logAction(action, moduleName, detailFn) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      if (!req.user) return;
      ActivityLog.create({
        user_id:   req.user._id,
        action,
        module:    moduleName,
        target_id: res.locals.targetId || null,
        detail:    typeof detailFn === 'function' ? detailFn(req, res) : undefined,
      }).catch(err => console.error('[activity-log]', err.message));
    });
    next();
  };
}

/** Call from a handler so the log row points at the record that changed. */
function setTarget(res, id) { res.locals.targetId = id; }

module.exports = { logAction, setTarget };
