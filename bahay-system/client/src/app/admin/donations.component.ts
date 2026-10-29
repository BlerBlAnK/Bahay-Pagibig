import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Donation } from '../core/models';

/** FR-11 / FR-12 — donation records with the reference number and verification state. */
@Component({
  selector: 'bp-donations', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="head">
      <div>
        <h1>Donation Records</h1>
        <p class="muted small">Monetary and in-kind donations, both staff-entered and donor-reported.</p>
      </div>
      <a class="btn btn-primary" routerLink="/admin/donations/new">Log New Donation</a>
    </div>

    <div class="body">
      @if (flash()) { <div class="notice notice-ok">{{ flash() }}</div> }
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      <div class="filters">
        <div class="field inline">
          <label for="t">Type</label>
          <select id="t" [(ngModel)]="type" (ngModelChange)="load()">
            <option value="">All</option>
            <option value="Monetary">Monetary</option>
            <option value="In-kind">In-kind</option>
          </select>
        </div>
        <div class="field inline">
          <label for="v">Verification</label>
          <select id="v" [(ngModel)]="verification" (ngModelChange)="load()">
            <option value="">All</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div class="field inline">
          <label for="s">Source</label>
          <select id="s" [(ngModel)]="source" (ngModelChange)="load()">
            <option value="">All</option>
            <option value="Donor report">Donor report</option>
            <option value="Staff entry">Staff entry</option>
          </select>
        </div>
      </div>

      <div class="card">
        <div class="card-body tight">
          @if (loading()) { <p class="spinner">Loading…</p> }
          @else if (rows().length === 0) { <p class="muted small pad">No donations match these filters.</p> }
          @else {
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Donor</th><th>Classification</th><th>Type</th>
                  <th>Amount / Item</th><th>Method</th><th>Reference No.</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (d of rows(); track d._id) {
                  <tr>
                    <td class="nowrap">{{ (d.transaction_date || d.date_donated) | date: 'MMM d, y' }}</td>
                    <td><strong>{{ d.donor_name || 'Anonymous' }}</strong>
                        @if (d.donor_contact) { <span class="small muted">{{ d.donor_contact }}</span> }</td>
                    <td class="small">{{ d.donor_classification }}</td>
                    <td class="small">{{ d.donation_type }}</td>
                    <td>
                      @if (d.donation_type === 'Monetary') {
                        {{ d.amount | currency: 'PHP' : 'symbol-narrow' : '1.2-2' }}
                      } @else {
                        {{ d.quantity }} × {{ d.item_description }}
                      }
                    </td>
                    <td class="small">{{ d.donation_method || '—' }}</td>
                    <td class="mono small">{{ d.reference_number || '—' }}</td>
                    <td>
                      <span class="badge"
                            [class.badge-ok]="d.verification_status === 'Verified'"
                            [class.badge-warn]="d.verification_status === 'Pending'"
                            [class.badge-brand]="d.verification_status === 'Rejected'">
                        {{ d.verification_status }}</span>
                      @if (d.source === 'Donor report') { <span class="src small muted">Donor-reported</span> }
                    </td>
                    <td class="nowrap">
                      @if (d.verification_status === 'Pending') {
                        <button class="link" [disabled]="busy()" (click)="verify(d, 'Verified')">Verify</button>
                        <button class="link danger" [disabled]="busy()" (click)="verify(d, 'Rejected')">Reject</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>

      <p class="small muted note">A donation reported by a donor stays <strong>Pending</strong> until a
         staff member matches the reference number against the facility's own record, which is what
         keeps both parties' books in agreement.</p>
    </div>
  `,
  styles: [`
    .head { background: #fff; border-bottom: 1px solid var(--line); padding: 20px 32px;
            display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .head h1 { font-size: 26px; margin-bottom: 2px; }
    .head p { margin: 0; }
    .body { padding: 22px 32px 40px; }
    .filters { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .field.inline { display: flex; flex-direction: row; align-items: center; gap: 8px;
                    margin: 0; flex: 0 0 auto; }
    .field.inline label { margin: 0; font-size: 12px; }
    .field.inline select { width: auto; min-width: 150px; }
    .card-body.tight { padding: 0; overflow-x: auto; }
    .pad { padding: 16px 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
         color: var(--muted); padding: 11px 14px; background: var(--paper);
         border-bottom: 1px solid var(--line); white-space: nowrap; }
    td { padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    td strong { display: block; }
    td span.small { display: block; }
    .nowrap { white-space: nowrap; }
    .mono { font-variant-numeric: tabular-nums; letter-spacing: .02em; }
    .src { display: block; margin-top: 3px; font-size: 10px; }
    .link { background: none; border: 0; padding: 0 8px 0 0; font: inherit; font-size: 12px;
            font-weight: 600; color: var(--brand); cursor: pointer; }
    .link.danger { color: var(--muted); }
    .note { margin-top: 14px; max-width: 80ch; }
    @media (max-width: 900px) { .head, .body { padding-left: 18px; padding-right: 18px; } }
  `],
})
export class DonationsComponent implements OnInit {
  private api = inject(ApiService);
  rows = signal<Donation[]>([]);
  loading = signal(true); busy = signal(false);
  flash = signal(''); error = signal('');
  type = ''; verification = ''; source = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.donations({
      donation_type: this.type, verification_status: this.verification, source: this.source,
    }).subscribe({
      next: l => { this.rows.set(l); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message || 'Could not load donations.'); this.loading.set(false); },
    });
  }

  verify(d: Donation, decision: 'Verified' | 'Rejected'): void {
    this.busy.set(true); this.error.set('');
    this.api.verifyDonation(d._id, decision).subscribe({
      next: () => {
        this.flash.set(`Donation from ${d.donor_name || 'Anonymous'} marked ${decision}.`);
        this.busy.set(false);
        this.load();
      },
      error: err => { this.error.set(err?.error?.message || 'Could not update the donation.'); this.busy.set(false); },
    });
  }
}
