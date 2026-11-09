// Aurex Bay Tycoon — personal life.
// Your own wallet (separate from the empire), homes as investments, and collections of art, wine,
// watches and cars that gain or lose value over time. Collections and homes add up to Prestige,
// which gives perks back in the business game. Pure functions over the city object, like the engine.
import { HOMES, ROOMS, LIFESTYLES, SALARIES, TAX, LIFE, RARITY, PRESTIGE_TIERS, COLLECT_CATS, COLLECTIBLES, SETS, DINNER, VINTAGE, SIZES, CRAFT, CENTRAL, BANKS } from './content.js';

const r2 = (v) => Math.round(v * 100) / 100;
const r4 = (v) => Math.round(v * 10000) / 10000;
const rand = Math.random;
const pick = (a) => a[Math.floor(rand() * a.length)];
const ok = (msg, extra) => ({ ok: true, msg, ...(extra || {}) });
const err = (msg) => ({ ok: false, msg });
const CATS = ['art', 'wine', 'watch', 'car'];
export const HOME = Object.fromEntries(HOMES.map((h) => [h.id, h]));
export const ITEM = Object.fromEntries(COLLECTIBLES.map((c) => [c.id, c]));
// collectibles made by players' companies (vineyard wine, tuner cars) live in city.life.made and join the catalogue here (server and browser)
export function register(city) { if (city && city.life && city.life.made) Object.assign(ITEM, city.life.made); }
export const isMade = (c) => !!(c && c.lid);
let seq = 0;
// bank statement line for the personal account
export function tx(L, m, text, amt) { if (!L || !amt) return; (L.tx = L.tx || []).unshift({ m, text, amt: r4(amt), bal: r4(L.wallet) }); if (L.tx.length > 40) L.tx.length = 40; }
const uid = (p) => p + Date.now().toString(36).slice(-4) + (seq++).toString(36) + Math.random().toString(36).slice(2, 5);

// ---------------------------------------------------------------- state
export function ensure(city) {
  if (!city.life) {
    city.life = { ix: {}, ixh: {}, homes: {}, items: {}, lots: [], trades: [], dealer: [], dealerM: -99 };
    CATS.forEach((c) => { city.life.ix[c] = 1; city.life.ixh[c] = [1]; });
    HOMES.forEach((h) => { city.life.homes[h.id] = { ix: 1, h: [h.price] }; });
    COLLECTIBLES.forEach((c) => { city.life.items[c.id] = { f: r4(0.92 + rand() * 0.16), h: [] }; });
    COLLECTIBLES.forEach((c) => city.life.items[c.id].h.push(r4(itemValue(city, c.id))));
  }
  city.life.made = city.life.made || {}; register(city);
  Object.values(city.players).forEach((p) => ensurePlayer(city, p));
  if (!city.life.seeded) { seedBots(city); city.life.seeded = true; }
  if (!city.life.dealer.length) refreshDealer(city, city.m || 0);
  while (city.life.lots.filter((l) => !l.seller).length < 5 && addHouseLot(city, city.m || 0)) { /* fill the auction */ }
  return city.life;
}
export function ensurePlayer(city, p) {
  if (!p.life) p.life = { wallet: p.bot ? 3 + Math.round(rand() * 4) : LIFE.startWallet, salary: 0, style: 'modest', homes: [], res: null, items: [], legacy: 0, bank: null, offer: null, dinnerM: -1, ledger: [], hist: [], last: null };
  return p.life;
}

// ---------------------------------------------------------------- values
const gNow = (city) => city.m / 12;
function ageMult(c, g) {
  if (!c.peak) return (1 + 0.02 * g) / (1 + 0.02 * (c.g0 || 0)); // cars and the like gain slowly from when they were made
  if (c.peak >= 50) return 1 + 0.02 * g; // spirits just keep improving
  const f = (x) => (x <= c.peak ? 1 - 0.035 * (c.peak - x) : 1 - 0.07 * (x - c.peak));
  return Math.max(0.25, f(g)) / Math.max(0.25, f(c.g0 || 0)); // g0: when a player's vineyard bottled it
}
export function itemValue(city, cid, g = gNow(city)) {
  const c = ITEM[cid], st = city.life.items[cid];
  return c.v * city.life.ix[c.cat] * st.f * ageMult(c, g);
}
export function completeSets(p) {
  const own = new Set(p.life.items.map((i) => i.cid));
  return Object.keys(SETS).filter((s) => COLLECTIBLES.filter((c) => c.set === s).every((c) => own.has(c.id)));
}
export function instValue(city, p, it, sets) {
  const c = ITEM[it.cid], s = sets || completeSets(p);
  return itemValue(city, it.cid) * (c.set && s.includes(c.set) ? 1 + SETS[c.set].bonus : 1);
}
export function collectionValue(city, p, cat) {
  const s = completeSets(p);
  return p.life.items.filter((i) => !cat || ITEM[i.cid].cat === cat).reduce((a, i) => a + instValue(city, p, i, s), 0);
}
export function wineWindow(c, g) {
  if (!c.peak) return null; if (c.peak >= 50) return 'Keeps improving';
  const d = c.peak - g; return d > 0.5 ? `Peaks in about ${Math.round(d)} yr` : d > -1.5 ? 'At its peak now' : 'Past its peak';
}
export function homeValue(city, h) { const def = HOME[h.hid]; return def.price * city.life.homes[h.hid].ix + (h.improve || 0); }
export const unitsLeft = (city, hid) => HOME[hid].units - Object.values(city.players).reduce((a, p) => a + (p.life ? p.life.homes.filter((h) => h.hid === hid).length : 0), 0);
export const ownedCount = (city, cid) => Object.values(city.players).reduce((a, p) => a + (p.life ? p.life.items.filter((i) => i.cid === cid).length : 0), 0);
const onAuction = (city, cid) => city.life.lots.filter((l) => l.cid === cid && !l.seller).length;
// cases / cars still in the company's own cellar or garage (also the ones it has put up for auction)
export const inCellars = (city, cid) => (city.listings || []).reduce((a, l) => a + (l.cellar ? l.cellar.filter((x) => x.cid === cid).length : 0), 0);
export const available = (city, cid) => ITEM[cid].ed - ownedCount(city, cid) - onAuction(city, cid) - (isMade(ITEM[cid]) ? inCellars(city, cid) : 0);

export function roomLevel(h, room) { const def = HOME[h.hid].rooms[room]; if (!def) return -1; return h.rooms && h.rooms[room] != null ? h.rooms[room] : def.add ? 0 : 1; }
export function capacity(p, cat) {
  return p.life.homes.filter((h) => !h.rented).reduce((a, h) => { const lv = roomLevel(h, cat), def = HOME[h.hid].rooms[cat]; return a + (lv > 0 ? def.cap * lv : 0); }, 0);
}
export const used = (p, cat) => p.life.items.filter((i) => ITEM[i.cid].cat === cat && !i.lent).length;
export const roomFree = (p, cat) => capacity(p, cat) - used(p, cat);
export function roomCost(h, room) {
  const def = HOME[h.hid].rooms[room], lv = roomLevel(h, room);
  if (!def || lv >= 2) return null;
  return lv === 0 ? def.add : r2((def.add || HOME[h.hid].price * 0.03) * 1.5);
}

