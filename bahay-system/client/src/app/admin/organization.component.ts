import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { OrganizationInfo, User } from '../core/models';

/**
 * FR-05 — organizational information, editable without touching source code.
 * Everything on this screen is what the public About Us page reads.
 */
@Component({
  selector: 'bp-organization', standalone: true, imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="head">
      <div>
        <h1>Organization Info</h1>
        <p class="muted small">The content of the public About Us page and the contact details in
           the site footer.</p>
      </div>
      @if (info()?.updated_at) {
        <p class="muted small stamp">Last edited {{ info()!.updated_at | date: 'MMM d, y' }}
          @if (editor()) { by {{ editor() }} }</p>
      }
    </div>

    <div class="body">
      @if (flash()) { <div class="notice notice-ok">{{ flash() }}</div> }
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      @if (loading()) { <p class="spinner">Loading…</p> }
      @else {
        <form [formGroup]="form" (ngSubmit)="save()">
          <section class="card">
            <div class="card-head"><h3>Identity</h3></div>
            <div class="card-body">
              <div class="row">
                <div class="field">
                  <label for="n">Facility name *</label>
                  <input id="n" type="text" formControlName="name">
                </div>
                <div class="field">
                  <label for="t">Tagline</label>
                  <input id="t" type="text" formControlName="tagline">
                  <span class="hint small muted">The headline on the home page.</span>
                </div>
              </div>
              <div class="field">
                <label for="a">About</label>
                <textarea id="a" formControlName="about"></textarea>
              </div>
              <div class="field">
                <label for="h">History</label>
                <textarea id="h" formControlName="history"></textarea>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-head"><h3>Mission &amp; vision</h3></div>
            <div class="card-body">
              <div class="row">
                <div class="field">
                  <label for="m">Mission</label>
                  <textarea id="m" formControlName="mission"></textarea>
                </div>
                <div class="field">
                  <label for="v">Vision</label>
                  <textarea id="v" formControlName="vision"></textarea>
                </div>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <h3>Figures</h3>
              <span class="unit">Shown as cards on About Us — up to eight</span>
            </div>
            <div class="card-body">
              <div formArrayName="facts">
                @for (f of facts.controls; track $index; let i = $index) {
                  <div class="fact" [formGroupName]="i">
                    <div class="field">
                      <label [attr.for]="'fv' + i">Figure</label>
                      <input [id]="'fv' + i" type="text" formControlName="value" placeholder="53">
                    </div>
                    <div class="field">
                      <label [attr.for]="'fl' + i">Label</label>
                      <input [id]="'fl' + i" type="text" formControlName="label"
                             placeholder="Residents today">
                    </div>
                    <button class="link danger" type="button" (click)="removeFact(i)">Remove</button>
                  </div>
                }
              </div>
              @if (facts.length < 8) {
                <button class="btn btn-secondary btn-sm" type="button" (click)="addFact()">
                  Add a figure</button>
              }
              @if (facts.length === 0) {
                <p class="small muted">No figures — the About page simply leaves that section out.</p>
              }
            </div>
          </section>

          <section class="card">
            <div class="card-head"><h3>Contact details</h3></div>
            <div class="card-body">
              <div class="row">
                <div class="field">
                  <label for="ad">Address</label>
                  <input id="ad" type="text" formControlName="address">
                </div>
                <div class="field">
                  <label for="cn">Contact number</label>
                  <input id="cn" type="text" formControlName="contact_number">
                </div>
              </div>
              <div class="row">
                <div class="field">
                  <label for="em">Email address</label>
                  <input id="em" type="email" formControlName="email">
                </div>
                <div class="field">
                  <label for="vh">Visiting and donation hours</label>
                  <input id="vh" type="text" formControlName="visiting_hours">
                </div>
              </div>
            </div>
          </section>

          <div class="actions">
            <button class="btn btn-primary" type="submit" [disabled]="busy()">
              {{ busy() ? 'Saving…' : 'Save Changes' }}</button>
            <button class="btn btn-secondary" type="button" [disabled]="busy()" (click)="load()">
              Discard Changes</button>
          </div>
          <p class="small muted">Saving updates the public portal immediately and is written to the
             activity log.</p>
        </form>
      }
    </div>
  `,
  styles: [`
    .head { background: #fff; border-bottom: 1px solid var(--line); padding: 20px 32px;
            display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .head h1 { font-size: 26px; margin-bottom: 2px; }
    .head p { margin: 0; max-width: 70ch; }
    .stamp { white-space: nowrap; padding-top: 6px; }
    .body { padding: 22px 32px 40px; max-width: 980px; }
    .card { margin-bottom: 18px; }
    .card-head { align-items: baseline; }
    .card-head h3 { font-family: var(--serif); font-size: 18px; margin: 0; }
    .unit { font-size: 12px; color: var(--muted); }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }
    .hint { display: block; }
    .fact { display: grid; grid-template-columns: 140px 1fr auto; gap: 14px; align-items: end;
            margin-bottom: 14px; }
    .link { background: none; border: 0; padding: 0 0 12px; font: inherit; font-size: 12px;
            font-weight: 600; color: var(--brand); cursor: pointer; }
    .link.danger { color: var(--muted); }
    .btn-sm { padding: 7px 14px; font-size: 13px; }
    .actions { display: flex; gap: 10px; margin-bottom: 10px; }
    @media (max-width: 1000px) {
      .head { flex-direction: column; }
      .head, .body { padding-left: 18px; padding-right: 18px; }
      .row { grid-template-columns: 1fr; }
      .fact { grid-template-columns: 1fr; align-items: stretch; }
      .link { padding: 0; text-align: left; }
    }
  `],
})
export class OrganizationComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  info = signal<OrganizationInfo | null>(null);
  loading = signal(true); busy = signal(false);
  flash = signal(''); error = signal('');

  form = this.fb.nonNullable.group({
    name:           ['', Validators.required],
    tagline:        [''],
    about:          [''],
    mission:        [''],
    vision:         [''],
    history:        [''],
    address:        [''],
    contact_number: [''],
    email:          [''],
    visiting_hours: [''],
    facts:          this.fb.array<ReturnType<OrganizationComponent['factGroup']>>([]),
  });

  get facts(): FormArray { return this.form.get('facts') as FormArray; }

  private factGroup(value = '', label = '') {
    return this.fb.nonNullable.group({ value: [value], label: [label] });
  }

  addFact(): void { this.facts.push(this.factGroup()); }
  removeFact(i: number): void { this.facts.removeAt(i); }

  editor(): string {
    const u = this.info()?.updated_by as User | string | null | undefined;
    return u && typeof u === 'object' ? u.full_name : '';
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true); this.error.set('');
    this.api.organization().subscribe({
      next: info => {
        this.info.set(info);
        this.facts.clear();
        (info.facts || []).forEach(f => this.facts.push(this.factGroup(f.value, f.label)));
        this.form.patchValue({
          name: info.name, tagline: info.tagline, about: info.about, mission: info.mission,
          vision: info.vision, history: info.history, address: info.address,
          contact_number: info.contact_number, email: info.email,
          visiting_hours: info.visiting_hours,
        });
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message || 'Could not load the organization details.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (!this.form.getRawValue().name.trim()) {
      this.error.set('The facility name cannot be empty.');
      return;
    }
    this.busy.set(true); this.error.set('');
    this.api.updateOrganization(this.form.getRawValue()).subscribe({
      next: info => {
        this.info.set(info);
        this.flash.set('Saved. The public About Us page now shows these details.');
        this.busy.set(false);
      },
      error: err => { this.error.set(err?.error?.message || 'Could not save.'); this.busy.set(false); },
    });
  }
}
