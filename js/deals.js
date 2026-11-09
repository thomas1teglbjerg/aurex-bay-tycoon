// Direct sales between tycoons: offer goods from a company to a contact, answer an offer, deliver it yourself.
// Rules live in _shared/deals.js. UI state: UI.deal[id] = { co, how } (the buyer's picks), UI.modal for a new offer.
import * as E from '../supabase/functions/_shared/engine.js';
import { GOODS, CARRIERS, DEALS, ROADS } from '../supabase/functions/_shared/content.js';
import { city, me, esc, M, K, N, lname } from './util.js';
import { cicon } from './freight.js';

const D = E.DEAL;
export const DUI = { deal: {}, run: {} }; // the buyer's and seller's picks per deal, until they press the button
const daysTxt = (a, b) => (a === b ? `${a}d` : `${a}–${b}d`);
const what = (d) => `${N(d.qty)} ${esc(GOODS[d.g].unit)} of ${esc(GOODS[d.g].name.toLowerCase())}`;
const nameOf = (pid) => esc((city().players[pid] || {}).name || 'A tycoon');
const toOf = (d) => (d.npc ? esc(ROADS.name) : nameOf(d.to));
const weeksLeft = (d) => Math.max(0, Math.ceil((d.due - city().g) * 48));
const coopMate = (c, a, b) => Object.values(c.holdings || {}).some((h) => h.members[a] && h.members[b]);

// carrier buttons with the freight for this deal, plus "the seller delivers" for the buyer
function carriers(d, action, cur, self) {
  return `<div class="carriers ${self ? 'c4' : ''}" role="group" aria-label="Delivery">${CARRIERS.map((cr) => { const f = D.quote(d, cr.id);
    return `<button class="carrier" data-a="${action}" data-id="${d.id}" data-v="${cr.id}" aria-pressed="${cur === cr.id}" style="--cc:${cr.color}"><span class="cn">${cicon(cr, 14)} ${esc(cr.short)}</span><span class="cq">${M(f.cost)} · ${daysTxt(f.minDays, f.maxDays)}</span></button>`; }).join('')}
    ${self ? `<button class="carrier" data-a="${action}" data-id="${d.id}" data-v="self" aria-pressed="${cur === 'self'}" style="--cc:#8a6d1f"><span class="cn">✋ Seller delivers</span><span class="cq">${M(D.fee(d))} · as soon as possible</span></button>` : ''}</div>`;
}

// the seller's own delivery: a short drive across the city, then the goods are in the buyer's stock
export const RUN_S = 10;
const RUN_LINES = (d, sl, bl) => [
  ['You', `Loading ${what(d)} into the van at ${sl ? esc(lname(sl)) : 'the company'}.`],
  ['Dispatcher', `Route is clear through ${bl ? esc(bl.district) : 'the city'}. Go.`],
  ['You', 'On the road. Traffic is light.'],
  [bl ? esc(lname(bl)) : 'Buyer', `Pull up at the back door, we will sign for it.`]];
