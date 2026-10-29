import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { OrgService } from '../core/org.service';

/** FR-03 — contact inquiries. */
@Component({
  selector: 'bp-contact', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="hero">
      <p class="crumb"><a routerLink="/">Home</a> / Contact Us</p>
      <h1>Contact Us</h1>
      <p class="lead">Questions about donating, volunteering or visiting? Send us a message.</p>
    </section>
    <section class="band">
      <div class="split">
        @if (done()) {
          <div class="notice notice-ok"><div>
            <strong>Thank you. We will get back to you.</strong>
            <p>Our staff read messages during office hours, Monday to Sunday.</p>
          </div></div>
        } @else {
          <form class="card" [formGroup]="form" (ngSubmit)="submit()">
            <div class="card-head"><h3>Send a message</h3></div>
            <div class="card-body stack">
              @if (error()) { <div class="notice notice-error">{{ error() }}</div> }
              <div class="row">
                <div class="field">
                  <label for="n">Your name *</label>
                  <input id="n" type="text" formControlName="sender_name">
                  @if (bad('sender_name')) { <span class="error">Enter your name.</span> }
                </div>
                <div class="field">
                  <label for="c">Email or contact number *</label>
                  <input id="c" type="text" formControlName="contact_info">
                  @if (bad('contact_info')) { <span class="error">Enter how we can reach you.</span> }
                </div>
              </div>
              <div class="field">
                <label for="s">Subject</label>
                <input id="s" type="text" formControlName="subject">
              </div>
              <div class="field">
                <label for="m">Message *</label>
                <textarea id="m" formControlName="message"></textarea>
                @if (bad('message')) { <span class="error">Write your message.</span> }
              </div>
              <button class="btn btn-primary" type="submit" [disabled]="saving()">
                {{ saving() ? 'Sending…' : 'Send Message' }}
              </button>
            </div>
          </form>
        }
        <aside class="card"><div class="card-body">
          <h3>Visit or call</h3>
          @if (o().address) {
            <p class="small"><strong>Address</strong><br>{{ o().address }}</p>
          }
          @if (o().contact_number) {
            <p class="small"><strong>Contact</strong><br>{{ o().contact_number }}</p>
          }
          @if (o().email) {
            <p class="small"><strong>Email</strong><br>{{ o().email }}</p>
          }
          @if (o().visiting_hours) {
            <p class="small"><strong>Open for donations</strong><br>{{ o().visiting_hours }}</p>
          }
        </div></aside>
      </div>
    </section>
  `,
  styles: [`
    .hero { padding: 56px 80px 48px; background: var(--paper); }
    .crumb { font-size: 12px; color: var(--muted); margin: 0 0 10px; }
    .hero h1 { font-size: 46px; line-height: 1.12; }
    .lead { font-size: 16px; color: var(--muted); max-width: 66ch; margin: 14px 0 0; }
    .band { padding: 56px 80px; background: #fff; }
    .split { display: grid; grid-template-columns: 1fr 320px; gap: 40px; align-items: start; }
    .notice strong { display: block; margin-bottom: 4px; }
    .notice p { margin: 0; font-size: 13px; }
    aside p { margin: 0 0 14px; color: var(--ink-soft); }
    @media (max-width: 1000px) {
      .hero, .band { padding: 40px 20px; } .hero h1 { font-size: 30px; }
      .split { grid-template-columns: 1fr; }
    }
  `],
})
export class ContactComponent implements OnInit {
  private api = inject(ApiService);
  private org = inject(OrgService);
  private fb = inject(FormBuilder);
  o = this.org.info;

  ngOnInit(): void { this.org.load(); }
  saving = signal(false); error = signal(''); done = signal(false);

  form = this.fb.nonNullable.group({
    sender_name:  ['', Validators.required],
    contact_info: ['', Validators.required],
    subject:      [''],
    message:      ['', Validators.required],
  });

  bad(n: string): boolean { const c = this.form.get(n); return !!c && c.invalid && (c.touched || c.dirty); }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    this.api.sendInquiry(this.form.getRawValue()).subscribe({
      next: () => { this.done.set(true); this.saving.set(false); },
      error: err => { this.error.set(err?.error?.message || 'Could not send the message.'); this.saving.set(false); },
    });
  }
}
