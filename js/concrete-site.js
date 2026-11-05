// Bayside Concrete's website (baysideconcrete.ab): prices, quote requests from other tycoons and the plant office.
// Rules live in _shared/quotes.js (QT). Form state survives re-renders in UI.web.qf (request) and UI.web.qo[id] (answers).
import * as E from '../supabase/functions/_shared/engine.js';
import { GOODS, QUOTES, RECIPES, ROADS, CONFIG as GC } from '../supabase/functions/_shared/content.js';
import { city, me, esc, M, K, N, lname, coImg, dur, now } from './util.js';
import { dealCard } from './deals.js';

const QT = E.QT;
export const HOST = 'baysideconcrete.ab';
const pct = (v) => `${Math.round(v * 100)}%`;
const wkTxt = (n) => `${n} week${n === 1 ? '' : 's'}`;
// a game date to the week, and how far away it is in real time
const weekLabel = (g) => `${E.monthName(Math.floor(g * 12)).slice(0, 3)} Y${Math.floor(g) + 1}, week ${(Math.floor(g * 48 + 1e-6) % 4) + 1}`;
const realIn = (g) => { const c = city(); return dur(Math.max(0, (g - E.gameNow(c, now())) * GC.YEAR_MS / c.clock.speed)); };
const whenTxt = (g) => `${weekLabel(g)} · in ${realIn(g)}`;
const nameOf = (pid) => esc((city().players[pid] || {}).name || 'A tycoon');
const what = (q, n) => `${N(n ?? q.qty)} t of ${esc(GOODS[q.g].name.toLowerCase())}`;

function head(u, l, runner, pending) {
  const tabs = [['', 'Home'], ['prices', 'Prices'], ['quote', 'Get a quote'], ['orders', 'My quotes']].concat(runner ? [['office', `Plant office${pending ? ` <i class="bc-n">${pending}</i>` : ''}`]] : []);
  const page = u.path[0] || '';
  return `<header class="bc-head"><a href="#" class="bc-logo" data-a="webGo" data-u="${HOST}"><svg viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="22" width="34" height="14" rx="2" fill="currentColor" opacity=".35"/><path d="M6 22 14 8h12l8 14Z" fill="currentColor"/></svg><span><b>BAYSIDE CONCRETE</b><small>Ready-mix · Harbor Row pier</small></span></a>
    <nav class="bc-nav">${tabs.map(([k, t]) => `<a href="#" class="${page === k ? 'on' : ''}" data-a="webGo" data-u="${HOST}${k ? '/' + k : ''}">${t}</a>`).join('')}</nav></header>`;
}
const closed = (l) => `<div class="bc-card bc-warn"><b>Not taking requests right now.</b><p>${l && l.owner ? 'The plant is run by the city for now.' : 'The plant is for sale.'} Requests open as soon as a tycoon runs it.</p></div>`;

export function concreteSite(u, st, go) {
  const c = city(), p = me(), ctx = E.dctx(c), l = QT.plant(c, ctx, HOST);
  if (!l) return `<div class="bc-wrap"><p>The plant is closed.</p></div>`;
  const runner = !!(p && E.canRun(c, p.id, l)), pending = runner ? QT.forPlant(c, l.id).filter((q) => q.status === 'asked').length : 0;
  const page = u.path[0] || '';
  const body = page === 'prices' ? prices(c, l) : page === 'quote' ? quoteForm(c, l, st) : page === 'orders' ? myQuotes(c, l) : page === 'office' && runner ? office(c, l, st) : home(c, l, ctx);
  return `${head(u, l, runner, pending)}<div class="bc-wrap">${body}</div>`;
}

