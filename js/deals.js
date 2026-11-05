// Direct sales between tycoons: offer goods from a company to a contact, answer an offer, deliver it yourself.
// Rules live in _shared/deals.js. UI state: UI.deal[id] = { co, how } (the buyer's picks), UI.modal for a new offer.
import * as E from '../supabase/functions/_shared/engine.js';
import { GOODS, CARRIERS, DEALS } from '../supabase/functions/_shared/content.js';
import { city, me, esc, M, K, N, lname } from './util.js';
import { cicon } from './freight.js';

const D = E.DEAL;
export const DUI = { deal: {} }; // the buyer's and seller's picks per deal, until they press the button
const daysTxt = (a, b) => (a === b ? `${a}d` : `${a}–${b}d`);
const what = (d) => `${N(d.qty)} ${esc(GOODS[d.g].unit)} of ${esc(GOODS[d.g].name.toLowerCase())}`;
const nameOf = (pid) => esc((city().players[pid] || {}).name || 'A tycoon');
const weeksLeft = (d) => Math.max(0, Math.ceil((d.due - city().g) * 48));
const coopMate = (c, a, b) => Object.values(c.holdings || {}).some((h) => h.members[a] && h.members[b]);

// carrier buttons with the freight for this deal, plus "the seller delivers" for the buyer
function carriers(d, action, cur, self) {
  return `<div class="carriers ${self ? 'c4' : ''}" role="group" aria-label="Delivery">${CARRIERS.map((cr) => { const f = D.quote(d, cr.id);
    return `<button class="carrier" data-a="${action}" data-id="${d.id}" data-v="${cr.id}" aria-pressed="${cur === cr.id}" style="--cc:${cr.color}"><span class="cn">${cicon(cr, 14)} ${esc(cr.short)}</span><span class="cq">${M(f.cost)} · ${daysTxt(f.minDays, f.maxDays)}</span></button>`; }).join('')}
    ${self ? `<button class="carrier" data-a="${action}" data-id="${d.id}" data-v="self" aria-pressed="${cur === 'self'}" style="--cc:#8a6d1f"><span class="cn">✋ Seller delivers</span><span class="cq">${M(D.fee())} · as soon as possible</span></button>` : ''}</div>`;
}

