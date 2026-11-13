// Private banks: they set their own rates, only bank owners borrow at the market rate, the credit committee,
// defaults with pledges, mortgages and foreclosure, rival tycoons as borrowers and rate wars
import './open-doors.js';
import * as E from '../supabase/functions/_shared/engine.js';
import { BANKS as B, CENTRAL_BANK } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
const near = (a, b, e = 0.02) => Math.abs(a - b) < e;
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
E.addPlayer(city, 'o', 'Thomas Banker', now); E.addPlayer(city, 'c', 'Mikkel Customer', now);
const O = city.players.o, C = city.players.c; O.cash = 200; C.cash = 100;
const A = (pid, action, args = {}) => E.apply(city, pid, action, args, now);
const week = (n = 1) => { for (let i = 0; i < n; i++) { now += E.realMsPerMonth(city) / 4; E.advance(city, now); A('o', 'ping'); A('c', 'ping'); } };
const BK = E.BK, mk = () => BK.market(city);
const bank = city.listings.find((l) => l.type === 'bank' && !l.owner);
assert(bank && BK.isLender(bank), `${bank.title} (Community Bank) lends`);
assert(!BK.isLender(E.listing(city, CENTRAL_BANK)), 'the Bank of Aurex is the national bank, not a lender');
// everything else that lends is out of the way: one bank in the city
city.listings.filter((l) => BK.isLender(l) && l !== bank).forEach((l) => { l.site = { kind: 'new', ph: 0 }; l.built = false; });
assert(BK.lenders(city).length === 1, 'one bank in this test city');
// the customer owns companies, so the banks give them credit
city.listings.filter((l) => !l.owner && !l.site && l.type !== 'bank' && l.type !== 'finance' && l.type !== 'restaurant').slice(0, 8).forEach((l) => E.botCtx(city).assign(l, C));
assert(E.loanCap(city, C) >= 40, `the customer's credit limit is ${E.loanCap(city, C)} M`);

// an unowned bank runs on its loan officers: the market rate + 2
let r = A('c', 'loan', { amt: 10 });
const x0 = C.loans[0];
assert(r.ok && x0.bank === bank.id && near(x0.rate, mk() + B.spread), `a tycoon without a bank borrows from the bank at market + ${B.spread}: ${r.msg}`);
assert(!A('c', 'loan', { amt: 5, bank: 'cb' }).ok, 'the Bank of Aurex does not lend to them');

// buying the bank: its owner borrows at the market rate (minus the House Bank half point)
assert(A('o', 'buy', { lid: bank.id }).ok, 'Thomas buys the bank');
assert(BK.ownsBank(city, 'o'), 'Thomas owns a bank');
r = A('o', 'loan', { amt: 10 });
assert(r.ok && O.loans[0].bank === 'cb' && O.loans[0].rate === 'bank', 'a bank owner borrows straight from the Bank of Aurex: ' + r.msg);
assert(near(E.loanRate(city, O), mk() - 0.5), 'at the market rate − 0.5 (House Bank)');
A('o', 'repay', { amt: 10 });

// the margin: the bank earns its rate minus the market rate on what it has lent
const mar = BK.margin(city, bank);
assert(near(mar, 10 * B.spread / 100, 1e-3), `the bank earns ${mar} M a year on the 10 M loan`);
assert(near(E.rates(city, 'p', 'o').lending, mar, 1e-3), 'the margin is part of the owner\'s income');
// the funding line: what the bank lent is drawn at the Bank of Aurex at the market rate; the net is easy to read
const f0 = BK.funding(city, bank, E.kx(city));
assert(near(f0.biz, 10, 1e-3) && near(f0.cost, 10 * mk() / 100, 1e-3) && near(f0.inc - f0.cost, mar, 1e-3), `funding line ${f0.line} M costs ${f0.cost} M; customers pay ${f0.inc} M`);
assert(near(f0.net, f0.inc - f0.cost - f0.loss, 1e-3) && near(f0.shock, f0.line / 100, 1e-3), 'net = interest − funding − losses; one point more costs 1% of the line');
const cr0 = city.cb.rate; city.cb.rate = cr0 + 1;
assert(near(BK.funding(city, bank, E.kx(city)).net, f0.net - f0.shock, 1e-3) && near(BK.margin(city, bank), mar - 0.1, 1e-3), 'a higher market rate squeezes the margin: the loans are fixed, the funding is not');
city.cb.rate = cr0;

