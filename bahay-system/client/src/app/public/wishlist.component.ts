import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { WishlistItem } from '../core/models';

/** FR-10 — the public Wishlist, the donation guidelines and how to donate. */
@Component({
  selector: 'bp-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <p class="crumb"><a routerLink="/">Home</a> / Wishlist</p>
      <h1>Wishlist &amp; Donation Guidelines</h1>
      <p class="lead">This list updates as donations arrive and as the facility uses what it has,
         so what you see here is what we actually need today.</p>
    </section>

    <section class="band">
      <div class="band-head">
        <h2>Current Wishlist</h2>
        <div class="filters">
          @for (f of filters; track f) {
            <button class="chip" [class.on]="filter() === f" (click)="filter.set(f)">{{ f }}</button>
          }
        </div>
      </div>

      @if (loading()) {
        <p class="spinner">Loading…</p>
      } @else if (shown().length === 0) {
        <p class="muted">Nothing in this category right now.</p>
      } @else {
        <div class="grid">
          @for (item of shown(); track item._id) {
            <article class="card"><div class="card-body">
              <div class="top-row">
                <span class="small muted">{{ item.category || 'General' }}</span>
                <span class="badge" [class.badge-brand]="item.status === 'Needed'"
                      [class.badge-warn]="item.status === 'Partially Fulfilled'"
                      [class.badge-ok]="item.status === 'Fulfilled'">{{ item.status }}</span>
              </div>
              <h3>{{ item.item_name }}</h3>
              <div class="qty">
                <span class="muted small">Current: {{ item.current_quantity }} {{ item.unit }}</span>
                <strong class="small">Target: {{ item.target_quantity }} {{ item.unit }}</strong>
              </div>
              <div class="bar"><span [style.width.%]="progress(item)"
                                     [class.full]="item.status === 'Fulfilled'"></span></div>
            </div></article>
          }
        </div>
      }
    </section>

    <section class="band alt">
      <h2>Donation Guidelines</h2>
      <p class="lead">Please read these before sending or bringing a donation.</p>
      <div class="two">
        <div class="card"><div class="card-body">
          <h3>What we accept</h3>
          <ul class="ticks">
            <li>Group or organization donations, arranged in advance</li>
            <li>Food items that are sealed and within their expiry date</li>
            <li>Medical supplies such as adult diapers and over-the-counter essentials</li>
            <li>Hygiene products — soap, shampoo, toothpaste</li>
            <li>Household items — towels, bed sheets, blankets</li>
          </ul>
        </div></div>
        <div class="card"><div class="card-body">
          <h3>What we cannot accept</h3>
          <ul class="crosses">
            <li>Expired or opened food and medicine</li>
            <li>Prescription medication without a doctor's endorsement</li>
            <li>Used undergarments</li>
            <li>Heavily worn clothing or broken appliances</li>
          </ul>
        </div></div>
      </div>
    </section>

    <section class="band" id="donate">
      <h2>How to Donate</h2>

      <div class="notice notice-gold report-note">
        <span class="bang">!</span>
        <div>
          <strong>After sending an e-wallet or bank donation, please report it</strong>
          <p>Fill in the donation report form with your reference number and the date of the
             transaction. This gives both you and the facility a record of the same donation.</p>
          <a routerLink="/donate/report">Open the donation report form →</a>
        </div>
      </div>

      <div class="three">
        <div class="card method"><div class="card-body">
          <h3>E-wallet</h3>
          <div class="qr">QR code<br><span class="small muted">GCash / Maya</span></div>
          <p class="small muted">Scan with your e-wallet app, then report the transaction.</p>
        </div></div>
        <div class="card method"><div class="card-body">
          <h3>Bank Transfer</h3>
          <div class="qr">QR code<br><span class="small muted">Bank account</span></div>
          <p class="small muted">Transfer to the facility account, then report the transaction.</p>
        </div></div>
        <div class="card method"><div class="card-body">
          <h3>Physically Handed Over</h3>
          <div class="qr wide">Bring items to the facility</div>
          <p class="small muted">Monday to Sunday, 8:00 AM to 5:00 PM. Staff record it on the spot,
             so no form is needed.</p>
        </div></div>
      </div>
    </section>
  `,
  styles: [`
    .hero { padding: 56px 80px 48px; background: var(--paper); }
    .crumb { font-size: 12px; color: var(--muted); margin: 0 0 10px; }
    .hero h1 { font-size: 46px; line-height: 1.12; }
    .lead { font-size: 16px; color: var(--muted); max-width: 70ch; margin: 14px 0 0; }
    .band { padding: 64px 80px; background: #fff; }
    .band.alt { background: var(--paper); }
    .band-head { display: flex; justify-content: space-between; align-items: center; gap: 20px;
                 flex-wrap: wrap; margin-bottom: 26px; }
    .filters { display: flex; gap: 10px; flex-wrap: wrap; }
    .chip { min-height: 36px; padding: 6px 16px; border-radius: 999px; border: 1px solid var(--line-strong);
            background: #fff; color: var(--ink-soft); font: inherit; font-size: 13px; font-weight: 600;
            cursor: pointer; }
    .chip.on { background: var(--brand); border-color: var(--brand); color: #fff; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 22px; }
    .top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .card-body h3 { margin: 6px 0 10px; font-family: var(--serif); font-size: 19px; }
    .qty { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .bar { height: 8px; border-radius: 4px; background: var(--paper-warm); overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--brand-bright); border-radius: 4px; }
    .bar span.full { background: var(--ok); }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-top: 24px; }
    .three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 24px; }
    ul { list-style: none; padding: 0; margin: 0; }
    ul li { display: flex; gap: 12px; align-items: flex-start; padding: 7px 0; font-size: 14px;
            color: var(--ink-soft); }
    ul li::before { flex-shrink: 0; width: 22px; height: 22px; border-radius: 999px; display: flex;
                    align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
    .ticks li::before   { content: '✓'; background: var(--ok-pale); color: var(--ok); }
    .crosses li::before { content: '✕'; background: var(--brand-pale); color: var(--brand); }
    .report-note { margin-top: 24px; }
    .report-note strong { display: block; font-size: 14px; margin-bottom: 4px; }
    .report-note p { margin: 0 0 6px; font-size: 13px; color: var(--ink-soft); }
    .bang { width: 24px; height: 24px; border-radius: 999px; background: var(--gold); color: var(--ink);
            font-weight: 700; font-size: 12px; display: flex; align-items: center;
            justify-content: center; flex-shrink: 0; }
    .method .card-body { text-align: center; }
    .qr { margin: 14px auto; width: 182px; height: 182px; border: 1px solid var(--line-strong);
          border-radius: 10px; background: var(--paper-warm); display: flex; flex-direction: column;
          align-items: center; justify-content: center; font-size: 12px; font-weight: 600;
          color: var(--muted); gap: 6px; }
    .qr.wide { width: 100%; }
    @media (max-width: 900px) {
      .hero, .band { padding: 40px 20px; }
      .hero h1 { font-size: 30px; }
      .two, .three { grid-template-columns: 1fr; }
    }
  `],
})
export class WishlistComponent implements OnInit {
  private api = inject(ApiService);
  readonly filters = ['All', 'Needed', 'Partially Fulfilled', 'Fulfilled'] as const;

  items = signal<WishlistItem[]>([]);
  filter = signal<string>('All');
  loading = signal(true);

  shown = computed(() => {
    const f = this.filter();
    return f === 'All' ? this.items() : this.items().filter(i => i.status === f);
  });

  ngOnInit(): void {
    this.api.publicWishlist().subscribe({
      next: items => { this.items.set(items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  progress(item: WishlistItem): number {
    if (!item.target_quantity) return 0;
    return Math.min(100, Math.round((item.current_quantity / item.target_quantity) * 100));
  }
}
