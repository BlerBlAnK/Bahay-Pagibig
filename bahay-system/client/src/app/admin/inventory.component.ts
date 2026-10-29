import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { InventoryEntry, User } from '../core/models';

/** FR-13 — the full inflow and outflow history, newest first. */
@Component({
  selector: 'bp-inventory', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <div class="head">
      <div>
        <h1>Inventory Log</h1>
        <p class="muted small">Every movement of stock: donations coming in, and items the facility
           has used. Entries are written by the system and cannot be edited here.</p>
      </div>
    </div>

    <div class="body">
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      <div class="filters">
        <div class="field inline">
          <label for="a">Movement</label>
          <select id="a" [(ngModel)]="action" (ngModelChange)="load()">
            <option value="">All</option>
            <option value="Inflow">Inflow — received</option>
            <option value="Outflow">Outflow — used</option>
          </select>
        </div>
        <div class="field inline">
          <label for="l">Show</label>
          <select id="l" [(ngModel)]="limit" (ngModelChange)="load()">
            <option [ngValue]="50">Last 50</option>
            <option [ngValue]="100">Last 100</option>
            <option [ngValue]="500">Last 500</option>
          </select>
        </div>
      </div>

      <div class="card">
        <div class="card-body tight">
          @if (loading()) { <p class="spinner">Loading…</p> }
          @else if (rows().length === 0) {
            <p class="muted small pad">No movements recorded yet.</p>
          } @else {
            <table>
              <thead>
                <tr><th>When</th><th>Item</th><th>Movement</th><th>Quantity</th>
                    <th>Note</th><th>Recorded by</th></tr>
              </thead>
              <tbody>
                @for (e of rows(); track e._id) {
                  <tr>
                    <td class="nowrap small">{{ e.timestamp | date: 'MMM d, y · h:mm a' }}</td>
                    <td><strong>{{ itemName(e) }}</strong></td>
                    <td>
                      <span class="badge" [class.badge-ok]="e.action === 'Inflow'"
                            [class.badge-warn]="e.action === 'Outflow'">{{ e.action }}</span>
                    </td>
                    <td class="qty">
                      {{ e.action === 'Inflow' ? '+' : '−' }}{{ e.quantity }} {{ unit(e) }}
                    </td>
                    <td class="small detail">{{ e.note || '—' }}</td>
                    <td class="small muted">{{ who(e) }}</td>
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
    .field.inline select { width: auto; min-width: 170px; }
    .card-body.tight { padding: 0; overflow-x: auto; }
    .pad { padding: 16px 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
         color: var(--muted); padding: 11px 14px; background: var(--paper);
         border-bottom: 1px solid var(--line); white-space: nowrap; }
    td { padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    .nowrap { white-space: nowrap; }
    .qty { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .detail { color: var(--ink-soft); max-width: 340px; }
    @media (max-width: 900px) { .head, .body { padding-left: 18px; padding-right: 18px; } }
  `],
})
export class InventoryComponent implements OnInit {
  private api = inject(ApiService);
  rows = signal<InventoryEntry[]>([]);
  loading = signal(true); error = signal('');
  action = ''; limit = 100;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.inventoryLog({ action: this.action, limit: this.limit }).subscribe({
      next: l => { this.rows.set(l); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message || 'Could not load the log.'); this.loading.set(false); },
    });
  }

  itemName(e: InventoryEntry): string {
    return e.wishlist_item_id && typeof e.wishlist_item_id === 'object'
      ? e.wishlist_item_id.item_name : 'Item no longer listed';
  }
  unit(e: InventoryEntry): string {
    return e.wishlist_item_id && typeof e.wishlist_item_id === 'object'
      ? (e.wishlist_item_id.unit || '') : '';
  }
  who(e: InventoryEntry): string {
    const r = e.recorded_by as User | string | undefined;
    return r && typeof r === 'object' ? r.full_name : '—';
  }
}