// ---------------------------------------------------------------- money
export function incomeTax(gross) {
  let tax = 0, prev = 0;
  for (const [top, rate] of TAX.brackets) { const part = Math.max(0, Math.min(gross, top) - prev); tax += part * rate; prev = top; if (gross <= top) break; }
  return tax;
}
// personal rates follow the economy and, in part, the Bank of Aurex bank rate (CENTRAL.start is the neutral point)
const cbShift = (city, k) => (city.cb ? (city.cb.rate - CENTRAL.start) * CENTRAL[k] : 0);
export function savingsRate(city) { return Math.max(0.25, ({ Boom: 3.5, Stable: 2.5, Recession: 1.5, Crisis: 1 }[city.econ] || 2.5) + cbShift(city, 'savings')); }
export function mortgageRate(city) { return Math.max(0.5, LIFE.mortgageBase + ({ Boom: 0.5, Stable: 0, Recession: -0.5, Crisis: 1 }[city.econ] || 0) + cbShift(city, 'mortgage')); }
// a home's mortgage rate: fixed by the bank that gave it, or (bank owners) the market mortgage rate
export const homeRate = (city, h) => (typeof h.rate === 'number' ? h.rate : mortgageRate(city));
function payment(bal, ratePct, monthsLeft) { const r = ratePct / 100 / 12; if (bal <= 0) return 0; if (monthsLeft <= 1) return bal * (1 + r); return bal * r / (1 - Math.pow(1 + r, -monthsLeft)); }
export function monthly(city, p) {
  const L = p.life, rate = mortgageRate(city), sets = completeSets(p);
  const salaryGross = L.salary / 12, tax = incomeTax(L.salary) / 12;
  let charges = 0, propTax = 0, upkeep = 0, rent = 0, interest = 0, principal = 0;
  L.homes.forEach((h) => {
    const v = homeValue(city, h), def = HOME[h.hid];
    charges += def.charges / 12; propTax += v * LIFE.propTax / 12; upkeep += v * LIFE.upkeep / 12;
    if (h.rented) rent += v * LIFE.rentYield / 12;
    if (h.bal > 0) { const hr = homeRate(city, h), left = Math.max(1, LIFE.mortgageYears * 12 - (city.m - h.boughtM)), pay = payment(h.bal, hr, left), i = h.bal * hr / 100 / 12; interest += i; principal += Math.min(h.bal, pay - i); }
  });
  const style = LIFESTYLES.find((s) => s.id === L.style) || LIFESTYLES[0];
  const lifestyle = L.res || L.homes.length ? style.cost / 12 : style.cost / 12 + 0.04 / 12; // no home: you rent a room
  let care = 0, lend = 0;
  L.items.forEach((i) => { const c = ITEM[i.cid], v = instValue(city, p, i, sets); if (i.lent) lend += v * LIFE.lendFee / 12; else care += v * COLLECT_CATS[c.cat].care / 12; });
  const overdraft = L.wallet < 0 ? -L.wallet * LIFE.overdraft / 12 : 0;
  const inflow = salaryGross - tax + rent + lend;
  const outflow = charges + propTax + upkeep + interest + principal + lifestyle + care + overdraft;
  return { salaryGross, tax, salaryNet: salaryGross - tax, rent, lend, charges, propTax, upkeep, interest, principal, lifestyle, care, overdraft, inflow, outflow, net: inflow - outflow, rate };
}
export function equity(city, p) { return p.life.homes.reduce((a, h) => a + homeValue(city, h) - (h.bal || 0), 0); }
export function netWorth(city, p) { if (!p.life) return 0; return p.life.wallet + (p.life.savings || 0) + equity(city, p) + collectionValue(city, p); }

// ---------------------------------------------------------------- prestige
export function prestige(city, p) {
  const L = p.life; if (!L) return { score: 0, tier: 0, name: PRESTIGE_TIERS[0].name, parts: {} };
  const sets = completeSets(p);
  const extra = (h) => Object.keys(h.rooms || {}).reduce((x, k) => { const d = HOME[h.hid].rooms[k]; return x + (d ? Math.max(0, h.rooms[k] - (d.add ? 0 : 1)) * 5 : 0); }, 0);
  const home = L.homes.reduce((a, h) => a + HOME[h.hid].prestige * (h.uid === L.res ? 1 : 0.5) + extra(h), 0);
  const items = L.items.reduce((a, i) => { const c = ITEM[i.cid]; return a + (RARITY[c.rarity].pts + Math.sqrt(Math.max(0, instValue(city, p, i, sets))) * 10) * (i.lent ? 1.5 : 1); }, 0);
  const setPts = sets.reduce((a, s) => a + SETS[s].prestige, 0);
  const style = (LIFESTYLES.find((s) => s.id === L.style) || LIFESTYLES[0]).prestige;
  const score = Math.round(home + items + setPts + style + (L.legacy || 0));
  let tier = 0; PRESTIGE_TIERS.forEach((t, i) => { if (score >= t.min) tier = i; });
  const next = PRESTIGE_TIERS[tier + 1];
  return { score, tier, name: PRESTIGE_TIERS[tier].name, next: next ? next.min : null, nextName: next ? next.name : null, parts: { home: Math.round(home), items: Math.round(items), sets: setPts, lifestyle: style, legacy: Math.round(L.legacy || 0) }, sets };
}
export const tierOf = (city, p) => (p && p.life ? prestige(city, p).tier : 0);
export function bankCut(city, p) { const b = p.life && p.life.bank; return b && b.until >= city.m ? b.cut : 0; }

