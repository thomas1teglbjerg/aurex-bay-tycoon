// Aurex Bay Tycoon — quote requests on a company's website (Bayside Concrete: baysideconcrete.ab).
// A tycoon asks for an amount (and the least they will take) delivered to one of their companies by a date.
// Whoever runs the plant answers with an offer (amount, price per tonne, delivery date), or turns it down.
// When the buyer accepts, the money (goods + the plant's own delivery charge) is held and the order becomes a
// direct-sale deal (deals.js, status 'deliver', `stock: true`): the plant mixes it and delivers it itself before the
// date, and is paid when it is there. Nothing delivered by the date: the buyer gets the money back.
// Quotes live in city.quotes: { id, site, g, lid, so, to, blid, bo, qty, min, when, note, at, status, offer, deal }
//   status: asked → quoted → ordered;  asked → refused | withdrawn | expired;  quoted → declined | expired
import { GOODS, RECIPES, QUOTES, SITE_CO } from './content.js';
import * as DEAL from './deals.js';

const r4 = (v) => Math.round(v * 10000) / 10000;
const uid = () => 'qt' + Math.random().toString(36).slice(2, 9);
const ok = (msg) => ({ ok: true, msg }), err = (msg) => ({ ok: false, msg });
const WEEK = 1 / 48;
const same = (a, b) => a && b && a.k === b.k && a.id === b.id;
const kT = (v) => `${Math.round(v * 1e5) / 100} k`;
const what = (q, n) => `${n ?? q.qty} ${GOODS[q.g].unit} of ${GOODS[q.g].name.toLowerCase()}`;

export const ensure = (city) => (city.quotes = city.quotes || []);
export const site = (host) => SITE_CO[host] || null;
export const plant = (city, ctx, host) => { const s = site(host); return s ? ctx.listing(s.lid) : null; };
export const isOpen = (q) => q.status === 'asked' || q.status === 'quoted';
// the plant takes requests while a tycoon runs it
export const taking = (ctx, l) => !!(l && l.ops && ctx.runners(l).length);
// the list price per tonne: set by the owner, or a little over the market
export function listPrice(city, l, g) {
  const set = l && l.ops && l.ops.list && l.ops.list[g]; if (set) return set;
  const mk = (city.market && city.market[g] && city.market[g].p) || GOODS[g].base;
  return Math.round(Math.max(mk, GOODS[g].base) * QUOTES.markup * 1e5) / 1e5;
}
export const discount = (qty) => QUOTES.tiers.reduce((a, [n, d]) => (qty >= n ? d : a), 0);
export const guide = (city, l, g, qty) => r4(listPrice(city, l, g) * (1 - discount(qty)));
// the plant's own delivery charge (its mixer trucks): halfway between Ridgeway and Harborline, as for any seller delivery
export const fee = (g, qty, price) => DEAL.fee({ g, qty, price });
export const total = (o) => r4(o.qty * o.price + o.fee);
export const mineAsBuyer = (city, pid) => ensure(city).filter((q) => q.to === pid);
export const forPlant = (city, lid) => ensure(city).filter((q) => q.lid === lid);

// ---------------------------------------------------------------- buyer: ask for a quote
export function ask(city, p, a, ctx) {
  const s = site(a.site), l = plant(city, ctx, a.site); if (!s || !l) return err('This site takes no orders.');
  if (!taking(ctx, l)) return err(`${ctx.name(l)} is not taking requests right now.`);
  const g = s.g, bl = ctx.listing(a.blid);
  if (!bl || !bl.ops || !ctx.canRun(p.id, bl)) return err('Pick one of your companies to deliver to.');
  if (!RECIPES[bl.type] || !(g in RECIPES[bl.type].in)) return err(`That company does not use ${GOODS[g].name.toLowerCase()}.`);
  if (same(bl.owner, l.owner)) return err('You own the plant yourself. Move the goods yourself.');
  const qty = Math.round(Number(a.qty) || 0), min = Math.round(Number(a.min) || 0), wk = Math.round(Number(a.weeks) || 0);
  if (qty < QUOTES.minQty) return err(`The smallest order is ${QUOTES.minQty} ${GOODS[g].unit}.`);
  if (qty > QUOTES.maxQty) return err(`The most in one order is ${QUOTES.maxQty} ${GOODS[g].unit}.`);
  if (min < 1 || min > qty) return err('The minimum must be between 1 and the amount you need.');
  if (wk < 1 || wk > QUOTES.maxWeeks) return err(`Pick a delivery date within ${QUOTES.maxWeeks} weeks.`);
  if (ensure(city).filter((q) => q.to === p.id && isOpen(q)).length >= QUOTES.maxOpen) return err(`You have ${QUOTES.maxOpen} open requests. Wait for some answers first.`);
  const q = { id: uid(), site: a.site, g, lid: l.id, so: { ...l.owner }, to: p.id, blid: bl.id, bo: { ...bl.owner }, qty, min, when: r4(city.g + wk * WEEK), note: String(a.note || '').trim().slice(0, 160), at: city.g, status: 'asked' };
  city.quotes.push(q);
  ctx.runners(l).forEach((r) => ctx.mail(r.id, { from: { n: p.name, r: `${ctx.name(bl)} · ${a.site}`, k: 'player', pid: p.id }, subj: `Quote request: ${what(q)}`, body: `Please send me a quote for ${what(q)}, at least ${min} ${GOODS[g].unit}, delivered to ${ctx.name(bl)} in ${bl.district} within ${wk} week${wk > 1 ? 's' : ''}.${q.note ? `\n“${q.note}”` : ''}\nAnswer it in the plant office on ${a.site} within ${QUOTES.answerWeeks} weeks.`, web: `${a.site}/office`, kind: 'info' }));
  return ok(`Request sent to ${ctx.name(l)}. You get a mail when they answer.`);
}
export function cancel(city, p, a) {
  const q = ensure(city).find((x) => x.id === a.id && x.to === p.id && x.status === 'asked'); if (!q) return err('This request is already answered.');
  q.status = 'withdrawn'; q.end = city.g; return ok('Request withdrawn.');
}