// capital: a bank its owner runs needs equity of 8% of its loans (mortgages count half) before it lends more
const k0 = BK.capital(city, bank, E.kx(city));
assert(k0.on && k0.cap === 0 && k0.short && near(k0.need, 10 * B.capital.ratio), `the 10 M loan needs ${k0.need} M of equity; the bank has none`);
const ap0 = A('c', 'loan', { amt: 5, bank: bank.id });
assert(ap0.ok && ap0.pending && C.loans.length === 1, 'without equity a loan becomes an application, nothing paid out: ' + ap0.msg);
assert(BK.offers(city, Object.values(city.players).find((q) => q.bot), E.kx(city)).every((x) => x.croom < 5) && BK.borrow(city, Object.values(city.players).find((q) => q.bot), 5, { force: true }, E.kx(city)).bank === 'cb', 'forced borrowing skips a bank without equity');
assert(!A('c', 'bkCap', { lid: bank.id, v: 5 }).ok, 'only the owner puts in equity');
const oc0 = O.cash;
assert(A('o', 'bkCap', { lid: bank.id, v: 4 }).ok && near(oc0 - O.cash, 4), 'Thomas puts 4 M of equity in the bank');
const k1 = BK.capital(city, bank, E.kx(city));
assert(near(k1.room, 4 / B.capital.ratio - 10) && near(k1.mroom, k1.room / B.capital.mortW), `it may now lend ${k1.room} M more (mortgages ${k1.mroom} M)`);
const f1 = BK.funding(city, bank, E.kx(city));
assert(near(f1.line, 6) && near(f1.own, 4) && near(BK.margin(city, bank), mar + 4 * mk() / 100, 1e-3), 'equity funds 4 M of the loan: the funding line is 6 M, the margin higher');
assert(!A('o', 'bkCap', { lid: bank.id, v: -4 }).ok && A('o', 'bkCap', { lid: bank.id, v: -3 }).ok, `he can take out what the loans do not need (${k1.free} M)`);
A('o', 'bkCap', { lid: bank.id, v: 9 });
const apx = city.bk.apps.find((a) => a.pid === 'c' && a.lid === bank.id && a.status === 'open');
assert(apx, 'the application waits for the owner'); { const n0 = C.loans.length; A('o', 'bkDecide', { app: apx.id, v: 'ok' }); assert(C.loans.length === n0 + 1, 'with equity in place the owner approves the application'); C.cash -= 5; C.loans.pop(); }

// the owner sets the margin: new loans follow, old loans keep their rate
assert(!A('c', 'bkSet', { lid: bank.id, k: 'sp', v: 4 }).ok, 'only the owner sets the rate');
assert(A('o', 'bkSet', { lid: bank.id, k: 'sp', v: 4 }).ok, 'Thomas sets market + 4');
r = A('c', 'loan', { amt: 5 });
assert(r.ok && near(C.loans[1].rate, mk() + 4) && near(C.loans[0].rate, mk() + B.spread), 'the new loan is at market + 4, the old one keeps its rate');
city.cb.rate = mk() + 1;
assert(near(C.loans[1].rate, mk() + 3), 'a higher market rate does not change fixed loans');
assert(near(BK.rateOf(city, bank, E.kx(city)), mk() + 4), 'but new loans at the bank follow the market rate');
city.cb.rate -= 1;

// the credit committee: applications wait for the owner
A('o', 'bkSet', { lid: bank.id, k: 'hand', v: true });
r = A('c', 'loan', { amt: 5 });
assert(r.ok && r.pending && C.loans.length === 2, 'with the committee on, a loan is an application: ' + r.msg);
let ap = city.bk.apps.find((a) => a.pid === 'c' && a.status === 'open');
assert(O.mail.some((x) => /Loan application/.test(x.subj) && x.web), 'the owner gets a mail with a link to the bank office');
const dz = BK.dossier(city, ap, E.kx(city));
assert(dz && dz.cap > 0 && dz.score >= 0 && dz.score <= 1 && dz.paid === 0, 'the dossier shows limit, record and a credit score');
r = A('o', 'bkDecide', { app: ap.id, v: 'rate' });
assert(r.ok && ap.status === 'counter', 'a counter-offer at a higher rate: ' + r.msg);
const cm = C.mail.find((x) => x.opts && x.opts.some((o) => o.bk));
assert(cm && /Counter-offer/.test(cm.subj), 'the customer gets the counter-offer as a mail');
r = A('c', 'mailAnswer', { id: cm.id, opt: 0 });
assert(r.ok && C.loans.length === 3 && near(C.loans[2].rate, ap.rate + B.counter), 'accepting it makes the loan at the higher rate: ' + r.msg);
r = A('c', 'loan', { amt: 5 }); ap = city.bk.apps.find((a) => a.pid === 'c' && a.status === 'open');
assert(A('o', 'bkDecide', { app: ap.id, v: 'no' }).ok && ap.status === 'no' && C.loans.length === 3, 'the committee can say no');
r = A('c', 'loan', { amt: 5 }); ap = city.bk.apps.find((a) => a.pid === 'c' && a.status === 'open');
week(B.wait + 1);
assert(ap.status !== 'open', `after ${B.wait} weeks the loan officers decide (${ap.status})`);
A('o', 'bkSet', { lid: bank.id, k: 'hand', v: false });