// ---------------------------------------------------------------- market: dealer and auction house
function refreshDealer(city, m) {
  const pool = COLLECTIBLES.filter((c) => (c.rarity === 'Common' || c.rarity === 'Rare') && available(city, c.id) > 0).sort(() => rand() - 0.5);
  // each dealer in town (gallery, wine merchant, watch boutique, car showroom) keeps up to three pieces
  city.life.dealer = CATS.flatMap((cat) => pool.filter((c) => c.cat === cat).slice(0, 3).map((c) => c.id)); city.life.dealerM = m;
  // the wine merchant also stocks cases that local vineyards sold to it
  Object.values(city.life.made || {}).filter((c) => available(city, c.id) > 0).sort(() => rand() - 0.5).slice(0, 3).forEach((c) => city.life.dealer.push(c.id));
}
function toDealer(city, cid) { if (!city.life.dealer.includes(cid)) city.life.dealer.push(cid); }
const LOT_W = { Common: 4, Rare: 3, Epic: 1.5, Legendary: 0.7 };
export const lotTier = (c) => (c.rarity === 'Legendary' ? 3 : c.rarity === 'Epic' ? 1 : 0);
function addHouseLot(city, m) {
  const pool = COLLECTIBLES.filter((c) => available(city, c.id) > 0 && !city.life.lots.some((l) => l.cid === c.id));
  if (!pool.length) return false;
  let t = pool.reduce((a, c) => a + LOT_W[c.rarity], 0) * rand(), c = pool[0];
  for (const x of pool) { t -= LOT_W[x.rarity]; if (t <= 0) { c = x; break; } }
  city.life.lots.push({ id: uid('lot'), cid: c.id, est: r4(itemValue(city, c.id)), endM: m + 1 + (rand() < 0.4 ? 1 : 0), bids: {}, seller: null, uid: null, tier: lotTier(c) });
  return true;
}
function resolveLot(city, lot, m, ctx) {
  const c = ITEM[lot.cid], val = itemValue(city, lot.cid), reserve = lot.est * LIFE.reserve;
  const bids = [];
  Object.entries(lot.bids).forEach(([pid, amt]) => { const p = city.players[pid]; if (!p || pid === lot.seller) return; bids.push({ pid, amt, human: !p.bot }); });
  const bots = Object.values(city.players).filter((p) => p.bot && p.id !== lot.seller);
  if (lot.high && city.players[lot.hb]) bids.push({ pid: lot.hb, amt: lot.high, human: false });
  // a late bidder may still turn up when the hammer falls
  const late = lot.high ? (rand() < 0.25 ? 1 : 0) : Math.floor(rand() * 3.2) + (c.rarity === 'Legendary' ? 1 : 0);
  bots.filter((b) => b.id !== lot.hb && !(ctx.botFriend && Object.keys(lot.bids).some((pid) => ctx.botFriend(city, b.id, pid)))).sort(() => rand() - 0.5).slice(0, late).forEach((b) => bids.push({ pid: b.id, amt: r4(val * (0.8 + rand() * 0.4)), human: false }));
  bids.sort((a, b) => b.amt - a.amt);
  let winner = null, price = 0;
  for (let i = 0; i < bids.length; i++) {
    const b = bids[i]; if (b.amt < reserve) break;
    const second = bids.slice(i + 1).find((x) => x.pid !== b.pid);
    const pr = Math.min(b.amt, Math.max(reserve, second ? second.amt * 1.02 : reserve));
    const p = city.players[b.pid];
    if (b.human) {
      const cost = pr * (1 + LIFE.auctionPremium);
      if (p.life.wallet < cost) { ctx.feed(p, m, `Your bid on ${c.name} was void`, `You needed ${r2(cost)} M on your account when the hammer fell.`, 'bad'); continue; }
      if (roomFree(p, c.cat) < 1) { ctx.feed(p, m, `No room for ${c.name}`, `You won the lot but have no free ${ROOMS[c.cat].unit}. The house sold it to the next bidder.`, 'bad'); continue; }
    }
    winner = b; price = pr; break;
  }
  const estate = lot.lid ? (city.listings || []).find((x) => x.id === lot.lid) : null, cs = estate && (estate.cellar || []).find((x) => x.uid === lot.uid);
  const sellerP = lot.seller && !lot.lid ? city.players[lot.seller] : null;
  if (!winner) {
    if (cs) { delete cs.lot; ctx.notify(city, estate, `${c.name} did not sell`, `No bid reached the reserve. The ${craftOf(estate).words.unit} is back in the ${craftOf(estate).words.store}.`, 'info'); }
    if (sellerP) { const it = sellerP.life.items.find((i) => i.uid === lot.uid); if (it) delete it.lot; if (!sellerP.bot) ctx.feed(sellerP, m, `${c.name} did not sell`, 'No bid reached the reserve. The piece is back in your home.', 'info'); }
    Object.keys(lot.bids).forEach((pid) => { const p = city.players[pid]; if (p && !p.bot) ctx.feed(p, m, `${c.name} went unsold`, 'Nobody reached the reserve price.', 'info'); });
    return;
  }
  const buyer = city.players[winner.pid];
  if (ctx.auctionDone) ctx.auctionDone(city, c.name, buyer.id, Object.keys(lot.bids).filter((pid) => city.players[pid] && !city.players[pid].bot && pid !== lot.seller), [...new Set(bids.filter((x) => !x.human).map((x) => x.pid))]);
  buyer.life.wallet -= price * (1 + LIFE.auctionPremium); tx(buyer.life, m, `Aurex & Co. · ${c.name}`, -price * (1 + LIFE.auctionPremium));
  let it;
  if (lot.lid) {
    if (estate && cs) { estate.cellar = estate.cellar.filter((x) => x !== cs); ctx.credit(city, estate.owner, price * (1 - LIFE.sellerFee)); ctx.notify(city, estate, `Sold at auction: ${c.name}`, `Hammer price ${r4(price)} M. ${r4(price * (1 - LIFE.sellerFee))} M goes to the company after the house fee.`, 'good'); }
    it = { uid: uid('i'), cid: lot.cid };
  } else if (sellerP) {
    const ix = sellerP.life.items.findIndex((i) => i.uid === lot.uid);
    it = ix >= 0 ? sellerP.life.items.splice(ix, 1)[0] : { uid: uid('i'), cid: lot.cid };
    sellerP.life.wallet += price * (1 - LIFE.sellerFee); tx(sellerP.life, m, `Aurex & Co. sale · ${c.name}`, price * (1 - LIFE.sellerFee));
    if (!sellerP.bot) ctx.feed(sellerP, m, `Sold at auction: ${c.name}`, `Hammer price ${r2(price)} M. You receive ${r2(price * (1 - LIFE.sellerFee))} M after the house fee.`, 'good');
  } else it = { uid: uid('i'), cid: lot.cid };
  delete it.lot; it.lent = false; it.m = m; it.cost = r4(price * (1 + LIFE.auctionPremium));
  buyer.life.items.push(it);
  if (!buyer.bot && buyer.career) buyer.career.st.won = (buyer.career.st.won || 0) + 1;
  if (!buyer.bot) ctx.feed(buyer, m, `You won ${c.name}`, `Hammer price ${r2(price)} M plus the ${Math.round(LIFE.auctionPremium * 100)}% buyer's premium.`, 'good');
  Object.keys(lot.bids).forEach((pid) => { const p = city.players[pid]; if (p && !p.bot && pid !== winner.pid) ctx.feed(p, m, `Outbid on ${c.name}`, `It went to ${buyer.name} for ${r2(price)} M.`, 'info'); });
  (city.life.sold = city.life.sold || []).unshift({ cid: lot.cid, price: r4(price), buyer: buyer.id, seller: lot.seller || null, m }); if (city.life.sold.length > 16) city.life.sold.length = 16;
  if (c.rarity === 'Legendary' || c.rarity === 'Epic') ctx.news(city, m, `${c.name} sold for ${r2(price)} M`, `${buyer.name} wins the ${c.rarity.toLowerCase()} ${c.cat === 'art' ? 'work' : c.cat} at the Aurex Bay auction house.`, 'info');
}

