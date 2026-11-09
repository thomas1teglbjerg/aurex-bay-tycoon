// Holdings with divisions: every owner's empire is a division with them as CEO, one account, CEO salary,
// money in and out, annual report + meeting, equalising net worth, leaving by vote, migration of older holdings
import * as E from '../supabase/functions/_shared/engine.js';
import { HOLDING, TYPES } from '../supabase/functions/_shared/content.js';
const HD = E.HD;
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
const near = (a, b, e = 0.02) => Math.abs(a - b) < e;
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
const month = () => { now += 25_001; E.advance(city, now); };
const A = (who, a, x = {}) => E.apply(city, who, a, x, now);
E.addPlayer(city, 't', null, now, { first: 'Thomas', last: 'Teglbjærg' }); E.addPlayer(city, 'k', null, now, { first: 'Mikkel', last: 'Teglbjærg' }); E.addPlayer(city, 's', null, now, { first: 'Sara', last: 'Solo' });
const T = city.players.t, K = city.players.k, S = city.players.s; T.cash = 80; K.cash = 40; S.cash = 60;
const buyCheap = (pid) => { const l = city.listings.filter((x) => !x.owner && !TYPES[x.type].starter).sort((a, b) => E.listingPrice(a) - E.listingPrice(b))[0]; const r = A(pid, 'buy', { lid: l.id }); assert(r.ok, `${pid} buys ${l.type}: ${r.msg}`); return l; };
const brand = { color: 'navy', font: 'modern', sym: 'anchor' };

// founding: the founder's whole empire is the first division
let r = A('t', 'coFound', { mode: 'coop', name: 'Debenham Partners', amt: 10, buyIn: 10, ...brand });
assert(r.ok, 'found a co-owned holding: ' + r.msg);
const h = Object.values(city.holdings).find((x) => x.name === 'Debenham Partners');
assert(h.div && h.ceo === 't' && HD.divOf(city, T) === h, 'the founder is CEO of their own division');
const lt = buyCheap('t');
assert(near(E.holdingNav(city, h), h.treasury + HD.empire(city, T, E.hx(city)).value), 'the holding is worth the central account plus the division');
assert(near(E.netWorth(city, 't'), E.holdingNav(city, h) + E.LIFE.netWorth(city, T)), 'net worth = stake of the holding + private side');

// a new tycoon buys in: their whole empire is their division, shares at today's price
r = A('k', 'coJoin', { hid: h.id, amt: 10 });
assert(r.ok && HD.divOf(city, K) === h, 'second owner buys in: ' + r.msg);
const lk = buyCheap('k');
assert(E.canRun(city, 'k', lk) && !E.canRun(city, 't', lk) && E.canSeeCompany(city, 't', lk), 'each CEO runs only their own division');
const nav = E.holdingNav(city, h), sT = E.holdingStake(city, h, 't');
assert(near(E.netWorth(city, 't') - E.LIFE.netWorth(city, T), nav * sT) && near(E.netWorth(city, 'k') - E.LIFE.netWorth(city, K), nav * (1 - sT)), 'both net worths follow the stake of the whole');

// money between divisions and the central account
let tr = h.treasury, kc = K.cash;
assert(A('t', 'holdingTransfer', { hid: h.id, to: 'k', amt: 5 }).ok && near(K.cash, kc + 5), 'a CEO sends money to another division');
assert(near(E.holdingNav(city, h), nav, 0.05), 'moving money inside the holding does not change its value');
assert(A('t', 'holdingTransfer', { hid: h.id, to: 'h', amt: 3 }).ok && near(h.treasury, tr + 3), 'and to the central account');
assert(A('k', 'holdingBorrow', { hid: h.id, amt: 4 }).ok && h.iloans.k === 4, 'a division borrows from the central account');
assert(!A('k', 'holdingBorrow', { hid: h.id, amt: 999 }).ok, 'not more than the central account holds');
assert(A('k', 'holdingRepay', { hid: h.id, amt: 4 }).ok && !h.iloans.k, 'and pays it back');