// ---------------------------------------------------------------- home
function home(c, l, ctx) {
  const g = 'concrete', o = l.ops, stock = Math.floor((o && o.inv[g]) || 0), cap = o ? Math.floor(E.OPS.mixCap(l)) : 0, left = o ? Math.max(0, cap - Math.round(o.mixed || 0)) : 0;
  const from = QT.guide(c, l, g, 1e9), open = QT.taking(ctx, l);
  return `<section class="bc-hero" style="background-image:linear-gradient(90deg, rgba(20,22,26,.88) 0%, rgba(20,22,26,.55) 60%, rgba(20,22,26,.2) 100%), url(${coImg(l)})">
      <small>Bayside Concrete · since the pier was poured</small><h1>Fresh concrete on your site before it sets.</h1>
      <p>Mixed to order on Harbor Row and driven to you in our own mixer trucks. Tell us how much you need and when, and we send you a price.</p>
      <div class="bc-btns"><a href="#" class="bc-btn" data-a="webGo" data-u="${HOST}/quote">Get a quote ›</a><a href="#" class="bc-btn ghost" data-a="webGo" data-u="${HOST}/prices">See prices</a></div></section>
    ${open ? '' : closed(l)}
    <div class="bc-facts"><div><small>In the yard now</small><b>${N(stock)} t</b><span>fresh, ready to ship</span></div><div><small>Can still mix this month</small><b>${N(left)} t</b><span>of ${N(cap)} t a month</span></div><div><small>Price from</small><b>${K(from)}</b><span>per tonne, before delivery</span></div><div><small>Orders</small><b>${QUOTES.minQty}–${N(QUOTES.maxQty)} t</b><span>delivered within ${QUOTES.maxWeeks} weeks</span></div></div>
    <div class="bc-cols"><div class="bc-card"><h3>Bayside Standard Mix</h3><p>General-purpose structural concrete for foundations, floors and frames.</p>
      <div class="bc-l"><span>Mix by weight</span><b>1 cement : 2 sand : 4 gravel : ½ water</b></div><div class="bc-l"><span>Workable for</span><b>${Math.round(GOODS.concrete.fresh / 3600000)} hours after mixing</b></div><div class="bc-l"><span>Delivery</span><b>Our own mixer trucks, anywhere in the city</b></div><div class="bc-l"><span>Payment</span><b>Held until the concrete is on site</b></div></div>
    <div class="bc-card"><h3>How ordering works</h3><ol class="bc-steps"><li><b>Ask for a quote.</b> Say how much you need, the least you will take and when it must be there.</li><li><b>Get a price.</b> The plant answers within ${wkTxt(QUOTES.answerWeeks)} with an amount, a price and a date.</li><li><b>Accept it.</b> Your money is held, not paid, until the concrete arrives.</li><li><b>We mix and pour.</b> Delivered by the date, or you get your money back.</li></ol></div></div>`;
}

// ---------------------------------------------------------------- prices
function prices(c, l) {
  const g = 'concrete', list = QT.listPrice(c, l, g), mk = c.market[g] ? c.market[g].p : GOODS[g].base, tiers = [[QUOTES.minQty, 0]].concat(QUOTES.tiers);
  const rows = tiers.map(([n, d], i) => { const next = tiers[i + 1]; return `<tr><td>${N(n)}${next ? `–${N(next[0] - 1)}` : '+'} t</td><td>${d ? `−${pct(d)}` : 'List price'}</td><td><b>${K(QT.guide(c, l, g, n))}</b> per t</td></tr>`; }).join('');
  const ex = [50, 250, 1000].map((q) => { const pr = QT.guide(c, l, g, q), f = QT.fee(g, q, pr); return `<tr><td>${N(q)} t</td><td>${M(q * pr)}</td><td>${M(f)}</td><td><b>${M(q * pr + f)}</b></td></tr>`; }).join('');
  return `<h2 class="bc-h">Prices</h2><p class="bc-sub">Guide prices for Bayside Standard Mix. The final price is in your quote.</p>
    <div class="bc-cols"><div class="bc-card"><h3>Per tonne</h3><table class="bc-t"><thead><tr><th>Order</th><th>Discount</th><th>Price</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="bc-small">City market today: ${K(mk)} per t, but market concrete may be days old. Ours is mixed for you.</p></div>
    <div class="bc-card"><h3>Examples with delivery</h3><table class="bc-t"><thead><tr><th>Amount</th><th>Concrete</th><th>Delivery</th><th>Total</th></tr></thead><tbody>${ex}</tbody></table>
      <p class="bc-small">Delivery is by our own mixer trucks, priced between Ridgeway and Harborline freight. Nothing to book yourself.</p></div></div>
    <div class="bc-card"><h3>Good to know</h3><div class="bc-l"><span>Smallest order</span><b>${QUOTES.minQty} t</b></div><div class="bc-l"><span>Largest order</span><b>${N(QUOTES.maxQty)} t</b></div><div class="bc-l"><span>Delivery date</span><b>1 to ${QUOTES.maxWeeks} weeks ahead (1 week ≈ ${realIn(E.gameNow(c, now()) + 1 / 48)})</b></div><div class="bc-l"><span>Quotes are answered within</span><b>${wkTxt(QUOTES.answerWeeks)}</b></div><div class="bc-l"><span>A quote stands for</span><b>${wkTxt(QUOTES.acceptWeeks)}</b></div><div class="bc-l"><span>Concrete sets</span><b>${Math.round(GOODS.concrete.fresh / 3600000)} hours after mixing</b></div></div>
    <div class="bc-btns"><a href="#" class="bc-btn" data-a="webGo" data-u="${HOST}/quote">Get a quote ›</a></div>`;
}

