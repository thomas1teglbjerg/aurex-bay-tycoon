// Specialists as a market, contracts, stress and boredom, transfers, endless time and hostile takeovers
import './open-doors.js';
import * as E from '../supabase/functions/_shared/engine.js';
const T = E.TAL;
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 300;
const step = (act = true) => { now += E.realMsPerMonth(city); E.advance(city, now); if (act) E.apply(city, 'u', 'ping', {}, now); };
const A = (a, x) => E.apply(city, 'u', a, x, now);
assert(Object.keys(city.talent).length === 29, '29 specialists in the city');
assert(Object.values(city.players).filter((x) => x.bot).every((b) => !T.teamOf(city, b).length), 'rival tycoons start without specialists (a level start)');
const free = (kind) => Object.keys(city.talent).find((id) => T.PERSON[id].kind === kind && !city.talent[id].owner);
let tid = free('jason') || free('sofia') || Object.keys(city.talent).find((id) => !city.talent[id].owner); const kind = T.PERSON[tid].kind;
assert(!A('hire', { tid, salary: T.ask(city, tid) * 0.6, years: 2 }).ok, 'a lowball salary is refused');
assert(A('hire', { tid, salary: T.ask(city, tid), years: 2 }).ok && p.staff.includes(kind) && p.team[kind] === tid, 'sign a free agent on a 2-year contract');
const other = Object.keys(city.talent).find((id) => T.PERSON[id].kind === kind && id !== tid);
assert(!A('hire', { tid: other, salary: 9, years: 1 }).ok, 'only one specialist per role');
assert(E.rates(city, 'p', 'u').upkeep >= city.talent[tid].salary - 1e-9, 'salary is a running cost');
// put them to work as a head
const l = city.listings.find((x) => !x.owner && E.listingPrice(x) < 40); A('buy', { lid: l.id });
const dept = E.OPS.DEPTS_BY_HEAD[kind]; if (!l.ops.depts[dept]) A('deptOpen', { lid: l.id, dept });
assert(A('assignHead', { lid: l.id, dept, spec: kind }).ok && l.ops.depts[dept].hb > 0, 'assign as head; rating sets the automation bonus');
const s = city.talent[tid];
for (let i = 0; i < 6; i++) step();
assert(s.stress > 15, `heading an understaffed department is stressful (${Math.round(s.stress)})`);
s.stress = 80; assert(A('tVacation', { tid }).ok && s.stress <= 40 && !p.staff.includes(kind), 'vacation lowers stress; away for a month');
step(); assert(p.staff.includes(kind), 'back from vacation');
s.boredom = 70; assert(A('tChallenge', { tid }).ok && s.boredom < 30, 'a new challenge cures boredom');
s.stress = 95; step(); assert(s.leave != null && !p.staff.includes(kind), 'burnout sends them on sick leave');
for (let i = 0; i < 3; i++) step(); assert(s.leave == null && p.staff.includes(kind), 'they return after their leave');
// underpaying makes them unhappy and they hand in notice
assert(A('tSalary', { tid, salary: s.salary * 0.5 }).ok && s.sat < 60, 'a pay cut hurts satisfaction');
for (let i = 0; i < 12 && s.owner === 'u' && s.notice == null; i++) step();
assert(s.notice != null || s.owner !== 'u', 'an underpaid specialist hands in notice');
if (s.owner === 'u') { A('tSalary', { tid, salary: T.ask(city, tid) * 1.4 }); A('tBonus', { tid }); for (let i = 0; i < 2; i++) step(); }
assert(s.owner === 'u' ? s.notice == null : true, 'a raise and a bonus win them back (or they left)');
if (s.owner === 'u') {
  s.until = city.m + 2; assert(!A('tRenew', { tid, salary: 0.01, years: 3 }).ok, 'renewal at a silly salary is refused');
  assert(A('tRenew', { tid, salary: T.renewAsk(city, tid) * 1.05, years: 3 }).ok && s.until - city.m === 36, 'renew the contract for 3 years');
}
// scout and bid for a rival's specialist
let rival = Object.keys(city.talent).find((id) => { const x = city.talent[id]; return x.owner && city.players[x.owner].bot && !p.team[T.PERSON[id].kind]; });
if (!rival) { rival = Object.keys(city.talent).find((id) => !p.team[T.PERSON[id].kind]); const b = Object.values(city.players).find((x) => x.bot && !x.team[T.PERSON[rival].kind]); const x = city.talent[rival]; if (x.owner) { const o = city.players[x.owner]; delete o.team[T.PERSON[rival].kind]; o.staff = o.staff.filter((k) => k !== T.PERSON[rival].kind); } Object.assign(x, { owner: b.id, salary: T.ask(city, rival), since: city.m, until: city.m + 24 }); b.team[T.PERSON[rival].kind] = rival; b.staff.push(T.PERSON[rival].kind); }
assert(A('tScout', { tid: rival }).ok && T.scouted(city, p, rival), 'scouting reveals a rival specialist');
assert(!A('tOffer', { tid: rival, fee: 0.01, salary: T.ask(city, rival) * 1.3, years: 2 }).ok, 'a tiny transfer fee is turned down');
const r = A('tOffer', { tid: rival, fee: T.value(city, rival) * 1.5, salary: T.ask(city, rival) * 1.3, years: 2 });
assert(r.ok && city.talent[rival].owner === 'u', 'a big offer buys the specialist from a rival: ' + r.msg);
// a contract that runs out makes them a free agent
const s2 = city.talent[rival]; s2.until = city.m + 1; s2.leave = null; s2.notice = null; s2.stress = 10; step(); step();
assert(s2.owner !== 'u' && !p.team[T.PERSON[rival].kind], `an expired contract ends the deal (${s2.owner}, until ${s2.until}, m ${city.m}, leave ${s2.leave})`);
// the city never ends
for (let i = 0; i < 130; i++) step();
assert(!city.over && city.g > 10, `time keeps running past year 10 (year ${Math.floor(city.g) + 1})`);
// hostile takeovers when the owner disappears
const mine = E.ownedBy(city, 'p', 'u'); assert(mine.length, 'still owns companies');
const target = mine[0]; Object.values(target.ops.depts).forEach((d) => { d.w = 0; d.head = null; }); p.assign = {};
Object.values(city.players).filter((b) => b.bot).forEach((b) => (b.cash = 500));
let bid = null; for (let i = 0; i < 24 && !bid; i++) { step(false); bid = city.offers.find((o) => o.hostile && o.lid === target.id && o.status === 'open'); }
assert(bid, 'rivals bid for a neglected company of an absent owner');
assert(E.protection(city, target).safe === false, 'the company is marked as unprotected');
step(false); step(false);
assert(!target.owner || target.owner.id !== 'u', 'nobody rejected the bid: the company changed hands');
// an active owner is safe
const l2 = city.listings.find((x) => x.owner && x.owner.k === 'p' && city.players[x.owner.id].bot);
const giveTo = (l, pid) => { l.owner = { k: 'p', id: pid }; l.ops.managed = false; Object.values(l.ops.depts).forEach((d) => { d.w = 0; d.head = null; }); };
giveTo(l2, 'u'); A('ping', {}); assert(E.protection(city, l2).safe, 'an active owner is protected');
// a human can bid on another absent human's company, and the owner can come back and reject it
E.addPlayer(city, 'v', 'Mia', now); const q = city.players.v; q.cash = 500;
const f2 = city.listings.find((x) => x.owner && x.owner.k === 'p' && city.players[x.owner.id].bot && x !== l2); giveTo(f2, 'v'); q.lastAct = city.m - 10;
p.cash = 500; const hb = A('hostileBid', { lid: f2.id }); assert(hb.ok, 'bid on an absent player\'s company: ' + hb.msg);
assert(E.apply(city, 'v', 'offerDecline', { id: city.offers.find((o) => o.hostile && o.lid === f2.id).id }, now).ok, 'the owner comes back and rejects it');
console.log('ALL OK, city KB', Math.round(JSON.stringify(city).length / 1024));
