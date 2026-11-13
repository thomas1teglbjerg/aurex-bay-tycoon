// Cars in the personal life: condition, workshops, Cars & Coffee, the Concours, loans, the daily car and car chance cards
import * as E from '../supabase/functions/_shared/engine.js';
import { CARS as K, CHANCE } from '../supabase/functions/_shared/content.js';
const L = E.LIFE, AU = E.AUTO;
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); E.addPlayer(city, 'v', 'Mikkel', now);
const p = city.players.u, q = city.players.v; p.cash = 200; q.cash = 200;
const week = () => { now += E.realMsPerMonth(city) / 4; E.advance(city, now); };
const month = () => { now += E.realMsPerMonth(city); E.advance(city, now); };
const A = (a, x, who = 'u') => { p.lastAct = city.m; q.lastAct = city.m; return E.apply(city, who, a, x, now); };
p.life.wallet = 60; q.life.wallet = 20;
assert(A('homeBuy', { hid: 'H4', down: 1 }).ok && L.capacity(p, 'car') === 6, 'a villa with a six-car garage');
const give = (pl, cid, extra = {}) => { const it = { uid: 'i' + Math.random().toString(36).slice(2, 8), cid, m: city.m, cost: 1, lent: false, ...extra }; pl.life.items.push(it); return it; };
const carIds = Object.keys(L.ITEM).filter((k) => L.ITEM[k].cat === 'car' && !L.ITEM[k].lid);
const car = give(p, 'c2'), cheap = give(p, 'c7');

// condition and value
const v85 = L.instValue(city, p, car); car.cond = 100; const v100 = L.instValue(city, p, car); car.cond = 30; const v30 = L.instValue(city, p, car);
assert(v100 > v85 && v85 > v30 && Math.abs(v100 / v85 - L.condMult(100) / L.condMult(85)) < 1e-6, 'condition moves a car\'s value');
assert(AU.kindFor(car) === 'resto' && (car.cond = 70) && AU.kindFor(car) === 'service', 'below 40 a car needs a restoration, above it a service');

// a workshop the other tycoon runs must say yes first
const shop = city.listings.find((l) => l.type === 'autorepair' && !E.BLD.unbuilt(l)); shop.owner = null;
assert(A('buy', { lid: shop.id }, 'v').ok && shop.ops, 'Mikkel buys the auto repair shop');
const qq = AU.quote(city, p, car, shop.id, E.ax(city)), qc = AU.quote(city, p, car, 'city', E.ax(city));
assert(qq && qc && qc.price > qq.price && qc.weeks >= qq.weeks, 'the city garage is dearer and slower');
const w0 = p.life.wallet, cash0 = q.cash;
assert(A('carService', { uid: car.uid, lid: shop.id }).ok && car.shop && Math.abs(p.life.wallet - (w0 - qq.price)) < 1e-6, 'booking holds the price');
assert(!A('itemSell', { uid: car.uid, how: 'dealer' }).ok, 'a car at the workshop cannot be sold');
const mail = q.mail.find((x) => x.car && x.opts && x.opts[0].car); assert(mail, 'the workshop owner gets a mail with the job');
assert(A('mailAnswer', { id: mail.id, opt: 0 }, 'v').ok && city.cars.jobs[0].st === 'work', 'the owner takes the job');
for (let i = 0; i < qq.weeks + 1 && car.shop; i++) week();
assert(!car.shop && car.cond === 100 && q.cash > cash0, 'service done: condition 100, the workshop is paid');

// restoration at the city garage, turned-down jobs are refunded
cheap.cond = 20; const w1 = p.life.wallet;
assert(A('carService', { uid: cheap.uid, lid: 'city' }).ok && city.cars.jobs.at(-1).kind === 'resto', 'a wreck goes in for a restoration');
for (let i = 0; i < 20 && cheap.shop; i++) week();
assert(!cheap.shop && cheap.cond >= 92 && cheap.resto === K.city.name && p.life.wallet < w1, 'restored: condition 92+ and the workshop is named on the car');
car.cond = 60; assert(A('carService', { uid: car.uid, lid: shop.id }).ok, 'book another service');
const m2 = q.mail.find((x) => x.car && x.opts && x.opts[0].car && E.MAIL.isOpen(x)), w2 = p.life.wallet;
assert(A('mailAnswer', { id: m2.id, opt: 1 }, 'v').ok && !car.shop && p.life.wallet > w2, 'a job turned down is refunded');

