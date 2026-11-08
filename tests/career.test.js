// The tycoon's own career: lead a department yourself, earn XP, level up slowly, choose a specialisation.
import './standing.js';
import * as E from '../supabase/functions/_shared/engine.js';
import { CAREER } from '../supabase/functions/_shared/content.js';
const C = E.CAR, O = E.OPS, T = E.TAL;
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
E.addPlayer(city, 'u', 'Thomas Debenhams', now); E.addPlayer(city, 'v', 'Mikkel Debenhams', now);
const p = city.players.u, v = city.players.v; p.cash = 600; v.cash = 300;
const A = (who, a, x) => E.apply(city, who, a, x, now);
const month = (n = 1) => { for (let i = 0; i < n; i++) { now += E.realMsPerMonth(city); E.advance(city, now); A('u', 'ping'); A('v', 'ping'); } };

assert(p.career && p.career.seeded, 'every tycoon gets a career');
assert(C.level(0) === 1 && C.level(149) === 1 && C.level(150) === 2 && C.level(1400) === 5 && C.level(9500) === 10, 'level curve 150 / 400 / … / 9500');
assert(C.rating(1) === 1 && C.rating(5) === 3 && C.rating(10) === 5, 'level 5 leads like a normal specialist, 10 like a star');

// lead Operations yourself
const l = city.listings.find((x) => !x.owner && x.size !== 'S' && TYPES_OK(x) && E.listingPrice(x) < 60);
function TYPES_OK(x) { return ['restaurant', 'hotel', 'vineyard', 'clothing', 'autorepair', 'dealer'].includes(x.type); }
assert(A('u', 'buy', { lid: l.id }).ok, 'buy a service company');
const r = A('u', 'meHead', { lid: l.id, dept: 'ops' });
assert(r.ok && l.ops.depts.ops.head === 'self' && l.ops.depts.ops.who === 'p:u', 'you lead Operations yourself: ' + r.msg);
assert(Math.abs(l.ops.depts.ops.hb - T.headBonus(1)) < 1e-9, 'a beginner adds a junior head\'s automation');
assert(!O.roleOn(l.ops.depts.ops), 'the role\'s own effect waits for level 3');
const cap0 = O.capacity(l);
// a second seat needs Tycoon level 25
A('u', 'deptOpen', { lid: l.id, dept: 'sales' });
assert(!A('u', 'meHead', { lid: l.id, dept: 'sales' }).ok, 'only one seat at the start');
assert(!A('v', 'meHead', { lid: l.id, dept: 'ops' }).ok, 'nobody leads a company they do not run');

// level 3 brings the role
p.career.xp.ops = 400; E.CAR.refresh(city, { ...ctxOf() });
function ctxOf() { return { ...E.cctx(city), inactive: () => false }; }
assert(l.ops.depts.ops.lv === 3 && O.roleOn(l.ops.depts.ops) && O.capacity(l) > cap0 * 1.09, 'at level 3 you add the head-of-Operations output bonus');

// XP from leading, with a cap on to-dos
const xp0 = p.career.xp.ops, bx0 = p.career.bx.service;
month();
assert(p.career.xp.ops > xp0, `a month leading Operations adds field XP (${(p.career.xp.ops - xp0).toFixed(1)})`);
assert(p.career.bx.service > bx0, 'and Service sector XP');
const s0 = p.career.xp.sales; for (let i = 0; i < 20; i++) C.task(city, p, l, 'findCustomers', null);
assert(p.career.xp.sales - s0 <= CAREER.caps.task * CAREER.xp.task + 1e-9, 'to-dos give XP up to the monthly cap');
assert(p.career.st.tasks >= 20, 'but every to-do counts in your statistics');

// stock profit trains Finance, capped per year
const f0 = p.career.xp.finance; C.stock(city, p, 'health', 100, null);
assert(p.career.xp.finance - f0 === CAREER.caps.stockYear && p.career.bx.health >= CAREER.caps.stockYear, 'stock profit: Finance + the stock\'s sector, max 40 a year');
C.stock(city, p, 'health', 100, null); assert(p.career.xp.finance - f0 === CAREER.caps.stockYear, 'the yearly cap holds');

