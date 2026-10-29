/**
 * Seeds the five staff accounts named in the Sample and Setting section,
 * plus Wishlist items, FAQs and sample records so the dashboard and the
 * Graphical Reports screen have something to show.
 *
 *   npm run seed            keep existing data, add what is missing
 *   npm run seed -- --fresh wipe the collections first
 */
require('dotenv').config();
const mongoose = require('mongoose');
const {
  User, Volunteer, VolunteerActivity, WishlistItem, InventoryLog,
  Donation, Event, Faq, ContactInquiry,
} = require('./models');

const FRESH = process.argv.includes('--fresh');

const STAFF = [
  { full_name: 'Maria Santos',   email: 'operations@bahaypagibig.org', position: 'Operations Head',   role: 'Super Admin' },
  { full_name: 'Jose Cruz',      email: 'logistics@bahaypagibig.org',  position: 'Logistics Head',    role: 'Admin' },
  { full_name: 'Divina Reyes',   email: 'marketing@bahaypagibig.org',  position: 'Marketing Officer', role: 'Admin' },
  { full_name: 'Ana Dela Cruz',  email: 'social1@bahaypagibig.org',    position: 'Social Worker',     role: 'Admin' },
  { full_name: 'Rosa Mendoza',   email: 'social2@bahaypagibig.org',    position: 'Social Worker',     role: 'Admin' },
];

const WISHLIST = [
  { item_name: 'Rice',           category: 'Food',             unit: 'sacks',  target_quantity: 12,  current_quantity: 0,   min_threshold: 4 },
  { item_name: 'Adult diapers',  category: 'Medical supplies', unit: 'boxes',  target_quantity: 40,  current_quantity: 28,  min_threshold: 15 },
  { item_name: 'Bath towels',    category: 'Household',        unit: 'pieces', target_quantity: 60,  current_quantity: 54,  min_threshold: 20 },
  { item_name: 'Canned goods',   category: 'Food',             unit: 'pieces', target_quantity: 200, current_quantity: 120, min_threshold: 80 },
  { item_name: 'Bath soap',      category: 'Hygiene',          unit: 'pieces', target_quantity: 100, current_quantity: 0,   min_threshold: 30 },
  { item_name: 'Bed sheets',     category: 'Household',        unit: 'sets',   target_quantity: 40,  current_quantity: 40,  min_threshold: 15 },
];

const FAQS = [
  { question: 'What items do you accept?', answer: 'We accept food, medical supplies, hygiene products and household items. The current Wishlist on this site shows what is needed right now.', category: 'Donations', display_order: 1 },
  { question: 'How do I donate money?', answer: 'Scan the GCash or bank QR code on the Wishlist page, then fill in the donation report form with your reference number and the date so both you and the facility have a record.', category: 'Donations', display_order: 2 },
  { question: 'Can a group or organization donate?', answer: 'Yes. Group and organization donations are welcome; please arrange them in advance so staff can receive the delivery.', category: 'Donations', display_order: 3 },
  { question: 'How do I become a volunteer?', answer: 'Fill in the volunteer registration form. You will get a confirmation email right away, and another once our staff have reviewed your application.', category: 'Volunteering', display_order: 4 },
  { question: 'Where are you located?', answer: 'Bahay Pag-ibig is in San Fernando, Pampanga, under the Archdiocese of San Fernando. Use the contact form for directions.', category: 'General', display_order: 5 },
  { question: 'What are your visiting hours?', answer: 'Items may be brought to the facility Monday to Sunday, 8:00 AM to 5:00 PM.', category: 'General', display_order: 6 },
];

