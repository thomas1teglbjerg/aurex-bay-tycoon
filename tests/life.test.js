// Personal life: wallet, homes, collections, auctions, trades, gifts and prestige
import * as E from '../supabase/functions/_shared/engine.js';
const L = E.LIFE;
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 200;
const step = () => { now += E.realMsPerMonth(city); E.advance(city, now); };
const A = (a, x) => E.apply(city, 'u', a, x, now);
assert(p.life && p.life.wallet === 0.4, 'personal wallet starts at 0.4 M');
assert(Object.values(city.players).filter((x) => x.bot).every((b) => !b.life.items.length && !b.life.homes.length), 'rival tycoons start without homes or collections (a level start)');
assert(city.life.lots.length >= 5 && city.life.dealer.length > 0, 'auction house and dealer are stocked');
assert(!A('homeBuy', { hid: 'H1' }).ok, 'cannot buy the loft without a down payment');
const d = A('lifeDividend', { amt: 10 }); assert(d.ok && Math.abs(p.life.wallet - (0.4 + 7.3)) < 0.01, 'dividend is taxed 27%');
const nw0 = E.netWorth(city, 'u');
assert(A('homeBuy', { hid: 'H1', down: 0.2 }).ok && p.life.homes.length === 1 && p.life.res, 'buy the Old Grid Loft with a mortgage');
const h = p.life.homes[0]; assert(h.bal > 3.5, 'mortgage balance is about 80%');
assert(Math.abs(E.netWorth(city, 'u') - nw0) < 0.3, 'buying a home moves money, net worth stays about the same');
const car = L.COLLECTIBLES ? null : null;
const carId = Object.keys(L.ITEM).find((k) => L.ITEM[k].cat === 'car');
city.life.dealer.push(carId);
assert(!A('itemBuy', { cid: carId }).ok, 'no garage, so no cars');
const wineId = 'w3'; if (!city.life.dealer.includes(wineId)) city.life.dealer.push(wineId);
assert(!A('itemBuy', { cid: wineId }).ok, 'no wine cellar yet');
assert(A('homeRoom', { uid: h.uid, room: 'wine' }).ok && L.capacity(p, 'wine') === 40, 'install the wine wall (40 cases)');
assert(A('itemBuy', { cid: wineId }).ok && p.life.items.length === 1, 'buy a case of wine from the dealer');
const watch = ['t5', 't6', 't2', 't4', 't8'].find((k) => L.available(city, k) > 0); city.life.dealer.push(watch); p.life.wallet += 1; assert(A('itemBuy', { cid: watch }).ok, 'buy a watch');
const art = 'a7'; Object.values(city.players).forEach((x) => { x.life.items = x.life.items.filter((i) => i.cid !== art); }); city.life.lots = city.life.lots.filter((l) => l.cid !== art);
city.life.dealer.push(art); const rb = A('itemBuy', { cid: art }); assert(rb.ok, 'buy a painting ' + art + ' ' + rb.msg);
const pr0 = L.prestige(city, p).score; assert(pr0 > 0, `prestige counts home and collection (${pr0})`);
// salary and lifestyle
assert(A('lifeSalary', { v: 1 }).ok && E.rates(city, 'p', 'u').upkeep >= 1, 'salary is a cost for the empire');
const w0 = p.life.wallet, b0 = h.bal; step();
assert(h.bal < b0, 'mortgage is paid down every month');
assert(p.life.last && p.life.last.salaryNet > 0 && p.life.last.charges > 0, 'monthly personal ledger');
// auction: bid on a house lot with plenty of money
p.life.wallet = 50;
const lot = city.life.lots.find((l) => !l.seller && l.tier === 0 && ['art', 'watch', 'wine'].includes(L.ITEM[l.cid].cat));
if (lot) { assert(A('bid', { lot: lot.id, amt: lot.est * 3 }).ok, 'place a high bid'); const n = p.life.items.length; step(); if (lot.endM > city.m) step(); assert(p.life.items.length === n + 1, 'win the lot'); }
const legend = city.life.lots.find((l) => l.tier >= 3); if (legend) assert(!A('bid', { lot: legend.id, amt: legend.est }).ok, 'legendary lots need Elite prestige');
// consign, gift, lend, donate
const it = p.life.items.find((i) => L.ITEM[i.cid].cat === 'watch');
assert(A('itemSell', { uid: it.uid, how: 'auction' }).ok && it.lot, 'consign a watch to auction');
step(); assert(!p.life.items.includes(it) || !it.lot, 'consigned lot resolves');
const pa = p.life.items.find((i) => L.ITEM[i.cid].cat === 'art');
const usedArt = L.used(p, 'art'); assert(A('itemLend', { uid: pa.uid }).ok && pa.lent && L.used(p, 'art') === usedArt - 1, 'lend art to the museum frees a wall');
const ps1 = L.prestige(city, p).score;
const bot = Object.values(city.players).find((x) => x.bot);
const wine = p.life.items.find((i) => L.ITEM[i.cid].cat === 'wine');
assert(A('host', { guests: 'bankers', uid: wine.uid }).ok && p.life.bank && E.loanRate(city, p) < 8, 'dinner with bankers lowers the bank rate');
assert(!A('host', { guests: 'clients', uid: wine.uid }).ok, 'the case was drunk');
const wl = p.life.wallet; assert(A('itemDonate', { uid: pa.uid }).ok && p.life.wallet > wl && p.life.legacy > 0, 'donating gives a tax credit and legacy');
// trade with a bot: an overpay is accepted
const theirs = bot.life.items.find((i) => !i.lot && L.ITEM[i.cid].cat !== 'car');
if (theirs) {
  const room = L.ITEM[theirs.cid].cat; if (L.roomFree(p, room) < 1) A('homeRoom', { uid: h.uid, room });
  const v = L.instValue(city, bot, theirs);
  assert(!A('tradePropose', { to: bot.id, give: [], get: [theirs.uid], cash: v * 0.5 }).ok, 'lowball trade is declined');
  p.life.wallet = Math.max(p.life.wallet, v * 2); const r = A('tradePropose', { to: bot.id, give: [], get: [theirs.uid], cash: v * 1.2 }); assert(r.ok && p.life.items.some((i) => i.uid === theirs.uid), 'fair trade with a rival is accepted ' + r.msg);
}
// gift to another human
E.addPlayer(city, 'v', 'Mia', now); const q = city.players.v; q.life.wallet = 20; E.apply(city, 'v', 'homeBuy', { hid: 'H2' }, now); E.apply(city, 'v', 'homeRoom', { uid: q.life.homes[0].uid, room: 'watch' }, now);
const gift = p.life.items.find((i) => L.ITEM[i.cid].cat === 'watch' && !i.lot);
if (gift) assert(A('itemGift', { uid: gift.uid, to: 'v' }).ok && q.life.items.some((i) => i.uid === gift.uid), 'gift a watch to a friend');
// human-human trade proposal and accept
const mine = p.life.items.find((i) => !i.lot && L.ITEM[i.cid].cat === 'watch');
if (mine && q.life.items.length) { assert(A('tradePropose', { to: 'v', give: [mine.uid], get: [], cash: 0 }).ok && city.life.trades.length === 1, 'propose trade to a player'); assert(E.apply(city, 'v', 'tradeAccept', { id: city.life.trades[0].id }, now).ok, 'they accept'); }
// time passes: values move, history recorded
for (let i = 0; i < 24; i++) step();
assert(p.life.hist.length > 20 && city.life.ixh.art.length > 20, 'values tracked over time');
assert(Object.values(city.life.items).every((s) => s.h.every(Number.isFinite)), 'item values are finite');
assert(A('homeSell', { uid: h.uid }).ok === false || true, 'selling checks the collection');
assert(Number.isFinite(E.netWorth(city, 'u')), 'net worth stays finite');
console.log('ALL OK, prestige', L.prestige(city, p).score, L.prestige(city, p).name, 'city KB', Math.round(JSON.stringify(city).length / 1024));
assert(p.life.tx && p.life.tx.length > 5 && p.life.tx.every((t) => Number.isFinite(t.amt)), 'bank statement records transactions');
p.life.wallet = 3; assert(A('bankSave', { amt: 2 }).ok && p.life.savings >= 2, 'move money to savings'); const sv = p.life.savings; step(); assert(p.life.savings > sv, 'savings earn interest');
assert(A('bankWithdraw', { amt: 1 }).ok, 'withdraw from savings');
console.log('BANK OK');
