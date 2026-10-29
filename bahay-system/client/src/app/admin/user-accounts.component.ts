import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { User } from '../core/models';

/**
 * Panel item 6 — admin and super admin accounts. Reachable only by a Super Admin;
 * the route guard sends anyone else back to the dashboard.
 */
@Component({
  selector: 'bp-user-accounts', standalone: true, imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="head">
      <div>
        <h1>User Accounts</h1>
        <p class="muted small">Staff accounts for the administrative dashboard. Only a Super Admin can
           open this screen, create accounts, or change a role.</p>
      </div>
      <button class="btn btn-primary" (click)="showForm.set(!showForm())">
        {{ showForm() ? 'Close' : 'New Account' }}</button>
    </div>

    <div class="body">
      @if (flash()) { <div class="notice notice-ok">{{ flash() }}</div> }
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      <section class="card roles">
        <div class="card-body">
          <div class="two">
            <div>
              <h3>Super Admin</h3>
              <p class="small">Everything an Admin can do, and in addition: create and disable staff
                 accounts, change roles, and open this screen. Intended for the facility
                 administrator.</p>
            </div>
            <div>
              <h3>Admin</h3>
              <p class="small">Day-to-day operations — volunteers, donations, inventory, content and
                 reports. Cannot manage accounts. Intended for the staff members who run the
                 facility's records.</p>
            </div>
          </div>
        </div>
      </section>

      @if (showForm()) {
        <form class="card" [formGroup]="form" (ngSubmit)="create()">
          <div class="card-head"><h3>New staff account</h3></div>
          <div class="card-body">
            <div class="row">
              <div class="field">
                <label for="fn">Full name *</label>
                <input id="fn" type="text" formControlName="full_name">
              </div>
              <div class="field">
                <label for="em">Email address *</label>
                <input id="em" type="email" formControlName="email">
              </div>
            </div>
            <div class="row three">
              <div class="field">
                <label for="po">Position</label>
                <input id="po" type="text" formControlName="position"
                       placeholder="e.g. Facility Administrator">
              </div>
              <div class="field">
                <label for="ro">Role *</label>
                <select id="ro" formControlName="role">
                  <option value="Admin">Admin</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>
              <div class="field">
                <label for="pw">Temporary password *</label>
                <input id="pw" type="password" autocomplete="new-password" formControlName="password">
                <span class="hint small muted">At least 8 characters. The staff member changes it
                  after their first sign-in.</span>
              </div>
            </div>
            <div class="actions">
              <button class="btn btn-primary" type="submit" [disabled]="busy()">
                {{ busy() ? 'Creating…' : 'Create Account' }}</button>
              <button class="btn btn-secondary" type="button" (click)="showForm.set(false)">Cancel</button>
            </div>
          </div>
        </form>
      }

      <div class="card">
        <div class="card-body tight">
          @if (loading()) { <p class="spinner">Loading…</p> }
          @else {
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Position</th><th>Role</th>
                    <th>Status</th><th>Added</th><th></th></tr>
              </thead>
              <tbody>
                @for (u of rows(); track u._id) {
                  <tr>
                    <td><strong>{{ u.full_name }}</strong>
                        @if (u._id === auth.user()?._id) { <span class="small muted">That is you</span> }</td>
                    <td class="small">{{ u.email }}</td>
                    <td class="small">{{ u.position || '—' }}</td>
                    <td><span class="badge" [class.badge-gold]="u.role === 'Super Admin'">{{ u.role }}</span></td>
                    <td><span class="badge" [class.badge-ok]="u.status === 'Active'">{{ u.status }}</span></td>
                    <td class="nowrap small">{{ u.created_at | date: 'MMM d, y' }}</td>
                    <td class="nowrap">
                      @if (u._id !== auth.user()?._id) {
                        <button class="link" [disabled]="busy()" (click)="setRole(u)">
                          {{ u.role === 'Super Admin' ? 'Make Admin' : 'Make Super Admin' }}</button>
                        <button class="link" [disabled]="busy()" (click)="toggleStatus(u)">
                          {{ u.status === 'Active' ? 'Disable' : 'Enable' }}</button>
                      } @else { <span class="small muted">—</span> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>

      <p class="small muted note">An account is disabled rather than deleted, so the activity log
         keeps pointing at a real person. The last Super Admin cannot demote or disable themselves.</p>
    </div>
  `,
  styles: [`
    .head { background: #fff; border-bottom: 1px solid var(--line); padding: 20px 32px;
            display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .head h1 { font-size: 26px; margin-bottom: 2px; }
    .head p { margin: 0; max-width: 70ch; }
    .body { padding: 22px 32px 40px; }
    .roles { margin-bottom: 18px; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    h3 { font-family: var(--serif); font-size: 17px; margin: 0 0 4px; }
    .roles p { margin: 0; color: var(--ink-soft); }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }
    .row.three { grid-template-columns: 1fr 1fr 1fr; }
    .hint { display: block; margin-top: 4px; }
    .actions { display: flex; gap: 10px; }
    .card-body.tight { padding: 0; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
         color: var(--muted); padding: 11px 14px; background: var(--paper);
         border-bottom: 1px solid var(--line); white-space: nowrap; }
    td { padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    td strong { display: block; }
    td span.small { display: block; }
    .nowrap { white-space: nowrap; }
    .badge-gold { background: var(--gold-pale); color: var(--gold-dark); }
    .link { background: none; border: 0; padding: 0 8px 0 0; font: inherit; font-size: 12px;
            font-weight: 600; color: var(--brand); cursor: pointer; }
    .note { margin-top: 14px; max-width: 80ch; }
    @media (max-width: 1000px) {
      .head, .body { padding-left: 18px; padding-right: 18px; }
      .two, .row, .row.three { grid-template-columns: 1fr; }
    }
  `],
})
export class UserAccountsComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  rows = signal<User[]>([]);
  loading = signal(true); busy = signal(false);
  showForm = signal(false);
  flash = signal(''); error = signal('');

  form = this.fb.nonNullable.group({
    full_name: ['', Validators.required],
    email:     ['', [Validators.required, Validators.email]],
    position:  [''],
    role:      ['Admin'],
    password:  ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.users().subscribe({
      next: l => { this.rows.set(l); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message || 'Could not load accounts.'); this.loading.set(false); },
    });
  }

  create(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Fill in the name, a valid email address, and a password of at least 8 characters.');
      return;
    }
    this.busy.set(true); this.error.set('');
    this.api.createUser(this.form.getRawValue()).subscribe({
      next: u => {
        this.flash.set(`${u.full_name} can now sign in as ${u.role}.`);
        this.busy.set(false);
        this.showForm.set(false);
        this.form.reset({ role: 'Admin' });
        this.load();
      },
      error: err => { this.error.set(err?.error?.message || 'Could not create the account.'); this.busy.set(false); },
    });
  }

  setRole(u: User): void {
    const role = u.role === 'Super Admin' ? 'Admin' : 'Super Admin';
    this.patch(u, { role }, `${u.full_name} is now ${role}.`);
  }

  toggleStatus(u: User): void {
    const status = u.status === 'Active' ? 'Disabled' : 'Active';
    this.patch(u, { status }, `${u.full_name}'s account is now ${status.toLowerCase()}.`);
  }

  private patch(u: User, body: Record<string, unknown>, ok: string): void {
    this.busy.set(true); this.error.set('');
    this.api.updateUser(u._id, body).subscribe({
      next: () => { this.flash.set(ok); this.busy.set(false); this.load(); },
      error: err => { this.error.set(err?.error?.message || 'Could not update the account.'); this.busy.set(false); },
    });
  }
}
