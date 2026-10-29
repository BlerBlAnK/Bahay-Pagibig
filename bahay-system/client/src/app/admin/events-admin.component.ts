import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { FacilityEvent } from '../core/models';

/**
 * FR-05 — events and announcements, plus the email announcement the panel asked
 * for. Recipients are approved volunteers and recorded donors who opted in, so
 * donors are notified as well, not volunteers only.
 */
@Component({
  selector: 'bp-events-admin', standalone: true, imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="head">
      <div>
        <h1>Events &amp; Announcements</h1>
        <p class="muted small">What appears on the public Events page, and what gets emailed out.</p>
      </div>
      <button class="btn btn-primary" (click)="showForm.set(!showForm())">
        {{ showForm() ? 'Close' : 'New Event' }}</button>
    </div>

    <div class="body">
      @if (flash()) { <div class="notice notice-ok">{{ flash() }}</div> }
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      <section class="card announce">
        <div class="card-body">
          <div class="announce-row">
            <div>
              <h3>Announce to volunteers and donors</h3>
              <p class="small muted">
                Sends every published event in the next 30 days in one email to
                @if (r(); as c) {
                  <strong>{{ c.total }}</strong> recipient{{ c.total === 1 ? '' : 's' }} —
                  {{ c.volunteers }} approved volunteer{{ c.volunteers === 1 ? '' : 's' }} and
                  {{ c.donors }} donor{{ c.donors === 1 ? '' : 's' }} who opted in.
                } @else { everyone who opted in. }
              </p>
            </div>
            <button class="btn btn-primary" [disabled]="sending() || (r()?.total ?? 0) === 0"
                    (click)="send()">
              {{ sending() ? 'Sending…' : 'Send Announcement' }}</button>
          </div>
          <p class="small muted hint">Opting in is a checkbox on both the volunteer registration form
             and the donation report form, so nobody is emailed who did not ask to be.</p>
        </div>
      </section>

      @if (showForm()) {
        <form class="card" [formGroup]="form" (ngSubmit)="create()">
          <div class="card-head"><h3>New event or announcement</h3></div>
          <div class="card-body">
            <div class="row">
              <div class="field">
                <label for="ty">Type</label>
                <select id="ty" formControlName="type">
                  <option value="Event">Event</option>
                  <option value="Announcement">Announcement</option>
                </select>
              </div>
              <div class="field">
                <label for="ti">Title *</label>
                <input id="ti" type="text" formControlName="title">
              </div>
            </div>
            <div class="field">
              <label for="de">Description</label>
              <textarea id="de" formControlName="description"></textarea>
            </div>
            <div class="row three">
              <div class="field">
                <label for="dt">Date</label>
                <input id="dt" type="date" formControlName="event_date">
              </div>
              <div class="field">
                <label for="tm">Time</label>
                <input id="tm" type="time" formControlName="event_time">
              </div>
              <div class="field">
                <label for="ve">Venue</label>
                <input id="ve" type="text" formControlName="venue">
              </div>
            </div>
            <label class="check">
              <input type="checkbox" formControlName="is_published">
              <span>Publish on the public Events page straight away</span>
            </label>
            <div class="actions">
              <button class="btn btn-primary" type="submit" [disabled]="busy()">
                {{ busy() ? 'Saving…' : 'Save' }}</button>
              <button class="btn btn-secondary" type="button" (click)="showForm.set(false)">Cancel</button>
            </div>
          </div>
        </form>
      }

      <div class="card">
        <div class="card-body tight">
          @if (loading()) { <p class="spinner">Loading…</p> }
          @else if (rows().length === 0) { <p class="muted small pad">Nothing posted yet.</p> }
          @else {
            <table>
              <thead>
                <tr><th>Title</th><th>Type</th><th>Date</th><th>Venue</th>
                    <th>Public</th><th>Announced</th><th></th></tr>
              </thead>
              <tbody>
                @for (e of rows(); track e._id) {
                  <tr>
                    <td><strong>{{ e.title }}</strong>
                        @if (e.description) { <span class="small muted">{{ e.description }}</span> }</td>
                    <td class="small">{{ e.type }}</td>
                    <td class="nowrap small">
                      {{ e.event_date ? (e.event_date | date: 'MMM d, y') : '—' }}
                      @if (e.event_time) { <span class="small muted">{{ e.event_time }}</span> }
                    </td>
                    <td class="small">{{ e.venue || '—' }}</td>
                    <td><span class="badge" [class.badge-ok]="e.is_published">
                      {{ e.is_published ? 'Published' : 'Draft' }}</span></td>
                    <td>
                      @if (e.announcement_sent_at) {
                        <span class="badge badge-ok">Sent</span>
                        <span class="small muted">{{ e.announcement_sent_at | date: 'MMM d' }}
                          · {{ e.recipient_count }} recipients</span>
                      } @else { <span class="badge">Not sent</span> }
                    </td>
                    <td class="nowrap">
                      <button class="link" [disabled]="busy()" (click)="togglePublish(e)">
                        {{ e.is_published ? 'Unpublish' : 'Publish' }}</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .head { background: #fff; border-bottom: 1px solid var(--line); padding: 20px 32px;
            display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .head h1 { font-size: 26px; margin-bottom: 2px; }
    .head p { margin: 0; }
    .body { padding: 22px 32px 40px; }
    .announce { border-color: var(--brand); }
    .announce-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
    h3 { font-family: var(--serif); font-size: 18px; margin: 0 0 4px; }
    .announce-row p { margin: 0; max-width: 70ch; }
    .hint { margin: 12px 0 0; padding-top: 12px; border-top: 1px solid var(--line); }
    .row { display: grid; grid-template-columns: 1fr 2fr; gap: 18px; margin-bottom: 18px; }
    .row.three { grid-template-columns: 1fr 1fr 1fr; }
    .check { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; margin-bottom: 16px; }
    .check input { margin-top: 3px; }
    .actions { display: flex; gap: 10px; }
    .card-body.tight { padding: 0; overflow-x: auto; }
    .pad { padding: 16px 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
         color: var(--muted); padding: 11px 14px; background: var(--paper);
         border-bottom: 1px solid var(--line); white-space: nowrap; }
    td { padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    td strong { display: block; }
    td span.small { display: block; margin-top: 2px; }
    .nowrap { white-space: nowrap; }
    .link { background: none; border: 0; padding: 0; font: inherit; font-size: 12px;
            font-weight: 600; color: var(--brand); cursor: pointer; }
    @media (max-width: 900px) {
      .head, .body { padding-left: 18px; padding-right: 18px; }
      .announce-row { flex-direction: column; align-items: flex-start; }
      .row, .row.three { grid-template-columns: 1fr; }
    }
  `],
})
export class EventsAdminComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  rows = signal<FacilityEvent[]>([]);
  r = signal<{ volunteers: number; donors: number; total: number } | null>(null);
  loading = signal(true); busy = signal(false); sending = signal(false);
  showForm = signal(false);
  flash = signal(''); error = signal('');

  form = this.fb.nonNullable.group({
    type:         ['Event'],
    title:        ['', Validators.required],
    description:  [''],
    event_date:   [''],
    event_time:   [''],
    venue:        [''],
    is_published: [true],
  });

  ngOnInit(): void { this.load(); this.counts(); }

  load(): void {
    this.loading.set(true);
    this.api.events().subscribe({
      next: l => { this.rows.set(l); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message || 'Could not load events.'); this.loading.set(false); },
    });
  }

  counts(): void {
    this.api.announcementRecipients().subscribe({ next: c => this.r.set(c), error: () => {} });
  }

  create(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.error.set('Give the event a title.'); return; }
    this.busy.set(true); this.error.set('');
    const v = this.form.getRawValue();
    this.api.createEvent({ ...v, event_date: v.event_date || null }).subscribe({
      next: () => {
        this.flash.set('Saved.');
        this.busy.set(false);
        this.showForm.set(false);
        this.form.reset({ type: 'Event', is_published: true });
        this.load();
      },
      error: err => { this.error.set(err?.error?.message || 'Could not save.'); this.busy.set(false); },
    });
  }

  togglePublish(e: FacilityEvent): void {
    this.busy.set(true);
    this.api.updateEvent(e._id, { is_published: !e.is_published }).subscribe({
      next: () => { this.busy.set(false); this.load(); },
      error: err => { this.error.set(err?.error?.message || 'Could not update.'); this.busy.set(false); },
    });
  }

  send(): void {
    this.sending.set(true); this.error.set('');
    this.api.sendAnnouncement(30).subscribe({
      next: res => {
        this.flash.set(res.mocked
          ? `${res.events} event(s) prepared for ${res.recipients} recipient(s). Mail is not configured, so the message was written to the server log instead of sent.`
          : `${res.events} event(s) emailed to ${res.recipients} recipient(s).`);
        this.sending.set(false);
        this.load();
      },
      error: err => {
        this.error.set(err?.error?.message || 'Could not send the announcement.');
        this.sending.set(false);
      },
    });
  }
}