export function deliveryRun(d) {
  const c = city(), sl = E.listing(c, d.lid), bl = E.listing(c, d.blid), t = Math.min(1, (Date.now() - DUI.run[d.id]) / (RUN_S * 1000));
  const lines = RUN_LINES(d, sl, bl), shown = Math.max(1, Math.min(lines.length, Math.ceil(t * lines.length))), cols = ['#8a6d1f', '#2f6fb0'];
  const bubs = lines.slice(Math.max(0, shown - 2), shown).map(([n, x], j) => { const i = Math.max(0, shown - 2) + j; return `<div class="bub ${i % 2 ? 'r' : ''}"><span class="av" style="background:${cols[i % 2]};--avc:${cols[i % 2]}">${esc(n[0])}</span><div><b>${n}</b><p>${x}</p></div></div>`; }).join('');
  return `<div class="iscene run" data-dealrun="${d.id}" style="--tint:#8a6d1f"><div class="is-head"><span class="is-ic">🚚</span><div class="grow"><b>Delivering ${what(d)}</b><span>To ${toOf(d)} · ${bl ? esc(lname(bl)) : d.place ? `road works in ${esc(d.place)}` : ''}</span></div><span class="chip">${t >= 1 ? 'Arriving' : `${Math.ceil(RUN_S * (1 - t))} s`}</span></div>
    <div class="bar is-bar"><i style="width:${(t * 100).toFixed(1)}%"></i></div><div class="bubs" aria-live="polite">${bubs}</div></div>`;
}
// one deal, from where you stand: buyer or seller
export function dealCard(d, ui = DUI) {
  const c = city(), p = me(), sl = E.listing(c, d.lid), st = (ui.deal && ui.deal[d.id]) || {};
  if (d.to === p.id && d.status === 'open') {
    const cos = D.buyerCompanies(c, E.dctx(c), p.id, d.g), co = cos.find((l) => l.id === st.co) || cos[0], how = st.how || 'self';
    const f = how === 'self' ? null : D.quote(d, how), cost = D.total(d) + (f ? f.cost : D.fee(d));
    return `<div class="deal"><div class="deal-h"><b>${nameOf(d.from)} offers ${what(d)}</b><span>${K(d.price)} each · ${M(D.total(d))} · from ${esc(sl ? lname(sl) : '')} · answer within ${weeksLeft(d)} wk</span></div>
      ${cos.length ? `<span class="cap">Deliver to</span><div class="seg" role="group">${cos.map((l) => `<button data-a="dealCo" data-id="${d.id}" data-v="${l.id}" aria-pressed="${co && co.id === l.id}">${esc(lname(l))} · ${esc(l.district)}</button>`).join('')}</div>
      <span class="cap">How it travels</span>${carriers(d, 'dealHow', how, true)}
      <p class="empty" style="font-size:13px">${how === 'self' ? `${nameOf(d.from)} gets a mail and delivers it in person as soon as possible for ${M(D.fee(d))}. Your ${M(cost)} is held until it is there, and comes back if nothing is sent within ${DEALS.deliverWeeks} weeks.` : `You pay the goods and the freight now. The seller is paid at once.`}</p>
      <div class="btns"><button class="btn gold" data-a="dealAccept" data-id="${d.id}" data-co="${co.id}" data-how="${how}">Buy · ${M(cost)}</button><button class="btn" data-a="dealDecline" data-id="${d.id}">Decline</button></div>`
      : `<p class="empty">None of your companies uses ${esc(GOODS[d.g].name.toLowerCase())}.</p><div class="btns"><button class="btn" data-a="dealDecline" data-id="${d.id}">Decline</button></div>`}</div>`;
  }
  if (d.from === p.id && d.status === 'deliver') {
    const bl = E.listing(c, d.blid);
    if (DUI.run[d.id]) return deliveryRun(d);
    return `<div class="deal urgent"><div class="deal-h"><b>Deliver ${what(d)} to ${toOf(d)}</b><span>To ${bl ? `${esc(lname(bl))} in ${esc(bl.district)}` : d.place ? `the road works in ${esc(d.place)}` : ''} · ${M(d.paid)} is yours when it is there (incl. ${M(d.fee || 0)} delivery) · ${weeksLeft(d)} wk left</span></div>
      ${d.stock ? (() => { const have = Math.floor((sl && sl.ops && sl.ops.inv[d.g]) || 0); return have >= d.qty ? `<div class="btns"><button class="btn gold" data-a="dealDeliver" data-id="${d.id}">Deliver it yourself · takes ${RUN_S} seconds</button><span class="muted" style="font-size:12.5px;align-self:center">${N(have)} ${esc(GOODS[d.g].unit)} in stock</span></div>`
        : `<p class="down" style="font-size:13px;font-weight:700;margin:4px 0">Only ${N(have)} ${esc(GOODS[d.g].unit)} in stock. Make ${N(d.qty - have)} more first${sl ? `: <a href="#" data-a="company" data-lid="${sl.id}">open ${esc(lname(sl))} ›</a>` : '.'}</p>`; })()
      : `<div class="btns"><button class="btn gold" data-a="dealDeliver" data-id="${d.id}">Deliver it yourself · takes ${RUN_S} seconds</button></div>`}</div>`;
  }
  if (d.to === p.id && d.status === 'deliver') return `<div class="deal"><div class="deal-h"><b>Waiting for ${nameOf(d.from)} to deliver ${what(d)}</b><span>${M(d.paid)} held · ${d.stock ? `${esc(sl ? lname(sl) : 'The seller')} mixes and delivers it` : `${nameOf(d.from)} delivers it in person as soon as they can`} · money back if nothing is sent within ${weeksLeft(d)} wk</span></div></div>`;
  if (d.from === p.id && d.status === 'open') return `<div class="deal"><div class="deal-h"><b>Offer to ${nameOf(d.to)}: ${what(d)}</b><span>${K(d.price)} each · ${M(D.total(d))} · waiting for an answer, ${weeksLeft(d)} wk left</span></div><div class="btns"><button class="btn sm" data-a="dealWithdraw" data-id="${d.id}">Withdraw</button></div></div>`;
  const label = { delivered: 'Delivered by the seller', shipped: `Sent with ${(E.LOG.CARRIER[d.carrier] || {}).name || 'a carrier'}`, declined: 'Declined', withdrawn: 'Withdrawn', expired: 'No answer in time', lapsed: 'Not delivered in time: refunded' }[d.status] || d.status;
  return `<div class="deal done"><div class="deal-h"><b>${d.from === p.id ? `To ${toOf(d)}` : `From ${nameOf(d.from)}`}: ${what(d)}</b><span>${label} · ${M(D.total(d))}</span></div></div>`;
}

