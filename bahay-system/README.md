# Bahay Pag-ibig — Operations Management System with Public Information Portal

Group 7 · WD403 Capstone · School of Computing, Holy Angel University

A MEAN-stack implementation of the system described in the revised proposal
manuscript: a public information portal for donors and volunteers, and an
administrative dashboard for facility staff.

| Layer    | Technology                                   |
|----------|----------------------------------------------|
| Frontend | Angular 18 (standalone components, signals)  |
| Backend  | Node.js + Express 4                          |
| Database | MongoDB Atlas via Mongoose 8                 |
| Auth     | JSON Web Tokens, bcrypt password hashing     |
| PDFs     | PDFKit (certificates, monthly reports)       |
| Email    | Nodemailer (volunteer decisions, announcements) |

---

## 1. What is in the box

```
bahay-system/
├── server/                 Express API
│   ├── models/             12 collections — Appendix H's 11, plus organization_info
│   ├── routes/             auth, users, volunteers, donations, wishlist,
│   │                       inventory, content, reports
│   ├── middleware/         auth.js (RBAC), activityLog.js, errors.js
│   ├── utils/              mailer.js, pdf.js
│   ├── test/               unit.js (24 checks), smoke.js (end-to-end)
│   ├── seed.js             sample staff, wishlist, volunteers, donations
│   └── server.js
└── client/                 Angular 18 single-page application
    └── src/app/
        ├── core/           models, API service, auth, guards, interceptor
        ├── public/         8 public portal screens
        └── admin/          18 administrative screens
```

---

## 2. Running it locally

You need Node.js 18 or newer and a MongoDB connection string. A free MongoDB
Atlas cluster is enough; a local `mongod` works too.

### 2.1 Backend

```bash
cd server
npm install
cp .env.example .env        # then fill in MONGODB_URI and JWT_SECRET
npm run seed                # sample data — optional but recommended
npm run dev                 # http://localhost:5000
```

`npm run seed -- --fresh` empties the collections first.

Check it answered:

```bash
curl http://localhost:5000/api/health
```

### 2.2 Frontend

```bash
cd client
npm install
npx ng serve                # http://localhost:4200
```

`src/environments/environment.ts` points at `http://localhost:5000/api`. Change
`environment.prod.ts` to the deployed API URL before building for production.

### 2.3 Signing in

`npm run seed` creates the five staff accounts from the manuscript's Sample
section. They share one password, which the seed script prints when it
finishes; set `SEED_PASSWORD` in `.env` to choose your own. Change them before
the system holds any real data.

| Account        | Email                           | Role        |
|----------------|---------------------------------|-------------|
| Maria Santos   | `operations@bahaypagibig.org`   | Super Admin |
| Jose Cruz      | `logistics@bahaypagibig.org`    | Admin       |
| Divina Reyes   | `marketing@bahaypagibig.org`    | Admin       |
| Ana Dela Cruz  | `social1@bahaypagibig.org`      | Admin       |
| Rosa Mendoza   | `social2@bahaypagibig.org`      | Admin       |

Only the Super Admin sees **User Accounts** in the sidebar, and the route guard
turns anyone else away.

---

## 3. Tests

```bash
cd server
npm test            # 24 checks, no database needed
npm run test:e2e    # full API walkthrough, needs a running mongod
```

`npm test` covers the logic that is easy to get wrong and expensive to debug
later: wishlist status transitions, the role gate (a Super Admin passes every
Admin check), password hashing and redaction, PDF generation, peso formatting,
and that every protected route rejects a request with no token.

`npm run test:e2e` signs in, submits a volunteer application, approves it, logs
hours, issues a certificate, reports a donation, verifies it, checks the
duplicate guard, deducts stock, and generates a monthly report — roughly forty
assertions end to end. It needs a real MongoDB because it exercises the
indexes and the aggregation pipelines.

---

## 4. Which screen serves which requirement

The manuscript's requirement table runs FR-01 to FR-15; there is no FR-16.

### Public information portal

| Route            | Screen                            | Requirement |
|------------------|-----------------------------------|-------------|
| `/`              | Home                              | FR-03, FR-05 |
| `/about`         | About Us                          | FR-03 |
| `/events`        | Events & Announcements            | FR-05 |
| `/wishlist`      | Wishlist & Donation Guidelines    | FR-10 |
| `/donate/report` | Report Your Donation              | FR-11 |
| `/volunteer`     | Volunteer Registration            | FR-06, FR-07 |
| `/contact`       | Contact Us                        | FR-03 |
| `/faq`           | FAQ Assistant                     | FR-04 |

### Administrative dashboard

