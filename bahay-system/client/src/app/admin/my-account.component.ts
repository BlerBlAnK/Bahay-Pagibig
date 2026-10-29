import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';

/**
 * FR-01 — a staff member changing their own password, which is what they need
 * after being handed a temporary one. The Super Admin reset on User Accounts
 * covers a forgotten password; this covers the ordinary case.
 */
@Component({
  selector: 'bp-my-account', standalone: true, imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="head">
      <div>
        <h1>My Account</h1>
        <p class="muted small">Your own sign-in details.</p>
      </div>
    </div>

    <div class="body">
      @if (flash()) { <div class="notice notice-ok">{{ flash() }}</div> }
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      <section class="card">
        <div class="card-head"><h3>Signed in as</h3></div>
        <div class="card-body">
          <dl>
            <dt>Name</dt><dd>{{ auth.user()?.full_name }}</dd>
            <dt>Email</dt><dd>{{ auth.user()?.email }}</dd>
            <dt>Position</dt><dd>{{ auth.user()?.position || '—' }}</dd>
            <dt>Role</dt>
            <dd><span class="badge" [class.badge-gold]="auth.isSuperAdmin()">{{ auth.user()?.role }}</span></dd>
          </dl>
          <p class="small muted">Your name, position and role are changed by a Super Admin on
             User Accounts, not here.</p>
        </div>
      </section>

      <form class="card" [formGroup]="form" (ngSubmit)="submit()">
        <div class="card-head"><h3>Change password</h3></div>
        <div class="card-body">
          <div class="field">
            <label for="cp">Current password *</label>
            <input id="cp" type="password" autocomplete="current-password"
                   formControlName="current_password">
          </div>
          <div class="row">
            <div class="field">
              <label for="np">New password *</label>
              <input id="np" type="password" autocomplete="new-password" formControlName="new_password">
              <span class="hint small muted">At least 10 characters.</span>
            </div>
            <div class="field">
              <label for="cf">Confirm new password *</label>
              <input id="cf" type="password" autocomplete="new-password" formControlName="confirm">
            </div>
          </div>
          <button class="btn btn-primary" type="submit" [disabled]="busy()">
            {{ busy() ? 'Saving…' : 'Change Password' }}</button>
          <p class="small muted">The change is written to the activity log. You stay signed in on
             this device.</p>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .head { background: #fff; border-bottom: 1px solid var(--line); padding: 20px 32px; }
    .head h1 { font-size: 26px; margin-bottom: 2px; }
    .head p { margin: 0; }
    .body { padding: 22px 32px 40px; max-width: 720px; }
    .card { margin-bottom: 18px; }
    .card-head h3 { font-family: var(--serif); font-size: 18px; margin: 0; }
    dl { display: grid; grid-template-columns: 120px 1fr; gap: 8px 14px; margin: 0 0 16px; }
    dt { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted);
         padding-top: 2px; }
    dd { margin: 0; font-size: 14px; }
    .badge-gold { background: var(--gold-pale); color: var(--gold-dark); }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }
    .hint { display: block; }
    @media (max-width: 900px) {
      .head, .body { padding-left: 18px; padding-right: 18px; }
      .row, dl { grid-template-columns: 1fr; }
    }
  `],
})
export class MyAccountComponent {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  busy = signal(false); flash = signal(''); error = signal('');

  form = this.fb.nonNullable.group({
    current_password: ['', Validators.required],
    new_password:     ['', [Validators.required, Validators.minLength(10)]],
    confirm:          ['', Validators.required],
  });

  submit(): void {
    const v = this.form.getRawValue();
    this.form.markAllAsTouched();
    this.flash.set('');
    if (!v.current_password || !v.new_password) {
      this.error.set('Enter your current password and the new one.');
      return;
    }
    if (v.new_password.length < 10) {
      this.error.set('The new password must be at least 10 characters.');
      return;
    }
    if (v.new_password !== v.confirm) {
      this.error.set('The two new passwords do not match.');
      return;
    }
    this.busy.set(true); this.error.set('');
    this.api.changeOwnPassword(v.current_password, v.new_password).subscribe({
      next: () => {
        this.flash.set('Password changed.');
        this.busy.set(false);
        this.form.reset();
      },
      error: err => {
        this.error.set(err?.error?.message || 'Could not change the password.');
        this.busy.set(false);
      },
    });
  }
}