// ---------------------------------------------------------------- bots
function seedBots(city) {
  const bots = Object.values(city.players).filter((p) => p.bot);
  bots.forEach((b, i) => {
    const L = ensurePlayer(city, b), hid = ['H4', 'H1', 'H3', 'H5', 'H1', 'H2', 'H1', 'H2', 'H5'][i % 9];
    if (unitsLeft(city, hid) > 0) { L.homes.push({ uid: uid('h'), hid, boughtM: 0, paid: HOME[hid].price, bal: HOME[hid].price * 0.5, rented: false, rooms: {}, improve: 0 }); L.res = L.homes[0].uid; }
    const n = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const pool = COLLECTIBLES.filter((c) => c.rarity !== 'Legendary' && available(city, c.id) > 0);
      if (!pool.length) break; const c = pick(pool);
      L.items.push({ uid: uid('i'), cid: c.id, m: 0, cost: r4(c.v), lent: false });
    }
  });
}
function botMonthly(city, b, m) {
  const L = b.life; L.wallet += 0.08; // bots draw a steady salary
  if (rand() < 0.08 && city.life.dealer.length) { const cid = pick(city.life.dealer); if (available(city, cid) > 0) { L.items.push({ uid: uid('i'), cid, m, cost: r4(itemValue(city, cid) * LIFE.dealerMarkup), lent: false }); city.life.dealer = city.life.dealer.filter((x) => x !== cid); } }
  if (rand() < 0.06) { const it = L.items.find((i) => !i.lot); if (it) { it.lot = uid('lot'); city.life.lots.push({ id: it.lot, cid: it.cid, est: r4(itemValue(city, it.cid)), endM: m + 2, bids: {}, seller: b.id, uid: it.uid, tier: lotTier(ITEM[it.cid]) }); } }
}

// ---------------------------------------------------------------- month
// weekly: rivals raise their bids, and you hear about it when they pass yours
export function weekStep(city, wk, ctx) {
  ensure(city); const m = city.m;
  city.life.lots.forEach((lot) => {
    if (rand() > 0.55) return;
    const val = itemValue(city, lot.cid), c = ITEM[lot.cid];
    const bots = Object.values(city.players).filter((p) => p.bot && p.id !== lot.seller); if (!bots.length) return;
    const cur = lot.high || lot.est * LIFE.reserve * 0.95, cap = val * (1.05 + rand() * 0.25), next = r4(cur * (1.04 + rand() * 0.08));
    if (next > cap) return;
    // rivals (bots.js) pick who raises: friends of a bidding player stay out, rivals go after your lots
    const who = ctx.auctionBidder ? ctx.auctionBidder(city, lot, bots, val) : { b: pick(bots), cap };
    if (!who || next > who.cap) return;
    const b = who.b; lot.high = next; lot.hb = b.id; lot.out = lot.out || {};
    Object.entries(lot.bids).forEach(([pid, amt]) => {
      const p = city.players[pid]; if (!p || p.bot || amt >= next || lot.out[pid]) return;
      lot.out[pid] = true; ctx.feed(p, m, `Outbid on ${c.name}`, `${b.name} bids ${r2(next)} M. Raise your bid before the hammer falls.`, 'bad');
    });
  });
  // the dealer sometimes gets a fresh piece in
  if (rand() < 0.15) { const pool = COLLECTIBLES.filter((x) => (x.rarity === 'Common' || x.rarity === 'Rare') && available(city, x.id) > 0 && !city.life.dealer.includes(x.id)); if (pool.length) { city.life.dealer.push(pick(pool).id); if (city.life.dealer.length > 12) city.life.dealer.shift(); } }
}
export function monthStep(city, m, ctx) {
  ensure(city);
  const econ = city.econ || 'Stable';
  CATS.forEach((cat) => { const d = COLLECT_CATS[cat]; city.life.ix[cat] = r4(Math.max(0.3, city.life.ix[cat] * (1 + d.drift[econ] / 12 + (rand() - 0.5) * 2 * d.noise))); const h = city.life.ixh[cat]; h.push(city.life.ix[cat]); if (h.length > 130) h.shift(); });
  const econH = { Boom: 0.05, Stable: 0.01, Recession: -0.04, Crisis: -0.1 }[econ];
  HOMES.forEach((def) => { const st = city.life.homes[def.id]; st.ix = r4(Math.max(0.4, st.ix * (1 + (def.growth + econH) / 12 + (rand() - 0.5) * 0.02))); st.h.push(r2(def.price * st.ix)); if (st.h.length > 130) st.h.shift(); });
  COLLECTIBLES.concat(Object.values(city.life.made || {})).forEach((c) => { const st = city.life.items[c.id]; if (!st) return; st.f = r4(Math.max(0.4, st.f * (1 + RARITY[c.rarity].drift / 12 + (rand() - 0.5) * 0.02))); st.h.push(r4(itemValue(city, c.id, m / 12))); if (st.h.length > 60) st.h.shift(); });
  // a vintage that has all been drunk or donated is gone from the market
  Object.values(city.life.made || {}).forEach((c) => { if (c.ed <= 0) { delete city.life.made[c.id]; delete city.life.items[c.id]; city.life.dealer = city.life.dealer.filter((x) => x !== c.id); } });
  // auctions close, new lots arrive
  const due = city.life.lots.filter((l) => l.endM <= m); city.life.lots = city.life.lots.filter((l) => l.endM > m);
  due.forEach((l) => resolveLot(city, l, m, ctx));
  while (city.life.lots.filter((l) => !l.seller).length < 5 && addHouseLot(city, m)) { /* refill */ }
  if (m - city.life.dealerM >= 3) refreshDealer(city, m);
  city.life.trades.forEach((t) => { if (t.status === 'open' && m - t.m >= 3) t.status = 'expired'; });
  city.life.trades = city.life.trades.filter((t) => t.status === 'open' || m - t.m < 6);
  Object.values(city.players).forEach((p) => {
    const L = ensurePlayer(city, p);
    if (p.bot) { botMonthly(city, p, m); return; }
    const b = monthly(city, p);
    if (L.savings > 0) { const i = L.savings * savingsRate(city) / 100 / 12; L.savings = r4(L.savings + i); (L.tx = L.tx || []).unshift({ m, text: 'Savings interest', amt: r4(i), bal: r4(L.wallet), sav: true }); }
    L.wallet += b.salaryNet; tx(L, m, 'Salary after tax', b.salaryNet);
    if (b.rent) { L.wallet += b.rent; tx(L, m, 'Rent from tenants', b.rent); }
    if (b.lend) { L.wallet += b.lend; tx(L, m, 'Aurex Bay Museum · loan fees', b.lend); }
    const housing = b.charges + b.propTax + b.upkeep; if (housing) { L.wallet -= housing; tx(L, m, 'Building charges, property tax and upkeep', -housing); }
    if (b.interest + b.principal) { L.wallet -= b.interest + b.principal; tx(L, m, 'Mortgage payment', -(b.interest + b.principal)); }
    L.wallet -= b.lifestyle; tx(L, m, 'Living costs', -b.lifestyle);
    if (b.care) { L.wallet -= b.care; tx(L, m, 'Collection insurance and upkeep', -b.care); }
    if (b.overdraft) { L.wallet -= b.overdraft; tx(L, m, 'Overdraft interest', -b.overdraft); }
    L.homes.forEach((h) => { if (h.bal > 0) { const hr = homeRate(city, h), left = Math.max(1, LIFE.mortgageYears * 12 - (m - h.boughtM)), pay = payment(h.bal, hr, left), i = h.bal * hr / 100 / 12; if (ctx.mortPaid) ctx.mortPaid(city, h, i); h.bal = Math.max(0, r4(h.bal - (pay - i))); } });
    if (L.offer && L.offer.until < m) L.offer = null;
    // a negative wallet is covered by a dividend from your empire, if it can afford it
    if (L.wallet < -0.25 && p.cash > 1) {
      const need = -L.wallet + 0.1, gross = Math.min(p.cash - 0.5, need / (1 - TAX.dividend));
      if (gross > 0) { p.cash -= gross; L.wallet += gross * (1 - TAX.dividend); tx(L, m, 'Automatic dividend from your empire (after tax)', gross * (1 - TAX.dividend)); ctx.feed(p, m, 'Your account went into overdraft', `${r2(gross)} M was paid out from your empire as a dividend (${Math.round(TAX.dividend * 100)}% tax) to cover it.`, 'bad'); }
    }
    // months in the red with a mortgage: the bank forecloses on the home with the biggest loan and sells it at auction
    L.arr = L.wallet < -0.25 && L.homes.some((h) => h.bal > 0) ? (L.arr || 0) + 1 : 0;
    if (L.arr >= BANKS.arrears) { L.arr = 0; foreclose(city, p, L.homes.filter((h) => h.bal > 0).sort((a, c) => c.bal - a.bal)[0], ctx); }
    L.last = Object.fromEntries(Object.entries(b).map(([k, v]) => [k, r4(v)]));
    L.ledger.push({ m, in: r4(b.inflow), out: r4(b.outflow) }); if (L.ledger.length > 24) L.ledger.shift();
    L.hist.push([m, r2(L.wallet), r2(equity(city, p)), r2(collectionValue(city, p))]); if (L.hist.length > 130) L.hist.shift();
  });
}