| Route                       | Screen                 | Requirement |
|-----------------------------|------------------------|-------------|
| `/admin/login`              | Staff Sign In          | FR-01 |
| `/admin/dashboard`          | Dashboard              | FR-14 |
| `/admin/applications`       | Volunteer Applications | FR-07 |
| `/admin/profiles`           | Profiles & Hours       | FR-08 |
| `/admin/certificates`       | Certificates           | FR-09 |
| `/admin/donations`          | Donation Records       | FR-12 |
| `/admin/donations/new`      | Log New Donation       | FR-12 |
| `/admin/wishlist`           | Wishlist & Inventory   | FR-10, FR-13 |
| `/admin/inventory`          | Inventory Log          | FR-13 |
| `/admin/events`             | Events & Announcements | FR-05 |
| `/admin/organization`       | Organization Info      | FR-05 |
| `/admin/faqs`               | FAQ Content            | FR-04, FR-05 |
| `/admin/inquiries`          | Contact Inquiries      | FR-03 |
| `/admin/graphical-reports`  | Graphical Reports      | FR-14 |
| `/admin/monthly-reports`    | Monthly Reports        | FR-15 |
| `/admin/activity-log`       | Activity Log           | FR-02 |
| `/admin/account`            | My Account             | FR-01 |
| `/admin/accounts`           | User Accounts          | no FR yet — see notes |

Every screen listed above is built and wired to the API. There are no
placeholders.

---

## 5. The panel's revision requests

Every item from the defence panel is implemented:

| Request | Where it lives |
|---------|----------------|
| Notification on registration | `POST /api/volunteers/apply` emails an acknowledgement (`utils/mailer.js → volunteerAcknowledgement`) |
| Review and approval of registrations | `/admin/applications` — approve or decline, applicant emailed either way |
| Home address and gender on the forms | `/volunteer` collects home address, gender, civil status, date of birth and applicant type |
| Group donation in the guidelines | `/wishlist` distinguishes individual from group or organization donors; `donor_classification` on every donation |
| Printed reports | `/admin/monthly-reports` generates a PDF per month, with a Print / Download link |
| Admin and Super Admin accounts | `/admin/accounts`, Super Admin only; `middleware/auth.js` enforces the gate |
| Redundancy of donations | `GET /api/donations/check-duplicate` warns before saving; staff confirm with `force: true` |
| How to donate and donation monitoring | `/donate/report` captures reference number, transaction date and proof of payment; staff verify against the facility's record |

The only thing the portal still needs from the facility is the pair of payment
QR images. FR-11 requires GCash and bank QR codes; the Wishlist page has the
two slots ready, and dropping `gcash-qr.png` and `bank-qr.png` into
`client/src/assets` fills them. They are deliberately not invented here —
a wrong QR code sends a donor's money to the wrong account.

Two further changes came from the adviser rather than the panel:

- **Analytics renamed to Graphical Reports** and moved out of *Overview* into
  *Reports & Logs*, where it sits above Monthly Reports. The dashboard keeps
  only operational counters and the three queues staff act on.
- **Donors are notified as well as volunteers.** The announcement recipients
  are approved volunteers *and* recorded donors who ticked the opt-in box, and
  the Events screen shows the split before anything is sent.

Two gaps found while building were closed rather than left for the panel to
find:

- **Organization Info was unimplementable as specified.** FR-05 requires staff
  to edit organizational information without altering source code, but
  Appendix H has no collection for it. There is now an `organization_info`
  collection, and the public About Us page, the home page hero and the site
  footer all read from it.
- **Staff could not change their own password.** A Super Admin could reset
  someone else's, which leaves a staff member stuck with whatever temporary
  password they were given. `My Account` (reached from the sidebar footer) now
  handles it, and asks for the current password first.

---

## 6. Deployment

**See `DEPLOY.md`** for the full click-path — Atlas, then Render, then Vercel,
in that order, with the env vars each one needs. The summary below is the
shape of it.

### Backend on Render

1. New Web Service, connect the repository, root directory `server`.
2. Build `npm install`, start `npm start`.
3. Environment: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (the Vercel URL),
   and the `SMTP_*` variables.
4. In MongoDB Atlas → Network Access, allow Render's outbound addresses, or
   `0.0.0.0/0` while testing.

### Frontend on Vercel

1. Import the repository, root directory `client`.
2. Build `npm run build`, output `dist/bahay-pagibig/browser`.
3. Set `apiUrl` in `src/environments/environment.prod.ts` to the Render URL
   before deploying.
4. Add a rewrite so deep links reach the app:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Uploaded proof-of-payment images and generated PDFs are written to
`server/uploads`. Render's disk is ephemeral, so for anything beyond the
defence demonstration these belong in object storage.

---

## 7. Notes for the manuscript

`DATA-DICTIONARY-NOTES.md` lists the places where the implementation had to go
beyond Appendix H, and what the appendix needs in order to match. Read it
before the final submission — several of the fields the panel asked for have
no column in the data dictionary as it currently stands.
