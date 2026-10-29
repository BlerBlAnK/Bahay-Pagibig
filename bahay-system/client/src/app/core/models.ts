/** Shapes returned by the API — mirrors Appendix H. */

export type Role = 'Super Admin' | 'Admin';

export interface User {
  _id: string;
  full_name: string;
  email: string;
  position?: string;
  role: Role;
  status: 'Active' | 'Disabled';
  created_at?: string;
}

export interface Volunteer {
  _id: string;
  applicant_type: 'Individual' | 'Group or Organization';
  full_name: string;
  email: string;
  contact_info: string;
  home_address: string;
  gender?: string;
  civil_status?: string;
  date_of_birth?: string;
  availability?: string;
  area_of_service?: string;
  reason?: string;
  wants_event_emails: boolean;
  application_date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  certificates: Certificate[];
  reviewed_by?: User | string | null;
  reviewed_at?: string | null;
}

export interface Certificate {
  _id: string;
  activity: string;
  service_start: string;
  service_end: string;
  total_hours: number;
  date_issued: string;
  file_path?: string;
}

export interface VolunteerActivity {
  _id: string;
  volunteer_id: string;
  event_id?: string | null;
  service_date: string;
  hours: number;
  activity_description?: string;
  recorded_by?: User | string;
}

export interface WishlistItem {
  _id: string;
  item_name: string;
  category?: string;
  unit?: string;
  target_quantity: number;
  current_quantity: number;
  min_threshold: number;
  is_perishable: boolean;
  status: 'Needed' | 'Partially Fulfilled' | 'Fulfilled';
}

export interface Donation {
  _id: string;
  donor_classification: 'Individual' | 'Group / Organization' | 'Anonymous';
  donor_name: string | null;
  donor_contact: string | null;
  donation_type: 'Monetary' | 'In-kind';
  amount: number | null;
  donation_method?: string;
  reference_number: string | null;
  transaction_date: string | null;
  proof_of_payment: string | null;
  item_description: string | null;
  quantity: number | null;
  wishlist_item_id?: { _id: string; item_name: string } | string | null;
  date_donated: string;
  verification_status: 'Pending' | 'Verified' | 'Rejected';
  verified_by?: User | string | null;
  source: 'Donor report' | 'Staff entry';
  recorded_by?: User | string | null;
}

export interface InventoryEntry {
  _id: string;
  wishlist_item_id: { _id: string; item_name: string; unit?: string } | string;
  action: 'Inflow' | 'Outflow';
  quantity: number;
  note?: string;
  recorded_by?: User | string;
  timestamp: string;
}

export interface FacilityEvent {
  _id: string;
  type: 'Event' | 'Announcement';
  title: string;
  description?: string;
  event_date?: string | null;
  event_time?: string;
  venue?: string;
  status: string;
  is_published: boolean;
  announcement_sent_at?: string | null;
  recipient_count?: number;
}

export interface Faq {
  _id: string;
  question: string;
  answer: string;
  category?: string;
  display_order: number;
  is_active: boolean;
}

export interface ContactInquiry {
  _id: string;
  sender_name: string;
  contact_info: string;
  subject?: string;
  message: string;
  date_submitted: string;
  status: 'Unread' | 'Read' | 'Responded';
}

export interface ActivityLogEntry {
  _id: string;
  user_id: { _id: string; full_name: string; role: Role } | string;
  action: 'Create' | 'Update' | 'Delete' | 'Login' | 'Logout' | 'Export';
  module: string;
  detail?: string;
  timestamp: string;
}

export interface MonthlyReportRow {
  _id: string;
  report_month: string;
  generated_by: User | string;
  total_monetary_donations: number;
  total_inkind_donations: number;
  total_volunteer_hours: number;
  total_events: number;
  file_path?: string;
  generated_at: string;
}

export interface OrgFact { _id?: string; value: string; label: string; }

/** Not in Appendix H — the editable content behind the About Us page (FR-05). */
export interface OrganizationInfo {
  _id?: string;
  name: string;
  tagline: string;
  about: string;
  mission: string;
  vision: string;
  history: string;
  address: string;
  contact_number: string;
  email: string;
  visiting_hours: string;
  facts: OrgFact[];
  updated_by?: User | string | null;
  updated_at?: string;
}

/* ---- reporting shapes (FR-14) ---- */

export interface Overview {
  active_volunteers: number;
  pending_applications: number;
  financial_donations: number;
  volunteer_hours: number;
  pending_verification: number;
  low_stock: number;
}

export interface TrendPoint { month: string; monetary: number; inkind: number; count: number; }

export interface Distribution {
  total: number;
  areas: { area: string; count: number; percent: number }[];
}

export interface InventoryLevel {
  item_name: string; unit?: string; in_stock: number; min_threshold: number;
  target_quantity: number; status: string; below_threshold: boolean;
}
