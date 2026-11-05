// Aurex Bay Tycoon — direct sales between tycoons.
// A seller offers goods their company made to someone in their network (or a co-owner) at their own price.
// The buyer picks one of their companies and a carrier, or lets the seller deliver. In that case the seller
// gets a mail and delivers the goods themselves (a 10-second task in the browser): they land in the buyer's stock at once. The buyer pays a fixed
// delivery fee that goes to the seller with the price: halfway between Ridgeway's and Harborline's freight for this cargo.
// Deals live in city.deals: { id, g, qty, price, from, lid, so, to, m, at, due, status, ... }
//   status: open → shipped (carrier, or the seller delivered) | deliver (waiting for the seller) → shipped
//           open → declined | withdrawn | expired;  deliver → lapsed (the seller never sent it: buyer refunded)
import { GOODS, RECIPES, DEALS, CARRIERS } from './content.js';
import { freight } from './logistics.js';

const r4 = (v) => Math.round(v * 10000) / 10000;
const uid = () => 'dl' + Math.random().toString(36).slice(2, 9);
const ok = (msg) => ({ ok: true, msg }), err = (msg) => ({ ok: false, msg });
const WEEK = 1 / 48;
const CID = Object.fromEntries(CARRIERS.map((c) => [c.id, c]));
const same = (a, b) => a && b && a.k === b.k && a.id === b.id;
const unit = (g) => GOODS[g].unit;
const one = (g) => GOODS[g].unit.replace(/s$/, '');
const gname = (g) => GOODS[g].name.toLowerCase();
const what = (d) => `${d.qty} ${unit(d.g)} of ${gname(d.g)}`;

export const ensure = (city) => (city.deals = city.deals || []);
export const total = (d) => r4(d.qty * d.price);
// what the seller charges to deliver it themselves: halfway between Ridgeway and Harborline for this cargo
export const fee = (d) => r4((quote(d, 'ridge').cost + quote(d, 'harbor').cost) / 2);
export const isLive = (d) => d.status === 'open' || d.status === 'deliver';
export const priceRange = (g) => [r4(GOODS[g].base * DEALS.minPrice), r4(GOODS[g].base * DEALS.maxPrice)];
// the freight for these goods with a carrier, inside the city
export const quote = (d, cid) => freight(cid, total(d), d.qty, 'local');
// which of a tycoon's companies can take these goods: they use them as a supply
export const buyerCompanies = (city, ctx, pid, g) => city.listings.filter((l) => l.ops && ctx.canRun(pid, l) && RECIPES[l.type] && g in RECIPES[l.type].in);
export const mine = (city, pid) => ensure(city).filter((d) => isLive(d) && (d.from === pid || d.to === pid));

// ---------------------------------------------------------------- seller: make an offer
export function offer(city, p, a, ctx) {
  const l = ctx.listing(a.lid); if (!l || !ctx.canRun(p.id, l)) return err('You do not run this company.');
  const g = a.g; if (!GOODS[g] || !RECIPES[l.type] || !(g in RECIPES[l.type].out)) return err('This company does not make that.');
  const qty = Math.round(Number(a.qty) || 0); if (qty < 1) return err('Offer at least 1 unit.');
  if ((l.ops.inv[g] || 0) < qty) return err(`Only ${Math.floor(l.ops.inv[g] || 0)} ${unit(g)} in stock.`);
  const price = r4(Number(a.price) || 0), [lo, hi] = priceRange(g);
  if (!(price >= lo - 1e-9 && price <= hi + 1e-9)) return err(`Set a price between ${Math.round(lo * 1e5) / 100} k and ${Math.round(hi * 1e5) / 100} k per ${one(g)}.`);
  const t = city.players[a.to]; if (!t || t.id === p.id || t.bot) return err('Pick a tycoon to sell to.');
  if (!ctx.contacts(p.id).includes(t.id)) return err('You can only sell to people in your network or your co-owners.');
  if (ensure(city).filter((d) => isLive(d) && d.from === p.id).length >= 12) return err('You have 12 open sales. Wait for some answers first.');
  l.ops.inv[g] -= qty; // the goods are put aside until the deal closes
  const d = { id: uid(), g, qty, price, from: p.id, lid: l.id, so: { ...l.owner }, to: t.id, m: city.m, at: city.g, due: city.g + DEALS.openWeeks * WEEK, status: 'open' };
  city.deals.push(d);
  ctx.mail(t.id, { from: { n: p.name, r: `${ctx.name(l)} · your network`, k: 'player', pid: p.id }, subj: `Offer: ${what(d)}`, body: `I have ${what(d)} from ${ctx.name(l)} for you at ${Math.round(price * 1e5) / 100} k per ${one(g)}, ${total(d)} M in all.\nPick one of your companies that uses it and how it should travel: with a carrier you pay, or I deliver it myself as soon as possible for ${Math.round(fee(d) * 1000)} k. The offer stands for ${DEALS.openWeeks} weeks.`, deal: d.id, kind: 'info' });
  return ok(`Offer sent to ${t.name}: ${what(d)} for ${total(d)} M.`);
}