// one deal, from where you stand: buyer or seller
export function dealCard(d, ui = DUI) {
  const c = city(), p = me(), sl = E.listing(c, d.lid), st = (ui.deal && ui.deal[d.id]) || {};
  if (d.to === p.id && d.status === 'open') {
    const cos = D.buyerCompanies(c, E.dctx(c), p.id, d.g), co = cos.find((l) => l.id === st.co) || cos[0], how = st.how || 'self';
    const f = how === 'self' ? null : D.quote(d, how), cost = D.total(d) + (f ? f.cost : D.fee());
    return `<div class="deal"><div class="deal-h"><b>${nameOf(d.from)} offers ${what(d)}</b><span>${K(d.price)} each · ${M(D.total(d))} · from ${esc(sl ? lname(sl) : '')} · answer within ${weeksLeft(d)} wk</span></div>
      ${cos.length ? `<span class="cap">Deliver to</span><div class="seg" role="group">${cos.map((l) => `<button data-a="dealCo" data-id="${d.id}" data-v="${l.id}" aria-pressed="${co && co.id === l.id}">${esc(lname(l))} · ${esc(l.district)}</button>`).join('')}</div>
      <span class="cap">How it travels</span>${carriers(d, 'dealHow', how, true)}
      <p class="empty" style="font-size:13px">${how === 'self' ? `${nameOf(d.from)} gets a mail and drives it over as soon as possible for ${M(D.fee())}. Your ${M(cost)} is held until it leaves, and comes back if nothing is sent within ${DEALS.deliverWeeks} weeks.` : `You pay the goods and the freight now. The seller is paid at once.`}</p>
      <div class="btns"><button class="btn gold" data-a="dealAccept" data-id="${d.id}" data-co="${co.id}" data-how="${how}">Buy · ${M(cost)}</button><button class="btn" data-a="dealDecline" data-id="${d.id}">Decline</button></div>`
      : `<p class="empty">None of your companies uses ${esc(GOODS[d.g].name.toLowerCase())}.</p><div class="btns"><button class="btn" data-a="dealDecline" data-id="${d.id}">Decline</button></div>`}</div>`;
  }
  if (d.from === p.id && d.status === 'deliver') {
    const bl = E.listing(c, d.blid), sl2 = E.listing(c, d.lid), days = bl && sl2 ? Math.max(1, Math.round(E.LOG.truckDays(sl2, bl))) : 1;
    return `<div class="deal urgent"><div class="deal-h"><b>Deliver ${what(d)} to ${nameOf(d.to)}</b><span>To ${esc(bl ? lname(bl) : '')}${bl ? ` in ${esc(bl.district)}` : ''} · ${M(d.paid)} is yours when it leaves (incl. ${M(d.fee || 0)} delivery) · ${weeksLeft(d)} wk left</span></div>
      <div class="btns"><button class="btn gold" data-a="dealDeliver" data-id="${d.id}">Deliver now in your own truck · about ${days} day${days > 1 ? 's' : ''}</button></div></div>`;
  }
  if (d.to === p.id && d.status === 'deliver') return `<div class="deal"><div class="deal-h"><b>Waiting for ${nameOf(d.from)} to deliver ${what(d)}</b><span>${M(d.paid)} held · on its way as soon as ${nameOf(d.from)} can · money back if nothing is sent within ${weeksLeft(d)} wk</span></div></div>`;
  if (d.from === p.id && d.status === 'open') return `<div class="deal"><div class="deal-h"><b>Offer to ${nameOf(d.to)}: ${what(d)}</b><span>${K(d.price)} each · ${M(D.total(d))} · waiting for an answer, ${weeksLeft(d)} wk left</span></div><div class="btns"><button class="btn sm" data-a="dealWithdraw" data-id="${d.id}">Withdraw</button></div></div>`;
  const label = { shipped: d.how === 'self' ? 'Delivered by the seller' : `Sent with ${(E.LOG.CARRIER[d.carrier] || {}).name || 'a carrier'}`, declined: 'Declined', withdrawn: 'Withdrawn', expired: 'No answer in time', lapsed: 'Not delivered in time: refunded' }[d.status] || d.status;
  return `<div class="deal done"><div class="deal-h"><b>${d.from === p.id ? `To ${nameOf(d.to)}` : `From ${nameOf(d.from)}`}: ${what(d)}</b><span>${label} · ${M(D.total(d))}</span></div></div>`;
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
  const ids = E.contacts(c, p.id), [lo, hi] = D.priceRange(g), mk = c.market[g].p, price = st.price ?? Math.round(mk * 1000 * 10) / 10;
  const qty = Math.max(1, Math.min(have, st.qty || have)), to = ids.includes(st.to) ? st.to : ids[0];
  return `<article class="sheet"><span class="cap">Sell to a contact</span><h2 style="margin:2px 0 4px">${esc(GOODS[g].name)} from ${esc(lname(l))}</h2>
    <p class="empty" style="font-size:13.5px">${N(have)} ${esc(GOODS[g].unit)} in stock · market ${K(mk)} · import ${K(E.OPS.importPrice(c, g))}. The goods are put aside while the offer is open.</p>
    ${ids.length ? `<span class="cap">Buyer</span><div class="seg" role="group" style="flex-wrap:wrap">${ids.map((id) => `<button data-a="dealTo" data-v="${id}" aria-pressed="${id === to}">${nameOf(id)}${coopMate(c, p.id, id) ? ' · co-owner' : ''}</button>`).join('')}</div>
    <div class="btns" style="align-items:center"><span class="cap">Units</span><div class="stepper"><button data-a="dealQty" data-v="-1" aria-label="Fewer">−</button><output class="num">${qty}</output><button data-a="dealQty" data-v="1" aria-label="More">+</button></div>${[5, 10, 50].filter((n) => n < have).map((n) => `<button class="btn sm" data-a="dealQtySet" data-v="${n}">${n}</button>`).join('')}<button class="btn sm" data-a="dealQtySet" data-v="${have}">All</button></div>
    <div class="field"><label for="dl-price">Your price per ${esc(GOODS[g].unit.replace(/s$/, ''))}, in k</label><input id="dl-price" type="number" inputmode="decimal" step="0.1" min="${lo * 1000}" max="${hi * 1000}" value="${price}"></div>
    <p class="empty" style="font-size:13px">Allowed ${K(lo)} to ${K(hi)}. The buyer picks one of their companies and either a carrier (they pay the freight) or lets you deliver it yourself as soon as possible for ${M(D.fee())}, paid to you. Unanswered offers come back after ${DEALS.openWeeks} weeks.</p>
    <button class="btn gold" data-a="dealSend" data-lid="${l.id}" data-g="${g}" data-q="${qty}" data-to="${to}" ${have < 1 ? 'disabled' : ''}>Send offer</button>`
    : '<p class="empty">Nobody to sell to yet. Add tycoons to your network, or share a parent company with a co-owner.</p>'}</article>`;
}
