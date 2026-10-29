import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

/** FR-01 — staff sign in. */
@Component({
  selector: 'bp-login', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <main class="shell">
      <section class="panel">
        <a class="brand" routerLink="/">
          <span class="mark">BP</span>
          <span><strong>Bahay Pag-ibig</strong><em>Operations Management System</em></span>
        </a>
        <h1>Staff Sign In</h1>
        <p class="muted small">For facility staff only. The public portal needs no account.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="stack">
          @if (error()) { <div class="notice notice-error">{{ error() }}</div> }
          <div class="field">
            <label for="e">Email address</label>
            <input id="e" type="email" autocomplete="username" formControlName="email">
          </div>
          <div class="field">
            <label for="p">Password</label>
            <input id="p" type="password" autocomplete="current-password" formControlName="password">
          </div>
          <button class="btn btn-primary btn-block" type="submit" [disabled]="busy()">
            {{ busy() ? 'Signing in…' : 'Sign In' }}
          </button>
        </form>

        <p class="small muted foot">
          Every sign in, and every change made afterwards, is written to the activity log.
        </p>
        <a class="back small" routerLink="/">← Back to the public portal</a>
      </section>
    </main>
  `,
  styles: [`
    .shell { min-height: 100vh; display: grid; place-items: center; padding: 40px 20px;
             background: linear-gradient(160deg, var(--brand-dark), var(--brand) 55%, var(--brand-bright)); }
    .panel { width: 100%; max-width: 420px; background: #fff; border-radius: 16px; padding: 36px 34px;
             box-shadow: 0 24px 60px rgba(0,0,0,.28); }
    .brand { display: flex; gap: 12px; align-items: center; text-decoration: none; margin-bottom: 26px; }
    .mark { width: 42px; height: 42px; border-radius: 10px; background: var(--brand); color: #fff;
            font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; }
    .brand strong { display: block; font-family: var(--serif); font-size: 17px; color: var(--ink); }
    .brand em { font-style: normal; font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
                color: var(--muted); }
    h1 { font-size: 26px; margin-bottom: 4px; }
    form { margin-top: 24px; }
    .btn-block { width: 100%; justify-content: center; }
    .foot { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); }
    .back { display: inline-block; margin-top: 10px; }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  busy = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.error.set('Enter your email address and password.'); return; }
    this.busy.set(true); this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        const next = this.route.snapshot.queryParamMap.get('next') || '/admin/dashboard';
        this.router.navigateByUrl(next);
      },
      error: err => {
        this.error.set(err?.error?.message || 'Could not sign in. Please try again.');
        this.busy.set(false);
      },
    });
  }
}