// ---------------------------------------------------------------- the request form
export const buyerCos = (c, pid) => E.DEAL.buyerCompanies(c, E.dctx(c), pid, 'concrete');
function quoteForm(c, l, st) {
  const p = me(), ctx = E.dctx(c), g = 'concrete';
  if (!QT.taking(ctx, l)) return `<h2 class="bc-h">Get a quote</h2>${closed(l)}`;
  const cos = buyerCos(c, p.id);
  if (!cos.length) return `<h2 class="bc-h">Get a quote</h2><div class="bc-card"><p><b>We deliver to companies that build with concrete.</b> None of yours does yet. A construction company uses it for every project.</p></div>`;
  const f = (st.qf = st.qf || {}), co = cos.find((x) => x.id === f.co) || cos[0];
  const qty = Math.max(QUOTES.minQty, Math.min(QUOTES.maxQty, Math.round(Number(f.qty) || 100))), min = Math.max(1, Math.min(qty, Math.round(Number(f.min) || qty))), wk = Math.max(1, Math.min(QUOTES.maxWeeks, Math.round(Number(f.wk) || 2)));
  const pr = QT.guide(c, l, g, qty), fee = QT.fee(g, qty, pr), gNow = E.gameNow(c, now());
  const use = RECIPES[co.type].in[g] || 0, need = use ? `${esc(lname(co))} uses about ${N(use * E.OPS.capacity(co))} t a month.` : '';
  return `<h2 class="bc-h">Get a quote</h2><p class="bc-sub">Tell us what you need. Whoever runs the plant answers within ${wkTxt(QUOTES.answerWeeks)}.</p>
    <div class="bc-cols"><div class="bc-card bc-form">
      <span class="bc-lab">Deliver to</span><div class="bc-seg" role="group">${cos.map((x) => `<button data-a="qfSet" data-k="co" data-v="${x.id}" aria-pressed="${x.id === co.id}">${esc(lname(x))}<small>${esc(x.district)}</small></button>`).join('')}</div>
      ${need ? `<p class="bc-small">${need}</p>` : ''}
      <div class="bc-row2"><label>Amount you need<span><input type="number" inputmode="numeric" data-qf="qty" min="${QUOTES.minQty}" max="${QUOTES.maxQty}" step="10" value="${qty}"> t</span></label>
      <label>Least you will take<span><input type="number" inputmode="numeric" data-qf="min" min="1" max="${qty}" step="10" value="${min}"> t</span></label></div>
      <label>Delivered by<select data-qf="wk">${Array.from({ length: QUOTES.maxWeeks }, (_, i) => i + 1).map((n) => `<option value="${n}" ${n === wk ? 'selected' : ''}>${wkTxt(n)} · ${weekLabel(gNow + n / 48)} · in ${realIn(gNow + n / 48)}</option>`).join('')}</select></label>
      <label>Note for the plant <em>(optional)</em><input type="text" data-qf="note" maxlength="160" value="${esc(f.note || '')}" placeholder="E.g. foundations for the new hotel wing"></label>
      <button class="bc-btn" data-a="quoteAsk" data-co="${co.id}">Send request</button></div>
    <div class="bc-card"><h3>Your estimate</h3><div class="bc-l"><span>${N(qty)} t at ${K(pr)}${QT.discount(qty) ? ` (−${pct(QT.discount(qty))})` : ''}</span><b>${M(qty * pr)}</b></div><div class="bc-l"><span>Delivery by mixer truck</span><b>${M(fee)}</b></div><div class="bc-l tot"><span>Estimate</span><b>${M(qty * pr + fee)}</b></div>
      <p class="bc-small">Guide prices only. The plant may offer a different amount (at least ${N(min)} t), price or date. Nothing is paid until you accept a quote, and then the money is held until the concrete is on site.</p></div></div>`;
}

