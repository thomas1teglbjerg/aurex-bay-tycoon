// Shared helpers for the UI modules
import * as E from '../supabase/functions/_shared/engine.js';
import { CONFIG as GC, MAP, DISTRICT, TYPES } from '../supabase/functions/_shared/content.js';
// a company's display name: its own title when it has one, else its type
export const lname = (l) => l.title || TYPES[l.type].name;

export const S = { B: null };
export const city = () => S.B.city;
export const meId = () => S.B.me;
export const me = () => (S.B.me ? S.B.city.players[S.B.me] : null);
export const now = () => Date.now();
export const $ = (id) => document.getElementById(id);
// amounts below a million read as thousands everywhere text is shown ("0.26 M" -> "260 k")
export const kfix = (t) => String(t ?? '').replace(/(^|[^\d.])(\d*\.\d+) M\b/g, (m, pre, n) => (+n < 1 && +n > 0 ? `${pre}${Math.round(+n * 1000)} k` : m));
export const esc = (s) => kfix(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function M(v, sign) {
  const a = Math.abs(v);
  // under a million: show thousands
  if (a < 0.9995) { const k = Math.round(a * 1000); if (!k) return '0'; return (v < 0 ? '−' : sign && v > 0 ? '+' : '') + k + ' k'; }
  let s = a >= 100 ? a.toFixed(0) : a >= 10 ? a.toFixed(1) : a.toFixed(2);
  s = s.replace(/\.?0+$/, '') || '0';
  return (v < -0.0049 ? '−' : sign && v > 0.0049 ? '+' : '') + s + ' M';
}
export const K = (v) => (v * 1000).toFixed(v * 1000 >= 10 ? 1 : 2) + ' k'; // unit prices of supplies, in thousands
export const P = (v, sign = true) => (v < 0 ? '−' : sign && v > 0 ? '+' : '') + Math.abs(v).toFixed(1) + '%';
export const dollars = (v) => (v < 0 ? '−$' : '$') + Math.floor(Math.abs(v) * 1e6).toLocaleString('en-US');
export const N = (v) => Math.round(v).toLocaleString('en-US');
export function msUntilMonth(targetM) { const c = city(); return Math.max(0, (targetM / 12 - E.gameNow(c, now())) * GC.YEAR_MS / c.clock.speed); }
export function dur(ms) {
  const s = Math.ceil(ms / 1000); if (s < 60) return s + ' s';
  const m = Math.floor(s / 60); if (m < 60) return m + ' min';
  const h = Math.floor(m / 60); if (h < 48) return h + ' h ' + (m % 60) + ' min';
  return Math.floor(h / 24) + ' d ' + (h % 24) + ' h';
}
export const dateLabel = (m) => `Year ${Math.floor(m / 12) + 1} · ${E.monthName(m)}`;
export const shortDate = (m) => `${E.monthName(m).slice(0, 3)} Y${Math.floor(m / 12) + 1}`;
export const ICON = {
  coin: '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="17" rx="8" ry="3" fill="#a87a1c"/><rect x="4" y="11" width="16" height="6" fill="#c99a33"/><ellipse cx="12" cy="11" rx="8" ry="3" fill="#f2cf6e"/><ellipse cx="12" cy="11" rx="5" ry="1.6" fill="#d9ad45"/></svg>',
  trade: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#5b6b82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h13l-3-3M20 15H7l3 3"/></svg>',
  bag: '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l-1.5 3h-3z" fill="#a87a1c"/><path d="M6 20c-2-1-2-4-1-6 1.5-3 4-6 7-6s5.5 3 7 6c1 2 1 5-1 6z" fill="#e2b34d"/><text x="12" y="17.5" text-anchor="middle" font-size="7" font-weight="700" fill="#5a3d00" font-family="sans-serif">$</text></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1b2b44" stroke-width="2.4"><path d="M6 6l12 12M18 6 6 18"/></svg>'
};
// line icons for departments (stroke = currentColor)
export const DEPT_ICON = {
  ops: '<path d="M3 21V10l5 3V10l5 3V6l8 4v11z"/><path d="M7 17h2M12 17h2M17 17h2"/>',
  procurement: '<path d="M3 7h11v10H3zM14 10h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  sales: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  social: '<path d="M4 11v2a1 1 0 0 0 1 1h2l5 4V6L7 10H5a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  hr: '<circle cx="9" cy="8" r="3.3"/><path d="M2.5 20c.6-4 3.3-6 6.5-6s5.9 2 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.3c2.8.2 4.9 2 5.5 5.7"/>',
  finance: '<path d="M12 3v18M17 7.5c-.7-1.6-2.6-2.5-5-2.5-2.8 0-4.5 1.3-4.5 3.2 0 4.6 10 2.4 10 7 0 2-1.9 3.3-5 3.3-2.6 0-4.6-1-5.3-2.8"/>',
  rnd: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7.5 15h9"/>',
  legal: '<path d="M12 3v18M5 7h14M7 7l-3 7a3.5 3.5 0 0 0 6 0zM17 7l-3 7a3.5 3.5 0 0 0 6 0zM8 21h8"/>'
};
export const deptIcon = (id, size = 22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${DEPT_ICON[id]}</svg>`;

export function spark(arr, w, h) {
  if (!arr || arr.length < 2) return '';
  const mn = Math.min(...arr), mx = Math.max(...arr), r = mx - mn || 1;
  const pts = arr.map((v, i) => `${(i / (arr.length - 1) * w).toFixed(1)},${(h - 3 - (v - mn) / r * (h - 6)).toFixed(1)}`).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${arr[arr.length - 1] >= arr[0] ? 'var(--good)' : 'var(--bad)'}" stroke-width="2" stroke-linejoin="round"/></svg>`;
}
// multi-series line chart drawn to one scale; series: [{v:[...], c:color, w, fill}], labels: x labels (same length)
export function lineChart(series, labels, opts = {}) {
  const W = 640, H = opts.h || 200, pl = 46, pr = 10, pt = 12, pb = 24;
  const all = series.flatMap((s) => s.v).filter(Number.isFinite); if (all.length < 2) return '<p class="empty">The chart fills in as months pass.</p>';
  let mn = Math.min(...all), mx = Math.max(...all); if (opts.zero) mn = Math.min(0, mn); if (mx - mn < 1e-6) { mx += 1; mn -= 1; }
  const pad = (mx - mn) * 0.08; mx += pad; if (!opts.zero) mn -= pad;
  const n = Math.max(...series.map((s) => s.v.length)), x = (i) => pl + (n > 1 ? i / (n - 1) : 0) * (W - pl - pr), y = (v) => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);
  const ticks = [0, 1, 2, 3].map((i) => mn + (mx - mn) * i / 3), fmt = opts.fmt || ((v) => v.toFixed(1));
  const step = Math.max(1, Math.ceil(n / 6));
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(opts.label || 'Chart')}" style="display:block">
    ${ticks.map((t) => `<line x1="${pl}" x2="${W - pr}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" stroke="var(--line)"/><text x="${pl - 6}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--ink-2)">${esc(fmt(t))}</text>`).join('')}
    ${labels.map((l, i) => (i % step === 0 || i === labels.length - 1) ? `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--ink-2)">${esc(l)}</text>` : '').join('')}
    ${series.map((s) => { const pts = s.v.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`); return `${s.fill ? `<polygon points="${x(0)},${y(mn)} ${pts.join(' ')} ${x(s.v.length - 1)},${y(mn)}" fill="${s.c}" opacity="0.1"/>` : ''}<polyline points="${pts.join(' ')}" fill="none" stroke="${s.c}" stroke-width="${s.w || 2}" ${s.dash ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round"/><circle cx="${x(s.v.length - 1).toFixed(1)}" cy="${y(s.v[s.v.length - 1]).toFixed(1)}" r="3.5" fill="${s.c}"/>`; }).join('')}
  </svg>`;
}
// grouped monthly bars: rows [{label, a, b}] (a = revenue, b = costs)
export function barChart(rows, opts = {}) {
  if (!rows.length) return '<p class="empty">The first monthly report arrives at the end of this game month.</p>';
  const W = 640, H = 180, pl = 46, pb = 24, pt = 10, mx = Math.max(0.01, ...rows.flatMap((r) => [r.a, r.b])), bw = (W - pl - 10) / rows.length;
  const y = (v) => pt + (1 - v / mx) * (H - pt - pb);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(opts.label || 'Monthly revenue and costs')}" style="display:block">
    ${[0, 0.5, 1].map((t) => `<line x1="${pl}" x2="${W - 10}" y1="${y(mx * t)}" y2="${y(mx * t)}" stroke="var(--line)"/><text x="${pl - 6}" y="${y(mx * t) + 4}" text-anchor="end" font-size="11" fill="var(--ink-2)">${M(mx * t).replace(' M', '')}</text>`).join('')}
    ${rows.map((r, i) => { const x0 = pl + i * bw; return `<rect x="${(x0 + bw * 0.12).toFixed(1)}" y="${y(r.a).toFixed(1)}" width="${(bw * 0.36).toFixed(1)}" height="${(H - pb - y(r.a)).toFixed(1)}" fill="var(--good)" rx="2"/><rect x="${(x0 + bw * 0.52).toFixed(1)}" y="${y(r.b).toFixed(1)}" width="${(bw * 0.36).toFixed(1)}" height="${(H - pb - y(r.b)).toFixed(1)}" fill="#d48a7f" rx="2"/>${i % Math.max(1, Math.ceil(rows.length / 6)) === 0 ? `<text x="${(x0 + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--ink-2)">${esc(r.label)}</text>` : ''}`; }).join('')}
  </svg>`;
}
export function seg(action, attrs, opts, cur) {
  return `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-a="${action}" ${attrs} data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${esc(l)}</button>`).join('')}</div>`;
}

// a zoomed picture of a place: from its district's own image, or from the city map for districts without one.
// o = anything with d (district id) and p ([x, y] within the district view). ar = the box's width / height.
export function cropLayer(o, zoom = 2.5, ar = 2.4) {
  const d = DISTRICT[o.d]; if (!d) return { img: `url(${MAP.img})`, size: 'cover', pos: 'center' };
  let img, W, H, fx, fy, Z;
  if (d.img) { img = d.img; W = d.w; H = d.h; fx = o.p[0]; fy = o.p[1]; Z = zoom; }
  else { img = MAP.img; W = MAP.w; H = MAP.h; fx = (d.box.x + o.p[0] * d.box.w) / W; fy = (d.box.y + o.p[1] * d.box.h) / H; Z = zoom * W / d.box.w; }
  const ih = Z * ar * H / W, cl = (v) => Math.max(0, Math.min(100, v * 100));
  const X = Z === 1 ? 0.5 : (0.5 - fx * Z) / (1 - Z), Y = ih === 1 ? 0.5 : (0.5 - fy * ih) / (1 - ih);
  return { img: `url(${img})`, size: `${(Z * 100).toFixed(1)}% auto`, pos: `${cl(X).toFixed(1)}% ${cl(Y).toFixed(1)}%` };
}
export function cropStyle(o, zoom, ar) { const c = cropLayer(o, zoom, ar); return `background-image:${c.img};background-size:${c.size};background-position:${c.pos};background-repeat:no-repeat`; }
