import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { MonthlyReportRow, User } from '../core/models';
import { environment } from '../../environments/environment';

/** FR-15 — monthly reports, generated as PDFs so they can be printed (panel item 5). */
@Component({
  selector: 'bp-monthly-reports', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <div class="head">
      <div>
        <h1>Monthly Reports</h1>
        <p class="muted small">A signed-off summary of donations, volunteer hours and events for one
           month, saved as a PDF that can be printed for the facility's records.</p>
      </div>
    </div>

    <div class="body">
      @if (flash()) { <div class="notice notice-ok">{{ flash() }}</div> }
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      <section class="card gen">
        <div class="card-body">
          <div class="gen-row">
            <div class="field inline">
              <label for="m">Report month</label>
              <input id="m" type="month" [(ngModel)]="month">
            </div>
            <button class="btn btn-primary" [disabled]="busy()" (click)="generate()">
              {{ busy() ? 'Generating…' : 'Generate Report' }}</button>
          </div>
          <p class="small muted">Regenerating a month replaces its figures with the records as they
             stand now, which is what makes a late-verified donation appear in the right month.</p>
        </div>
      </section>

      <div class="card">
        <div class="card-body tight">
          @if (loading()) { <p class="spinner">Loading…</p> }
          @else if (rows().length === 0) { <p class="muted small pad">No reports generated yet.</p> }
          @else {
            <table>
              <thead>
                <tr><th>Month</th><th>Monetary</th><th>In-kind</th><th>Volunteer hours</th>
                    <th>Events</th><th>Generated</th><th>By</th><th></th></tr>
              </thead>
              <tbody>
                @for (r of rows(); track r._id) {
                  <tr>
                    <td><strong>{{ label(r.report_month) }}</strong></td>
                    <td>{{ r.total_monetary_donations | currency: 'PHP' : 'symbol-narrow' : '1.2-2' }}</td>
                    <td>{{ r.total_inkind_donations }} item{{ r.total_inkind_donations === 1 ? '' : 's' }}</td>
                    <td>{{ r.total_volunteer_hours }}</td>
                    <td>{{ r.total_events }}</td>
                    <td class="nowrap small">{{ r.generated_at | date: 'MMM d, y' }}</td>
                    <td class="small">{{ who(r) }}</td>
                    <td class="nowrap">
                      @if (r.file_path) {
                        <a class="link" [href]="url(r)" target="_blank" rel="noopener">Print / Download</a>
                      } @else { <span class="small muted">—</span> }
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
    .head { background: #fff; border-bottom: 1px solid var(--line); padding: 20px 32px; }
    .head h1 { font-size: 26px; margin-bottom: 2px; }
    .head p { margin: 0; max-width: 75ch; }
    .body { padding: 22px 32px 40px; }
    .gen { margin-bottom: 18px; }
    .gen-row { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 10px; }
    .field.inline { margin: 0; flex: 0 0 auto; }
    .field.inline input { width: 200px; }
    .gen p { margin: 0; max-width: 80ch; }
    .card-body.tight { padding: 0; overflow-x: auto; }
    .pad { padding: 16px 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
         color: var(--muted); padding: 11px 14px; background: var(--paper);
         border-bottom: 1px solid var(--line); white-space: nowrap; }
    td { padding: 11px 14px; border-bottom: 1px solid var(--line); }
    tr:last-child td { border-bottom: 0; }
    .nowrap { white-space: nowrap; }
    .link { font-size: 12px; font-weight: 600; }
    @media (max-width: 900px) { .head, .body { padding-left: 18px; padding-right: 18px; } }
  `],
})
export class MonthlyReportsComponent implements OnInit {
  private api = inject(ApiService);
  rows = signal<MonthlyReportRow[]>([]);
  loading = signal(true); busy = signal(false);
  flash = signal(''); error = signal('');
  month = new Date().toISOString().slice(0, 7);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.monthlyReports().subscribe({
      next: l => { this.rows.set(l); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message || 'Could not load reports.'); this.loading.set(false); },
    });
  }

  generate(): void {
    if (!this.month) { this.error.set('Pick a month first.'); return; }
    this.busy.set(true); this.error.set('');
    this.api.generateMonthlyReport(this.month).subscribe({
      next: res => {
        this.flash.set(res.message || `Report for ${this.label(this.month)} is ready.`);
        this.busy.set(false);
        this.load();
      },
      error: err => { this.error.set(err?.error?.message || 'Could not generate the report.'); this.busy.set(false); },
    });
  }

  label(m: string): string {
    const [y, mo] = m.split('-').map(Number);
    if (!y || !mo) return m;
    return new Date(y, mo - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  }

  who(r: MonthlyReportRow): string {
    const g = r.generated_by as User | string;
    return g && typeof g === 'object' ? g.full_name : '—';
  }

  url(r: MonthlyReportRow): string {
    return `${environment.apiUrl.replace(/\/api$/, '')}/${String(r.file_path).replace(/^\//, '')}`;
  }
}
