import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';

/** FR-11 — the donor reports a transfer they already sent, with proof. */
@Component({
  selector: 'bp-donate-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="hero">
      <p class="crumb"><a routerLink="/">Home</a> / <a routerLink="/wishlist">Wishlist</a> / Report a donation</p>
      <h1>Report Your Donation</h1>
      <p class="lead">Already sent a donation by e-wallet or bank transfer? Tell us the reference
         number and date so both you and the facility hold a record of the same transaction.</p>
    </section>

    <section class="band">
      @if (done()) {
        <div class="notice notice-ok result">
          <div>
            <strong>Thank you. Your report is with our staff for verification.</strong>
            <p>Reference <strong>{{ done() }}</strong>. A copy has been emailed to you.</p>
            <a routerLink="/wishlist">Back to the Wishlist</a>
          </div>
        </div>
      } @else {
        <div class="split">
          <form class="card" [formGroup]="form" (ngSubmit)="submit()">
            <div class="card-head">
              <div>
                <h3>Transaction details</h3>
                <span class="small muted">Fields marked * are required.</span>
              </div>
            </div>
            <div class="card-body stack">
              @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

              <div class="row">
                <div class="field">
                  <label for="method">How did you send it? *</label>
                  <select id="method" formControlName="donation_method">
                    <option value="">Select a method</option>
                    <option>GCash</option><option>Maya</option><option>Bank transfer</option>
                  </select>
                  @if (invalid('donation_method')) { <span class="error">Choose how you sent it.</span> }
                </div>
                <div class="field">
                  <label for="amount">Amount sent *</label>
                  <input id="amount" type="number" min="1" step="0.01" placeholder="0.00" formControlName="amount">
                  @if (invalid('amount')) { <span class="error">Enter the amount you sent.</span> }
                </div>
              </div>

              <div class="row">
                <div class="field">
                  <label for="ref">Reference No. *</label>
                  <input id="ref" type="text" placeholder="e.g. GC-884210" formControlName="reference_number">
                  @if (invalid('reference_number')) { <span class="error">Enter the reference number from your receipt.</span> }
                </div>
                <div class="field">
                  <label for="tdate">Date of transaction *</label>
                  <input id="tdate" type="date" formControlName="transaction_date">
                  @if (invalid('transaction_date')) { <span class="error">Enter the date you sent it.</span> }
                </div>
              </div>

              <div class="field">
                <span class="label">Proof of payment *</span>
                <label class="drop" [class.has]="fileName()">
                  <input type="file" accept="image/png,image/jpeg,image/webp" (change)="pick($event)" hidden>
                  @if (fileName()) {
                    <strong>{{ fileName() }}</strong>
                    <span class="small muted">Click to choose a different image</span>
                  } @else {
                    <strong>Upload a screenshot or photo of your receipt</strong>
                    <span class="small muted">JPG or PNG, up to 5 MB</span>
                  }
                </label>
                @if (fileError()) { <span class="error">{{ fileError() }}</span> }
              </div>

              <hr>

              <div class="row">
                <div class="field">
                  <label for="dname">Your name</label>
                  <input id="dname" type="text" placeholder="Leave blank to donate anonymously"
                         formControlName="donor_name">
                </div>
                <div class="field">
                  <label for="dcontact">Email or contact number *</label>
                  <input id="dcontact" type="text" placeholder="juan&#64;email.com" formControlName="donor_contact">
                  @if (invalid('donor_contact')) { <span class="error">We need a way to confirm your report.</span> }
                </div>
              </div>

              <label class="checkline">
                <input type="checkbox" formControlName="wants_event_emails">
                <span>Send me email updates about upcoming events and current needs.
                      You can opt out at any time.</span>
              </label>

              <div class="actions">
                <button class="btn btn-primary" type="submit" [disabled]="saving()">
                  {{ saving() ? 'Submitting…' : 'Submit Report' }}
                </button>
                <a class="btn btn-secondary" routerLink="/wishlist">Cancel</a>
              </div>
            </div>
          </form>

          <aside class="stack">
            <div class="card"><div class="card-body">
              <h3>What happens next</h3>
              <ol class="steps">
                <li><div><strong>You submit this report</strong>
                    <span>A copy is emailed to you right away as your own record.</span></div></li>
                <li><div><strong>Staff match it to the bank or e-wallet record</strong>
                    <span>They check the reference number against the facility account.</span></div></li>
                <li><div><strong>The donation is marked verified</strong>
                    <span>It is then counted in the monthly report and the Wishlist.</span></div></li>
              </ol>
            </div></div>

            <div class="notice notice-gold">
              <span class="bang">!</span>
              <div>
                <strong>Only for e-wallet and bank donations</strong>
                <p>Items handed over at the facility are recorded by staff on the spot,
                   so they do not need this form.</p>
              </div>
            </div>
          </aside>
        </div>
      }
    </section>
  `,
  styles: [`
    .hero { padding: 56px 80px 48px; background: var(--paper); }
    .crumb { font-size: 12px; color: var(--muted); margin: 0 0 10px; }
    .hero h1 { font-size: 46px; line-height: 1.12; }
    .lead { font-size: 16px; color: var(--muted); max-width: 66ch; margin: 14px 0 0; }
    .band { padding: 56px 80px; background: #fff; }
    .split { display: grid; grid-template-columns: 1fr 340px; gap: 40px; align-items: start; }
    hr { border: none; border-top: 1px solid var(--line); margin: 4px 0; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .drop { display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 6px; padding: 30px 24px; border: 1px dashed var(--line-dark); border-radius: 10px;
            background: var(--paper); cursor: pointer; text-align: center; }
    .drop:hover { border-color: var(--brand); }
    .drop strong { color: var(--brand); font-size: 14px; }
    .drop.has strong { color: var(--ink); }
    .steps { list-style: none; counter-reset: s; padding: 0; margin: 14px 0 0; }
    .steps li { counter-increment: s; display: flex; align-items: flex-start;
                gap: 12px; margin-bottom: 16px; font-size: 13px; }
    .steps li::before { content: counter(s); width: 26px; height: 26px; border-radius: 999px;
                        background: var(--brand-pale); color: var(--brand); font-weight: 700;
                        font-size: 12px; display: flex; align-items: center; justify-content: center;
                        flex-shrink: 0; }
    .steps li > div { min-width: 0; }
    .steps strong { display: block; }
    .steps span { color: var(--muted); font-size: 12px; }
    .bang { width: 24px; height: 24px; border-radius: 999px; background: var(--gold); color: var(--ink);
            font-weight: 700; font-size: 12px; display: flex; align-items: center;
            justify-content: center; flex-shrink: 0; }
    .notice strong { display: block; margin-bottom: 4px; }
    .notice p { margin: 0; font-size: 12px; }
    .result { max-width: 560px; }
    @media (max-width: 1000px) {
      .hero, .band { padding: 40px 20px; }
      .hero h1 { font-size: 30px; }
      .split { grid-template-columns: 1fr; }
    }
  `],
})
export class DonateReportComponent {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  file: File | null = null;
  fileName = signal('');
  fileError = signal('');
  saving = signal(false);
  error = signal('');
  done = signal('');

  form = this.fb.nonNullable.group({
    donation_method:   ['', Validators.required],
    amount:            ['', [Validators.required, Validators.min(1)]],
    reference_number:  ['', Validators.required],
    transaction_date:  ['', Validators.required],
    donor_name:        [''],
    donor_contact:     ['', Validators.required],
    wants_event_emails: [false],
  });

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  pick(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    this.fileError.set('');
    if (!f) { this.file = null; this.fileName.set(''); return; }
    if (f.size > 5 * 1024 * 1024) {
      this.fileError.set('That image is larger than 5 MB. Please choose a smaller one.');
      this.file = null; this.fileName.set(''); return;
    }
    this.file = f;
    this.fileName.set(f.name);
  }

  submit(): void {
    this.error.set('');
    this.form.markAllAsTouched();
    if (!this.file) { this.fileError.set('Attach a screenshot or photo of your receipt.'); return; }
    if (this.form.invalid) return;

    const data = new FormData();
    Object.entries(this.form.getRawValue()).forEach(([k, v]) => data.append(k, String(v)));
    data.append('proof_of_payment', this.file);

    this.saving.set(true);
    this.api.reportDonation(data).subscribe({
      next: res => { this.done.set(res.reference); this.saving.set(false); },
      error: err => {
        this.error.set(err?.error?.message || 'We could not submit the report. Please try again.');
        this.saving.set(false);
      },
    });
  }
}
