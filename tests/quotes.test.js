// Quote requests on Bayside Concrete's website: ask, quote, accept (money held), the plant mixes and delivers, or refunds
import * as E from '../supabase/functions/_shared/engine.js';
import { QUOTES, SITE_CO } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
const near = (a, b) => Math.abs(a - b) < 1e-6;
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
E.addPlayer(city, 'a', 'Thomas Plant', now); E.addPlayer(city, 'b', 'Mikkel Builder', now); E.addPlayer(city, 'c', 'Stranger', now);
const A = city.players.a, B = city.players.b, C = city.players.c; A.cash = 300; B.cash = 300; C.cash = 300;
const take = (type, pid) => { const l = city.listings.find((x) => x.type === type); if (l.owner) { l.owner = null; l.ops = null; } assert(E.apply(city, pid, 'buy', { lid: l.id }, now).ok, `${pid} buys ${type}`); return l; };
const HOST = 'baysideconcrete.ab', ctx = () => E.dctx(city), wk = () => { city.g += 1 / 48; E.QT.weekStep(city, ctx()); E.DEAL.weekStep(city, ctx()); };
assert(SITE_CO[HOST] && SITE_CO[HOST].g === 'concrete', 'the site sells concrete');
const ask = (pid, x = {}) => E.apply(city, pid, 'quoteAsk', { site: HOST, blid: build.id, qty: 200, min: 150, weeks: 3, note: 'Hotel wing', ...x }, now);

// nobody runs the plant yet: no requests
const plant = city.listings.find((x) => x.type === 'concrete'); plant.owner = null; plant.ops = null;
const build = take('construction', 'b');
assert(!ask('b').ok, 'no requests while nobody runs the plant');
take('concrete', 'a');
assert(E.QT.taking(ctx(), plant), 'the plant takes requests once a tycoon runs it');
assert(!ask('c').ok, 'only for one of your own companies');
assert(!ask('b', { qty: 5 }).ok && !ask('b', { qty: 5000 }).ok, `orders between ${QUOTES.minQty} and ${QUOTES.maxQty} t`);
assert(!ask('b', { min: 300 }).ok, 'the minimum cannot exceed the amount');
assert(!ask('b', { weeks: 30 }).ok, 'delivery within 12 weeks');
let r = ask('b'); assert(r.ok, 'ask for a quote: ' + r.msg);
let q = city.quotes[city.quotes.length - 1];
assert(q.status === 'asked' && q.qty === 200 && q.min === 150 && near(q.when, q.at + 3 / 48), 'request stored with amount, minimum and date');
assert(A.mail.some((x) => x.web === `${HOST}/office` && /Quote request/.test(x.subj) && x.body.includes('at least 150')), 'the plant owner gets a mail pointing to the office');

// the guide price: list price with volume discounts
const lp = E.QT.listPrice(city, plant, 'concrete');
assert(Math.abs(E.QT.guide(city, plant, 'concrete', 300) - lp * 0.95) <= 5e-5 && Math.abs(E.QT.guide(city, plant, 'concrete', 1500) - lp * 0.9) <= 5e-5, 'volume discounts from 250 and 1000 t');
assert(E.apply(city, 'a', 'quoteList', { site: HOST, price: 0.004 }, now).ok && E.QT.listPrice(city, plant, 'concrete') === 0.004, 'the owner sets the list price');
assert(!E.apply(city, 'b', 'quoteList', { site: HOST, price: 0.004 }, now).ok, 'others cannot');

// the plant answers
assert(!E.apply(city, 'b', 'quoteOffer', { id: q.id, qty: 180, price: 0.004, weeks: 3 }, now).ok, 'only the plant answers');
assert(!E.apply(city, 'a', 'quoteOffer', { id: q.id, qty: 100, price: 0.004, weeks: 3 }, now).ok, 'not below the buyer’s minimum');
r = E.apply(city, 'a', 'quoteOffer', { id: q.id, qty: 180, price: 0.004, weeks: 4 }, now); assert(r.ok && q.status === 'quoted', 'quote sent: ' + r.msg);
const o = q.offer; assert(o.fee > 0 && near(E.QT.total(o), 180 * 0.004 + o.fee), 'quote = amount × price + delivery');
assert(B.mail.some((x) => x.web === `${HOST}/orders` && /later than you asked/.test(x.body)), 'the buyer is told it comes later than asked');