// ---------------------------------------------------------------- the buyer's quotes
const qHead = (c, q, buyer) => { const bl = E.listing(c, q.blid); return `<div class="bc-qh"><b>${what(q)}${buyer ? '' : ` for ${q.npc ? esc(ROADS.name) : nameOf(q.to)}`}</b><span>${buyer ? '' : `To ${esc(q.npc ? `road works in ${q.place}` : bl ? `${lname(bl)} in ${bl.district}` : 'their company')} · `}at least ${N(q.min)} t · by ${esc(weekLabel(q.when))}</span>${q.note ? `<em>“${esc(q.note)}”</em>` : ''}</div>`; };
function quoteRow(c, q, buyer) {
  const o = q.offer, d = q.deal && (c.deals || []).find((x) => x.id === q.deal), head = qHead(c, q, buyer);
  if (q.status === 'asked') return `<div class="bc-q">${head}<div class="bc-qs"><span class="bc-chip">Waiting for a quote</span>${buyer ? `<button class="bc-btn sm ghost" data-a="quoteCancel" data-id="${q.id}">Withdraw</button>` : ''}</div></div>`;
  if (q.status === 'quoted') {
    const late = o.when > q.when + 1e-6, tot = QT.total(o);
    return `<div class="bc-q hot">${head}<div class="bc-offer"><div class="bc-l"><span>Offer from ${nameOf(o.by)}</span><b>${N(o.qty)} t at ${K(o.price)}</b></div><div class="bc-l"><span>Delivery</span><b>${M(o.fee)} · by ${esc(weekLabel(o.when))}${late ? ' <i class="bc-late">later than asked</i>' : ''}</b></div><div class="bc-l tot"><span>Total</span><b>${M(tot)}</b></div>${o.note ? `<em>“${esc(o.note)}”</em>` : ''}</div>
      ${buyer ? `<div class="bc-btns"><button class="bc-btn" data-a="quoteAccept" data-id="${q.id}">Accept · ${M(tot)} held</button><button class="bc-btn ghost" data-a="quoteDecline" data-id="${q.id}">Decline</button><span class="bc-small">Stands until ${esc(weekLabel(o.at + QUOTES.acceptWeeks / 48))}</span></div>` : '<div class="bc-qs"><span class="bc-chip">Waiting for the buyer</span></div>'}</div>`;
  }
  if (q.status === 'ordered' && d) return `<div class="bc-q">${head}${dealCard(d)}</div>`;
  const label = { refused: 'Turned down', withdrawn: 'Withdrawn', declined: 'Quote declined', expired: 'Ran out of time' }[q.status] || 'Closed';
  return `<div class="bc-q done">${head}<div class="bc-qs"><span class="bc-chip">${label}</span></div></div>`;
}
function myQuotes(c, l) {
  const p = me(), list = QT.mineAsBuyer(c, p.id).slice().reverse();
  return `<h2 class="bc-h">My quotes</h2><p class="bc-sub">Your requests, the plant's offers and orders on their way.</p>
    ${list.length ? list.map((q) => quoteRow(c, q, true)).join('') : `<div class="bc-card"><p>No requests yet. <a href="#" data-a="webGo" data-u="${HOST}/quote">Ask for a quote ›</a></p></div>`}`;
}

