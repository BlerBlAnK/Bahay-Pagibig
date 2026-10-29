/**
 * Checks that run without a database: business rules, RBAC, PDF output and
 * route wiring. Run with `npm run test:unit`.
 * The full end-to-end suite is test/smoke.js and needs a mongod.
 */
process.env.JWT_SECRET = 'unit-test-secret';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const results = [];
const check = (name, fn) => {
  try { fn(); results.push([name, true]); }
  catch (e) { results.push([name, false, e.message]); }
};
const checkAsync = async (name, fn) => {
  try { await fn(); results.push([name, true]); }
  catch (e) { results.push([name, false, e.message]); }
};

(async () => {
  /* ---- FR-13 fulfillment status is derived, never typed in ---- */
  const WishlistItem = require('../models/WishlistItem');
  const mk = (current, target) => {
    const i = new WishlistItem({ item_name: 'X', target_quantity: target,
                                 current_quantity: current, created_by: new (require('mongoose')).Types.ObjectId() });
    i.recomputeStatus();
    return i.status;
  };
  check('empty stock is Needed',              () => assert.equal(mk(0, 12), 'Needed'));
  check('part stock is Partially Fulfilled',  () => assert.equal(mk(5, 12), 'Partially Fulfilled'));
  check('met target is Fulfilled',            () => assert.equal(mk(12, 12), 'Fulfilled'));
  check('over target is still Fulfilled',     () => assert.equal(mk(20, 12), 'Fulfilled'));

  /* ---- RBAC (NFR Security) ---- */
  const { requireRole } = require('../middleware/auth');
  const run = (role, allowed) => {
    let status = 200, called = false;
    const req = { user: role ? { role } : null };
    const res = { status(c) { status = c; return this; }, json() { return this; } };
    requireRole(...allowed)(req, res, () => { called = true; });
    return { status, called };
  };
  check('Super Admin passes an Admin gate',  () => assert.equal(run('Super Admin', ['Admin']).called, true));
  check('Super Admin passes its own gate',   () => assert.equal(run('Super Admin', ['Super Admin']).called, true));
  check('Admin blocked from Super Admin',    () => {
    const r = run('Admin', ['Super Admin']);
    assert.equal(r.called, false); assert.equal(r.status, 403);
  });
  check('Admin passes an Admin gate',        () => assert.equal(run('Admin', ['Admin']).called, true));
  check('no user is 401',                    () => assert.equal(run(null, ['Admin']).status, 401));

  /* ---- password hashing (FR-01) ---- */
  const User = require('../models/User');
  await checkAsync('bcrypt hash verifies', async () => {
    const u = new User({ full_name: 'T', email: 't@t.org' });
    await u.setPassword('BahayPagibig2026!');
    assert.ok(u.password_hash.startsWith('$2'), 'not a bcrypt hash');
    assert.notEqual(u.password_hash, 'BahayPagibig2026!');
    assert.equal(await u.verifyPassword('BahayPagibig2026!'), true);
    assert.equal(await u.verifyPassword('wrong'), false);
  });
  check('toSafeJSON hides the hash', () => {
    const u = new User({ full_name: 'T', email: 't@t.org', password_hash: 'x' });
    assert.ok(!('password_hash' in u.toSafeJSON()));
  });

  /* ---- FR-09 / FR-15 PDF generation really writes files ---- */
  const pdf = require('../utils/pdf');
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'bp-pdf-'));
  const mongoose = require('mongoose');
  await checkAsync('certificate PDF written', async () => {
    const file = pdf.certificate(
      { _id: new mongoose.Types.ObjectId(), full_name: 'Angelo Bautista' },
      { _id: new mongoose.Types.ObjectId(), activity: 'Feeding assistance',
        service_start: new Date('2026-03-01'), service_end: new Date('2026-04-05'),
        total_hours: 24, date_issued: new Date() }, tmp);
    await new Promise(r => setTimeout(r, 400));
    const size = fs.statSync(file).size;
    assert.ok(size > 1000, 'certificate too small: ' + size);
    assert.equal(fs.readFileSync(file).slice(0, 4).toString(), '%PDF');
  });
  await checkAsync('monthly report PDF written', async () => {
    const file = pdf.monthlyReport(
      { report_month: '03-2026', total_monetary_donations: 128450, total_inkind_donations: 34,
        total_volunteer_hours: 212, total_events: 3, generated_at: new Date() },
      { donations: [{ date_donated: new Date(), donor_name: 'Ana Lim', donation_type: 'Monetary',
                      amount: 5000, reference_number: 'GC-884210' }] }, tmp);
    await new Promise(r => setTimeout(r, 400));
    assert.ok(fs.statSync(file).size > 1000);
    assert.equal(fs.readFileSync(file).slice(0, 4).toString(), '%PDF');
  });
  check('peso formatting', () => assert.equal(pdf.peso(128450), '₱128,450.00'));

  /* ---- route wiring: the app mounts and guards without a database ---- */
  const app = require('../server.js');
  const server = app.listen(5056);
  const get = async (p, token) => {
    const r = await fetch('http://127.0.0.1:5056' + p,
      { headers: token ? { Authorization: 'Bearer ' + token } : {} });
    return r.status;
  };
  await checkAsync('health responds 200',            async () => assert.equal(await get('/api/health'), 200));
  await checkAsync('unknown route 404',              async () => assert.equal(await get('/api/nope'), 404));
  await checkAsync('users requires a token',         async () => assert.equal(await get('/api/users'), 401));
  await checkAsync('donations requires a token',     async () => assert.equal(await get('/api/donations'), 401));
  await checkAsync('wishlist admin requires token',  async () => assert.equal(await get('/api/wishlist'), 401));
  await checkAsync('reports require a token',        async () => assert.equal(await get('/api/reports/overview'), 401));
  await checkAsync('garbage token rejected',         async () => assert.equal(await get('/api/users', 'not-a-jwt'), 401));
  await checkAsync('inventory log requires a token', async () => assert.equal(await get('/api/inventory'), 401));
  await checkAsync('org info editing requires a token',
    async () => assert.equal(await get('/api/content/organization'), 401));
  await checkAsync('FAQ management requires a token',
    async () => assert.equal(await get('/api/content/faqs'), 401));
  server.close();

  const pass = results.filter(r => r[1]).length;
  console.log('\n' + '='.repeat(58));
  results.forEach(([n, ok, msg]) => console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (msg ? '  — ' + msg : '')));
  console.log('='.repeat(58));
  console.log(pass + '/' + results.length + ' checks passed\n');
  process.exit(pass === results.length ? 0 : 1);
})();