// repaying: the dearest first; a loan paid off counts on the record
C.cash = 100; const owed = E.debt(C); r = A('c', 'repay', { amt: 999 });
assert(r.ok && C.loans.length === 0 && BK.rec(city, 'c').paid >= 3, `repaid ${owed} M, ${BK.rec(city, 'c').paid} loans on the record`);

// the customer limit and the bank's book
A('o', 'bkSet', { lid: bank.id, k: 'max', v: 5 });
assert(!A('c', 'loan', { amt: 10 }).ok, 'the owner limits what one customer may owe the bank');
A('o', 'bkSet', { lid: bank.id, k: 'max', v: 25 });

// a default with a pledge: the bank takes the company
const bot = Object.values(city.players).find((p) => p.bot && !(B.bots[p.id] || {}).never);
const co = city.listings.find((l) => !l.owner && l.type === 'restaurant');
E.botCtx(city).assign(co, bot); bot.cash = 5; bot.loans = []; delete city.bk.rec[bot.id];
r = BK.borrow(city, bot, 10, { bank: bank.id, pledge: co.id }, E.kx(city));
const bl = bot.loans.find((x) => x.bank === bank.id);
assert(r.ok && bl && bl.pledge === co.id && bl.risk > 0, 'a rival borrows with a company as pledge: ' + r.msg);
const cash0 = O.cash;
BK.fail(city, bot, bl, E.kx(city));
assert(co.owner && co.owner.id === 'o', 'it defaults: the bank\'s owner gets the pledged company');
assert(O.cash < cash0 && !bot.loans.includes(bl) && BK.badRecord(city, bot.id), 'pays off the funding; the default stays on the record');
assert(!BK.borrow(city, bot, 5, { bank: bank.id }, E.kx(city)).ok, 'the loan officers turn down someone who just defaulted');
// unsecured: the bank loses most of it
bot.loans = []; city.bk.rec[bot.id].bad = null; bot.cash = 50;
BK.borrow(city, bot, 10, { bank: bank.id }, E.kx(city)); const c1 = O.cash, q1 = BK.capOf(city, bank);
BK.fail(city, bot, bot.loans[0], E.kx(city));
assert(near(c1 + q1 - O.cash - BK.capOf(city, bank), 10 * (1 - B.recovery)), `an unsecured default costs the bank ${Math.round((1 - B.recovery) * 100)}%`);
assert(BK.capOf(city, bank) < q1, 'the loss comes off the equity first');
assert(BK.funding(city, bank, E.kx(city)).loss >= 10 * (1 - B.recovery) - 1e-6, 'the loss shows in the bank\'s account this year');

// rivals ask for loans; the committee or the officers answer
city.bk.rec[bot.id].bad = null; A('o', 'bkSet', { lid: bank.id, k: 'hand', v: true });
const save = B.ask; B.ask = 1; Object.values(city.players).filter((p) => p.bot).forEach((p) => { p.cash = 50; });
for (let i = 0; i < 3 && !city.bk.apps.some((a) => a.status === 'open' && city.players[a.pid].bot); i++) week(1);
B.ask = save;
const ba = city.bk.apps.find((a) => a.status === 'open' && city.players[a.pid].bot);
assert(ba && O.mail.some((x) => x.subj.includes(city.players[ba.pid].name)), 'a rival tycoon asks Thomas\'s bank for a loan');
r = A('o', 'bkDecide', { app: ba.id, v: 'ok' });
assert(r.ok && city.players[ba.pid].loans.some((x) => x.bank === bank.id), 'the committee lends to them: ' + r.msg);
A('o', 'bkSet', { lid: bank.id, k: 'hand', v: false });