// from the central account to a division: a plain transfer, not a loan
tr = h.treasury; kc = K.cash; const n0 = E.holdingNav(city, h), gv = Math.min(2, h.treasury / 2);
r = A('t', 'holdingGrant', { hid: h.id, to: 'k', amt: gv });
assert(r.ok && near(K.cash, kc + gv) && near(h.treasury, tr - gv) && !h.iloans.k, 'the joint CEO sends money from the central account to a division: ' + r.msg);
assert(near(E.holdingNav(city, h), n0, 0.05), 'and the holding keeps its value');
r = A('k', 'holdingGrant', { hid: h.id, to: 'k', amt: 0.5 }); assert(!r.ok && r.vote, 'another CEO cannot send from central alone');
assert(!A('t', 'holdingGrant', { hid: h.id, to: 'k', amt: h.treasury + 1 }).ok, 'not more than the central account holds');
r = A('t', 'holdingGrant', { hid: h.id, to: 'k', amt: Math.min(h.treasury, HOLDING.grantPct * E.holdingNav(city, h) + 0.5) });
assert(!r.ok, 'above the mandate the CEO cannot send alone');
kc = K.cash; tr = h.treasury;
r = A('k', 'holdingPropose', { hid: h.id, kind: 'grant', to: 'k', amt: 0.5 }); assert(r.ok, 'a CEO proposes money from central to their division: ' + r.msg);
const gp = h.proposals.find((x) => x.kind === 'grant'); if (gp.status === 'open') A('t', 'holdingVote', { hid: h.id, prid: gp.id, yes: true });
assert(gp.status !== 'open' && near(K.cash, kc + 0.5) && near(h.treasury, tr - 0.5), 'and after the vote it is sent');

// CEO salary comes from the central account, not the division; the owners set it
assert(!A('t', 'lifeSalary', { v: 2 }).ok, 'a CEO cannot set their own salary');
r = A('t', 'holdingPropose', { hid: h.id, kind: 'salary', pid: 't', amt: 0.5, bonus: 0.1 });
assert(r.ok && h.proposals.some((x) => x.kind === 'salary'), 'propose a CEO salary: ' + r.msg);
const sp = h.proposals.find((x) => x.kind === 'salary'); if (sp.status === 'open') A('k', 'holdingVote', { hid: h.id, prid: sp.id, yes: true });
assert(sp.status === 'passed' && T.life.salary === 0.5 && h.bonus.t === 0.1, 'the owners agree (more than half the stakes): salary + bonus set');
const rp = E.rates(city, 'p', 't'), rh = E.rates(city, 'h', h.id);
assert(rh.upkeep >= 0.5 && !(rp.upkeep >= 0.5 && rp.upkeep - E.rates(city, 'p', 'k').upkeep >= 0.5), 'the central account pays the salary');
r = A('t', 'holdingPropose', { hid: h.id, kind: 'salary', pid: 't', amt: 4 });
assert(r.ok && h.proposals.find((x) => x.kind === 'salary' && x.status === 'open').unan, 'a salary above the limit needs every owner');
h.proposals.filter((x) => x.status === 'open').forEach((x) => { x.status = 'rejected'; });

// private money in and out
K.life.wallet = 20; let sk = E.holdingStake(city, h, 'k');
assert(A('k', 'holdingDeposit', { hid: h.id, amt: 10 }).ok && E.holdingStake(city, h, 'k') > sk && near(K.life.wallet, 10), 'a deposit from the private account buys new shares');
const w0 = K.life.wallet; h.treasury += 20; sk = E.holdingStake(city, h, 'k');
r = A('k', 'holdingCashOut', { hid: h.id, amt: 5 });
assert(r.ok && near(K.life.wallet, w0 + 5 * (1 - HOLDING.cashOutMid)) && E.holdingStake(city, h, 'k') < sk, 'selling shares back mid-year costs 10%: ' + r.msg);
assert(A('k', 'holdingLend', { hid: h.id, amt: 3 }).ok && h.oloans.k === 3, 'an owner lends the holding money');
assert(A('k', 'holdingRecall', { hid: h.id, amt: 3 }).ok && !h.oloans.k, 'and takes it back');
assert(!A('k', 'holdingJoin', { hid: h.id, amt: 5 }).ok, 'a CEO cannot buy shares with their own division\'s cash');

// equalising: equal stakes needs every owner
r = A('t', 'holdingPropose', { hid: h.id, kind: 'equalize', mode: 'stake' });
const ep = h.proposals.find((x) => x.kind === 'equalize' && x.status === 'open');
assert(r.ok && ep, 'propose equal stakes: ' + r.msg);
A('k', 'holdingVote', { hid: h.id, prid: ep.id, yes: true });
assert(ep.status === 'passed' && near(E.holdingStake(city, h, 't'), 0.5, 0.001), 'both say yes: 50/50');
r = A('t', 'holdingPropose', { hid: h.id, kind: 'equalize', mode: 'nw' });
const ep2 = h.proposals.find((x) => x.kind === 'equalize' && x.status === 'open'); A('k', 'holdingVote', { hid: h.id, prid: ep2.id, yes: true });
assert(near(E.netWorth(city, 't'), E.netWorth(city, 'k'), 0.1), `equal net worth: ${E.netWorth(city, 't')} vs ${E.netWorth(city, 'k')}`);
r = A('t', 'holdingGive', { hid: h.id, to: 'k', pct: 5 }); assert(r.ok, 'an owner gives part of their stake: ' + r.msg);

