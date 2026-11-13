// Private banks (BK from engine.js; numbers in BANKS in content.js). Every Community Bank and Finance & Banking company that
// stands (not the Bank of Aurex, not a building site or a ruin) lends to the city's tycoons. Its owner sets the margin over the
// market rate for business loans and mortgages, the most one customer may owe it, and whether the credit committee reviews
// applications by hand. Without an active human owner the bank runs on its loan officers (autopilot margins; a rival tycoon's
// bank uses its own margin). The market rate is the Bank of Aurex's bank rate, set by its governor.
// Only owners of a bank (or of the national bank) borrow straight from the Bank of Aurex at the market rate; everyone else
// borrows from a bank at that bank's rate, fixed when the loan is made. A bank earns the margin over the market rate it
// refinances at; when a borrower defaults it takes the pledged company or loses most of the loan.
// Every bank draws what it lends on a funding line at the Bank of Aurex (business loans at the market rate, mortgages at the
// market mortgage rate). The line floats while the bank's loans are fixed: when the governor raises the rate, the margin shrinks.
// city.bk = { cfg: { lid: { by, sp, msp, max, hand, open } }, apps: [], rec: { pid: { bad, def, paid } }, war: { lid: { bid, vs, sp, until } }, loss: { lid: { by, y, v, last } }, cap: { lid: { by, v } }, led, v }
// city.bk.led[lid] = the owner's ledger (starts over on a new owner): { by, m0, earn, eq, loss, open: { key: entry }, past: [entry] }
// entry = { pid, name, k: 'loan' | 'home', hid?, amt (largest balance), rate, m0, m1?, earn (margin earned), loss (signed: a seized
// company worth more than the loan is a gain), how?: 'repaid' | 'default' | 'seized' | 'foreclosed' | 'moved' }. key = loan id or 'h:' + home uid.
// Capital: a bank its owner runs holds equity (city.bk.cap) of at least BANKS.capital.ratio of its risk-weighted loans
// (business loans in full, mortgages at mortW). Equity funds that part of the business loans itself, so the funding line
// is smaller; losses come off the equity first. Below the ratio the bank makes no new loans. Bot and unowned banks run without.
// p.loans[] = { id, amt, rate: % fixed | 'bank' (the market rate, floating), m, bank: lid | 'cb', pledge?, risk? }
// homes: h.bank = lid | 'cb', h.rate = % fixed (none: the market mortgage rate, floating; bank owners only)
// The engine hands in what it needs through ctx (kx in engine.js).
import { BANKS as B, TYPES, CENTRAL, CENTRAL_BANK } from './content.js';
import * as BLD from './build.js';

const r2 = (v) => Math.round(v * 100) / 100;
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = (p) => p + Math.random().toString(36).slice(2, 9);
const ok = (msg, x) => ({ ok: true, msg, ...(x || {}) }), err = (msg) => ({ ok: false, msg });
const WEEK = 1 / 48;
const sum = (a) => a.reduce((x, y) => x + y, 0);
export { B };

export function ensure(city) {
  if (!city.bk) city.bk = { cfg: {}, apps: [], rec: {}, war: {}, loss: {}, cap: {} };
  const k = city.bk; k.cfg = k.cfg || {}; k.apps = k.apps || []; k.rec = k.rec || {}; k.war = k.war || {}; k.loss = k.loss || {}; k.cap = k.cap || {}; k.led = k.led || {};
  return k;
}
export const name = (l) => (l ? l.title || `${TYPES[l.type].name}, ${l.district}` : 'the bank');
export const isLender = (l) => !!l && B.types.includes(l.type) && l.id !== CENTRAL_BANK && !BLD.idle(l);
export const lenders = (city) => city.listings.filter(isLender);
export const market = (city) => (city.cb ? city.cb.rate : CENTRAL.start);
export const host = (l) => B.hosts[l.id] || `${name(l).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '')}.ab`;
export const officer = (l) => ({ n: name(l), r: 'Credit committee', k: 'bank' });
const ownKey = (o) => (o ? `${o.k}:${o.id}` : '');
// a bank's settings: they start over when it changes hands
export function cfg(city, l) {
  const bk = ensure(city), by = ownKey(l.owner); let c = bk.cfg[l.id];
  if (!c || c.by !== by) c = bk.cfg[l.id] = { by, sp: B.spread, msp: B.mSpread, max: B.max, hand: false, open: true };
  return c;
}
// a tycoon owns a bank (or the national bank), alone or as co-owner: they borrow at the market rate
export function ownsBank(city, pid) {
  return city.listings.some((l) => (isLender(l) || l.id === CENTRAL_BANK) && l.owner && (l.owner.k === 'p' ? l.owner.id === pid : !!(city.holdings[l.owner.id] && city.holdings[l.owner.id].members[pid])));
}
export function rec(city, pid) { const r = ensure(city).rec; return r[pid] || (r[pid] = { bad: null, def: 0, paid: 0 }); }
export const badRecord = (city, pid) => { const r = ensure(city).rec[pid]; return !!r && r.bad != null && city.m - r.bad < B.bad; };

