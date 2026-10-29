import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Faq } from '../core/models';

/**
 * FR-04 — click-based FAQ assistant. Rule-based and click-driven by design:
 * no AI, no NLP, matching the Delimitations.
 */
@Component({
  selector: 'bp-chatbot', standalone: true, imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <p class="crumb"><a routerLink="/">Home</a> / Frequently Asked Questions</p>
      <h1>Frequently Asked Questions</h1>
      <p class="lead">Pick a question below. These answers are maintained by facility staff.</p>
    </section>
    <section class="band">
      <div class="chat card">
        <div class="card-head">
          <div class="who"><span class="avatar">BP</span>
            <div><strong>Bahay Pag-ibig Assistant</strong>
              <span class="small muted">Click a question to see the answer</span></div>
          </div>
          @if (active()) { <button class="btn btn-secondary" (click)="active.set(null)">Back to topics</button> }
        </div>
        <div class="card-body">
          @if (loading()) { <p class="spinner">Loading…</p> }
          @else if (active()) {
            <div class="bubble you">{{ active()!.question }}</div>
            <div class="bubble bot">{{ active()!.answer }}</div>
            <p class="small muted follow">Anything else?</p>
            <div class="chips">
              @for (f of others(); track f._id) {
                <button class="chip" (click)="active.set(f)">{{ f.question }}</button>
              }
            </div>
          } @else {
            <div class="bubble bot">Hello! What would you like to know?</div>
            <div class="chips">
              @for (f of faqs(); track f._id) {
                <button class="chip" (click)="active.set(f)">{{ f.question }}</button>
              }
            </div>
            @if (faqs().length === 0) {
              <p class="muted">No questions have been published yet.</p>
            }
          }
        </div>
      </div>
      <p class="small muted after">Cannot find your question?
        <a routerLink="/contact">Send us a message</a> instead.</p>
    </section>
  `,
  styles: [`
    .hero { padding: 56px 80px 48px; background: var(--paper); }
    .crumb { font-size: 12px; color: var(--muted); margin: 0 0 10px; }
    .hero h1 { font-size: 46px; line-height: 1.12; }
    .lead { font-size: 16px; color: var(--muted); max-width: 66ch; margin: 14px 0 0; }
    .band { padding: 56px 80px; background: #fff; }
    .chat { max-width: 760px; }
    .who { display: flex; gap: 12px; align-items: center; }
    .who strong { display: block; font-size: 14px; }
    .avatar { width: 36px; height: 36px; border-radius: 999px; background: var(--brand); color: #fff;
              font-size: 12px; font-weight: 700; display: flex; align-items: center;
              justify-content: center; flex-shrink: 0; }
    .bubble { padding: 12px 16px; border-radius: 12px; font-size: 14px; margin-bottom: 12px;
              max-width: 85%; line-height: 1.55; }
    .bubble.bot { background: var(--paper); border: 1px solid var(--line); color: var(--ink-soft); }
    .bubble.you { background: var(--brand); color: #fff; margin-left: auto; }
    .chips { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; margin-top: 8px; }
    .chip { text-align: left; padding: 10px 16px; border-radius: 999px; border: 1px solid var(--line-strong);
            background: #fff; color: var(--brand); font: inherit; font-size: 13px; font-weight: 600;
            cursor: pointer; }
    .chip:hover { background: var(--brand-pale); border-color: var(--brand); }
    .follow { margin: 14px 0 6px; }
    .after { margin-top: 18px; }
    @media (max-width: 900px) { .hero, .band { padding: 40px 20px; } .hero h1 { font-size: 30px; } }
  `],
})
export class ChatbotComponent implements OnInit {
  private api = inject(ApiService);
  faqs = signal<Faq[]>([]);
  active = signal<Faq | null>(null);
  loading = signal(true);
  others = computed(() => this.faqs().filter(f => f._id !== this.active()?._id).slice(0, 4));

  ngOnInit(): void {
    this.api.publicFaqs().subscribe({
      next: l => { this.faqs.set(l); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