// ---------------------------------------------------------------- buyer: answer
export function accept(city, p, a, ctx) {
  const d = ensure(city).find((x) => x.id === a.id && x.to === p.id && x.status === 'open'); if (!d) return err('The offer is no longer open.');
  const sl = ctx.listing(d.lid); if (!sl || !sl.ops || !same(sl.owner, d.so)) { close(city, d, 'withdrawn', ctx); return err('The seller no longer owns that company. The offer is off.'); }
  const bl = ctx.listing(a.blid); if (!bl || !bl.ops || !ctx.canRun(p.id, bl)) return err('Pick one of your companies.');
  if (!RECIPES[bl.type] || !(d.g in RECIPES[bl.type].in)) return err(`That company does not use ${gname(d.g)}.`);
  if (same(bl.owner, sl.owner)) return err('Seller and buyer are the same company owner. Move the goods yourself.');
  const how = a.how === 'self' ? 'self' : CID[a.how] ? a.how : null; if (!how) return err('Pick a carrier, or let the seller deliver.');
  const goods = total(d), f = how === 'self' ? null : quote(d, how), cost = r4(goods + (f ? f.cost : fee(d)));
  if (ctx.cashOf(bl.owner) < cost - 1e-9) return err(`This costs ${cost} M${f ? ' with freight' : ''}.`);
  const seller = city.players[d.from];
  d.blid = bl.id; d.bo = { ...bl.owner }; d.how = how; d.by = p.id; d.acc = city.g;
  ctx.debit(bl.owner, how === 'self' ? cost : goods); bl.ops.cur.sup += goods;
  if (how === 'self') { // the money (price + delivery fee) waits until the seller sends the goods
    bl.ops.cur.fr = (bl.ops.cur.fr || 0) + fee(d); d.fee = fee(d); d.paid = cost; d.status = 'deliver'; d.due = city.g + DEALS.deliverWeeks * WEEK;
    ctx.mail(d.from, { from: { n: p.name, r: `${ctx.name(bl)} · buyer`, k: 'player', pid: p.id }, subj: `Please deliver: ${what(d)}`, body: `I take your ${what(d)} for ${goods} M, plus ${Math.round(fee(d) * 1000)} k for you to deliver it yourself. Please drive it over to ${ctx.name(bl)} as soon as you can.\nYou get the money when the goods leave. If nothing is sent within ${DEALS.deliverWeeks} weeks, the deal is off and I get my money back.`, deal: d.id, kind: 'info' });
    return ok(`Deal. ${seller ? seller.name : 'The seller'} delivers as soon as they can. ${cost} M is held until the goods leave.`);
  }
  const b = ship(city, d, sl, bl, how, ctx);
  ctx.debit(bl.owner, b.freight); bl.ops.cur.fr = (bl.ops.cur.fr || 0) + b.freight;
  pay(d, sl, goods, ctx);
  ctx.mail(d.from, { from: { n: p.name, r: `${ctx.name(bl)} · buyer`, k: 'player', pid: p.id }, subj: `Sold: ${what(d)}`, body: `I take your ${what(d)}. ${CID[how].name} is picking it up at ${ctx.name(sl)} now, and ${goods} M is on your account.`, deal: d.id, kind: 'good' });
  return ok(`Bought ${what(d)} for ${goods} M + $${Math.round(b.freight * 1000)}k freight. ${CID[how].name} delivers in about ${Math.round(b.days)} days.`);
}
export function decline(city, p, a, ctx) {
  const d = ensure(city).find((x) => x.id === a.id && x.to === p.id && x.status === 'open'); if (!d) return err('The offer is no longer open.');
  close(city, d, 'declined', ctx);
  ctx.mail(d.from, { from: { n: p.name, r: 'Your network', k: 'player', pid: p.id }, subj: `No thanks: ${what(d)}`, body: `Thanks for the offer, but I pass this time. The ${gname(d.g)} is back in your stock.`, deal: d.id, kind: 'info' });
  return ok('Offer declined.');
}