// ---------------------------------------------------------------- rates
// the margin a bank adds over the market rate now: the owner's, a rival's own or one in a rate war, or the loan officers'
export function spreadOf(city, l, ctx) {
  const w = ensure(city).war[l.id]; if (w && w.until > city.g) return w.sp;
  if (ctx.run(l)) return cfg(city, l).sp;
  const o = l.owner && l.owner.k === 'p' && city.players[l.owner.id];
  if (o && o.bot) return (B.bots[o.id] || {}).spread ?? B.spread;
  return B.spread;
}
export const rateOf = (city, l, ctx) => r2(Math.max(1, market(city) + spreadOf(city, l, ctx)));
export const mRateOf = (city, l, ctx) => r2(Math.max(0.5, ctx.mortRate() + (ctx.run(l) ? cfg(city, l).msp : B.mSpread)));
// what a tycoon pays at this bank: its rate minus their own discounts (prestige, friends among bankers, Banker specialisation)
export const quote = (city, p, l, ctx) => r2(Math.max(1, rateOf(city, l, ctx) + ctx.personal(p)));
export const lastResort = (city, p, ctx) => r2(Math.max(1, market(city) + B.lastResort + ctx.personal(p)));
export const bookMax = (l) => Math.round(B.book[l.size] * (1 + 0.3 * ((l.level || 1) - 1)));
// ---------------------------------------------------------------- capital
const CAP = B.capital;
// the owner's equity in the bank (none once it changes hands: weekStep pays the old owner back)
export function capOf(city, l) { const x = ensure(city).cap[l.id]; return x && x.by === ownKey(l.owner) ? x.v : 0; }
export const rwa = (bk) => r2(bk.biz + CAP.mortW * bk.mort);
// does the capital rule bind this bank (an active player runs it)?
export const capped = (l, ctx) => !!ctx.run(l);
// { cap, need, ratio, room (business loans it may add), mroom (mortgages), free (equity it may take out), short }
export function capital(city, l, ctx) {
  const cap = capOf(city, l), bk = book(city, l.id), w = rwa(bk), need = r2(w * CAP.ratio), on = capped(l, ctx);
  const room = on ? r2(Math.max(0, cap / CAP.ratio - w)) : Infinity;
  return { on, cap, need, w, ratio: w ? r4(cap / w) : null, room, mroom: on ? r2(room / CAP.mortW) : Infinity, free: r2(Math.max(0, cap - (on ? need : 0))), short: on && cap < need - 1e-9 };
}
function setCap(city, l, v) { ensure(city).cap[l.id] = { by: ownKey(l.owner), v: r2(Math.max(0, v)) }; }
// a loss: off the equity first, the rest from the owner
function hit(city, l, v, ctx) { const c = capOf(city, l), a = Math.min(c, v); if (a > 0) setCap(city, l, c - a); if (v - a > 0) ctx.credit(l.owner, -(v - a)); }
// the owner puts equity in (v > 0) or takes it out (v < 0)
function moveCap(city, p, l, v, ctx) {
  v = r2(Number(v) || 0); if (!v) return err('Choose an amount.');
  const c = capital(city, l, ctx);
  if (v > 0) { if (ctx.cashOf(l.owner) < v - 1e-9) return err(`Not enough money: ${r2(ctx.cashOf(l.owner))} M in the account.`); ctx.credit(l.owner, -v); setCap(city, l, c.cap + v); return ok(`${v} M of equity put into ${name(l)}. It may lend ${capital(city, l, ctx).room === Infinity ? 'freely' : `${capital(city, l, ctx).room} M more`}.`); }
  const out = Math.min(-v, c.cap); if (out > c.free + 1e-9) return err(`The bank needs ${c.need} M of equity for its loans. You can take out ${c.free} M.`);
  ctx.credit(l.owner, out); setCap(city, l, c.cap - out); return ok(`${r2(out)} M taken out of ${name(l)}.`);
}

// what a bank has lent out: business loans and mortgages
export function book(city, lid) {
  let biz = 0, mort = 0, n = 0;
  Object.values(city.players).forEach((p) => {
    (p.loans || []).forEach((x) => { if (x.bank === lid) { biz += x.amt; n++; } });
    ((p.life && p.life.homes) || []).forEach((h) => { if (h.bank === lid && h.bal > 0) { mort += h.bal; n++; } });
  });
  return { biz: r2(biz), mort: r2(mort), total: r2(biz + mort), n };
}
// yearly margin on business loans (the bank pays the market rate on what it has lent out); mortgages pay monthly
export function margin(city, l) {
  const mk = market(city), own = Math.min(capOf(city, l), book(city, l.id).biz); // equity funds part of the loans: no funding cost on it
  return r4(sum(Object.values(city.players).map((p) => sum((p.loans || []).filter((x) => x.bank === l.id && typeof x.rate === 'number').map((x) => x.amt * (x.rate - mk) / 100)))) + own * mk / 100);
}
// losses on bad loans, this game year and the one before
export function lossOf(city, lid) {
  const y = Math.floor((city.m || 0) / 12), x = ensure(city).loss[lid], l = city.listings.find((z) => z.id === lid);
  if (!x || x.by !== ownKey(l && l.owner)) return { year: 0, last: 0 }; // a new owner starts with a clean account
  return x.y === y ? { year: x.v, last: x.last || 0 } : { year: 0, last: x.y === y - 1 ? x.v : 0 };
}
function lose(city, lid, v, key) {
  ledHit(city, lid, key, v);
  if (!(v > 0)) return;
  const k = ensure(city).loss, y = Math.floor((city.m || 0) / 12), l = city.listings.find((z) => z.id === lid), by = ownKey(l && l.owner);
  let x = k[lid]; if (x && x.by !== by) x = null;
  if (!x || x.y !== y) k[lid] = { by, y, v: r2(v), last: x && x.y === y - 1 ? x.v : 0 }; else x.v = r2(x.v + v);
}
// ---------------------------------------------------------------- the loan book's ledger: what every loan earned the owner
const PAST = 120; // closed loans kept per bank
export function ledger(city, l) {
  const k = ensure(city).led, by = ownKey(l && l.owner); if (!l || !by) return null;
  let x = k[l.id]; if (!x || x.by !== by) x = k[l.id] = { by, m0: city.m || 0, earn: 0, eq: 0, loss: 0, open: {}, past: [] };
  return x;
}
const ledKey = (x, k) => (k === 'home' ? `h:${x.uid}` : x.id);
function ledOpen(city, x, p, y, k) {
  const key = ledKey(y, k), bal = k === 'home' ? y.bal : y.amt;
  let e = x.open[key];
  if (!e) e = x.open[key] = { pid: p.id, name: p.name, k, amt: r2(bal), rate: y.rate ?? null, m0: k === 'home' ? (y.boughtM ?? city.m) : (y.m ?? city.m), earn: 0, loss: 0, ...(k === 'home' ? { hid: y.hid } : {}) };
  if (bal > e.amt) e.amt = r2(bal);
  if (typeof y.rate === 'number') e.rate = y.rate;
  return e;
}
function ledHit(city, lid, key, v) {
  const l = city.listings.find((z) => z.id === lid), x = l && ledger(city, l); if (!x || !v) return;
  x.loss = r4(x.loss + v); const e = key && x.open[key]; if (e) e.loss = r4(e.loss + v);
}
function ledWhy(city, lid, key, how) { const l = city.listings.find((z) => z.id === lid), x = l && ledger(city, l), e = x && x.open[key]; if (e) e.how = how; }
// every time the clock moves (dt game years): margin on business loans and the equity's return accrue, loans that are gone close
export function accrue(city, dt) {
  const bk = ensure(city), mk = market(city), seen = {};
  lenders(city).forEach((l) => { if (l.owner) seen[l.id] = new Set(); });
  Object.values(city.players).forEach((p) => {
    (p.loans || []).forEach((y) => {
      const s = seen[y.bank]; if (!s) return; const x = ledger(city, ledL(city, y.bank)), e = ledOpen(city, x, p, y, 'loan'); s.add(y.id);
      if (dt > 0 && typeof y.rate === 'number') { const v = y.amt * (y.rate - mk) / 100 * dt; e.earn = r4(e.earn + v); x.earn = r4(x.earn + v); }
    });
    ((p.life && p.life.homes) || []).forEach((h) => { const s = seen[h.bank]; if (!s || !(h.bal > 0)) return; ledOpen(city, ledger(city, ledL(city, h.bank)), p, h, 'home'); s.add(`h:${h.uid}`); });
  });
  Object.entries(seen).forEach(([lid, s]) => {
    const l = ledL(city, lid), x = ledger(city, l);
    if (dt > 0) { const own = Math.min(capOf(city, l), book(city, lid).biz); if (own > 0) x.eq = r4(x.eq + own * mk / 100 * dt); }
    Object.keys(x.open).filter((key) => !s.has(key)).forEach((key) => {
      const e = x.open[key]; delete x.open[key];
      x.past.unshift({ ...e, key, m1: city.m, how: e.how || 'repaid', earn: r4(e.earn), loss: r4(e.loss) }); if (x.past.length > PAST) x.past.length = PAST;
    });
  });
  // a bank that is gone (or has no owner) keeps no ledger
  Object.keys(bk.led).forEach((lid) => { if (!seen[lid]) delete bk.led[lid]; });
}
const ledL = (city, lid) => city.listings.find((z) => z.id === lid);
// what the loan book has earned the owner: { earn, eq, loss, total, m0, open: [entry + key], past: [entry] }
export function earned(city, l) {
  const x = ledger(city, l); if (!x) return null;
  return { m0: x.m0, earn: r4(x.earn), eq: r4(x.eq), loss: r4(x.loss), total: r4(x.earn + x.eq - x.loss), open: Object.entries(x.open).map(([key, e]) => ({ key, ...e })), past: x.past };
}

