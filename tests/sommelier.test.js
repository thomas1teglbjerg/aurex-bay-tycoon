// Sommeliers: two specialists who pay off in hotels, restaurants and vineyards
import './open-doors.js';
import './standing.js';
import * as E from '../supabase/functions/_shared/engine.js';
import { SOMMELIER, VINTAGE, TYPES } from '../supabase/functions/_shared/content.js';
const T = E.TAL;
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
// rivals buy at random when the city starts: use a city where a vineyard and a hotel or restaurant are still for sale
let city; do { city = E.createCity(now, { speed: 2016 }); } while (!city.listings.some((x) => x.type === 'vineyard' && !x.owner) || !city.listings.some((x) => ['hotel', 'restaurant'].includes(x.type) && !x.owner));
E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 500;
const A = (a, x) => E.apply(city, 'u', a, x, now);
assert(T.PERSON.laurent && T.PERSON.elise && city.talent.laurent && city.talent.elise, 'Laurent and Elise are in the specialist market');
// a fresh city may have handed them to a rival: free them for the test
['laurent', 'elise'].forEach((tid) => { const s = city.talent[tid]; if (s.owner) { const o = city.players[s.owner]; delete o.team[T.PERSON[tid].kind]; o.staff = o.staff.filter((k) => k !== T.PERSON[tid].kind); if (o.assign) delete o.assign[T.PERSON[tid].kind]; s.owner = null; } });
const sign = (tid) => { const k = T.PERSON[tid].kind; if (p.team[k]) { A('tRelease', { tid: p.team[k] }); delete p.team[k]; p.staff = p.staff.filter((x) => x !== k); } return A('hire', { tid, salary: T.ask(city, tid) * 1.05, years: 2 }); };
assert(sign('laurent').ok && p.team.marco === 'laurent', 'sign Laurent Beaumont (Master Sommelier, leads Operations)');
assert(sign('elise').ok && p.team.jason === 'elise', 'sign Elise Marchand (Sommelier, leads Sales)');
assert(T.title(city, 'laurent').includes('Master Sommelier') && T.title(city, 'elise').includes('Sommelier'), 'they carry the sommelier title');

const v = city.listings.find((x) => x.type === 'vineyard' && !x.owner);
const bv = A('buy', { lid: v.id }); assert(bv.ok, 'buy the vineyard ' + (bv.msg || bv.error || ''));
const before = E.vintageOdds(city, v), dem0 = E.OPS.demand(city, v);
['ops', 'sales'].forEach((d) => { if (!v.ops.depts[d]) A('deptOpen', { lid: v.id, dept: d }); });
assert(A('assignHead', { lid: v.id, dept: 'ops', spec: 'marco' }).ok && A('assignHead', { lid: v.id, dept: 'sales', spec: 'jason' }).ok, 'both lead a department at the estate');
assert(E.sommeliers(city, v).length === 2, 'the estate counts two sommeliers');
const after = E.vintageOdds(city, v);
const plain = Math.min(VINTAGE.maxChance, VINTAGE.chance + VINTAGE.perHead * 2);
assert(after.chance > plain && after.chance <= VINTAGE.maxChance, `sommeliers raise the vintage chance beyond other heads (${before.chance} → ${after.chance})`);
assert(after.bump > VINTAGE.bump * 9, `and the chance of a rarer wine (${after.bump.toFixed(2)})`);
assert(E.OPS.demand(city, v) > dem0 * 1.1, 'Elise raises customer demand');
const y = E.listingYield(city, v), sz = { S: 0.6, M: 1, L: 1.5 }[v.size];
assert(y.notes.some((n) => /Laurent \(sommelier\)/.test(n)) && y.notes.some((n) => /Elise \(sommelier\)/.test(n)) && y.ypi > TYPES.vineyard.ypi * sz + 1.4 * sz, `both add YPI at a vineyard (${y.notes.join(', ')})`);

// the same pair do nothing extra at a factory
const f = city.listings.find((x) => !x.owner && ['metal', 'chip', 'car'].includes(x.type));
assert(E.sommeliers(city, f).length === 0 && !SOMMELIER.types.includes(f.type), 'no sommelier bonus outside hospitality');
// a hotel or restaurant also gets the bonus
const r = city.listings.find((x) => !x.owner && (x.type === 'restaurant' || x.type === 'hotel') && E.listingPrice(x) < p.cash);
assert(A('buy', { lid: r.id }).ok, 'buy a ' + r.type);
if (!r.ops.depts.ops) A('deptOpen', { lid: r.id, dept: 'ops' });
assert(A('assignHead', { lid: r.id, dept: 'ops', spec: 'marco' }).ok && E.sommeliers(city, r).includes('laurent'), 'Laurent moves to the ' + r.type);
// a vintage rolled with sommelier extras is more likely
const roll = (extra, n) => { const l = { id: 'XS', size: 'S', level: 1 }; let hits = 0; for (let i = 0; i < n; i++) { const x = E.LIFE.vintage(city, l, { heads: [], extra, name: 'T' }); if (x.def) { hits++; delete city.life.made[x.def.id]; delete city.life.items[x.def.id]; } } return hits / n; };
const base = roll(null, 3000), boosted = roll({ chance: 0.25, bump: 0.3 }, 3000);
assert(boosted > base + 0.15, `the extra chance reaches the harvest (${base.toFixed(2)} → ${boosted.toFixed(2)})`);
console.log('ALL OK');
