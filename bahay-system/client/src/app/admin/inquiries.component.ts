import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ContactInquiry } from '../core/models';

/** FR-03 — messages sent through the public Contact Us form. */
@Component({
  selector: 'bp-inquiries', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <div class="head">
      <div>
        <h1>Contact Inquiries</h1>
        <p class="muted small">Messages from the public portal. Opening one marks it read; mark it
           responded once you have replied by email or phone.</p>
      </div>
    </div>

    <div class="body">
      @if (flash()) { <div class="notice notice-ok">{{ flash() }}</div> }
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      <div class="tabs">
        @for (s of statuses; track s) {
          <button class="tab" [class.on]="status() === s" (click)="pick(s)">
            {{ s === '' ? 'All' : s }}
            @if (s === 'Unread' && unreadCount()) { <span class="count">{{ unreadCount() }}</span> }
          </button>
        }
      </div>

      <div class="split">
        <section class="card list">
          <div class="card-body tight">
            @if (loading()) { <p class="spinner">Loading…</p> }
            @else if (rows().length === 0) {
              <p class="muted small pad">Nothing here.</p>
            }
            @for (i of rows(); track i._id) {
              <button class="row" [class.on]="selected()?._id === i._id"
                      [class.unread]="i.status === 'Unread'" (click)="open(i)">
                <div>
                  <strong>{{ i.sender_name }}</strong>
                  <span class="small muted">{{ i.subject || 'No subject' }}</span>
                </div>
                <span class="when small muted">{{ i.date_submitted | date: 'MMM d' }}</span>
              </button>
            }
          </div>
        </section>

        <section class="card detail">
          @if (selected(); as i) {
            <div class="card-head">
              <div>
                <h3>{{ i.subject || 'No subject' }}</h3>
                <p class="small muted">From {{ i.sender_name }} ·
                  {{ i.date_submitted | date: 'MMMM d, y · h:mm a' }}</p>
              </div>
              <span class="badge"
                    [class.badge-warn]="i.status === 'Unread'"
                    [class.badge-ok]="i.status === 'Responded'">{{ i.status }}</span>
            </div>
            <div class="card-body">
              <dl>
                <dt>Reply to</dt>
                <dd>
                  @if (isEmail(i.contact_info)) {
                    <a [href]="'mailto:' + i.contact_info">{{ i.contact_info }}</a>
                  } @else {
                    {{ i.contact_info }}
                  }
                </dd>
              </dl>
              <p class="message">{{ i.message }}</p>
              <div class="actions">
                @if (i.status !== 'Responded') {
                  <button class="btn btn-primary" [disabled]="busy()" (click)="mark(i, 'Responded')">
                    Mark as Responded</button>
                }
                @if (i.status === 'Responded') {
                  <button class="btn btn-secondary" [disabled]="busy()" (click)="mark(i, 'Read')">
                    Reopen</button>
                }
              </div>
              <p class="small muted">The system does not send the reply — staff answer by email or
                 phone, and this screen records that it was handled.</p>
            </div>
          } @else {
            <div class="card-body"><p class="muted small">Select a message to read it.</p></div>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .head { background: #fff; border-bottom: 1px solid var(--line); padding: 20px 32px; }
    .head h1 { font-size: 26px; margin-bottom: 2px; }
    .head p { margin: 0; max-width: 75ch; }
    .body { padding: 22px 32px 40px; }
    .tabs { display: flex; gap: 8px; margin-bottom: 18px; }
    .tab { display: flex; align-items: center; gap: 7px; padding: 7px 16px; border-radius: 999px;
           border: 1px solid var(--line-strong); background: #fff; font: inherit; font-size: 13px;
           font-weight: 600; color: var(--ink-soft); cursor: pointer; }
    .tab.on { background: var(--brand); border-color: var(--brand); color: #fff; }
    .count { background: var(--brand-bright); color: #fff; font-size: 11px; border-radius: 999px;
             padding: 1px 7px; }
    .tab.on .count { background: rgba(255,255,255,.25); }
    .split { display: grid; grid-template-columns: 320px 1fr; gap: 20px; align-items: start; }
    .card-body.tight { padding: 0; }
    .pad { padding: 16px 18px; }
    .row { display: flex; width: 100%; text-align: left; align-items: center;
           justify-content: space-between; gap: 10px; padding: 12px 18px; background: #fff;
           border: 0; border-bottom: 1px solid var(--line); font: inherit; cursor: pointer; }
    .row:last-child { border-bottom: 0; }
    .row:hover { background: var(--paper); }
    .row.on { background: var(--brand-pale); }
    .row.unread strong { color: var(--brand); }
    .row.unread { box-shadow: inset 3px 0 0 var(--brand-bright); }
    .row > div { min-width: 0; }
    .row strong { display: block; font-size: 13px; }
    .row span.small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .when { flex-shrink: 0; }
    .card-head h3 { font-family: var(--serif); font-size: 19px; margin: 0 0 2px; }
    .card-head p { margin: 0; }
    dl { display: grid; grid-template-columns: 110px 1fr; gap: 8px 14px; margin: 0 0 16px; }
    dt { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted);
         padding-top: 2px; }
    dd { margin: 0; font-size: 14px; }
    .message { background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius);
               padding: 16px 18px; font-size: 14px; color: var(--ink-soft); white-space: pre-wrap;
               margin: 0 0 16px; }
    .actions { display: flex; gap: 10px; margin-bottom: 10px; }
    @media (max-width: 1000px) {
      .head, .body { padding-left: 18px; padding-right: 18px; }
      .split { grid-template-columns: 1fr; }
      dl { grid-template-columns: 1fr; gap: 2px 0; }
    }
  `],
})
export class InquiriesComponent implements OnInit {
  private api = inject(ApiService);

  statuses = ['Unread', 'Read', 'Responded', ''];
  status = signal<string>('Unread');
  rows = signal<ContactInquiry[]>([]);
  selected = signal<ContactInquiry | null>(null);
  unreadCount = signal(0);
  loading = signal(true); busy = signal(false);
  flash = signal(''); error = signal('');

  ngOnInit(): void { this.load(); this.countUnread(); }

  pick(s: string): void { this.status.set(s); this.selected.set(null); this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.inquiries({ status: this.status() }).subscribe({
      next: l => { this.rows.set(l); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message || 'Could not load messages.'); this.loading.set(false); },
    });
  }

  countUnread(): void {
    this.api.inquiries({ status: 'Unread' })
      .subscribe({ next: l => this.unreadCount.set(l.length), error: () => {} });
  }

  isEmail(contact: string): boolean { return /@/.test(contact || ''); }

  /**
   * Keep the message we already have and lay the server's fields over it, so a
   * thin or unexpected response can never blank the open message.
   */
  private merge(current: ContactInquiry, res: ContactInquiry | null): ContactInquiry {
    return res && res._id ? { ...current, ...res } : current;
  }

  /** Opening an unread message marks it read, the way a mail client would. */
  open(i: ContactInquiry): void {
    this.selected.set(i);
    this.flash.set(''); this.error.set('');
    if (i.status === 'Unread') {
      this.api.updateInquiry(i._id, { status: 'Read' }).subscribe({
        next: res => {
          const updated = this.merge(i, res);
          this.selected.set(updated);
          this.rows.update(rs => rs.map(r => r._id === i._id ? updated : r));
          this.countUnread();
        },
        error: () => {},
      });
    }
  }

  mark(i: ContactInquiry, status: 'Read' | 'Responded'): void {
    this.busy.set(true); this.error.set('');
    this.api.updateInquiry(i._id, { status }).subscribe({
      next: res => {
        this.selected.set(this.merge(i, res));
        this.flash.set(status === 'Responded'
          ? `Marked as responded — ${i.sender_name}.`
          : 'Reopened.');
        this.busy.set(false);
        this.load();
        this.countUnread();
      },
      error: err => { this.error.set(err?.error?.message || 'Could not update.'); this.busy.set(false); },
    });
  }
}
