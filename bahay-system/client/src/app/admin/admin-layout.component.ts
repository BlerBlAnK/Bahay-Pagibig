import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

/**
 * Administrative shell. The sidebar follows the wireframe exactly, including the
 * panel's rename: Graphical Reports sits under Reports & Logs, not under Overview.
 */
@Component({
  selector: 'bp-admin-layout', standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="side">
        <a class="brand" routerLink="/admin/dashboard">
          <span class="mark">BP</span>
          <span><strong>Bahay Pag-ibig</strong><em>Operations</em></span>
        </a>

        <nav>
          <p class="group">Overview</p>
          <a routerLink="/admin/dashboard" routerLinkActive="on">Dashboard</a>

          <p class="group">Volunteers</p>
          <a routerLink="/admin/applications" routerLinkActive="on">
            Applications
            @if (pending) { <span class="count">{{ pending }}</span> }
          </a>
          <a routerLink="/admin/profiles" routerLinkActive="on">Profiles &amp; Hours</a>
          <a routerLink="/admin/certificates" routerLinkActive="on">Certificates</a>

          <p class="group">Donations</p>
          <a routerLink="/admin/donations" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">
            Donation Records</a>
          <a routerLink="/admin/donations/new" routerLinkActive="on">Log New Donation</a>
          <a routerLink="/admin/wishlist" routerLinkActive="on">Wishlist &amp; Inventory</a>
          <a routerLink="/admin/inventory" routerLinkActive="on">Inventory Log</a>

          <p class="group">Content</p>
          <a routerLink="/admin/events" routerLinkActive="on">Events &amp; Announcements</a>
          <a routerLink="/admin/organization" routerLinkActive="on">Organization Info</a>
          <a routerLink="/admin/faqs" routerLinkActive="on">FAQ Content</a>
          <a routerLink="/admin/inquiries" routerLinkActive="on">Contact Inquiries</a>

          <p class="group">Reports &amp; Logs</p>
          <a routerLink="/admin/graphical-reports" routerLinkActive="on">Graphical Reports</a>
          <a routerLink="/admin/monthly-reports" routerLinkActive="on">Monthly Reports</a>
          <a routerLink="/admin/activity-log" routerLinkActive="on">Activity Log</a>

          @if (auth.isSuperAdmin()) {
            <p class="group">Administration</p>
            <a routerLink="/admin/accounts" routerLinkActive="on">
              User Accounts <span class="badge-super">SUPER ADMIN</span>
            </a>
          }
        </nav>

        <a class="who" routerLink="/admin/account" routerLinkActive="on"
           title="Your account and password">
          <div class="avatar">{{ initials }}</div>
          <div class="name">
            <strong>{{ auth.user()?.full_name }}</strong>
            <span class="role" [class.sa]="auth.isSuperAdmin()">{{ auth.user()?.role }}</span>
          </div>
        </a>
        <button class="signout" type="button" (click)="auth.logout()">Log out</button>
      </aside>

      <main class="main"><router-outlet /></main>
    </div>
  `,
  styles: [`
    .shell { display: grid; grid-template-columns: 252px 1fr; min-height: 100vh;
             background: linear-gradient(90deg, var(--brand-dark) 0 252px, var(--paper) 252px); }
    .side { background: var(--brand-dark); color: #fff; padding: 18px 0 14px; display: flex;
            flex-direction: column; position: sticky; top: 0; height: 100vh; }
    .brand { display: flex; gap: 10px; align-items: center; text-decoration: none; padding: 0 20px 14px;
             border-bottom: 1px solid rgba(255,255,255,.14); }
    .mark { width: 34px; height: 34px; border-radius: 8px; background: #fff; color: var(--brand);
            font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center; }
    .brand strong { display: block; font-family: var(--serif); font-size: 14px; color: #fff; }
    .brand em { font-style: normal; font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
                color: rgba(255,255,255,.62); }
    nav { flex: 1; overflow-y: auto; padding: 6px 0 4px; }
    .group { font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
             color: rgba(255,255,255,.48); padding: 10px 20px 4px; margin: 0; }
    nav a { display: flex; align-items: center; justify-content: space-between; gap: 8px;
            padding: 7px 20px; font-size: 13px; color: rgba(255,255,255,.84); text-decoration: none;
            border-left: 3px solid transparent; }
    nav a:hover { background: rgba(255,255,255,.07); color: #fff; }
    nav a.on { background: rgba(255,255,255,.12); color: #fff; font-weight: 600;
               border-left-color: var(--gold); }
    .count { background: var(--brand-bright); color: #fff; font-size: 11px; font-weight: 700;
             min-width: 20px; text-align: center; border-radius: 999px; padding: 1px 6px; }
    .badge-super { background: var(--gold); color: var(--gold-dark); font-size: 8px; font-weight: 800;
                   letter-spacing: .08em; border-radius: 4px; padding: 2px 5px; }
    .who { display: flex; gap: 10px; align-items: center; padding: 12px 20px 10px;
           border-top: 1px solid rgba(255,255,255,.14); text-decoration: none; color: inherit; }
    .who:hover { background: rgba(255,255,255,.07); }
    .who.on .name strong { color: var(--gold); }
    .avatar { width: 32px; height: 32px; border-radius: 999px; background: rgba(255,255,255,.18);
              font-size: 11px; font-weight: 700; display: flex; align-items: center;
              justify-content: center; flex-shrink: 0; }
    .name strong { display: block; font-size: 12px; }
    .role { font-size: 10px; letter-spacing: .07em; text-transform: uppercase;
            color: rgba(255,255,255,.6); }
    .role.sa { color: var(--gold); font-weight: 700; }
    .signout { margin: 0 20px; background: transparent; border: 1px solid rgba(255,255,255,.3);
               color: rgba(255,255,255,.88); border-radius: 8px; padding: 7px 10px; font: inherit;
               font-size: 12px; cursor: pointer; }
    .signout:hover { background: rgba(255,255,255,.1); }
    .main { background: var(--paper); min-width: 0; }
    @media (max-width: 1000px) {
      .shell { grid-template-columns: 1fr; background: var(--paper); }
      .side { position: static; height: auto; }
      nav { max-height: 300px; }
    }
  `],
})
export class AdminLayoutComponent {
  auth = inject(AuthService);
  /** Filled by the dashboard once counts load; the wireframe shows a badge here. */
  pending = 0;
  get initials(): string {
    const n = this.auth.user()?.full_name || '';
    return n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'BP';
  }
}
