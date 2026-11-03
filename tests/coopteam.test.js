// Coops hire specialists from the coop treasury and put them at the head of the coop's own companies
import * as E from '../supabase/functions/_shared/engine.js';
const T = E.TAL;
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
E.addPlayer(city, 'u', 'Thomas', now); E.addPlayer(city, 'v', 'Vera', now);
const p = city.players.u; p.cash = 500; city.players.v.cash = 100;
const A = (who, a, x) => E.apply(city, who, a, x, now);
assert(A('u', 'holdingCreate', { name: 'Harbour Partners', amt: 200 }).ok, 'found a coop with 200 M');
const h = Object.values(city.holdings).find((x) => x.founder === 'u'); h.members.v = 10;
// a free company the coop can buy that has an Operations department
let l = city.listings.find((x) => !x.owner && E.listingPrice(x) < 150); if (!l) { l = city.listings[0]; l.owner = null; }
const b = A('u', 'buy', { lid: l.id, as: h.id }); assert(l.owner && l.owner.k === 'h', 'the coop owns a company ' + (b.msg || ''));
// free Marco (Operations) for the test
const free = (id) => { const s = city.talent[id]; if (s.owner) { const o = T.who(city, s.owner); delete o.team[T.PERSON[id].kind]; o.staff = o.staff.filter((k) => k !== T.PERSON[id].kind); if (o.assign) delete o.assign[T.PERSON[id].kind]; s.owner = null; } };
const mid = Object.keys(city.talent).find((id) => T.PERSON[id].kind === 'marco' && !T.PERSON[id].starter); free(mid);
const cash = p.cash, tr = h.treasury, fee = T.signFee(city, T.coopEmp(city, h), mid);
assert(!A('w', 'hire', { tid: mid, coop: h.id }).ok, 'outsiders cannot hire for the coop');
const r = A('v', 'hire', { tid: mid, salary: T.ask(city, mid) * 1.05, years: 2, coop: h.id });
assert(r.ok, 'a co-owner signs a specialist for the coop: ' + r.msg);
assert(city.talent[mid].owner === h.id && h.team.marco === mid && h.staff.includes('marco'), 'the specialist works for the coop');
assert(Math.abs(h.treasury - (tr - fee)) < 1e-6 && p.cash === cash, 'the signing fee comes from the treasury, not a pocket');
assert(!p.team.marco || p.team.marco !== mid, 'not on the personal team');
// salary is a coop cost
const before = E.rates(city, 'h', h.id); assert(before.upkeep > 0, `the coop pays the salary (${before.upkeep} M/yr)`);
// head of Operations in the coop company
assert(A('u', 'assignHead', { lid: l.id, dept: 'ops', spec: 'marco', coop: h.id }).ok && h.assign.marco.lid === l.id && l.ops.depts.ops.head === 'marco', 'coop specialist leads the coop company');
const y = E.listingYield(city, l, l.owner); assert(y.notes.some((n) => n.includes('leads')), 'leadership YPI goes to the coop company: ' + y.notes.join(', '));
assert(E.monthLines(city, l).heads > 0, 'their salary shows in the company accounts');
// cannot lead a personal company
const own = city.listings.find((x) => !x.owner && E.listingPrice(x) < p.cash); A('u', 'buy', { lid: own.id });
assert(!A('u', 'assignHead', { lid: own.id, dept: 'ops', spec: 'marco', coop: h.id }).ok, 'coop specialists stay in coop companies');
// manage: bonus paid by the coop
const t2 = h.treasury; assert(A('u', 'tBonus', { tid: mid, coop: h.id }).ok && h.treasury < t2, 'a bonus is paid from the treasury');
assert(!A('u', 'tBonus', { tid: mid }).ok, 'without the coop flag it is not your specialist');
// months pass: the specialist lives on, salary leaves the treasury
for (let i = 0; i < 3; i++) { now += E.realMsPerMonth(city); E.advance(city, now); }
assert(city.talent[mid].owner === h.id, 'still with the coop after three months');
assert(JSON.stringify(city).length > 0 && !('people' in h), 'the coop wrapper is not saved');
assert(A('u', 'unassignHead', { spec: 'marco', coop: h.id }).ok && !h.assign.marco && !l.ops.depts.ops.head, 'remove the head');
assert(A('u', 'fire', { tid: mid, coop: h.id }).ok && !city.talent[mid].owner && !h.team.marco, 'release from the coop');
console.log('ALL OK');