// the bank sells a home whose owner stopped paying: it is paid first, the rest goes to the wallet
function foreclose(city, p, h, ctx) {
  const L = p.life, def = HOME[h.hid], got = r4(homeValue(city, h) * BANKS.foreclose), back = r4(Math.max(0, got - h.bal));
  if (ctx.foreclosed) ctx.foreclosed(city, p, h, got);
  L.wallet += back; tx(L, city.m, `Foreclosure auction · ${def.name}`, back);
  L.homes = L.homes.filter((x) => x !== h); if (L.res === h.uid) L.res = (L.homes.find((x) => !x.rented) || {}).uid || null;
  ctx.feed(p, city.m, `Your home at ${def.name} was sold at a foreclosure auction`, `You missed your mortgage payments for ${BANKS.arrears} months. It sold for ${r2(got)} M; after the ${r2(h.bal)} M loan, ${r2(back)} M went to your account.`, 'bad');
  ctx.news(city, city.m, `Foreclosure auction in ${def.district}`, `${p.name}'s home at ${def.name} went under the hammer for ${r2(got)} M.`, 'bad');
}

// ---------------------------------------------------------------- actions
const findItem = (p, id) => p.life.items.find((i) => i.uid === id);
const findHome = (p, id) => p.life.homes.find((h) => h.uid === id);
function canMove(p, it) { return !!it && !it.lot; }
function hasRoomAfter(p, homeUid, rent) {
  // would the collection still fit if this home were sold (rent=false) or rented out (rent=true)?
  const h = findHome(p, homeUid), saved = h.rented; h.rented = true;
  const fit = CATS.every((cat) => used(p, cat) <= capacity(p, cat)); h.rented = saved; return fit;
}
export function act(city, p, action, a, ctx) {
  ensure(city); const L = ensurePlayer(city, p), m = city.m;
  switch (action) {
    case 'lifeSalary': { const v = Number(a.v); if (!SALARIES.includes(v)) return err('Pick one of the salary levels.'); L.salary = v; return ok(v ? `Salary set to ${v} M a year. After tax you keep ${r2(v - incomeTax(v))} M.` : 'You take no salary. Your empire keeps the cash.'); }
    case 'lifeStyle': { const s = LIFESTYLES.find((x) => x.id === a.id); if (!s) return err('Unknown lifestyle.'); L.style = s.id; return ok(`Lifestyle: ${s.name}.`); }
    case 'lifeDividend': { const amt = r2(Number(a.amt) || 0); if (amt <= 0) return err('Choose an amount.'); if (p.cash < amt) return err('Your empire does not have that much cash.'); p.cash -= amt; const net = amt * (1 - TAX.dividend); L.wallet += net; tx(L, m, 'Dividend from your empire (after tax)', net); return ok(`Paid out ${amt} M. After ${Math.round(TAX.dividend * 100)}% tax, ${r2(net)} M lands on your account.`); }
    case 'bankSave': { const amt = r4(Number(a.amt) || 0); if (amt <= 0 || L.wallet < amt) return err('Not enough on your current account.'); L.wallet -= amt; L.savings = r4((L.savings || 0) + amt); tx(L, m, 'Transfer to savings', -amt); return ok(`Moved ${r2(amt)} M to savings at ${savingsRate(city).toFixed(1)}%.`); }
    case 'bankWithdraw': { const amt = r4(Math.min(Number(a.amt) || 0, L.savings || 0)); if (amt <= 0) return err('Nothing on your savings account.'); L.savings = r4(L.savings - amt); L.wallet += amt; tx(L, m, 'Transfer from savings', amt); return ok(`Moved ${r2(amt)} M to your current account.`); }
    case 'lifeInvest': { const amt = r2(Number(a.amt) || 0); if (amt <= 0 || L.wallet < amt) return err('Not enough on your account.'); L.wallet -= amt; p.cash += amt; tx(L, m, 'Transfer to your empire', -amt); return ok(`Moved ${amt} M into your empire.`); }
    case 'homeBuy': {
      const def = HOME[a.hid]; if (!def) return err('Unknown home.'); if (unitsLeft(city, a.hid) < 1) return err('No units left in this building.');
      const price = r2(def.price * city.life.homes[a.hid].ix), down = Math.min(1, Math.max(LIFE.downMin, Number(a.down) || LIFE.downMin));
      const cash = r2(price * down + price * LIFE.closing), bal = r4(price * (1 - down));
      if (L.wallet < cash) return err(`You need ${cash} M on your account: ${Math.round(down * 100)}% down plus ${Math.round(LIFE.closing * 100)}% closing costs.`);
      const mo = bal > 0 && ctx.mortgage ? ctx.mortgage(city, p, bal, a.bank || null) : { ok: true, bank: null, rate: null }; if (!mo.ok) return mo;
      L.wallet -= cash; tx(L, m, `${def.name} · down payment and fees`, -cash);
      const h = { uid: uid('h'), hid: a.hid, boughtM: m, paid: price, bal, rented: false, rooms: {}, improve: 0, ...(mo.bank ? { bank: mo.bank } : {}), ...(typeof mo.rate === 'number' ? { rate: mo.rate } : {}) };
      L.homes.push(h); if (!L.res) L.res = h.uid;
      ctx.news(city, m, `${p.name} buys a home in ${def.district}`, `${def.name}, ${r2(price)} M.`, 'info');
      return ok(L.res === h.uid ? `Welcome home. You moved into ${def.name}.` : `You bought ${def.name}. Rent it out or make it your home.`, { uid: h.uid });
    }
    case 'homeSell': {
      const h = findHome(p, a.uid); if (!h) return err('Not your home.');
      if (!hasRoomAfter(p, h.uid, false)) return err('Your collection would have nowhere to go. Sell or move pieces first.');
      const v = homeValue(city, h), net = v * (1 - LIFE.sellFee) - (h.bal || 0);
      L.wallet += net; tx(L, m, `Sale of ${HOME[h.hid].name}`, net); L.homes = L.homes.filter((x) => x !== h); if (L.res === h.uid) L.res = (L.homes.find((x) => !x.rented) || {}).uid || null;
      return ok(`Sold for ${r2(v)} M. After the agent fee and paying off the mortgage, ${r2(net)} M goes to your wallet.`);
    }
    case 'homeRoom': {
      const h = findHome(p, a.uid); if (!h) return err('Not your home.'); const def = HOME[h.hid].rooms[a.room];
      if (!def) return err(a.room === 'car' ? (HOME[h.hid].noCar || 'This home has no garage.') : 'This home has no space for that.');
      const cost = roomCost(h, a.room); if (cost == null) return err('This room is fully built.');
      if (L.wallet < cost) return err(`You need ${cost} M on your account.`);
      L.wallet -= cost; tx(L, m, `${ROOMS[a.room].install} · ${HOME[h.hid].name}`, -cost); h.rooms[a.room] = roomLevel(h, a.room) + 1; h.improve = r4((h.improve || 0) + cost * 0.6);
      return ok(h.rooms[a.room] === 1 ? `${ROOMS[a.room].install} installed. Room for ${def.cap} ${ROOMS[a.room].unit}.` : `${ROOMS[a.room].name} expanded to ${def.cap * 2} ${ROOMS[a.room].unit}.`);
    }
    case 'homeRent': {
      const h = findHome(p, a.uid); if (!h) return err('Not your home.');
      if (!h.rented) { if (L.res === h.uid) return err('You live here. Move to another home first.'); if (!hasRoomAfter(p, h.uid, true)) return err('Your collection is stored here. Make room elsewhere first.'); h.rented = true; return ok(`Rented out. About ${r2(homeValue(city, h) * LIFE.rentYield)} M a year in rent.`); }
      h.rented = false; return ok('The tenants have moved out.');
    }
    case 'homeMove': { const h = findHome(p, a.uid); if (!h) return err('Not your home.'); h.rented = false; L.res = h.uid; return ok(`You live in ${HOME[h.hid].name} now.`); }
    case 'homeRepay': { const h = findHome(p, a.uid); if (!h || !h.bal) return err('No mortgage on this home.'); const amt = Math.min(h.bal, Number(a.amt) || h.bal, L.wallet); if (amt <= 0) return err('Not enough on your account.'); L.wallet -= amt; h.bal = r4(h.bal - amt); tx(L, m, `Extra mortgage repayment · ${HOME[h.hid].name}`, -amt); return ok(h.bal <= 0.0001 ? 'Mortgage paid off. The home is all yours.' : `Paid ${r2(amt)} M off the mortgage.`); }
    case 'itemBuy': {
      const c = ITEM[a.cid]; if (!c || !city.life.dealer.includes(a.cid)) return err('The dealer no longer has this piece.');
      if (available(city, a.cid) < 1) return err('Sold out.'); if (roomFree(p, c.cat) < 1) return err(roomMsg(p, c.cat));
      const price = r4(itemValue(city, a.cid) * LIFE.dealerMarkup); if (L.wallet < price) return err(`You need ${r2(price)} M on your account.`);
      L.wallet -= price; tx(L, m, `Dealer · ${c.name}`, -price); L.items.push({ uid: uid('i'), cid: a.cid, m, cost: price, lent: false });
      if (available(city, a.cid) < 1) city.life.dealer = city.life.dealer.filter((x) => x !== a.cid);
      return ok(`${c.name} is yours.`);
    }
    case 'lifeOffer': {
      const o = L.offer; if (!o || o.until < m) return err('The offer has expired.'); const c = ITEM[o.cid];
      if (available(city, o.cid) < 1) { L.offer = null; return err('Someone else bought it first.'); }
      if (roomFree(p, c.cat) < 1) return err(roomMsg(p, c.cat)); if (L.wallet < o.price) return err(`You need ${r2(o.price)} M on your account.`);
      L.wallet -= o.price; tx(L, m, `Private sale · ${c.name}`, -o.price); L.items.push({ uid: uid('i'), cid: o.cid, m, cost: o.price, lent: false }); L.offer = null; return ok(`Private sale closed. ${c.name} is yours.`);
    }
    case 'bid': {
      const lot = city.life.lots.find((l) => l.id === a.lot); if (!lot) return err('This auction has closed.'); const c = ITEM[lot.cid];
      if (lot.seller === p.id) return err('You cannot bid on your own lot.');
      const t = prestige(city, p).tier; if (t < lot.tier) return err(`This lot is for ${PRESTIGE_TIERS[lot.tier].name} collectors and above.`);
      const amt = r4(Number(a.amt) || 0); if (amt < lot.est * LIFE.reserve) return err(`The reserve is ${r2(lot.est * LIFE.reserve)} M.`);
      if (lot.high && amt <= lot.high) return err(`The highest bid is ${r2(lot.high)} M. Bid more than that.`);
      if (L.wallet < amt * (1 + LIFE.auctionPremium)) return err(`Keep ${r2(amt * (1 + LIFE.auctionPremium))} M on your account to cover the bid and the buyer's premium.`);
      if (roomFree(p, c.cat) < 1) return err(roomMsg(p, c.cat));
      lot.bids[p.id] = amt; if (lot.out) delete lot.out[p.id]; return ok(`Bid placed: up to ${r2(amt)} M. The hammer falls ${lot.endM - m <= 1 ? 'at the end of the month' : 'in two months'}.`);
    }
    case 'bidCancel': { const lot = city.life.lots.find((l) => l.id === a.lot); if (lot) delete lot.bids[p.id]; return ok('Bid withdrawn.'); }
    case 'itemSell': {
      const it = findItem(p, a.uid); if (!canMove(p, it)) return err('This piece is already up for auction.'); const c = ITEM[it.cid], v = instValue(city, p, it);
      if (a.how === 'auction') { it.lot = uid('lot'); it.lent = false; city.life.lots.push({ id: it.lot, cid: it.cid, est: r4(v), endM: m + 1, bids: {}, seller: p.id, uid: it.uid, tier: lotTier(c) }); return ok(`${c.name} goes under the hammer at the end of the month. Estimate ${r2(v)} M.`); }
      const price = v * LIFE.dealerBuyback; L.wallet += price; tx(L, m, `Sold to dealer · ${c.name}`, price); L.items = L.items.filter((x) => x !== it); if (isMade(c)) toDealer(city, it.cid); return ok(`Sold to the dealer for ${r2(price)} M.`);
    }
    case 'itemWithdraw': { const it = findItem(p, a.uid); if (!it || !it.lot) return err('Not on auction.'); city.life.lots = city.life.lots.filter((l) => l.id !== it.lot); delete it.lot; return ok('Withdrawn from the auction.'); }
    case 'itemLend': { const it = findItem(p, a.uid); if (!canMove(p, it)) return err('Not available.'); const c = ITEM[it.cid]; if (c.cat !== 'art') return err('Only art can be lent to the museum.'); if (it.lent && roomFree(p, 'art') < 1) return err('No free wall to bring it home to.'); it.lent = !it.lent; return ok(it.lent ? `${c.name} now hangs in the Aurex Bay Museum. It frees a wall, earns a fee and adds prestige.` : `${c.name} is back on your wall.`); }
    case 'itemGift': {
      const it = findItem(p, a.uid), to = city.players[a.to]; if (!canMove(p, it)) return err('Not available.'); if (!to || to.id === p.id) return err('Pick someone to give it to.');
      const c = ITEM[it.cid]; ensurePlayer(city, to); if (!to.bot && roomFree(to, c.cat) < 1) return err(`${to.name} has no room for it.`);
      L.items = L.items.filter((x) => x !== it); it.lent = false; to.life.items.push({ ...it, m, cost: 0 }); L.legacy = (L.legacy || 0) + RARITY[c.rarity].pts * 0.5;
      ctx.feed(to, m, `${p.name} gave you ${c.name}`, 'A gift for your collection.', 'good');
      return ok(`You gave ${c.name} to ${to.name}. Generosity adds a little prestige.`);
    }
    case 'itemDonate': {
      const it = findItem(p, a.uid); if (!canMove(p, it)) return err('Not available.'); const c = ITEM[it.cid], v = instValue(city, p, it), credit = v * TAX.donationCredit;
      L.items = L.items.filter((x) => x !== it); if (isMade(c)) c.ed -= 1; L.wallet += credit; tx(L, m, `Tax credit · donation of ${c.name}`, credit); L.legacy = (L.legacy || 0) + RARITY[c.rarity].pts * 2 + 5;
      ctx.news(city, m, `${p.name} donates ${c.name}`, 'The piece joins the permanent collection of the Aurex Bay Museum.', 'good');
      return ok(`Donated. You get a ${r2(credit)} M tax credit and lasting prestige.`);
    }
    case 'itemCellar': {
      // a case of wine in your vineyard's cellar or a tuner car in your workshop garage: sell it to the dealer, auction it, or take it home
      const l = (city.listings || []).find((x) => x.id === a.lid); if (!l || !ctx.canRun || !ctx.canRun(l)) return err('This is not your company.');
      const w = craftOf(l).words;
      const cs = (l.cellar || []).find((x) => x.uid === a.uid); if (!cs) return err(`That ${w.unit} is no longer in the ${w.store}.`);
      const c = ITEM[cs.cid], v = itemValue(city, cs.cid);
      if (a.how === 'withdraw') { if (!cs.lot) return err('Not at auction.'); city.life.lots = city.life.lots.filter((x) => x.id !== cs.lot); delete cs.lot; return ok(`Withdrawn from the auction. The ${w.unit} is back in the ${w.store}.`); }
      if (cs.lot) return err(`This ${w.unit} is up for auction.`);
      if (a.how === 'auction') { cs.lot = uid('lot'); city.life.lots.push({ id: cs.lot, cid: cs.cid, est: r4(v), endM: m + 1, bids: {}, seller: p.id, uid: cs.uid, lid: l.id, tier: lotTier(c) }); return ok(`${c.name} goes under the hammer at Aurex & Co. at the end of the month. Estimate ${r4(v)} M. The money goes to the company.`); }
      if (a.how === 'take') {
        if (l.owner.k !== 'p') return err(`A ${w.item} from a co-owned company stays with the company. Sell it instead.`);
        if (roomFree(p, c.cat) < 1) return err(roomMsg(p, c.cat));
        l.cellar = l.cellar.filter((x) => x !== cs); L.items.push({ uid: cs.uid, cid: cs.cid, m, cost: 0, lent: false });
        return ok(`${c.name} is in your ${w.home} now. Keep it, trade it with other players or give it away${c.cat === 'wine' ? ' or serve it at a dinner' : ''}.`);
      }
      const all = a.all ? l.cellar.filter((x) => x.cid === cs.cid && !x.lot) : [cs], price = r4(v * LIFE.dealerBuyback * all.length);
      l.cellar = l.cellar.filter((x) => !all.includes(x)); ctx.credit(city, l.owner, price); toDealer(city, cs.cid);
      return ok(`Sold ${all.length > 1 ? `${all.length} ${w.units}` : `the ${w.unit}`} to ${w.dealer} for ${r4(price)} M. The money goes to the company.`);
    }
    case 'tradePropose': {
      const to = city.players[a.to]; if (!to || to.id === p.id) return err('Pick a player.'); ensurePlayer(city, to);
      const give = (a.give || []).map((id) => findItem(p, id)), get = (a.get || []).map((id) => findItem(to, id)), cash = r4(Number(a.cash) || 0);
      if (give.some((x) => !canMove(p, x)) || get.some((x) => !canMove(to, x))) return err('One of the pieces is no longer available.');
      if (!give.length && !get.length) return err('Add at least one piece.');
      const t = { id: uid('t'), from: p.id, to: to.id, give: give.map((x) => x.uid), get: get.map((x) => x.uid), cash, m, status: 'open' };
      if (to.bot) {
        const val = (pl, its) => its.reduce((s, x) => s + instValue(city, pl, x), 0);
        const botGets = val(p, give) + cash, botGives = val(to, get);
        if (botGets >= botGives * 1.05 && botGets > 0) { const r = settleTrade(city, t, ctx); if (!r.ok) return r; return ok(`${to.name} accepted the trade.`); }
        return err(`${to.name} declines. They want about ${r2(Math.max(0, botGives * 1.05 - val(p, give)))} M more in value.`);
      }
      city.life.trades.push(t); ctx.feed(to, m, `${p.name} proposes a trade`, 'Open your Personal tab to answer.', 'info');
      return ok(`Trade proposal sent to ${to.name}.`);
    }
    case 'tradeAccept': { const t = city.life.trades.find((x) => x.id === a.id && x.to === p.id && x.status === 'open'); if (!t) return err('No open trade.'); return settleTrade(city, t, ctx); }
    case 'tradeDecline': { const t = city.life.trades.find((x) => x.id === a.id && (x.to === p.id || x.from === p.id) && x.status === 'open'); if (t) { t.status = t.from === p.id ? 'cancelled' : 'declined'; if (t.to === p.id) ctx.feed(city.players[t.from], m, `${p.name} declined your trade`, '', 'info'); } return ok(); }
    case 'host': {
      if (!L.res) return err('You need a home to host a dinner.'); if (L.dinnerM === m) return err('You already hosted a dinner this month.');
      const it = findItem(p, a.uid); if (!canMove(p, it) || ITEM[it.cid].cat !== 'wine') return err('Pick a case of wine to serve.');
      const g = DINNER.guests.find((x) => x.id === a.guests); if (!g) return err('Pick your guests.');
      const c = ITEM[it.cid], s = ({ Common: 1, Rare: 1.5, Epic: 2.2, Legendary: 3 }[c.rarity]) * (L.style === 'lavish' ? 1.2 : L.style === 'comfortable' ? 1.1 : 1);
      L.items = L.items.filter((x) => x !== it); if (isMade(c)) c.ed -= 1; L.dinnerM = m; L.legacy = (L.legacy || 0) + 2;
      if (g.id === 'clients') { const n = Math.round(4 * s); const k = ctx.clientsBoost(p.id, n); return ok(k ? `The ${c.name} was a hit. ${k} clients are ${n} points happier.` : 'Lovely evening, but you have no clients yet.'); }
      if (g.id === 'bankers') { const cut = r2(0.25 * s); L.bank = { until: m + 12, cut }; return ok(`The bankers loved the ${c.name}. Your bank rate is ${cut} pp lower for 12 months.`); }
      const pool = COLLECTIBLES.filter((x) => x.rarity !== 'Legendary' && x.rarity !== 'Common' && available(city, x.id) > 0);
      if (!pool.length) return ok('Wonderful evening. No one had anything to sell.');
      const x = pick(pool), disc = 0.08 + 0.03 * s; L.offer = { cid: x.id, price: r4(itemValue(city, x.id) * (1 - disc)), until: m + 2 };
      return ok(`A guest offers you ${x.name} at ${Math.round(disc * 100)}% below market. The offer is in your Personal tab for two months.`);
    }
  }
  return null;
}
// ---------------------------------------------------------------- company-made collectibles (vineyard wine, tuner cars)
// once a year: a chance to make a collectible. The odds come from CRAFT[l.type].spec (VINTAGE for vineyards, TUNER for auto repair).
// o.heads = ratings of the specialists leading the company, o.extra = sommelier bonuses, o.name = the company's name.
const RAR = ['Common', 'Rare', 'Epic', 'Legendary'];
export const craftOf = (l) => CRAFT[l && l.type] || CRAFT.vineyard;
export function vintage(city, l, o) {
  ensure(city); const cf = craftOf(l), V = cf.spec, m = city.m, g = m / 12, year = Math.floor(m / 12) + 1, heads = o.heads || [], x = o.extra || { chance: 0, bump: 0 };
  const chance = Math.min(V.maxChance, V.chance + V.perHead * heads.length + x.chance);
  if (V.models && !V.models.length) return { chance: 0, def: null };
  if (rand() >= chance) return { chance, def: null };
  const odds = V.odds[l.size] || V.odds.M, top = RAR.indexOf(V.top[l.size] || 'Legendary');
  let t = RAR.reduce((a, k) => a + odds[k], 0) * rand(), ri = 0;
  for (let i = 0; i < RAR.length; i++) { t -= odds[RAR[i]]; if (t <= 0 && odds[RAR[i]] > 0) { ri = i; break; } }
  if (rand() < Math.min(V.maxBump, V.bump * heads.reduce((a, r) => a + r, 0) + x.bump)) ri++;
  const rarity = RAR[Math.min(ri, top)], [lo, hi] = V.value[rarity];
  const id = uid('v'), ed = Math.max(1, Math.round(V.cases[rarity] * SIZES[l.size].mult * (0.8 + rand() * 0.4)));
  const base = { id, cat: cf.cat, maker: o.name, year: `Y${year}`, rarity, v: r4((lo + rand() * (hi - lo)) * (1 + 0.1 * ((l.level || 1) - 1))), ed, g0: r4(g), lid: l.id, madeM: m };
  let def;
  if (V.models) {
    // a car: the rarity decides which model can come out of the workshop, then a trim
    const pool = V.models.filter((k) => k.rar.includes(rarity)), mo = pick(pool.length ? pool : V.models);
    def = { ...base, v: r4(base.v * (mo.vx || 1)), name: `${mo.name} ${pick(V.trims[rarity])}`, model: mo.id, pic: mo.pic, medium: `${mo.body} · built Y${year} by ${o.name}` };
  } else {
    // a wine: one of the house labels (Bayline, Château Vaillon, Crown Hills) that comes in this rarity
    const lab = pick(V.labels.filter((k) => k.rarity === rarity));
    def = { ...base, name: lab.name, maker: lab.maker, label: lab.id, pic: lab.pic, peak: r2(g + (lab.color === 'sparkling' ? 2 + rand() * 3 : 3 + rand() * 7)), medium: `Case of 6 · ${lab.color} · bottled by ${o.name}, Y${year}` };
  }
  city.life.made[id] = def; ITEM[id] = def;
  city.life.items[id] = { f: r4(0.92 + rand() * 0.16), h: [] }; city.life.items[id].h.push(r4(itemValue(city, id)));
  l.cellar = l.cellar || []; for (let k = 0; k < ed; k++) l.cellar.push({ uid: uid('i'), cid: id, m });
  return { chance, def };
}
// everything of one run goes to the dealer (wine merchant / car dealer); returns what the company is paid
export function cellarSellAll(city, l, cid) {
  const all = (l.cellar || []).filter((x) => x.cid === cid && !x.lot); if (!all.length) return 0;
  l.cellar = l.cellar.filter((x) => !all.includes(x)); toDealer(city, cid);
  return r4(itemValue(city, cid) * LIFE.dealerBuyback * all.length);
}
function roomMsg(p, cat) {
  const has = p.life.homes.some((h) => HOME[h.hid].rooms[cat]);
  if (!p.life.homes.length) return 'Buy a home first. Collections live in your home.';
  return has ? `No free ${ROOMS[cat].unit}. Install or expand your ${ROOMS[cat].name.toLowerCase()}.` : `None of your homes has a ${ROOMS[cat].name.toLowerCase()}.`;
}
function settleTrade(city, t, ctx) {
  const a = city.players[t.from], b = city.players[t.to], m = city.m;
  const give = t.give.map((id) => findItem(a, id)), get = t.get.map((id) => findItem(b, id));
  if (give.some((x) => !canMove(a, x)) || get.some((x) => !canMove(b, x))) { t.status = 'void'; return err('One of the pieces is no longer available.'); }
  if (t.cash > 0 && a.life.wallet < t.cash) return err(`${a.name} does not have ${t.cash} M in their account.`);
  if (t.cash < 0 && b.life.wallet < -t.cash) return err(`${b.name} does not have ${-t.cash} M in their account.`);
  // room check after the swap
  const delta = (its, sign, acc) => its.forEach((x) => { const c = ITEM[x.cid].cat; acc[c] = (acc[c] || 0) + sign; });
  const da = {}, db = {}; delta(get, 1, da); delta(give, -1, da); delta(give, 1, db); delta(get, -1, db);
  for (const [pl, d] of [[a, da], [b, db]]) if (!pl.bot) for (const cat of Object.keys(d)) if (d[cat] > 0 && roomFree(pl, cat) < d[cat]) return err(`${pl.name} has no room for the ${ROOMS[cat].name.toLowerCase()} pieces.`);
  a.life.items = a.life.items.filter((x) => !give.includes(x)); b.life.items = b.life.items.filter((x) => !get.includes(x));
  give.forEach((x) => b.life.items.push({ ...x, lent: false, m, cost: r4(instValue(city, a, x)) }));
  get.forEach((x) => a.life.items.push({ ...x, lent: false, m, cost: r4(instValue(city, b, x)) }));
  a.life.wallet -= t.cash; b.life.wallet += t.cash; t.status = 'done'; if (t.cash) { tx(a.life, m, `Trade with ${b.name}`, -t.cash); tx(b.life, m, `Trade with ${a.name}`, t.cash); }
  if (!b.bot) ctx.feed(a, m, `Trade with ${b.name} completed`, '', 'good');
  return ok('Trade completed.');
}
