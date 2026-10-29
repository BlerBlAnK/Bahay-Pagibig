import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Faq } from '../core/models';

/**
 * FR-04 / FR-05 — the question-and-answer entries behind the click-based FAQ
 * assistant. Staff write the answers; the assistant only ever shows what is
 * stored here, which is what keeps it inside the study's delimitations.
 */
@Component({
  selector: 'bp-faqs-admin', standalone: true, imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="head">
      <div>
        <h1>FAQ Content</h1>
        <p class="muted small">The questions and answers the FAQ assistant offers on the public
           portal. Nothing is generated — visitors see exactly what is written here.</p>
      </div>
      <button class="btn btn-primary" (click)="startNew()">
        {{ showForm() ? 'Close' : 'New Question' }}</button>
    </div>

    <div class="body">
      @if (flash()) { <div class="notice notice-ok">{{ flash() }}</div> }
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      @if (showForm()) {
        <form class="card" [formGroup]="form" (ngSubmit)="submit()">
          <div class="card-head">
            <h3>{{ editing() ? 'Edit question' : 'New question' }}</h3>
          </div>
          <div class="card-body">
            <div class="field">
              <label for="q">Question *</label>
              <input id="q" type="text" formControlName="question"
                     placeholder="What items do you need most right now?">
            </div>
            <div class="field">
              <label for="a">Answer *</label>
              <textarea id="a" formControlName="answer"></textarea>
              <span class="hint small muted">Write it the way a staff member would say it. Point to
                a page of the portal where that helps.</span>
            </div>
            <div class="row three">
              <div class="field">
                <label for="c">Category</label>
                <select id="c" formControlName="category">
                  @for (c of categories; track c) { <option [value]="c">{{ c }}</option> }
                </select>
              </div>
              <div class="field">
                <label for="o">Display order</label>
                <input id="o" type="number" min="0" formControlName="display_order">
                <span class="hint small muted">Lower numbers appear first.</span>
              </div>
              <div class="field check-field">
                <span class="label">Visibility</span>
                <label class="check">
                  <input type="checkbox" formControlName="is_active">
                  <span>Show on the public portal</span>
                </label>
              </div>
            </div>
            <div class="actions">
              <button class="btn btn-primary" type="submit" [disabled]="busy()">
                {{ busy() ? 'Saving…' : (editing() ? 'Save Changes' : 'Add Question') }}</button>
              <button class="btn btn-secondary" type="button" (click)="cancel()">Cancel</button>
            </div>
          </div>
        </form>
      }

      <div class="card">
        <div class="card-body tight">
          @if (loading()) { <p class="spinner">Loading…</p> }
          @else if (rows().length === 0) {
            <p class="muted small pad">No questions yet. The FAQ assistant will tell visitors so.</p>
          } @else {
            <table>
              <thead>
                <tr><th>Order</th><th>Question &amp; answer</th><th>Category</th>
                    <th>Public</th><th></th></tr>
              </thead>
              <tbody>
                @for (f of rows(); track f._id) {
                  <tr>
                    <td class="ord">{{ f.display_order }}</td>
                    <td>
                      <strong>{{ f.question }}</strong>
                      <span class="small muted answer">{{ f.answer }}</span>
                    </td>
                    <td class="small">{{ f.category || '—' }}</td>
                    <td>
                      <span class="badge" [class.badge-ok]="f.is_active">
                        {{ f.is_active ? 'Visible' : 'Hidden' }}</span>
                    </td>
                    <td class="nowrap">
                      <button class="link" [disabled]="busy()" (click)="edit(f)">Edit</button>
                      <button class="link" [disabled]="busy()" (click)="toggle(f)">
                        {{ f.is_active ? 'Hide' : 'Show' }}</button>
                      <button class="link danger" [disabled]="busy()" (click)="remove(f)">
                        {{ confirming() === f._id ? 'Confirm?' : 'Remove' }}</button>
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
    .head p { margin: 0; max-width: 72ch; }
    .body { padding: 22px 32px 40px; }
    .card-head h3 { font-family: var(--serif); font-size: 18px; margin: 0; }
    .row { display: grid; gap: 18px; margin-bottom: 18px; }
    .row.three { grid-template-columns: 1fr 1fr 1.2fr; }
    .hint { display: block; }
    .check-field .label { font-size: 13px; font-weight: 600; color: var(--ink-soft); }
    .check { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; color: var(--ink-soft); }
    .check input { width: 18px; height: 18px; min-height: 0; margin-top: 1px; flex-shrink: 0; }
    .actions { display: flex; gap: 10px; }
    .card-body.tight { padding: 0; overflow-x: auto; }
    .pad { padding: 16px 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
         color: var(--muted); padding: 11px 14px; background: var(--paper);
         border-bottom: 1px solid var(--line); white-space: nowrap; }
    td { padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    .ord { font-variant-numeric: tabular-nums; color: var(--muted); }
    td strong { display: block; margin-bottom: 3px; }
    .answer { display: block; max-width: 60ch; }
    .nowrap { white-space: nowrap; }
    .link { background: none; border: 0; padding: 0 8px 0 0; font: inherit; font-size: 12px;
            font-weight: 600; color: var(--brand); cursor: pointer; }
    .link.danger { color: var(--muted); }
    @media (max-width: 1000px) {
      .head, .body { padding-left: 18px; padding-right: 18px; }
      .row.three { grid-template-columns: 1fr; }
    }
  `],
})
export class FaqsAdminComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  categories = ['Donations', 'Volunteering', 'Visiting', 'General'];
  rows = signal<Faq[]>([]);
  loading = signal(true); busy = signal(false);
  showForm = signal(false);
  editing = signal<Faq | null>(null);
  /** Two-step removal: the first click arms it, the second carries it out. */
  confirming = signal<string | null>(null);
  flash = signal(''); error = signal('');

  form = this.fb.nonNullable.group({
    question:      ['', Validators.required],
    answer:        ['', Validators.required],
    category:      ['Donations'],
    display_order: [0],
    is_active:     [true],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.faqs().subscribe({
      next: l => { this.rows.set(l); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message || 'Could not load the FAQs.'); this.loading.set(false); },
    });
  }

  startNew(): void {
    if (this.showForm()) { this.cancel(); return; }
    this.editing.set(null);
    this.form.reset({ category: 'Donations', display_order: this.rows().length + 1, is_active: true });
    this.showForm.set(true);
  }

  edit(f: Faq): void {
    this.editing.set(f);
    this.form.patchValue({
      question: f.question, answer: f.answer, category: f.category || 'General',
      display_order: f.display_order, is_active: f.is_active,
    });
    this.showForm.set(true);
    this.flash.set(''); this.error.set('');
  }

  cancel(): void { this.showForm.set(false); this.editing.set(null); }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.error.set('Both the question and the answer are required.'); return; }
    this.busy.set(true); this.error.set('');
    const body = this.form.getRawValue();
    const existing = this.editing();
    const call = existing
      ? this.api.updateFaq(existing._id, body)
      : this.api.createFaq(body);
    call.subscribe({
      next: () => {
        this.flash.set(existing ? 'Question updated.' : 'Question added.');
        this.busy.set(false);
        this.cancel();
        this.load();
      },
      error: err => { this.error.set(err?.error?.message || 'Could not save.'); this.busy.set(false); },
    });
  }

  toggle(f: Faq): void {
    this.busy.set(true);
    this.api.updateFaq(f._id, { is_active: !f.is_active }).subscribe({
      next: () => { this.busy.set(false); this.load(); },
      error: err => { this.error.set(err?.error?.message || 'Could not update.'); this.busy.set(false); },
    });
  }

  remove(f: Faq): void {
    if (this.confirming() !== f._id) { this.confirming.set(f._id); return; }
    this.confirming.set(null);
    this.busy.set(true);
    this.api.deleteFaq(f._id).subscribe({
      next: () => { this.flash.set('Question removed.'); this.busy.set(false); this.load(); },
      error: err => { this.error.set(err?.error?.message || 'Could not remove it.'); this.busy.set(false); },
    });
  }
}
