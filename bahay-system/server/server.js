/**
 * Bahay Pag-ibig — Web-Based Operations Management System
 * API server. Client-server architecture per the Design section:
 * Express.js holds the business rules, MongoDB Atlas holds the data.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

/**
 * CLIENT_ORIGIN is a comma-separated list of allowed origins, so the deployed
 * portal and a local `ng serve` can both reach the API. Vercel also gives every
 * branch its own preview URL, so any *.vercel.app subdomain of a listed origin
 * is accepted too. With nothing set, every origin is allowed — convenient while
 * developing, and the reason the deploy guide insists on setting it.
 */
const allowed = (process.env.CLIENT_ORIGIN || '')
  .split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    // No Origin header: curl, a health check, a server-to-server call.
    if (!origin) return callback(null, true);
    if (!allowed.length) return callback(null, true);

    const clean = origin.replace(/\/+$/, '');
    if (allowed.includes(clean)) return callback(null, true);

    // Vercel preview deployments of the same project.
    if (/^https:\/\/[\w-]+\.vercel\.app$/.test(clean) &&
        allowed.some(a => a.endsWith('.vercel.app'))) {
      return callback(null, true);
    }
    return callback(new Error('Origin ' + origin + ' is not allowed by CLIENT_ORIGIN.'));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// uploaded proof-of-payment images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/certificates', express.static(path.join(__dirname, 'certificates')));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  time: new Date().toISOString(),
}));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/donations',  require('./routes/donations'));
app.use('/api/wishlist',   require('./routes/wishlist'));
app.use('/api/inventory',  require('./routes/inventory'));
app.use('/api/content',    require('./routes/content'));
app.use('/api/reports',    require('./routes/reports'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB Atlas connected.');
  app.listen(PORT, () => console.log('API listening on http://localhost:' + PORT));
}

if (require.main === module) start().catch(err => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});

module.exports = app;