// the bank's account in a year: interest its customers pay, what its funding line at the Bank of Aurex costs, losses, net.
// shock = what one point more on the market rate takes off the net (the loans are fixed, the funding line is not).
export function funding(city, l, ctx) {
  const mk = market(city), mr = ctx.mortRate();
  let biz = 0, mort = 0, inc = 0, cost = 0, n = 0;
  Object.values(city.players).forEach((p) => {
    (p.loans || []).forEach((x) => { if (x.bank !== l.id) return; const r = typeof x.rate === 'number' ? x.rate : mk; biz += x.amt; inc += x.amt * r / 100; cost += x.amt * mk / 100; n++; });
    ((p.life && p.life.homes) || []).forEach((h) => { if (h.bank !== l.id || !(h.bal > 0)) return; const r = h.rate ?? mr; mort += h.bal; inc += h.bal * r / 100; cost += h.bal * mr / 100; n++; });
  });
  const own = Math.min(capOf(city, l), biz), lent = biz + mort, line = lent - own, loss = lossOf(city, l.id);
  cost -= own * mk / 100;
  return { biz: r2(biz), mort: r2(mort), lent: r2(lent), own: r2(own), line: r2(line), n, mk, mr, inc: r4(inc), cost: r4(cost), avg: lent ? r2(inc / lent * 100) : 0, fr: line ? r2(cost / line * 100) : 0, spread: r4(inc - cost), loss: loss.year, lossLast: loss.last, net: r4(inc - cost - loss.year), shock: r4(line / 100) };
}
// the interest the Bank of Aurex is paid in a year: the market rate on what every bank has lent out, and its own loans
export function cbInterest(city, skip, loanRate) {
  const mk = market(city);
  return sum(Object.values(city.players).filter((p) => !skip.has(p.id)).map((p) => sum((p.loans || []).map((x) => x.amt * (x.bank === 'cb' || !x.bank ? (x.rate === 'bank' ? loanRate(p) : x.rate) : mk) / 100))));
}
const owes = (p, lid) => sum((p.loans || []).filter((x) => x.bank === lid).map((x) => x.amt));
const fixedRate = (x, ctx, p) => (x.rate === 'bank' ? ctx.loanRate(p) : x.rate);

// every bank a tycoon could borrow from, cheapest first: { l, rate, room, hand, closed }
export function offers(city, p, ctx) {
  return lenders(city).filter((l) => !ctx.canRun(p.id, l)).map((l) => {
    const c = cfg(city, l), run = ctx.run(l), max = run ? c.max : B.max;
    const left = bookMax(l) - book(city, l.id).total, k = capital(city, l, ctx);
    const room = r2(Math.max(0, Math.min(left, max - owes(p, l.id)))); // what the bank may lend you; croom = what its equity allows today
    return { l, rate: quote(city, p, l, ctx), mrate: mRateOf(city, l, ctx), room: run && !c.open ? 0 : room, croom: k.room, mroom: r2(Math.max(0, Math.min(left, k.mroom))), hand: run && c.hand, closed: run && !c.open, run };
  }).sort((a, b) => a.rate - b.rate);
}

