import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { OrgService } from '../core/org.service';
import { FacilityEvent, WishlistItem } from '../core/models';

@Component({
  selector: 'bp-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <div>
        <h1>{{ o().tagline || o().name }}</h1>
        <p>{{ o().about }}</p>
        <div class="cta">
          <a class="btn btn-primary" routerLink="/wishlist">See what we need</a>
          <a class="btn btn-secondary" routerLink="/volunteer">Volunteer with us</a>
        </div>
      </div>
      @if (o().facts.length) {
        <div class="stats">
          @for (f of o().facts.slice(0, 3); track f.label) {
            <div><strong>{{ f.value }}</strong><span>{{ f.label }}</span></div>
          }
        </div>
      }
    </section>

    <section class="band">
      <div class="band-head">
        <h2>Needed right now</h2>
        <a routerLink="/wishlist">See the full Wishlist →</a>
      </div>
      @if (loading()) {
        <p class="spinner">Loading the Wishlist…</p>
      } @else if (needs().length === 0) {
        <p class="muted">Nothing is outstanding at the moment. Thank you.</p>
      } @else {
        <div class="grid">
          @for (item of needs(); track item._id) {
            <article class="card">
              <div class="card-body">
                <div class="top-row">
                  <span class="small muted">{{ item.category || 'General' }}</span>
                  <span class="badge" [class.badge-brand]="item.status === 'Needed'"
                        [class.badge-warn]="item.status === 'Partially Fulfilled'"
                        [class.badge-ok]="item.status === 'Fulfilled'">{{ item.status }}</span>
                </div>
                <h3>{{ item.item_name }}</h3>
                <div class="qty">
                  <span class="muted small">Current: {{ item.current_quantity }}</span>
                  <strong class="small">Target: {{ item.target_quantity }}</strong>
                </div>
                <div class="bar"><span [style.width.%]="progress(item)"
                                       [class.full]="item.status === 'Fulfilled'"></span></div>
              </div>
            </article>
          }
        </div>
      }
    </section>

    <section class="band alt">
      <div class="band-head"><h2>Upcoming events</h2><a routerLink="/events">All events →</a></div>
      @if (events().length === 0) {
        <p class="muted">No events are scheduled yet. Check back soon.</p>
      } @else {
        <div class="grid">
          @for (e of events(); track e._id) {
            <article class="card"><div class="card-body">
              <span class="badge badge-brand">{{ e.type }}</span>
              <h3>{{ e.title }}</h3>
              @if (e.event_date) {
                <p class="small muted">{{ e.event_date | date: 'MMMM d, y' }}
                  @if (e.event_time) { · {{ e.event_time }} }
                  @if (e.venue) { · {{ e.venue }} }
                </p>
              }
              <p class="small">{{ e.description }}</p>
            </div></article>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .hero {
      display: grid; grid-template-columns: 1.4fr 1fr; gap: 56px; align-items: center;
      padding: 72px 80px; background: var(--paper);
    }
    .hero h1 { font-size: 46px; line-height: 1.12; margin-bottom: 18px; }
    .hero p { font-size: 16px; color: var(--muted); max-width: 54ch; }
    .cta { display: flex; gap: 12px; margin-top: 26px; flex-wrap: wrap; }
    .stats { display: flex; flex-direction: column; gap: 18px; }
    .stats div {
      background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 20px 22px;
    }
    .stats strong { display: block; font-family: var(--serif); font-size: 32px; color: var(--brand); }
    .stats span { font-size: 13px; color: var(--muted); }
    .band { padding: 64px 80px; background: #fff; }
    .band.alt { background: var(--paper); }
    .band-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 26px; gap: 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 22px; }
    .top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .card-body h3 { margin: 6px 0 10px; font-family: var(--serif); font-size: 19px; }
    .qty { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .bar { height: 8px; border-radius: 4px; background: var(--paper-warm); overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--brand-bright); border-radius: 4px; }
    .bar span.full { background: var(--ok); }
    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; padding: 40px 20px; gap: 32px; }
      .hero h1 { font-size: 32px; }
      .band { padding: 40px 20px; }
    }
  `],
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  private org = inject(OrgService);
  o = this.org.info;
  needs = signal<WishlistItem[]>([]);
  events = signal<FacilityEvent[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.org.load();
    this.api.publicWishlist().subscribe({
      next: items => {
        this.needs.set(items.filter(i => i.status !== 'Fulfilled').slice(0, 4));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.publicEvents().subscribe({
      next: list => this.events.set(list.filter(e => e.type === 'Event').slice(0, 3)),
      error: () => {},
    });
  }

  progress(item: WishlistItem): number {
    if (!item.target_quantity) return 0;
    return Math.min(100, Math.round((item.current_quantity / item.target_quantity) * 100));
  }
}