// ---------------------------------------------------------------- seller: withdraw, or deliver
export function withdraw(city, p, a, ctx) {
  const d = ensure(city).find((x) => x.id === a.id && x.from === p.id && x.status === 'open'); if (!d) return err('This offer is already answered.');
  close(city, d, 'withdrawn', ctx); return ok('Offer withdrawn. The goods are back in stock.');
}
export function deliver(city, p, a, ctx) {
  const d = ensure(city).find((x) => x.id === a.id && x.status === 'deliver'); if (!d) return err('Nothing to deliver.');
  const sl = ctx.listing(d.lid); if (!sl || !ctx.canRun(p.id, sl) || !same(sl.owner, d.so)) return err('You no longer run the company that sold it.');
  const bl = ctx.listing(d.blid); if (!bl || !same(bl.owner, d.bo)) { lapse(city, d, ctx, 'The buyer no longer owns the company it was for.'); return err('The buyer no longer owns that company. The deal is off and the money went back.'); }
  // an order from a quote was never put aside: it leaves the seller's stock now (the oldest fresh lots first)
  if (d.stock) { const have = Math.floor((sl.ops.inv[d.g] || 0) + 1e-6); if (have < d.qty) return err(`Only ${have} ${unit(d.g)} in stock. Make ${Math.ceil(d.qty - have)} more first.`); sl.ops.inv[d.g] -= d.qty; }
  // the seller drives it over themselves: no carrier, no travel time, no freight bill; the buyer's delivery fee goes to the seller with the price
  bl.ops.inv[d.g] = (bl.ops.inv[d.g] || 0) + d.qty;
  d.status = 'delivered'; d.carrier = null; d.freight = 0; d.sent = city.g;
  const got = d.paid; pay(d, sl, d.paid, ctx); d.paid = 0; d.dby = p.id;
  ctx.mail(d.to, { from: { n: p.name, r: `${ctx.name(sl)} · seller`, k: 'player', pid: p.id }, subj: `Delivered: ${what(d)}`, body: `I just dropped off your ${what(d)} at ${ctx.name(bl)} myself. It is in your stock now.`, deal: d.id, kind: 'good' });
  return ok(`Delivered to ${ctx.name(bl)}. ${r4(got)} M is yours.`);
}

// ---------------------------------------------------------------- every week: offers and deliveries that waited too long
export function weekStep(city, ctx) {
  if (!city.deals || !city.deals.length) return;
  city.deals.forEach((d) => {
    if (d.status === 'open' && city.g >= d.due) { close(city, d, 'expired', ctx); ctx.mail(d.from, { from: { n: 'Sales desk', r: 'Your office', k: 'city' }, subj: `No answer: ${what(d)}`, body: `${(city.players[d.to] || {}).name || 'The buyer'} did not answer in ${DEALS.openWeeks} weeks. The ${gname(d.g)} is back in stock.`, kind: 'info' }); }
    if (d.status === 'deliver' && city.g >= d.due) lapse(city, d, ctx, `${(city.players[d.from] || {}).name || 'The seller'} did not send the goods in ${DEALS.deliverWeeks} weeks.`);
  });
  // keep the last 60 closed deals for the record
  const live = city.deals.filter(isLive), done = city.deals.filter((d) => !isLive(d)).slice(-60);
  city.deals = done.concat(live);
}

function ship(city, d, sl, bl, cid, ctx) {
  const b = ctx.book(bl, { carrier: cid, g: d.g, qty: d.qty, value: total(d), route: 'local', from: { k: 'l', id: sl.id } });
  d.status = 'shipped'; d.carrier = cid; d.freight = b.freight; d.sid = b.sh.id; d.sent = city.g; return b;
}
function pay(d, sl, v, ctx) { ctx.credit(d.so, v); if (sl.ops) sl.ops.cur.goods += v; }
// the goods go back to the seller's company (if they still own it)
function close(city, d, status, ctx) {
  d.status = status; d.end = city.g;
  const sl = ctx.listing(d.lid); if (!d.stock && sl && sl.ops && same(sl.owner, d.so)) sl.ops.inv[d.g] = (sl.ops.inv[d.g] || 0) + d.qty;
}
function lapse(city, d, ctx, why) {
  if (d.paid) { ctx.credit(d.bo, d.paid); const bl = ctx.listing(d.blid); if (bl && bl.ops) { bl.ops.cur.sup -= d.paid - (d.fee || 0); bl.ops.cur.fr = (bl.ops.cur.fr || 0) - (d.fee || 0); } }
  d.paid = 0; close(city, d, 'lapsed', ctx);
  const body = `${why} The deal for ${what(d)} is off: the buyer has the money back${d.stock ? '' : ' and the goods are back with the seller'}.`;
  [d.to, d.from].forEach((pid) => ctx.mail(pid, { from: { n: 'Sales desk', r: 'Your office', k: 'city' }, subj: `Deal off: ${what(d)}`, body, kind: 'bad' }));
}