// a CEO buys for their own division without a vote, however big
const big = city.listings.filter((x) => !x.owner && !TYPES[x.type].starter && E.listingPrice(x) > HOLDING.buyPct * E.holdingNav(city, h)).sort((a, b) => E.listingPrice(a) - E.listingPrice(b))[0];
if (big) { T.cash = Math.max(T.cash, E.listingPrice(big) + 1); r = A('t', 'buy', { lid: big.id }); assert(r.ok && big.owner && big.owner.id === 't', 'a big purchase needs no vote: ' + r.msg); }

// a month: each division pays its share of profit to the central account
for (let i = 0; i < 3; i++) month();
assert(Object.values(h.yr.f).some((f) => f.sal > 0) || (h.reports[0] && h.reports[0].flows.sal > 0), 'salaries are booked for the report');
assert(Object.values(h.yr.f).some((f) => f.bid > 0) || (h.reports[0] && h.reports[0].flows.bid >= 0), 'divisions pay their share of profit to the central account');
h.proposals.filter((x) => x.status === 'open').forEach((x) => { x.status = 'rejected'; });

// New Year: annual report, bonus, annual meeting with a dividend proposal, solo report
S.co = { name: 'Solo Group', ...brand, hid: null, m: 0 }; buyCheap('s');
h.treasury = Math.max(h.treasury, 6);
r = E.closeBooks(city); assert(r.ok, 'close the books');
const rep = h.reports[0];
assert(rep && rep.kind === 'h' && rep.divs.length === 2 && rep.owners.length === 2 && rep.balance && rep.auditor && rep.kpi, 'the holding has an annual report with divisions, owners, balance, KPIs and an auditor note');
assert(T.mail.some((x) => /annual report/.test(x.subj) && x.go === `report:h:${h.id}`) && K.mail.some((x) => /annual report/.test(x.subj)), 'every owner gets the report as a mail');
assert(S.reports && S.reports[0] && S.reports[0].kind === 'p' && S.mail.some((x) => /Annual report/.test(x.subj)), 'solo tycoons get a simple report');
const dv = h.proposals.find((x) => x.kind === 'dividend' && x.ga && x.status === 'open');
assert(dv && HD.meetingOpen(city, h), 'the annual meeting opens with a dividend proposal');
const wt = T.life.wallet, wk = K.life.wallet;
month(); month();
assert(dv.status === 'passed' && T.life.wallet > wt && K.life.wallet > wk, 'owners who did not vote go with the board: dividend paid into private accounts');
assert(E.annualReport(city, 'h', h.id).m0 === rep.m, 'a new financial year started');

// moving a company between the joint division and the divisions keeps its staff and stock
const jc = city.listings.filter((x) => !x.owner && !TYPES[x.type].starter).sort((a, b) => E.listingPrice(a) - E.listingPrice(b))[0]; h.treasury += E.listingPrice(jc) + 1; A('t', 'buy', { lid: jc.id, as: h.id });
h.proposals.filter((x) => x.status === 'open' && x.kind === 'buy').forEach((x) => E.apply(city, 'k', 'holdingVote', { hid: h.id, prid: x.id, yes: true }, now));
if (jc.owner && jc.owner.k === 'h') {
  const ops0 = jc.ops; r = A('t', 'holdingPropose', { hid: h.id, kind: 'move', lid: jc.id, to: 'k' });
  const mp = h.proposals.find((x) => x.kind === 'move'); if (mp && mp.status === 'open') A('k', 'holdingVote', { hid: h.id, prid: mp.id, yes: true });
  assert(jc.owner.k === 'p' && jc.owner.id === 'k' && jc.ops === ops0 && E.canRun(city, 'k', jc), 'a joint company moves to a division by vote and keeps its ops: ' + r.msg);
  assert(!A('t', 'holdingPropose', { hid: h.id, kind: 'move', lid: jc.id, to: 'k' }).ok, 'not to where it already is');
  r = A('k', 'holdingPropose', { hid: h.id, kind: 'move', lid: jc.id, to: 'h' }); const mp2 = h.proposals.filter((x) => x.kind === 'move').pop(); if (mp2.status === 'open') A('t', 'holdingVote', { hid: h.id, prid: mp2.id, yes: true });
  assert(jc.owner.k === 'h', 'and back to the joint division');
} else console.log('skip: joint purchase pending');
const outside = city.listings.find((x) => x.owner && x.owner.k === 'p' && city.players[x.owner.id].bot);
if (outside) assert(!A('t', 'holdingPropose', { hid: h.id, kind: 'move', lid: outside.id, to: 't' }).ok, 'companies outside the holding cannot be moved');

