// Prestige opens doors: Large companies need Respected, 4★/5★ specialists need Known/Respected,
// luxury companies of a human owner sell 2% more per tier. Bots are never held back.
import './standing.js';
import * as E from '../supabase/functions/_shared/engine.js';
import * as LIFE from '../supabase/functions/_shared/life.js';
import * as OPS from '../supabase/functions/_shared/ops.js';
import * as T from '../supabase/functions/_shared/talent.js';
import { PRESTIGE, PRESTIGE_TIERS } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 500;
const A = (a, x) => E.apply(city, 'u', a, x, now);
const setTier = (t) => { p.life.legacy = 0; p.life.legacy = PRESTIGE_TIERS[t].min - LIFE.prestige(city, p).score + 1; assert(LIFE.tierOf(city, p) === t, `player is ${PRESTIGE_TIERS[t].name}`); };
const free = (size) => { const l = city.listings.find((x) => x.size === size && !E.BLD?.isPlot?.(x) && x.type !== 'finance' && x.type !== 'bank' && x.type !== 'newspaper'); l.owner = null; l.ops = null; delete l.site; l.built = true; return l; };

// --- Large companies
setTier(0);
const big = free('L'), med = free('M');
let r = A('buy', { lid: big.id }); assert(!r.ok && /Respected/.test(r.msg || r.error || ''), 'a Newcomer cannot buy a Large company');
assert(E.bigGate(city, p, big), 'bigGate says why');
assert(A('buy', { lid: med.id }).ok, 'a Newcomer can still buy a Medium company');
setTier(1); assert(!A('buy', { lid: big.id }).ok, 'Known is not enough');
setTier(PRESTIGE.bigTier); assert(A('buy', { lid: big.id }).ok, 'Respected buys the Large company');

// bids on another tycoon's Large company are gated too
E.addPlayer(city, 'v', 'Mikkel', now); const q = city.players.v; q.cash = 500;
r = E.apply(city, 'v', 'offer', { lid: big.id, amt: 10 }, now); assert(!r.ok, 'a Newcomer cannot bid for a Large company');
assert(E.bigGate(city, Object.values(city.players).find((b) => b.bot), big) === null, 'bots are never held back');

// --- specialists
const five = T.PERSON['t-elena'] ? 't-elena' : null, four = Object.keys(T.PERSON).find((id) => city.talent[id] && city.talent[id].rating === 4 && !city.talent[id].owner);
const freeUp = (tid) => { const s = city.talent[tid]; if (s.owner) { const o = city.players[s.owner]; if (o && o.team) { const k = T.PERSON[tid].kind; delete o.team[k]; o.staff = (o.staff || []).filter((x) => x !== k); } s.owner = null; } city.talent[tid].rating = T.PERSON[tid].rating; };
const hire = (tid) => { const k = T.PERSON[tid].kind; if (p.team[k]) { delete p.team[k]; p.staff = p.staff.filter((x) => x !== k); } return A('hire', { tid, salary: T.ask(city, tid) * 1.05, years: 2 }); };
freeUp(five); setTier(1);
r = hire(five); assert(!r.ok && /5★/.test(r.msg || r.error || ''), 'a 5★ specialist will not talk to a Known tycoon');
assert(E.talentGate(city, p, five), 'talentGate says why');
setTier(2); assert(hire(five).ok, 'Respected signs a 5★ specialist');
if (four) { freeUp(four); setTier(0); assert(!hire(four).ok, 'a 4★ specialist will not talk to a Newcomer'); setTier(1); assert(hire(four).ok, 'Known signs a 4★ specialist'); }

// --- luxury demand
const hotel = city.listings.find((l) => l.type === 'hotel' && l.size !== 'L') || city.listings.find((l) => l.type === 'hotel');
hotel.owner = null; hotel.ops = null; delete hotel.site; hotel.built = true; setTier(3); A('buy', { lid: hotel.id });
assert(hotel.owner && hotel.owner.id === 'u', 'bought a hotel');
hotel.ops.lux = 0; const d0 = OPS.demand(city, hotel); hotel.ops.lux = 3; const d3 = OPS.demand(city, hotel);
assert(Math.abs(d3 / d0 - (1 + 3 * PRESTIGE.lux.pct)) < 1e-9, `an Elite owner's hotel sells ${Math.round(3 * PRESTIGE.lux.pct * 100)}% more`);
now += E.realMsPerMonth(city) * 1.1; E.advance(city, now);
assert(hotel.ops.lux === LIFE.tierOf(city, p), 'the monthly cycle records the human owner\'s tier');
const botCo = city.listings.find((l) => l.owner && l.owner.k === 'p' && city.players[l.owner.id] && city.players[l.owner.id].bot && l.ops);
if (botCo) assert(!botCo.ops.lux, 'bot companies get no luxury bonus');
console.log('OK');
