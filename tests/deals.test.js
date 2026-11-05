// Direct sales between tycoons: offer, carrier or seller delivery, expiry and refunds
import * as E from '../supabase/functions/_shared/engine.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
E.addPlayer(city, 'a', 'Thomas Seller', now); E.addPlayer(city, 'b', 'Mikkel Buyer', now); E.addPlayer(city, 'c', 'Stranger Danger', now);
const A = city.players.a, B = city.players.b; A.cash = 300; B.cash = 300; city.players.c.cash = 300;
const take = (type, pid) => { const l = city.listings.find((x) => x.type === type && !x.owner) || city.listings.find((x) => x.type === type); if (l.owner) { l.owner = null; l.ops = null; } assert(E.apply(city, pid, 'buy', { lid: l.id }, now).ok, `${pid} buys ${type}`); return l; };
const film = take('film', 'a'), hotel = take('hotel', 'b');
film.ops.inv.media = 20;
const offer = (x = {}) => E.apply(city, 'a', 'dealOffer', { lid: film.id, g: 'media', qty: 5, price: 0.012, to: 'b', ...x }, now);

assert(!offer().ok, 'cannot sell to someone outside the network');
A.net.push('b'); B.net.push('a');
assert(!offer({ g: 'software' }).ok, 'only goods the company makes');
assert(!offer({ qty: 50 }).ok, 'not more than in stock');
assert(!offer({ price: 1 }).ok, 'price must stay in range');
let r = offer(); assert(r.ok, 'offer to a network contact: ' + r.msg);
let d = city.deals[city.deals.length - 1];
assert(film.ops.inv.media === 15, 'goods are put aside');
const F = E.DEAL.fee(d), rq = E.DEAL.quote(d, 'ridge').cost, hq = E.DEAL.quote(d, 'harbor').cost;
assert(F > Math.min(rq, hq) && F < Math.max(rq, hq), `seller delivery fee ${F} lies between Harborline ${hq} and Ridgeway ${rq}`);
assert(B.mail.some((x) => x.deal === d.id && x.body.includes(`deliver it myself as soon as possible for ${Math.round(F * 1000)} k`)), 'buyer gets a mail offering seller delivery for that fee');
assert(!E.apply(city, 'c', 'dealAccept', { id: d.id, blid: hotel.id, how: 'ridge' }, now).ok, 'others cannot accept');
assert(!E.apply(city, 'b', 'dealAccept', { id: d.id, blid: film.id, how: 'ridge' }, now).ok, 'buyer must use one of their own companies');

// carrier: buyer pays goods + freight now, seller gets paid now, goods arrive later
const a0 = A.cash, b0 = B.cash;
r = E.apply(city, 'b', 'dealAccept', { id: d.id, blid: hotel.id, how: 'bolt' }, now); assert(r.ok, 'accept with a carrier: ' + r.msg);
assert(d.status === 'shipped' && d.freight > 0, 'shipped with freight');
assert(Math.abs(A.cash - a0 - 0.06) < 1e-6, 'seller paid 5 × 12 k');
assert(Math.abs(b0 - B.cash - 0.06 - d.freight) < 1e-6, 'buyer paid goods and freight');
const sh = city.shipments.find((s) => s.id === d.sid); assert(sh && sh.to.id === hotel.id && sh.from.id === film.id, 'shipment from the film studio to the hotel');
const inv0 = hotel.ops.inv.media || 0;
now += E.realMsPerMonth(city); E.advance(city, now);
assert((hotel.ops.inv.media || 0) > inv0 - 10, 'goods arrived at the hotel'); // the hotel also uses media while it runs

// seller delivers: buyer's money waits, seller pays freight when sending
film.ops.inv.media = 20;
r = offer(); assert(r.ok, 'second offer'); d = city.deals[city.deals.length - 1];
const b1 = B.cash;
r = E.apply(city, 'b', 'dealAccept', { id: d.id, blid: hotel.id, how: 'self' }, now); assert(r.ok && d.status === 'deliver', 'buyer lets the seller deliver');
assert(Math.abs(b1 - B.cash - 0.06 - F) < 1e-6 && Math.abs(d.paid - 0.06 - F) < 1e-6, 'buyer pays price + delivery fee, held');
assert(A.mail.some((x) => x.deal === d.id && /deliver/i.test(x.subj)), 'seller is asked to deliver');
const a1 = A.cash, h0 = hotel.ops.inv.media || 0;
r = E.apply(city, 'a', 'dealDeliver', { id: d.id }, now); assert(r.ok && d.status === 'delivered', 'seller delivers: ' + r.msg);
assert(Math.abs(A.cash - a1 - 0.06 - F) < 1e-6, 'seller gets price + delivery fee, no freight bill');
assert(d.status === 'delivered' && Math.abs(hotel.ops.inv.media - h0 - 5) < 1e-9, 'goods land in the hotel stock at once');

// seller never delivers: buyer gets the money back, goods go back
r = offer(); d = city.deals[city.deals.length - 1]; const st0 = film.ops.inv.media;
E.apply(city, 'b', 'dealAccept', { id: d.id, blid: hotel.id, how: 'self' }, now); const b2 = B.cash;
d.due = city.g; E.DEAL.weekStep(city, E.dctx(city));
assert(d.status === 'lapsed' && Math.abs(B.cash - b2 - 0.06 - F) < 1e-6, 'undelivered deal lapses with a full refund');
assert(Math.abs(film.ops.inv.media - st0 - 5) < 1e-9, 'goods back with the seller');
assert(B.mail.some((x) => /Deal off/.test(x.subj)) && A.mail.some((x) => /Deal off/.test(x.subj)), 'both hear the deal is off');

// unanswered offer expires; withdraw and decline put goods back
film.ops.inv.media = 20;
offer(); d = city.deals[city.deals.length - 1];
d.due = city.g; E.DEAL.weekStep(city, E.dctx(city));
assert(d.status === 'expired' && film.ops.inv.media === 20, 'unanswered offer expires, goods back');
for (let i = 0; i < 2; i++) { now += E.realMsPerMonth(city); E.advance(city, now); }
film.ops.inv.media = 20; offer(); d = city.deals[city.deals.length - 1];
assert(E.apply(city, 'a', 'dealWithdraw', { id: d.id }, now).ok && film.ops.inv.media === 20, 'withdraw puts goods back');
offer(); d = city.deals[city.deals.length - 1];
assert(E.apply(city, 'b', 'dealDecline', { id: d.id }, now).ok && d.status === 'declined' && film.ops.inv.media === 20, 'decline puts goods back');
console.log('deals ok');