// Empire › To do: everything you have to answer or deliver, and your own open offers
export function dealsToDo(ui = DUI) {
  const c = city(), p = me(), list = D.mine(c, p.id);
  const order = (d) => (d.from === p.id && d.status === 'deliver' ? 0 : d.to === p.id && d.status === 'open' ? 1 : 2);
  return list.sort((a, b) => order(a) - order(b)).map((d) => dealCard(d, ui)).join('');
}
export const dealsNeedingMe = () => { const c = city(), p = me(); return D.mine(c, p.id).filter((d) => (d.to === p.id && d.status === 'open') || (d.from === p.id && d.status === 'deliver')).length; };

// the modal: offer goods from this company to a contact
export function newDealHTML(st) {
  const c = city(), p = me(), l = E.listing(c, st.lid), g = st.g, have = Math.floor((l && l.ops && l.ops.inv[g]) || 0);
  const ids = E.dealContacts(c, p.id), [lo, hi] = D.priceRange(g), mk = c.market[g].p, price = st.price ?? Math.round(mk * 1000 * 10) / 10;
  const qty = Math.max(1, Math.min(have, st.qty || have)), to = ids.includes(st.to) ? st.to : ids[0], d = { g, qty, price: price / 1000 };
  return `<article class="sheet"><span class="cap">Sell to a contact</span><h2 style="margin:2px 0 4px">${esc(GOODS[g].name)} from ${esc(lname(l))}</h2>
    <p class="empty" style="font-size:13.5px">${N(have)} ${esc(GOODS[g].unit)} in stock · market ${K(mk)} · import ${K(E.OPS.importPrice(c, g))}. The goods are put aside while the offer is open.</p>
    ${ids.length ? `<span class="cap">Buyer</span><div class="seg" role="group" style="flex-wrap:wrap">${ids.map((id) => `<button data-a="dealTo" data-v="${id}" aria-pressed="${id === to}">${nameOf(id)}${coopMate(c, p.id, id) ? ' · co-owner' : ''}</button>`).join('')}</div>
    <div class="btns" style="align-items:center"><span class="cap">Units</span><div class="stepper"><button data-a="dealQty" data-v="-1" aria-label="Fewer">−</button><output class="num">${qty}</output><button data-a="dealQty" data-v="1" aria-label="More">+</button></div>${[5, 10, 50].filter((n) => n < have).map((n) => `<button class="btn sm" data-a="dealQtySet" data-v="${n}">${n}</button>`).join('')}<button class="btn sm" data-a="dealQtySet" data-v="${have}">All</button></div>
    <div class="field"><label for="dl-price">Your price per ${esc(GOODS[g].unit.replace(/s$/, ''))}, in k</label><input id="dl-price" type="number" inputmode="decimal" step="0.1" min="${lo * 1000}" max="${hi * 1000}" value="${price}"></div>
    <p class="empty" style="font-size:13px">Allowed ${K(lo)} to ${K(hi)}. The buyer picks one of their companies and either a carrier (they pay the freight) or lets you deliver it yourself as soon as possible for ${M(D.fee(d))}, paid to you. Unanswered offers come back after ${DEALS.openWeeks} weeks.</p>
    <button class="btn gold" data-a="dealSend" data-lid="${l.id}" data-g="${g}" data-q="${qty}" data-to="${to}" ${have < 1 ? 'disabled' : ''}>Send offer</button>`
    : '<p class="empty">Nobody to sell to yet. Add tycoons to your network, or share a parent company with a co-owner.</p>'}</article>`;
}

