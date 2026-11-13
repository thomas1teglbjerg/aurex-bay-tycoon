// Small companies have no HR, Finance, R&D or Legal; older saves are trimmed once
import './open-doors.js';
import * as E from '../supabase/functions/_shared/engine.js';
import * as O from '../supabase/functions/_shared/ops.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 200;
const small = city.listings.find((l) => l.size === 'S' && !l.owner && l.type === 'chip') || city.listings.find((l) => l.size === 'S' && l.type === 'chip');
if (small.owner) { small.owner = null; small.ops = null; }
assert(E.apply(city, 'u', 'buy', { lid: small.id }, now).ok, 'buy a small company');
assert(O.deptsFor(small).length === 4 && !O.deptAllowed(small, 'hr'), 'small company offers 4 departments');
const r = E.apply(city, 'u', 'deptOpen', { lid: small.id, dept: 'rnd' }, now);
assert(!r.ok && !small.ops.depts.rnd, 'cannot open R&D in a small company');
assert(E.apply(city, 'u', 'deptOpen', { lid: small.id, dept: 'sales' }, now).ok, 'can still open Sales');
assert(O.legallyCovered(small), 'small companies pass audits');
const big = city.listings.find((l) => l.size !== 'S');
assert(O.deptsFor(big).length === 8 && O.deptAllowed(big, 'legal'), 'larger companies keep all 8');
// an older save: a small company with the four departments, workers and a head
['hr', 'finance', 'rnd', 'legal'].forEach((k) => (small.ops.depts[k] = { w: 2, set: {}, head: null }));
small.ops.depts.rnd.head = 'anika'; p.staff.push('anika'); p.assign.anika = { lid: small.id, dept: 'rnd' };
small.ops.depts.ops.w = 0; delete city.smallV;
const cash = p.cash; E.advance(city, now + 1);
assert(['hr', 'finance', 'rnd', 'legal'].every((k) => !small.ops.depts[k]), 'old departments removed');
assert(small.ops.depts.ops.w === Math.min(8, O.needWorkers(small, 'ops') * 3), `workers moved to Operations (${small.ops.depts.ops.w})`);
assert(!p.assign.anika && p.staff.includes('anika'), 'the head is free again and still on the team');
assert(p.cash > cash, `opening fees refunded (+${(p.cash - cash).toFixed(2)} M)`);
console.log('all small-company tests passed');
