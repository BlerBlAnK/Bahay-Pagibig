import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FacilityEvent } from '../core/models';

@Component({
  selector: 'bp-events', standalone: true, imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <p class="crumb"><a routerLink="/">Home</a> / Events</p>
      <h1>Events &amp; Announcements</h1>
      <p class="lead">What is happening at the facility, and what we are asking the community for.</p>
    </section>
    <section class="band">
      @if (loading()) { <p class="spinner">Loading…</p> }
      @else if (items().length === 0) { <p class="muted">Nothing posted yet. Please check back.</p> }
      @else {
        <div class="grid">
          @for (e of items(); track e._id) {
            <article class="card"><div class="card-body">
              <span class="badge" [class.badge-brand]="e.type === 'Event'"
                    [class.badge-warn]="e.type === 'Announcement'">{{ e.type }}</span>
              <h3>{{ e.title }}</h3>
              @if (e.event_date) {
                <p class="small muted when">{{ e.event_date | date: 'EEEE, MMMM d, y' }}
                  @if (e.event_time) { · {{ e.event_time }} }
                  @if (e.venue) { · {{ e.venue }} }
                </p>
              }
              <p>{{ e.description }}</p>
            </div></article>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .hero { padding: 56px 80px 48px; background: var(--paper); }
    .crumb { font-size: 12px; color: var(--muted); margin: 0 0 10px; }
    .hero h1 { font-size: 46px; line-height: 1.12; }
    .lead { font-size: 16px; color: var(--muted); max-width: 70ch; margin: 14px 0 0; }
    .band { padding: 56px 80px; background: #fff; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 22px; }
    .card-body h3 { margin: 10px 0 6px; font-family: var(--serif); font-size: 21px; }
    .when { margin: 0 0 10px; }
    .card-body p { margin: 0; color: var(--ink-soft); font-size: 14px; }
    @media (max-width: 900px) { .hero, .band { padding: 40px 20px; } .hero h1 { font-size: 30px; } }
  `],
})
export class EventsComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<FacilityEvent[]>([]);
  loading = signal(true);
  ngOnInit(): void {
    this.api.publicEvents().subscribe({
      next: l => { this.items.set(l); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
