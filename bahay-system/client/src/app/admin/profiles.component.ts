import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { User, Volunteer, VolunteerActivity } from '../core/models';

/** FR-08 — volunteer profiles, assigned activities and logged service hours. */
@Component({
  selector: 'bp-profiles', standalone: true, imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="head">
      <div>
        <h1>Profiles &amp; Hours</h1>
        <p class="muted small">Approved volunteers and the service hours recorded against each one.</p>
      </div>
    </div>

    <div class="body">
      @if (flash()) { <div class="notice notice-ok">{{ flash() }}</div> }
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      <div class="split">
        <section class="card list">
          <div class="card-head"><h3>Approved volunteers</h3></div>
          <div class="card-body tight">
            @if (loading()) { <p class="spinner">Loading…</p> }
            @else if (rows().length === 0) {
              <p class="muted small pad">No approved volunteers yet. Approve an application first.</p>
            }
            @for (v of rows(); track v._id) {
              <button class="row" [class.on]="selected()?._id === v._id" (click)="open(v)">
                <div>
                  <strong>{{ v.full_name }}</strong>
                  <span class="small muted">{{ v.area_of_service }}</span>
                </div>
                @if (v.certificates.length) {
                  <span class="badge badge-ok">{{ v.certificates.length }} cert</span>
                }
              </button>
            }
          </div>
        </section>

        <section class="detail">
          @if (selected(); as v) {
            <div class="card">
              <div class="card-head">
                <h3>{{ v.full_name }}</h3>
                <span class="hours"><strong>{{ totalHours() }}</strong> hours logged</span>
              </div>
              <div class="card-body">
                <dl>
                  <dt>Applying as</dt><dd>{{ v.applicant_type }}</dd>
                  <dt>Email</dt><dd>{{ v.email }}</dd>
                  <dt>Contact</dt><dd>{{ v.contact_info }}</dd>
                  <dt>Home address</dt><dd>{{ v.home_address }}</dd>
                  <dt>Area of service</dt><dd>{{ v.area_of_service }}</dd>
                  <dt>Availability</dt><dd>{{ v.availability || '—' }}</dd>
                  <dt>Approved</dt><dd>{{ v.reviewed_at | date: 'MMMM d, y' }}</dd>
                </dl>
              </div>
            </div>

            <form class="card" [formGroup]="form" (ngSubmit)="logHours()">
              <div class="card-head"><h3>Log service hours</h3></div>
              <div class="card-body">
                <div class="row three">
                  <div class="field">
                    <label for="sd">Service date *</label>
                    <input id="sd" type="date" formControlName="service_date">
                  </div>
                  <div class="field">
                    <label for="hr">Hours *</label>
                    <input id="hr" type="number" min="0.5" max="24" step="0.5" formControlName="hours">
                  </div>
                  <div class="field">
                    <label for="ad">What they did</label>
                    <input id="ad" type="text" formControlName="activity_description"
                           placeholder="e.g. Lunch service">
                  </div>
                </div>
                <button class="btn btn-primary" type="submit" [disabled]="busy()">
                  {{ busy() ? 'Saving…' : 'Add Hours' }}</button>
                <p class="small muted">Hours must fall between 0 and 24 for a single day, and can
                   only be logged against an approved volunteer.</p>
              </div>
            </form>

            <div class="card">
              <div class="card-head"><h3>Service history</h3></div>
              <div class="card-body tight">
                @if (activities().length === 0) {
                  <p class="muted small pad">Nothing logged yet.</p>
                } @else {
                  <table>
                    <thead><tr><th>Date</th><th>Hours</th><th>Activity</th><th>Recorded by</th></tr></thead>
                    <tbody>
                      @for (a of activities(); track a._id) {
                        <tr>
                          <td class="nowrap">{{ a.service_date | date: 'MMM d, y' }}</td>
                          <td>{{ a.hours }}</td>
                          <td>{{ a.activity_description || '—' }}</td>
                          <td class="small muted">{{ who(a) }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                }
              </div>
            </div>
          } @else {
            <div class="card"><div class="card-body">
              <p class="muted small">Select a volunteer to see their profile and service history.</p>
            </div></div>
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
    .split { display: grid; grid-template-columns: 320px 1fr; gap: 20px; align-items: start; }
    .detail { display: flex; flex-direction: column; gap: 18px; }
    .card-head h3 { font-family: var(--serif); font-size: 18px; margin: 0; }
    .hours { font-size: 12px; color: var(--muted); }
    .hours strong { font-family: var(--serif); font-size: 20px; color: var(--brand); }
    .card-body.tight { padding: 0; }
    .pad { padding: 16px 18px; }
    .row { display: flex; width: 100%; text-align: left; align-items: center;
           justify-content: space-between; gap: 10px; padding: 12px 18px; background: #fff;
           border: 0; border-bottom: 1px solid var(--line); font: inherit; cursor: pointer; }
    .row:last-child { border-bottom: 0; }
    .row:hover { background: var(--paper); }
    .row.on { background: var(--brand-pale); }
    .row > div { min-width: 0; }
    .row strong { display: block; font-size: 13px; }
    .row span.small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row .badge { flex-shrink: 0; }
    dl { display: grid; grid-template-columns: 150px 1fr; gap: 8px 14px; margin: 0; }
    dt { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted);
         padding-top: 2px; }
    dd { margin: 0; font-size: 14px; }
    .row.three { display: grid; grid-template-columns: 1fr 1fr 2fr; gap: 18px; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
         color: var(--muted); padding: 11px 14px; background: var(--paper);
         border-bottom: 1px solid var(--line); }
    td { padding: 11px 14px; border-bottom: 1px solid var(--line); }
    tr:last-child td { border-bottom: 0; }
    .nowrap { white-space: nowrap; }
    @media (max-width: 1100px) {
      .head, .body { padding-left: 18px; padding-right: 18px; }
      .split { grid-template-columns: 1fr; }
      dl, .row.three { grid-template-columns: 1fr; }
    }
  `],
})
export class ProfilesComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  rows = signal<Volunteer[]>([]);
  selected = signal<Volunteer | null>(null);
  activities = signal<VolunteerActivity[]>([]);
  totalHours = signal(0);
  loading = signal(true); busy = signal(false);
  flash = signal(''); error = signal('');

  form = this.fb.nonNullable.group({
    service_date:         [new Date().toISOString().slice(0, 10), Validators.required],
    hours:                [null as number | null, Validators.required],
    activity_description: [''],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.volunteers({ status: 'Approved' }).subscribe({
      next: l => { this.rows.set(l); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message || 'Could not load volunteers.'); this.loading.set(false); },
    });
  }

  open(v: Volunteer): void {
    this.selected.set(v);
    this.flash.set(''); this.error.set('');
    this.api.volunteer(v._id).subscribe({
      next: res => {
        this.selected.set(res.volunteer);
        this.activities.set(res.activities);
        this.totalHours.set(res.total_hours);
      },
      error: err => this.error.set(err?.error?.message || 'Could not load that profile.'),
    });
  }

  who(a: VolunteerActivity): string {
    const r = a.recorded_by as User | string | undefined;
    return r && typeof r === 'object' ? r.full_name : '—';
  }

  logHours(): void {
    const v = this.selected();
    if (!v) return;
    const { service_date, hours } = this.form.getRawValue();
    if (!service_date || !hours || hours <= 0) {
      this.error.set('Enter the service date and how many hours were given.');
      return;
    }
    this.busy.set(true); this.error.set('');
    this.api.logHours(v._id, this.form.getRawValue()).subscribe({
      next: () => {
        this.flash.set(`${hours} hour${hours === 1 ? '' : 's'} added for ${v.full_name}.`);
        this.busy.set(false);
        this.form.patchValue({ hours: null, activity_description: '' });
        this.open(v);
      },
      error: err => { this.error.set(err?.error?.message || 'Could not log the hours.'); this.busy.set(false); },
    });
  }
}
