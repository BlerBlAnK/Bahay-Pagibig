import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import * as M from './models';

/** One place that knows the API surface. Components call these, never HttpClient. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  private params(q: Record<string, unknown> = {}): HttpParams {
    let p = new HttpParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    });
    return p;
  }

  /* ---- public portal ---- */
  publicWishlist(status?: string): Observable<M.WishlistItem[]> {
    return this.http.get<M.WishlistItem[]>(`${this.base}/wishlist/public`, { params: this.params({ status }) });
  }
  publicOrganization(): Observable<M.OrganizationInfo> {
    return this.http.get<M.OrganizationInfo>(`${this.base}/content/organization/public`);
  }
  publicEvents(): Observable<M.FacilityEvent[]> {
    return this.http.get<M.FacilityEvent[]>(`${this.base}/content/events/public`);
  }
  publicFaqs(): Observable<M.Faq[]> {
    return this.http.get<M.Faq[]>(`${this.base}/content/faqs/public`);
  }
  applyAsVolunteer(body: Record<string, unknown>) {
    return this.http.post<{ message: string; reference: string }>(`${this.base}/volunteers/apply`, body);
  }
  /** FR-11 — multipart because of the proof-of-payment image. */
  reportDonation(form: FormData) {
    return this.http.post<{ message: string; reference: string }>(`${this.base}/donations/report`, form);
  }
  sendInquiry(body: Record<string, unknown>) {
    return this.http.post<{ message: string }>(`${this.base}/content/inquiries`, body);
  }

  /* ---- volunteers ---- */
  volunteers(q: Record<string, unknown> = {}): Observable<M.Volunteer[]> {
    return this.http.get<M.Volunteer[]>(`${this.base}/volunteers`, { params: this.params(q) });
  }
  volunteerCounts() {
    return this.http.get<Record<string, number>>(`${this.base}/volunteers/counts`);
  }
  volunteer(id: string) {
    return this.http.get<{ volunteer: M.Volunteer; activities: M.VolunteerActivity[]; total_hours: number }>(
      `${this.base}/volunteers/${id}`);
  }
  reviewVolunteer(id: string, decision: 'Approved' | 'Rejected', orientation?: string) {
    return this.http.post<{ message: string; volunteer: M.Volunteer }>(
      `${this.base}/volunteers/${id}/review`, { decision, orientation });
  }
  logHours(id: string, body: Record<string, unknown>) {
    return this.http.post<M.VolunteerActivity>(`${this.base}/volunteers/${id}/hours`, body);
  }
  generateCertificate(id: string, activity?: string) {
    return this.http.post<{ message: string; certificate: M.Certificate }>(
      `${this.base}/volunteers/${id}/certificate`, { activity });
  }

  /* ---- donations ---- */
  donations(q: Record<string, unknown> = {}): Observable<M.Donation[]> {
    return this.http.get<M.Donation[]>(`${this.base}/donations`, { params: this.params(q) });
  }
  donationSummary() {
    return this.http.get<Record<string, number>>(`${this.base}/donations/summary`);
  }
  checkDuplicate(q: Record<string, unknown>) {
    return this.http.get<{ duplicate: boolean; reason?: string; existing?: M.Donation }>(
      `${this.base}/donations/check-duplicate`, { params: this.params(q) });
  }
  createDonation(body: Record<string, unknown>) {
    return this.http.post<{ donation: M.Donation; wishlist: M.WishlistItem | null }>(`${this.base}/donations`, body);
  }
  verifyDonation(id: string, decision: 'Verified' | 'Rejected') {
    return this.http.post<M.Donation>(`${this.base}/donations/${id}/verify`, { decision });
  }

  /* ---- wishlist and inventory ---- */
  wishlist(): Observable<M.WishlistItem[]> {
    return this.http.get<M.WishlistItem[]>(`${this.base}/wishlist`);
  }
  createWishlistItem(body: Record<string, unknown>) {
    return this.http.post<M.WishlistItem>(`${this.base}/wishlist`, body);
  }
  updateWishlistItem(id: string, body: Record<string, unknown>) {
    return this.http.patch<M.WishlistItem>(`${this.base}/wishlist/${id}`, body);
  }
  deductStock(id: string, quantity: number, note?: string) {
    return this.http.post<{ item: M.WishlistItem; log: M.InventoryEntry }>(
      `${this.base}/wishlist/${id}/deduct`, { quantity, note });
  }
  itemLog(id: string): Observable<M.InventoryEntry[]> {
    return this.http.get<M.InventoryEntry[]>(`${this.base}/wishlist/${id}/log`);
  }
  deleteWishlistItem(id: string) {
    return this.http.delete<{ message: string }>(`${this.base}/wishlist/${id}`);
  }
  inventoryLog(q: Record<string, unknown> = {}): Observable<M.InventoryEntry[]> {
    return this.http.get<M.InventoryEntry[]>(`${this.base}/inventory`, { params: this.params(q) });
  }

  /* ---- content ---- */
  events(): Observable<M.FacilityEvent[]> {
    return this.http.get<M.FacilityEvent[]>(`${this.base}/content/events`);
  }
  createEvent(body: Record<string, unknown>) {
    return this.http.post<M.FacilityEvent>(`${this.base}/content/events`, body);
  }
  updateEvent(id: string, body: Record<string, unknown>) {
    return this.http.patch<M.FacilityEvent>(`${this.base}/content/events/${id}`, body);
  }
  announcementRecipients() {
    return this.http.get<{ volunteers: number; donors: number; total: number }>(
      `${this.base}/content/announcements/recipients`);
  }
  sendAnnouncement(days = 30) {
    return this.http.post<{ message: string; events: number; recipients: number; mocked: boolean }>(
      `${this.base}/content/announcements/send`, { days });
  }
  deleteEvent(id: string) {
    return this.http.delete<{ message: string }>(`${this.base}/content/events/${id}`);
  }
  organization(): Observable<M.OrganizationInfo> {
    return this.http.get<M.OrganizationInfo>(`${this.base}/content/organization`);
  }
  updateOrganization(body: Record<string, unknown>) {
    return this.http.patch<M.OrganizationInfo>(`${this.base}/content/organization`, body);
  }
  faqs(): Observable<M.Faq[]> { return this.http.get<M.Faq[]>(`${this.base}/content/faqs`); }
  createFaq(body: Record<string, unknown>) { return this.http.post<M.Faq>(`${this.base}/content/faqs`, body); }
  updateFaq(id: string, body: Record<string, unknown>) {
    return this.http.patch<M.Faq>(`${this.base}/content/faqs/${id}`, body);
  }
  deleteFaq(id: string) {
    return this.http.delete<{ message: string }>(`${this.base}/content/faqs/${id}`);
  }
  inquiries(q: Record<string, unknown> = {}): Observable<M.ContactInquiry[]> {
    return this.http.get<M.ContactInquiry[]>(`${this.base}/content/inquiries`, { params: this.params(q) });
  }
  updateInquiry(id: string, body: Record<string, unknown>) {
    return this.http.patch<M.ContactInquiry>(`${this.base}/content/inquiries/${id}`, body);
  }

  /* ---- graphical reports (FR-14) and monthly reports (FR-15) ---- */
  overview() { return this.http.get<M.Overview>(`${this.base}/reports/overview`); }
  donationTrends(months = 12) {
    return this.http.get<M.TrendPoint[]>(`${this.base}/reports/donation-trends`, { params: this.params({ months }) });
  }
  volunteerDistribution() { return this.http.get<M.Distribution>(`${this.base}/reports/volunteer-distribution`); }
  inventoryLevels() { return this.http.get<M.InventoryLevel[]>(`${this.base}/reports/inventory-levels`); }
  monthlyReports() { return this.http.get<M.MonthlyReportRow[]>(`${this.base}/reports/monthly`); }
  generateMonthlyReport(report_month: string) {
    return this.http.post<{ message: string; report: M.MonthlyReportRow }>(
      `${this.base}/reports/monthly`, { report_month });
  }
  activityLog(q: Record<string, unknown> = {}): Observable<M.ActivityLogEntry[]> {
    return this.http.get<M.ActivityLogEntry[]>(`${this.base}/reports/activity-log`, { params: this.params(q) });
  }

  /* ---- user accounts (Super Admin only) ---- */
  users(): Observable<M.User[]> { return this.http.get<M.User[]>(`${this.base}/users`); }
  createUser(body: Record<string, unknown>) { return this.http.post<M.User>(`${this.base}/users`, body); }
  updateUser(id: string, body: Record<string, unknown>) {
    return this.http.patch<M.User>(`${this.base}/users/${id}`, body);
  }
  resetUserPassword(id: string, password: string) {
    return this.http.post<{ message: string }>(`${this.base}/users/${id}/password`, { password });
  }
  /** A staff member changing their own password. */
  changeOwnPassword(current_password: string, new_password: string) {
    return this.http.post<{ message: string }>(
      `${this.base}/auth/password`, { current_password, new_password });
  }
}
