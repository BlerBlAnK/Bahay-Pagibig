import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';

/** FR-06 registration and FR-07 acknowledgement. */
@Component({
  selector: 'bp-volunteer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="hero">
      <p class="crumb"><a routerLink="/">Home</a> / Volunteer</p>
      <h1>Volunteer Registration</h1>
      <p class="lead">Individuals and groups are both welcome. Tell us a little about yourself and
         our staff will be in touch about orientation and a schedule.</p>
    </section>

    <section class="band">
      @if (done()) {
        <div class="notice notice-ok result"><div>
          <strong>Application received.</strong>
          <p>A confirmation email is on its way to you. Our staff will review your application
             and email you the result with orientation details.</p>
          <a routerLink="/">Back to the home page</a>
        </div></div>
      } @else {
        <div class="split">
          <form class="card" [formGroup]="form" (ngSubmit)="submit()">
            <div class="card-head"><div>
              <h3>Applicant Details</h3>
              <span class="small muted">Fields marked * are required.</span>
            </div></div>
            <div class="card-body stack">
              @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

              <div class="field">
                <span class="label">Applying as *</span>
                <div class="seg">
                  @for (t of types; track t) {
                    <button type="button" class="seg-btn" [class.on]="form.value.applicant_type === t"
                            (click)="form.patchValue({ applicant_type: t })">{{ t }}</button>
                  }
                </div>
              </div>

              <div class="row">
                <div class="field">
                  <label for="name">Full Name *</label>
                  <input id="name" type="text" placeholder="Juan D. Dela Cruz" formControlName="full_name">
                  @if (invalid('full_name')) { <span class="error">Enter your full name.</span> }
                </div>
                <div class="field">
                  <label for="contact">Contact Number *</label>
                  <input id="contact" type="text" placeholder="09XX XXX XXXX" formControlName="contact_info">
                  @if (invalid('contact_info')) { <span class="error">Enter a contact number.</span> }
                </div>
              </div>

              <div class="row">
                <div class="field">
                  <label for="email">Email Address *</label>
                  <input id="email" type="email" placeholder="juan&#64;email.com" formControlName="email">
                  @if (invalid('email')) { <span class="error">Enter a valid email address.</span> }
                </div>
                <div class="field">
                  <label for="area">Area of Service *</label>
                  <select id="area" formControlName="area_of_service">
                    <option value="">Select an area</option>
                    @for (a of areas; track a) { <option>{{ a }}</option> }
                  </select>
                  @if (invalid('area_of_service')) { <span class="error">Choose an area of service.</span> }
                </div>
              </div>

              <div class="row">
                <div class="field grow2">
                  <label for="addr">Home Address *</label>
                  <input id="addr" type="text" placeholder="House no., street, barangay, city, province"
                         formControlName="home_address">
                  @if (invalid('home_address')) { <span class="error">Enter your home address.</span> }
                </div>
                <div class="field">
                  <label for="gender">Gender *</label>
                  <select id="gender" formControlName="gender">
                    <option value="">Select gender</option>
                    <option>Female</option><option>Male</option><option>Prefer not to say</option>
                  </select>
                  @if (invalid('gender')) { <span class="error">Select an option.</span> }
                </div>
              </div>

              <div class="row">
                <div class="field">
                  <label for="civil">Civil Status *</label>
                  <select id="civil" formControlName="civil_status">
                    <option value="">Select civil status</option>
                    <option>Single</option><option>Married</option>
                    <option>Widowed</option><option>Separated</option>
                  </select>
                  @if (invalid('civil_status')) { <span class="error">Select an option.</span> }
                </div>
                <div class="field">
                  <label for="dob">Date of Birth *</label>
                  <input id="dob" type="date" formControlName="date_of_birth">
                  @if (invalid('date_of_birth')) { <span class="error">Enter your date of birth.</span> }
                </div>
              </div>

              <div class="field">
                <label for="avail">Preferred days or schedule *</label>
                <input id="avail" type="text" placeholder="e.g. Saturday mornings" formControlName="availability">
                @if (invalid('availability')) { <span class="error">Tell us when you are available.</span> }
              </div>

              <div class="field">
                <label for="why">Why do you want to volunteer?</label>
                <textarea id="why" formControlName="reason"
                          placeholder="A sentence or two is enough."></textarea>
              </div>

              <label class="checkline">
                <input type="checkbox" formControlName="wants_event_emails">
                <span>Send me email updates about upcoming events at the facility.
                      You can opt out at any time.</span>
              </label>

              <div class="actions">
                <button class="btn btn-primary" type="submit" [disabled]="saving()">
                  {{ saving() ? 'Submitting…' : 'Submit Application' }}
                </button>
                <button class="btn btn-secondary" type="button" (click)="form.reset({ applicant_type: 'Individual', wants_event_emails: false })">
                  Clear Form
                </button>
              </div>
            </div>
          </form>

          <aside class="stack">
            <div class="card"><div class="card-body">
              <h3>What happens next</h3>
              <ol class="steps">
                <li><div><strong>You submit this form</strong>
                    <span>A confirmation email is sent to your address right away.</span></div></li>
                <li><div><strong>Staff review your application</strong>
                    <span>Staff review and approve or decline your application.</span></div></li>
                <li><div><strong>You are approved or declined</strong>
                    <span>You receive an email with the result and your schedule.</span></div></li>
                <li><div><strong>You receive a certificate</strong>
                    <span>Once you have given enough hours, we issue a Certificate of Appreciation.</span></div></li>
              </ol>
            </div></div>
            <div class="card"><div class="card-body">
              <h3>Questions?</h3>
              <p class="small muted">If anything is unclear, send us a message and we will help.</p>
              <a class="btn btn-secondary" routerLink="/contact">Go to Contact Page</a>
            </div></div>
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
    .grow2 { flex-grow: 2; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .seg { display: flex; gap: 10px; flex-wrap: wrap; }
    .seg-btn { min-height: 44px; padding: 0 20px; border-radius: 8px; border: 1px solid var(--line-strong);
               background: #fff; color: var(--ink-soft); font: inherit; font-size: 14px;
               font-weight: 600; cursor: pointer; }
    .seg-btn.on { background: var(--brand-pale); border-color: var(--brand); color: var(--brand); }
    .steps { list-style: none; counter-reset: s; padding: 0; margin: 14px 0 0; }
    .steps li { counter-increment: s; display: flex; align-items: flex-start; gap: 12px;
                margin-bottom: 16px; font-size: 13px; }
    .steps li::before { content: counter(s); width: 26px; height: 26px; border-radius: 999px;
                        background: var(--brand-pale); color: var(--brand); font-weight: 700;
                        font-size: 12px; display: flex; align-items: center; justify-content: center;
                        flex-shrink: 0; }
    .steps li > div { min-width: 0; }
    .steps strong { display: block; }
    .steps span { color: var(--muted); font-size: 12px; }
    .result { max-width: 560px; }
    .notice strong { display: block; margin-bottom: 4px; }
    .notice p { margin: 0 0 6px; font-size: 13px; }
    aside .btn { margin-top: 12px; }
    @media (max-width: 1000px) {
      .hero, .band { padding: 40px 20px; }
      .hero h1 { font-size: 30px; }
      .split { grid-template-columns: 1fr; }
    }
  `],
})
export class VolunteerComponent {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  readonly types = ['Individual', 'Group or Organization'] as const;
  readonly areas = ['Feeding assistance', 'Recreational activities', 'Housekeeping',
                    'Events support', 'Medical support'];

  saving = signal(false);
  error = signal('');
  done = signal(false);

  form = this.fb.nonNullable.group({
    applicant_type:     ['Individual' as string],
    full_name:          ['', Validators.required],
    contact_info:       ['', Validators.required],
    email:              ['', [Validators.required, Validators.email]],
    area_of_service:    ['', Validators.required],
    home_address:       ['', Validators.required],
    gender:             ['', Validators.required],
    civil_status:       ['', Validators.required],
    date_of_birth:      ['', Validators.required],
    availability:       ['', Validators.required],
    reason:             [''],
    wants_event_emails: [false],
  });

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    this.api.applyAsVolunteer(this.form.getRawValue()).subscribe({
      next: () => { this.done.set(true); this.saving.set(false); },
      error: err => {
        this.error.set(err?.status === 409
          ? 'An application with that email address is already on record.'
          : (err?.error?.message || 'We could not submit your application. Please try again.'));
        this.saving.set(false);
      },
    });
  }
}
