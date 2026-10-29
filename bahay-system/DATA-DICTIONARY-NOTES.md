# Where the implementation goes beyond Appendix H

Group 7 · WD403 Capstone

Building the system surfaced fields that the panel's revision requests need but
that Appendix H (the data dictionary, pages 55–69 of the revised manuscript)
does not yet list. The code has them; the appendix does not. Each item below
says what the implementation does and what the manuscript needs so the two
agree at final submission.

Every suggestion here is a **recommendation, not a change already made to the
manuscript** — the `.docx` has not been edited.

---

## 1. `volunteers` — seven fields the forms collect are missing

Appendix H lists `_id`, `full_name`, `email`, `contact_info`, `availability`,
`area_of_service`, `application_date`, `status`, `certificates`,
`reviewed_by`, `reviewed_at`, `created_at` and `updated_at`.

Panel request 3 was *"Edit the forms, add the Home address and Gender role."*
The implementation therefore adds:

| Field | Type | Why |
|-------|------|-----|
| `home_address` | String, required | Panel request 3 |
| `gender` | String | Panel request 3 |
| `civil_status` | String | Completes the applicant profile the form collects |
| `date_of_birth` | Date | Needed to confirm an applicant is of age |
| `applicant_type` | Enum: `Individual`, `Group or Organization` | Panel request 4 — group donations and group volunteering |
| `wants_event_emails` | Boolean, default `false` | Opt-in for the event announcements |
| `reason` | String | The form asks why the applicant wants to volunteer, and the Applications screen shows the answer |

FR-06 already names home address, gender, civil status and date of birth in its
own wording, so the gap is in the table, not in the requirement.

**What the manuscript needs:** seven new rows in the `volunteers` table of
Appendix H. The Volunteer Registration screen description already lists the
fields.

---

## 2. `donations` — the whole of FR-11 has no columns

Appendix H lists `_id`, `donor_name`, `donor_contact`, `donation_type`,
`amount`, `item_description`, `quantity`, `date_donated`, `donation_method`,
`wishlist_item_id` and `recorded_by`.

FR-11 already requires a confirmation form carrying *"Reference Number, Date,
Amount, and Proof-of-Payment screenshot"* for dual-party verification, and
panel request 7 concerned duplicate donations. None of it can be recorded in
the table as written. The implementation adds:

| Field | Type | Why |
|-------|------|-----|
| `reference_number` | String, indexed | Panel request 8 — the GCash/Maya/bank reference both parties hold |
| `transaction_date` | Date | Panel request 8 — when the donor sent it, which is not always when staff recorded it |
| `proof_of_payment` | String (file path) | The donor's uploaded receipt screenshot |
| `donor_classification` | Enum: `Individual`, `Group / Organization`, `Anonymous` | Panel request 4 |
| `verification_status` | Enum: `Pending`, `Verified`, `Rejected` | A donor-reported donation is not yet a confirmed one |
| `verified_by` | ObjectId → `users` | Who confirmed it against the facility's record |
| `verified_at` | Date | When |
| `source` | Enum: `Donor report`, `Staff entry` | Distinguishes the two ways a record is created |
| `wants_event_emails` | Boolean | Lets donors opt into announcements, not volunteers only |

`amount` is already `Decimal128` in Appendix H, and the implementation keeps
it that way — money in a floating-point field accumulates rounding error
across a monthly total.

**What the manuscript needs:** nine new rows in the `donations` table, and a
sentence in the FR-11 description explaining that a donor-reported donation
enters as `Pending` and becomes `Verified` only when a staff member matches the
reference number against the facility's own bank or e-wallet record. That
matching step is the whole point of the panel's request, and it is currently
implied rather than stated.

---

## 3. `users.role` — Super Admin does not exist in the appendix

Appendix H gives `role` as *"Admin, Authorized Staff"*. Panel request 6 was
*"(Admin Side) Include admin and super admin account."*

The implementation uses two roles only: **`Super Admin`** and **`Admin`**.
"Authorized Staff" was dropped because nothing in the functional requirements
distinguishes it from Admin — every staff member who can sign in can do the
day-to-day work, and the only real division of privilege the panel asked for is
account management.

**What the manuscript needs:**

- `users.role` becomes *"Super Admin, Admin"* in Appendix H.
- A new functional requirement, since there is currently none covering this.
  The manuscript's requirement table ends at FR-15, so the next two numbers
  are free. Suggested wording:

  > **FR-16** The system shall provide two administrative roles. A *Super
  > Admin* may create, disable and change the role of staff accounts; an
  > *Admin* may perform all other administrative functions but may not manage
  > accounts. The system shall prevent the last remaining Super Admin from
  > removing their own privileges.

