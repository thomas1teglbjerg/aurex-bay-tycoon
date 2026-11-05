// Company dashboard: one page per company with production, supplies, orders and departments
import * as E from '../supabase/functions/_shared/engine.js';
import { TYPES, SIZES, GOODS, RECIPES, DEPTS, STAFF, WORKER, MARKET_KIND, CLIENT_RULES, LIFE as LC, CRAFT, AD, AD_CATS, PAPER, MAINT, SITE_CO, ROADS } from '../supabase/functions/_shared/content.js';
import { adHTML } from './web.js';
import { carrierPicker, deliveriesBox } from './freight.js';
import { money, cardHTML } from './life.js';
import { scenesHTML, sceneFor } from './scenes.js';
import { selfHeadHTML } from './profile.js';
import { city, me, esc, lname, coImg, faceUrl, dollars, M, K, N, P, dateLabel, shortDate, deptIcon, spark, barChart, seg } from './util.js';

const O = E.OPS;
const STAFF_BY = Object.fromEntries(STAFF.map((s) => [s.id, s]));
export const DEPT_TINT = { ops: '#22344f', procurement: '#5c4220', sales: '#175c3b', social: '#7a2f5f', hr: '#24578f', finance: '#34502a', rnd: '#3f347e', legal: '#4d3f31' };
const STATE_LABEL = { auto: 'Automated', partial: 'Partly automated', manual: 'You run it', closed: 'Not opened' };

export function deptHeader(l, d, state, compact) {
  const bg = `linear-gradient(100deg, ${DEPT_TINT[d.id]}f2 0%, ${DEPT_TINT[d.id]}b0 45%, ${DEPT_TINT[d.id]}30 100%), url(img/d-${d.id}.jpg), url(${coImg(l)})`;
  return `<header class="dh ${compact ? 'sm' : ''} ${state === 'closed' ? 'closed' : ''}" style="background-image:${bg}">
    <span class="dh-ic">${deptIcon(d.id, compact ? 20 : 26)}</span><div><b>${esc(d.name)}</b><span class="pill st-${state}">${STATE_LABEL[state]}</span></div></header>`;
}
export function statusOf(l) {
  const o = l.ops; if (!o) return { label: 'Starting up', cls: 'info' };
  if (o.eff < 0.05) return { label: 'Stopped: no supplies', cls: 'bad' };
  if (o.eff < 0.95) return { label: `Short of supplies (${Math.round(o.eff * 100)}%)`, cls: 'warn' };
  return { label: 'Running', cls: 'good' };
}
export function companyRow(l) {
  const c = city(), y = E.listingYield(c, l, l.owner), st = statusOf(l), t = O.tasks(c, l).length;
  const auto = l.ops ? Math.round(DEPTS.filter((d) => l.ops.depts[d.id]).reduce((a, d) => a + O.automation(l, d.id), 0) / Math.max(1, Object.keys(l.ops.depts).length) * 100) : 0;
  return `<button class="crow" data-a="company" data-lid="${l.id}"><span class="thumb lg" style="background-image:url(${coImg(l)})"></span>
    <div class="grow"><b>${esc(lname(l))}</b><span>${esc(l.district)} · ${SIZES[l.size].label} · Level ${l.level}${l.upgrade ? ` → ${l.upgrade.to}` : ''}</span>
      <div class="chips" style="margin-top:4px"><span class="chip ${st.cls}">${esc(st.label)}</span>${t ? `<span class="chip warn">${t} to-do</span>` : ''}<span class="chip">${auto}% automated</span>${(() => { const pr = E.protection(c, l); return pr.soft ? '<span class="chip bad" title="Rivals can bid for it if you are away for months">Exposed if you go away</span>' : pr.safe && pr.why ? '<span class="chip good" title="' + esc(pr.why) + '">Protected</span>' : '<span class="chip bad">Unprotected</span>'; })()}</div></div>
    <div class="right"><b class="num up">${M(Math.max(0, y.ypi) * (l.ops ? l.ops.eff : 1) + E.opsEstimate(c, l) - O.runningCosts(l).total, true)}</b><span>per year</span></div></button>`;
}

export function taskButton(l, t) {
  const label = { orders: 'Answer', deliver: 'Deliver', archive: 'Review', restock: 'Order' }[t.id] || (t.interactive ? 'Start' : 'Do it');
  const a = t.id === 'restock' ? `data-a="gotoSupplies" data-lid="${l.id}"` : t.id === 'orders' || t.id === 'archive' ? `data-a="gotoOrders" data-lid="${l.id}"` : t.id === 'deliver' ? `data-a="deliverOpen" data-lid="${l.id}"` : t.interactive ? `data-a="scene" data-lid="${l.id}" data-task="${t.id}"` : `data-a="task" data-lid="${l.id}" data-task="${t.id}"`;
  return `<button class="btn sm ${t.urgent ? 'gold' : 'navy'}" ${a}>${label}</button>`;
}
const MOOD = (m) => (m >= 75 ? ['Loyal', 'good'] : m >= 50 ? ['Satisfied', 'info'] : m >= 35 ? ['Unhappy', 'warn'] : ['About to leave', 'bad']);
const STATUS = { new: ['Needs an answer', 'warn'], renegotiating: ['Counter-offer sent', 'info'], accepted: ['Accepted · deliver', 'good'], cancelled: ['Cancelled', 'bad'] };
const STAY = { ...STATUS, accepted: ['Confirmed · arriving', 'good'] };
const TAG = (od, cl) => od.vip ? `VIP · ${N(od.need || 1)}× supplies` : od.tag === 'rush' ? 'Rush +15%' : 'Bulk −8%';
function orderCard(c, l, od, ro) {
  const o = l.ops, cl = O.clientById(o, od.cid), hotel = O.hosts(l), [sl, sc] = (hotel ? STAY : STATUS)[od.status] || [od.status, ''];
  let acts = '';
  if (!ro) {
    if (od.status === 'new') acts = `<button class="btn sm gold" data-a="order" data-op="accept" data-lid="${l.id}" data-oid="${od.id}">Accept</button><button class="btn sm" data-a="order" data-op="renegotiate" data-ask="1.1" data-lid="${l.id}" data-oid="${od.id}">Ask +10%</button><button class="btn sm" data-a="order" data-op="renegotiate" data-ask="1.2" data-lid="${l.id}" data-oid="${od.id}">Ask +20%</button><button class="btn sm danger" data-a="order" data-op="reject" data-lid="${l.id}" data-oid="${od.id}">Reject</button>`;
    else if (od.status === 'accepted' && !hotel) acts = `<button class="btn sm navy" data-a="deliverOpen" data-lid="${l.id}" data-oid="${od.id}">Deliver on the map</button>`;
    else if (od.status === 'cancelled') acts = `<button class="btn sm" data-a="order" data-op="archive" data-lid="${l.id}" data-oid="${od.id}">Archive</button>`;
  }
  const expires = od.status === 'new' ? `answer within ${Math.max(0, od.m + (cl && cl.kind === 'b2b' ? 3 : 2) - c.m)} mo` : od.status === 'accepted' ? (hotel ? (od.wait === 'rooms' ? 'waiting for a free room' : od.wait === 'supplies' ? 'waiting for supplies' : 'checks in this week') + (od.due <= c.m ? ' · last chance this month' : '') : od.due <= c.m ? 'deliver this month' : 'deliver by next month') : od.status === 'renegotiating' ? `asked +${Math.round((od.ask - 1) * 100)}%, answer next month` : esc(od.reason || '');
  return `<div class="ocard ${od.status}${od.vip ? ' vip' : ''}"><div class="ohead"><div><b>${esc(cl ? cl.name : 'Client')}</b><span>${cl ? (od.vip ? 'VIP guest' : hotel ? 'Booking' : cl.kind === 'b2b' ? 'B2B' : 'B2C') + ' · ' + esc(cl.district) : ''}${od.tag ? ` · <em class="tag-${od.tag}">${TAG(od, cl)}</em>` : ''}</span></div><span class="chip ${sc}">${sl}</span></div>
    <div class="ofigs"><div><small>${hotel ? 'Guest stays' : 'Units'}</small><b class="num">${N(od.units)}</b></div><div><small>Revenue</small><b class="num">${M(od.value)}</b></div><div><small>Supply cost</small><b class="num">${M(od.cost)}</b></div><div><small>Earning</small><b class="num ${od.earning >= 0 ? 'up' : 'down'}">${M(od.earning, true)}</b></div></div>
    <div class="ofoot"><span class="muted">${expires}</span><div class="btns">${acts}</div></div></div>`;
}
function boardHTML(l, ro) {
  const c = city(), b = (l.ops.board || []).slice(0, 6), p = me();
  const msgs = b.map((x) => { const a = c.players[x.pid]; return `<div class="msg ${x.pid === p.id ? 'me' : ''}"><span class="av" style="${a && a.avatar ? `background-image:url(${a.avatar})` : `background:${a ? a.color : '#888'}`};--avc:${a ? a.color : '#888'}">${a && !a.avatar ? esc(a.name[0]) : ''}</span><div><b>${esc(x.pid === p.id ? 'You' : x.name)}</b><span class="muted"> · ${esc(shortDate(x.m))}</span><p>${esc(x.text)}</p></div></div>`; }).join('');
  return `<div class="box board"><h2>Company board<small>YOU + COOP PARTNERS</small></h2><div class="in">
    <form class="post" data-form="post" data-lid="${l.id}"><input id="post-${l.id}" maxlength="280" placeholder="Write a note for your team and coop partners" autocomplete="off"><button class="btn navy" type="submit">Post</button></form>
    ${msgs ? `<div class="msgs">${msgs}</div>` : '<p class="empty" style="font-size:13.5px">No messages yet. Plans, warnings and tips posted here are visible to your coop partners.</p>'}</div></div>`;
}

