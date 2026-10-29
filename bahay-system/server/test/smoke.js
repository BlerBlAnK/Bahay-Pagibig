/* End-to-end smoke test against an in-memory MongoDB. */
process.env.JWT_SECRET = 'test-secret-for-smoke-only';
process.env.NODE_ENV = 'test';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

(async () => {
  const mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri('bahay_test');
  await mongoose.connect(process.env.MONGODB_URI);

  const app = require('../server.js');
  const { User, WishlistItem } = require('../models');

  const server = app.listen(5055);
  const base = 'http://127.0.0.1:5055';
  const out = [];
  const j = async (method, path, body, token) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data };
  };

  // seed a Super Admin and an Admin
  const sa = new User({ full_name: 'Maria Santos', email: 'sa@test.org', role: 'Super Admin', position: 'Operations Head' });
  await sa.setPassword('BahayPagibig2026!'); await sa.save();
  const ad = new User({ full_name: 'Jose Cruz', email: 'admin@test.org', role: 'Admin', position: 'Logistics Head' });
  await ad.setPassword('BahayPagibig2026!'); await ad.save();

  out.push(['health', (await j('GET', '/api/health')).status === 200]);

  // FR-01 login
  const badLogin = await j('POST', '/api/auth/login', { email: 'sa@test.org', password: 'wrong' });
  out.push(['wrong password rejected', badLogin.status === 401]);
  const login = await j('POST', '/api/auth/login', { email: 'sa@test.org', password: 'BahayPagibig2026!' });
  out.push(['login 200 + token', login.status === 200 && !!login.data.token]);
  out.push(['password_hash not returned', !JSON.stringify(login.data).includes('password_hash')]);
  const SA = login.data.token;
  const adLogin = await j('POST', '/api/auth/login', { email: 'admin@test.org', password: 'BahayPagibig2026!' });
  const AD = adLogin.data.token;

  // RBAC
  out.push(['admin blocked from user accounts', (await j('GET', '/api/users', null, AD)).status === 403]);
  out.push(['super admin can list accounts', (await j('GET', '/api/users', null, SA)).status === 200]);
  out.push(['no token blocked', (await j('GET', '/api/users')).status === 401]);

  // self-demotion guard
  const selfDemote = await j('PATCH', '/api/users/' + sa._id, { status: 'Disabled' }, SA);
  out.push(['super admin cannot disable self', selfDemote.status === 409]);

  // FR-06 + FR-07 public volunteer application
  const apply = await j('POST', '/api/volunteers/apply', {
    full_name: 'Angelo Bautista', email: 'angelo@test.com', contact_info: '0917 000 0001',
    home_address: 'San Fernando, Pampanga', gender: 'Male', civil_status: 'Single',
    area_of_service: 'Feeding assistance', wants_event_emails: true,
  });
  out.push(['volunteer apply 201', apply.status === 201]);
  const volId = apply.data.reference;
  out.push(['duplicate email rejected',
    (await j('POST', '/api/volunteers/apply', { full_name: 'X', email: 'angelo@test.com',
      contact_info: '1', home_address: 'y' })).status === 409]);

  // hours before approval must fail
  out.push(['hours blocked while pending',
    (await j('POST', '/api/volunteers/' + volId + '/hours', { service_date: '2026-03-01', hours: 4 }, SA)).status === 409]);

  // FR-07 review
  const review = await j('POST', '/api/volunteers/' + volId + '/review', { decision: 'Approved' }, SA);
  out.push(['review approves', review.status === 200]);
  out.push(['double review rejected',
    (await j('POST', '/api/volunteers/' + volId + '/review', { decision: 'Rejected' }, SA)).status === 409]);

  // FR-08 hours
  for (const d of ['2026-03-01','2026-03-08','2026-03-15','2026-03-22','2026-03-29','2026-04-05']) {
    await j('POST', '/api/volunteers/' + volId + '/hours', { service_date: d, hours: 4 }, SA);
  }
  out.push(['hours rejected over 24',
    (await j('POST', '/api/volunteers/' + volId + '/hours', { service_date: '2026-04-12', hours: 30 }, SA)).status === 422]);

  // FR-09 certificate
  const cert = await j('POST', '/api/volunteers/' + volId + '/certificate', { activity: 'Feeding assistance' }, SA);
  out.push(['certificate generated (24h >= 20)', cert.status === 201 && cert.data.certificate.total_hours === 24]);

  // FR-10/13 wishlist
  const item = await j('POST', '/api/wishlist', { item_name: 'Rice', unit: 'sacks', target_quantity: 12, min_threshold: 4 }, SA);
  out.push(['wishlist created, status Needed', item.status === 201 && item.data.status === 'Needed']);
  const itemId = item.data._id;

  // FR-12/13 in-kind donation raises stock
  const inkind = await j('POST', '/api/donations', {
    donation_type: 'In-kind', donor_classification: 'Group / Organization',
    donor_name: 'Rotary Club', item_description: 'Rice', quantity: 5, wishlist_item_id: itemId,
  }, SA);
  out.push(['in-kind donation 201', inkind.status === 201]);
  out.push(['stock rose to 5', inkind.data.wishlist && inkind.data.wishlist.current_quantity === 5]);
  out.push(['status now Partially Fulfilled', inkind.data.wishlist.status === 'Partially Fulfilled']);

  // FR-13 outflow guard
  out.push(['cannot deduct more than on hand',
    (await j('POST', '/api/wishlist/' + itemId + '/deduct', { quantity: 99 }, SA)).status === 409]);
  const ded = await j('POST', '/api/wishlist/' + itemId + '/deduct', { quantity: 2, note: 'Cooked' }, SA);
  out.push(['deduct 2 leaves 3', ded.status === 200 && ded.data.item.current_quantity === 3]);

  // panel item 7 — duplicate donation
  const d1 = await j('POST', '/api/donations', {
    donation_type: 'Monetary', donor_name: 'Ana Lim', amount: 5000,
    donation_method: 'GCash', reference_number: 'GC-884210', transaction_date: '2026-03-07',
    date_donated: '2026-03-07',
  }, SA);
  out.push(['monetary donation 201', d1.status === 201]);
  const dup = await j('POST', '/api/donations', {
    donation_type: 'Monetary', donor_name: 'Ana Lim', amount: 5000,
    donation_method: 'GCash', reference_number: 'GC-884210', transaction_date: '2026-03-07',
    date_donated: '2026-03-07',
  }, SA);
  out.push(['duplicate reference blocked 409', dup.status === 409]);
  out.push(['duplicate names the reason', /reference number/.test(dup.data.message || '')]);
  const forced = await j('POST', '/api/donations', {
    donation_type: 'Monetary', donor_name: 'Ana Lim', amount: 5000,
    donation_method: 'GCash', reference_number: 'GC-884210', transaction_date: '2026-03-07',
    date_donated: '2026-03-07', force: true,
  }, SA);
  out.push(['force:true overrides', forced.status === 201]);

  // FR-12 verification
  const ver = await j('POST', '/api/donations/' + d1.data.donation._id + '/verify', { decision: 'Verified' }, SA);
  out.push(['verify sets Verified', ver.status === 200 && ver.data.verification_status === 'Verified']);

  // FR-14 graphical reports
  const trends = await j('GET', '/api/reports/donation-trends', null, SA);
  out.push(['donation trends array', trends.status === 200 && Array.isArray(trends.data)]);
  const dist = await j('GET', '/api/reports/volunteer-distribution', null, SA);
  out.push(['volunteer distribution percent', dist.status === 200 && dist.data.areas[0].percent === 100]);
  const lev = await j('GET', '/api/reports/inventory-levels', null, SA);
  out.push(['inventory levels flag threshold', lev.status === 200 && lev.data[0].below_threshold === true]);

  // FR-15 monthly report
  out.push(['bad month rejected',
    (await j('POST', '/api/reports/monthly', { report_month: 'March' }, SA)).status === 400]);
  const rep = await j('POST', '/api/reports/monthly', { report_month: '03-2026' }, SA);
  out.push(['monthly report 201', rep.status === 201]);
  out.push(['report totals monetary', rep.status === 201 && rep.data.report.total_monetary_donations === 5000]);

  // FR-05 announcements
  const recips = await j('GET', '/api/content/announcements/recipients', null, SA);
  out.push(['recipients counts opt-ins only', recips.status === 200 && recips.data.volunteers === 1]);
  const noEvents = await j('POST', '/api/content/announcements/send', {}, SA);
  out.push(['no events to announce 409', noEvents.status === 409]);
  const soon = new Date(); soon.setDate(soon.getDate() + 7);
  await j('POST', '/api/content/events', { title: 'Feeding Day', event_date: soon, is_published: true }, SA);
  const sent = await j('POST', '/api/content/announcements/send', {}, SA);
  out.push(['announcement sent to 1', sent.status === 200 && sent.data.recipients === 1]);

  // FR-02 activity log
  const log = await j('GET', '/api/reports/activity-log', null, SA);
  const actions = (log.data || []).map(r => r.action + ':' + r.module);
  out.push(['activity log recorded login', actions.some(a => a === 'Login:Authentication')]);
  out.push(['activity log recorded donation', actions.some(a => a === 'Create:Donation Records')]);
  out.push(['activity log recorded export', actions.some(a => a === 'Export:Monthly Reports')]);

  // public endpoints need no token
  out.push(['public wishlist open', (await j('GET', '/api/wishlist/public')).status === 200]);
  out.push(['public faqs open', (await j('GET', '/api/content/faqs/public')).status === 200]);
  out.push(['admin wishlist still guarded', (await j('GET', '/api/wishlist')).status === 401]);

  server.close(); await mongoose.disconnect(); await mem.stop();

  const pass = out.filter(([, ok]) => ok).length;
  console.log('\n' + '='.repeat(56));
  out.forEach(([name, ok]) => console.log((ok ? '  PASS  ' : '  FAIL  ') + name));
  console.log('='.repeat(56));
  console.log(pass + '/' + out.length + ' checks passed');
  process.exit(pass === out.length ? 0 : 1);
})().catch(e => { console.error('SMOKE ERROR:', e); process.exit(1); });