- A second new requirement for the duplicate guard, which the panel asked for
  (request 7) and which likewise has no FR:

  > **FR-17** Before recording a donation, the system shall check for an
  > existing record with the same reference number, or the same donor, amount
  > and date, and shall warn the staff member before the entry is saved. The
  > staff member may confirm that the donation is genuinely separate, and the
  > confirmation shall be written to the activity log.

---

## 4. `organization_info` — a collection Appendix H does not have

FR-05 requires administrators to edit organizational information *"without
altering source code"*. Appendix H has collections for events and FAQs but none
for the facility's own details, so that part of FR-05 could not be met as
specified — the About Us text would have to live in the source.

The implementation adds an `organization_info` collection holding exactly one
document:

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `name` | String | Facility name, shown in the header and footer |
| `tagline` | String | The headline on the home page |
| `about` | String | The About Us paragraph |
| `mission` | String | Mission statement |
| `vision` | String | Vision statement |
| `history` | String | Founding and background |
| `address` | String | Shown on About Us, Contact Us and the footer |
| `contact_number` | String | As above |
| `email` | String | As above |
| `visiting_hours` | String | Visiting and donation hours |
| `facts` | Array | Embedded `{ value, label }` figures shown as cards on About Us |
| `updated_by` | ObjectId → `users` | Who last edited the content |
| `updated_at` | Date | When |

**What the manuscript needs:** this table added to Appendix H as a twelfth
collection, and the Organization Info screen described in Chapter 3 alongside
the other content-management screens.

---

## 5. `activity_logs.timestamp` is used but not declared

Appendix H lists `_id`, `user_id`, `action`, `module` and `target_id`, and its
own index definitions reference `timestamp` — but the field itself is not in
the table. The implementation declares it, and adds one more:

| Field | Type | Why |
|-------|------|-----|
| `timestamp` | Date, indexed | Referenced by the appendix's own index definitions; FR-02 requires actions to be recorded *with a timestamp* |
| `detail` | String | The human-readable line the Activity Log screen shows, e.g. *"Verified donation GC-8841209377"*. `target_id` alone identifies the record but says nothing a reader can audit |

**What the manuscript needs:** two new rows in the `activity_logs` table.

---

## 6. Analytics → Graphical Reports

The adviser asked for Analytics to be renamed, since what the panel expects on
an analytics page is not what the screen actually shows. The implementation
calls it **Graphical Reports** and places it under *Reports & Logs*, above
Monthly Reports, rather than under *Overview*.

**What the manuscript needs:**

- The module name *"Decision Support Analytics & Reporting"* still appears in
  the manuscript and should become *"Reporting"* or *"Reports and Logs"*.
- FR-14's wording refers to an *"analytics dashboard"* and to *"inventory
  turnover"*. Neither matches the screen: it shows donation trends, volunteer
  distribution by area of service, and current inventory against target. It
  does not compute turnover, and claiming it does would be a defect at
  demonstration. Suggested wording:

  > **FR-14** The system shall present graphical reports of donation trends
  > over the last twelve months, the distribution of volunteers by area of
  > service, and current inventory levels against target quantities, and shall
  > present on the dashboard a summary of items requiring staff action.

- Appendix K (the wireframes) is renumbered K.1–K.28 in the current screen
  order, with the two new screens — Report Your Donation and User Accounts —
  and the two mobile views inserted. The figure cross-references in Chapter 3
  will need to follow.

---

## 7. Two roles, and what each can reach

A note for the defence. Role-based access is enforced twice over: the Angular
route guard keeps an Admin out of User Accounts, and the server's
`requireRole` middleware rejects the request even if someone calls the API
directly. A Super Admin passes every Admin check, which is asserted in the
test suite rather than assumed.

Staff change their own password on *My Account*; a Super Admin resets a
forgotten one from *User Accounts*. Neither path lets the last Super Admin
remove their own privileges — the server returns 409.

---

## 8. Monetary and in-kind donations are not comparable

A note for the defence rather than the manuscript. Pesos and item counts share
no unit, so the Graphical Reports screen draws them as two charts with separate
axes rather than one chart with two series. On a single axis the in-kind series
renders as a flat line against a peso scale and reads as "no in-kind
donations", which is false. If a panel member asks why there are two charts
instead of one, that is the answer.