// ---------------------------------------------------------------- borrowing
function made(city, p, x, ctx) {
  const loan = { id: uid('ln'), amt: r2(x.amt), rate: x.rate, m: city.m, bank: x.bank };
  if (x.pledge) loan.pledge = x.pledge;
  if (p.bot) loan.risk = (B.bots[p.id] || {}).risk ?? B.risk;
  p.loans.push(loan); p.cash += loan.amt;
  return loan;
}
// a tycoon borrows. o.bank: a bank's id, 'cb' (bank owners: the market rate), or empty = the cheapest bank.
// o.force: the overdraft cover or a rival's purchase: whoever lends at once, the Bank of Aurex as last resort
export function borrow(city, p, amt, o, ctx) {
  amt = r2(Number(amt) || 0); if (!(amt > 0)) return err('Choose an amount.');
  const cap = ctx.loanCap(p), d = ctx.debt(p);
  if (!o.force && d + amt > cap + 1e-9) return err(`Your credit limit is ${cap} M in all. You owe ${r2(d)} M, so you can borrow ${r2(Math.max(0, cap - d))} M more.`);
  const own = ownsBank(city, p.id);
  if (o.bank === 'cb' || (!o.bank && own)) {
    if (own) { made(city, p, { amt, rate: 'bank', bank: 'cb' }, ctx); return ok(`Borrowed ${amt} M from the Bank of Aurex at the market rate.`, { bank: 'cb' }); }
    if (lenders(city).length && !o.force) return err('The Bank of Aurex lends only to banks. Borrow from a bank in the city.');
  }
  const all = offers(city, p, ctx), fits = all.filter((x) => x.room >= amt - 1e-9 && (!o.force || x.croom >= amt - 1e-9) && !(badRecord(city, p.id) && !x.hand));
  let pick = null;
  if (o.bank && o.bank !== 'cb') {
    const x = all.find((y) => y.l.id === o.bank); if (!x) return err('That bank does not lend to you.');
    if (x.closed) return err(`${name(x.l)} takes no new loans right now.`);
    if (x.room < amt - 1e-9) return err(`${name(x.l)} can lend you ${x.room} M more.`);
    if (badRecord(city, p.id) && !x.hand) return err(`${name(x.l)}'s loan officers turn you down: you defaulted on a loan in the last ${B.bad} months.`);
    pick = x;
  } else pick = fits.find((x) => (o.force ? !x.hand : true)) || null;
  if (!pick) {
    if (o.force || !all.length) { const rate = lastResort(city, p, ctx); made(city, p, { amt, rate, bank: 'cb' }, ctx); return ok(`Borrowed ${amt} M from the Bank of Aurex as lender of last resort at ${rate}%.`, { bank: 'cb' }); }
    return err(badRecord(city, p.id) ? `The loan officers turn you down: you defaulted on a loan in the last ${B.bad} months. A bank whose owner reviews applications may still say yes.` : 'No bank can lend you that much right now.');
  }
  const pledge = validPledge(city, p, o.pledge, ctx);
  // the committee reviews it, or the bank lacks the equity to lend it today: it becomes an application the owner can approve
  // once there is equity enough (the loan officers decline it in B.wait weeks otherwise)
  if ((pick.hand || pick.croom < amt - 1e-9) && !o.force) return ask(city, p, pick.l, amt, pick.rate, pledge, ctx, pick.croom < amt - 1e-9);
  const loan = made(city, p, { amt, rate: pick.rate, bank: pick.l.id, pledge }, ctx);
  if (pick.run && !p.bot) ctx.notify(pick.l, `${p.name} borrowed ${amt} M`, `At ${loan.rate}% from ${name(pick.l)}. Your margin: ${r2(loan.rate - market(city))} points.`, 'good');
  return ok(`Borrowed ${amt} M from ${name(pick.l)} at ${loan.rate}%.`, { bank: pick.l.id, rate: loan.rate });
}
function validPledge(city, p, lid, ctx) {
  if (!lid) return null; const l = ctx.listing(lid);
  if (!l || !l.owner || l.owner.k !== 'p' || l.owner.id !== p.id || BLD.unbuilt(l)) return null;
  return (p.loans || []).some((x) => x.pledge === lid) ? null : lid;
}
// repay: the dearest loans first (or one loan by id); a bank loan paid off in full counts on your record
export function repay(city, p, amt, id, ctx) {
  let left = Math.min(Number(amt) || 0, ctx.debt(p), p.cash); if (left <= 0) return err('Nothing to repay, or not enough cash.');
  const paid = left;
  const list = (id ? p.loans.filter((x) => x.id === id) : p.loans.slice().sort((a, b) => fixedRate(b, ctx, p) - fixedRate(a, ctx, p)));
  if (!list.length) return err('No such loan.');
  const owed = sum(list.map((x) => x.amt)); // at least B.minRepay at a time, unless that pays it all off
  if (left < B.minRepay - 1e-9 && left < owed - 0.01) return err(`Repay at least ${B.minRepay} M at a time, or the whole loan.`);
  for (const x of list) { const v = Math.min(x.amt, left); x.amt = r4(x.amt - v); left = r4(left - v); if (x.amt <= 0.01 && x.bank && x.bank !== 'cb') rec(city, p.id).paid++; if (left <= 0) break; }
  const done = paid - left; p.cash -= done; p.loans = p.loans.filter((x) => x.amt > 0.01);
  return ok(`Repaid ${r2(done)} M.`);
}
export function repayAll(city, p) { p.loans.forEach((x) => { if (x.bank && x.bank !== 'cb') rec(city, p.id).paid++; }); p.cash -= sum(p.loans.map((x) => x.amt)); p.loans = []; }

// ---------------------------------------------------------------- mortgages
// the bank a home loan comes from: the cheapest with room, or the one asked for; bank owners borrow at the market mortgage rate
export function mortgage(city, p, amt, lid, ctx) {
  if (!(amt > 0)) return { ok: true, bank: null, rate: null };
  const own = ownsBank(city, p.id);
  if (own && (!lid || lid === 'cb')) return { ok: true, bank: 'cb', rate: null, name: 'the Bank of Aurex' };
  const all = offers(city, p, ctx), fits = all.filter((x) => !x.closed && x.mroom >= amt - 1e-9).sort((a, b) => a.mrate - b.mrate);
  if (lid && lid !== 'cb') { const x = fits.find((y) => y.l.id === lid); if (!x) return err('That bank cannot give you this mortgage right now.'); return { ok: true, bank: x.l.id, rate: x.mrate, name: name(x.l) }; }
  if (fits.length) return { ok: true, bank: fits[0].l.id, rate: fits[0].mrate, name: name(fits[0].l) };
  if (!all.length) return { ok: true, bank: 'cb', rate: r2(ctx.mortRate() + B.mLastResort), name: 'the Bank of Aurex (lender of last resort)' };
  return err('No bank in the city has room for a mortgage that size right now.');
}
// a month's mortgage interest reached the bank: it keeps the margin over the market mortgage rate
export function mortPaid(city, h, interest, ctx) {
  const l = h.bank && h.bank !== 'cb' ? ctx.listing(h.bank) : null; if (!l || !l.owner) return;
  const v = r4(interest - h.bal * ctx.mortRate() / 100 / 12); if (v) ctx.credit(l.owner, v);
  const x = ledger(city, l); if (x && v) { const p = Object.values(city.players).find((q) => ((q.life && q.life.homes) || []).includes(h)); const e = p ? ledOpen(city, x, p, h, 'home') : null; x.earn = r4(x.earn + v); if (e) e.earn = r4(e.earn + v); }
}
// a home was sold at a foreclosure auction for got: the bank is paid first; what is missing it loses
export function foreclosed(city, p, h, got, ctx) {
  const l = h.bank && h.bank !== 'cb' ? ctx.listing(h.bank) : null, short = r2(Math.max(0, h.bal - got));
  rec(city, p.id).bad = city.m; rec(city, p.id).def++;
  if (l && l.owner) {
    const x = ledger(city, l); if (x) ledOpen(city, x, p, h, 'home'); ledWhy(city, l.id, `h:${h.uid}`, 'foreclosed');
    if (short > 0) { hit(city, l, short, ctx); lose(city, l.id, short, `h:${h.uid}`); }
    ctx.mailTo(l, { kind: short ? 'bad' : 'info', from: officer(l), subj: `Foreclosure: ${p.name}`, body: `${p.name} stopped paying the mortgage, so the home was sold at auction for ${r2(got)} M. The loan was ${r2(h.bal)} M.${short ? ` The bank lost ${short} M.` : ' The bank got all its money back.'}`, web: `${host(l)}/office` });
  }
}

