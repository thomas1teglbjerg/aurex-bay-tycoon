// The loan book's ledger: what every loan has earned the bank's owner, closed loans with their profit or loss
import './open-doors.js';
import * as E from '../supabase/functions/_shared/engine.js';
import { BANKS as B } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
const near = (a, b, e = 0.02) => Math.abs(a - b) < e;
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
E.addPlayer(city, 'o', 'Thomas Banker', now); E.addPlayer(city, 'c', 'Mikkel Customer', now);
const O = city.players.o, C = city.players.c; O.cash = 200; C.cash = 100;
const A = (pid, action, args = {}) => E.apply(city, pid, action, args, now);
const week = (n = 1) => { for (let i = 0; i < n; i++) { now += E.realMsPerMonth(city) / 4; E.advance(city, now); } };
const BK = E.BK, x = E.kx(city);
const bank = city.listings.find((l) => l.type === 'bank' && !l.owner);
city.listings.filter((l) => BK.isLender(l) && l !== bank).forEach((l) => { l.site = { kind: 'new', ph: 0 }; l.built = false; });
city.listings.filter((l) => !l.owner && !l.site && l.type !== 'bank' && l.type !== 'finance' && l.type !== 'restaurant').slice(0, 8).forEach((l) => E.botCtx(city).assign(l, C));
// keep the economy still so the numbers are easy to check
Object.values(city.players).filter((p) => p.bot).forEach((p) => { p.loans = []; });

assert(A('o', 'buy', { lid: bank.id }).ok, 'Thomas buys the bank');
assert(A('o', 'bkCap', { lid: bank.id, v: 5 }).ok, 'and puts 5 M of equity in');
assert(BK.earned(city, bank).total === 0 && BK.earned(city, bank).past.length === 0, 'a new owner starts with an empty ledger');
const r = A('c', 'loan', { amt: 20, bank: bank.id });
assert(r.ok, 'Mikkel borrows 20 M: ' + r.msg);
const ln = C.loans.find((y) => y.bank === bank.id), mk0 = BK.market(city);
const g0 = city.g; week(8);
const e1 = BK.earned(city, bank), open = e1.open.find((e) => e.key === ln.id), dt = city.g - g0;
assert(open && near(open.earn, 20 * (ln.rate - mk0) / 100 * dt, 0.01), `the open loan has earned its margin so far: ${open && open.earn.toFixed(3)} M`);
assert(e1.eq > 0 && near(e1.total, e1.earn + e1.eq - e1.loss, 1e-6), `the equity earns the market rate too (${e1.eq.toFixed(3)} M); total ${e1.total.toFixed(3)} M`);
// what the ledger counts matches what the owner was paid
assert(near(e1.earn, e1.open.reduce((a, e) => a + e.earn, 0) + e1.past.reduce((a, e) => a + e.earn, 0), 1e-3), 'the ledger total is the sum of what each loan earned');

// paid off: the loan moves to earlier loans with its profit
C.cash = 100;
assert(!A('c', 'repay', { amt: 0.5, id: ln.id }).ok, 'less than 1 M at a time is not allowed');
assert(A('c', 'repay', { amt: 1, id: ln.id }).ok && near(ln.amt, 19, 1e-6), 'a loan can be paid down 1 M at a time');
assert(A('c', 'repay', { amt: 18.5, id: ln.id }).ok && near(ln.amt, 0.5, 1e-6), 'or any amount over 1 M');
assert(A('c', 'repay', { amt: 0.5, id: ln.id }).ok, 'the last bit under 1 M pays the loan off: Mikkel has paid it back');
week(1);
const e2 = BK.earned(city, bank), p1 = e2.past.find((e) => e.key === ln.id);
assert(p1 && p1.how === 'repaid' && p1.pid === 'c' && near(p1.amt, 20) && p1.loss === 0 && p1.earn > 0, `the repaid loan is listed: earned ${p1 && p1.earn.toFixed(3)} M`);
assert(!e2.open.some((e) => e.key === ln.id), 'and no longer open');

// a default without a pledge: the loss is on that loan
const bot = Object.values(city.players).find((p) => p.bot && !(B.bots[p.id] || {}).never); bot.cash = 50; delete city.bk.rec[bot.id];
bot.loans = []; BK.borrow(city, bot, 10, { bank: bank.id }, x); const bl = bot.loans[bot.loans.length - 1]; week(1);
if (!bot.loans.includes(bl)) bot.loans.push(bl); BK.fail(city, bot, bl, x); week(1);
const e3 = BK.earned(city, bank), p2 = e3.past.find((e) => e.key === bl.id);
assert(p2.how === 'default' && near(p2.loss, bl.amt * (1 - B.recovery)) && p2.earn - p2.loss < 0, `the default is listed with its loss: ${(p2.earn - p2.loss).toFixed(2)} M`);
assert(e3.loss >= bl.amt * (1 - B.recovery) - 1e-6 && near(e3.total, e3.earn + e3.eq - e3.loss, 1e-6), 'the total counts the loss');

// a mortgage: the margin is earned each month, foreclosure closes it
A('o', 'bkCap', { lid: bank.id, v: 20 }); C.life.wallet = 30; const hb = A('c', 'homeBuy', { hid: 'H1', down: 0.2 }); assert(hb.ok, 'Mikkel buys a home with a mortgage from the bank: ' + hb.msg);
const h = C.life.homes.find((y) => y.bank === bank.id);
const ctx = (over) => ({ ...x, feed: () => {}, news: () => {}, mortPaid: (c, hh, i) => BK.mortPaid(c, hh, i, x), foreclosed: (c, p, hh, got) => BK.foreclosed(c, p, hh, got, x), credit: () => {}, notify: () => {}, auctionBidder: () => null, botFriend: () => false, auctionDone: () => {}, ...over });
E.LIFE.monthStep(city, city.m, ctx());
const mo = BK.earned(city, bank).open.find((e) => e.key === `h:${h.uid}`);
assert(mo && mo.k === 'home' && mo.earn > 0, `the mortgage has earned ${mo && mo.earn.toFixed(4)} M`);
C.cash = 0; C.life.wallet = -5; C.life.salary = 0; C.life.arr = B.arrears - 1;
E.LIFE.monthStep(city, city.m, ctx({ mortPaid: () => {} })); week(1);
const p3 = BK.earned(city, bank).past.find((e) => e.k === 'home');
assert(p3 && p3.how === 'foreclosed' && p3.hid === 'H1', `the foreclosed mortgage is listed: ${p3 && (p3.earn - p3.loss).toFixed(3)} M`);

// a new owner starts over
const k = BK.earned(city, bank).past.length;
E.botCtx(city).assign(bank, bot); week(1);
assert(BK.earned(city, bank).past.length === 0, `a new owner gets a clean ledger (Thomas had ${k} closed loans)`);
console.log('ledger tests passed');