// ---------------------------------------------------------------- the plant: answer
export function offer(city, p, a, ctx) {
  const q = ensure(city).find((x) => x.id === a.id && x.status === 'asked'); if (!q) return err('This request is no longer open.');
  const l = ctx.listing(q.lid); if (!l || !ctx.canRun(p.id, l)) return err('Only the people running the plant can answer.');
  const qty = Math.round(Number(a.qty) || 0); if (qty < q.min || qty > q.qty) return err(`Offer between ${q.min} and ${q.qty} ${GOODS[q.g].unit}.`);
  const price = r4(Number(a.price) || 0), [lo, hi] = DEAL.priceRange(q.g);
  if (!(price >= lo - 1e-9 && price <= hi + 1e-9)) return err(`Set a price between ${kT(lo)} and ${kT(hi)} per tonne.`);
  const wk = Math.round(Number(a.weeks) || 0); if (wk < 1 || wk > QUOTES.maxWeeks) return err(`Pick a delivery date within ${QUOTES.maxWeeks} weeks.`);
  const o = { qty, price, fee: fee(q.g, qty, price), when: r4(city.g + wk * WEEK), by: p.id, at: city.g, note: String(a.note || '').trim().slice(0, 160) };
  q.offer = o; q.status = 'quoted'; q.so = { ...l.owner };
  const late = o.when > q.when + 1e-6 ? ` That is later than you asked for.` : '';
  ctx.mail(q.to, { from: { n: p.name, r: `${ctx.name(l)} · sales`, k: 'player', pid: p.id }, subj: `Quote: ${what(q, qty)}`, body: `We can deliver ${what(q, qty)} to ${ctx.name(ctx.listing(q.blid)) || 'your company'} within ${wk} week${wk > 1 ? 's' : ''} at ${kT(price)} per tonne: ${r4(qty * price)} M plus ${Math.round(o.fee * 1000)} k delivery, ${total(o)} M in all.${late}${o.note ? `\n“${o.note}”` : ''}\nAccept or decline it under My quotes on ${q.site} within ${QUOTES.acceptWeeks} weeks. Your money is held until the concrete is there, and comes back if we miss the date.`, web: `${q.site}/orders`, kind: 'info' });
  return ok(`Quote sent: ${what(q, qty)} for ${total(o)} M.`);
}
export function refuse(city, p, a, ctx) {
  const q = ensure(city).find((x) => x.id === a.id && x.status === 'asked'); if (!q) return err('This request is no longer open.');
  const l = ctx.listing(q.lid); if (!l || !ctx.canRun(p.id, l)) return err('Only the people running the plant can answer.');
  q.status = 'refused'; q.end = city.g;
  ctx.mail(q.to, { from: { n: p.name, r: `${ctx.name(l)} · sales`, k: 'player', pid: p.id }, subj: `No quote: ${what(q)}`, body: `Sorry, we cannot take on ${what(q)} this time.`, kind: 'info' });
  return ok('Request turned down.');
}

