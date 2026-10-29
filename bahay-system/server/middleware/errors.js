/** Central error handling so routes can simply throw. */
function notFound(req, res) {
  res.status(404).json({ message: 'Endpoint not found: ' + req.method + ' ' + req.originalUrl });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      message: 'Some fields need attention.',
      fields: Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message])),
    });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || { field: 1 })[0];
    return res.status(409).json({ message: 'That ' + field + ' is already on record.', field });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'That record id is not valid.' });
  }
  console.error('[error]', err);
  res.status(err.status || 500).json({ message: err.expose ? err.message : 'Something went wrong.' });
}

module.exports = { notFound, errorHandler };
