import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrgService } from '../core/org.service';

/**
 * FR-03 / FR-05 — everything on this page is read from Organization Info, so
 * staff can change it from the dashboard without touching source code.
 */
@Component({
  selector: 'bp-about', standalone: true, imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <p class="crumb"><a routerLink="/">Home</a> / About Us</p>
      <h1>About {{ o().name }}</h1>
      @if (o().about) { <p class="lead">{{ o().about }}</p> }
    </section>

    <section class="band">
      @if (o().mission || o().vision) {
        <div class="two">
          @if (o().mission) {
            <div class="card"><div class="card-body">
              <h3>Our Mission</h3>
              <p>{{ o().mission }}</p>
            </div></div>
          }
          @if (o().vision) {
            <div class="card"><div class="card-body">
              <h3>Our Vision</h3>
              <p>{{ o().vision }}</p>
            </div></div>
          }
        </div>
      }

      @if (o().facts.length) {
        <div class="facts">
          @for (f of o().facts; track f.label) {
            <div><strong>{{ f.value }}</strong><span>{{ f.label }}</span></div>
          }
        </div>
      }

      @if (o().history) { <p class="note muted small">{{ o().history }}</p> }

      <div class="reach card"><div class="card-body">
        <h3>Visit or get in touch</h3>
        <dl>
          @if (o().address) { <dt>Address</dt><dd>{{ o().address }}</dd> }
          @if (o().contact_number) { <dt>Contact</dt><dd>{{ o().contact_number }}</dd> }
          @if (o().email) { <dt>Email</dt><dd>{{ o().email }}</dd> }
          @if (o().visiting_hours) { <dt>Open</dt><dd>{{ o().visiting_hours }}</dd> }
        </dl>
        <a class="btn btn-primary" routerLink="/contact">Send us a message</a>
      </div></div>
    </section>
  `,
  styles: [`
    .hero { padding: 56px 80px 48px; background: var(--paper); }
    .crumb { font-size: 12px; color: var(--muted); margin: 0 0 10px; }
    .hero h1 { font-size: 46px; line-height: 1.12; }
    .lead { font-size: 16px; color: var(--muted); max-width: 70ch; margin: 14px 0 0; }
    .band { padding: 56px 80px; background: #fff; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
    .card-body h3 { font-family: var(--serif); font-size: 22px; margin-bottom: 10px; }
    .card-body p { margin: 0; color: var(--ink-soft); }
    .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
             gap: 22px; margin: 32px 0; }
    .facts div { background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius);
                 padding: 20px 22px; }
    .facts strong { display: block; font-family: var(--serif); font-size: 30px; color: var(--brand); }
    .facts span { font-size: 13px; color: var(--muted); }
    .note { max-width: 80ch; }
    .reach { margin-top: 32px; max-width: 560px; }
    .reach h3 { font-size: 20px; }
    .reach dl { display: grid; grid-template-columns: 110px 1fr; gap: 8px 14px; margin: 0 0 18px; }
    .reach dt { font-size: 11px; letter-spacing: .06em; text-transform: uppercase;
                color: var(--muted); padding-top: 2px; }
    .reach dd { margin: 0; font-size: 14px; color: var(--ink); }
    @media (max-width: 900px) {
      .hero, .band { padding: 40px 20px; } .hero h1 { font-size: 30px; }
      .two { grid-template-columns: 1fr; }
      .reach dl { grid-template-columns: 1fr; gap: 2px 0; }
      .reach dd { margin-bottom: 8px; }
    }
  `],
})
export class AboutComponent implements OnInit {
  private org = inject(OrgService);
  o = this.org.info;
  ngOnInit(): void { this.org.load(); }
}
