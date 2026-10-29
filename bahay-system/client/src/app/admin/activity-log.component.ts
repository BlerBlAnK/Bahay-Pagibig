import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ActivityLogEntry } from '../core/models';

/** FR-16 — the audit trail. Written by the server, never editable from here. */
@Component({
  selector: 'bp-activity-log', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <div class="head">
      <div>
        <h1>Activity Log</h1>
        <p class="muted small">Every sign-in and every change, with who made it. Entries are written
           by the system and cannot be edited or removed from this screen.</p>
      </div>
    </div>

    <div class="body">
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      <div class="filters">
        <div class="field inline">
          <label for="m">Module</label>
          <select id="m" [(ngModel)]="module" (ngModelChange)="load()">
            <option value="">All</option>
            @for (m of modules; track m) { <option [value]="m">{{ m }}</option> }
          </select>
        </div>
        <div class="field inline">
          <label for="a">Action</label>
          <select id="a" [(ngModel)]="action" (ngModelChange)="load()">
            <option value="">All</option>
            @for (a of actions; track a) { <option [value]="a">{{ a }}</option> }
          </select>
        </div>
      </div>

      <div class="card">
        <div class="card-body tight">
          @if (loading()) { <p class="spinner">Loading…</p> }
          @else if (rows().length === 0) { <p class="muted small pad">No entries match these filters.</p> }
          @else {
            <table>
              <thead>
                <tr><th>When</th><th>Staff member</th><th>Role</th><th>Action</th>
                    <th>Module</th><th>Detail</th></tr>
              </thead>
              <tbody>
                @for (e of rows(); track e._id) {
                  <tr>
                    <td class="nowrap small">{{ e.timestamp | date: 'MMM d, y · h:mm a' }}</td>
                    <td><strong>{{ name(e) }}</strong></td>
                    <td><span class="badge" [class.badge-gold]="role(e) === 'Super Admin'">{{ role(e) }}</span></td>
                    <td><span class="badge"
                              [class.badge-ok]="e.action === 'Create'"
                              [class.badge-warn]="e.action === 'Update'"
                              [class.badge-brand]="e.action === 'Delete'">{{ e.action }}</span></td>
                    <td class="small">{{ e.module }}</td>
                    <td class="small detail">{{ e.detail || '—' }}</td>
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
    .head { background: #fff; border-bottom: 1px solid var(--line); padding: 20px 32px; }
    .head h1 { font-size: 26px; margin-bottom: 2px; }
    .head p { margin: 0; max-width: 75ch; }
    .body { padding: 22px 32px 40px; }
    .filters { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .field.inline { display: flex; flex-direction: row; align-items: center; gap: 8px;
                    margin: 0; flex: 0 0 auto; }
    .field.inline label { margin: 0; font-size: 12px; }
    .field.inline select { width: auto; min-width: 160px; }
    .card-body.tight { padding: 0; overflow-x: auto; }
    .pad { padding: 16px 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
         color: var(--muted); padding: 11px 14px; background: var(--paper);
         border-bottom: 1px solid var(--line); white-space: nowrap; }
    td { padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    .nowrap { white-space: nowrap; }
    .detail { color: var(--ink-soft); max-width: 420px; }
    .badge-gold { background: var(--gold-pale); color: var(--gold-dark); }
    @media (max-width: 900px) { .head, .body { padding-left: 18px; padding-right: 18px; } }
  `],
})
export class ActivityLogComponent implements OnInit {
  private api = inject(ApiService);
  modules = ['Authentication', 'Volunteers', 'Donations', 'Wishlist', 'Inventory',
             'Events', 'FAQs', 'Inquiries', 'Reports', 'User Accounts'];
  actions = ['Create', 'Update', 'Delete', 'Login', 'Logout', 'Export'];
  rows = signal<ActivityLogEntry[]>([]);
  loading = signal(true); error = signal('');
  module = ''; action = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.activityLog({ module: this.module, action: this.action }).subscribe({
      next: l => { this.rows.set(l); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message || 'Could not load the log.'); this.loading.set(false); },
    });
  }

  name(e: ActivityLogEntry): string {
    return e.user_id && typeof e.user_id === 'object' ? e.user_id.full_name : 'System';
  }
  role(e: ActivityLogEntry): string {
    return e.user_id && typeof e.user_id === 'object' ? e.user_id.role : '—';
  }
}
