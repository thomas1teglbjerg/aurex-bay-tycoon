// Online tycoons drive around the city map: one pin per online player moves along the road network (ROADNET in
// content.js) from one of their companies (or their home) to the next, parks a few seconds and drives on.
// Client-only. The route is worked out from the player id and the clock, so every screen shows about the same.
import * as E from '../supabase/functions/_shared/engine.js';
import { ROADNET, HOMES, placeOn } from '../supabase/functions/_shared/content.js';
import { esc, lname } from './util.js';

const SPEED = 26, PARK = 7, HOUR = 3600 * 1000; // map pixels a second, seconds parked at each stop
const N = ROADNET.nodes, ADJ = {};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
ROADNET.edges.forEach(([a, b]) => { const d = dist(N[a], N[b]); (ADJ[a] = ADJ[a] || []).push([b, d]); (ADJ[b] = ADJ[b] || []).push([a, d]); });
const nearest = (pt) => Object.keys(N).reduce((best, k) => (dist(N[k], pt) < dist(N[best], pt) ? k : best), 's0');
// the shortest way between two road points (Dijkstra; the network is small)
const PATHS = {};
function path(a, b) {
  const key = a + '>' + b; if (PATHS[key]) return PATHS[key];
  const d = { [a]: 0 }, prev = {}, todo = new Set(Object.keys(N));
  while (todo.size) {
    let u = null; todo.forEach((k) => { if (d[k] != null && (u == null || d[k] < d[u])) u = k; }); if (u == null || u === b) break;
    todo.delete(u); (ADJ[u] || []).forEach(([v, w]) => { if (todo.has(v) && (d[v] == null || d[u] + w < d[v])) { d[v] = d[u] + w; prev[v] = u; } });
  }
  const out = [b]; let k = b; while (k !== a && prev[k]) { k = prev[k]; out.unshift(k); }
  return (PATHS[key] = out[0] === a ? out.map((x) => N[x]) : [N[a], N[b]]);
}
// a leg from one stop to the next: a short drive to the road, the road, a short drive to the door
function leg(from, to) {
  const pts = [from, ...path(nearest(from), nearest(to)), to], cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  return { pts, cum, len: cum[cum.length - 1] };
}
function at(lg, s) {
  const i = Math.max(1, lg.cum.findIndex((c) => c >= s)), a = lg.pts[i - 1], b = lg.pts[i] || a, seg = (lg.cum[i] - lg.cum[i - 1]) || 1, f = Math.min(1, Math.max(0, (s - lg.cum[i - 1]) / seg));
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, dir: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}
const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// where a tycoon can drive: their companies (own, coop or holding), their home; at least two stops
export function stops(c, pid) {
  const p = c.players[pid]; if (!p) return [];
  const mine = c.listings.filter((l) => l.owner && (l.owner.k === 'p' ? l.owner.id === pid : !!(c.holdings[l.owner.id] && c.holdings[l.owner.id].members && c.holdings[l.owner.id].members[pid])));
  const out = mine.map((l) => ({ pt: [l.x, l.y], name: lname(l), lid: l.id }));
  const res = p.life && p.life.homes && p.life.homes.find((h) => h.uid === p.life.res), hd = res && HOMES.find((h) => h.id === res.hid);
  if (hd) { const q = placeOn(hd.d, hd.p); out.push({ pt: [q.x, q.y], home: hd.name }); }
  if (out.length < 2) { const r = rng(hash(pid)), ks = Object.keys(N); while (out.length < 2) { const k = ks[Math.floor(r() * ks.length)]; out.push({ pt: N[k], road: true }); } }
  return out;
}
// where a tycoon's car is right now (deterministic: the hour's legs are replayed from the top of the hour)
export function position(c, pid, now = Date.now()) {
  const st = stops(c, pid); if (st.length < 2) return null;
  const t0 = Math.floor(now / HOUR) * HOUR, r = rng(hash(pid + ':' + t0)); let t = (now - t0) / 1000, i = Math.floor(r() * st.length);
  for (let n = 0; n < 400; n++) {
    let j = Math.floor(r() * (st.length - 1)); if (j >= i) j++;
    const lg = leg(st[i].pt, st[j].pt), drive = lg.len / SPEED;
    if (t < PARK) return { x: st[i].pt[0], y: st[i].pt[1], dir: 0, parked: true, at: st[i], to: st[j] };
    t -= PARK; if (t < drive) { const q = at(lg, t * SPEED); return { ...q, parked: false, at: st[i], to: st[j] }; }
    t -= drive; i = j;
  }
  return { x: st[i].pt[0], y: st[i].pt[1], dir: 0, parked: true, at: st[i], to: st[i] };
}
// the pins, as HTML for the city map's #drivers layer
export function pinsHTML(c, online, me) {
  return online.filter((o) => c.players[o.id] && !c.players[o.id].bot && !c.players[o.id].admin).map((o) => {
    const q = position(c, o.id); if (!q) return '';
    const b = E.BR.brandOf(c, o.id), col = b ? E.BR.colorHex(b.color) : (c.players[o.id].color || '#55657d');
    return `<button class="mp drv${o.id === me ? ' mine' : ''}${o.idle ? ' idle' : ''}" data-mk="d:${o.id}" data-pid="${o.id}" style="left:${q.x.toFixed(1)}px;top:${q.y.toFixed(1)}px;--c:${col}" aria-label="${esc(c.players[o.id].name)} is driving"><svg viewBox="0 0 24 24" width="15" height="15" fill="#fff" aria-hidden="true"><path d="M5 17v-4l2.2-5.2A1.5 1.5 0 0 1 8.6 7h6.8a1.5 1.5 0 0 1 1.4.8L19 13v4h-1.5a2 2 0 0 1-4 0h-3a2 2 0 0 1-4 0zM7.3 12h9.4l-1.4-3.4H8.7z"/></svg></button>`;
  }).join('');
}
// move the pins that are already on the map (no rebuild, so hover and clicks keep working)
export function movePins(c, box) {
  box.querySelectorAll('.drv').forEach((el) => { const q = position(c, el.dataset.pid); if (!q) return; el.style.left = q.x.toFixed(1) + 'px'; el.style.top = q.y.toFixed(1) + 'px'; el.classList.toggle('parked', q.parked); });
}