// ---------------------------------------------------------------- buyer: accept or decline the offer
export function accept(city, p, a, ctx) {
  const q = ensure(city).find((x) => x.id === a.id && x.to === p.id && x.status === 'quoted'); if (!q) return err('This quote is no longer open.');
  const l = ctx.listing(q.lid), bl = ctx.listing(q.blid), o = q.offer;
  if (!l || !l.ops || !same(l.owner, q.so)) { q.status = 'expired'; q.end = city.g; return err('The plant has changed hands. The quote is off.'); }
  if (!bl || !bl.ops || !ctx.canRun(p.id, bl)) return err('You no longer run the company it was for.');
  const goods = r4(o.qty * o.price), cost = total(o);
  if (ctx.cashOf(bl.owner) < cost - 1e-9) return err(`This costs ${cost} M.`);
  ctx.debit(bl.owner, cost); bl.ops.cur.sup += goods; bl.ops.cur.fr = (bl.ops.cur.fr || 0) + o.fee;
  // from here it is a direct sale the plant delivers itself, taken from its stock when it goes
  const d = { id: 'dl' + q.id.slice(2), g: q.g, qty: o.qty, price: o.price, from: o.by, lid: l.id, so: { ...l.owner }, to: p.id, m: city.m, at: city.g, due: o.when,
    status: 'deliver', blid: bl.id, bo: { ...bl.owner }, how: 'self', by: p.id, acc: city.g, fee: o.fee, paid: cost, stock: true, quote: q.id };
  DEAL.ensure(city).push(d);
  q.status = 'ordered'; q.deal = d.id; q.end = city.g;
  const wk = Math.max(1, Math.round((o.when - city.g) * 48));
  ctx.runners(l).forEach((r) => ctx.mail(r.id, { from: { n: p.name, r: `${ctx.name(bl)} · buyer`, k: 'player', pid: p.id }, subj: `Order: ${what(q, o.qty)}`, body: `I accept your quote. Please mix ${what(q, o.qty)} and deliver it to ${ctx.name(bl)} within ${wk} week${wk > 1 ? 's' : ''}. ${cost} M is held for you until it is there. Concrete sets 48 hours after mixing, so mix it close to the delivery.`, deal: d.id, web: `${q.site}/office`, kind: 'info' }));
  return ok(`Ordered. ${cost} M is held until ${ctx.name(l)} delivers.`);
}
export function decline(city, p, a, ctx) {
  const q = ensure(city).find((x) => x.id === a.id && x.to === p.id && x.status === 'quoted'); if (!q) return err('This quote is no longer open.');
  q.status = 'declined'; q.end = city.g;
  ctx.mail(q.offer.by, { from: { n: p.name, r: 'Buyer', k: 'player', pid: p.id }, subj: `Quote declined: ${what(q, q.offer.qty)}`, body: 'Thanks for the quote, but I pass this time.', kind: 'info' });
  return ok('Quote declined.');
}

// ---------------------------------------------------------------- the plant's list price
export function setList(city, p, a, ctx) {
  const l = plant(city, ctx, a.site); if (!l || !ctx.canRun(p.id, l)) return err('Only the people running the plant can set prices.');
  const g = site(a.site).g, price = r4(Number(a.price) || 0), [lo, hi] = DEAL.priceRange(g);
  if (!(price >= lo - 1e-9 && price <= hi + 1e-9)) return err(`Set a price between ${kT(lo)} and ${kT(hi)} per tonne.`);
  l.ops.list = { ...(l.ops.list || {}), [g]: price }; return ok(`List price set to ${kT(price)} per tonne.`);
}

// ---------------------------------------------------------------- every week: requests and quotes nobody answered
export function weekStep(city, ctx) {
  if (!city.quotes || !city.quotes.length) return;
  city.quotes.forEach((q) => {
    if (q.status === 'asked' && city.g >= q.at + QUOTES.answerWeeks * WEEK - 1e-9) {
      q.status = 'expired'; q.end = city.g;
      const l = ctx.listing(q.lid); ctx.mail(q.to, { from: { n: 'Sales desk', r: l ? ctx.name(l) : q.site, k: 'city' }, subj: `No answer: ${what(q)}`, body: `${l ? ctx.name(l) : 'The plant'} did not answer your request in ${QUOTES.answerWeeks} weeks. Try again on ${q.site}.`, kind: 'info' });
    }
    if (q.status === 'quoted' && city.g >= q.offer.at + QUOTES.acceptWeeks * WEEK - 1e-9) { q.status = 'expired'; q.end = city.g; }
  });
  const open = city.quotes.filter((q) => isOpen(q) || (q.status === 'ordered' && (city.deals || []).some((d) => d.id === q.deal && DEAL.isLive(d))));
  const done = city.quotes.filter((q) => !open.includes(q)).slice(-60);
  city.quotes = done.concat(open);
}