// mortgages come from the banks, at the bank's mortgage rate; owners pay the market mortgage rate
C.life.wallet = 20;
r = A('c', 'homeBuy', { hid: 'H1', down: 0.2 });
const h = C.life.homes[0];
assert(r.ok && h.bank === bank.id && near(h.rate, E.LIFE.mortgageRate(city) + B.mSpread), 'a tycoon\'s mortgage comes from the bank at its rate');
assert(BK.book(city, bank.id).mort > 0, 'the mortgage is on the bank\'s book');
O.life.wallet = 20; A('o', 'homeBuy', { hid: 'H1', down: 0.2 });
assert(O.life.homes[0].bank === 'cb' && O.life.homes[0].rate == null, 'the bank owner borrows at the market mortgage rate');
const w0 = O.cash; E.LIFE.monthStep(city, city.m, { ...E.kx(city), feed: () => {}, news: () => {}, mortPaid: (c, hh, i) => BK.mortPaid(c, hh, i, E.kx(city)), foreclosed: () => {}, credit: () => {}, notify: () => {}, auctionBidder: () => null, botFriend: () => false, auctionDone: () => {} });
assert(O.cash > w0, 'the bank earns its margin on the mortgage every month');

// foreclosure: months in the red and the bank sells the home at auction
C.cash = 0; C.life.wallet = -5; C.life.salary = 0; C.life.arr = B.arrears - 1;
const bal = h.bal, oc = O.cash;
E.LIFE.monthStep(city, city.m, { ...E.kx(city), feed: () => {}, news: (c, m, t) => { city.news.unshift({ title: t }); }, mortPaid: () => {}, foreclosed: (c, p, hh, got) => BK.foreclosed(c, p, hh, got, E.kx(city)), credit: () => {}, notify: () => {}, auctionBidder: () => null, botFriend: () => false, auctionDone: () => {} });
assert(!C.life.homes.includes(h), `the home is foreclosed (loan ${bal.toFixed(2)} M)`);
assert(city.news[0].title.includes('Foreclosure'), 'the Gazette reports the foreclosure auction');
assert(O.cash >= oc - bal && BK.badRecord(city, 'c'), 'the bank is paid first; the default is on the record');

// a rival with a bank undercuts yours
const rb = city.listings.find((l) => l.type === 'finance' && l.id !== CENTRAL_BANK);
rb.site = null; rb.built = true; E.botCtx(city).assign(rb, bot); bot.cash = 100;
assert(BK.isLender(rb) && near(BK.rateOf(city, rb, E.kx(city)), mk() + ((B.bots[bot.id] || {}).spread ?? B.spread)), 'a rival\'s bank lends at its own margin');
E.BOT.rel(city, bot.id, 'o').v = -60;
const ws = B.war.chance; B.war.chance = 1; week(1); B.war.chance = ws;
const war = city.bk.war[rb.id];
assert(war && war.vs === bank.id && war.sp <= BK.cfg(city, bank).sp - B.war.under + 1e-9, `${bot.name} starts a rate war against Thomas's bank`);
assert(O.mail.some((x) => x.from && x.from.k === 'bot' && /Rates at my bank/.test(x.subj)), 'and tells him in their own voice');
const offs = BK.offers(city, C, E.kx(city));
assert(offs[0].l === rb, 'their bank is now the cheapest in the city');

// no bank standing: the Bank of Aurex lends as last resort, dearer than any bank
[bank, rb].forEach((l) => { l.site = { kind: 'new', ph: 0 }; l.built = false; });
C.cash = 10; delete city.bk.rec.c; r = A('c', 'loan', { amt: 5 });
const lr = C.loans[C.loans.length - 1];
assert(r.ok && lr.bank === 'cb' && near(lr.rate, mk() + B.lastResort), 'with no bank standing the Bank of Aurex lends at market + ' + B.lastResort);
// an older city: loans from before the banks move to a bank, and the borrower gets a welcome mail
{ const c2 = E.createCity(now, { speed: 2016 }); E.addPlayer(c2, 'x', 'Old Loan', now); const X = c2.players.x;
  delete c2.bk; X.loans = [{ amt: 5, rate: 'bank', m: 0 }];
  E.BK.migrate(c2, E.kx(c2));
  assert(X.loans[0].bank && X.loans[0].bank !== 'cb' && typeof X.loans[0].rate === 'number', 'an old loan moves to a bank at a fixed rate');
  assert(X.mail.some((m) => /Welcome to/.test(m.subj) && /What is new in banking/.test(m.body)), 'and a welcome mail from the bank explains what changed'); }
console.log('banks: all good');