const VOLUNTEERS = [
  { full_name: 'Angelo Bautista', email: 'angelo.bautista@email.com', contact_info: '0917 000 0001', home_address: 'Sto. Rosario, Angeles City, Pampanga', gender: 'Male',   civil_status: 'Single',  area_of_service: 'Feeding assistance',     availability: 'Weekends',          status: 'Approved', wants_event_emails: true },
  { full_name: 'Bea Lorenzo',     email: 'bea.lorenzo@email.com',     contact_info: '0917 000 0002', home_address: 'San Agustin, San Fernando, Pampanga', gender: 'Female', civil_status: 'Single',  area_of_service: 'Recreational activities', availability: 'Saturday mornings', status: 'Approved', wants_event_emails: true },
  { full_name: 'Carlo Dizon',     email: 'carlo.dizon@email.com',     contact_info: '0917 000 0003', home_address: 'Dolores, San Fernando, Pampanga',     gender: 'Male',   civil_status: 'Married', area_of_service: 'Housekeeping',           availability: 'Weekdays',          status: 'Approved', wants_event_emails: false },
  { full_name: 'Dina Manalo',     email: 'dina.manalo@email.com',     contact_info: '0917 000 0004', home_address: 'Telabastagan, San Fernando, Pampanga', gender: 'Female', civil_status: 'Single',  area_of_service: 'Medical support',        availability: 'Sundays',           status: 'Pending',  wants_event_emails: true },
  { full_name: 'Elmer Pineda',    email: 'elmer.pineda@email.com',    contact_info: '0917 000 0005', home_address: 'Sindalan, San Fernando, Pampanga',    gender: 'Male',   civil_status: 'Single',  area_of_service: 'Events support',         availability: 'Flexible',          status: 'Pending',  wants_event_emails: false },
];

function monthsAgo(n) { const d = new Date(); d.setMonth(d.getMonth() - n); d.setDate(10); return d; }