// ---------------------------------------------------------------- the credit committee
function ask(city, p, l, amt, rate, pledge, ctx, short) {
  const bk = ensure(city);
  if (bk.apps.some((a) => a.status === 'open' && a.pid === p.id && a.lid === l.id)) return err(`You already have an application waiting at ${name(l)}.`);
  const a = { id: uid('ap'), lid: l.id, pid: p.id, amt, rate, pledge: pledge || null, g: city.g, m: city.m, due: r4(city.g + B.wait * WEEK), status: 'open' };
  bk.apps.push(a);
  const pl = pledge && ctx.listing(pledge);
  ctx.mailTo(l, { kind: 'info', from: officer(l), subj: `Loan application: ${p.name}, ${amt} M`, body: `${p.name} asks ${name(l)} for ${amt} M at ${rate}%${pl ? `, with ${name(pl)} as pledge` : ', unsecured'}. ${short ? ` The bank lacks the equity to lend it today: put in ${r2(Math.max(0, amt * CAP.ratio - capital(city, l, ctx).cap + capital(city, l, ctx).need))} M in the bank office first.` : ''} The credit committee meets in the bank office. If nobody decides within ${B.wait} weeks, the loan officers do.`, web: `${host(l)}/office` });
  return ok(`Application sent to ${name(l)}. The credit committee answers within ${B.wait} weeks.`, { app: a.id, pending: true });
}
// everything the committee sees about an applicant (rival tycoons show their character; their real risk stays hidden)
export function dossier(city, a, ctx) {
  const p = city.players[a.pid], l = ctx.listing(a.lid); if (!p || !l) return null;
  const cap = ctx.loanCap(p), d = ctx.debt(p), r = rec(city, p.id), per = p.bot ? ctx.pers(p.id) : null, pl = a.pledge && ctx.listing(a.pledge);
  const boss = ctx.runners(l)[0];
  return { name: p.name, bot: !!p.bot, title: per ? per.title : null, traits: per ? per.traits || [] : [], nw: r2(ctx.netWorth(p.id)), cash: r2(p.cash), debt: r2(d), cap,
    use: cap ? r2((d + a.amt) / cap) : 1, income: r2(ctx.net(p)), cos: ctx.ownedBy('p', p.id).length, bad: badRecord(city, p.id), def: r.def || 0, paid: r.paid || 0,
    econ: city.econ, rel: p.bot && boss ? ctx.relV(p.id, boss.id) : null, pledge: pl ? { lid: pl.id, name: name(pl), value: ctx.value(pl) } : null,
    amt: a.amt, rate: a.terms ? a.terms.rate : a.rate, margin: r2((a.terms ? a.terms.rate : a.rate) - market(city)), score: score(city, a, ctx) };
}
// the loan officers' credit score, 0…1 (a rival's hidden risk counts: a careful committee reads it from the traits)
export function score(city, a, ctx) {
  const p = city.players[a.pid]; if (!p) return 0;
  const cap = ctx.loanCap(p), use = cap ? (ctx.debt(p) + a.amt) / cap : 1, r = rec(city, p.id), pl = a.pledge && ctx.listing(a.pledge);
  let s = 0.78 - Math.max(0, use - 0.4) * 0.9 - (badRecord(city, p.id) ? 0.45 : 0) + Math.min(0.15, (r.paid || 0) * 0.05) - Math.min(0.3, (r.def || 0) * 0.1);
  if (ctx.net(p) < 0) s -= 0.15; if (p.cash < 0) s -= 0.15;
  s -= { Boom: -0.03, Stable: 0, Recession: 0.08, Crisis: 0.15 }[city.econ] || 0;
  if (p.bot) s -= (((B.bots[p.id] || {}).risk ?? B.risk) - B.risk) * 7;
  if (pl) s += 0.15 * Math.min(1, ctx.value(pl) / a.amt);
  if (ctx.carNudge && !p.bot) s += ctx.carNudge(p); // the committee sees what you drive up in
  return r2(clamp(s, 0, 1));
}
// the borrower's best company not already pledged, for a counter-offer that asks for security
function bestPledge(city, p, ctx) { return ctx.ownedBy('p', p.id).filter((l) => !BLD.unbuilt(l) && !(p.loans || []).some((x) => x.pledge === l.id)).sort((a, b) => ctx.value(b) - ctx.value(a))[0] || null; }
// the committee decides: v = 'ok' | 'no' | 'rate' (counter: higher rate) | 'pledge' (counter: a company as security)
export function decide(city, p, id, v, ctx) {
  const a = ensure(city).apps.find((x) => x.id === id && x.status === 'open'); if (!a) return err('This application is closed.');
  const l = ctx.listing(a.lid); if (!l || !ctx.canRun(p.id, l)) return err('Only the bank\'s owners sit on its credit committee.');
  const r = settle(city, a, v, ctx, false);
  if (r.ok) ctx.task(p, l);
  return r;
}
function tellBorrower(ctx, b, l, subj, body, kind, extra) { if (!b.bot) ctx.mail(b, { kind, from: officer(l), subj, body, ...(extra || {}) }); }
function settle(city, a, v, ctx, auto) {
  const b = city.players[a.pid], l = ctx.listing(a.lid), who = auto ? 'The loan officers' : 'The credit committee';
  if (!b || !l || !isLender(l)) { a.status = 'gone'; return ok('The application lapsed.'); }
  const boss = ctx.runners(l)[0];
  if (v === 'ok') {
    const terms = a.terms || { rate: a.rate, pledge: a.pledge };
    const why = room(city, b, l, a.amt, ctx); if (why) { a.status = 'no'; tellBorrower(ctx, b, l, `Loan of ${a.amt} M: not possible`, why, 'bad'); return ok(`Could not be lent: ${why}`); }
    made(city, b, { amt: a.amt, rate: terms.rate, bank: l.id, pledge: validPledge(city, b, terms.pledge, ctx) }, ctx); a.status = 'ok';
    tellBorrower(ctx, b, l, `Loan approved: ${a.amt} M`, `${who} of ${name(l)} lent you ${a.amt} M at ${terms.rate}%. The money is in your company account.`, 'good');
    if (b.bot && boss) ctx.event(b.id, boss.id, 'deal', { d: 3, t: `Lent me ${a.amt} M at ${name(l)}` });
    return ok(`${a.amt} M lent to ${b.name} at ${terms.rate}%.`);
  }
  if (v === 'no') {
    a.status = 'no';
    tellBorrower(ctx, b, l, `Loan of ${a.amt} M declined`, `${who} of ${name(l)} said no. Try another bank, or apply again when your accounts look better.`, 'bad');
    if (b.bot && boss && !auto) { ctx.event(b.id, boss.id, 'refuse', { t: `Turned down my loan at ${name(l)}` }); if (Math.random() < 0.5) ctx.say(b, boss, 'loanNo', {}); }
    return ok(`Declined. ${b.name} gets no loan.`);
  }
  if (v === 'rate' || v === 'pledge') {
    const terms = { rate: v === 'rate' ? r2(a.rate + B.counter) : a.rate, pledge: a.pledge };
    if (v === 'pledge') { if (a.pledge) return err('This loan already has a pledge.'); const pl = bestPledge(city, b, ctx); if (!pl) return err(`${b.name} has no company to pledge.`); terms.pledge = pl.id; }
    if (b.bot) {
      const bb = B.bots[b.id] || {}, rel = boss ? ctx.relV(b.id, boss.id) : 0;
      const yes = v === 'rate' ? terms.rate - market(city) <= (bb.tol ?? 4) + 1e-9 && Math.random() < 0.6 + rel / 250 : Math.random() < (bb.pledge ?? 0.5) + rel / 250;
      if (yes) { a.terms = terms; return settle(city, a, 'ok', ctx, auto); }
      a.status = 'no'; if (boss) ctx.event(b.id, boss.id, 'lowball', { d: -2, t: `Wanted too much for a loan at ${name(l)}` });
      return ok(`${b.name} said no to your terms and goes elsewhere.`);
    }
    a.terms = terms; a.status = 'counter'; a.cdue = r4(city.g + B.wait * WEEK);
    const pl = terms.pledge && ctx.listing(terms.pledge);
    tellBorrower(ctx, b, l, `Counter-offer: ${a.amt} M from ${name(l)}`, `${who} offers you ${a.amt} M at ${terms.rate}%${pl ? ` if you pledge ${name(pl)}: if you default, the bank takes it` : ''}.`, 'info',
      { opts: [{ l: 'Accept the offer', d: `${a.amt} M at ${terms.rate}%${pl ? `, ${name(pl)} as pledge` : ''}`, bk: { id: a.id, yes: true } }, { l: 'No, thank you', d: 'Borrow somewhere else', safe: true, bk: { id: a.id, yes: false } }], due: a.cdue });
    return ok(`Counter-offer sent to ${b.name}.`);
  }
  return err('Unknown decision.');
}
// what stops a loan now, in words (or null)
function room(city, b, l, amt, ctx) {
  const cap = ctx.loanCap(b), d = ctx.debt(b);
  if (d + amt > cap + 1e-9) return `${b.name} is at the credit limit (${cap} M).`;
  if (bookMax(l) - book(city, l.id).total < amt - 1e-9) return `${name(l)} has lent out all it can (${bookMax(l)} M).`;
  const k = capital(city, l, ctx); if (k.room < amt - 1e-9) return `${name(l)} lacks equity: it may lend ${k.room} M more at ${Math.round(CAP.ratio * 100)}% capital.`;
  return null;
}
// the borrower answers a counter-offer (mail opts[].bk)
export function answer(city, p, o, ctx) {
  const a = ensure(city).apps.find((x) => x.id === o.id); if (!a || a.status !== 'counter' || a.pid !== p.id) return ok('The offer is closed.');
  const l = ctx.listing(a.lid);
  if (!o.yes) { a.status = 'no'; if (l) ctx.notify(l, `${p.name} turned down your counter-offer`, `No loan of ${a.amt} M.`, 'info'); return ok('You said no.'); }
  const why = l && isLender(l) ? room(city, p, l, a.amt, ctx) : 'The bank is gone.'; if (why) { a.status = 'no'; return ok(why); }
  made(city, p, { amt: a.amt, rate: a.terms.rate, bank: l.id, pledge: validPledge(city, p, a.terms.pledge, ctx) }, ctx); a.status = 'ok';
  ctx.notify(l, `${p.name} accepted your counter-offer`, `${a.amt} M lent at ${a.terms.rate}%.`, 'good');
  return ok(`${a.amt} M is in your company account.`);
}

