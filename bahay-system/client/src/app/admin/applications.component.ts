import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Volunteer } from '../core/models';

/** FR-07 — review and approval, with the acknowledgement email the panel asked for. */
@Component({
  selector: 'bp-applications', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <div class="head">
      <div>
        <h1>Volunteer Applications</h1>
        <p class="muted small">Review each application, then approve or decline. The applicant is
           emailed either way.</p>
      </div>
    </div>

    <div class="body">
      @if (flash()) { <div class="notice notice-ok">{{ flash() }}</div> }
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      <div class="tabs">
        @for (s of statuses; track s) {
          <button class="tab" [class.on]="status() === s" (click)="pick(s)">{{ s }}</button>
        }
      </div>

      <div class="split">
        <section class="card list">
          <div class="card-body tight">
            @if (loading()) { <p class="spinner">Loading…</p> }
            @else if (rows().length === 0) { <p class="muted small pad">No {{ status().toLowerCase() }} applications.</p> }
            @for (v of rows(); track v._id) {
              <button class="row" [class.on]="selected()?._id === v._id" (click)="open(v)">
                <div>
                  <strong>{{ v.full_name }}</strong>
                  <span class="small muted">{{ v.applicant_type }} · {{ v.area_of_service }}</span>
                </div>
                <span class="badge"
                      [class.badge-warn]="v.status === 'Pending'"
                      [class.badge-ok]="v.status === 'Approved'"
                      [class.badge-brand]="v.status === 'Rejected'">{{ v.status }}</span>
              </button>
            }
          </div>
        </section>

        <section class="card detail">
          @if (selected(); as v) {
            <div class="card-head">
              <h3>{{ v.full_name }}</h3>
              <span class="badge"
                    [class.badge-warn]="v.status === 'Pending'"
                    [class.badge-ok]="v.status === 'Approved'"
                    [class.badge-brand]="v.status === 'Rejected'">{{ v.status }}</span>
            </div>
            <div class="card-body">
              <dl>
                <dt>Applying as</dt><dd>{{ v.applicant_type }}</dd>
                <dt>Email</dt><dd>{{ v.email }}</dd>
                <dt>Contact</dt><dd>{{ v.contact_info }}</dd>
                <dt>Home address</dt><dd>{{ v.home_address }}</dd>
                <dt>Gender</dt><dd>{{ v.gender || '—' }}</dd>
                <dt>Civil status</dt><dd>{{ v.civil_status || '—' }}</dd>
                <dt>Date of birth</dt><dd>{{ v.date_of_birth ? (v.date_of_birth | date: 'MMMM d, y') : '—' }}</dd>
                <dt>Area of service</dt><dd>{{ v.area_of_service }}</dd>
                <dt>Availability</dt><dd>{{ v.availability || '—' }}</dd>
                <dt>Applied</dt><dd>{{ v.application_date | date: 'MMMM d, y' }}</dd>
                <dt>Event emails</dt>
                <dd>{{ v.wants_event_emails ? 'Yes — include in announcements' : 'No' }}</dd>
              </dl>
              @if (v.reason) {
                <p class="reason"><span class="label">Why they want to volunteer</span>{{ v.reason }}</p>
              }

              @if (v.status === 'Pending') {
                <div class="field">
                  <label for="o">Orientation schedule (included in the approval email)</label>
                  <input id="o" type="text" [(ngModel)]="orientation"
                         placeholder="e.g. Saturday, 8:00 AM at the facility">
                </div>
                <div class="actions">
                  <button class="btn btn-primary" [disabled]="busy()" (click)="decide(v, 'Approved')">
                    Approve &amp; Email</button>
                  <button class="btn btn-secondary" [disabled]="busy()" (click)="decide(v, 'Rejected')">
                    Decline</button>
                </div>
              } @else {
                <p class="small muted">
                  Reviewed {{ v.reviewed_at | date: 'MMMM d, y' }}
                  @if (reviewer(v)) { by {{ reviewer(v) }} }. The applicant was notified by email.
                </p>
              }
            </div>
          } @else {
            <div class="card-body"><p class="muted small">Select an application to review it.</p></div>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .head { background: #fff; border-bottom: 1px solid var(--line); padding: 20px 32px; }
    .head h1 { font-size: 26px; margin-bottom: 2px; }
    .head p { margin: 0; max-width: 70ch; }
    .body { padding: 22px 32px 40px; }
    .tabs { display: flex; gap: 8px; margin-bottom: 18px; }
    .tab { padding: 7px 16px; border-radius: 999px; border: 1px solid var(--line-strong); background: #fff;
           font: inherit; font-size: 13px; font-weight: 600; color: var(--ink-soft); cursor: pointer; }
    .tab.on { background: var(--brand); border-color: var(--brand); color: #fff; }
    .split { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: start; }
    .card-body.tight { padding: 0; }
    .pad { padding: 16px 18px; }
    .row { display: flex; width: 100%; text-align: left; align-items: center; justify-content: space-between;
           gap: 10px; padding: 12px 18px; background: #fff; border: 0; border-bottom: 1px solid var(--line);
           font: inherit; cursor: pointer; }
    .row:last-child { border-bottom: 0; }
    .row:hover { background: var(--paper); }
    .row.on { background: var(--brand-pale); }
    .row > div { min-width: 0; }
    .row strong { display: block; font-size: 13px; }
    .row span.small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row .badge { flex-shrink: 0; }
    .card-head h3 { font-family: var(--serif); font-size: 19px; margin: 0; }
    dl { display: grid; grid-template-columns: 170px 1fr; gap: 8px 14px; margin: 0 0 18px; }
    dt { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted);
         padding-top: 2px; }
    dd { margin: 0; font-size: 14px; color: var(--ink); }
    .reason { background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius);
              padding: 14px 16px; font-size: 14px; color: var(--ink-soft); }
    .reason .label { display: block; font-size: 11px; letter-spacing: .06em; text-transform: uppercase;
                     color: var(--muted); margin-bottom: 6px; }
    .actions { display: flex; gap: 10px; margin-top: 16px; }
    @media (max-width: 1000px) {
      .head, .body { padding-left: 18px; padding-right: 18px; }
      .split { grid-template-columns: 1fr; }
      dl { grid-template-columns: 1fr; gap: 2px 0; }
      dd { margin-bottom: 8px; }
    }
  `],
})
export class ApplicationsComponent implements OnInit {
  private api = inject(ApiService);
  statuses: Volunteer['status'][] = ['Pending', 'Approved', 'Rejected'];
  status = signal<Volunteer['status']>('Pending');
  rows = signal<Volunteer[]>([]);
  selected = signal<Volunteer | null>(null);
  loading = signal(true);
  busy = signal(false);
  flash = signal(''); error = signal('');
  orientation = '';

  ngOnInit(): void { this.load(); }

  pick(s: Volunteer['status']): void { this.status.set(s); this.selected.set(null); this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.volunteers({ status: this.status() }).subscribe({
      next: l => { this.rows.set(l); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message || 'Could not load applications.'); this.loading.set(false); },
    });
  }

  open(v: Volunteer): void { this.selected.set(v); this.orientation = ''; this.flash.set(''); }

  reviewer(v: Volunteer): string {
    const r = v.reviewed_by;
    return r && typeof r === 'object' ? r.full_name : '';
  }

  decide(v: Volunteer, decision: 'Approved' | 'Rejected'): void {
    this.busy.set(true); this.error.set('');
    this.api.reviewVolunteer(v._id, decision, this.orientation || undefined).subscribe({
      next: res => {
        this.flash.set(res.message || `${v.full_name} was ${decision.toLowerCase()} and emailed.`);
        this.busy.set(false);
        this.selected.set(null);
        this.load();
      },
      error: err => {
        this.error.set(err?.error?.message || 'Could not record the decision.');
        this.busy.set(false);
      },
    });
  }
}
