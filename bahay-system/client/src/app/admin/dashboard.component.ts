import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ContactInquiry, Donation, Overview, Volunteer } from '../core/models';

/**
 * FR-14 — the deliberately minimal dashboard. Six operational counters and the
 * three queues staff act on. Charts live on Graphical Reports, not here.
 */
@Component({
  selector: 'bp-dashboard', standalone: true, imports: [CommonModule, RouterLink],
  template: `
    <div class="head">
      <div>
        <h1>Dashboard</h1>
        <p class="muted small">{{ today | date: 'EEEE, MMMM d, y' }} · signed in as {{ auth.user()?.full_name }}</p>
      </div>
      <a class="btn btn-primary" routerLink="/admin/donations/new">Log New Donation</a>
    </div>

    <div class="body">
      @if (denied) {
        <div class="notice notice-error">User Accounts is restricted to the Super Admin account.</div>
      }

      <div class="tiles">
        <a class="tile" routerLink="/admin/profiles">
          <span class="label">Active Volunteers</span>
          <strong>{{ o()?.active_volunteers ?? '—' }}</strong>
          <span class="sub muted">Approved and on record</span>
        </a>
        <a class="tile" routerLink="/admin/applications">
          <span class="label">Pending Applications</span>
          <strong [class.flag]="(o()?.pending_applications ?? 0) > 0">{{ o()?.pending_applications ?? '—' }}</strong>
          <span class="sub muted">Awaiting review and approval</span>
        </a>
        <a class="tile" routerLink="/admin/donations">
          <span class="label">Monetary Donations</span>
          <strong>{{ o() ? (o()!.financial_donations | currency: 'PHP' : 'symbol-narrow' : '1.0-0') : '—' }}</strong>
          <span class="sub muted">Verified, this month</span>
        </a>
        <a class="tile" routerLink="/admin/profiles">
          <span class="label">Volunteer Hours</span>
          <strong>{{ o()?.volunteer_hours ?? '—' }}</strong>
          <span class="sub muted">Logged this month</span>
        </a>
        <a class="tile" routerLink="/admin/donations">
          <span class="label">Awaiting Verification</span>
          <strong [class.flag]="(o()?.pending_verification ?? 0) > 0">{{ o()?.pending_verification ?? '—' }}</strong>
          <span class="sub muted">Donor-reported, unconfirmed</span>
        </a>
        <a class="tile" routerLink="/admin/wishlist">
          <span class="label">Items Below Threshold</span>
          <strong [class.flag]="(o()?.low_stock ?? 0) > 0">{{ o()?.low_stock ?? '—' }}</strong>
          <span class="sub muted">Needs restocking</span>
        </a>
      </div>

      <div class="queues">
        <section class="card">
          <div class="card-head">
            <h3>Applications to review</h3>
            <a class="small" routerLink="/admin/applications">View all</a>
          </div>
          <div class="card-body tight">
            @if (apps().length === 0) { <p class="muted small">Nothing waiting.</p> }
            @for (v of apps(); track v._id) {
              <div class="row">
                <div>
                  <strong>{{ v.full_name }}</strong>
                  <span class="small muted">{{ v.applicant_type }} · {{ v.area_of_service }}</span>
                </div>
                <span class="small muted">{{ v.application_date | date: 'MMM d' }}</span>
              </div>
            }
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h3>Donations to verify</h3>
            <a class="small" routerLink="/admin/donations">View all</a>
          </div>
          <div class="card-body tight">
            @if (pendingDonations().length === 0) { <p class="muted small">Nothing waiting.</p> }
            @for (d of pendingDonations(); track d._id) {
              <div class="row">
                <div>
                  <strong>{{ d.donor_name || 'Anonymous' }}</strong>
                  <span class="small muted">
                    {{ d.donation_type }}
                    @if (d.reference_number) { · Ref {{ d.reference_number }} }
                  </span>
                </div>
                <span class="small muted">
                  @if (d.amount) { {{ d.amount | currency: 'PHP' : 'symbol-narrow' : '1.0-0' }} }
                  @else { {{ d.quantity }} {{ d.item_description }} }
                </span>
              </div>
            }
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h3>Unread inquiries</h3>
            <a class="small" routerLink="/admin/inquiries">View all</a>
          </div>
          <div class="card-body tight">
            @if (unread().length === 0) { <p class="muted small">Nothing waiting.</p> }
            @for (i of unread(); track i._id) {
              <div class="row">
                <div>
                  <strong>{{ i.sender_name }}</strong>
                  <span class="small muted">{{ i.subject || 'No subject' }}</span>
                </div>
                <span class="small muted">{{ i.date_submitted | date: 'MMM d' }}</span>
              </div>
            }
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .head { background: #fff; border-bottom: 1px solid var(--line); padding: 20px 32px;
            display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .head h1 { font-size: 26px; margin-bottom: 2px; }
    .head p { margin: 0; }
    .body { padding: 26px 32px 40px; }
    .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .tile { background: #fff; border: 1px solid var(--line); border-radius: var(--radius);
            padding: 18px 20px; text-decoration: none; display: block; }
    .tile:hover { border-color: var(--brand); box-shadow: var(--shadow); }
    .label { font-size: 11px; letter-spacing: .07em; text-transform: uppercase; color: var(--muted); }
    .tile strong { display: block; font-family: var(--serif); font-size: 30px; color: var(--ink);
                   line-height: 1.1; margin: 6px 0 2px; }
    .tile strong.flag { color: var(--brand-bright); }
    .sub { font-size: 12px; }
    .queues { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;
              margin-top: 22px; align-items: start; }
    .card-head h3 { font-family: var(--serif); font-size: 17px; margin: 0; }
    .card-body.tight { padding: 4px 0 8px; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px;
           padding: 10px 18px; border-bottom: 1px solid var(--line); }
    .row:last-child { border-bottom: 0; }
    .row strong { display: block; font-size: 13px; }
    .row span.small { display: block; }
    @media (max-width: 1100px) { .tiles { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 900px) {
      .head, .body { padding-left: 18px; padding-right: 18px; }
      .tiles { grid-template-columns: 1fr; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  today = new Date();
  denied = new URLSearchParams(location.search).get('denied') === 'user-accounts';

  o = signal<Overview | null>(null);
  apps = signal<Volunteer[]>([]);
  pendingDonations = signal<Donation[]>([]);
  unread = signal<ContactInquiry[]>([]);

  ngOnInit(): void {
    this.api.overview().subscribe({ next: v => this.o.set(v), error: () => {} });
    this.api.volunteers({ status: 'Pending', limit: 5 })
      .subscribe({ next: l => this.apps.set(l.slice(0, 5)), error: () => {} });
    this.api.donations({ verification_status: 'Pending', limit: 5 })
      .subscribe({ next: l => this.pendingDonations.set(l.slice(0, 5)), error: () => {} });
    this.api.inquiries({ status: 'Unread' })
      .subscribe({ next: l => this.unread.set(l.slice(0, 5)), error: () => {} });
  }
}
