// Hotels host guests: bookings instead of orders, check-in instead of finished stock and delivery, supplies used per stay, rare VIPs
import * as E from '../supabase/functions/_shared/engine.js';
import { RECIPES, VIP_GUESTS } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
const O = E.OPS;
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 500; p.founded = true;
const week = () => { now += E.realMsPerMonth(city) / 4; E.advance(city, now); E.apply(city, 'u', 'ping', {}, now); };
const month = () => { for (let i = 0; i < 4; i++) week(); };
const hotel = city.listings.find((l) => l.type === 'hotel');
if (hotel.owner) { hotel.owner = null; hotel.ops = null; }
const r = E.apply(city, 'u', 'buy', { lid: hotel.id }, now);
assert(r.ok, 'buy a hotel: ' + (r.msg || ''));
assert(O.hosts(hotel) && !O.hosts(city.listings.find((l) => l.type === 'car')), 'hotels host guests, car factories do not');
const o = hotel.ops; o.depts.ops.w = O.needWorkers(hotel, 'ops');
// plenty of supplies so stays are never blocked by stock
Object.keys(RECIPES.hotel.in).forEach((g) => (o.inv[g] = 5000));
month();
assert(!o.fg && !o.line, 'a hotel has no finished stock and no production line');
assert(o.rooms && o.rooms.cap > 0, `rooms are counted per month (${o.rooms.cap})`);
const bk = o.orders.find((x) => x.status === 'new');
assert(bk, 'bookings arrive from booking channels');
const inv0 = { ...o.inv }, cash0 = p.cash;
assert(E.apply(city, 'u', 'order', { lid: hotel.id, op: 'accept', oid: bk.id }, now).ok && bk.status === 'accepted', 'confirm a booking');
const dv = E.apply(city, 'u', 'order', { lid: hotel.id, op: 'deliver', oid: bk.id, cid: bk.cid }, now);
assert(!dv.ok, 'there is nothing to deliver: ' + dv.msg);
assert(!O.tasks(city, hotel).some((t) => t.id === 'deliver'), 'no delivery task for a hotel');
week();
assert(o.done.some((x) => x.id === bk.id), 'the guests checked in by themselves');
assert(Object.keys(RECIPES.hotel.in).every((g) => o.inv[g] < inv0[g]), 'their stay used food, linen, energy and media');
assert(p.cash > cash0 - 1, 'the stay was paid');
// without supplies, confirmed guests wait and finally go elsewhere
Object.keys(o.inv).forEach((g) => (o.inv[g] = 0));
const b2 = o.orders.find((x) => x.status === 'new') || (month(), o.orders.find((x) => x.status === 'new'));
if (b2) {
  E.apply(city, 'u', 'order', { lid: hotel.id, op: 'accept', oid: b2.id }, now); week();
  assert(b2.status === 'accepted' && b2.wait === 'supplies', 'out of supplies: the guests wait');
  for (let i = 0; i < 3; i++) { Object.keys(o.inv).forEach((g) => (o.inv[g] = 0)); month(); }
  assert(b2.status === 'cancelled' && /elsewhere/.test(b2.reason), 'guests who wait too long book elsewhere: ' + b2.reason);
}
// VIP guests
Object.keys(RECIPES.hotel.in).forEach((g) => (o.inv[g] = 5000));
const rep0 = o.rep;
const v = O.vipBooking(city, { listingYield: E.listingYield, notify: () => {}, news: () => {} }, hotel, 'prince');
assert(v && v.vip === 'prince' && v.need > 1, 'a VIP booking uses extra supplies per stay');
const normal = o.orders.concat(o.done).find((x) => !x.vip);
if (normal) assert(v.unit > normal.unit * 3, `a VIP pays far more per stay (${v.unit} vs ${normal.unit})`);
assert(!O.vipBooking(city, { listingYield: E.listingYield, notify: () => {} }, hotel), 'only one VIP at a time');
E.apply(city, 'u', 'order', { lid: hotel.id, op: 'accept', oid: v.id }, now);
o.rooms.used = 0; week();
assert(o.done.some((x) => x.id === v.id), 'the VIP checked in first');
assert(o.rep > rep0 || o.rep >= 99, `a happy VIP lifts reputation (${rep0} → ${o.rep})`);
// the agenda brings VIPs now and then
let vips = 0; const seen = new Set();
for (let i = 0; i < 48 * 4; i++) { week(); o.orders.concat(o.done).forEach((x) => { if (x.vip && !seen.has(x.id)) { seen.add(x.id); vips++; } }); Object.keys(RECIPES.hotel.in).forEach((g) => (o.inv[g] = 5000)); }
assert(vips >= 1 && vips <= 20, `VIPs are rare: ${vips} in four years`);
// departments look like a hotel, with the same rules
assert(O.deptFor(hotel, 'ops').name === 'Front Desk & Housekeeping' && O.deptFor(hotel, 'rnd').name === 'Spa & Restaurant', 'hotel departments have hotel names');
assert(O.deptFor(hotel, 'sales').settings[0].label === 'Room rates' && O.deptFor(hotel, 'sales').settings[0].opts.length === 3, 'hotel settings keep their options');
assert(O.deptFor(car(), 'ops').name === 'Operations', 'other companies keep their departments');
assert(O.interactionFor(hotel, 'runExperiment').title !== O.interactionFor(car(), 'runExperiment').title && O.interactionFor(hotel, 'runExperiment').options.length === 3, 'hotel tasks have their own scenes');
VIP_GUESTS.forEach((x) => assert(x.share > 0 && x.mult > 1 && x.sup >= 1, `VIP ${x.id} is defined`));
function car() { return city.listings.find((l) => l.type === 'car'); }
