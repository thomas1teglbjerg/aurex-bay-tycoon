// Moving supplies between your own companies (and your warehouses) with your own truck
import './open-doors.js';
import './standing.js';
import * as E from '../supabase/functions/_shared/engine.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
E.addPlayer(city, 'a', 'Thomas Mover', now); E.addPlayer(city, 'b', 'Mikkel Other', now);
const A = city.players.a; A.cash = 500; city.players.b.cash = 500;
const take = (type, pid) => { const l = city.listings.find((x) => x.type === type && !x.owner) || city.listings.find((x) => x.type === type); if (l.owner) { l.owner = null; l.ops = null; } assert(E.apply(city, pid, 'buy', { lid: l.id }, now).ok, `${pid} buys ${type}`); return l; };
const steel = take('metal', 'a'), build = take('construction', 'a'), film = take('film', 'a'), plant = take('concrete', 'a');
const other = city.listings.find((x) => x.type === 'construction' && x !== build); if (other.owner) { other.owner = null; other.ops = null; } assert(E.apply(city, 'b', 'buy', { lid: other.id }, now).ok, 'b buys a construction company');
steel.ops.inv.steel = 100;
const mv = (x) => E.apply(city, 'a', 'stockMove', { from: steel.id, to: build.id, g: 'steel', qty: 30, ...x }, now);

const ts = E.moveTargets(city, 'a', steel, 'steel');
assert(ts.some((t) => t.id === build.id) && !ts.some((t) => t.id === other.id) && !ts.some((t) => t.id === film.id), 'targets: own companies that use the good only');
assert(!mv({ to: other.id }).ok, 'not to someone else\'s company');
assert(!mv({ to: film.id }).ok, 'not to a company that does not use it');
assert(!E.apply(city, 'b', 'stockMove', { from: steel.id, to: other.id, g: 'steel', qty: 5 }, now).ok, 'others cannot move your stock');
const cash0 = A.cash, b0 = build.ops.inv.steel || 0;
let r = mv(); assert(r.ok, 'move steel to own construction company: ' + r.msg);
assert(steel.ops.inv.steel === 70, 'stock leaves the steel works');
assert(A.cash === cash0, 'no charge');
const sh = city.shipments[city.shipments.length - 1]; assert(sh.move && sh.to.id === build.id && sh.owner === 'a' && sh.by === 'a', 'own truck on the way');
assert(E.LOG.onTheWay(city, build, 'steel') === 30, 'shows as on the way');
r = mv({ qty: 500 }); assert(r.ok && steel.ops.inv.steel === 0, 'asking for more moves what is in stock: ' + r.msg);
assert(!mv().ok, 'nothing left to move');
now += 15 * 1000; E.advance(city, now); // a game year is 5 real minutes at this speed: 15 s ≈ 18 game days
assert(!city.shipments.some((s) => s.move), 'trucks arrived');
assert((build.ops.inv.steel || 0) > b0 + 60, 'steel arrived at the construction company');
assert(A.feed.some((f) => /Delivery at Construction/.test(f.title)), 'delivery noted in the feed');

// warehouses: a company can send to your warehouse, but fresh concrete never goes there
E.LOG.ensureWarehouses(city); const w = city.warehouses[0];
assert(E.apply(city, 'a', 'whBuy', { wid: w.id }, now).ok, 'a buys a warehouse');
steel.ops.inv.steel = 40;
r = mv({ to: 'w:' + w.id, qty: 10 }); assert(r.ok, 'move steel to own warehouse: ' + r.msg);
plant.ops.inv.concrete = 50;
assert(!E.moveTargets(city, 'a', plant, 'concrete').some((t) => t.k === 'w'), 'concrete never goes to a warehouse');
r = E.apply(city, 'a', 'stockMove', { from: plant.id, to: build.id, g: 'concrete', qty: 20 }, now); assert(r.ok, 'concrete to own builder: ' + r.msg);
assert(!E.apply(city, 'a', 'stockMove', { from: plant.id, to: build.id, g: 'water', qty: 1 }, now).ok, 'mains water cannot be moved');

// coop / holding companies only move among the same owner
const hid = 'hX'; city.holdings[hid] = { id: hid, name: 'Test Coop', members: { a: 1 }, treasury: 0, accrued: 0 };
build.owner = { k: 'h', id: hid };
assert(!E.moveTargets(city, 'a', steel, 'steel').some((t) => t.id === build.id), 'not from your own company into a coop company');
console.log('move tests passed');