// the modal: move a supply from this company to another of your own companies (or your warehouse) with your own truck
export function moveHTML(st) {
  const c = city(), p = me(), l = E.listing(c, st.lid), g = st.g, have = Math.floor((l && l.ops && l.ops.inv[g]) || 0);
  const ts = E.moveTargets(c, p.id, l, g), key = (t) => (t.k === 'w' ? 'w:' + t.id : t.id), t = ts.find((x) => key(x) === st.to) || ts.find((x) => x.room >= 1) || ts[0];
  const max = t ? Math.min(have, t.room) : 0, qty = Math.max(1, Math.min(max || 1, st.qty || max || 1));
  const tname = (x) => (x.k === 'w' ? `${esc(E.LOG.SITE[x.id].name)} · warehouse` : esc(lname(E.listing(c, x.id))));
  return `<article class="sheet"><span class="cap">Move to your own company</span><h2 style="margin:2px 0 4px">${esc(GOODS[g].name)} from ${esc(lname(l))}</h2>
    <p class="empty" style="font-size:13.5px">${N(have)} ${esc(GOODS[g].unit)} in stock. Your own truck drives it over: no price, no freight.${GOODS[g].fresh ? ' Fresh goods do not go to a warehouse.' : ''}</p>
    ${ts.length ? `<span class="cap">To</span><div class="seg" role="group" style="flex-wrap:wrap">${ts.map((x) => `<button data-a="moveTo" data-v="${key(x)}" aria-pressed="${t === x}" ${x.room < 1 ? 'disabled' : ''}>${tname(x)} · ${x.room < 1 ? 'full' : `${x.days} d`}</button>`).join('')}</div>
    <div class="btns" style="align-items:center"><span class="cap">${esc(GOODS[g].unit)}</span><div class="stepper"><button data-a="moveQty" data-v="-10" aria-label="Fewer">−</button><output class="num">${qty}</output><button data-a="moveQty" data-v="10" aria-label="More">+</button></div>${[10, 50, 100].filter((n) => n < max).map((n) => `<button class="btn sm" data-a="moveQtySet" data-v="${n}">${n}</button>`).join('')}<button class="btn sm" data-a="moveQtySet" data-v="${max}">All${t && t.room < have ? ' that fits' : ''}</button></div>
    <p class="empty" style="font-size:13px">${t ? `Arrives in about ${t.days} game days.${t.room < Infinity && t.room < have ? ` Room for ${N(t.room)} ${esc(GOODS[g].unit)} there.` : ''}` : ''}</p>
    <button class="btn gold" data-a="moveSend" data-lid="${l.id}" data-g="${g}" data-q="${qty}" data-to="${t ? key(t) : ''}" ${have < 1 || !t || t.room < 1 ? 'disabled' : ''}>Send truck</button>`
    : `<p class="empty">None of your other companies uses ${esc(GOODS[g].name.toLowerCase())}${l.owner.k === 'p' && !GOODS[g].fresh ? ', and you have no warehouse' : ''}.</p>`}</article>`;
}