// Cars & Coffee
{ const dl = city.listings.find((l) => l.type === 'dealer' && !E.BLD.unbuilt(l)); if (dl) { dl.owner = null; A('buy', { lid: dl.id }); } }
const r = A('carMeet', { uid: car.uid, who: 'collectors' });
assert(r.ok && p.life.meetM === city.m && car.drove === city.m, 'go to Cars & Coffee with a car');
assert(!A('carMeet', { uid: car.uid, who: 'tycoons' }).ok, 'once a month');
const lg = p.life.legacy; month(); const b = E.BOT.bots(city)[0], v0 = E.BOT.relV(city, b.id, 'u');
assert(A('carMeet', { uid: car.uid, who: 'tycoons' }).ok && p.life.legacy > lg - 1, 'meet the tycoons next month');

// lending
const dl = city.listings.find((l) => l.type === 'dealer' && l.owner && l.owner.id === 'u');
if (dl) { assert(A('carLend', { uid: cheap.uid, to: 'dealer' }).ok && dl.cx && dl.cx.ypi && cheap.lent, 'a car in your showroom window adds YPI'); }
const w3 = p.life.wallet; car.cond = 90;
assert(A('carLend', { uid: car.uid, to: 'film' }).ok && car.loan && car.lent && L.used(p, 'car') < 2, 'lend a car to a film: it frees its bay');
assert(!A('carDaily', { uid: car.uid }).ok, 'a lent car cannot be your daily car');
month(); assert(!car.loan && !car.lent && p.life.wallet > w3, 'it comes back after a month with the fee');
assert(A('itemLend', { uid: car.uid }).ok && car.lent && L.monthly(city, p).lend > 0, 'cars can go to the museum too');
assert(A('itemLend', { uid: car.uid }).ok && !car.lent, '... and come home');

// the daily car
const pr0 = L.prestige(city, p).score, c0 = car.cond;
assert(A('carDaily', { uid: car.uid }).ok && AU.daily(p) === car && L.prestige(city, p).score > pr0, 'the daily car adds prestige');
month(); assert(car.cond < c0, 'and wears faster');
const k = E.kx(city); assert(k.carNudge(p) === K.daily.bank[L.ITEM[car.cid].rarity], 'the bank\'s committee sees an Epic car');

// the Concours: entries open, judging two months later
while (city.m % 12 !== K.concours.open) month();
assert(AU.ccOpen(city) && p.mail.some((x) => x.car && /Concours/.test(x.subj)), 'the Concours opens and tycoons with cars get a mail');
car.cond = 100; assert(A('carEnter', { uid: car.uid }).ok, 'enter a car');
const lg2 = p.life.legacy; while (!city.cars.cc.res) month();
const res = city.cars.cc.res; assert(res.length >= 1 && res.some((x) => x.pid === 'u'), 'the judges rank the field');
const place = res.find((x) => x.pid === 'u').place;
if (place <= 3) assert(p.life.legacy > lg2 && car.award.length, 'a podium place adds prestige and goes on the car');