// the buyer accepts: money held, an order for the plant
const b0 = B.cash, a0 = A.cash;
r = E.apply(city, 'b', 'quoteAccept', { id: q.id }, now); assert(r.ok && q.status === 'ordered', 'accept: ' + r.msg);
const d = city.deals.find((x) => x.id === q.deal);
assert(d && d.status === 'deliver' && d.stock && d.qty === 180 && near(d.due, o.when), 'it becomes an order the plant delivers by the date');
assert(near(b0 - B.cash, E.QT.total(o)) && near(d.paid, E.QT.total(o)) && A.cash === a0, 'buyer pays the total, held; the plant is not paid yet');
assert(A.mail.some((x) => x.deal === d.id && /Order/.test(x.subj)), 'the plant gets the order with the deal');

// delivering needs fresh concrete in the yard
plant.ops.inv.concrete = 50;
assert(!E.apply(city, 'a', 'dealDeliver', { id: d.id }, now).ok, 'cannot deliver more than is in stock');
plant.ops.inv.concrete = 230; const s0 = build.ops.inv.concrete || 0;
r = E.apply(city, 'a', 'dealDeliver', { id: d.id }, now); assert(r.ok && d.status === 'delivered', 'the plant delivers: ' + r.msg);
assert(near(plant.ops.inv.concrete, 50) && near(build.ops.inv.concrete, s0 + 180), 'concrete leaves the yard and lands at the builder');
assert(near(A.cash - a0, E.QT.total(o)), 'the plant is paid price + delivery');

// a missed date refunds the buyer and leaves the plant's stock alone
r = ask('b', { qty: 100, min: 100, weeks: 1 }); q = city.quotes[city.quotes.length - 1];
E.apply(city, 'a', 'quoteOffer', { id: q.id, qty: 100, price: 0.004, weeks: 1 }, now); E.apply(city, 'b', 'quoteAccept', { id: q.id }, now);
const d2 = city.deals.find((x) => x.id === q.deal), b1 = B.cash, inv1 = plant.ops.inv.concrete;
wk(); wk();
assert(d2.status === 'lapsed' && near(B.cash - b1, E.QT.total(q.offer)) && near(plant.ops.inv.concrete, inv1), 'missed date: buyer refunded, plant stock untouched');

// unanswered requests and quotes run out; withdraw, decline, refuse
r = ask('b'); q = city.quotes[city.quotes.length - 1]; wk(); wk(); wk();
assert(q.status === 'expired' && B.mail.some((x) => /No answer/.test(x.subj)), 'an unanswered request expires after 2 weeks');
r = ask('b'); q = city.quotes[city.quotes.length - 1];
assert(E.apply(city, 'b', 'quoteCancel', { id: q.id }, now).ok && q.status === 'withdrawn', 'the buyer withdraws a request');
r = ask('b'); q = city.quotes[city.quotes.length - 1];
assert(E.apply(city, 'a', 'quoteRefuse', { id: q.id }, now).ok && q.status === 'refused' && B.mail.some((x) => /No quote/.test(x.subj)), 'the plant turns one down');
r = ask('b'); q = city.quotes[city.quotes.length - 1]; E.apply(city, 'a', 'quoteOffer', { id: q.id, qty: 150, price: 0.004, weeks: 2 }, now);
assert(E.apply(city, 'b', 'quoteDecline', { id: q.id }, now).ok && q.status === 'declined', 'the buyer declines a quote');
r = ask('b'); q = city.quotes[city.quotes.length - 1]; E.apply(city, 'a', 'quoteOffer', { id: q.id, qty: 150, price: 0.004, weeks: 2 }, now); wk(); wk(); wk();
assert(q.status === 'expired', 'an unaccepted quote runs out');

// the owner cannot order from their own plant
const a2 = take('construction', 'a');
assert(!E.apply(city, 'a', 'quoteAsk', { site: HOST, blid: a2.id, qty: 100, min: 100, weeks: 2 }, now).ok, 'no orders to yourself');

// runs inside advance without errors
now += E.realMsPerMonth(city); E.advance(city, now);
assert(Array.isArray(city.quotes), 'weekly steps keep the quotes list');
console.log('quotes: all good');
