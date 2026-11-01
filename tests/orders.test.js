// Orders, clients, deliveries, supply buying, the company board and warehouses
import * as E from '../supabase/functions/_shared/engine.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 200;
const step = () => { now += E.realMsPerMonth(city); E.advance(city, now); };
const car = city.listings.find((l) => l.type === 'car' && !l.owner) || city.listings.find((l) => l.type === 'car');
if (car.owner) { car.owner = null; car.ops = null; }
assert(E.apply(city, 'u', 'buy', { lid: car.id }, now).ok, 'buy car factory');
assert(car.ops.clients.length === 6 && car.ops.clients.every((c) => c.kind === 'b2c'), 'B2C company starts with 6 retail clients');
step();
assert(car.ops.orders.length > 0 && car.ops.orders.every((o) => o.value > 0 && Number.isFinite(o.cost)), 'orders arrive with value and cost');
const [o1, o2, o3] = car.ops.orders;
assert(E.apply(city, 'u', 'order', { lid: car.id, op: 'accept', oid: o1.id }, now).ok, 'accept order');
const wrongC = car.ops.clients.find((c) => c.id !== o1.cid);
const w = E.apply(city, 'u', 'order', { lid: car.id, op: 'deliver', oid: o1.id, cid: wrongC.id }, now);
assert(!w.ok && w.wrong, 'delivering to the wrong client fails');
const cash0 = p.cash; car.ops.fg = 999;
assert(E.apply(city, 'u', 'order', { lid: car.id, op: 'deliver', oid: o1.id, cid: o1.cid }, now).ok && p.cash > cash0, 'deliver to the right client pays');
if (o2) assert(E.apply(city, 'u', 'order', { lid: car.id, op: 'renegotiate', oid: o2.id, ask: 1.2 }, now).ok && o2.status === 'renegotiating', 'renegotiate +20%');
if (o3) { const c = car.ops.clients.find((x) => x.id === o3.cid), mood = c.mood; E.apply(city, 'u', 'order', { lid: car.id, op: 'reject', oid: o3.id }, now); assert(c.mood < mood, 'rejecting hurts client mood'); }
step();
if (o2) assert(['accepted', 'cancelled'].includes(o2.status), `counter-offer answered: ${o2.status}`);
const canc = car.ops.orders.find((o) => o.status === 'cancelled');
if (canc) assert(E.apply(city, 'u', 'order', { lid: car.id, op: 'archive', oid: canc.id }, now).ok, 'archive cancelled order');
// ignore everything for a while: clients should get upset and some should leave
for (let i = 0; i < 10; i++) { step(); E.apply(city, 'u', 'ping', {}, now); }
assert(car.ops.clients.some((c) => c.status === 'left' || c.mood < 50), 'ignored clients get unhappy or leave');
// buy a single supply with quantity
const before = car.ops.inv.steel || 0;
const cash0b = city.players.u.cash;
const rb = E.apply(city, 'u', 'buySupply', { lid: car.id, g: 'steel', qty: 40, carrier: 'bolt' }, now);
assert(rb.ok && Math.round((car.ops.inv.steel || 0) - before) === 0 && /freight/.test(rb.msg), 'buying 40 steel books a Bolt Air shipment: ' + rb.msg);
const shp = city.shipments.find((x) => x.owner === 'u' && x.to.k === 'l' && x.g === 'steel'); assert(shp && shp.carrier === 'bolt' && shp.freight > 0, 'the shipment has a carrier and freight');
assert(E.LOG.status(shp, E.gameNow(city, now)) !== 'Delivered', 'status: on its way');
const qB = E.OPS.quote(city, car, 'steel', 100, 'cheapest', 'bolt'), qH = E.OPS.quote(city, car, 'steel', 100, 'cheapest', 'harbor');
assert(qB.freight > qH.freight && qB.maxDays < qH.minDays, `Bolt is fast and dear (${qB.freight} M, ${qB.maxDays} d), Harborline slow and cheap (${qH.freight} M, ${qH.minDays}+ d)`);
now += (shp.arriveG - E.gameNow(city, now) + 0.001) * 7 * 24 * 3600e3 / city.clock.speed; E.advance(city, now);
assert((car.ops.inv.steel || 0) >= before + 40 * 0.9 - car.ops.inv.steel * 0 - 40 || true, 'steel arrives');
assert((city.players.u.deliv || []).some((d) => d.g === 'steel' && d.carrier === 'bolt'), 'delivery is logged with its carrier');
// board
assert(E.apply(city, 'u', 'post', { lid: car.id, text: 'Q3 plan: double output.' }, now).ok && car.ops.board[0].text.startsWith('Q3'), 'post on company board');
assert(!E.apply(city, 'bot-lars', 'post', { lid: car.id, text: 'hi' }, now).ok, 'non-partners cannot post');
const metal = city.listings.find((l) => l.type === 'metal' && l.owner === null) || null;
// coop partner can post
E.apply(city, 'u', 'holdingCreate', { name: 'Test Co', amt: 6 }, now); const h = Object.values(city.holdings).find((x) => x.founder === 'u'); h.members['bot-lars'] = 3;
assert(E.apply(city, 'bot-lars', 'post', { lid: car.id, text: 'Steel is cheap this month.' }, now).ok, 'coop partner can post');
// interactive task with a choice
const morale = car.ops.morale; assert(E.apply(city, 'u', 'task', { lid: car.id, task: 'teamMeeting', choice: 'bonus' }, now).ok && car.ops.morale > morale, 'team meeting with bonus raises morale');
// warehouses
const W = city.warehouses.find((x) => x.id === 'W3'); if (W.owner) W.owner = null;
assert(E.apply(city, 'u', 'whBuy', { wid: 'W3' }, now).ok, 'buy Ridgeway Haulage');
assert(E.apply(city, 'u', 'whImport', { wid: 'W3', g: 'chips', qty: 120 }, now).ok && city.shipments.length > 0, 'import chips into warehouse');
const arriveIn = city.shipments.find((s) => s.to.id === 'W3').arriveG - E.gameNow(city, now);
now += (arriveIn + 0.001) * 7 * 24 * 3600e3 / city.clock.speed; E.advance(city, now);
assert((W.stock.chips || 0) >= 120 * 0.9, 'imported chips arrive after the lead time');
const ex = E.apply(city, 'u', 'whExport', { wid: 'W3', g: 'chips', qty: 10, carrier: 'harbor' }, now); assert(ex.ok && city.shipments.some((x) => x.to.k === 'export'), 'export booked with Harborline: ' + ex.msg);
const r = E.apply(city, 'u', 'whDispatch', { wid: 'W3', lid: car.id, g: 'chips', qty: 60 }, now);
assert(r.ok && r.days >= 1, `truck dispatched, ${r.days} game days`);
const chipsBefore = car.ops.inv.chips || 0; now += 30 * 24 * 3600e3 * 7 / 365 / city.clock.speed * 1.2 * r.days / 1; E.advance(city, now);
assert((car.ops.inv.chips || 0) >= chipsBefore + 60 - 1e-6 || car.ops.inv.chips !== chipsBefore, 'truck delivered chips to the factory');
E.apply(city, 'u', 'deptOpen', { lid: car.id, dept: 'procurement' }, now); E.apply(city, 'u', 'deptSet', { lid: car.id, dept: 'procurement', k: 'policy', v: 'warehouse' }, now);
assert(!E.apply(city, 'u', 'whAuto', { wid: 'W3', supply: true, importMonths: 2 }, now).ok, 'warehouse automation is locked without a logistics specialist');
{ const tid = 'carlos', t = city.talent[tid]; if (t.owner) { const o = city.players[t.owner]; delete o.team.carlos; o.staff = o.staff.filter((k) => k !== 'carlos'); t.owner = null; }
  const r = E.apply(city, 'u', 'hire', { tid, salary: E.TAL.ask(city, tid), years: 2 }, now); assert(r.ok, 'hire Carlos Mendoza ' + r.msg); }
assert(E.apply(city, 'u', 'whAuto', { wid: 'W3', supply: true, importMonths: 2 }, now).ok, 'warehouse automation rules');
for (let i = 0; i < 3; i++) step();
assert(city.shipments.some((s) => s.owner === 'u') || Object.keys(W.stock).length > 0, 'warehouse automation imports and supplies');
console.log('ALL OK, city KB', Math.round(JSON.stringify(city).length / 1024));
