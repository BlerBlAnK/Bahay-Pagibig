/**
 * organization_info — the content behind the public About Us page.
 *
 * Not in Appendix H. FR-05 requires staff to be able to edit organizational
 * information "without altering source code", which is impossible while the
 * About page text lives in a component, so the text lives here instead.
 *
 * Exactly one document is ever stored; `current()` creates it on first use so
 * a fresh database still serves a working About page.
 */
const mongoose = require('mongoose');

const factSchema = new mongoose.Schema({
  value: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
}, { _id: true });

const schema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true, default: 'Bahay Pag-ibig' },
  tagline:         { type: String, trim: true, default: '' },
  about:           { type: String, trim: true, default: '' },
  mission:         { type: String, trim: true, default: '' },
  vision:          { type: String, trim: true, default: '' },
  history:         { type: String, trim: true, default: '' },

  address:         { type: String, trim: true, default: '' },
  contact_number:  { type: String, trim: true, default: '' },
  email:           { type: String, trim: true, default: '' },
  visiting_hours:  { type: String, trim: true, default: '' },

  /** Short figures shown on the About page, e.g. "53 — residents today". */
  facts:           { type: [factSchema], default: [] },

  updated_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

/** The single document, created with the facility's own details on first call. */
schema.statics.current = async function current() {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({
      name: 'Bahay Pag-ibig',
      tagline: 'A home where every resident is cared for',
      about: 'Bahay Pag-ibig is a residential facility for the elderly in San Fernando, '
           + 'Pampanga, caring for residents who were abandoned, neglected, or left without '
           + 'a home. It depends on donations and volunteers for daily operations and for '
           + 'the needs of its residents.',
      mission: 'To provide a safe home, daily care and companionship to elderly people who '
             + 'have nowhere else to turn, with the dignity every person deserves.',
      vision: 'A community where no elderly person is left without care, supported by '
            + 'neighbours, volunteers and donors who share the work.',
      history: 'Founded in 1988 as a non-stock, non-profit facility operating under a '
             + 'religious denomination, which places it in a different regulatory and '
             + 'funding category from public elderly care institutions.',
      address: 'San Fernando, Pampanga',
      contact_number: '0942-979-7756 (Viber)',
      email: 'bahaypagibig1988@gmail.com',
      visiting_hours: 'Monday to Sunday, 8:00 AM to 5:00 PM',
      facts: [
        { value: '1988', label: 'Founded' },
        { value: '53',   label: 'Residents today' },
        { value: '633',  label: 'Visits and activities a year' },
        { value: '5',    label: 'Staff members' },
      ],
    });
  }
  return doc;
};

module.exports = mongoose.model('OrganizationInfo', schema, 'organization_info');
