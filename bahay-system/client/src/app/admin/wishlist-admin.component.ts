import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { WishlistItem } from '../core/models';

/**
 * FR-10 — the Wishlist staff maintain, and FR-13's outflow: deducting stock
 * the facility has consumed, which writes to the inventory log and can never
 * take an item below zero.
 */
@Component({
  selector: 'bp-wishlist-admin', standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="head">
      <div>
        <h1>Wishlist &amp; Inventory</h1>
        <p class="muted small">What the facility is asking for, and how much of each item is on hand.
           This is what the public Wishlist page shows.</p>
      </div>
      <button class="btn btn-primary" (click)="showForm.set(!showForm())">
        {{ showForm() ? 'Close' : 'New Item' }}</button>
    </div>

    <div class="body">
      @if (flash()) { <div class="notice notice-ok">{{ flash() }}</div> }
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      @if (showForm()) {
        <form class="card" [formGroup]="form" (ngSubmit)="create()">
          <div class="card-head"><h3>New wishlist item</h3></div>
          <div class="card-body">
            <div class="row">
              <div class="field">
                <label for="n">Item name *</label>
                <input id="n" type="text" formControlName="item_name">
              </div>
              <div class="field">
                <label for="c">Category</label>
                <select id="c" formControlName="category">
                  @for (c of categories; track c) { <option [value]="c">{{ c }}</option> }
                </select>
              </div>
            </div>
            <div class="row four">
              <div class="field">
                <label for="u">Unit</label>
                <input id="u" type="text" formControlName="unit" placeholder="packs, sacks, cans">
              </div>
              <div class="field">
                <label for="t">Target quantity *</label>
                <input id="t" type="number" min="1" formControlName="target_quantity">
              </div>
              <div class="field">
                <label for="m">Minimum threshold</label>
                <input id="m" type="number" min="0" formControlName="min_threshold">
              </div>
              <div class="field check-field">
                <span class="label">Perishable</span>
                <label class="check">
                  <input type="checkbox" formControlName="is_perishable">
                  <span>Spoils — needs regular restocking</span>
                </label>
              </div>
            </div>
            <div class="actions">
              <button class="btn btn-primary" type="submit" [disabled]="busy()">
                {{ busy() ? 'Saving…' : 'Add Item' }}</button>
              <button class="btn btn-secondary" type="button" (click)="showForm.set(false)">Cancel</button>
            </div>
            <p class="small muted">An item at or below its minimum threshold is flagged on the
               dashboard and on Graphical Reports.</p>
          </div>
        </form>
      }

      <div class="card">
        <div class="card-body tight">
          @if (loading()) { <p class="spinner">Loading…</p> }
          @else if (items().length === 0) {
            <p class="muted small pad">Nothing on the wishlist yet.</p>
          } @else {
            <table>
              <thead>
                <tr><th>Item</th><th>Category</th><th>On hand</th><th>Target</th>
                    <th>Minimum</th><th>Status</th><th>Deduct used stock</th></tr>
              </thead>
              <tbody>
                @for (i of items(); track i._id) {
                  <tr [class.low]="i.current_quantity <= i.min_threshold">
                    <td><strong>{{ i.item_name }}</strong>
                        @if (i.is_perishable) { <span class="small muted">Perishable</span> }</td>
                    <td class="small">{{ i.category || '—' }}</td>
                    <td><strong class="q">{{ i.current_quantity }}</strong>
                        <span class="small muted">{{ i.unit }}</span></td>
                    <td class="small">{{ i.target_quantity }} {{ i.unit }}</td>
                    <td class="small">{{ i.min_threshold }} {{ i.unit }}</td>
                    <td>
                      <span class="badge"
                            [class.badge-ok]="i.status === 'Fulfilled'"
                            [class.badge-warn]="i.status === 'Partially Fulfilled'"
                            [class.badge-brand]="i.status === 'Needed'">{{ i.status }}</span>
                    </td>
                    <td>
                      <div class="deduct">
                        <input type="number" min="1" [max]="i.current_quantity"
                               [(ngModel)]="amounts[i._id]" [ngModelOptions]="{ standalone: true }"
                               placeholder="0" [disabled]="i.current_quantity === 0">
                        <button class="btn btn-secondary btn-sm"
                                [disabled]="busy() || i.current_quantity === 0"
                                (click)="deduct(i)">Deduct</button>
                      </div>
                      @if (i.current_quantity === 0) {
                        <span class="small muted">Nothing on hand</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>

      <p class="small muted note">Stock rises when an in-kind donation is matched to an item on
         Log New Donation, and falls when it is deducted here. Both movements appear on the
         Inventory Log with the staff member who recorded them.</p>
    </div>
  `,
  styles: [`
    .head { background: #fff; border-bottom: 1px solid var(--line); padding: 20px 32px;
            display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .head h1 { font-size: 26px; margin-bottom: 2px; }
    .head p { margin: 0; max-width: 70ch; }
    .body { padding: 22px 32px 40px; }
    .card-head h3 { font-family: var(--serif); font-size: 18px; margin: 0; }
    .row { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; margin-bottom: 18px; }
    .row.four { grid-template-columns: 1fr 1fr 1fr 1.4fr; }
    .check-field .label { font-size: 13px; font-weight: 600; color: var(--ink-soft); }
    .check { display: flex; gap: 8px; align-items: flex-start; font-size: 13px;
             color: var(--ink-soft); }
    .check input { width: 18px; height: 18px; min-height: 0; margin-top: 1px; flex-shrink: 0; }
    .actions { display: flex; gap: 10px; margin-bottom: 10px; }
    .card-body.tight { padding: 0; overflow-x: auto; }
    .pad { padding: 16px 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
         color: var(--muted); padding: 11px 14px; background: var(--paper);
         border-bottom: 1px solid var(--line); white-space: nowrap; }
    td { padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    tr.low td:first-child { box-shadow: inset 3px 0 0 var(--brand-bright); }
    td strong { display: block; }
    td span.small { display: block; }
    .q { font-family: var(--serif); font-size: 17px; color: var(--ink); }
    .deduct { display: flex; gap: 8px; align-items: center; }
    .deduct input { width: 80px; min-height: 36px; padding: 6px 10px; border-radius: 8px;
                    border: 1px solid var(--line-strong); font: inherit; font-size: 13px; }
    .btn-sm { padding: 6px 12px; font-size: 12px; white-space: nowrap; }
    .note { margin-top: 14px; max-width: 80ch; }
    @media (max-width: 1000px) {
      .head, .body { padding-left: 18px; padding-right: 18px; }
      .row, .row.four { grid-template-columns: 1fr; }
    }
  `],
})
export class WishlistAdminComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  categories = ['Food', 'Medical supplies', 'Hygiene', 'Household', 'Clothing', 'Other'];
  items = signal<WishlistItem[]>([]);
  /** Deduction amount per row, keyed by item id. */
  amounts: Record<string, number | null> = {};
  loading = signal(true); busy = signal(false);
  showForm = signal(false);
  flash = signal(''); error = signal('');

  form = this.fb.nonNullable.group({
    item_name:       ['', Validators.required],
    category:        ['Food'],
    unit:            [''],
    target_quantity: [null as number | null, Validators.required],
    min_threshold:   [0],
    is_perishable:   [false],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.wishlist().subscribe({
      next: l => { this.items.set(l); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message || 'Could not load the wishlist.'); this.loading.set(false); },
    });
  }

  create(): void {
    const v = this.form.getRawValue();
    if (!v.item_name.trim() || !v.target_quantity) {
      this.error.set('Give the item a name and a target quantity.');
      return;
    }
    this.busy.set(true); this.error.set('');
    this.api.createWishlistItem(v).subscribe({
      next: item => {
        this.flash.set(`${item.item_name} added to the wishlist.`);
        this.busy.set(false);
        this.showForm.set(false);
        this.form.reset({ category: 'Food', min_threshold: 0, is_perishable: false });
        this.load();
      },
      error: err => { this.error.set(err?.error?.message || 'Could not add the item.'); this.busy.set(false); },
    });
  }

  deduct(i: WishlistItem): void {
    const qty = Number(this.amounts[i._id]);
    if (!qty || qty <= 0) { this.error.set('Enter how many units were used.'); return; }
    this.busy.set(true); this.error.set('');
    this.api.deductStock(i._id, qty, 'Consumed by the facility').subscribe({
      next: res => {
        this.flash.set(`${qty} ${i.unit || 'units'} of ${i.item_name} deducted — ` +
                       `${res.item.current_quantity} left.`);
        this.busy.set(false);
        this.amounts[i._id] = null;
        this.load();
      },
      error: err => { this.error.set(err?.error?.message || 'Could not deduct the stock.'); this.busy.set(false); },
    });
  }
}