// ---------------------------------------------------------------- accounts: a full income statement per company
function acctMonth(l, x, y) {
  const o = l.ops, sal = x.sal ?? x.run ?? 0, bud = x.sal == null ? 0 : (x.bud || 0);
  const r = { m: x.m, b2c: x.b2c || 0, goods: x.goods || 0, ypi: x.ypi ?? Math.max(0, y.ypi) * (x.eff ?? o.eff) / 12, sup: x.sup || 0, fr: x.fr || 0, sal, bud, heads: x.heads || 0, maint: x.maint ?? (MAINT[l.type] || 0) * SIZES[l.size].mult / 12, units: x.units || 0, sold: x.sold || 0, orders: x.orders || 0, workers: x.workers || 0 };
  r.rev = r.b2c + r.goods + r.ypi; r.cost = r.sup + r.fr + r.sal + r.bud + r.heads + r.maint; r.profit = r.rev - r.cost; return r;
}
const sumAcct = (ms) => ms.reduce((a, r) => { Object.keys(r).forEach((k) => { if (k !== 'm' && k !== 'workers') a[k] = (a[k] || 0) + r[k]; }); a.workers = r.workers; return a; }, {});
function accountsBox(l, ui, y) {
  const o = l.ops, per = (ui.acct && ui.acct[l.id]) || '1', n = +per;
  const all = o.hist.map((x) => acctMonth(l, x, y)), ms = all.slice(-n), prev = all.slice(-2 * n, -n);
  if (!ms.length) return `<div class="box" id="accounts-box"><h2>Accounts</h2><div class="in"><p class="empty">The first books close at the end of this month.</p></div></div>`;
  const t = sumAcct(ms), pv = prev.length === n ? sumAcct(prev) : null;
  const chg = (k) => { if (!pv || Math.abs(pv[k]) < 0.005) return '<td></td>'; const d = (t[k] - pv[k]) / Math.abs(pv[k]) * 100, good = k === 'cost' ? d < 0 : d > 0; return `<td class="num ${Math.abs(d) < 0.5 ? '' : good ? 'up' : 'down'}">${d > 0 ? '+' : ''}${Math.round(d)}%</td>`; };
  const line = (label, k, sub = '') => `<tr><td>${label}${sub ? `<span class="ac-sub">${sub}</span>` : ''}</td><td class="num">${M(t[k])}</td><td class="num ac-share">${t.rev > 0 && Math.abs(t[k]) >= 0.0005 ? Math.round(t[k] / t.rev * 100) + '%' : ''}</td>${chg(k)}</tr>`;
  const tot = (label, k, cls = '') => `<tr class="ac-tot ${cls}"><td>${label}</td><td class="num">${M(t[k])}</td><td class="num ac-share">${k === 'profit' && t.rev > 0 ? Math.round(t.profit / t.rev * 100) + '%' : ''}</td>${chg(k)}</tr>`;
  const label = n === 1 ? shortDate(ms[0].m) : `${shortDate(ms[0].m)} – ${shortDate(ms[ms.length - 1].m)}`;
  const avgPrice = t.sold > 0 ? t.b2c / t.sold : 0, unitCost = t.units > 0 ? (t.sup + t.fr + t.sal + t.bud) / t.units : 0;
  const rows = all.slice(-6).reverse().map((r) => `<tr><td>${shortDate(r.m)}</td><td class="num">${M(r.rev)}</td><td class="num">${M(r.cost)}</td><td class="num ${r.profit >= 0 ? 'up' : 'down'}">${M(r.profit)}</td><td class="num">${r.rev > 0 ? Math.round(r.profit / r.rev * 100) + '%' : '–'}</td></tr>`).join('');
  const chart = barChart(all.slice(-12).map((r) => ({ label: shortDate(r.m), a: r.rev, b: r.cost })));
  return `<div class="box" id="accounts-box"><h2>Accounts<small>${esc(label)}</small></h2><div class="in">
    ${seg('acctPeriod', `data-lid="${l.id}"`, [['1', 'Last month'], ['3', '3 months'], ['12', '12 months']], per)}
    <div class="kpis sm"><div class="stat"><small>Revenue</small><b class="num">${M(t.rev)}</b></div><div class="stat"><small>Costs</small><b class="num">${M(t.cost)}</b></div><div class="stat"><small>Profit</small><b class="num ${t.profit >= 0 ? 'up' : 'down'}">${M(t.profit, true)}</b></div><div class="stat"><small>Margin</small><b class="num">${t.rev > 0 ? Math.round(t.profit / t.rev * 100) + '%' : '–'}</b></div></div>
    <div class="tbl-wrap"><table class="tbl ac"><thead><tr><th>Income statement</th><th class="num">Amount</th><th class="num">Share</th><th class="num">${pv ? 'vs prev.' : ''}</th></tr></thead><tbody>
      <tr class="ac-h"><td colspan="4">Revenue</td></tr>
      ${line('Customer sales', 'b2c', t.orders ? `${N(t.orders)} orders · ${N(t.sold)} units` : t.sold ? `${N(t.sold)} units` : '')}${line('Supply sales', 'goods')}${line('Contract income (YPI)', 'ypi', o.eff < 1 ? `cut to ${Math.round(o.eff * 100)}% by supply gaps` : '')}
      ${tot('Total revenue', 'rev')}
      <tr class="ac-h"><td colspan="4">Costs</td></tr>
      ${line('Supplies', 'sup')}${line('Freight', 'fr')}${line('Wages', 'sal', `${t.workers} workers`)}${line('Department budgets', 'bud', 'marketing, R&amp;D, training, compliance')}${line('Specialists', 'heads', 'heads leading this company')}${t.maint > 0 ? line('Maintenance', 'maint') : ''}
      ${tot('Total costs', 'cost')}
      ${tot('Operating profit', 'profit', t.profit >= 0 ? 'pos' : 'neg')}
    </tbody></table></div>
    <div class="kpis sm"><div class="stat"><small>Produced</small><b class="num">${N(t.units)}</b><span class="sub">${esc(RECIPES[l.type].unit)}</span></div><div class="stat"><small>Avg. price</small><b class="num">${avgPrice ? money(avgPrice) : '–'}</b><span class="sub">per unit sold</span></div><div class="stat"><small>Unit cost</small><b class="num">${unitCost ? money(unitCost) : '–'}</b><span class="sub">supplies, freight, wages</span></div><div class="stat"><small>Run rate</small><b class="num ${t.profit >= 0 ? 'up' : 'down'}">${M(t.profit / ms.length * 12, true)}</b><span class="sub">profit per year</span></div></div>
    <div class="cap" style="margin-top:4px">Month by month</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Month</th><th class="num">Revenue</th><th class="num">Costs</th><th class="num">Profit</th><th class="num">Margin</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${chart}<div class="btns" style="font-size:13px;gap:14px"><span><b style="color:var(--good)">■</b> Revenue</span><span><b style="color:#d48a7f">■</b> Costs</span></div>
    <p class="empty" style="font-size:13px">Revenue counts what this company brought in: customer orders, supplies sold on the market and its contract income (YPI). Specialist salaries are shown here for the company they lead; you pay them from your own account.</p>
  </div></div>`;
}