// ---------------------------------------------------------------- the plant office (for whoever runs the plant)
function office(c, l, st) {
  const g = 'concrete', list = QT.forPlant(c, l.id), asked = list.filter((q) => q.status === 'asked'), quoted = list.filter((q) => q.status === 'quoted');
  const orders = (c.deals || []).filter((d) => d.stock && d.lid === l.id && E.DEAL.isLive(d)).sort((a, b) => a.due - b.due), stock = Math.floor(l.ops.inv[g] || 0), gNow = E.gameNow(c, now());
  const qo = (st.qo = st.qo || {}), lp = QT.listPrice(c, l, g);
  const roads = (q) => { const f = QT.fee(g, q.qty, q.price), tot = q.qty * q.price + f;
    return `<div class="bc-q hot">${qHead(c, q, false)}<div class="bc-offer"><div class="bc-l"><span>Regular client · fixed price (mixing cost + ${Math.round((ROADS.markup - 1) * 100)}%)</span><b>${N(q.qty)} t at ${K(q.price)}</b></div><div class="bc-l"><span>Delivery</span><b>${M(f)}</b></div><div class="bc-l tot"><span>Paid on delivery</span><b>${M(tot)}</b></div></div>
      <div class="bc-btns"><button class="bc-btn" data-a="quoteOffer" data-id="${q.id}">Take the order</button><button class="bc-btn ghost" data-a="quoteRefuse" data-id="${q.id}">Turn down</button><span class="bc-small">${wkTxt(Math.max(0, Math.ceil((q.at + QUOTES.answerWeeks / 48 - c.g) * 48)))} to answer</span></div></div>`; };
  const form = (q) => { if (q.npc) return roads(q); const f = (qo[q.id] = qo[q.id] || {}), qty = Math.max(q.min, Math.min(q.qty, Math.round(Number(f.qty) || q.qty))), price = Number(f.price) || Math.round(QT.guide(c, l, g, qty) * 1e5) / 100;
    const wkAsk = Math.max(1, Math.min(QUOTES.maxWeeks, Math.round((q.when - gNow) * 48))), wk = Math.max(1, Math.min(QUOTES.maxWeeks, Math.round(Number(f.wk) || wkAsk))), fee = QT.fee(g, qty, price / 1000);
    return `<div class="bc-q hot">${qHead(c, q, false)}
      <div class="bc-oform"><label>Amount<span><input type="number" data-qo="${q.id}:qty" min="${q.min}" max="${q.qty}" step="10" value="${qty}"> t</span></label><label>Price per t<span><input type="number" data-qo="${q.id}:price" step="0.1" value="${price}"> k</span></label>
      <label>Deliver within<select data-qo="${q.id}:wk">${Array.from({ length: QUOTES.maxWeeks }, (_, i) => i + 1).map((n) => `<option value="${n}" ${n === wk ? 'selected' : ''}>${wkTxt(n)}${n === wkAsk ? ' (asked)' : ''}</option>`).join('')}</select></label></div>
      <p class="bc-small">${N(qty)} t × ${price} k + ${M(fee)} delivery = <b>${M(qty * price / 1000 + fee)}</b>. You have ${wkTxt(Math.max(0, Math.ceil((q.at + QUOTES.answerWeeks / 48 - c.g) * 48)))} to answer.</p>
      <div class="bc-btns"><button class="bc-btn" data-a="quoteOffer" data-id="${q.id}">Send quote</button><button class="bc-btn ghost" data-a="quoteRefuse" data-id="${q.id}">Turn down</button></div></div>`; };
  return `<h2 class="bc-h">Plant office</h2><p class="bc-sub">Only the people running the plant see this page. In the yard: <b>${N(stock)} t</b> fresh concrete. <a href="#" data-a="company" data-lid="${l.id}">Open the plant to mix ›</a></p>
    <div class="bc-card"><h3>List price</h3><div class="bc-btns" style="align-items:flex-end"><label>Per tonne<span><input type="number" id="bc-list" step="0.1" value="${Math.round(lp * 1e5) / 100}"> k</span></label><button class="bc-btn sm" data-a="quoteList">Save</button></div>
      <p class="bc-small">Shown on the site with volume discounts (${QUOTES.tiers.map(([n, d]) => `−${pct(d)} from ${N(n)} t`).join(', ')}). Quotes start from it.</p></div>
    <h3 class="bc-h3">Orders to deliver (${orders.length})</h3>${orders.length ? orders.map((d) => `<div class="bc-q">${dealCard(d)}<p class="bc-small">Due by ${esc(whenTxt(d.due))}. Concrete sets ${Math.round(GOODS[g].fresh / 3600000)} hours after mixing, so mix it shortly before you deliver.</p></div>`).join('') : '<p class="bc-small">No orders waiting.</p>'}
    <h3 class="bc-h3">New requests (${asked.length})</h3>${asked.length ? asked.map(form).join('') : '<p class="bc-small">No new requests.</p>'}
    ${quoted.length ? `<h3 class="bc-h3">Quotes sent (${quoted.length})</h3>${quoted.map((q) => quoteRow(c, q, false)).join('')}` : ''}`;
}