async function run() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  if (FRESH) {
    console.log('Clearing collections…');
    await Promise.all([User, Volunteer, VolunteerActivity, WishlistItem, InventoryLog,
                       Donation, Event, Faq, ContactInquiry].map(M => M.deleteMany({})));
  }

  // ---- staff accounts -----------------------------------------------------
  const password = process.env.SEED_PASSWORD || 'BahayPagibig2026!';
  const users = [];
  for (const s of STAFF) {
    let u = await User.findOne({ email: s.email });
    if (!u) {
      u = new User(s);
      await u.setPassword(password);
      await u.save();
      console.log('  staff   +', s.email, '(' + s.role + ')');
    }
    users.push(u);
  }
  const superAdmin = users[0];

  // ---- wishlist -----------------------------------------------------------
  const items = [];
  for (const w of WISHLIST) {
    let item = await WishlistItem.findOne({ item_name: w.item_name });
    if (!item) {
      item = new WishlistItem({ ...w, created_by: superAdmin._id });
      item.recomputeStatus();
      await item.save();
      console.log('  wishlist +', w.item_name);
    }
    items.push(item);
  }

  // ---- faqs ---------------------------------------------------------------
  for (const f of FAQS) {
    if (!(await Faq.findOne({ question: f.question }))) {
      await Faq.create(f);
      console.log('  faq      +', f.question.slice(0, 44));
    }
  }

  // ---- volunteers and service hours --------------------------------------
  const vols = [];
  for (const v of VOLUNTEERS) {
    let vol = await Volunteer.findOne({ email: v.email });
    if (!vol) {
      vol = await Volunteer.create({
        ...v,
        application_date: monthsAgo(2),
        reviewed_by: v.status === 'Pending' ? null : superAdmin._id,
        reviewed_at: v.status === 'Pending' ? null : monthsAgo(2),
      });
      console.log('  volunteer+', v.full_name, '(' + v.status + ')');
    }
    vols.push(vol);
  }
  for (const vol of vols.filter(v => v.status === 'Approved')) {
    if (await VolunteerActivity.countDocuments({ volunteer_id: vol._id })) continue;
    for (let i = 0; i < 6; i++) {
      await VolunteerActivity.create({
        volunteer_id: vol._id,
        service_date: monthsAgo(i % 3),
        hours: 4,
        activity_description: vol.area_of_service,
        recorded_by: superAdmin._id,
      });
    }
  }

  // ---- donations ----------------------------------------------------------
  if (!(await Donation.countDocuments())) {
    const rows = [];
    for (let i = 11; i >= 0; i--) {
      rows.push({
        donor_classification: 'Individual',
        donor_name: 'Donor ' + (12 - i),
        donor_contact: 'donor' + (12 - i) + '@email.com',
        donation_type: 'Monetary',
        amount: 2500 + ((12 - i) * 850) % 9000,
        donation_method: i % 2 ? 'GCash' : 'Bank transfer',
        reference_number: (i % 2 ? 'GC-' : 'BPI-') + (884200 + i * 37),
        transaction_date: monthsAgo(i),
        date_donated: monthsAgo(i),
        verification_status: i > 1 ? 'Verified' : 'Pending',
        verified_by: i > 1 ? superAdmin._id : null,
        verified_at: i > 1 ? monthsAgo(i) : null,
        source: i % 3 === 0 ? 'Donor report' : 'Staff entry',
        recorded_by: superAdmin._id,
      });
    }
    rows.push({
      donor_classification: 'Group / Organization',
      donor_name: 'Rotary Club of San Fernando',
      donation_type: 'In-kind',
      item_description: 'Rice', quantity: 5,
      wishlist_item_id: items[0]._id,
      donation_method: 'In person',
      date_donated: monthsAgo(0),
      verification_status: 'Verified',
      verified_by: superAdmin._id, verified_at: monthsAgo(0),
      recorded_by: superAdmin._id,
    });
    rows.push({
      donor_classification: 'Anonymous',
      donation_type: 'In-kind',
      item_description: 'Bath soap', quantity: 30,
      wishlist_item_id: items[4]._id,
      donation_method: 'In person',
      date_donated: monthsAgo(0),
      verification_status: 'Verified',
      verified_by: superAdmin._id, verified_at: monthsAgo(0),
      recorded_by: superAdmin._id,
    });
    await Donation.insertMany(rows);
    console.log('  donations+', rows.length);

    // reflect the two in-kind donations in the Wishlist and the inventory log
    for (const [idx, qty] of [[0, 5], [4, 30]]) {
      const item = items[idx];
      item.current_quantity += qty;
      item.recomputeStatus();
      await item.save();
      await InventoryLog.create({
        wishlist_item_id: item._id, action: 'Inflow', quantity: qty,
        note: 'Seed donation', recorded_by: superAdmin._id,
      });
    }
    // and one outflow so the log is not one-sided
    const rice = items[0];
    if (rice.current_quantity >= 2) {
      rice.current_quantity -= 2;
      rice.recomputeStatus();
      await rice.save();
      await InventoryLog.create({
        wishlist_item_id: rice._id, action: 'Outflow', quantity: 2,
        note: 'Cooked for the residents', recorded_by: superAdmin._id,
      });
    }
  }

  // ---- events -------------------------------------------------------------
  if (!(await Event.countDocuments())) {
    const soon = new Date(); soon.setDate(soon.getDate() + 14);
    const later = new Date(); later.setDate(later.getDate() + 28);
    await Event.insertMany([
      { type: 'Event', title: 'Feeding Day with the Residents', description: 'Volunteers help prepare and serve lunch.', event_date: soon, event_time: '10:00 AM', venue: 'Bahay Pag-ibig dining hall', status: 'Upcoming', is_published: true, created_by: superAdmin._id },
      { type: 'Event', title: 'Recreational Afternoon', description: 'Games and singing with the residents.', event_date: later, event_time: '2:00 PM', venue: 'Activity area', status: 'Upcoming', is_published: true, created_by: superAdmin._id },
      { type: 'Announcement', title: 'Rice and bath soap urgently needed', description: 'Our rice and bath soap stock is below the minimum threshold.', status: 'Upcoming', is_published: true, created_by: superAdmin._id },
    ]);
    console.log('  events   + 3');
  }

  if (!(await ContactInquiry.countDocuments())) {
    await ContactInquiry.insertMany([
      { sender_name: 'Liza Garcia', contact_info: 'liza.garcia@email.com', subject: 'Group donation', message: 'Our office would like to donate groceries next month. How do we arrange it?' },
      { sender_name: 'Mark Tiongson', contact_info: '0917 555 0133', subject: 'Volunteering', message: 'Do you accept student volunteers on weekdays?' },
      { sender_name: 'Joy Santiago', contact_info: 'joy.santiago@email.com', subject: 'Visit', message: 'May we visit this Saturday to hand over donations?' },
    ]);
    console.log('  inquiries+ 3');
  }

  console.log('\nSeed complete.');
  console.log('Sign in with: ' + STAFF[0].email + ' / ' + password + '  (Super Admin)');
  console.log('Staff accounts share the same password. Change them before any real use.');
  await mongoose.disconnect();
}

run().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
