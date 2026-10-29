import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Donation, WishlistItem } from '../core/models';

/**
 * FR-12 — staff entry, with the duplicate check the panel asked for: before the
 * record is written the server looks for a donation with the same reference
 * number, or the same donor, amount and day, and the entry is only saved once a
 * staff member confirms it is genuinely a second donation.
 */
@Component({
  selector: 'bp-log-donation', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="head">
      <div>
        <h1>Log New Donation</h1>
        <p class="muted small">For donations received in person, or confirmed against the facility's
           bank and e-wallet records.</p>
      </div>
      <a class="btn btn-secondary" routerLink="/admin/donations">Back to records</a>
    </div>

    <div class="body">
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      @if (duplicate(); as dup) {
        <div class="notice notice-warn dup">
          <div>
            <strong>This looks like a donation already on record.</strong>
            <p>{{ dup.reason }}</p>
            @if (dup.existing; as e) {
              <p class="small">
                On record: {{ e.donor_name || 'Anonymous' }} ·
                {{ (e.transaction_date || e.date_donated) | date: 'MMMM d, y' }}
                @if (e.amount) { · {{ e.amount | currency: 'PHP' : 'symbol-narrow' : '1.2-2' }} }
                @if (e.reference_number) { · Ref {{ e.reference_number }} }
              </p>
            }
            <div class="dup-actions">
              <button class="btn btn-primary" [disabled]="busy()" (click)="save(true)">
                Save anyway — it is a separate donation</button>
              <button class="btn btn-secondary" (click)="duplicate.set(null)">Go back and edit</button>
            </div>
          </div>
        </div>
      }

      <form class="card" [formGroup]="form" (ngSubmit)="submit()">
        <div class="card-body">
          <div class="row">
            <div class="field">
              <label for="dc">Donor classification *</label>
              <select id="dc" formControlName="donor_classification">
                <option value="Individual">Individual</option>
                <option value="Group / Organization">Group / Organization</option>
                <option value="Anonymous">Anonymous</option>
              </select>
            </div>
            <div class="field">
              <label for="dt">Donation type *</label>
              <select id="dt" formControlName="donation_type">
                <option value="Monetary">Monetary</option>
                <option value="In-kind">In-kind</option>
              </select>
            </div>
          </div>

          @if (form.value.donor_classification !== 'Anonymous') {
            <div class="row">
              <div class="field">
                <label for="dn">Donor name *</label>
                <input id="dn" type="text" formControlName="donor_name">
                @if (bad('donor_name')) { <span class="error">Enter the donor's name.</span> }
              </div>
              <div class="field">
                <label for="dct">Contact (optional)</label>
                <input id="dct" type="text" formControlName="donor_contact">
              </div>
            </div>
          }

          @if (form.value.donation_type === 'Monetary') {
            <div class="row three">
              <div class="field">
                <label for="am">Amount (PHP) *</label>
                <input id="am" type="number" min="1" step="0.01" formControlName="amount">
                @if (bad('amount')) { <span class="error">Enter the amount received.</span> }
              </div>
              <div class="field">
                <label for="dm">Method *</label>
                <select id="dm" formControlName="donation_method">
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                  <option value="Bank transfer">Bank transfer</option>
                </select>
              </div>
              <div class="field">
                <label for="rn">Reference number</label>
                <input id="rn" type="text" formControlName="reference_number"
                       placeholder="From the receipt or transfer">
              </div>
            </div>
          } @else {
            <div class="row three">
              <div class="field">
                <label for="it">Item description *</label>
                <input id="it" type="text" formControlName="item_description">
                @if (bad('item_description')) { <span class="error">Describe the item received.</span> }
              </div>
              <div class="field">
                <label for="qt">Quantity *</label>
                <input id="qt" type="number" min="1" formControlName="quantity">
                @if (bad('quantity')) { <span class="error">Enter the quantity.</span> }
              </div>
              <div class="field">
                <label for="wi">Counts toward wishlist item</label>
                <select id="wi" formControlName="wishlist_item_id">
                  <option value="">Not a wishlist item</option>
                  @for (w of items(); track w._id) {
                    <option [value]="w._id">{{ w.item_name }} ({{ w.current_quantity }}/{{ w.target_quantity }}
                      {{ w.unit }})</option>
                  }
                </select>
              </div>
            </div>
          }

          <div class="row">
            <div class="field">
              <label for="td">Transaction date *</label>
              <input id="td" type="date" formControlName="transaction_date">
              @if (bad('transaction_date')) { <span class="error">Enter when the donation was made.</span> }
            </div>
            <div class="field">
              <label for="nt">Note (optional)</label>
              <input id="nt" type="text" formControlName="note">
            </div>
          </div>

          <div class="actions">
            <button class="btn btn-primary" type="submit" [disabled]="busy()">
              {{ busy() ? 'Saving…' : 'Save Donation' }}</button>
            <a class="btn btn-secondary" routerLink="/admin/donations">Cancel</a>
          </div>
          <p class="small muted">An in-kind donation matched to a wishlist item updates that item's
             stock and is written to the inventory log automatically.</p>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .head { background: #fff; border-bottom: 1px solid var(--line); padding: 20px 32px;
            display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .head h1 { font-size: 26px; margin-bottom: 2px; }
    .head p { margin: 0; max-width: 70ch; }
    .body { padding: 22px 32px 40px; max-width: 900px; }
    .dup strong { display: block; margin-bottom: 4px; }
    .dup p { margin: 0 0 6px; font-size: 13px; }
    .dup-actions { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }
    .row.three { grid-template-columns: 1fr 1fr 1fr; }
    .actions { display: flex; gap: 10px; margin: 6px 0 12px; }
    @media (max-width: 900px) {
      .head, .body { padding-left: 18px; padding-right: 18px; }
      .row, .row.three { grid-template-columns: 1fr; }
    }
  `],
})
export class LogDonationComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  items = signal<WishlistItem[]>([]);
  busy = signal(false); error = signal('');
  duplicate = signal<{ reason?: string; existing?: Donation } | null>(null);

  form = this.fb.nonNullable.group({
    donor_classification: ['Individual'],
    donor_name:           ['', Validators.required],
    donor_contact:        [''],
    donation_type:        ['Monetary'],
    amount:               [null as number | null],
    donation_method:      ['Cash'],
    reference_number:     [''],
    item_description:     [''],
    quantity:             [null as number | null],
    wishlist_item_id:     [''],
    transaction_date:     [new Date().toISOString().slice(0, 10), Validators.required],
    note:                 [''],
  });

  ngOnInit(): void {
    this.api.wishlist().subscribe({ next: l => this.items.set(l), error: () => {} });
  }

  bad(n: string): boolean {
    const c = this.form.get(n);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  /** Required fields depend on the type, so they are checked here rather than by validators. */
  private missing(): string {
    const v = this.form.getRawValue();
    if (!v.transaction_date) return 'Enter the transaction date.';
    if (v.donor_classification !== 'Anonymous' && !v.donor_name.trim())
      return "Enter the donor's name, or classify the donation as Anonymous.";
    if (v.donation_type === 'Monetary') {
      if (!v.amount || v.amount <= 0) return 'Enter the amount received.';
    } else {
      if (!v.item_description.trim()) return 'Describe the item received.';
      if (!v.quantity || v.quantity <= 0) return 'Enter the quantity received.';
    }
    return '';
  }

  private payload(): Record<string, unknown> {
    const v = this.form.getRawValue();
    const anon = v.donor_classification === 'Anonymous';
    const monetary = v.donation_type === 'Monetary';
    return {
      donor_classification: v.donor_classification,
      donor_name:       anon ? null : v.donor_name.trim(),
      donor_contact:    anon ? null : (v.donor_contact.trim() || null),
      donation_type:    v.donation_type,
      amount:           monetary ? Number(v.amount) : null,
      donation_method:  monetary ? v.donation_method : 'In person',
      reference_number: monetary ? (v.reference_number.trim() || null) : null,
      item_description: monetary ? null : v.item_description.trim(),
      quantity:         monetary ? null : Number(v.quantity),
      wishlist_item_id: monetary ? null : (v.wishlist_item_id || null),
      transaction_date: v.transaction_date,
      note:             v.note.trim() || undefined,
    };
  }

  submit(): void {
    this.form.markAllAsTouched();
    const problem = this.missing();
    if (problem) { this.error.set(problem); return; }
    this.error.set('');
    this.busy.set(true);

    const p = this.payload();
    this.api.checkDuplicate({
      donor_name: p['donor_name'], amount: p['amount'],
      reference_number: p['reference_number'], transaction_date: p['transaction_date'],
    }).subscribe({
      next: res => {
        this.busy.set(false);
        if (res.duplicate) this.duplicate.set({ reason: res.reason, existing: res.existing });
        else this.save(false);
      },
      // The check is a convenience, not a gate — if it fails the save still proceeds.
      error: () => { this.busy.set(false); this.save(false); },
    });
  }

  save(force: boolean): void {
    this.busy.set(true); this.error.set('');
    this.api.createDonation({ ...this.payload(), force }).subscribe({
      next: () => this.router.navigate(['/admin/donations']),
      error: err => {
        this.error.set(err?.error?.message || 'Could not save the donation.');
        this.busy.set(false);
        this.duplicate.set(null);
      },
    });
  }
}
