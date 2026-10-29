import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { Distribution, InventoryLevel, TrendPoint } from '../core/models';

interface Bar { x: number; y: number; w: number; h: number; label: string; value: string; }
interface Tick { y: number; label: string; }
interface Chart { bars: Bar[]; ticks: Tick[]; empty: boolean; }

/**
 * FR-14 — the charts the panel moved off the dashboard onto a page of their own.
 * Drawn as inline SVG so the figures in the manuscript match what the system
 * renders, with no charting library to pin a version of.
 *
 * Pesos and item counts are two different units, so each gets its own axis
 * rather than being forced onto one scale where the smaller series reads as a
 * flat line.
 */
@Component({
  selector: 'bp-graphical-reports', standalone: true, imports: [CommonModule],
  template: `
    <div class="head">
      <div>
        <h1>Graphical Reports</h1>
        <p class="muted small">Donation trends, volunteer distribution and inventory levels, drawn
           from the records as they stand now.</p>
      </div>
    </div>

    <div class="body">
      @if (error()) { <div class="notice notice-error">{{ error() }}</div> }

      <div class="two">
        <section class="card">
          <div class="card-head">
            <h3>Monetary donations</h3>
            <span class="unit">Pesos received, last 12 months</span>
          </div>
          <div class="card-body">
            @if (monetary().empty) { <p class="muted small">No monetary donations recorded yet.</p> }
            @else {
              <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="chart" role="img"
                   aria-label="Bar chart of monetary donations by month">
                @for (t of monetary().ticks; track t.label) {
                  <line [attr.x1]="PAD_L" [attr.x2]="W - PAD_R" [attr.y1]="t.y" [attr.y2]="t.y"
                        stroke="#E7E0DE" stroke-width="1"></line>
                  <text [attr.x]="PAD_L - 8" [attr.y]="t.y + 4" text-anchor="end" class="tick">{{ t.label }}</text>
                }
                @for (b of monetary().bars; track b.label) {
                  <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h"
                        rx="2" fill="#96122A"><title>{{ b.label }}: {{ b.value }}</title></rect>
                  <text [attr.x]="b.x + b.w / 2" [attr.y]="H - 10" text-anchor="middle"
                        class="tick">{{ b.label }}</text>
                }
                <line [attr.x1]="PAD_L" [attr.x2]="W - PAD_R" [attr.y1]="H - PAD_B" [attr.y2]="H - PAD_B"
                      stroke="#CFC6C3" stroke-width="1"></line>
              </svg>
            }
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h3>In-kind donations</h3>
            <span class="unit">Items received, last 12 months</span>
          </div>
          <div class="card-body">
            @if (inkind().empty) { <p class="muted small">No in-kind donations recorded yet.</p> }
            @else {
              <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="chart" role="img"
                   aria-label="Bar chart of in-kind donations by month">
                @for (t of inkind().ticks; track t.label) {
                  <line [attr.x1]="PAD_L" [attr.x2]="W - PAD_R" [attr.y1]="t.y" [attr.y2]="t.y"
                        stroke="#E7E0DE" stroke-width="1"></line>
                  <text [attr.x]="PAD_L - 8" [attr.y]="t.y + 4" text-anchor="end" class="tick">{{ t.label }}</text>
                }
                @for (b of inkind().bars; track b.label) {
                  <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h"
                        rx="2" fill="#C9A227"><title>{{ b.label }}: {{ b.value }}</title></rect>
                  <text [attr.x]="b.x + b.w / 2" [attr.y]="H - 10" text-anchor="middle"
                        class="tick">{{ b.label }}</text>
                }
                <line [attr.x1]="PAD_L" [attr.x2]="W - PAD_R" [attr.y1]="H - PAD_B" [attr.y2]="H - PAD_B"
                      stroke="#CFC6C3" stroke-width="1"></line>
              </svg>
            }
          </div>
        </section>
      </div>

      <div class="two">
        <section class="card">
          <div class="card-head"><h3>Volunteers by area of service</h3></div>
          <div class="card-body">
            @if (!dist() || dist()!.total === 0) { <p class="muted small">No approved volunteers yet.</p> }
            @else {
              @for (a of dist()!.areas; track a.area) {
                <div class="hbar">
                  <span class="hlabel">{{ a.area }}</span>
                  <span class="track"><i [style.width.%]="a.percent"></i></span>
                  <span class="hval">{{ a.count }} <em>({{ a.percent }}%)</em></span>
                </div>
              }
              <p class="small muted cap">{{ dist()!.total }} approved volunteers in total.</p>
            }
          </div>
        </section>

        <section class="card">
          <div class="card-head"><h3>Inventory levels against target</h3></div>
          <div class="card-body">
            @if (levels().length === 0) { <p class="muted small">No wishlist items yet.</p> }
            @else {
              @for (l of levels(); track l.item_name) {
                <div class="hbar">
                  <span class="hlabel">{{ l.item_name }}</span>
                  <span class="track">
                    <i [style.width.%]="pct(l)" [class.low]="l.below_threshold"></i>
                  </span>
                  <span class="hval">{{ l.in_stock }}<em>/{{ l.target_quantity }} {{ l.unit }}</em></span>
                </div>
              }
              <p class="small muted cap">A bar in red is at or below its minimum threshold and appears
                 on the public wishlist as still needed.</p>
            }
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .head { background: #fff; border-bottom: 1px solid var(--line); padding: 20px 32px; }
    .head h1 { font-size: 26px; margin-bottom: 2px; }
    .head p { margin: 0; max-width: 75ch; }
    .body { padding: 22px 32px 40px; }
    .card-head { align-items: baseline; }
    .card-head h3 { font-family: var(--serif); font-size: 18px; margin: 0; }
    .unit { font-size: 12px; color: var(--muted); }
    .chart { width: 100%; height: auto; display: block; }
    .tick { font-size: 11px; fill: #6F6462; font-family: var(--sans); }
    .cap { margin: 10px 0 0; max-width: 80ch; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start;
           margin-bottom: 18px; }
    .hbar { display: grid; grid-template-columns: 150px 1fr 110px; gap: 12px; align-items: center;
            margin-bottom: 10px; }
    .hlabel { font-size: 13px; color: var(--ink); }
    .track { background: var(--paper); border: 1px solid var(--line); border-radius: 999px;
             height: 14px; overflow: hidden; }
    .track i { display: block; height: 100%; background: #96122A; border-radius: 999px; }
    .track i.low { background: #C81E3A; }
    .hval { font-size: 12px; color: var(--ink-soft); text-align: right; font-variant-numeric: tabular-nums; }
    .hval em { font-style: normal; color: var(--muted); }
    @media (max-width: 1000px) {
      .head, .body { padding-left: 18px; padding-right: 18px; }
      .two { grid-template-columns: 1fr; }
      .hbar { grid-template-columns: 110px 1fr 90px; }
    }
  `],
})
export class GraphicalReportsComponent implements OnInit {
  private api = inject(ApiService);