export function companyHTML(lid, ui = {}) {
  const c = city(), p = me(), l = E.listing(c, lid);
  if (!l || !E.canSeeCompany(c, p.id, l) || !l.ops) return `<button class="btn" data-a="back">‹ Back</button><p class="empty">You can no longer see this company.</p>`;
  const ro = !E.canRun(c, p.id, l), coop = l.owner.k === 'h' ? c.holdings[l.owner.id] : null, owner = coop || c.players[l.owner.id];
  const o = l.ops, def = TYPES[l.type], rec = RECIPES[l.type], y = E.listingYield(c, l, l.owner), st = statusOf(l), rc = O.runningCosts(l);
  const h = o.hist[o.hist.length - 1] || { b2c: 0, goods: 0, sup: 0, run: rc.total / 12 }, last = o.last || { cap: O.capacity(l), dem: O.demand(c, l), units: 0, price: O.unitPrice(l, Math.max(0, y.trade)) };
  const monthProfit = o.hist.length ? acctMonth(l, h, y).profit : 0;
  const tasks = ro ? [] : O.tasks(c, l), need = O.needsPerMonth(l);
  const kind = MARKET_KIND[l.type], R = CLIENT_RULES[kind], hotel = O.hosts(l);

  const todoScenes = ro ? '' : scenesHTML((st) => st.lid === l.id && st.from !== 'clients');
  const taskHTML = todoScenes + (tasks.filter((t) => !(t.interactive && sceneFor(l.id, t.id))).length ? tasks.filter((t) => !(t.interactive && sceneFor(l.id, t.id))).map((t) => `<div class="task ${t.urgent ? 'urgent' : ''}"><span class="ti" style="background:${DEPT_TINT[t.dept]}">${deptIcon(t.dept, 18)}</span><div class="grow"><b>${esc(t.label)}</b><span>${esc(O.deptFor(l, t.dept).name)}${t.value ? ` · ${M(t.value)}` : ''}${t.interactive ? ' · takes about 20 seconds' : ''}</span></div>${taskButton(l, t)}</div>`).join('')
    : (todoScenes ? '' : '<p class="empty">Nothing needs you. Your departments handle the daily work.</p>'));

  const inputs = O.stocked(l).map(([g]) => { const mk = c.market[g], stock = o.inv[g] || 0, n = need[g] || 0, cover = n ? stock / n : 99, way = E.LOG.onTheWay(c, l, g);
    const q = (ui.buyQty && ui.buyQty[g]) || Math.max(10, Math.ceil(n / 10) * 10), cid = (ui.carrier && ui.carrier[l.id]) || O.setting(l, 'procurement', 'carrier'), qt = O.quote(c, l, g, q, o.depts.procurement ? O.setting(l, 'procurement', 'policy') : 'cheapest', cid);
    return `<div class="suprow"><div class="supg"><b>${esc(GOODS[g].name)}</b><span>${O.isManual(l) ? `${+rec.in[g].toFixed(3)} ${esc(GOODS[g].unit)} per ${esc(rec.unit.split(' ')[0])} made · stock ${N(stock)}${O.yardCap(l, g) < Infinity ? ` of ${N(O.yardCap(l, g))}` : ''}${way ? ` (+${N(way)} on the way)` : ''}` : `Need ${N(n)} ${esc(GOODS[g].unit)}/mo · stock ${N(stock)}${way ? ` (+${N(way)} on the way)` : ''} · <em class="${cover < 1 ? 'down' : ''}">${cover >= 99 ? '' : cover.toFixed(1) + ' months'}</em>`}</span><span>Market ${K(mk.p)} · import ${K(O.importPrice(c, g))}</span></div>
      ${ro ? '' : `<div class="supctl"><div class="stepper"><button data-a="buyQty" data-g="${g}" data-v="-10" aria-label="Fewer">−</button><output class="num">${q}</output><button data-a="buyQty" data-g="${g}" data-v="10" aria-label="More">+</button></div><button class="btn sm navy" data-a="buySupply" data-lid="${l.id}" data-g="${g}" data-q="${q}" data-c="${cid}">Order · ${money(qt.cost)}</button></div><span class="supnote">${money(qt.goods)} goods + ${money(qt.freight)} freight · ${qt.minDays === qt.maxDays ? qt.maxDays : `${qt.minDays}–${qt.maxDays}`} days${qt.fromBook ? ` · ${N(qt.fromBook)} from players` : ''}${qt.imported ? ` · ${N(qt.imported)} imported` : ''}</span>`}</div>`; }).join('');
  const outs = Object.entries(rec.out).map(([g, q]) => { const mk = c.market[g], stock = o.inv[g] || 0;
    return `<tr><td><b>${esc(GOODS[g].name)}</b><span>${esc(GOODS[g].unit)}</span></td><td class="num">${N(q * last.units)}</td><td class="num">${N(stock)}</td><td class="num">${K(mk.p)}</td><td>${ro ? '' : `<div class="btns" style="flex-wrap:nowrap;gap:6px;justify-content:flex-end"><button class="btn sm" data-a="listGoods" data-lid="${l.id}" data-g="${g}" ${stock < 1 ? 'disabled' : ''}>List all</button><button class="btn sm" data-a="exportGoods" data-lid="${l.id}" data-g="${g}" data-c="${(ui.carrier && ui.carrier[l.id]) || O.setting(l, 'procurement', 'carrier')}" ${stock < 1 ? 'disabled' : ''}>Export at ${K(O.exportPrice(c, g))}</button><button class="btn sm gold" data-a="dealNew" data-lid="${l.id}" data-g="${g}" ${stock < 1 ? 'disabled' : ''}>Sell to a contact</button></div>`}</td></tr>`; }).join('');
  const myOffers = (c.book || []).filter((x) => x.lid === l.id);
  const ords = (o.orders || []).slice().sort((a, b) => ['new', 'accepted', 'renegotiating', 'cancelled'].indexOf(a.status) - ['new', 'accepted', 'renegotiating', 'cancelled'].indexOf(b.status));
  const clients = (o.clients || []).filter((x) => x.status === 'active').sort((a, b) => b.weight - a.weight);
  const left = (o.clients || []).filter((x) => x.status === 'left').length;
  const depts = O.deptsFor(l).map((d) => ro ? deptCardRO(l, d) : deptCard(l, d, ui)).join('');
  const ready = ords.filter((x) => x.status === 'accepted').length;

  return `<div class="crumbs"><button class="btn sm" data-a="back">‹ ${ro ? 'Coop' : 'Empire'}</button><span class="muted">${coop ? `${esc(coop.name)} · co-owned · costs come out of the coop treasury` : ro ? `${esc(owner.name)}'s company` : 'Company dashboard'}</span></div>
  <section class="chero" style="background-image:linear-gradient(180deg, rgba(10,20,35,0.05) 30%, rgba(10,20,35,0.88)), url(${coImg(l)})">
    <div class="chero-in"><span class="chip ${st.cls}">${esc(st.label)}</span><h2>${esc(lname(l))}</h2><p>${l.title ? esc(def.name) + ' · ' : ''}${esc(l.district)} · ${SIZES[l.size].label} · Level ${l.level}${l.upgrade ? ` (upgrading to ${l.upgrade.to})` : ''} · Tech ${o.tech} · ${kind === 'b2b' ? 'B2B' : 'B2C'}</p></div>
    <div class="chero-act"><button class="btn sm" data-a="open" data-lid="${l.id}">Company card</button></div>
  </section>
  ${boardHTML(l, ro)}
  <div class="kpis">
    <div class="stat"><small>Profit last month</small><b class="num ${monthProfit >= 0 ? 'up' : 'down'}">${M(monthProfit, true)}</b></div>
    <div class="stat"><small>Sales last month</small><b class="num">${M(h.b2c + h.goods)}</b></div>
    <div class="stat"><small>Supplies bought</small><b class="num">${M(h.sup)}</b></div>
    <div class="stat"><small>Wages & budgets / mo</small><b class="num">${M(rc.total / 12)}</b></div>
    ${hotel ? `<div class="stat"><small>Guests last month</small><b class="num">${N(last.units)}</b><span class="sub">${esc(rec.unit)}</span></div>
    <div class="stat"><small>Rooms this month</small><b class="num">${N(o.rooms ? o.rooms.used : 0)} / ${N(o.rooms ? o.rooms.cap : O.capacity(l))}</b><span class="sub">stays checked in</span></div>`
    : `<div class="stat"><small>Output</small><b class="num">${N(last.units)} / ${N(last.cap)}</b><span class="sub">${esc(rec.unit)}</span></div>
    <div class="stat"><small>Finished stock</small><b class="num">${N(o.fg || 0)}</b><span class="sub">${o.line && o.line.left > 0 ? `+${N(o.line.per)} a week · ${o.line.left} wk left` : 'ready to deliver'}</span></div>`}
    <div class="stat"><small>Clients</small><b class="num">${clients.length}</b><span class="sub">${left ? `${left} left you` : (hotel ? rec.guests.client : R.label).toLowerCase() + 's'}</span></div>
    <div class="stat"><small>Reputation</small><b class="num">${Math.round(o.rep)}</b><div class="bar"><i style="width:${o.rep}%"></i></div></div>
    <div class="stat"><small>Morale</small><b class="num ${o.morale < 35 ? 'down' : ''}">${Math.round(o.morale)}</b><div class="bar"><i style="width:${o.morale}%;background:${o.morale < 35 ? 'var(--bad)' : 'var(--gold)'}"></i></div></div>
    <div class="stat"><small>Staff</small><b class="num">${rc.workers}</b><span class="sub">${M(rc.salaries)} wages / yr</span></div>
  </div>
  <div class="grid">
    <div class="col">
      ${ro ? '' : `<div class="box"><h2>To-do<small>${tasks.length}</small></h2><div class="in">${taskHTML}<p class="empty" style="font-size:13px">Tasks appear when a department has no staff. Hire workers to hand the work over.</p></div></div>`}
      ${cellarBox(c, l, ro)}
      ${yardBox(c, l, ro)}
      ${newsroomBox(c, l, ro)}
      ${o.depts.social && !ro ? '' : adBox(c, l, ro, ui)}
      ${o.depts.social ? '' : pressBox(c, l, ro)}
      ${RECIPES[l.type].manual ? roadsClientBox(c, l, ro) : `
      <div class="box" id="orders-box"><h2>${hotel ? 'Bookings' : 'Customer orders'}<small>${ords.length} OPEN</small></h2><div class="in">
        ${!ro && ready && !hotel ? `<button class="btn navy" data-a="deliverOpen" data-lid="${l.id}">Open delivery map · ${ready} ready</button>` : ''}
        ${ords.length ? `<div class="orders">${ords.map((od) => orderCard(c, l, od, ro)).join('')}</div>` : `<p class="empty">${hotel ? (O.automation(l, 'sales') >= 1 ? 'Reservations confirms every booking. Guests check in by themselves.' : 'No open bookings. Travel agents and tour operators book every month.') : O.automation(l, 'sales') >= 1 ? 'Your sales team answers and ships every order.' : 'No open orders. New orders arrive every month from your clients.'}</p>`}
        <p class="empty" style="font-size:13px">${hotel ? 'Confirm a booking and the guests check in on their own as soon as a room is free and the stores hold what their stay needs: food, linen, energy and media. If they wait too long, they book elsewhere. Now and then a VIP asks for rooms: they pay far more, use extra supplies and lift your reputation.' : kind === 'b2b' ? 'B2B clients order big and negotiate more, but give you 3 months to answer.' : 'Retail channels order often in smaller lots and expect an answer within 2 months.'} A counter-offer is answered next month, and the client may walk away. Rejected, late or ignored orders upset clients until they leave.</p>
        ${o.done && o.done.length ? `<details><summary>${hotel ? 'Recent guests' : 'Recently delivered'} (${o.done.length})</summary><div class="rows">${o.done.slice(0, 8).map((x) => { const cl = O.clientById(o, x.cid); return `<div class="row"><div class="grow"><b>${esc(cl ? cl.name : '')}</b><span>${N(x.units)} ${hotel ? 'stays' : 'units'} · ${esc(shortDate(x.dm))}${x.vip ? ' · VIP' : ''}${x.auto ? ` · handled by ${hotel ? 'Reservations' : 'Sales'}` : ''}</span></div><b class="num up">${M(x.value)}</b></div>`; }).join('')}</div></details>` : ''}
      </div></div>
      <div class="box"><h2>Clients<small>${kind === 'b2b' ? 'B2B' : 'B2C'}</small></h2><div class="in"><div class="rows">${clients.map((cl) => { const [ml, mc] = MOOD(cl.mood); return `<div class="row"><span class="av" style="background:${DEPT_TINT.sales};--avc:${DEPT_TINT.sales}">${esc(cl.name[0])}</span><div class="grow"><b>${esc(cl.name)}</b><span>${esc(cl.district)} · ${cl.weight >= 1.5 ? 'large' : cl.weight >= 0.8 ? 'medium' : 'small'} account · ${cl.orders} orders · ${M(cl.revenue)} bought</span><div class="bar" style="margin-top:4px"><i style="width:${cl.mood}%;background:${cl.mood < 35 ? 'var(--bad)' : cl.mood < 50 ? 'var(--gold)' : 'var(--good)'}"></i></div></div><span class="chip ${mc}">${ml}</span></div>`; }).join('')}</div>
        ${ro ? '' : scenesHTML((st) => st.lid === l.id && st.from === 'clients')}${!ro && O.automation(l, 'sales') < 1 && !sceneFor(l.id, 'findCustomers') ? `<button class="btn${o.cd.findCustomers === c.m ? ' done' : ''}" data-a="scene" data-from="clients" data-lid="${l.id}" data-task="findCustomers">${hotel ? 'Find new booking partners' : 'Find new clients'} · takes 20 seconds</button>` : ''}</div></div>
      `}
      <div class="box" id="supplies-box"><h2>${hotel ? 'Guest supplies' : 'Production & supplies'}<small>${Math.round(o.eff * 100)}% SUPPLIED</small></h2><div class="in">
        ${ro ? '' : (() => { const cid0 = (ui.carrier && ui.carrier[l.id]) || O.setting(l, 'procurement', 'carrier'), g0 = Object.keys(rec.in)[0]; return `<div class="set"><span class="cap">Ship with</span>${carrierPicker('carrier', `data-lid="${l.id}"`, cid0, g0 ? (cid) => O.quote(c, l, g0, (ui.buyQty && ui.buyQty[g0]) || Math.max(10, Math.ceil((need[g0] || 0) / 10) * 10), 'cheapest', cid) : null)}<span class="muted" style="font-size:12.5px">Prices shown for ${g0 ? esc(GOODS[g0].name.toLowerCase()) : 'your cargo'}. Freight and delivery time apply to every order${o.depts.procurement ? '. Procurement restocks with the carrier set in its settings' : ''}.</span></div>`; })()}
        <div class="sups">${inputs}</div>
        ${ro || O.automation(l, 'procurement') < 1 ? '' : `<div class="btns"><span class="cap" style="align-self:center">Fill up now for</span>${[1, 2, 3].map((n) => `<button class="btn sm" data-a="restock" data-lid="${l.id}" data-v="${n}">${n} month${n > 1 ? 's' : ''}</button>`).join('')}</div>`}
        <p class="empty" style="font-size:13px">Purchases take the cheapest offers from other players and your own companies first, then import the rest. Everything travels with the carrier you pick, so order before you run out. Own a warehouse to import cheaper and truck supplies here.${O.automation(l, 'procurement') >= 1 ? ` Your ${esc(O.deptFor(l, 'procurement').name)} team restocks automatically with the carrier set in its settings.` : ` Ordering is manual until ${esc(O.deptFor(l, 'procurement').name)} is fully staffed (now ${Math.round(O.automation(l, 'procurement') * 100)}%).`}</p>
        ${outs ? `<div class="cap" style="margin-top:6px">Supplies you produce</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Product</th><th>Made / mo</th><th>In stock</th><th>Market</th><th></th></tr></thead><tbody>${outs}</tbody></table></div>` : ''}
        ${myOffers.length && !ro ? `<div class="cap">Your offers on the city market</div><div class="rows">${myOffers.map((x) => `<div class="row"><div class="grow"><b>${N(x.qty)} ${esc(GOODS[x.g].unit)} ${esc(GOODS[x.g].name.toLowerCase())}</b><span>${K(x.price)} each${x.auto ? ' · listed by Sales' : ''}</span></div><button class="btn sm" data-a="cancelOffer" data-id="${x.id}">Withdraw</button></div>`).join('')}</div>` : ''}
      </div></div>
      ${ro ? '' : deliveriesBox(l.id)}
      ${accountsBox(l, ui, y)}
    </div>
    <div class="col">
      <div class="box"><h2>Departments<small>${Object.keys(o.depts).length} OF ${O.deptsFor(l).length}</small></h2><div class="in"><div class="depts">${depts}</div></div></div>
      ${ro ? '' : `<div class="box"><h2>Company</h2><div class="in"><div class="btns">
        ${l.upgrade ? `<span class="chip">Upgrading to level ${l.upgrade.to}</span>` : l.level < 5 ? `<button class="btn ${coop ? 'coop' : 'navy'}" data-a="upgrade" data-lid="${l.id}" ${!coop && p.cash < E.upgradeCost(l) ? 'disabled' : ''}>${coop ? 'Propose upgrade' : 'Upgrade'} to level ${l.level + 1} · ${M(E.upgradeCost(l))}</button>` : ''}
        ${coop ? (coop.proposals.some((x) => x.status === 'open' && x.kind === 'sell' && x.lid === l.id) ? '<span class="chip">Sale vote running</span>' : `<button class="btn danger" data-a="sell" data-lid="${l.id}">Propose sale · ${M(E.listingValue(l) * 0.8)} to treasury</button>`) : `<button class="btn danger" data-a="sell" data-lid="${l.id}">Sell for ${M(E.listingValue(l) * 0.8)}</button>`}</div>${coop ? `<p class="empty" style="font-size:13px">Treasury ${M(coop.treasury)}. Upgrades and sales are decided by a vote of the co-owners.</p>` : ''}
        <p class="empty" style="font-size:13px">Upgrading raises capacity, steady income and the number of workers each department needs.</p></div></div>`}
    </div>
  </div>`;
}
// Marketing: ad campaigns on the city's websites, for the company or one piece it makes or the owner holds
function adBox(c, l, ro, ui, inDept) {
  const A = E.ADS, o = l.ops, mk = O.deptFor(l, 'social').name, run = A.running(c, l.id);
  if ((ro || !o.depts.social) && !run) return ''; // only companies with a Marketing department advertise
  const head = (n) => (inDept ? `<div class="dsub adbox"><h3>Ad campaigns<small>${n}</small></h3><div>` : `<div class="box adbox"><h2>Ad campaigns<small>${n}</small></h2><div class="in">`);
  if (run) {
    const left = Math.min(run.weeks, Math.max(0, Math.ceil((run.until - c.g) * 48 - 1e-6))), what = run.kind === 'co' ? esc(lname(l)) : esc((E.LIFE.ITEM[run.cid] || {}).name || 'a piece');
    return head('RUNNING') + `${adHTML(run, 'wide', true)}
      <p style="margin:10px 0 6px">Advertising <b>${what}</b> on the city’s websites · <b>${left} week${left === 1 ? '' : 's'}</b> left of ${run.weeks} · about <b>${run.views.toLocaleString('en-US')}</b> views so far.</p>
      <p class="empty" style="font-size:13px">${run.kind === 'co' ? `Every week it runs: customers +${Math.round(AD.cust * A.strength(l) * 1000) / 10}% and reputation +${AD.rep * A.strength(l)}.` : `Every week it runs the piece gains ${Math.round(AD.lift * A.strength(l) * 1000) / 10}% in market value.`}${A.strength(l) > 1 ? ' A head of marketing makes it 50% stronger.' : ''} Open the web browser to see it live.</p>
      ${ro ? '' : `<div class="btns"><button class="btn sm" data-a="web" data-u="baylink.ab">See it in the browser</button><button class="linkbtn" data-a="adStop" data-lid="${l.id}">Stop campaign</button></div>`}</div></div>`;
  }
  const st = Object.assign({ subj: 'co', tone: 'wink', n: 0, weeks: AD.weeks[1] }, (ui.ad && ui.ad[l.id]) || {});
  const p = me(), prods = E.ADS.products(c, p, l), pr = prods.find((x) => x.uid === st.subj), cid = pr ? pr.cid : null, subj = pr ? pr.uid : 'co';
  const t = A.copy(l, st.tone, st.n, cid, p.name), cost = A.cost(l, st.weeks, c), cash = l.owner.k === 'h' ? c.holdings[l.owner.id].treasury : p.cash;
  const preview = adHTML({ lid: l.id, kind: cid ? 'item' : 'co', cid, uid: pr ? pr.uid : null, tone: st.tone, head: t.head, line: t.line }, 'wide', true);
  const subjects = [['co', `The company · ${lname(l)}`], ...prods.map((x) => [x.uid, `${E.LIFE.ITEM[x.cid].name}${x.where === 'cellar' ? ' · estate cellar' : ' · your collection'}`])];
  return head('MARKETING') + `<p style="margin:0 0 10px">Buy ad space on the city’s websites for a few weeks. The ad uses your picture and a line in the tone you choose.</p>
    <div class="set"><span class="cap">Advertise</span><select class="adsel" data-a="adSubj" data-lid="${l.id}" aria-label="What to advertise">${subjects.map(([v, n]) => `<option value="${esc(v)}" ${v === subj ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
    ${prods.length ? '' : `<p class="empty" style="font-size:13px;margin:4px 0 0">Pieces this company makes${(AD_CATS_TXT[l.type] ? `, and ${AD_CATS_TXT[l.type]} from your own collection,` : '')} can be advertised one by one.</p>`}
    <div class="set"><span class="cap">Tone</span>${seg('adSet', `data-lid="${l.id}" data-k="tone"`, AD.tones, st.tone)}</div>
    <div class="set"><span class="cap">Runs for</span>${seg('adSet', `data-lid="${l.id}" data-k="weeks"`, AD.weeks.map((w) => [w, `${w} weeks`]), st.weeks)}</div>
    <div class="adprev">${preview}</div>
    <div class="btns" style="margin-top:10px"><button class="btn sm" data-a="adNext" data-lid="${l.id}">Another line</button><button class="btn gold" data-a="adLaunch" data-lid="${l.id}" data-subj="${esc(subj)}" data-tone="${st.tone}" data-n="${t.n}" data-weeks="${st.weeks}" ${cash < cost ? 'disabled' : ''}>Launch campaign · ${M(cost)}</button></div>
    <p class="empty" style="font-size:13px">${cid ? `While it runs the piece gains about ${Math.round(AD.lift * A.strength(l) * 1000) / 10}% in market value a week.` : `While it runs: customers +${Math.round(AD.cust * A.strength(l) * 1000) / 10}% and reputation +${AD.rep * A.strength(l)} every week.`}${A.strength(l) > 1 ? ' Your head of marketing makes it 50% stronger.' : ' A head of marketing (Sofia Lindström) makes campaigns 50% stronger.'} Paid ${l.owner.k === 'h' ? 'from the coop treasury' : 'from company cash'}, shown under department budgets.</p></div></div>`;
}
// The Aurex Gazette: the owner's newsroom (ad desk, press release price, front page)
function newsroomBox(c, l, ro) {
  if (!E.GZ.isPaper(l)) return '';
  const gz = c.gz || {}, q = gz.queue || [], f = gz.front, fl = f && E.listing(c, f.lid);
  const step = (a, v, label, dis) => `<button data-a="${a}" data-v="${v}" ${dis ? 'disabled' : ''} aria-label="${label}">${v > 0 ? '+' : '−'}</button>`;
  return `<div class="box"><h2>Newsroom<small>THE AUREX GAZETTE</small></h2><div class="in">
    <div class="stats"><div class="stat"><small>Ads booked</small><b class="num">${N(gz.sold || 0)}</b></div><div class="stat"><small>Press releases</small><b class="num">${N(gz.pressN || 0)}</b></div><div class="stat"><small>Earned from ads & press</small><b class="num up">${M(gz.earned || 0)}</b></div></div>
    ${ro ? '' : `<div class="set"><span class="cap">Ad price</span><div class="stepper">${step('gzRate', -PAPER.rateStep, 'Lower ad price', gz.rate <= PAPER.rate[0])}<output class="num">×${gz.rate || 1}</output>${step('gzRate', PAPER.rateStep, 'Raise ad price', gz.rate >= PAPER.rate[1])}</div><span class="muted" style="font-size:12.5px">of the normal Marketing price. Every campaign in the city pays the paper.</span></div>
    <div class="set"><span class="cap">Press release</span><div class="stepper">${step('gzFee', -PAPER.pressStep, 'Lower press release price', gz.press <= PAPER.press[0])}<output class="num">${M(gz.press || PAPER.pressStart)}</output>${step('gzFee', PAPER.pressStep, 'Raise press release price', gz.press >= PAPER.press[1])}</div><span class="muted" style="font-size:12.5px">what tycoons pay to print a story about their company.</span></div>
    <div class="set"><span class="cap">New ads</span>${seg('gzHand', '', [[0, 'Go live at once'], [1, 'I approve them']], gz.hand ? 1 : 0)}</div>`}
    ${q.length ? `<div class="cap" style="margin-top:8px">Waiting for your approval</div>${q.map((ad) => { const co = E.listing(c, ad.lid); return co ? `<div style="margin:8px 0">${adHTML(ad, 'wide', true)}<div class="btns" style="margin-top:6px"><span class="muted" style="align-self:center;font-size:13px">${esc(lname(co))} · ${ad.weeks} weeks · ${M(ad.cost)}</span>${ro ? '' : `<button class="btn sm gold" data-a="gzReview" data-id="${ad.id}" data-ok="1">Approve</button><button class="btn sm" data-a="gzReview" data-id="${ad.id}" data-ok="0">Reject</button>`}</div></div>` : ''; }).join('')}` : ''}
    <div class="cap" style="margin-top:10px">Front page</div>
    ${f && fl ? `<p style="margin:2px 0"><b>${esc(f.t)}</b> · ${esc(lname(fl))}, ${esc(dateLabel(Math.floor(f.g * 12)))}</p>` : '<p class="empty" style="margin:2px 0">No front page story yet.</p>'}
    <p class="empty" style="font-size:13px">Every week the newsroom mails you three stories about other tycoons' companies. The one you pick leads the paper: that company gets reputation +${PAPER.front.rep} and more customers. If you do not pick, the editor does. The paper never runs bad stories about other players.</p>
    <div class="btns"><button class="btn sm" data-a="web" data-u="aurexgazette.ab">Open The Aurex Gazette</button></div></div></div>`;
}
// any company: pay The Aurex Gazette to print a short story about it
function pressBox(c, l, ro, inDept) {
  if (ro || !l.ops || E.GZ.isPaper(l)) return '';
  const fee = E.GZ.pressFee(c), ready = E.GZ.pressReady(c, l), cash = l.owner.k === 'h' ? c.holdings[l.owner.id].treasury : me().cash;
  const left = ready ? 0 : Math.max(1, Math.ceil((l.ops.pressG + PAPER.pressWeeks / 48 - c.g) * 48 - 1e-6));
  return `${inDept ? `<div class="dsub"><h3>Press release<small>${M(fee)}</small></h3><div>` : `<div class="box"><h2>Press release<small>${M(fee)}</small></h2><div class="in">`}
    <p style="margin:0 0 8px">Pay The Aurex Gazette to print a short story about ${esc(lname(l))}. It shows in the city news and gives reputation +${PAPER.pressRep} and a few more customers.</p>
    <div class="btns">${Object.entries(PAPER.PRESS_LABEL).map(([k, t]) => `<button class="btn sm" data-a="gzPress" data-lid="${l.id}" data-kind="${k}" ${!ready || cash < fee ? 'disabled' : ''}>${esc(t)}</button>`).join('')}</div>
    <p class="empty" style="font-size:13px">${ready ? `One story every ${PAPER.pressWeeks} weeks per company.` : `Next press release in ${left} week${left === 1 ? '' : 's'}.`} The money goes to the owner of the paper.</p></div></div>`;
}
const AD_CATS_TXT = Object.fromEntries(Object.entries(AD_CATS).map(([k, cs]) => [k, cs.map((x) => ({ car: 'cars', wine: 'wine', watch: 'watches', art: 'art' }[x])).join(' and ')]));

// fresh goods (concrete): each batch with the time it has left before it hardens
function lotsLine(l, g) {
  const lots = O.lotsOf(l, g, 'inv').filter((x) => x.q >= 0.5); if (!lots.length) return '';
  const left = (x) => Math.max(0, x.at + GOODS[g].fresh - Date.now()), hrs = (ms) => ms >= 3600000 ? `${Math.floor(ms / 3600000)} h ${Math.floor(ms % 3600000 / 60000)} min` : `${Math.max(1, Math.round(ms / 60000))} min`;
  return `<div class="chips" style="margin-top:5px;flex-wrap:wrap">${lots.slice(0, 6).map((x) => { const ms = left(x); return `<span class="chip ${ms < 6 * 3600000 ? 'bad' : ms < 24 * 3600000 ? 'warn' : ''}" title="Hardens ${esc(new Date(x.at + GOODS[g].fresh).toLocaleString())}">${N(x.q)} ${esc(GOODS[g].unit)} · ${hrs(ms)} left</span>`; }).join('')}${lots.length > 6 ? `<span class="chip">+${lots.length - 6} more</span>` : ''}</div>
    <span style="font-size:12.5px" class="muted">Ship it within ${Math.round(GOODS[g].fresh / 3600000)} hours of mixing, or it hardens and is thrown out. The oldest batch goes first.</span>`;
}
// a hand-run plant has no regular clients and no order book: it sells on its website, where City Road Maintenance asks now and then
function roadsClientBox(c, l, ro) {
  const host = Object.keys(SITE_CO).find((h) => SITE_CO[h].lid === l.id), q = (c.quotes || []).find((x) => x.npc && x.lid === l.id && x.status === 'asked');
  const d = (c.deals || []).find((x) => x.npc && x.lid === l.id && E.DEAL.isLive(x)), done = (c.deals || []).filter((x) => x.npc && x.lid === l.id && x.status === 'delivered');
  return `<div class="box"><h2>Clients<small>WEBSITE</small></h2><div class="in"><div class="rows"><div class="row"><span class="av" style="background:${DEPT_TINT.sales};--avc:${DEPT_TINT.sales}">C</span><div class="grow"><b>${esc(ROADS.name)}</b><span>Regular client · orders now and then for road works at the mixing cost + ${Math.round((ROADS.markup - 1) * 100)}% (now ${K(E.QT.roadsPrice(c, l))} per t) · ${done.length} delivered · ${M(done.reduce((a, x) => a + D_TOTAL(x), 0))} paid</span></div>${q ? '<span class="chip warn">New request</span>' : d ? '<span class="chip">Order open</span>' : ''}</div></div>
    <p class="empty" style="font-size:13px">The plant has no other regular clients. Builders ask for quotes on ${host ? esc(host) : 'its website'}, and you answer them in the plant office.</p>${host && !ro ? `<button class="btn" data-a="web" data-u="${host}/office">Open the plant office</button>` : ''}</div></div>`;
}
const D_TOTAL = (d) => d.qty * d.price + (d.fee || 0);
// the drum after the slider game: a countdown (ticked by drumTick in main.js) until the batch goes into the yard
export function drumHTML(l, b) {
  const total = b.ready - b.drum, left = O.drumLeft(b, Date.now()), f = total > 0 ? 1 - left / total : 1;
  return `<div class="drum" data-drum="${l.id}" data-ready="${b.ready}" data-from="${b.drum}"><div class="btns" style="align-items:center"><span class="chip warn">Drum mixing · ${N(b.qty)} t</span><b class="drum-t">${left > 0 ? drumClock(left) + ' left' : 'Pouring into the yard…'}</b></div>
    <div class="bar" style="margin-top:6px"><i class="drum-f" style="width:${(f * 100).toFixed(1)}%;background:var(--gold)"></i></div><p class="muted" style="font-size:12.5px;margin:4px 0 0">The mixture was right. The drum mixes it ${O.MIX.drumT} seconds per tonne before it goes into the yard. A new batch can start when the drum is empty.</p></div>`;
}
export const drumClock = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
// Warehouse: what the yard holds (RECIPES[type].yard: good -> most it holds); a manual plant mixes batches here
function yardBox(c, l, ro) {
  const rec = RECIPES[l.type]; if (!rec.yard) return '';
  const o = l.ops, man = O.isManual(l), out = Object.keys(rec.out)[0], unit = out ? GOODS[out].unit : 'units';
  // a bar graph: one column per good, filled to how much of its yard space is used
  const col = (g, cap) => { const stock = o.inv[g] || 0, way = E.LOG.onTheWay(c, l, g), f = Math.min(1, stock / cap), made = g in rec.out;
    const tone = made ? (f > 0.9 ? 'bad' : 'gold') : f < 0.1 ? 'bad' : f < 0.25 ? 'warn' : 'good', wf = Math.min(1 - f, way / cap);
    return `<div class="yg-col ${made ? 'made' : ''}" title="${esc(GOODS[g].name)}: ${N(stock)} of ${N(cap)} ${esc(GOODS[g].unit)}${way ? `, +${N(way)} on the way` : ''}"><b class="yg-v">${N(stock)} ${esc(GOODS[g].unit)}</b>
      <div class="yg-bar"><i class="yg-way" style="height:${(wf * 100).toFixed(1)}%;bottom:${(f * 100).toFixed(1)}%"></i><i class="yg-fill ${tone}" style="height:${(f * 100).toFixed(1)}%"></i><span class="yg-pct">${Math.round(f * 100)}%</span></div>
      <span class="yg-n">${esc(GOODS[g].name)}</span><span class="yg-c">of ${N(cap)}${way ? ` · +${N(way)} coming` : ''}${made ? ' · finished' : ''}</span></div>`; };
  const goods = Object.entries(rec.yard).sort(([a], [b]) => (a in rec.out) - (b in rec.out));
  const fresh = goods.filter(([g]) => g in rec.out && GOODS[g].fresh).map(([g]) => lotsLine(l, g)).join('');
  const rows = `<div class="yg" role="img" aria-label="Yard stock">${goods.map(([g, cap]) => col(g, cap)).join('')}</div>${fresh}`;
  const max = man ? O.mixMax(l) : 0, cap = Math.floor(O.mixCap(l)), done = Math.round(o.mixed || 0);
  const mixer = man ? `<div class="cap" style="margin-top:8px">Mix ${esc(GOODS[out].name.toLowerCase())}</div>
    <p class="muted" style="font-size:13px;margin:2px 0 8px">${rec.mixNote ? esc(rec.mixNote) + ' ' : ''}The plant only runs when you mix. You keep the mixture right with sliders while the drum turns; if the mix fails, the batch is thrown out. Mixed this month: ${N(done)} of ${N(cap)} ${esc(unit)}.</p>
    ${o.batch && o.batch.drum ? drumHTML(l, o.batch) : ro ? '' : o.batch ? `<div class="btns"><span class="chip warn">Mixer running · ${N(o.batch.qty)} t</span><button class="btn sm gold" data-a="mixOpen" data-lid="${l.id}">Open the mixer</button></div>`
      : `<div class="btns" style="align-items:flex-end"><div class="field" style="margin:0"><label for="mix-qty-${l.id}" style="font-size:12.5px">Tonnes to mix</label><input id="mix-qty-${l.id}" type="number" inputmode="numeric" min="1" max="${max}" step="10" value="${Math.min(100, max)}" style="width:110px" ${max < 1 ? 'disabled' : ''}></div><button class="btn gold" data-a="mixStart" data-lid="${l.id}" ${max < 1 ? 'disabled' : ''}>Mix concrete</button><span class="muted" style="font-size:12.5px;align-self:center">Up to ${N(max)} ${esc(unit)} now · 1 s per ${esc(unit)} at the sliders, then ${O.MIX.drumT} s per ${esc(unit)} in the drum · no staff needed</span></div>${max < 1 && O.mixBlock(l) ? `<p class="down" style="font-size:13px;margin:6px 0 0;font-weight:700">${esc(O.mixBlock(l))}</p>` : ''}`}` : '';
  const host = Object.keys(SITE_CO).find((h) => SITE_CO[h].lid === l.id), asked = host ? E.QT.forPlant(c, l.id).filter((q) => q.status === 'asked').length : 0;
  const orders = host ? (c.deals || []).filter((d) => d.stock && d.lid === l.id && E.DEAL.isLive(d)).length : 0;
  const web = host && !ro ? `<button class="row mco" data-a="web" data-u="${host}/office" style="margin-top:8px"><div class="grow"><b>Website: ${host}</b><span>${asked ? `${asked} new quote request${asked > 1 ? 's' : ''}` : 'No new quote requests'}${orders ? ` · ${orders} order${orders > 1 ? 's' : ''} to deliver` : ''} · prices and the plant office</span></div>${asked || orders ? `<span class="chip warn">${asked + orders}</span>` : ''}<span aria-hidden="true">›</span></button>` : '';
  return `<div class="box" id="yard-box"><h2>Warehouse<small>YARD</small></h2><div class="in">${rows}${mixer}${web}
    <p class="empty" style="font-size:13px">Orders stop at what the yard holds. Buy raw materials under Production &amp; supplies.</p></div></div>`;
}
// companies that make a collectible once a year (CRAFT): vineyard wine in the estate cellar, tuner cars in the workshop garage
function cellarBox(c, l, ro) {
  if (!E.makes(l)) return '';
  const cf = CRAFT[l.type], w = cf.words, wine = cf.cat === 'wine', U = (k) => (k === 1 ? w.unit : w.units), Cap = (t) => t[0].toUpperCase() + t.slice(1);
  const od = E.vintageOdds(c, l), hw = E.harvestWeek(l), yr = Math.floor(c.m / 12), done = l.vintY === yr || c.wk % 48 > hw;
  const when = `${E.monthName(Math.floor(hw / 4))}, Year ${yr + (done ? 2 : 1)}`;
  const groups = {}; (l.cellar || []).forEach((x) => (groups[x.cid] = groups[x.cid] || []).push(x));
  const solo = l.owner.k === 'p';
  const rows = Object.entries(groups).filter(([cid]) => E.LIFE.ITEM[cid]).map(([cid, xs]) => {
    const v = E.LIFE.itemValue(c, cid), free = xs.filter((x) => !x.lot), lots = xs.filter((x) => x.lot), b = (how, uid, label, cls = '') => `<button class="btn sm ${cls}" data-a="cellar" data-lid="${l.id}" data-uid="${uid}" data-v="${how}">${label}</button>`;
    const acts = ro ? '' : `<div class="btns" style="margin-top:6px">${free.length ? b('dealer', free[0].uid, `Sell 1 to ${w.dealer} · ${money(v * LC.dealerBuyback)}`) + (free.length > 1 ? b('dealerAll', free[0].uid, `Sell all ${free.length} · ${money(v * LC.dealerBuyback * free.length)}`) : '') + b('auction', free[0].uid, `Auction 1 ${w.unit} · est. ${money(v)}`, 'gold') + (solo ? b('take', free[0].uid, `Move 1 to my ${w.home}`) : '') : ''}${lots.map((x) => b('withdraw', x.uid, 'Withdraw from auction')).join('')}</div>`;
    const it = E.LIFE.ITEM[cid], note = wine ? E.LIFE.wineWindow(it, c.m / 12) || '' : it.medium || '';
    return `<div class="row" style="align-items:flex-start;gap:12px">${cardHTML(cid, { cls: 'sm', noDelta: true })}<div class="grow"><b>${free.length} ${U(free.length)} in the ${w.place}${lots.length ? ` · ${lots.length} at auction` : ''}</b><span>${money(v)} per ${w.unit} · ${esc(note)}</span>${acts}</div></div>`;
  }).join('');
  const n = (l.cellar || []).length;
  return `<div class="box"><h2>${w.box}<small>${n} ${U(n).toUpperCase()}</small></h2><div class="in">
    <p style="margin:0 0 8px">Next ${w.event}: <b>${when}</b> · ${Math.round(od.chance * 100)}% chance of a collectible ${w.item}${od.heads ? ` (${od.heads} specialist${od.heads > 1 ? 's' : ''} leading: +${Math.round((od.chance - od.base) * 100)}% chance, ${Math.round(od.bump * 100)}% chance of a rarer ${wine ? 'wine' : 'car'}${od.somm.length ? `, with sommelier ${od.somm.map((t) => esc(E.TAL.PERSON[t].name)).join(' and ')}` : ''})` : ''}. Best this ${w.who} can make: ${od.top}.</p>
    ${!wine && cf.spec.models ? `<p class="empty" style="font-size:13px;margin:0 0 8px">Cars this ${w.who} can ${l.type === 'dealer' ? 'get' : 'build'}: ${cf.spec.models.map((m) => `${esc(m.name)} (${m.rar.join(' / ')})`).join(', ')}.</p>` : ''}
    ${rows ? `<div class="rows">${rows}</div>` : `<p class="empty">The ${w.place} is empty. ${w.empty}, ready to sell to the ${w.dealerKind}, put up at the auction house or keep.</p>`}
    <p class="empty" style="font-size:13px">Specialists who lead a department here raise the chance and the rarity${wine ? '; a sommelier raises them most' : ''}. Sales go to the company${solo ? `. ${Cap(w.units)} moved to your ${w.home} can be traded with other players from the Life tab` : ''}.</p>
  </div></div>`;
}
function deptCardRO(l, d) {
  const state = O.deptState(l, d.id), dd = l.ops.depts[d.id];
  return `<article class="dept">${deptHeader(l, d, state, true)}<div class="dept-in"><p class="muted" style="font-size:13.5px">${dd ? `${dd.w} workers · ${Math.round(O.automation(l, d.id) * 100)}% automated${dd.head ? ` · has a head` : ''}` : 'Not opened'}</p></div></article>`;
}
function deptCard(l, d, ui) {
  const o = l.ops, state = O.deptState(l, d.id), dd = o.depts[d.id], p = me();
  if (!dd) return `<article class="dept fold">${deptHeader(l, d, 'closed', true).replace('<header ', `<header data-k="dept:${d.id}" `)}<div class="dept-in"><p>${esc(d.desc)}</p><p class="muted" style="font-size:13px">Without it: ${esc(d.without)}</p><button class="btn navy" data-a="deptOpen" data-lid="${l.id}" data-dept="${d.id}" ${(l.owner.k === 'h' ? city().holdings[l.owner.id].treasury : p.cash) < O.deptOpenCost(l, d.id) ? 'disabled' : ''}>Open department · ${M(O.deptOpenCost(l, d.id))}</button></div></article>`;
  const need = O.needWorkers(l, d.id), a = O.automation(l, d.id);
  // who leads it: the owner, the coop that holds the company, or a co-owner lending a personal specialist
  const c = city(), hq = l.owner.k === 'h' ? c.holdings[l.owner.id] : null, cemp = hq && c.talent ? E.TAL.coopEmp(c, hq) : null;
  const bosses = hq ? [cemp, ...Object.keys(hq.members).map((id) => c.players[id])].filter(Boolean) : [p];
  const lead = d.head && dd.head ? bosses.find((x) => x.assign && x.assign[d.head] && x.assign[d.head].lid === l.id && x.assign[d.head].dept === d.id) : null;
  const tid = lead && lead.team ? lead.team[d.head] : null, tp = tid ? E.TAL.PERSON[tid] : null, ts = tid ? c.talent[tid] : null, hb = Math.round((dd.hb ?? 0.5) * 100);
  const canManage = lead && (lead.id === p.id || lead.coop);
  const face = (id) => (E.TAL.PERSON[id] && E.TAL.PERSON[id].img ? `background-image:url(${faceUrl(id)});background-position:center 20%` : 'background:#2c4a78');
  const cand = (emp) => { const id = emp && emp.team && emp.team[d.head]; return id && c.talent[id] && c.talent[id].owner === emp.id ? id : null; };
  const offerBtn = (emp) => { const id = cand(emp); if (!id) return ''; const away = emp.assign && emp.assign[d.head]; return `<button class="btn sm" data-a="assignHead" data-lid="${l.id}" data-dept="${d.id}" data-spec="${d.head}"${emp.coop ? ` data-coop="${emp.id}"` : ''}>Make ${esc(E.TAL.PERSON[id].name)}${emp.coop ? ' (coop)' : ''} head of ${esc(d.name)}${away ? ' (moves from another company)' : ''}</button>`; };
  const offers = [cemp, p].map(offerBtn).join('');
  const heads = dd.head === 'self' ? selfHeadHTML(l, d, dd) : d.head ? (tp ? `<div class="head"><span class="thumb" style="${face(tid)}"></span><div class="grow"><b>${esc(tp.name)}</b><span>Head of ${esc(d.name)} · +${hb}% automation${lead.coop ? ' · coop' : lead.id !== p.id ? ` · lent by ${esc(lead.name)}` : ''}${ts && ts.leave != null ? ' · on leave' : ''}${ts && ts.stress > 70 ? ' · stressed' : ''}</span></div>${canManage ? `<button class="btn sm" data-a="staff" data-id="${tid}"${lead.coop ? ` data-coop="${lead.id}"` : ''}>Manage</button><button class="btn sm" data-a="unassignHead" data-spec="${d.head}"${lead.coop ? ` data-coop="${lead.id}"` : ''}>Remove</button>` : ''}</div>`
    : offers ? `<div class="btns">${offers}</div>`
    : `<p class="muted" style="font-size:13px">Head: sign a ${esc(STAFF_BY[d.head].role.replace(/^(Junior|Senior) /, ''))} to lead this department. <button class="linkbtn" data-a="web" data-u="apextalent.ab/role/${d.head}">Find one on Apex Talent</button></p>`) : '';
  const settings = d.settings.map((s) => `<div class="set"><span class="cap">${esc(s.label)}</span>${seg('deptSet', `data-lid="${l.id}" data-dept="${d.id}" data-k="${s.k}"`, s.opts, dd.set[s.k] ?? O.setting(l, d.id, s.k))}</div>`).join('');
  const manualAvail = d.manual && a < 1, manualDone = manualAvail && d.manual.id !== 'restock' && O.taskBlock(city(), l, d.manual.id);
  return `<article class="dept">${deptHeader(l, d, state, true)}<div class="dept-in">
    <div class="wk"><div><span class="cap">Workers</span><div class="stepper"><button data-a="workers" data-lid="${l.id}" data-dept="${d.id}" data-v="-1" aria-label="Lay off one" ${dd.w ? '' : 'disabled'}>−</button><output class="num">${dd.w} / ${need}</output><button data-a="workers" data-lid="${l.id}" data-dept="${d.id}" data-v="1" aria-label="Hire one">+</button></div></div>
      <div style="flex:1;min-width:120px"><span class="cap">Automation ${Math.round(a * 100)}%</span><div class="bar"><i style="width:${a * 100}%;background:${a >= 1 ? 'var(--good)' : 'var(--gold)'}"></i></div></div></div>
    <p class="muted" style="font-size:13px">${esc(a >= 1 ? d.auto : d.without)} Hiring costs ${M(WORKER.hireFee)} per worker, wages ${M(WORKER.salary)} a year each.</p>
    ${heads}${dd.head !== 'self' ? selfHeadHTML(l, d, dd) : ''}${settings}
    ${manualAvail ? `<button class="btn${manualDone ? ' done' : ''}" data-a="${d.manual.id === 'restock' ? 'gotoSupplies' : 'scene'}" data-lid="${l.id}" data-task="${d.manual.id}">${esc(d.manual.label)}<span class="muted" style="font-weight:600"> · ${esc(manualDone ? 'Done for this month' : d.manual.note)}</span></button>` : ''}
    ${d.id === 'social' ? adBox(city(), l, false, ui || {}, true) + pressBox(city(), l, false, true) : ''}
    ${d.id !== 'ops' ? `<button class="linkbtn" data-a="deptClose" data-lid="${l.id}" data-dept="${d.id}">Close department</button>` : ''}
  </div></article>`;
}