// ---------------------------------------------------------------- owners' settings
export function act(city, p, action, a, ctx) {
  if (action === 'loan') return borrow(city, p, a.amt, { bank: a.bank || '', pledge: a.pledge || null }, ctx);
  if (action === 'repay') return repay(city, p, Number(a.amt) || 5, a.id || null, ctx);
  if (action === 'bkDecide') return decide(city, p, a.app, a.v, ctx);
  if (action === 'bkCap') {
    const l = ctx.listing(a.lid); if (!isLender(l)) return err('Not a bank.'); if (!ctx.canRun(p.id, l)) return err('You do not run this bank.');
    return moveCap(city, p, l, a.v, ctx);
  }
  if (action === 'bkSet') {
    const l = ctx.listing(a.lid); if (!isLender(l)) return err('Not a bank.'); if (!ctx.canRun(p.id, l)) return err('You do not run this bank.');
    const c = cfg(city, l), k = a.k, v = a.v;
    if (k === 'sp') { c.sp = r2(clamp(Math.round(Number(v) * 4) / 4, B.range[0], B.range[1])); return ok(`New business loans: market rate ${c.sp >= 0 ? '+' : '−'} ${Math.abs(c.sp)} = ${rateOf(city, l, ctx)}%.`); }
    if (k === 'msp') { c.msp = r2(clamp(Math.round(Number(v) * 4) / 4, B.mRange[0], B.mRange[1])); return ok(`New mortgages: ${mRateOf(city, l, ctx)}%.`); }
    if (k === 'max') { c.max = Math.round(clamp(Number(v) || B.max, B.maxRange[0], B.maxRange[1])); return ok(`One customer may owe the bank up to ${c.max} M.`); }
    if (k === 'hand') { c.hand = v === true || v === 'true' || v === 1 || v === '1'; return ok(c.hand ? 'The credit committee reviews every application.' : 'The loan officers approve loans within the limits at once.'); }
    if (k === 'open') { c.open = v === true || v === 'true' || v === 1 || v === '1'; return ok(c.open ? 'The bank takes new loans again.' : 'The bank takes no new loans for now.'); }
    return err('Unknown setting.');
  }
  return null;
}