// chance cards
const ctx = E.chx(city); p.chance = p.chance || { next: 99, last: {}, log: [] }; p.chance.last = {}; p.life.guard = 0; // the autopilot may have fitted trackers already
const hits = E.CH.fits(city, p, ctx), ids = new Set(hits.map((h) => h.id));
assert(ids.has('barnfind') && ids.has('theft'), 'car cards fit a tycoon with a garage: ' + [...ids].filter((x) => CHANCE.cards[x] && ['barnfind', 'carbid', 'speeding', 'theft', 'setchase'].includes(x)).join(', '));
CHANCE.cards.barnfind.odds = 1; const bf = E.CH.deal(city, p, hits.find((h) => h.id === 'barnfind'), ctx); const n0 = p.life.items.length;
let rr; for (let t = 0; t < 1; t++) rr = A('mailAnswer', { id: bf.id, opt: 0 });
assert(rr.ok, 'answer the barn find: ' + rr.msg);
if (p.life.items.length > n0) { const it = p.life.items.at(-1); assert(L.ITEM[it.cid].lid === 'barn' && it.cond < 31 && city.life.made[it.cid], 'a barn find is a one-off car in poor condition'); }
p.life.items.filter((i) => L.ITEM[i.cid].cat === 'car').forEach((i) => { delete i.shop; delete i.loan; i.lent = false; });
const sp = hits.find((h) => h.id === 'speeding'); if (sp) { const m = E.CH.deal(city, p, sp, ctx); const w = p.life.wallet; assert(A('mailAnswer', { id: m.id, opt: 0 }).ok && p.life.wallet < w, 'pay the speeding fine'); }
const th = hits.find((h) => h.id === 'theft'); { const m = E.CH.deal(city, p, th, ctx); assert(A('mailAnswer', { id: m.id, opt: 0 }).ok && p.life.guard > city.m, 'fit trackers'); assert(!E.CH.fits(city, p, ctx).some((h) => h.id === 'theft'), 'no theft card while the trackers work'); }
// a rival wants your car
E.BOT.bots(city).forEach((b) => { b.cash = 100; }); give(p, 'c1');
const cb = E.CH.fits(city, p, ctx).find((h) => h.id === 'carbid'); assert(cb, 'a rival tycoon wants to buy one of your cars');
const cm = E.CH.deal(city, p, cb, ctx), w4 = p.life.wallet, sold = p.life.items.find((i) => i.uid === cb.uid);
assert(A('mailAnswer', { id: cm.id, opt: 0 }).ok && !p.life.items.includes(sold) && p.life.wallet > w4 && city.players[cb.bid].life.items.some((i) => i.uid === sold.uid), 'sell it to them');
// the missing piece of a set
p.life.items = p.life.items.filter((i) => i.cid !== 'c1' && i.cid !== 'c2'); Object.values(city.players).forEach((x) => { if (x.life) x.life.items = x.life.items.filter((i) => i.cid !== 'c1'); }); city.life.lots = city.life.lots.filter((l) => l.cid !== 'c1');
give(p, 'c2'); p.life.wallet = 50;
const sc = E.CH.fits(city, p, ctx).find((h) => h.id === 'setchase' && h.cid === 'c1'); assert(sc, 'one car short of Le Mans Legends: a missing piece card');
const sm = E.CH.deal(city, p, sc, ctx); assert(A('mailAnswer', { id: sm.id, opt: 0 }).ok && L.completeSets(p).includes('lemans'), 'buy it and complete the set');
// street parking: one car without a garage
{ const sv = { homes: p.life.homes, items: p.life.items, res: p.life.res, daily: p.life.daily }; p.life.homes = []; p.life.res = null; p.life.items = []; p.life.daily = null; p.life.wallet = 50;
  const cars = Object.values(L.ITEM).filter((d) => d.cat === 'car' && !d.lid && L.available(city, d.id) > 0).map((d) => d.id); cars.forEach((cid) => { if (!city.life.dealer.includes(cid)) city.life.dealer.push(cid); });
  assert(L.street(p) && L.capacity(p, 'car') === 1 && L.capacity(p, 'art') === 0, 'no home: room for one car on the street, no art');
  if (cars.length >= 2) { const r1 = A('itemBuy', { cid: cars[0] }); assert(r1.ok, 'buy a car with no garage: ' + r1.msg); const r2 = A('itemBuy', { cid: cars[1] }); assert(!r2.ok && /street/.test(r2.msg), 'a second car needs a garage: ' + r2.msg); }
  Object.assign(p.life, sv); }
console.log('cars: all good');
