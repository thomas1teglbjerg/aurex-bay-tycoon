// The Bank of Aurex as national bank: who may buy it, the bank rate, levies, the economy and the ministry
import * as E from '../supabase/functions/_shared/engine.js';
import { CENTRAL as C, CENTRAL_BANK } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
E.addPlayer(city, 'g', 'Thomas Governor', now); E.addPlayer(city, 'b', 'Mikkel Borrower', now);
const G = city.players.g, B = city.players.b; G.cash = 500; B.cash = 300;
const A = (pid, action, args = {}) => E.apply(city, pid, action, args, now);
const month = (n = 1) => { for (let i = 0; i < n; i++) { now += E.realMsPerMonth(city); E.advance(city, now); A('g', 'ping'); A('b', 'ping'); } };
const bank = E.listing(city, CENTRAL_BANK);
if (bank.owner) { bank.owner = null; bank.ops = null; }

assert(bank.title === 'Bank of Aurex' && bank.type === 'finance', 'L13 is the Bank of Aurex, a finance company');
assert(city.cb && city.cb.rate === C.start, `bank rate starts at ${C.start}%`);
assert(E.loanRate(city, B) === C.start, 'a plain loan costs the bank rate');
let r = A('g', 'buy', { lid: bank.id }); assert(!r.ok && /prestige/.test(r.msg) && /Finance level/.test(r.msg), 'a newcomer cannot buy it: ' + r.msg);
G.life.legacy = 1000; E.CAR.ensure(G).xp.finance = 6800;
r = A('g', 'buy', { lid: bank.id }); assert(r.ok, 'Elite prestige + Finance level 6 buys it: ' + r.msg);
assert(E.protection(city, bank).safe, 'the national bank cannot be taken over');

// rate: once a quarter, announced a week ahead, moves at most 0.5 a month
assert(!A('b', 'cbRate', { target: 4 }).ok, 'only the governor sets the rate');
r = A('g', 'cbRate', { target: 4 }); assert(r.ok, 'governor announces 4%');
assert(city.news[0].title.includes('Bank of Aurex'), 'the Gazette carries the announcement');
assert(!A('g', 'cbRate', { target: 5 }).ok, 'no second decision in the same quarter');
month(1);
assert((B.mail || []).some((x) => x.from.n === 'Bank of Aurex' && /cut to 7.5%/.test(x.subj) && x.body.includes('7.5%')), 'every tycoon gets a mail from the Bank of Aurex when the rate moves');
assert(city.cb.target === 4 && city.cb.rate === 7.5, `rate moves 0.5 towards the target (now ${city.cb.rate})`);
assert(E.loanRate(city, B) === 7.5, 'loans follow the bank rate');
month(7);
assert(city.cb.rate === 4, 'reaches the target');
assert(E.CB.tilt(city) > 0, 'a low rate pushes towards a boom');
assert(city.cb.px > 1, `cheap money lifts supply prices (index ${city.cb.px})`);

// credit limit changes are mailed too
const cap0 = E.loanCap(city, B), hotel = city.listings.find((l) => !l.owner && l.type === 'hotel' && l.id !== CENTRAL_BANK);
B.cash += 200; assert(A('b', 'buy', { lid: hotel.id }).ok, 'borrower buys a hotel');
month(1);
assert(E.loanCap(city, B) > cap0 && (B.mail || []).some((x) => x.from.n === 'Bank of Aurex' && x.subj === `Your credit limit is now ${E.loanCap(city, B)} M`), 'a higher credit limit arrives as a mail');
// the bank earns a share of the interest others pay
B.loans.push({ amt: 20, rate: 'bank', m: city.m });
const y = E.listingYield(city, bank, bank.owner);
assert(y.notes.some((n) => n.startsWith('Share of city loan interest')), 'bank earns from city loans');

// levies: only on crowded sectors / traded supplies, never on your own sector
const crowd = E.CB.crowded(city);
const other = crowd.find((x) => !E.cbGovTypes(city, 'g').has(x.type));
if (other) {
  r = A('g', 'cbLevy', { sector: other.type, sp: 8 }); assert(r.ok, `levy 8% on ${other.type}: ${r.msg}`);
  month(1); assert(city.cb.levy.sector === other.type && city.cb.levy.sp === 8, 'levy applies after a week');
  const l = city.listings.find((x) => x.owner && x.type === other.type);
  assert(E.listingYield(city, l, l.owner).notes.some((n) => n.startsWith('National bank levy')), 'levied companies pay it');
}
assert(!A('g', 'cbLevy', { sector: 'finance', sp: 5 }).ok, 'no levy on a sector you are in');

// heavy policy and a world card: the push can only move the economy one step
city.cb.rate = 2; city.econ = 'Stable';
let ups = 0; for (let i = 0; i < 400; i++) { const n = E.CB.nudge(city, 'Stable', Math.random); if (n.moved) { ups++; assert(n.econ === 'Boom', 'cheap money moves one step up'); } }
assert(ups > 40 && ups < 160, `about a quarter of the cards are nudged (${ups}/400)`);

// a year at an extreme rate: the Finance Ministry steps in sooner or later
city.cb.rate = city.cb.target = 2; city.cb.extremeSince = city.m - 12;
const r0 = Math.random; let k = 0; Math.random = () => (k++ % 2 ? 0.05 : r0()); month(1); Math.random = r0;
for (let i = 0; i < 24 && city.cb.rate !== C.neutral; i++) month(1);
assert(city.cb.rate === C.neutral && city.news.some((n) => n.title.includes('Finance Ministry')), 'the ministry resets the rate to 6%');

// personal rates follow the bank rate
const m0 = E.LIFE.mortgageRate(city); city.cb.rate = 10; assert(E.LIFE.mortgageRate(city) > m0, 'mortgages follow the bank rate');
console.log('central ok');