  readonly W = 620; readonly H = 260;
  readonly PAD_L = 58; readonly PAD_R = 12; readonly PAD_T = 14; readonly PAD_B = 32;

  trend = signal<TrendPoint[]>([]);
  dist = signal<Distribution | null>(null);
  levels = signal<InventoryLevel[]>([]);
  error = signal('');

  monetary = computed(() => this.build(t => t.monetary, v => '₱' + v.toLocaleString('en-PH')));
  inkind = computed(() => this.build(t => t.inkind, v => v + (v === 1 ? ' item' : ' items')));

  /** One series, scaled to its own axis. */
  private build(pick: (t: TrendPoint) => number, fmt: (v: number) => string): Chart {
    const rows = this.trend();
    const values = rows.map(pick);
    const peak = Math.max(0, ...values);
    if (!rows.length || peak === 0) return { bars: [], ticks: [], empty: true };

    const top = this.niceMax(peak);
    const plotW = this.W - this.PAD_L - this.PAD_R;
    const plotH = this.H - this.PAD_T - this.PAD_B;
    const slot = plotW / rows.length;
    const bw = Math.min(26, slot * 0.56);
    const base = this.PAD_T + plotH;

    const bars: Bar[] = rows.map((t, i) => {
      const v = pick(t);
      const h = (v / top) * plotH;
      return {
        x: this.PAD_L + slot * i + (slot - bw) / 2,
        y: base - h,
        w: bw,
        h: v > 0 ? Math.max(h, 2) : 0,
        label: t.month,
        value: fmt(v),
      };
    });

    const ticks: Tick[] = [0, 0.25, 0.5, 0.75, 1].map(f => ({
      y: this.PAD_T + plotH * (1 - f),
      label: this.short(top * f),
    }));

    return { bars, ticks, empty: false };
  }

  /**
   * Pick an axis top that divides into four readable gridlines — the step is
   * rounded up first, so the labels land on round numbers rather than on
   * quarters of the tallest bar.
   */
  private niceMax(peak: number): number {
    const raw = peak / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const s of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
      if (s * mag >= raw) return s * mag * 4;
    }
    return mag * 40;
  }

  private short(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return String(Math.round(n));
  }

  pct(l: InventoryLevel): number {
    if (!l.target_quantity) return 0;
    return Math.min(100, Math.round((l.in_stock / l.target_quantity) * 100));
  }

  ngOnInit(): void {
    this.api.donationTrends(12).subscribe({
      next: t => this.trend.set(t),
      error: err => this.error.set(err?.error?.message || 'Could not load the reports.'),
    });
    this.api.volunteerDistribution().subscribe({ next: d => this.dist.set(d), error: () => {} });
    this.api.inventoryLevels().subscribe({ next: l => this.levels.set(l), error: () => {} });
  }
}
