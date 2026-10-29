import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Role, User } from './models';

const TOKEN_KEY = 'bp_token';
const USER_KEY = 'bp_user';

/** FR-01 — holds the session and answers the role questions the UI asks. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<User | null>(this.readStoredUser());
  readonly user = this._user.asReadonly();
  readonly isSignedIn = computed(() => this._user() !== null);
  readonly isSuperAdmin = computed(() => this._user()?.role === 'Super Admin');

  private readStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch { return null; }
  }

  get token(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  hasRole(role: Role): boolean {
    const u = this._user();
    return !!u && (u.role === 'Super Admin' || u.role === role);
  }

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: User }>(
      `${environment.apiUrl}/auth/login`, { email, password }
    ).pipe(tap(res => {
      try {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      } catch { /* private mode — the session lives in memory only */ }
      this._user.set(res.user);
    }));
  }

  logout(): void {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({
      complete: () => this.clear(),
      error: () => this.clear(),
    });
  }

  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* ignore */ }
    this._user.set(null);
    this.router.navigate(['/admin/login']);
  }
}
