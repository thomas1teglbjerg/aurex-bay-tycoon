// Freight: carrier pickers, delivery tracking and the freight website (all three carriers on aurexfreight.ab).
import * as E from '../supabase/functions/_shared/engine.js';
import { CARRIERS, GOODS, TYPES, CONFIG as GC } from '../supabase/functions/_shared/content.js';
import { city, me, esc, N, dur, shortDate } from './util.js';
import { money as M } from './life.js';

const L = E.LOG;
const CI = { air: '<path d="M2 16l20-6-20-6 4 6-4 6z"/>', road: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>', sea: '<path d="M3 17l2 3h14l2-3zM6 17V9h12v8M9 9V5h6v4"/>' };
export const cicon = (c, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true">${CI[c.mode]}</svg>`;
const msFor = (dg) => Math.max(0, dg * GC.YEAR_MS / city().clock.speed);
const daysTxt = (a, b) => (a === b ? `${a}d` : `${a}–${b}d`);

// a row of three carrier buttons; each shows price and time for the cargo in question
export function carrierPicker(action, attrs, cur, quoteFor) {
  return `<div class="carriers" role="group" aria-label="Carrier">${CARRIERS.map((c) => { const q = quoteFor ? quoteFor(c.id) : null;
    return `<button class="carrier" data-a="${action}" ${attrs} data-v="${c.id}" aria-pressed="${cur === c.id}" style="--cc:${c.color}"><span class="cn">${cicon(c, 14)} ${esc(c.short)}</span>${q ? `<span class="cq">${M(q.freight)} · ${daysTxt(q.minDays, q.maxDays)}${q.partner ? ' ★' : ''}</span>` : ''}</button>`; }).join('')}</div>`;
}
export function shipStatus(s, g) {
  const st = L.status(s, g), cls = st === 'Delayed' ? 'bad' : st === 'Picked up' ? 'info' : 'good';
  return `<span class="chip ${cls}">${st}</span>`;
}
function dest(c, s) { if (s.to.k === 'export') return 'Export buyer'; if (s.to.k === 'w') return L.SITE[s.to.id].name; const l = E.listing(c, s.to.id); return l ? TYPES[l.type].name : 'Company'; }
export function shipRow(s, g) {
  const c = city(), cr = s.carrier ? L.CARRIER[s.carrier] : null, k = Math.max(0, Math.min(1, (g - s.departG) / Math.max(1e-9, s.arriveG - s.departG)));
  const eta = s.etaG ?? s.arriveG, late = g > eta;
  return `<div class="shrow"><span class="shic" style="--cc:${cr ? cr.color : '#5b6b82'}">${cr ? cicon(cr, 18) : cicon({ mode: 'road' }, 18)}</span><div class="grow"><b>${N(s.qty)} ${esc(GOODS[s.g].unit)} ${esc(GOODS[s.g].name.toLowerCase())} → ${esc(dest(c, s))}</b>
    <span>${cr ? esc(cr.short) : 'Own truck'}${s.freight ? ` · freight ${M(s.freight)}` : ''}${s.to.k === 'export' ? ` · pays ${M(s.pay)}` : ''}</span><div class="bar"><i style="width:${(k * 100).toFixed(0)}%;background:${cr ? cr.color : '#5b6b82'}"></i></div></div>
    <div class="right">${shipStatus(s, g)}<span>${late ? 'was due' : 'ETA'} ${late ? `${Math.round((g - eta) * 365)} d ago` : dur(msFor(eta - g))}</span></div></div>`;
}
// Company page: no tracking here, only a link to each carrier's own tracking page.
// Carriers moving this company's cargo come first and show how many shipments they carry.
export function deliveriesBox(lid) {
  const c = city(), p = me(), mine = L.myShipments(c, p.id).filter((s) => (s.to.k === 'l' && s.to.id === lid) || (s.from.k === 'l' && s.from.id === lid));
  const n = (cr) => mine.filter((s) => s.carrier === cr.id).length, used = CARRIERS.filter((cr) => n(cr));
  return `<div class="box" id="deliveries-box"><h2>Deliveries<small>${mine.length ? `${mine.length} ON THE WAY` : 'NOTHING ON THE WAY'}</small></h2><div class="in">
    <div class="btns">${(used.length ? used : CARRIERS).map((cr) => `<button class="btn sm" data-a="web" data-u="${FREIGHT_HOST}/${cr.id}/track" style="border-color:${cr.color}">${cicon(cr, 14)} Tracking: ${esc(cr.short)}${n(cr) ? ` (${n(cr)})` : ''}</button>`).join('')}</div></div></div>`;
}

// ---------------------------------------------------------------- the freight website: one site for all three carriers
export const FREIGHT_HOST = 'aurexfreight.ab';
// old carrier addresses (ridgeway.ab/track …) land on the carrier's page on the freight site
export function freightAlias(u) { const cr = CARRIERS.find((x) => x.host === u.host); return cr ? [FREIGHT_HOST, cr.id, ...u.path].join('/') : null; }
const onTimeOf = (p, cr) => { const done = (p.deliv || []).filter((d) => d.carrier === cr.id); return done.length ? Math.round(done.filter((d) => !d.late).length / done.length * 100) : Math.round((1 - cr.delay) * 100); };
export function freightSite(u, go) {
  const c = city(), p = me(), g = E.gameNow(c, Date.now()), all = L.myShipments(c, p.id).filter((s) => s.carrier);
  const cr = CARRIERS.find((x) => x.id === u.path[0]), sub = cr ? u.path[1] || '' : '';
  const nav = `<div class="cr-head">${go(FREIGHT_HOST, '<b>Aurex Freight</b>', 'cr-logo')}<nav>${go(FREIGHT_HOST, 'Compare', !u.path[0] ? 'on' : '')}${CARRIERS.map((x) => go(`${FREIGHT_HOST}/${x.id}`, `${cicon(x, 15)} ${esc(x.short)}`, cr === x ? 'on' : '')).join('')}${go(FREIGHT_HOST + '/track', `Track${all.length ? ` (${all.length})` : ''}`, u.path[0] === 'track' ? 'on' : '')}</nav></div>`;
  if (cr) return nav + `<div style="--cc:${cr.color}">${carrierPage(cr, sub, go)}</div>`;
  if (u.path[0] === 'track') return nav + `<div class="cr-body"><h2>Your shipments</h2>${all.length ? `<div class="rows">${all.map((s) => shipRow(s, g)).join('')}</div>` : '<p>Nothing on the way. Pick a carrier when you buy supplies, import into a warehouse or export.</p>'}
    <p class="cr-small">Delivered shipments are listed on each carrier's own tracking page.</p></div>`;
  const sample = (x) => L.freight(x.id, 1, 100, 'import').cost;
  return nav + `<div class="cr-hero"><h1>Three carriers, one booking desk</h1><p style="max-width:620px;opacity:.9;margin-top:6px">Fast and safe, cheap and slow, or in between. You pick the carrier every time you buy supplies, import or export.</p></div>
    <div class="cr-body"><div class="fx-grid">${CARRIERS.map((x) => `<a href="#" class="fx-card" data-a="webGo" data-u="${FREIGHT_HOST}/${x.id}" style="--cc:${x.color}"><span class="fx-top">${cicon(x, 22)}<b>${esc(x.name)}</b></span><span class="fx-tag">${esc(x.tag)}</span>
      <span class="fx-l"><span>Imports</span><b>${daysTxt(x.days[0], x.days[1])}</b></span><span class="fx-l"><span>Within the city</span><b>${daysTxt(x.localDays[0], x.localDays[1])}</b></span><span class="fx-l"><span>Freight on 1 M import</span><b>${M(sample(x))}</b></span><span class="fx-l"><span>On time</span><b>${onTimeOf(p, x)}%</b></span><span class="fx-l"><span>Damage claims</span><b>${x.dmgChance ? Math.round(x.dmgChance * 100) + '%' : 'None'}</b></span>
      ${all.some((s) => s.carrier === x.id) ? `<span class="fx-on">${all.filter((s) => s.carrier === x.id).length} of your shipments on the way</span>` : ''}<em>Rates and tracking ›</em></a>`).join('')}</div></div>`;
}
function carrierPage(cr, page, go) {
  const c = city(), p = me(), g = E.gameNow(c, Date.now()), base = `${FREIGHT_HOST}/${cr.id}`;
  const mine = L.myShipments(c, p.id).filter((s) => s.carrier === cr.id), done = (p.deliv || []).filter((d) => d.carrier === cr.id);
  const onTime = onTimeOf(p, cr);
  const tabs = `<div class="fx-tabs">${go(base, 'Services', page === '' ? 'on' : '')}${go(base + '/track', `Track${mine.length ? ` (${mine.length})` : ''}`, page === 'track' ? 'on' : '')}</div>`;
  if (page === 'track') return tabs + `<div class="cr-body"><h2>Your shipments</h2>${mine.length ? `<div class="rows">${mine.map((s) => shipRow(s, g)).join('')}</div>` : `<p>No shipments with ${esc(cr.short)} right now. Pick ${esc(cr.short)} when you buy supplies, import into a warehouse or export.</p>`}
    <h3>Delivered</h3>${done.length ? `<div class="rows">${done.slice(0, 10).map((d) => `<div class="row"><div class="grow"><b>${N(d.got)} ${esc(GOODS[d.g].name.toLowerCase())} → ${esc(d.to)}</b><span>${esc(shortDate(d.m))}</span></div><div class="chips">${d.late ? `<span class="chip warn">${d.late} d late</span>` : '<span class="chip good">On time</span>'}${d.dmg ? `<span class="chip bad">${Math.round(d.dmg * 100)}% damaged</span>` : ''}</div></div>`).join('')}</div>` : '<p class="cr-small">Nothing delivered yet.</p>'}</div>`;
  const sample = (route) => L.freight(cr.id, 1, 100, route);
  return tabs + `<div class="cr-hero" style="--cc:${cr.color}"><h1>${esc(cr.tag)}</h1><div class="cr-stats"><div><b>${daysTxt(cr.days[0], cr.days[1])}</b><span>Imports</span></div><div><b>${daysTxt(cr.localDays[0], cr.localDays[1])}</b><span>Within the city</span></div><div><b>${onTime}%</b><span>On time</span></div><div><b>${cr.dmgChance ? Math.round(cr.dmgChance * 100) + '%' : 'None'}</b><span>Damage claims</span></div></div></div>
    <div class="cr-body"><h2>Rates</h2><div class="cr-rates"><div><span>Base fee per booking</span><b>${M(cr.fee)}</b></div><div><span>Imports and exports</span><b>${Math.round(cr.pct * 1000) / 10}% of cargo value</b></div><div><span>Within Aurex Bay</span><b>${Math.round(cr.pct * 400) / 10}% of cargo value</b></div>${cr.bulkQty ? `<div><span>Bulk (from ${cr.bulkQty} units)</span><b>−${Math.round(cr.bulk * 100)}% freight</b></div>` : ''}<div><span>Example: 1 M of imported cargo</span><b>${M(sample('import').cost)}</b></div></div>
    <h3>Partner terminal</h3><p>${esc(cr.partner.note)}</p>
    <h3>Good to know</h3><ul class="cr-list"><li>${cr.delay < 0.05 ? 'Almost never late.' : `About ${Math.round(cr.delay * 100)}% of shipments run ${cr.delayDays[0]}–${cr.delayDays[1]} days late.`}</li><li>${cr.dmgChance ? `${Math.round(cr.dmgChance * 100)}% of shipments arrive with ${Math.round(cr.dmg[0] * 100)}–${Math.round(cr.dmg[1] * 100)}% damaged goods.` : 'Fully insured: nothing is ever lost.'}</li><li>Freight is paid when you book. Export earnings are paid when the cargo is delivered.</li></ul></div>`;
}