// a specialist takes the seat back
const mid = Object.keys(city.talent).find((id) => T.PERSON[id].kind === 'marco' && !city.talent[id].owner);
assert(A('u', 'hire', { tid: mid, salary: T.ask(city, mid) * 1.05, years: 2 }).ok, 'sign an operations specialist');
assert(A('u', 'assignHead', { lid: l.id, dept: 'ops', spec: 'marco' }).ok && l.ops.depts.ops.head === 'marco' && !p.career.seats.length, 'a specialist replaces you as head, your seat frees up');
assert(A('u', 'meHead', { lid: l.id, dept: 'ops' }).ok && !p.assign.marco && l.ops.depts.ops.head === 'self', 'and you can take it back: the specialist goes to the bench');
assert(A('u', 'meLeave', { lid: l.id, dept: 'ops' }).ok && !l.ops.depts.ops.head, 'step down');

// away: your seat stops working
A('u', 'meHead', { lid: l.id, dept: 'ops' }); p.lastAct = city.m - 10; E.CAR.refresh(city, { ...ctxOf(), inactive: (x) => x === p });
assert(l.ops.depts.ops.hb === 0 && !O.roleOn(l.ops.depts.ops), 'while you are away your department runs as if leaderless'); p.lastAct = city.m;

// coops: co-owners lead the coop's companies
assert(A('v', 'holdingCreate', { name: 'Debenhams Partners', amt: 200 }).ok, 'found a coop');
const h = Object.values(city.holdings).find((x) => x.founder === 'v'); h.members.u = 50;
const cl = city.listings.find((x) => !x.owner && E.listingPrice(x) < 150);
assert(A('v', 'buy', { lid: cl.id, as: h.id }).ok && cl.owner.k === 'h', 'the coop buys a company');
assert(A('v', 'meHead', { lid: cl.id, dept: 'ops' }).ok, 'a co-owner leads a department in the coop company');
assert(!A('u', 'meHead', { lid: cl.id, dept: 'ops' }).ok, 'only one person per seat');

// specialisation at sector level 5; switching costs 25%
assert(!A('u', 'meSpec', { sector: 'service', pick: 'host' }).ok, 'no specialisation before level 5');
p.career.bx.service = 1500; assert(A('u', 'meSpec', { sector: 'service', pick: 'host' }).ok && p.career.spec.service === 'host', 'choose The Host at Service level 5');
E.CAR.refresh(city, ctxOf()); assert(O.hasSp(l, 'host'), 'your companies in the sector carry it');
p.career.bx.service = 3000; assert(A('u', 'meSpec', { sector: 'service', pick: 'motor' }).ok && p.career.bx.service === 2250, 'switching gives up 25% of the sector XP');
p.career.bx.finance = 1500; A('u', 'meSpec', { sector: 'finance', pick: 'banker' });
assert(E.loanRate(city, p) <= E.loanRate(city, { ...p, career: { ...p.career, spec: {} } }) - 1 + 1e-9 || E.loanRate(city, p) === 1, 'Banker: one point less interest');

// rust never costs a level
p.career.xp.legal = 820; p.career.used.legal = city.m - 30; month(3);
assert(p.career.xp.legal < 820 && p.career.xp.legal >= 800, 'an unused field rusts, but never below its level');

// tycoon level and titles
assert(C.tycoon(p) > 0 && C.title(p).name, `Tycoon level ${C.tycoon(p)} (${C.title(p).name})`);
p.career.xp.sales = 9500; p.career.xp.finance = 9500; p.career.xp.hr = 4800; assert(C.seatsAllowed(p) >= 2, 'a higher Tycoon level opens a second seat');
A('u', 'deptOpen', { lid: l.id, dept: 'hr' }); assert(A('u', 'meHead', { lid: l.id, dept: 'hr' }).ok, 'lead two departments');

// bought / sold statistics
const b0 = p.career.st.sold; assert(A('u', 'sell', { lid: l.id }).ok && p.career.st.sold === b0 + 1, 'selling a company counts');
month(); assert(!p.career.seats.some((s) => s.lid === l.id), 'seats in a sold company end');
assert(JSON.stringify(p.career).length < 4000, `career stays light in the save (${JSON.stringify(p.career).length} bytes)`);
console.log('ALL OK');