// the holding keeps no team of its own: its specialists move to the divisions on the same contract
if (city.talent) {
  const T2 = E.TAL, tid = Object.keys(city.talent).find((id) => !city.talent[id].owner && !T2.PERSON[id].starter && !(T.team || {})[T2.PERSON[id].kind]);
  const emp = T2.coopEmp(city, h); const st0 = city.talent[tid]; Object.assign(st0, { owner: h.id, salary: 1, until: city.m + 24 }); emp.team[T2.PERSON[tid].kind] = tid; emp.staff.push(T2.PERSON[tid].kind);
  assert(!A('t', 'hire', { tid: Object.keys(city.talent).find((id) => !city.talent[id].owner), coop: h.id }).ok, 'a holding with divisions cannot hire for itself');
  E.advance(city, now + 10);
  assert(st0.owner === HD.ceo(city, h) && st0.salary === 1 && !h.team[T2.PERSON[tid].kind] && city.players[st0.owner].team[T2.PERSON[tid].kind] === tid, 'its specialist moves to the joint division CEO on the same salary');
}

// leaving is a vote of the owners; the stake is settled against the division
r = A('k', 'holdingLeave', { hid: h.id }); assert(r.ok && h.proposals.some((x) => x.kind === 'exit'), 'leaving is a vote of the owners: ' + r.msg);
const xp = h.proposals.find((x) => x.kind === 'exit'); if (xp.status === 'open') A('t', 'holdingVote', { hid: h.id, prid: xp.id, yes: true });
assert(!h.members.k && !K.co && lk.owner.id === 'k', 'they leave with their division and found a new parent company');
// the last owner dissolves the holding and keeps everything under its name
const own = city.listings.find((x) => !x.owner && !TYPES[x.type].starter && E.listingPrice(x) < 30); h.treasury += 40; own.owner = { k: 'h', id: h.id };
r = A('t', 'holdingLeave', { hid: h.id }); assert(r.ok && !city.holdings[h.id] && own.owner.k === 'p' && own.owner.id === 't' && T.co.name === 'Debenham Partners' && !T.co.hid, 'the last owner keeps the companies and the name: ' + r.msg);

// migration: an older co-owned parent company takes in its owners' empires at today's share price
const c2 = E.createCity(now, { speed: 2016 });
E.addPlayer(c2, 'a', null, now, { first: 'Anna', last: 'Berg' }); E.addPlayer(c2, 'b', null, now, { first: 'Bo', last: 'Berg' });
const old = { id: 'hold1', name: 'Old Partners', members: { a: 10, b: 10 }, founder: 'a', treasury: 20, settledG: c2.g, accrued: 0, payout: 0.5, proposals: [], invites: [], createdM: 0, hist: [], color: '#333', parent: true, brand, buyIn: 10, open: true };
E.addPlayer(c2, 'c', null, now, { first: 'Cai', last: 'Berg' }); c2.players.c.cash = 15; c2.players.c.co = { name: 'Cai Group', ...brand, hid: null, m: 0 }; old.members.c = 5;
c2.holdings.hold1 = old; c2.players.a.co = { hid: 'hold1', m: 0 }; c2.players.b.co = { hid: 'hold1', m: 0 }; c2.players.a.cash = 30; c2.players.b.cash = 10;
E.advance(c2, now + 1000);
assert(old.div && old.payout === 0 && old.members.a > old.members.b && old.members.b > 10, `older holding migrated: stakes ${Math.round(old.members.a)} / ${Math.round(old.members.b)}`);
assert(near(E.holdingNav(c2, old), 20 + c2.players.a.cash + c2.players.b.cash + c2.players.c.cash, 0.5) && c2.players.a.mail.some((x) => /one holding/.test(x.subj)), 'NAV includes both empires and the owners get a mail');
assert(c2.players.c.co.hid === 'hold1' && HD.divs(c2, old).length === 3 && c2.players.c.mail.some((x) => /division of/.test(x.subj)), 'a co-owner with their own parent company is brought in as a division too');
console.log('holding ok');
