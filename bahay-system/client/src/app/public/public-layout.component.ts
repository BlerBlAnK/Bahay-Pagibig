import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { OrgService } from '../core/org.service';

@Component({
  selector: 'bp-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="top">
      <a class="brand" routerLink="/">
        <span class="mark">BP</span>
        <span class="name">{{ org.info().name }}</span>
      </a>
      <nav>
        <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">Home</a>
        <a routerLink="/about" routerLinkActive="on">About Us</a>
        <a routerLink="/events" routerLinkActive="on">Events</a>
        <a routerLink="/wishlist" routerLinkActive="on">Wishlist</a>
        <a routerLink="/wishlist" fragment="donate">Donate</a>
        <a routerLink="/contact" routerLinkActive="on">Contact</a>
        <a class="btn btn-primary" routerLink="/volunteer">Volunteer With Us</a>
      </nav>
    </header>

    <main><router-outlet /></main>

    <footer class="foot">
      <div class="col">
        <div class="brand light">
          <span class="mark">BP</span>
          <span class="name">{{ org.info().name }}</span>
        </div>
        <p>{{ org.info().tagline || org.info().about }}</p>
      </div>
      <div class="col">
        <h4>Quick Links</h4>
        <a routerLink="/">Home</a><a routerLink="/about">About Us</a>
        <a routerLink="/events">Events</a><a routerLink="/wishlist">Wishlist</a>
      </div>
      <div class="col">
        <h4>Get Involved</h4>
        <a routerLink="/wishlist" fragment="donate">Donate</a>
        <a routerLink="/volunteer">Volunteer</a>
        <a routerLink="/contact">Contact Us</a>
        <a routerLink="/admin/login">Staff Login</a>
      </div>
      <div class="col">
        <h4>Contact</h4>
        @if (org.info().address) { <p>{{ org.info().address }}</p> }
        @if (org.info().contact_number) { <p>{{ org.info().contact_number }}</p> }
        @if (org.info().email) { <p>{{ org.info().email }}</p> }
      </div>
    </footer>

    <a class="chat-fab" routerLink="/faq" aria-label="Frequently asked questions">?</a>
  `,
  styles: [`
    .top {
      display: flex; align-items: center; justify-content: space-between; gap: 24px;
      padding: 18px 80px; background: #fff; border-bottom: 1px solid var(--line);
      position: sticky; top: 0; z-index: 20;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .mark {
      width: 38px; height: 38px; border-radius: 999px; background: var(--brand); color: #fff;
      font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .name { font-size: 15px; font-weight: 700; color: var(--ink); }
    .brand.light .name { color: #fff; }
    .brand.light .mark { background: var(--brand-mid); }
    nav { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
    nav a { font-size: 14px; color: var(--ink-soft); }
    nav a.on { color: var(--brand); font-weight: 600; }
    nav a.btn { color: #fff; }
    main { min-height: 60vh; }
    .foot {
      display: grid; grid-template-columns: 1.6fr 1fr 1fr 1.3fr; gap: 40px;
      padding: 56px 80px; background: var(--brand-dark); color: var(--brand-tint); font-size: 13px;
    }
    .foot h4 { margin: 0 0 12px; color: #fff; font-size: 13px; font-weight: 600; font-family: var(--sans); }
    .foot a { display: block; color: var(--brand-tint); margin-bottom: 8px; }
    .foot a:hover { color: #fff; }
    .foot p { margin: 0 0 8px; line-height: 1.6; }
    .col > .brand { margin-bottom: 16px; }
    .chat-fab {
      position: fixed; right: 32px; bottom: 32px; width: 56px; height: 56px; border-radius: 999px;
      background: var(--brand); color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 700; box-shadow: 0 6px 20px rgba(0,0,0,.18); z-index: 30;
    }
    @media (max-width: 900px) {
      .top { padding: 14px 20px; flex-wrap: wrap; }
      nav { gap: 14px; font-size: 13px; }
      .foot { grid-template-columns: 1fr; gap: 28px; padding: 40px 20px; }
    }
  `],
})
export class PublicLayoutComponent implements OnInit {
  org = inject(OrgService);
  ngOnInit(): void { this.org.load(); }
}