// ---------------------------------------------------------------- the clock
// weekly: applications nobody answered, rival tycoons asking for loans, rate wars
export function weekStep(city, ctx) {
  const bk = ensure(city);
  Object.entries(bk.cap).forEach(([lid, x]) => { // the bank changed hands (or is gone): its old owner gets the equity back
    const l = ctx.listing(lid); if (l && x.by === ownKey(l.owner)) return;
    const [k, id] = x.by.split(':'); if (x.v > 0 && id) ctx.credit({ k, id }, x.v); delete bk.cap[lid];
  });
  bk.apps.filter((a) => a.status === 'open' && a.due <= city.g + 1e-9).forEach((a) => { const l = ctx.listing(a.lid); const r = settle(city, a, score(city, a, ctx) >= B.auto ? 'ok' : 'no', ctx, true); if (l) ctx.notify(l, `Loan officers: ${city.players[a.pid] ? city.players[a.pid].name : 'an applicant'}`, r.msg, 'info'); });
  bk.apps.filter((a) => a.status === 'counter' && a.cdue <= city.g + 1e-9).forEach((a) => (a.status = 'lapsed'));
  bk.apps = bk.apps.filter((a) => a.status === 'open' || a.status === 'counter' || city.g - a.g < 12 * WEEK).slice(-60);
  lenders(city).filter((l) => ctx.run(l)).forEach((l) => botAsk(city, l, ctx));
  rateWars(city, ctx);
}
// a rival tycoon asks a player's bank for a loan (friends more often, enemies never)
function botAsk(city, l, ctx) {
  const bk = ensure(city), boss = ctx.runners(l)[0]; if (!boss) return;
  if (bk.apps.filter((a) => a.lid === l.id && a.status === 'open').length >= B.open || Math.random() >= B.ask) return;
  const mk = market(city), c = cfg(city, l);
  if (!c.open) return;
  const cands = Object.values(city.players).filter((b) => {
    const bb = B.bots[b.id] || {}; if (!b.bot || bb.never || ctx.relV(b.id, boss.id) <= -40 || bk.apps.some((a) => a.pid === b.id && a.status === 'open')) return false;
    return ctx.loanCap(b) - ctx.debt(b) >= B.amt[0] && quote(city, b, l, ctx) - mk <= (bb.tol ?? 4) + 1e-9;
  });
  if (!cands.length) return;
  const w = cands.map((b) => ((B.bots[b.id] || {}).ask ?? 1) * (b.cash < 5 ? 2 : 1) * (1 + Math.max(0, ctx.relV(b.id, boss.id)) / 50));
  let x = Math.random() * sum(w), b = cands[0]; for (let i = 0; i < cands.length; i++) { x -= w[i]; if (x <= 0) { b = cands[i]; break; } }
  const most = Math.min(B.amt[1], ctx.loanCap(b) - ctx.debt(b), c.max - owes(b, l.id), bookMax(l) - book(city, l.id).total); if (most < B.amt[0]) return;
  const amt = Math.max(B.amt[0], Math.floor((B.amt[0] + Math.random() * (most - B.amt[0])) / 5) * 5);
  const pl = Math.random() < ((B.bots[b.id] || {}).pledge ?? 0.5) * 0.5 ? ctx.ownedBy('p', b.id).filter((y) => !BLD.unbuilt(y) && ctx.value(y) >= amt * 0.5 && !(b.loans || []).some((z) => z.pledge === y.id)).sort((a1, a2) => ctx.value(a1) - ctx.value(a2))[0] : null;
  const a = { id: uid('ap'), lid: l.id, pid: b.id, amt, rate: quote(city, b, l, ctx), pledge: pl ? pl.id : null, g: city.g, m: city.m, due: r4(city.g + B.wait * WEEK), status: 'open' };
  if (!c.hand) { bk.apps.push(a); const r = settle(city, a, score(city, a, ctx) >= B.auto ? 'ok' : 'no', ctx, true); ctx.notify(l, `Loan officers: ${b.name} asked for ${amt} M`, r.msg, 'info'); return; }
  bk.apps.push(a);
  ctx.mailTo(l, { kind: 'info', from: officer(l), subj: `Loan application: ${b.name}, ${amt} M`, body: `${b.name} asks ${name(l)} for ${amt} M at ${a.rate}%${pl ? `, with ${name(pl)} as pledge` : ', unsecured'}. The credit committee meets in the bank office. If nobody decides within ${B.wait} weeks, the loan officers do.`, web: `${host(l)}/office` });
}
// a rival who owns a bank undercuts a player's bank and takes over loans from rival tycoons who bank there
function rateWars(city, ctx) {
  const bk = ensure(city);
  Object.entries(bk.war).forEach(([lid, w]) => {
    const mine = ctx.listing(lid), vs = ctx.listing(w.vs), b = city.players[w.bid];
    if (!mine || !vs || !b || !mine.owner || mine.owner.id !== b.id || w.until <= city.g) {
      delete bk.war[lid]; const boss = vs && ctx.runners(vs)[0]; if (b && boss && mine) ctx.say(b, boss, 'rateWarEnd', { co: name(mine) }); return;
    }
    // they follow you down, but never below the floor
    const target = r2(Math.max(B.range[0], cfg(city, vs).sp - B.war.under)); if (target < w.sp) w.sp = target;
    // one loan a week moves to them: a rival tycoon who banks with you and pays more than their rate
    const rate = r2(Math.max(1, market(city) + w.sp));
    const mv = Object.values(city.players).filter((p) => p.bot && p.id !== b.id).flatMap((p) => p.loans.filter((x) => x.bank === vs.id && x.rate > rate + 0.25).map((x) => ({ p, x })))[0];
    if (mv && bookMax(mine) - book(city, mine.id).total >= mv.x.amt) { ledWhy(city, vs.id, mv.x.id, 'moved'); mv.x.bank = mine.id; mv.x.rate = rate; ctx.notify(vs, `${mv.p.name} moved a loan to ${name(mine)}`, `${r2(mv.x.amt)} M at ${rate}% there. ${b.name} is undercutting your bank.`, 'bad'); }
  });
  lenders(city).forEach((mine) => {
    const b = mine.owner && mine.owner.k === 'p' && city.players[mine.owner.id]; if (!b || !b.bot || bk.war[mine.id] || Math.random() >= B.war.chance) return;
    const vs = lenders(city).find((l) => l.id !== mine.id && ctx.run(l) && ctx.runners(l).some((p) => ctx.isRival(b.id, p.id)) && !Object.values(bk.war).some((w) => w.vs === l.id)); if (!vs) return;
    const sp = r2(Math.max(B.range[0], cfg(city, vs).sp - B.war.under)), boss = ctx.runners(vs).find((p) => ctx.isRival(b.id, p.id));
    bk.war[mine.id] = { bid: b.id, vs: vs.id, sp, until: r4(city.g + B.war.weeks * WEEK) };
    ctx.say(b, boss, 'rateWar', { co: name(mine), x: `${r2(Math.max(1, market(city) + sp))}%` }, { kind: 'bad', web: `${host(vs)}/office` });
    ctx.news(`${name(mine)} cuts its loan rates`, `${b.name}'s bank lends at ${r2(Math.max(1, market(city) + sp))}%, below ${name(vs)}.`, 'info');
  });
}
// monthly: loans in default. A player in the red for months defaults on their biggest bank loan; rival tycoons default by chance
export function monthStep(city, m, ctx) {
  Object.values(city.players).forEach((p) => {
    const bl = (p.loans || []).filter((x) => x.bank && x.bank !== 'cb'); if (!bl.length) { p.arr = 0; return; }
    if (p.bot) { const k = B.econRisk[city.econ] || 1; bl.forEach((x) => { if (Math.random() < (x.risk ?? B.risk) * k * (p.cash < 2 ? 2 : 1)) fail(city, p, x, ctx); }); return; }
    if (p.admin || p.coop) return;
    if (p.cash < 0) { p.arr = (p.arr || 0) + 1; if (p.arr >= B.arrears) { fail(city, p, bl.sort((a, b) => b.amt - a.amt)[0], ctx); p.arr = 0; } } else p.arr = 0;
  });
}
// a loan defaults: the bank takes the pledged company (paying out what it is worth above the loan) or collects a part
export function fail(city, p, x, ctx) {
  const l = ctx.listing(x.bank), r = rec(city, p.id); r.bad = city.m; r.def = (r.def || 0) + 1;
  p.loans = p.loans.filter((y) => y !== x);
  const pl = x.pledge && ctx.listing(x.pledge), canSeize = pl && pl.owner && pl.owner.k === 'p' && pl.owner.id === p.id && l && l.owner;
  if (l && l.owner) { const lx = ledger(city, l); if (lx) ledOpen(city, lx, p, x, 'loan'); ledWhy(city, l.id, x.id, canSeize ? 'seized' : 'default'); }
  let words;
  if (canSeize) {
    const v = ctx.value(pl), pay = r2(Math.max(0, v * B.seizeAt - x.amt));
    ctx.seize(pl, l.owner); ctx.credit(l.owner, -(x.amt + pay)); if (pay) p.cash += pay; lose(city, l.id, r2(x.amt + pay - v), x.id);
    words = `${name(l)} took ${name(pl)} (worth ${r2(v)} M) for the ${r2(x.amt)} M loan.${pay ? ` ${pay} M above the loan went back to ${p.name}.` : ''}`;
  } else {
    const lost = r2(x.amt * (1 - B.recovery)); if (l && l.owner) { hit(city, l, lost, ctx); lose(city, l.id, lost, x.id); }
    words = `${name(l)} collected ${Math.round(B.recovery * 100)}% of the ${r2(x.amt)} M and lost ${lost} M.`;
  }
  if (!p.bot) ctx.feed(p, `Your loan from ${name(l)} is in default`, `${words} Banks remember a default for ${B.bad} months.`, 'bad');
  if (l) ctx.mailTo(l, { kind: 'bad', from: officer(l), subj: `${p.name} defaulted on a loan`, body: words, web: `${host(l)}/office` });
  ctx.news(`${p.name} defaults on a bank loan`, words, 'bad');
  const boss = l && ctx.runners(l)[0];
  if (p.bot && boss) { ctx.say(p, boss, 'loanDefault', { co: name(l) }); if (canSeize) ctx.event(p.id, boss.id, 'keep', { d: -6, t: `Took my ${name(pl)} for a loan` }); }
  return words;
}

// ---------------------------------------------------------------- older cities
// loans and mortgages from before the private banks: bank owners keep the market rate; everyone else moves to the cheapest bank
export function migrate(city, ctx) {
  const bk = ensure(city); if (bk.v === 1) return; bk.v = 1;
  Object.values(city.players).forEach((p) => {
    const own = ownsBank(city, p.id), list = own ? [] : offers(city, p, ctx), moved = [];
    (p.loans || []).forEach((x) => {
      if (!x.id) x.id = uid('ln');
      if (x.bank) return;
      if (own) { x.bank = 'cb'; return; }
      if (list.length) { x.bank = list[0].l.id; x.rate = list[0].rate; } else { x.bank = 'cb'; x.rate = lastResort(city, p, ctx); }
      moved.push({ k: 'loan', amt: x.amt, rate: x.rate, bank: x.bank });
    });
    ((p.life && p.life.homes) || []).forEach((h) => {
      if (!(h.bal > 0) || h.bank) return;
      if (own) { h.bank = 'cb'; return; }
      const best = list.slice().sort((a, b) => a.mrate - b.mrate)[0];
      if (best) { h.bank = best.l.id; h.rate = best.mrate; } else { h.bank = 'cb'; h.rate = r2(ctx.mortRate() + B.mLastResort); }
      moved.push({ k: 'home', amt: h.bal, rate: h.rate, bank: h.bank, home: h.hid });
    });
    if (moved.length && !p.bot) welcome(city, p, moved, ctx);
  });
}
// one welcome mail per bank that took over a tycoon's loans, with what changed in banking
function welcome(city, p, moved, ctx) {
  const by = {}; moved.forEach((x) => (by[x.bank] = by[x.bank] || []).push(x));
  Object.entries(by).forEach(([lid, xs]) => {
    const l = lid === 'cb' ? null : ctx.listing(lid), who = l ? name(l) : 'the Bank of Aurex', site = l ? host(l) : 'bankofaurex.ab/loans';
    const lines = xs.map((x) => `${x.k === 'home' ? 'Mortgage' : 'Business loan'}: ${r2(x.amt)} M at ${r2(x.rate)}%, fixed.`);
    ctx.mail(p, { kind: 'info', from: l ? officer(l) : { n: 'Bank of Aurex', r: 'Business banking', k: 'bank' }, subj: `Welcome to ${who}: your loans have a new home`,
      body: [`Aurex Bay has private banks now, and ${who} has taken over your loans from the Bank of Aurex. Nothing is due: you pay the same way as before, from your company account (mortgages from your personal account).`, ...lines,
        'What is new in banking:',
        '• The Bank of Aurex sets the market rate. Only owners of a bank borrow there at that rate; everyone else borrows from a bank.',
        '• Each bank sets its own rate on top of the market rate. Your rate is fixed when you borrow. Repay or move to a cheaper bank whenever you like.',
        '• Every bank has its own website with rates, a Borrow page and Your loans. Compare them at bankofaurex.ab/loans.',
        '• Own a bank? You set its rates in the bank office, earn the margin, and can hold a 20-second credit committee on every application.',
        `• Stay in the red for ${B.arrears} months and a loan defaults: the bank takes a pledged company, and a mortgage ends in a foreclosure auction.`,
        '• Rival tycoons borrow from your bank too, and a rival with a bank may start a rate war.',
        `Your bank: ${site}`].join('\n'), web: site });
  });
}
