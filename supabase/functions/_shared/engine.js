// Aurex Bay Tycoon — game engine.
// Pure functions over one plain "city" object, so the exact same rules run in the browser demo
// and server-side in the Supabase Edge Function. Time is real time: 1 game year = 1 real week (speed 1).
import { DISTRICTS, TYPES, SYNERGY, SIZES, LISTINGS, STAFF, STOCKS, WORLD, DECISIONS, HAPPENINGS, BOTS, CONFIG, VINTAGE, VIP, DEPT_DEFAULTS, WORKER, GOODS, TAKEOVER, SOMMELIER, CRAFT, MAIL_HAP, DEC_FROM, GAZETTE, PRESTIGE_TIERS, placeOn } from './content.js';
import * as OPS from './ops.js';
import * as LOG from './logistics.js';
import * as LIFE from './life.js';
import * as TAL from './talent.js';
import * as BR from './brand.js';
import * as ADS from './ads.js';
import * as MAIL from './mail.js';
import * as CAR from './career.js';
import * as DEAL from './deals.js';
import * as CB from './central.js';
export { OPS, LOG, LIFE, TAL, BR, ADS, MAIL, CAR, DEAL };
OPS.setFreightQuote((cid, v, q, route) => LOG.freight(cid, v, q, route));

const TRADE_MULT = { Boom: 1.3, Stable: 1, Recession: 0.6, Crisis: 0.4 };
const ECON_IX = { Boom: 0, Stable: 1, Recession: 2, Crisis: 3 };
const HOLDING_NAMES = ['Harborline Holdings', 'Nordic Capital Partners', 'Bluewater Group', 'Crown & Isle Ventures'];
const r2 = (v) => Math.round(v * 100) / 100;
const rand = Math.random;
const pick = (a) => a[Math.floor(rand() * a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uid = (p) => p + Math.random().toString(36).slice(2, 9);
const staffDef = (id) => STAFF.find((s) => s.id === id);
function unassign(city, p, spec) {
  if (!p.assign) p.assign = {}; const a = p.assign[spec]; if (!a) return;
  const l = listing(city, a.lid); if (l && l.ops && l.ops.depts[a.dept] && l.ops.depts[a.dept].head === spec) l.ops.depts[a.dept].head = null;
  delete p.assign[spec];
}
const credit = (city, owner, v) => { if (!owner) return; if (owner.k === 'p') { const p = city.players[owner.id]; if (p) p.cash += v; } else { const h = city.holdings[owner.id]; if (h) { h.treasury += v; if (v > 0) h.accrued += v; } } };
// whoever leads this department now (the owner, the coop or a co-owner lending a specialist) steps down
function dropHead(city, l, dept, spec) {
  const h = l.owner && l.owner.k === 'h' ? city.holdings[l.owner.id] : null;
  const cands = h ? [city.talent ? TAL.coopEmp(city, h) : null, ...Object.keys(h.members).map((id) => city.players[id])] : [l.owner && city.players[l.owner.id]];
  cands.forEach((x) => { const a = x && x.assign && x.assign[spec]; if (a && a.lid === l.id && a.dept === dept) unassign(city, x, spec); });
}
const debit = (city, owner, v) => credit(city, owner, -v);
const CTX = { listingYield: (...a) => listingYield(...a), credit, debit, notify: (city, l, t, x, k) => notifyOwner(city, l, t, x, k), news: (city, m, t, x, k) => news(city, m, t, x, k),
  onTheWay: (city, l, g) => (city.shipments ? LOG.onTheWay(city, l, g) : 0),
  carrierMode: (cid) => (LOG.CARRIER[cid] || LOG.CARRIER.ridge).mode,
  book: (city, l, o) => { LOG.ensureWarehouses(city); return LOG.book(city, { from: { k: 'import', id: (LOG.CARRIER[o.carrier] || LOG.CARRIER.ridge).mode }, to: { k: 'l', id: l.id }, ...o, owner: l.owner.id, gNow: city.g }); },
  fromWarehouse: (city, l, needs) => (l.owner && l.owner.k === 'p' && city.players[l.owner.id] && hasStaff(city.players[l.owner.id], 'carlos') ? LOG.supplyFromWarehouses(city, city.players[l.owner.id], l, needs, city.g) : needs) };
const LCTX = { feed: (p, m, t, x, k) => feed(p, m, t, x, k), news: (city, m, t, x, k) => news(city, m, t, x, k),
  credit, notify: (city, l, t, x, k) => notifyOwner(city, l, t, x, k), clientsBoost: (city0, n) => 0 };
// a tycoon who has not done anything for a while is "away": their specialists drift and unprotected companies can be taken over
export function inactive(city, p) { if (p && p.coop) { const hs = p.people.filter((x) => !x.bot); return !hs.length || hs.every((x) => inactive(city, x)); } return !!p && !p.bot && !p.admin && city.m - (p.lastAct ?? city.m) >= TAKEOVER.inactiveMonths; }
const TCTX = { mail: (city, p, x) => mailEmp(city, p, x), feed: (p, m, t, x, k) => (p.coop ? p.people.filter((q) => !q.bot).forEach((q) => feed(q, m, `${p.name}: ${t}`, x, k)) : feed(p, m, t, x, k)), news: (city, m, t, x, k) => news(city, m, t, x, k), unassign: (city, p, k) => unassign(city, p, k),
  listing: (city, id) => listing(city, id), automationWithout: (l, dept) => { const d = l.ops && l.ops.depts[dept]; return d ? d.w / OPS.needWorkers(l, dept) : 0; } };
// what career.js needs to know about the city
const lastProfit = (l) => { const h = l.ops && l.ops.hist && l.ops.hist[l.ops.hist.length - 1]; return h ? h.b2c + h.goods + h.ypi - h.sup - (h.fr || 0) - h.sal - h.bud - (h.heads || 0) - h.maint : 0; };
const CCTX = { inactive: (p) => inactive(CCTX.city, p), listing: (city, id) => listing(city, id), canRun: (pid, l) => canRun(CCTX.city, pid, l),
  owners: (l) => { const c = CCTX.city; if (!l.owner) return []; if (l.owner.k === 'p') { const p = c.players[l.owner.id]; return p && !p.bot ? [p] : []; } const h = c.holdings[l.owner.id]; return h && humanCoop(c, h) ? Object.keys(h.members).map((id) => c.players[id]).filter((p) => p && !p.bot) : []; },
  runs: (p) => CCTX.city.listings.filter((l) => l.owner && canRun(CCTX.city, p.id, l)), profit: lastProfit,
  tier: (p) => (CCTX.city.life && p.life ? LIFE.tierOf(CCTX.city, p) : 0), tierName: (p) => LIFE.prestige(CCTX.city, p).name,
  feed: (p, m, t, x, k) => feed(p, m, t, x, k), dropHead: (l, dept, spec) => dropHead(CCTX.city, l, dept, spec), name: (l) => l.title || TYPES[l.type].name };
export { CB };
export const cctx = (city) => { CCTX.city = city; return CCTX; };
// direct sales between tycoons (deals.js): who you can sell to, and money in and out of a company's owner
export function contacts(city, pid) { const p = city.players[pid]; if (!p) return []; const ids = new Set(p.net || []); Object.values(city.holdings || {}).forEach((h) => { if (h.members[pid]) Object.keys(h.members).forEach((id) => ids.add(id)); }); ids.delete(pid); return [...ids].filter((id) => city.players[id] && !city.players[id].bot && !city.players[id].admin); }
export const dctx = (city) => ({ listing: (id) => listing(city, id), canRun: (pid, l) => canRun(city, pid, l), contacts: (pid) => contacts(city, pid), name: (l) => MAIL.coName(l),
  credit: (o, v) => credit(city, o, v), debit: (o, v) => debit(city, o, v), cashOf: (o) => (o.k === 'p' ? (city.players[o.id] || { cash: 0 }).cash : (city.holdings[o.id] || { treasury: 0 }).treasury),
  book: (l, o) => CTX.book(city, l, o), mail: (pid, x) => MAIL.send(city.players[pid], { g: city.g, m: city.m, ...x }) });
// the stock market's sectors, for career XP from stock profit
const STOCK_SECTOR = { pharma: 'health', ai: 'tech', oil: 'industry', gold: 'finance', energy: 'industry', diamonds: 'finance', military: 'industry', streaming: 'media', taxi: 'service', airline: 'service', fashion: 'media', watches: 'media' };
// a player leading this department themselves steps down (a specialist or a co-owner takes the seat, or it closes)
function dropSelf(city, l, dept) { const d = l.ops && l.ops.depts[dept]; if (!d || d.head !== 'self' || !d.who) return; const p = city.players[String(d.who).slice(2)]; if (p) CAR.leave(city, p, l.id, dept); else { d.head = null; d.who = null; } }
const coopPartners = (city, a, b) => Object.values(city.holdings || {}).some((h) => h.members[a] && h.members[b]);
// a coop with at least one human owner is run by its owners like a player's own company; bot coops stay on autopilot
const humanCoop = (city, h) => !!h && !h.bot && Object.keys(h.members).some((pid) => city.players[pid] && !city.players[pid].bot);
// who may run a company's departments, orders and supplies: its owner, or any owner of the coop that holds it
export function canRun(city, pid, l) { if (!l || !l.owner) return false; if (l.owner.k === 'p') return l.owner.id === pid; const h = city.holdings[l.owner.id]; return !!(h && h.members[pid] && humanCoop(city, h)); }
export function canSeeCompany(city, pid, l) { return !!(l.owner && (l.owner.k === 'p' ? (l.owner.id === pid || coopPartners(city, pid, l.owner.id)) : canRun(city, pid, l))); }
const isManaged = (city, l) => !l.owner || (l.owner.k === 'h' ? !humanCoop(city, city.holdings[l.owner.id]) : !!(city.players[l.owner.id] && city.players[l.owner.id].bot));
// a coop company on autopilot whose coop now has human owners: the owners take over and build their own team
function coopRunMode(city) {
  // one-time: coop companies that switched over with the autopilot's workers (Nov 2026) start empty too
  if (!city.coopReset1) { city.coopReset1 = true; city.listings.forEach((l) => { if (l.owner && l.owner.k === 'h' && l.ops && !l.ops.managed && !isManaged(city, l)) { OPS.takeOverOps(l); Object.values(city.players).forEach((p) => Object.keys(p.assign || {}).forEach((k) => { if (p.assign[k].lid === l.id) delete p.assign[k]; })); } }); }
  city.listings.forEach((l) => { if (l.owner && l.owner.k === 'h' && l.ops && l.ops.managed && !isManaged(city, l)) {
    OPS.takeOverOps(l); l.ops.pending = l.ops.pending || []; l.ops.fg = l.ops.fg || 0; l.ops.board = l.ops.board || []; } });
}
// a specialist works for one company: humans assign them to a department, bots simply employ them
// the employer whose specialists lead this company: its owner, or the coop that holds it
export function bossOf(city, owner) { if (!owner) return null; if (owner.k === 'p') return city.players[owner.id] || null; const h = city.holdings && city.holdings[owner.id]; return h && city.talent ? TAL.coopEmp(city, h) : null; }
export function hasHead(city, l, p, spec) { if (!p) return false; if (p.bot) return hasStaff(p, spec); const a = p.assign && p.assign[spec]; return !!(a && a.lid === l.id); }
function assignOwner(city, l, owner, m) {
  if (l.owner && l.owner.k === 'p') CAR.count(city.players[l.owner.id], 'sold'); if (owner && owner.k === 'p') CAR.count(city.players[owner.id], 'bought');
  const prevOps = l.ops; l.owner = owner; l.boughtM = m; l.upgrade = l.upgrade && prevOps ? l.upgrade : null;
  city.book = (city.book || []).filter((o) => o.lid !== l.id);
  if (isManaged(city, l)) { l.ops = prevOps || OPS.newOps(l, true); l.ops.managed = true; Object.values(l.ops.depts).forEach((d) => (d.head = null)); }
  else if (prevOps) OPS.takeOverOps(l); else l.ops = OPS.newOps(l, false);
}
export const monthName = (m) => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][((m % 12) + 12) % 12];

// ---------------------------------------------------------------- time
export function gameNow(city, now) { return city.clock.g + ((now - city.clock.at) / CONFIG.YEAR_MS) * city.clock.speed; }
// the city never ends: time simply keeps running
export function gameTime(city, now) { return gameNow(city, now); }
export function calendar(g) { const m = Math.floor(g * 12 + 1e-9); return { year: Math.floor(m / 12) + 1, month: m % 12, m }; }
export function realMsPerMonth(city) { return CONFIG.YEAR_MS / 12 / city.clock.speed; }

// ---------------------------------------------------------------- creation
export function createCity(now, opts = {}) {
  const city = {
    v: 2, id: opts.id || 'aurex-bay', season: 1, createdAt: now,
    clock: { g: 0, at: now, speed: opts.speed || 1 }, m: 0, g: 0, over: false,
    econ: 'Stable', fx: null, deck: shuffle(WORLD.map((w) => w.id)), lastCard: null,
    stocks: {}, listings: LISTINGS.map((l) => ({ ...l, level: 1, owner: null, boughtM: null, upgrade: null, contracts: 0 })),
    players: {}, holdings: {}, contracts: [], netReqs: [], offers: [], news: []
  };
  STOCKS.forEach((s) => { const p = r2(s.p * (0.9 + rand() * 0.2)); city.stocks[s.id] = { p, h: [p] }; });
  OPS.ensureMarket(city); LOG.ensureWarehouses(city);
  BOTS.forEach((b) => { city.players[b.id] = newPlayer(b.id, b.name, 0, { bot: true, style: b.style, color: b.color, avatar: b.avatar || null, cash: CONFIG.START_CASH + Math.round(rand() * 10) }); });
  LIFE.ensure(city); TAL.ensure(city); TAL.seedBots(city);
  news(city, 0, 'Season ' + city.season + ' opens in Aurex Bay', 'Twenty-seven companies are for sale. The first tycoons are already moving in.', 'info');
  // the city has a history before you arrive
  for (let wk = 1; wk <= CONFIG.HISTORY_MONTHS * 4; wk++) stepWeek(city, wk);
  city.wk = CONFIG.HISTORY_MONTHS * 4;
  city.clock = { g: CONFIG.HISTORY_MONTHS / 12, at: now, speed: opts.speed || 1 }; city.mapV = 4;
  return city;
}
function newPlayer(id, name, m, o = {}) {
  return { id, name, bot: !!o.bot, style: o.style || null, color: o.color || '#1b2b44', avatar: o.avatar || null, cash: o.cash ?? CONFIG.START_CASH, inf: 0, settledG: m / 12,
    staff: [], assign: {}, loans: [], shares: {}, cost: {}, realized: 0, rlz: {}, phist: [], policy: 'balanced', net: [], inbox: [], feed: [], hist: [], joinedM: m, est: {} };
}
// o.first / o.last: the avatar name chosen at sign-up (name is then "First Last")
export function addPlayer(city, id, name, now, o = {}) {
  advance(city, now);
  if (city.players[id]) return city.players[id];
  const g = city.g; // every new tycoon starts with the same cash, however late they arrive
  const av = o.first || o.last ? BR.checkAvatarName(o.first, o.last) : null;
  const p = newPlayer(id, (av && av.ok ? av.name : name || 'New tycoon').slice(0, 34), Math.floor(g * 12), { cash: CONFIG.PLAYER_START_CASH, color: '#1b2b44', avatar: 'img/a-you.jpg' });
  if (av && av.ok) { p.first = av.first; p.last = av.last; }
  p.co = null; // the parent company is founded right after joining (coFound / coJoin)
  p.settledG = g; p.lastAct = city.m; p.team = {}; city.players[id] = p; LIFE.ensurePlayer(city, p);
  feed(p, city.m, 'Welcome to Aurex Bay', `You start with ${CONFIG.PLAYER_START_CASH} M and an office at Harbor Row. Your companies earn money around the clock, also while you are away.`, 'info');
  news(city, city.m, `${p.name} arrives in Aurex Bay`, 'A new tycoon has opened an office at Harbor Row.', 'info');
  return p;
}
// ---------------------------------------------------------------- the administrator player
// One shared test tycoon for admins: unlimited money, never in the standings, never taken over,
// and kept out of the city news. Who may play it is checked by the game server (admin e-mails), not here.
export const ADMIN_ID = 'admin', ADMIN_NAME = 'Administrator', ADMIN_CASH = 1e9;
// chat: the administrator's inbox in public.chat_messages (a fixed id, since 'admin' is not a user id)
export const ADMIN_CHAT = '00000000-0000-0000-0000-000000000ad1';
export const isAdminPlayer = (p) => !!p && !!p.admin;
function refillAdmin(city) {
  const p = city.players[ADMIN_ID]; if (!p || !p.admin) return;
  if (!(p.cash >= ADMIN_CASH)) p.cash = ADMIN_CASH;
  p.loans = []; p.lastAct = city.m;
  if (p.life && !(p.life.wallet >= ADMIN_CASH)) p.life.wallet = ADMIN_CASH;
}
export function ensureAdmin(city, now) {
  advance(city, now);
  let p = city.players[ADMIN_ID];
  if (!p) {
    p = newPlayer(ADMIN_ID, ADMIN_NAME, city.m, { cash: ADMIN_CASH, color: '#33383f', avatar: 'img/a-you.jpg' });
    p.admin = true; p.first = 'Admin'; p.last = 'Player'; p.settledG = city.g; p.lastAct = city.m; p.team = {};
    p.co = { name: 'Aurex Bay Administration', color: 'graphite', font: 'prestige', sym: 'key', hid: null, m: city.m };
    city.players[ADMIN_ID] = p; LIFE.ensurePlayer(city, p);
    feed(p, city.m, 'Administrator account', 'Unlimited money for testing. Only admins see this player.', 'info');
  }
  refillAdmin(city); return p;
}
// The test player: an ordinary tycoon (normal start money, normal rules) that admins switch to,
// to try the game as a regular player. It starts with its own parent company so it can play at once.
export const TEST_ID = 'tester', AS_IDS = [ADMIN_ID, TEST_ID];
export function ensureTester(city, now) {
  if (city.players[TEST_ID]) { advance(city, now); return city.players[TEST_ID]; }
  const p = addPlayer(city, TEST_ID, 'Test Player', now, { first: 'Test', last: 'Player' });
  p.test = true; p.co = { name: 'Test Player Holding', color: 'teal', font: 'clean', sym: 'compass', hid: null, m: city.m };
  return p;
}
// chat: the administrator and the test player are not user accounts, so their inboxes in public.chat_messages have fixed ids
export const TEST_CHAT = '00000000-0000-0000-0000-000000000ad2', AS_CHAT = { [ADMIN_ID]: ADMIN_CHAT, [TEST_ID]: TEST_CHAT };
export const ensureAs = (city, id, now) => (id === ADMIN_ID ? ensureAdmin(city, now) : id === TEST_ID ? ensureTester(city, now) : null);
// Speeds an admin may pick online (the live city): from a quarter of live speed up to demo speed.
export function validSpeed(s) { return typeof s === 'number' && Number.isFinite(s) && s >= 0.25 && s <= 2016; }
export function setSpeed(city, speed, now) { advance(city, now); city.clock = { g: gameNow(city, now), at: now, speed }; }

// ---------------------------------------------------------------- lookups
export const listing = (city, id) => city.listings.find((l) => l.id === id);
export function listingPrice(l) { return Math.round(TYPES[l.type].price * SIZES[l.size].mult * 2) / 2; }
export function listingValue(l) { return r2(listingPrice(l) * (1 + 0.3 * (l.level - 1))); }
export function upgradeCost(l) { return Math.round(listingPrice(l) * 0.4 * l.level * 2) / 2; }
export function upgradeMonths(l) { return l.level; }
const ownerIs = (l, k, id) => l.owner && l.owner.k === k && l.owner.id === id;
export function ownedBy(city, k, id) { return city.listings.filter((l) => ownerIs(l, k, id)); }
export function hasStaff(p, id) { return p.staff.includes(id); }
export function capacity(p) { return STAFF.length; }
export function staffCost(p, id) { return Math.max(0.5, staffDef(id).cost - (hasStaff(p, 'emily') ? 0.5 : 0)); }
export function netWorthTalent(city, p) { return city.talent ? TAL.teamOf(city, p).reduce((a, tid) => a + TAL.value(city, tid) * 0.5, 0) : 0; }
export function debt(p) { return p.loans.reduce((a, l) => a + l.amt, 0); }
// Share prices tick between the weekly closes: a deterministic random walk from the last close, the same on server and client.
const TICKS_PER_WEEK = 28;
const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };
function walk(id, wk, t) {
  const k = Math.floor(t), f = t - k; let w = 0;
  for (let i = 1; i <= k; i++) w += (hash(id + ':' + wk + ':' + i) - 0.5) * 0.009;
  return w + f * (hash(id + ':' + wk + ':' + (k + 1)) - 0.5) * 0.009;
}
export function priceAt(city, id, g = city.g) {
  const st = city.stocks[id]; if (!st) return 0;
  const wk = city.wk ?? Math.floor(g * 48), t = Math.max(0, Math.min(TICKS_PER_WEEK, (g * 48 - wk) * TICKS_PER_WEEK));
  return Math.max(0.1, st.p * (1 + walk(id, wk, t)));
}
export function stockValue(city, p) { return Object.keys(p.shares).reduce((a, k) => a + p.shares[k] * priceAt(city, k), 0); }
export function holdingShares(h) { return Object.values(h.members).reduce((a, b) => a + b, 0); }
export function holdingNav(city, h) { return r2(h.treasury + ownedBy(city, 'h', h.id).reduce((a, l) => a + listingValue(l), 0)); }
export function holdingStake(city, h, pid) { const t = holdingShares(h); return t ? (h.members[pid] || 0) / t : 0; }
export function myHoldings(city, pid) { return Object.values(city.holdings).filter((h) => h.members[pid]); }
export function netWorth(city, pid) {
  const p = city.players[pid]; if (!p) return 0;
  const comps = ownedBy(city, 'p', pid).reduce((a, l) => a + listingValue(l), 0);
  const hold = myHoldings(city, pid).reduce((a, h) => a + holdingNav(city, h) * holdingStake(city, h, pid), 0);
  const wh = (city.warehouses || []).filter((w) => w.owner === pid).reduce((a, w) => a + LOG.SITE[w.id].price * (0.7 + 0.25 * (w.level - 1)) + Object.entries(w.stock).reduce((x, [g, q]) => x + q * (city.market ? city.market[g].p : 0), 0), 0);
  return r2(p.cash + stockValue(city, p) + comps + hold + wh - debt(p) + (city.life ? LIFE.netWorth(city, p) : 0));
}
export function loanCap(city, p) { return Math.max(10, Math.floor((ownedBy(city, 'p', p.id).reduce((a, l) => a + listingValue(l), 0) * 0.5 + 10) / 5) * 5); }
// what makes up a player's bank rate: the base rate and every discount, as [label, points] (points negative = cheaper)
export function loanRateParts(city, p) {
  const own = ownedBy(city, 'p', p.id), parts = [['Bank rate', CB.rate(city)]];
  if (own.some((l) => l.type === 'finance') && city.econ !== 'Recession') parts.push(['Finance company you own', -2]);
  else if (own.some((l) => l.type === 'bank')) parts.push(['Bank you own', -0.5]);
  if (city.life) { const t = LIFE.tierOf(city, p); if (t) parts.push(['Prestige tier', -t * 0.5]); const cut = LIFE.bankCut(city, p); if (cut) parts.push(['Friends among bankers', -cut]); }
  if (CAR.hasSpec(p, 'banker')) parts.push(['Banker specialisation', -1]);
  return parts;
}
export function loanRate(city, p) { return Math.max(1, r2(loanRateParts(city, p).reduce((a, [, v]) => a + v, 0))); }
export function standings(city) {
  return Object.values(city.players).filter((p) => !p.admin).map((p) => ({ id: p.id, name: p.name, bot: p.bot, color: p.color, avatar: p.avatar, nw: netWorth(city, p.id), inf: p.inf, score: r2(netWorth(city, p.id) + p.inf) })).sort((a, b) => b.score - a.score);
}
// market insight: a tycoon with a Market Research Associate gets one research note per upcoming world card, as a mail.
// The note can be forwarded to the whole network from the mail; nobody else sees it.
const intelKey = (city) => `${city.lastCard ? city.lastCard.m : -1}:${city.deck[0]}`;
function insightWeek(city) {
  const key = intelKey(city), card = WORLD.find((w) => w.id === city.deck[0]);
  Object.values(city.players).forEach((p) => {
    if (p.bot || !p.mail) return;
    p.mail.filter((x) => x.intel && x.intel !== key && MAIL.isOpen(x)).forEach((x) => closeMail(city, p, x, -1, true, 'The quarter has turned: this note is history.'));
  });
  if (!card) return;
  Object.values(city.players).forEach((p) => {
    if (p.bot || p.coop || p.admin || !hasStaff(p, 'jason') || p.intel === key) return;
    p.intel = key;
    const tid = p.team && p.team.jason, t = tid && TAL.PERSON[tid];
    MAIL.send(p, { g: city.g, m: city.m, intel: key, kind: 'info', from: t ? { n: t.name, r: 'Market Research', tid } : { n: 'Market Research', r: 'Your team', k: 'staff' },
      subj: 'Research note: signals for the coming quarter', body: MAIL.insightBody(card, rand),
      opts: [{ l: 'Forward to my network', d: p.net.length ? `Send the note to your ${p.net.length} contact${p.net.length > 1 ? 's' : ''}` : 'Your network is empty', fwd: true }, { l: 'Keep it to myself', d: 'Only you have it', safe: true }] });
  });
}
function forwardIntel(city, p, x) {
  const to = p.net.map((id) => city.players[id]).filter((q) => q && !q.bot);
  to.forEach((q) => MAIL.send(q, { g: city.g, m: city.m, kind: 'info', from: { ...x.from, r: `${x.from.r} · via ${p.name}` }, subj: `Fwd from ${p.name}: ${x.subj}`, body: x.body }));
  return to.length ? `Forwarded to ${to.map((q) => q.name).join(', ')}.` : 'Nobody in your network to send it to.';
}

// ---------------------------------------------------------------- income
function portfolioTypes(city, owner) { return new Set(city.listings.filter((l) => ownerIs(l, owner.k, owner.id)).map((l) => l.type)); }
function contractPartnerTypes(city, l) {
  const out = new Set();
  city.contracts.filter((c) => c.status === 'active' && (c.a === l.id || c.b === l.id)).forEach((c) => { const o = listing(city, c.a === l.id ? c.b : c.a); if (o) out.add(o.type); });
  return out;
}
export function listingYield(city, l, owner) {
  owner = owner || l.owner; const def = TYPES[l.type], s = SIZES[l.size].mult, lv = 1 + 0.35 * (l.level - 1), econ = city.econ, notes = [];
  let mult = TRADE_MULT[econ];
  if ((l.type === 'pharma' || l.type === 'autorepair') && econ === 'Recession') mult = 1;
  if (l.type === 'autorepair' && econ === 'Boom') mult = 1;
  let ypi = def.ypi * lv * s, trade = def.trade * lv * s * mult;
  if (l.type === 'bank' && econ === 'Recession') { ypi -= 0.5 * s; notes.push(`Bad loans −${r2(0.5 * s)}`); }
  if (l.type === 'dealer' && econ === 'Recession') { trade = 0; notes.push('Credit squeeze: no Trade'); }
  if (l.type === 'clothing' && econ === 'Boom') { ypi += 0.3 * s; notes.push(`Boom +${r2(0.3 * s)}`); }
  if (l.type === 'clothing' && econ === 'Recession') { ypi -= 0.3 * s; notes.push(`Recession −${r2(0.3 * s)}`); }
  if (l.type === 'music' && econ === 'Recession') { ypi -= 0.4 * s; notes.push(`Fickle charts −${r2(0.4 * s)}`); }
  if (l.type === 'restaurant' && econ === 'Recession') { ypi -= 0.3 * s; notes.push(`Recession −${r2(0.3 * s)}`); }
  if (l.type === 'car' && city.fx && city.fx.id === 'energy') { trade = 0; notes.push('Energy shortage: no Trade'); }
  const types = owner ? portfolioTypes(city, owner) : new Set(), partners = contractPartnerTypes(city, l);
  SYNERGY.forEach(([a, b]) => {
    if (l.type === b && (types.has(a) || partners.has(a))) { ypi += s; notes.push(`${TYPES[a].name} synergy${!types.has(a) ? ' (contract)' : ''} +${r2(s)}`); }
    if (l.type === a && partners.has(b)) { ypi += s; notes.push(`Supply deal +${r2(s)}`); }
  });
  if (l.type === 'car' && types.has('metal')) { trade += s; notes.push(`Metal synergy Trade +${r2(s)}`); }
  if (l.type === 'hotel' && econ === 'Boom') { ypi += s; notes.push(`Boom +${r2(s)}`); }
  if (l.type === 'hotel' && econ === 'Recession') { ypi -= s; notes.push(`Recession −${r2(s)}`); }
  if (l.type === 'metal' && econ === 'Crisis') { ypi -= 3 * s; notes.push(`Crisis −${r2(3 * s)}`); }
  if (l.type === 'pharma' && econ === 'Crisis') { ypi += 3 * s; notes.push(`Emergency profits +${r2(3 * s)}`); }
  if (l.type === 'vineyard' && econ === 'Crisis') { ypi -= 0.4 * s; notes.push(`Crisis −${r2(0.4 * s)}`); }
  if (l.type === 'data') { const h = city.stocks.ai.h, n = h.length, t = n > 1 ? Math.sign(h[n - 1] - h[n - 2]) : 0; if (t) { ypi += t * s; notes.push(`AI trend ${t > 0 ? '+' : '−'}${r2(s)}`); } }
  if (l.type === 'finance' && econ === 'Recession') { ypi = 0; notes.push('Recession: no YPI'); }
  if (CB.isBank(l) && owner) { const v = CB.C.ownerCut * cityInterest(city, owner); if (v > 0.005) { ypi += v; notes.push(`Share of city loan interest +${r2(v)}`); } }
  if (l.type === 'restaurant' && owner) { const n = Math.min(3, city.listings.filter((x) => x.id !== l.id && x.d === l.d && x.owner && x.owner.k === owner.k && x.owner.id === owner.id).length); if (n) { ypi += 0.2 * n; notes.push(`Neighbourhood +${r2(0.2 * n)}`); } }
  {
    const p = bossOf(city, owner);
    if (p) {
      if (l.type === 'finance' && econ !== 'Recession' && p.shares && Object.keys(p.shares).filter((k) => p.shares[k] > 0).length >= 2) { ypi += s; notes.push(`Stock portfolio +${r2(s)}`); }
      if (l.type === 'fashion' && hasHead(city, l, p, 'sofia')) { ypi += s; notes.push(`Influencer marketing +${r2(s)}`); }
      if (def.group === 'media' && hasHead(city, l, p, 'sofia')) { ypi += s; notes.push(`Sofia +${r2(s)}`); }
      if ((def.group === 'industry' || l.type === 'chip') && hasHead(city, l, p, 'carlos')) { ypi += s; notes.push(`Logistics +${r2(s)}`); }
      if (l.type === 'dealer' && hasHead(city, l, p, 'jason') && p.team && p.team.jason === 'rohan') { ypi += s; notes.push(`Rohan +${r2(s)}`); }
      sommeliers(city, l).forEach((tid) => { const v = SOMMELIER[tid].ypi * s; if (v) { ypi += v; notes.push(`${TAL.PERSON[tid].name.split(' ')[0]} (sommelier) +${r2(v)}`); } });
      if ((l.type === 'autorepair' || l.type === 'car' || l.type === 'dealer') && hasHead(city, l, p, 'marco')) { ypi += s; notes.push(`Workshop +${r2(s)}`); }
      if (def.group === 'tech' && hasHead(city, l, p, 'anika')) { ypi += s; notes.push(`Anika +${r2(s)}`); }
      // every specialist leading a department here adds leadership value, more the better they are
      if (!p.bot && l.ops) Object.entries(l.ops.depts).forEach(([dept, d]) => { const v = CAR.headYpiOf(d) * s; if (v) { const who = city.players[String(d.who).slice(2)]; ypi += v; notes.push(`${who ? who.name.split(' ')[0] : 'Owner'} leads ${OPS.deptFor(l, dept).name} +${r2(v)}`); } });
      if (OPS.hasSp(l, 'motor') && (l.type === 'autorepair' || l.type === 'dealer')) { ypi += 0.5 * s; notes.push(`The Car Guy +${r2(0.5 * s)}`); }
      if (OPS.hasSp(l, 'crisis') && econ === 'Crisis') { ypi += 2 * s; notes.push(`Crisis Manager +${r2(2 * s)}`); }
      if (!p.bot && city.talent) Object.entries(p.assign || {}).forEach(([spec, a]) => { if (!a || a.lid !== l.id) return; const tid = p.team && p.team[spec], t = tid && city.talent[tid]; if (!t || t.leave != null) return; const v = TAL.headYpi(t.rating) * s; ypi += v; notes.push(`${TAL.PERSON[tid].name.split(' ')[0]} leads ${OPS.deptFor(l, a.dept).name} +${r2(v)}`); });
    }
  }
  const lv2 = CB.sectorLevy(city, l.type); if (lv2 && ypi > 0) { const v = ypi * lv2 / 100; ypi -= v; notes.push(`National bank levy −${r2(v)}`); }
  return { ypi: r2(ypi), trade: r2(trade), total: r2(ypi + trade), notes };
}
// yearly interest every other tycoon pays on bank loans (the national bank earns a share of it)
function cityInterest(city, owner) {
  const skip = owner.k === 'p' ? new Set([owner.id]) : new Set(Object.keys((city.holdings[owner.id] || {}).members || {}));
  return Object.values(city.players).filter((p) => !skip.has(p.id) && p.loans && p.loans.length).reduce((a, p) => { const r = loanRate(city, p); return a + p.loans.reduce((b, x) => b + x.amt * (x.rate === 'bank' ? r : x.rate) / 100, 0); }, 0);
}
// the parts of a company's month that live outside ops: passive income, maintenance and the specialists who lead it
export function monthLines(city, l) {
  const y = listingYield(city, l, l.owner), eff = l.ops ? l.ops.eff : 1, s = SIZES[l.size].mult;
  let heads = 0;
  const p = bossOf(city, l.owner);
  if (p && !p.bot && city.talent) Object.entries(p.assign || {}).forEach(([spec, a]) => { if (a && a.lid === l.id) { const t = city.talent[p.team && p.team[spec]]; if (t) heads += t.salary / 12; } });
  return { ypi: Math.max(0, y.ypi) * eff / 12, maint: l.type === 'metal' ? 2 * s / 12 : 0, heads };
}
// yearly rates for a player or a holding
export function rates(city, k, id) {
  const ls = ownedBy(city, k, id), lines = ls.map((l) => ({ l, y: listingYield(city, l, { k, id }), eff: l.ops ? l.ops.eff : 1, run: OPS.runningCosts(l).total }));
  const income = lines.reduce((a, x) => a + Math.max(0, x.y.ypi) * x.eff, 0);
  const running = lines.reduce((a, x) => a + x.run, 0);
  const maint = ls.filter((l) => l.type === 'metal').reduce((a, l) => a + 2 * SIZES[l.size].mult, 0);
  let upkeep = 0, interest = 0;
  if (k === 'h' && city.talent && city.holdings[id]) upkeep = TAL.salaries(city, TAL.coopEmp(city, city.holdings[id]));
  if (k === 'p') {
    const p = city.players[id];
    upkeep = (city.talent ? TAL.salaries(city, p) : p.staff.reduce((a, s) => a + staffDef(s).upkeep, 0)) + (city.warehouses ? LOG.upkeep(city, id) : 0) + (!p.bot && p.life ? p.life.salary : 0);
    const rate = loanRate(city, p);
    interest = p.loans.reduce((a, l) => a + l.amt * (l.rate === 'bank' ? rate : l.rate) / 100, 0);
    if (hasStaff(p, 'michael')) interest = Math.max(0, interest - 1);
  }
  const costs = maint + upkeep + interest + running;
  return { income: r2(income), maint: r2(maint), upkeep: r2(upkeep), interest: r2(interest), running: r2(running), costs: r2(costs), net: r2(income - costs), lines };
}
// customer sales and supply trade happen once a month; this annualizes the last month for display
export function opsEstimate(city, l) { const h = l.ops && l.ops.hist[l.ops.hist.length - 1]; return h ? r2((h.b2c + h.goods - h.sup) * 12) : 0; }
export function annualEstimate(city, k, id) { const r = rates(city, k, id); return r2(r.net + ownedBy(city, k, id).reduce((a, l) => a + opsEstimate(city, l), 0)); }
export function liveCash(city, pid, now) {
  const p = city.players[pid]; if (!p) return 0;
  const g = gameTime(city, now); return p.cash + rates(city, 'p', pid).net * Math.max(0, g - p.settledG);
}
export function liveTreasury(city, hid, now) {
  const h = city.holdings[hid]; if (!h) return 0;
  const g = gameTime(city, now); return h.treasury + rates(city, 'h', hid).net * Math.max(0, g - h.settledG);
}

// ---------------------------------------------------------------- progression of time
function settleAll(city, g) {
  Object.values(city.players).forEach((p) => { const dt = g - p.settledG; if (dt > 0) { p.cash += rates(city, 'p', p.id).net * dt; p.settledG = g; } });
  Object.values(city.holdings).forEach((h) => { const dt = g - h.settledG; if (dt > 0) { const r = rates(city, 'h', h.id); h.treasury += r.net * dt; h.accrued += Math.max(0, r.net) * dt; h.settledG = g; } });
  city.g = g;
}
// upgrades cities saved by older versions of the game
function migrate(city) {
  if (city.migrated === 4) return;
  OPS.ensureMarket(city);
  LOG.ensureWarehouses(city);
  city.listings.forEach((l) => { if (l.owner && !l.ops) l.ops = OPS.newOps(l, isManaged(city, l)); if (l.ops && !l.ops.managed) { OPS.ensureClients(l); l.ops.pending = []; l.ops.fg = l.ops.fg || 0; l.ops.board = l.ops.board || []; } });
  Object.values(city.players).forEach((p) => { p.assign = p.assign || {}; p.cost = p.cost || {}; p.realized = p.realized || 0; p.rlz = p.rlz || {}; p.phist = p.phist || []; });
  city.offers = city.offers || []; city.migrated = 4;
}
// the 2026 map: districts and new positions for every place and client
function migrateMap(city) {
  const known = Object.fromEntries(LISTINGS.map((n) => [n.id, n.type]));
  // a listing replaced by a new business: the owner is bought out at full value before the old one closes
  city.listings.filter((l) => known[l.id] !== l.type && l.owner).forEach((l) => {
    const v = r2(listingValue(l) + (l.upgrade ? upgradeCost(l) : 0)), old = TYPES[l.type] ? TYPES[l.type].name : 'company';
    const n = LISTINGS.find((x) => x.id === l.id), next = n ? `${n.title || TYPES[n.type].name} takes over the site and is for sale now.` : 'The site has closed.';
    if (l.owner.k === 'p' && !city.players[l.owner.id] || l.owner.k === 'h' && !city.holdings[l.owner.id]) return;
    payOwner(city, l, v); notifyOwner(city, l, `Your ${old} in ${l.district} was bought out`, `The city paid ${v} M, its full value. ${next}`, 'good');
    releaseListing(city, l);
  });
  city.listings = city.listings.filter((l) => known[l.id] === l.type);
  LISTINGS.forEach((n) => { if (!city.listings.some((l) => l.id === n.id)) city.listings.push({ ...n, level: 1, owner: null, boughtM: null, upgrade: null, contracts: 0 }); });
  CB.ensure(city);
  // the national bank is never run by a bot: a bot owner is bought out at full value
  { const l = listing(city, CB.ID); if (l && l.owner && !humanOwned(city, l) && !(l.owner.k === 'p' && city.players[l.owner.id] && city.players[l.owner.id].admin)) { payOwner(city, l, r2(listingValue(l))); releaseListing(city, l); } }
  // names and pictures follow content.js (a site can be renamed without changing its business)
  city.listings.forEach((l) => { const n = LISTINGS.find((x) => x.id === l.id); if (!n) return; if (n.title) l.title = n.title; else delete l.title; if (n.img) l.img = n.img; else delete l.img; });
  if (city.mapV === 4) return;
  const byId = Object.fromEntries(LISTINGS.map((l) => [l.id, l]));
  city.listings.forEach((l) => { const n = byId[l.id]; if (n) Object.assign(l, { d: n.d, p: n.p, x: n.x, y: n.y, district: n.district }); });
  keepPins(city);
  if (city.mapV === 2 || city.mapV === 3) { city.mapV = 4; return; }
  const ds = DISTRICTS;
  city.listings.forEach((l) => (l.ops && l.ops.clients || []).forEach((c) => { const d = ds[Math.floor(rand() * ds.length)]; Object.assign(c, { district: d.name, x: Math.round(d.box.x + (0.15 + rand() * 0.7) * d.box.w), y: Math.round(d.box.y + (0.15 + rand() * 0.7) * d.box.h) }); }));
  city.shipments = [];
  city.mapV = 4;
}
// Positions an admin dragged on the map (city.pins: { lid: { type, p } }). They outlive map updates in content.js;
// a pin is dropped when another kind of business takes over the site.
function keepPins(city) {
  const pins = city.pins || {};
  Object.keys(pins).forEach((id) => { const l = city.listings.find((x) => x.id === id), pin = pins[id];
    if (!l || l.type !== pin.type) { delete pins[id]; return; }
    Object.assign(l, { p: pin.p.slice(), ...placeOn(l.d, pin.p) }); });
}
// admin only (checked by the game function): move a company's pin inside its district, for everyone, for good
export function moveListing(city, lid, p) {
  const l = city.listings.find((x) => x.id === lid);
  if (!l) return { ok: false, msg: 'That company is not on the map.' };
  if (!Array.isArray(p) || p.length !== 2 || !p.every((v) => typeof v === 'number' && Number.isFinite(v))) return { ok: false, msg: 'Drop the pin on the district map.' };
  const q = p.map((v) => Math.round(Math.min(0.99, Math.max(0.01, v)) * 1e4) / 1e4);
  city.pins = city.pins || {}; city.pins[lid] = { type: l.type, p: q };
  Object.assign(l, { p: q, ...placeOn(l.d, q) });
  return { ok: true, msg: `${l.title || TYPES[l.type].name} moved.` };
}
function migrateLife(city) { migrateMap(city); LIFE.register(city); if (city.over) city.over = false; if (!city.talent) TAL.ensure(city); if (city.wk == null) city.wk = city.m * 4; if (city.migratedLife === 1) return; LIFE.ensure(city); city.migratedLife = 1; }
export function advance(city, now) {
  migrate(city); migrateLife(city); coopRunMode(city);
  Object.values(city.players).forEach((p) => { if (!p.bot && !p.admin && !(p.career && p.career.seeded)) CAR.seed(city, p, cctx(city)); });
  mailSync(city);
  if (city.over) return;
  const target = gameTime(city, now);
  let loops = 0;
  // the city moves in weekly steps (4 per game month); every 4th step closes the month
  while ((city.wk + 1) / 48 <= target + 1e-9 && loops < 1600) {
    const wk = city.wk + 1; LOG.arrivals(city, wk / 48, (sh) => shipmentArrived(city, sh));
    stepWeek(city, wk);
    city.wk = wk; loops++;
  }
  if (loops >= 1600) { city.clock = { g: city.wk / 48, at: now, speed: city.clock.speed }; }
  // between weekly steps: whatever was planned for a moment that has now passed happens, orders land one by one
  const g = Math.max(city.g, Math.min(target, (city.wk + 1) / 48));
  runAgenda(city, g);
  settleAll(city, g);
  city.listings.forEach((l) => { if (l.ops && l.owner && !l.ops.managed) OPS.releaseQueue(city, l, g); });
  LOG.arrivals(city, city.g, (sh) => shipmentArrived(city, sh));
  refillAdmin(city);
}
function shipmentArrived(city, sh) {
  const p = city.players[sh.owner]; if (!p || p.bot) return;
  const c = sh.carrier ? LOG.CARRIER[sh.carrier] : null, late = sh.etaG != null && sh.arriveG - sh.etaG > 1e-6 ? Math.round((sh.arriveG - sh.etaG) * 365) : 0;
  const where = sh.to.k === 'export' ? 'its buyer abroad' : sh.to.k === 'w' ? LOG.SITE[sh.to.id].name : (() => { const l = listing(city, sh.to.id); return l ? `${TYPES[l.type].name}, ${l.district}` : 'your company'; })();
  const lost = sh.dmg ? ` ${Math.round(sh.dmg * 100)}% was damaged on the way.` : '';
  (p.deliv = p.deliv || []).unshift({ lid: sh.to.k === 'l' ? sh.to.id : sh.from.k === 'l' ? sh.from.id : null, wid: sh.to.k === 'w' ? sh.to.id : sh.from.k === 'w' ? sh.from.id : null, m: city.m, g: sh.g, qty: Math.round(sh.qty), got: Math.round(sh.got ?? sh.qty), carrier: sh.carrier || null, late, dmg: sh.dmg || 0, to: where, exp: sh.to.k === 'export', pay: sh.pay || 0 }); if (p.deliv.length > 20) p.deliv.length = 20;
  if (sh.to.k === 'export') feed(p, city.m, `Export delivered${c ? ` by ${c.short}` : ''}`, `${Math.round(sh.qty)} ${GOODS[sh.g].unit} of ${GOODS[sh.g].name.toLowerCase()}: +${r2((sh.pay || 0) * (1 - (sh.dmg || 0)))} M.${late ? ` ${late} days late.` : ''}${lost}`, lost ? 'bad' : 'good');
  else feed(p, city.m, `Delivery at ${where}`, `${Math.round(sh.got ?? sh.qty)} ${GOODS[sh.g].unit} of ${GOODS[sh.g].name.toLowerCase()}${c ? ` by ${c.short}` : ''}.${late ? ` ${late} days late.` : ''}${lost}`, lost || late > 3 ? 'bad' : 'good');
}
function endSeason(city) {
  city.over = true; city.final = standings(city);
  news(city, city.m, `Season ${city.season} is over`, `${city.final[0].name} finishes as the richest tycoon in Aurex Bay.`, 'good');
}

// small weekly moves: share prices, supply prices, queued customer orders and rival bids at the auction house
function weekBoundary(city, wk, monthEnd) {
  if (!monthEnd) settleAll(city, wk / 48);
  STOCKS.forEach((s) => {
    const st = city.stocks[s.id]; st.p = Math.max(0.1, st.p * (1 + walk(s.id, wk - 1, TICKS_PER_WEEK))); let ch = s.d[ECON_IX[city.econ]] / 48 + (rand() - 0.5) * 0.024;
    if (rand() < 0.03) { const jump = (rand() < 0.5 ? -1 : 1) * (0.04 + rand() * 0.06); ch += jump; if (city.m > 0) news(city, city.m, `${s.name} ${jump > 0 ? 'jumps' : 'drops'} ${Math.round(Math.abs(jump) * 100)}% this week`, jump > 0 ? pick(['Strong orders surprise analysts.', 'A big contract is rumoured.', 'Buyers pile in after upbeat guidance.']) : pick(['A profit warning spooks investors.', 'A key client walks away.', 'Regulators open an inquiry.']), jump > 0 ? 'good' : 'bad', { stock: s.id }); }
    st.p = Math.max(0.1, Math.round(st.p * (1 + ch) * 1000) / 1000); st.h.push(st.p); if (st.h.length > 104) st.h.shift();
  });
  if (city.market) Object.entries(city.market).forEach(([g, mk]) => { mk.p = Math.max(OPS.exportPrice(city, g), Math.min(OPS.importPrice(city, g), Math.round(mk.p * (1 + (rand() - 0.5) * 0.012) * 10000) / 10000)); });
  if (!monthEnd) {
    city.listings.forEach((l) => { if (l.ops && l.owner) OPS.weekStep(city, CTX, l, wk); });
    if (city.life) LIFE.weekStep(city, wk, LCTX);
  }
  ADS.weekStep(city, wk / 48, CTX);
  CB.weekStep(city);
  DEAL.weekStep(city, dctx(city));
  mailWeek(city);
  insightWeek(city);
  planWeek(city, wk);
}
function stepWeek(city, wk) { runAgenda(city, wk / 48); if (wk % 4 === 0) monthBoundary(city, wk / 4); else weekBoundary(city, wk); }

// ---------------------------------------------------------------- the agenda: things that happen at their own moment inside a week
// every weekly step plans the coming week; each entry fires when the clock passes its time (g, in game years), so the city never goes quiet
const hashId = (id) => [...String(id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
function plan(city, at, k, x = {}) { (city.agenda = city.agenda || []).push({ at: Math.round(at * 1e6) / 1e6, k, ...x }); }
const inWeek = (wk) => (wk + 0.05 + rand() * 0.9) / 48;
const humanOwned = (city, l) => !!l.owner && (l.owner.k === 'p' ? !!city.players[l.owner.id] && !city.players[l.owner.id].bot : humanCoop(city, city.holdings[l.owner.id]));
function planWeek(city, wk) {
  Object.values(city.players).forEach((p) => {
    if (p.bot) { if (rand() < 0.27) plan(city, inWeek(wk), 'bot', { pid: p.id }); return; }
    const waiting = (city.agenda || []).filter((e) => e.k === 'decision' && e.pid === p.id).length;
    if (p.inbox.length + waiting < 3 && rand() < 0.12) plan(city, inWeek(wk), 'decision', { pid: p.id });
  });
  city.listings.forEach((l) => {
    if (!l.ops || l.ops.managed || !humanOwned(city, l)) return;
    if (rand() < 0.33) plan(city, inWeek(wk), 'happening', { lid: l.id });
    if ((l.type === 'film' || l.type === 'music') && rand() < (OPS.hasSp(l, 'hit') ? 1.5 : 1) / 130) plan(city, inWeek(wk), 'hit', { lid: l.id });
    // a rare VIP guest books a hotel; a better reputation draws them more often
    if (OPS.hosts(l) && rand() < VIP.week * (0.5 + l.ops.rep / 100)) plan(city, inWeek(wk), 'vip', { lid: l.id });
  });
  // vineyards harvest once a year, each in its own week of the autumn; auto repair shops build a tuner car for the spring show (CRAFT)
  city.listings.forEach((l) => { if (makes(l) && l.owner && wk % 48 === harvestWeek(l)) plan(city, inWeek(wk), 'vintage', { lid: l.id }); });
  planWorld(city, wk);
}
// the next world card lands somewhere in the first half of its quarter. It is planned a quarter ahead
// (right after the last card fired), so the Market tab can count down to the real moment.
function planWorld(city, wk) {
  if ((city.agenda || []).some((e) => e.k === 'world')) return;
  const q = Math.floor(wk / 12), done = !!city.lastCard && Math.floor(city.lastCard.m / 3) >= q, base = (done ? q + 1 : q) * 12;
  plan(city, Math.max(base + 0.5 + rand() * 6, wk + 0.05 + rand() * 0.9) / 48, 'world');
}
// game month (fractional) the next world card is due
export function nextWorldM(city) {
  const e = (city.agenda || []).find((x) => x.k === 'world');
  return e ? e.at * 12 : (Math.floor(city.m / 3) + 1) * 3 + 0.5;
}
// the company makes a collectible once a year (CRAFT in content.js); a type whose car list is still empty makes nothing
export const makes = (l) => { const cf = l && CRAFT[l.type]; return !!cf && !(cf.spec.models && !cf.spec.models.length); };
export const harvestWeek = (l) => (CRAFT[l.type] || CRAFT.vineyard).spec.harvest + hashId(l.id) % 6;
// the specialists leading a department in this company (ratings), the ones who make a better vintage
function leadRatings(city, l) {
  const p = bossOf(city, l.owner); if (!p || p.bot || !city.talent) return [];
  return Object.entries(p.assign || {}).filter(([, a]) => a && a.lid === l.id).map(([spec]) => city.talent[p.team && p.team[spec]]).filter((t) => t && t.leave == null).map((t) => t.rating);
}
// sommeliers (SOMMELIER) heading a department of a hotel, restaurant or vineyard
export function sommeliers(city, l) {
  if (!SOMMELIER.types.includes(l.type) || !l.owner || !city.talent) return [];
  const p = bossOf(city, l.owner); if (!p || !p.team) return [];
  return Object.keys(SOMMELIER).filter((tid) => tid !== 'types' && TAL.PERSON[tid] && p.team[TAL.PERSON[tid].kind] === tid && hasHead(city, l, p, TAL.PERSON[tid].kind) && city.talent[tid] && city.talent[tid].leave == null);
}
function vintageExtra(city, l) { return sommeliers(city, l).reduce((a, tid) => ({ chance: a.chance + SOMMELIER[tid].chance, bump: a.bump + SOMMELIER[tid].bump }), { chance: 0, bump: 0 }); }
export function vintageOdds(city, l) {
  const V = (CRAFT[l.type] || CRAFT.vineyard).spec, h = leadRatings(city, l), sum = h.reduce((a, r) => a + r, 0), x = vintageExtra(city, l);
  return { heads: h.length, chance: Math.min(V.maxChance, V.chance + V.perHead * h.length + x.chance), base: V.chance, bump: Math.min(V.maxBump, V.bump * sum + x.bump), top: V.top[l.size], somm: sommeliers(city, l) };
}
function runAgenda(city, g) {
  if (!city.agenda || !city.agenda.length) return;
  const due = city.agenda.filter((e) => e.at <= g + 1e-9).sort((a, b) => a.at - b.at); if (!due.length) return;
  city.agenda = city.agenda.filter((e) => e.at > g + 1e-9);
  due.forEach((e) => { settleAll(city, Math.max(city.g, e.at)); const f = AGENDA[e.k]; if (f) f(city, e); });
}
const AGENDA = {
  world: (city, e) => { worldCard(city, city.m); planWorld(city, Math.floor(e.at * 48 + 1e-6)); },
  bot: (city, e) => { const p = city.players[e.pid]; if (p && p.bot) botAct(city, p, city.m); },
  decision: (city, e) => {
    const p = city.players[e.pid]; if (!p || p.bot || p.inbox.length >= 3) return;
    const types = new Set(ownedBy(city, 'p', p.id).map((l) => l.type)), m = city.m;
    const pool = DECISIONS.filter((d) => (!d.needs || types.has(d.needs)) && !p.inbox.some((x) => x.def === d.id)); if (!pool.length) return;
    const d = pick(pool), x = { id: uid('d'), def: d.id, m, dueM: m + 2 }; p.inbox.push(x);
    decisionMail(city, p, x);
  },
  vip: (city, e) => { const l = listing(city, e.lid); if (l && l.ops && !l.ops.managed && humanOwned(city, l)) OPS.vipBooking(city, CTX, l); },
  happening: (city, e) => {
    const l = listing(city, e.lid); if (!l || !l.ops || l.ops.managed || !humanOwned(city, l)) return;
    if (mailWaiting(city, l)) return; // one open question per company at a time: the staff wait for your answer
    happening(city, l, pick(HAPPENINGS));
  },
  vintage: (city, e) => {
    // the yearly collectible: a vintage at a vineyard, a tuner car at an auto repair shop (CRAFT)
    const l = listing(city, e.lid); if (!l || !l.owner || !makes(l)) return;
    const yr = Math.floor(city.m / 12); if (l.vintY === yr) return; l.vintY = yr;
    const w = CRAFT[l.type].words, wine = CRAFT[l.type].cat === 'wine';
    const r = LIFE.vintage(city, l, { heads: leadRatings(city, l), extra: vintageExtra(city, l), name: l.title || TYPES[l.type].name });
    const co = `${l.title || TYPES[l.type].name} in ${l.district}`;
    if (!r.def) { notifyOwner(city, l, wine ? `Harvest at ${co}` : `${w.event[0].toUpperCase() + w.event.slice(1)} at ${co}`, wine ? `A good year for drinking wine, but nothing worth laying down. Next harvest in a year (chance ${Math.round(r.chance * 100)}%).` : `${w.none} Next ${w.event} in a year (chance ${Math.round(r.chance * 100)}%).`, 'info'); return; }
    const d = r.def, n = (k) => `${k} ${k > 1 ? w.units : w.unit}`;
    // run by bots or an autopilot coop: everything goes straight to the dealer
    if (isManaged(city, l)) { const v = LIFE.cellarSellAll(city, l, d.id); credit(city, l.owner, v); return; }
    const head = wine ? `${co} bottled a ${d.rarity.toLowerCase()} vintage` : `${co} ${w.made} a ${d.rarity.toLowerCase()} ${w.item}`;
    notifyOwner(city, l, head, `${wine ? `${n(d.ed)} of ${d.name} are` : `${n(d.ed)}: ${d.name}. ${d.ed > 1 ? 'They are' : 'It is'}`} in the ${w.store}, worth about ${Math.round(LIFE.itemValue(city, d.id) * 1e4) / 1e4} M each. Sell to the ${w.dealerKind}, at auction or move to your ${w.home}.`, 'good');
    if (d.rarity === 'Epic' || d.rarity === 'Legendary') news(city, city.m, wine ? `${co} bottles a ${d.rarity.toLowerCase()} vintage` : `${co} unveils a ${d.rarity.toLowerCase()} ${w.item}`, `${d.name}: only ${n(d.ed)} exist${d.ed > 1 ? '' : 's'}.`, 'info');
  },
  hit: (city, e) => {
    const l = listing(city, e.lid); if (!l || !l.owner || l.owner.k !== 'p') return; const p = city.players[l.owner.id]; if (!p) return;
    if (!hasHead(city, l, p, 'sofia') && OPS.automation(l, 'social') <= 0) return; // Marketing department
    const m = city.m, film = l.type === 'film', v = r2((film ? 8 : 3) * SIZES[l.size].mult); p.cash += v; p.inf += 1;
    if (film) { feed(p, m, 'Your new film is a blockbuster', `+${v} M and +1 Influence.`, 'good'); if (!p.bot) news(city, m, `${p.name} scores a blockbuster`, 'Lines around the block in Crown Hills.', 'info'); }
    else { feed(p, m, `${l.title || TYPES[l.type].name} has a hit single`, `+${v} M and +1 Influence.`, 'good'); if (!p.bot) news(city, m, `${p.name}'s studio has a hit`, `${l.title || TYPES[l.type].name} is on every playlist in Aurex Bay.`, 'good'); }
  }
};
function happening(city, l, h) {
  const o = l.ops, co = MAIL.coName(l), s = SIZES[l.size].mult, mh = MAIL_HAP[h.id] || {};
  const dept = mh.dept || h.guard || 'ops', g = h.guard && o.depts[h.guard];
  const fill = (t) => t.replace(/\{co\}/g, co);
  const base = { from: staffFrom(city, l, dept), lid: l.id, kind: h.kind };
  if (h.kind === 'bad' && g && (OPS.roleOn(g) || OPS.automation(l, h.guard) >= 0.5)) {
    mailTo(city, l, { ...base, from: staffFrom(city, l, h.guard), subj: mh.subj || h.title, body: fill(mh.saved || `${h.text} ${h.saved}`), kind: 'good' }); return;
  }
  if (mh.opts) {
    const opts = mh.opts.map((x) => { const fx = MAIL.scaleFx(x.fx, s); return { l: x.l, d: x.d ? x.d.replace(/(\d+(?:\.\d+)?) M/g, (_, v) => `${Math.round(v * s * 100) / 100} M`) : MAIL.fxText(fx), fx, ...(x.safe ? { safe: true } : {}) }; });
    mailTo(city, l, { ...base, subj: mh.subj, body: fill(mh.body), opts, due: Math.round((city.g + MAIL.WAIT) * 1e5) / 1e5, own: ownKey(l) }); return;
  }
  const bits = companyFx(city, l, MAIL.scaleFx(h.fx, s)); if (bits === null) return;
  mailTo(city, l, { ...base, subj: mh.subj || h.title, body: fill(mh.body || h.text), fxt: bits.join(', ') });
}
export const _happening = (city, l, h) => happening(city, l, h); // tests
// what a happening or an answer does to a company; null when there is nothing it can hit (no stock to lose)
function companyFx(city, l, fx) {
  const o = l.ops, bits = []; if (!fx) return bits;
  if (fx.gamble) { const win = rand() < fx.gamble[0], r = companyFx(city, l, fx.gamble[win ? 1 : 2]) || []; return [win ? 'It worked' : 'It backfired', ...r]; }
  if (fx.rep) { o.rep = Math.max(0, Math.min(100, o.rep + fx.rep)); bits.push(`reputation ${fx.rep > 0 ? '+' : '−'}${Math.abs(fx.rep)}`); }
  if (fx.cust) { o.customers = Math.max(20, Math.min(400, o.customers * (1 + fx.cust))); bits.push(`customers ${fx.cust > 0 ? '+' : '−'}${Math.round(Math.abs(fx.cust) * 100)}%`); }
  if (fx.morale) { o.morale = Math.max(0, Math.min(100, o.morale + fx.morale)); bits.push(`morale ${fx.morale > 0 ? '+' : '−'}${Math.abs(fx.morale)}`); }
  if (fx.rp) { o.rp += fx.rp; bits.push(`+${fx.rp} research points`); }
  if (fx.cash) { const v = r2(fx.cash); credit(city, l.owner, v); bits.push(`${v > 0 ? '+' : '−'}${Math.abs(v)} M`); }
  if (fx.stock) { const gs = Object.keys(o.inv).filter((g) => o.inv[g] >= 1); if (!gs.length) return bits.length ? bits : null; const g = pick(gs), q = Math.round(o.inv[g] * fx.stock); o.inv[g] -= q; bits.push(`${q} ${GOODS[g].unit} of ${GOODS[g].name.toLowerCase()} lost`); }
  return bits;
}

// ---------------------------------------------------------------- mail
const ownKey = (l) => (l.owner ? `${l.owner.k}:${l.owner.id}` : '');
const firstName = (n) => String(n || '').split(' ')[0];
// the person who writes from a company's department: its specialist head if there is one, else someone on the team
function staffFrom(city, l, dept) {
  const d = l.ops && l.ops.depts[dept], dn = (OPS.deptFor(l, dept) || OPS.DEPT.ops).name, co = l.title || TYPES[l.type].name;
  const tid = d && d.head && d.who && TAL.PERSON[d.who] ? d.who : null;
  if (tid) return { n: TAL.PERSON[tid].name, r: `Head of ${dn}, ${co}`, tid };
  return { n: MAIL.staffer(l, dept), r: `${dn}, ${co}` };
}
function mailWaiting(city, l) {
  const ps = l.owner.k === 'p' ? [city.players[l.owner.id]] : Object.keys((city.holdings[l.owner.id] || { members: {} }).members).map((id) => city.players[id]);
  return ps.some((q) => q && (q.mail || []).some((x) => x.lid === l.id && !x.dec && MAIL.isOpen(x)));
}
// a company's mail goes to its owner, or to every human co-owner (answering one answers them all)
function mailTo(city, l, x) {
  if (!l.owner) return;
  if (l.owner.k === 'p') { MAIL.send(city.players[l.owner.id], { g: city.g, m: city.m, ...x }); return; }
  const h = city.holdings[l.owner.id]; if (!h) return; const ref = uid('mr');
  Object.keys(h.members).forEach((pid) => MAIL.send(city.players[pid], { g: city.g, m: city.m, ref, ...x, from: { ...x.from, r: `${x.from.r} · ${h.name}` } }));
}
// a specialist writes to their employer: a tycoon, or every human owner of a coop (their answers act for the coop)
function mailEmp(city, p, x) {
  if (!p) return; const g = city.g, m = city.m;
  if (!p.coop) { MAIL.send(p, { g, m, ...x }); return; }
  const ref = uid('mr'), opts = x.opts && x.opts.map((o) => (o.act ? { ...o, act: [o.act[0], { ...o.act[1], coop: p.id }] } : o));
  p.people.filter((q) => !q.bot).forEach((q) => MAIL.send(q, { g, m, ref, ...x, ...(opts ? { opts } : {}), from: { ...x.from, r: `${x.from.r} · ${p.name}` } }));
}
function decisionMail(city, p, x) {
  const def = DECISIONS.find((d) => d.id === x.def), f = DEC_FROM[def.id] || {};
  const l = def.needs ? ownedBy(city, 'p', p.id).find((k) => k.type === def.needs) : null;
  const from = f.ext ? { n: f.ext[0], r: f.ext[1], k: f.k } : l ? staffFrom(city, l, f.dept || 'ops') : { n: 'Your office', r: 'Harbor Row' };
  MAIL.send(p, { g: city.g, m: city.m, from, subj: def.title, body: def.text, kind: 'info', dec: x.id, dueM: x.dueM, ...(l ? { lid: l.id } : {}), opts: def.options.map((o) => ({ l: o.l, d: o.d, ...(o.safe ? { safe: true } : {}) })) });
}
function closeMail(city, p, x, ix, auto, out, by) {
  const done = { ix, auto: !!auto, out: out || '', by: by || null, g: city.g };
  const ids = x.ref ? Object.values(city.players).filter((q) => !q.bot && q.mail) : [p];
  ids.forEach((q) => (q.mail || []).forEach((y) => { if (y === x || (x.ref && y.ref === x.ref && !y.done)) y.done = done; }));
}
// a talent action answered from a mail, as the tycoon or for their coop
function mailTalent(city, p, action, args) {
  const a = { ...args }; let emp = p;
  if (a.coop) { const h = city.holdings[a.coop]; if (!h || !h.members[p.id]) return err('Not your coop any more.'); emp = TAL.coopEmp(city, h); }
  if (a.oid && !a.tid) { const o = (city.tOffers || []).find((y) => y.id === a.oid); if (!o || o.status !== 'open') return err('This offer is closed.'); a.tid = o.tid; }
  return TAL.act(city, emp, action, a, { ...TCTX, inactive: (y) => inactive(city, y) }) || err('Not possible any more.');
}
export function answerMail(city, p, id, ix, auto) {
  const x = MAIL.find(p, id); if (!x) return err('This mail is gone.');
  if (!MAIL.isOpen(x)) return err('Already answered.');
  const o = x.opts[ix]; if (!o) return err('Unknown answer.');
  if (x.dec) { const r = resolveDecisionFor(city, p, x.dec, ix, auto); if (r.ok === false) closeMail(city, p, x, ix, auto, 'Too late: this was settled.'); return r; }
  let out = '';
  if (o.fx) {
    const l = listing(city, x.lid);
    if (!l || !l.ops || ownKey(l) !== x.own) out = 'The company is no longer yours.';
    else { const bits = companyFx(city, l, o.fx); out = bits && bits.length ? bits.join(', ') + '.' : 'Done.'; }
  }
  if (o.tfx) { const s = city.talent && city.talent[o.tfx.tid]; if (s) { if (o.tfx.sat) s.sat = Math.max(0, Math.min(100, s.sat + o.tfx.sat)); } out = out || 'Noted.'; }
  if (o.fwd) out = forwardIntel(city, p, x);
  if (o.act) {
    const r = mailTalent(city, p, o.act[0], o.act[1]);
    if (r.ok === false && !auto) return r;
    out = r.msg || (r.ok === false ? 'Could not be done.' : 'Done.');
  }
  closeMail(city, p, x, ix, auto, out || 'Noted.', p.name);
  return { ok: true, msg: `${o.l}. ${out}`.trim() };
}
// once a week: the autopilot answers staff mails left for two weeks; offers that closed elsewhere close their mail
function mailWeek(city) {
  Object.values(city.players).forEach((p) => {
    if (p.bot || !p.mail) return;
    p.mail.filter(MAIL.isOpen).forEach((x) => {
      if (x.oid) { const o = (city.tOffers || []).find((y) => y.id === x.oid); if (!o || o.status !== 'open') closeMail(city, p, x, -1, true, o ? `The offer was ${o.status === 'accepted' ? 'accepted' : o.status === 'declined' ? 'declined' : 'closed'}.` : 'The offer is closed.'); return; }
      if (x.dec) { if (!p.inbox.some((d) => d.id === x.dec)) closeMail(city, p, x, -1, true, 'Settled.'); return; }
      if (x.due != null && x.due <= city.g + 1e-9) answerMail(city, p, x.id, MAIL.autoPick(x, p.policy, rand), true);
    });
  });
}
// decisions from before mail existed get their mail
function mailSync(city) { Object.values(city.players).forEach((p) => { if (!p.bot && p.inbox && p.inbox.length) p.inbox.forEach((d) => { if (!(p.mail || []).some((y) => y.dec === d.id)) decisionMail(city, p, d); }); }); }
function newsletterMonth(city, m) {
  const n = MAIL.newsletter(city, m, ADS.live(city).filter((a) => listing(city, a.lid))); if (!n) return;
  Object.values(city.players).forEach((p) => { if (!p.bot && !p.admin) MAIL.send(p, { g: city.g, m, from: { n: GAZETTE.name, r: GAZETTE.role, k: 'press' }, subj: `${monthName(m - 1)} in Aurex Bay`, kind: 'news', news: n.items, ...(n.ad ? { ad: n.ad } : {}) }); });
}
function monthBoundary(city, m) {
  settleAll(city, m / 12); city.m = m;
  // upgrades finish
  city.listings.forEach((l) => { if (l.upgrade && l.upgrade.doneM <= m) { l.level = l.upgrade.to; l.upgrade = null; const o = ownerName(city, l); notifyOwner(city, l, `${TYPES[l.type].name} in ${l.district} reached level ${l.level}`, `Income is now higher. ${o}`, 'good'); } });
  // stocks drift every month
  weekBoundary(city, m * 4, true);
  if (city.fx && city.fx.untilM <= m) city.fx = null;
  influenceMonth(city, m);
  if (m % 12 === 0) yearReview(city, m);
  OPS.ensureMarket(city);
  const running = city.listings.filter((l) => l.owner);
  CAR.refresh(city, cctx(city));
  running.forEach((l) => { if (!l.ops) l.ops = OPS.newOps(l, isManaged(city, l)); if (city.life && l.owner.k === 'p' && city.players[l.owner.id]) l.ops.pt = LIFE.tierOf(city, city.players[l.owner.id]); OPS.produce(city, CTX, l, m); });
  running.forEach((l) => OPS.autoSell(city, CTX, l));
  shuffle(running).forEach((l) => OPS.autoBuy(city, CTX, l));
  OPS.marketMonth(city);
  running.forEach((l) => OPS.closeMonth(l, m, monthLines(city, l)));
  // warehouse automation only runs when a logistics specialist (Carlos) is on staff
  Object.values(city.players).filter((p) => !p.bot && hasStaff(p, 'carlos')).forEach((p) => LOG.monthly(city, p, OPS.needsPerMonth, (g) => OPS.importPrice(city, g), m / 12));
  if (city.talent) TAL.monthStep(city, m, { ...TCTX, inactive: (p) => inactive(city, p) });
  if (city.life) LIFE.monthStep(city, m, LCTX);
  CAR.monthStep(city, m, cctx(city));
  takeoverMonth(city, m);
  centralMonth(city, m);
  holdingsMonthly(city, m);
  resolveBotReplies(city, m);
  decisionsMonthly(city, m);
  if (m > 0) newsletterMonth(city, m);
  botHoldingsAct(city, m);
  botSocial(city, m);
  ADS.botMonth(city, (id) => !!(city.players[id] && city.players[id].bot));
  Object.values(city.players).forEach((p) => solvency(city, p, m));
  Object.values(city.players).forEach((p) => {
    p.hist.push([m, netWorth(city, p.id)]); if (p.hist.length > 130) p.hist.shift();
    if (!p.phist) p.phist = []; p.phist.push([m, r2(stockValue(city, p)), r2(Object.values(p.cost || {}).reduce((a, b) => a + b, 0)), r2(p.realized || 0)]); if (p.phist.length > 130) p.phist.shift();
  });
}
function centralMonth(city, m) {
  const cb = CB.ensure(city), l = listing(city, CB.ID);
  const levied = city.listings.filter((x) => x.owner && CB.sectorLevy(city, x.type)).reduce((a, x) => { const y = listingYield(city, x, x.owner); return a + Math.max(0, y.ypi) / (1 - CB.sectorLevy(city, x.type) / 100) * CB.sectorLevy(city, x.type) / 100 / 12; }, 0) + (cb.gl || 0);
  cb.gl = 0;
  CB.monthStep(city, m, { rand, collected: levied, owned: () => !!l && humanOwned(city, l), activeGovernor: () => !!l && cctx(city).owners(l).some((p) => !inactive(city, p)), news: (t, x, k) => news(city, m, t, x, k) });
}
function worldCard(city, m) {
  if (!city.deck.length) city.deck = shuffle(WORLD.map((w) => w.id));
  const cardId = city.deck.shift(); const card = WORLD.find((w) => w.id === cardId);
  if (!city.deck.length) city.deck = shuffle(WORLD.map((w) => w.id));
  const prev = city.econ;
  city.econ = card.econ || (prev === 'Crisis' ? 'Recession' : prev === 'Recession' ? (rand() < 0.5 ? 'Stable' : 'Recession') : prev === 'Boom' ? (rand() < 0.6 ? 'Boom' : 'Stable') : 'Stable');
  let policy = '';
  if (!card.econ) { const n = CB.nudge(city, city.econ, rand); if (n.moved) { city.econ = n.econ; policy = n.moved > 0 ? ' Cheap money from the Bank of Aurex lifts the mood.' : ' Tight money from the Bank of Aurex holds the city back.'; } }
  Object.entries(card.shock).forEach(([k, v]) => { const st = city.stocks[k]; st.p = Math.max(0.1, r2(st.p * (1 + v))); st.h[st.h.length - 1] = st.p; });
  if (card.fx === 'energy') city.fx = { id: 'energy', untilM: m + 3 };
  const players = Object.values(city.players);
  if (card.fx === 'cyber') city.listings.filter((l) => l.owner && (l.type === 'chip' || l.type === 'data')).forEach((l) => {
    const loss = r2(3 * SIZES[l.size].mult);
    if (OPS.cyberProtected(l)) notifyOwner(city, l, 'Your R&D team stopped a cyberattack', `${TYPES[l.type].name} in ${l.district} stayed online.`, 'good');
    else { debit(city, l.owner, loss); notifyOwner(city, l, `Hackers hit your ${TYPES[l.type].name}`, `${l.district}: −${loss} M. A fully staffed R&D department, or Anika Rao as its head, stops attacks.`, 'bad'); }
  });
  if (card.fx === 'regulation') city.listings.filter((l) => l.owner && ['tech', 'finance'].includes(TYPES[l.type].group)).forEach((l) => {
    if (OPS.legallyCovered(l)) notifyOwner(city, l, `Audit passed at ${TYPES[l.type].name}`, 'Legal & Compliance had every file in order. No fine.', 'good');
    else { const fine = r2(2 * SIZES[l.size].mult); debit(city, l.owner, fine); notifyOwner(city, l, `Auditors fined your ${TYPES[l.type].name} ${fine} M`, 'Strict compliance, a reviewed contract file or Robert Hayes as head of Legal would have prevented it.', 'bad'); }
  });
  const bonus = { viral: 'fashion', tourism: 'hotel', ai: 'data' }[card.fx];
  if (bonus) city.listings.filter((l) => l.owner && (l.type === bonus || (bonus === 'fashion' && l.type === 'clothing'))).forEach((l) => { const v = r2((l.type === 'clothing' ? 1 : 2) * SIZES[l.size].mult); payOwner(city, l, v); notifyOwner(city, l, `${card.title}: +${v} M`, `Your ${TYPES[l.type].name} in ${l.district} cashed in.`, 'good'); });
  city.lastCard = { id: card.id, m, prev };
  news(city, m, card.title, card.text + (city.econ !== prev ? ` The economy moves from ${prev.toLowerCase()} to ${city.econ.toLowerCase()}.` : '') + policy, card.econ === 'Crisis' || card.econ === 'Recession' ? 'bad' : card.econ === 'Boom' ? 'good' : 'info', { world: card.id, at: card.at });
}
// Influence used to arrive all at once at New Year. Now every source pays on its own anniversary month,
// so a little lands somewhere in the city every month: a studio on the month it was bought, specialists and prestige on dates of their own.
function influenceMonth(city, m) {
  Object.values(city.players).forEach((p) => {
    const owned = ownedBy(city, 'p', p.id), off = hashId(p.id) % 12, at = (k) => (m + off + k) % 12 === 0;
    owned.filter((l) => (l.type === 'film' || l.type === 'music') && l.boughtM !== null && m > l.boughtM && (m - l.boughtM) % 12 === 0).forEach((l) => { p.inf += 1; if (!p.bot) feed(p, m, `${l.title || TYPES[l.type].name} had a strong year`, '+1 Influence.', 'good'); });
    owned.filter((l) => (l.type === 'chip' || l.type === 'data') && !p.est[l.id] && l.boughtM !== null && m - l.boughtM >= 12).forEach((l) => { p.est[l.id] = true; p.inf += 2; feed(p, m, `${TYPES[l.type].name} is established`, '+2 Influence.', 'good'); });
    if (at(0) && hasStaff(p, 'sofia')) { p.inf += 2; if (!p.bot) feed(p, m, 'Your media contacts pay off', '+2 Influence.', 'good'); }
    if (at(4) && hasStaff(p, 'carlos')) { p.inf += 1; if (!p.bot) feed(p, m, 'Your logistics network is talked about', '+1 Influence.', 'good'); }
    if (at(6) && !p.bot && (CAR.hasSpec(p, 'research') || CAR.hasSpec(p, 'star'))) { const n = (CAR.hasSpec(p, 'research') ? 1 : 0) + (CAR.hasSpec(p, 'star') ? 1 : 0); p.inf += n; feed(p, m, 'Your name carries weight', `+${n} Influence from your specialisation.`, 'good'); }
    if (at(8) && city.life) { const t = LIFE.tierOf(city, p); if (t) { p.inf += t; if (!p.bot) feed(p, m, `Prestige: +${t} Influence`, `Being ${LIFE.prestige(city, p).name} in Aurex Bay pays off.`, 'good'); } }
  });
}
function yearReview(city, m) {
  const top = standings(city).slice(0, 3);
  news(city, m, `Year ${m / 12} in review`, `Richest tycoons: ${top.map((t, i) => `${i + 1}. ${t.name} (${Math.round(t.nw)} M)`).join(', ')}.`, 'info');
}
function payOwner(city, l, v) { if (!l.owner) return; if (l.owner.k === 'p') city.players[l.owner.id].cash += v; else { const h = city.holdings[l.owner.id]; h.treasury += v; h.accrued += v; } }
function ownerName(city, l) { if (!l.owner) return ''; return l.owner.k === 'p' ? '' : `(${city.holdings[l.owner.id].name})`; }
function notifyOwner(city, l, title, text, kind) {
  if (!l.owner) return;
  if (l.owner.k === 'p') feed(city.players[l.owner.id], city.m, title, text, kind);
  else Object.keys(city.holdings[l.owner.id].members).forEach((pid) => city.players[pid] && feed(city.players[pid], city.m, `${city.holdings[l.owner.id].name}: ${title}`, text, kind));
}
function solvency(city, p, m) {
  if (p.cash >= 0) return;
  const room = loanCap(city, p) - debt(p);
  if (room > 0) { const amt = Math.min(room, Math.ceil(-p.cash / 5) * 5); p.loans.push({ amt, rate: 'bank', m }); p.cash += amt; feed(p, m, `The bank covered your overdraft with a ${amt} M loan`, 'Your account went negative. Keep an eye on costs.', 'bad'); }
  if (p.cash < 0) { const l = ownedBy(city, 'p', p.id).sort((a, b) => listingValue(a) - listingValue(b))[0]; if (l) { const v = r2(listingValue(l) * 0.7); p.cash += v; releaseListing(city, l); feed(p, m, `Forced sale: ${TYPES[l.type].name} in ${l.district}`, `Sold for ${v} M to cover your debts.`, 'bad'); } }
}
function releaseListing(city, l) {
  if (l.owner && l.owner.k === 'p') CAR.count(city.players[l.owner.id], 'sold');
  if (l.owner) { const p = l.owner.k === 'p' ? city.players[l.owner.id] : city.holdings[l.owner.id]; if (p && p.assign) Object.keys(p.assign).forEach((k) => { if (p.assign[k].lid === l.id) delete p.assign[k]; }); }
  city.book = (city.book || []).filter((o) => o.lid !== l.id);
  l.owner = null; l.upgrade = null; l.boughtM = null; l.ops = null; city.contracts = city.contracts.filter((c) => c.a !== l.id && c.b !== l.id);
}

// ---------------------------------------------------------------- holdings (coop parent companies)
function holdingsMonthly(city, m) {
  Object.values(city.holdings).forEach((h) => {
    const pay = r2(Math.min(h.treasury, h.accrued * h.payout)); h.accrued = 0;
    if (pay > 0.05) { const t = holdingShares(h); Object.entries(h.members).forEach(([pid, sh]) => { const p = city.players[pid]; if (p) { const v = pay * sh / t; p.cash += v; if (!p.bot) feed(p, m, `Dividend from ${h.name}`, `+${r2(v)} M (${Math.round(sh / t * 100)}% stake).`, 'good'); } }); h.treasury -= pay; }
    h.proposals.filter((pr) => pr.status === 'open' && pr.dueM <= m).forEach((pr) => closeProposal(city, h, pr, true));
    h.hist.push([m, holdingNav(city, h)]); if (h.hist.length > 130) h.hist.shift();
  });
}
function voteTally(h, pr) { let yes = 0, no = 0; Object.entries(pr.votes).forEach(([pid, v]) => { const s = h.members[pid] || 0; if (v) yes += s; else no += s; }); return { yes, no, total: holdingShares(h) }; }
function botVotes(city, h, pr) {
  Object.keys(h.members).forEach((pid) => { const p = city.players[pid]; if (!p || !p.bot || pid in pr.votes) return;
    const l = pr.lid ? listing(city, pr.lid) : null; const cost = pr.kind === 'buy' ? listingPrice(l) : pr.kind === 'upgrade' ? upgradeCost(l) : 0;
    const ok = h.treasury - cost >= 0; pr.votes[pid] = ok && rand() < (p.style === 'cautious' ? 0.6 : 0.8); });
}
function closeProposal(city, h, pr, deadline) {
  const t = voteTally(h, pr);
  const pass = t.yes > t.total / 2 || (deadline && t.yes > t.no);
  if (!pass && !deadline) return;
  pr.status = pass ? 'passed' : 'rejected';
  const l = pr.lid ? listing(city, pr.lid) : null;
  let text = '';
  if (pass) {
    if (pr.kind === 'buy') { const price = listingPrice(l); if (l.owner || h.treasury < price) { pr.status = 'failed'; text = 'Could not complete: the company is gone or the treasury is short.'; } else { h.treasury -= price; assignOwner(city, l, { k: 'h', id: h.id }, city.m); text = `${h.name} bought ${TYPES[l.type].name} in ${l.district} for ${price} M.`; news(city, city.m, `${h.name} buys ${TYPES[l.type].name}`, `${l.district} is now owned by a coop.`, 'info'); } }
    if (pr.kind === 'upgrade') { const c = upgradeCost(l); if (!ownerIs(l, 'h', h.id) || l.upgrade || h.treasury < c) { pr.status = 'failed'; text = 'Could not start the upgrade.'; } else { h.treasury -= c; l.upgrade = { to: l.level + 1, doneM: city.m + upgradeMonths(l) }; text = `Upgrade of ${TYPES[l.type].name} to level ${l.level + 1} started.`; } }
    if (pr.kind === 'sell') { if (ownerIs(l, 'h', h.id)) { const v = r2(listingValue(l) * 0.8); h.treasury += v; releaseListing(city, l); text = `Sold ${TYPES[l.type].name} for ${v} M.`; } }
    if (pr.kind === 'payout') { h.payout = pr.pct; text = `Dividend payout set to ${Math.round(pr.pct * 100)}% of profits.`; }
  } else text = 'The owners voted it down.';
  Object.keys(h.members).forEach((pid) => { const p = city.players[pid]; if (p && !p.bot) feed(p, city.m, `${h.name}: proposal ${pr.status}`, `${proposalLabel(city, pr)}. ${text}`, pr.status === 'passed' ? 'good' : 'info'); });
}
export function proposalLabel(city, pr) {
  const l = pr.lid ? listing(city, pr.lid) : null;
  if (pr.kind === 'buy') return `Buy ${TYPES[l.type].name} in ${l.district} (${listingPrice(l)} M)`;
  if (pr.kind === 'upgrade') return `Upgrade ${TYPES[l.type].name} in ${l.district} to level ${l.level + 1} (${upgradeCost(l)} M)`;
  if (pr.kind === 'sell') return `Sell ${TYPES[l.type].name} in ${l.district}${l.owner ? ` (${r2(listingValue(l) * 0.8)} M to the treasury)` : ''}`;
  if (pr.kind === 'payout') return `Set dividend payout to ${Math.round(pr.pct * 100)}%`;
  return pr.kind;
}

// ---------------------------------------------------------------- bots
function botAct(city, p, m) {
  const st = { aggressive: [0.15, 0.13, 0.12], balanced: [0.12, 0.1, 0.08], cautious: [0.08, 0.07, 0.05] }[p.style || 'balanced'];
  const mine = ownedBy(city, 'p', p.id), types = new Set(mine.map((l) => l.type));
  const room = p.style === 'aggressive' && debt(p) < 20 ? Math.max(0, Math.min(15, loanCap(city, p) - debt(p))) : 0;
  if (rand() < st[0]) {
    const free = city.listings.filter((l) => !l.owner && !TYPES[l.type].starter && !CB.isBank(l) && listingPrice(l) <= p.cash - 1 + room);
    if (free.length) {
      const syn = free.filter((l) => SYNERGY.some(([a, b]) => (l.type === b && types.has(a)) || (l.type === a && types.has(b))));
      const l = syn.length && rand() < 0.6 ? pick(syn) : pick(free), price = listingPrice(l);
      if (price > p.cash - 1) { const amt = Math.ceil((price - p.cash + 2) / 5) * 5; p.loans.push({ amt, rate: 'bank', m }); p.cash += amt; }
      p.cash -= price; assignOwner(city, l, { k: 'p', id: p.id }, m);
      news(city, m, `${p.name} buys ${TYPES[l.type].name}`, `${l.district} · ${price} M.`, 'info', { who: p.id });
    }
  }
  if (rand() < st[1]) { const l = mine.filter((x) => !x.upgrade && x.level < 5 && upgradeCost(x) < p.cash - 3)[0]; if (l) { p.cash -= upgradeCost(l); l.upgrade = { to: l.level + 1, doneM: m + upgradeMonths(l) }; } }
  if (city.talent) TAL.botStep(city, p, m, { ...TCTX, inactive: (x) => inactive(city, x) });
  if (rand() < st[2] && p.cash > 12) { const s = pick(STOCKS), q = 2 + Math.floor(rand() * 5); tradeStock(city, p, s.id, q); }
  else if (rand() < 0.05) { const k = Object.keys(p.shares)[0]; if (k) tradeStock(city, p, k, -p.shares[k]); }
  if (debt(p) && p.cash > debt(p) + 8) { p.cash -= debt(p); p.loans = []; }
  if (city.warehouses && rand() < 0.03 && mine.length >= 2 && !LOG.ownedWarehouses(city, p.id).length) { const w = city.warehouses.find((x) => !x.owner && LOG.SITE[x.id].price < p.cash - 10); if (w) { LOG.buy(city, p, w.id); news(city, m, `${p.name} buys ${LOG.SITE[w.id].name}`, 'More trucks on the roads of Aurex Bay.', 'info', { who: p.id }); } }
}
function botHoldingsAct(city, m) {
  const bots = Object.values(city.players).filter((p) => p.bot && !myHoldings(city, p.id).length);
  if (m >= 6 && Object.values(city.holdings).filter((h) => h.bot).length < 1 && bots.length >= 2 && rand() < 0.25) {
    const [a, b] = shuffle(bots).slice(0, 2), ca = Math.min(10, Math.floor(a.cash * 0.4)), cb = Math.min(10, Math.floor(b.cash * 0.4));
    if (ca >= 4 && cb >= 4) {
      const h = makeHolding(city, a.id, pick(HOLDING_NAMES.filter((n) => !Object.values(city.holdings).some((x) => x.name === n))), ca, m); h.bot = true;
      b.cash -= cb; h.treasury += cb; h.members[b.id] = cb;
      news(city, m, `${a.name} and ${b.name} found ${h.name}`, 'A new coop parent company is hunting for acquisitions.', 'info');
    }
  }
  Object.values(city.holdings).filter((h) => h.bot).forEach((h) => {
    if (rand() < 0.2) { const free = city.listings.filter((l) => !l.owner && !TYPES[l.type].starter && !CB.isBank(l) && listingPrice(l) <= h.treasury); if (free.length) { const l = pick(free); h.treasury -= listingPrice(l); assignOwner(city, l, { k: 'h', id: h.id }, m); news(city, m, `${h.name} buys ${TYPES[l.type].name}`, `${l.district} · ${listingPrice(l)} M.`, 'info'); } }
    if (rand() < 0.1) { const l = ownedBy(city, 'h', h.id).find((x) => !x.upgrade && x.level < 5 && upgradeCost(x) < h.treasury); if (l) { h.treasury -= upgradeCost(l); l.upgrade = { to: l.level + 1, doneM: m + upgradeMonths(l) }; } }
  });
}
function resolveBotReplies(city, m) {
  city.netReqs.filter((r) => r.status === 'open' && city.players[r.to] && city.players[r.to].bot && r.m < m).forEach((r) => {
    if (rand() < 0.7) linkNetwork(city, r.from, r.to, m); else { r.status = 'declined'; feed(city.players[r.from], m, `${city.players[r.to].name} declined your network request`, '', 'info'); }
  });
  city.contracts.filter((c) => c.status === 'pending' && city.players[c.to] && city.players[c.to].bot && c.m < m).forEach((c) => {
    if (rand() < 0.8 && contractValid(city, c.a, c.b, c.from, c.to, c.id).ok) activateContract(city, c, m); else { c.status = 'declined'; feed(city.players[c.from], m, `${city.players[c.to].name} declined your supply contract`, '', 'info'); }
  });
  Object.values(city.holdings).forEach((h) => { h.invites = h.invites.filter((inv) => {
    const p = city.players[inv.pid]; if (!p || !p.bot || inv.m >= m) return true;
    const amt = Math.min(15, Math.floor(p.cash * 0.4));
    if (amt >= 4 && rand() < 0.6 && !myHoldings(city, p.id).length) { joinHolding(city, h, p, amt, m); }
    else Object.keys(h.members).forEach((pid) => city.players[pid] && !city.players[pid].bot && feed(city.players[pid], m, `${p.name} declined to join ${h.name}`, '', 'info'));
    return false;
  }); });
  (city.offers || []).filter((o) => o.status === 'open' && city.players[o.to] && city.players[o.to].bot && o.m < m).forEach((o) => {
    const l = listing(city, o.lid); const need = listingValue(l) * (1.2 + rand() * 0.3);
    if (o.amount >= need) completeOffer(city, o, m); else { o.status = 'declined'; feed(city.players[o.from], m, `${city.players[o.to].name} turned down your offer`, `${o.amount} M for ${TYPES[l.type].name} in ${l.district} was too low.`, 'info'); }
  });
  city.offers = (city.offers || []).filter((o) => o.status === 'open' || m - o.m < 6);
  city.netReqs = city.netReqs.filter((r) => r.status === 'open' || m - r.m < 6);
  city.contracts = city.contracts.filter((c) => c.status === 'active' || c.status === 'pending' || m - c.m < 6);
}
function botSocial(city, m) {
  // coop partners leave notes on each other's company boards
  Object.values(city.holdings).forEach((h) => {
    const humans = Object.keys(h.members).filter((pid) => city.players[pid] && !city.players[pid].bot), bots = Object.keys(h.members).filter((pid) => city.players[pid] && city.players[pid].bot);
    humans.forEach((hid) => bots.forEach((bid) => {
      if (rand() > 0.12) return;
      const ls = ownedBy(city, 'p', hid).filter((l) => l.ops && !l.ops.managed); if (!ls.length) return;
      const l = pick(ls), mk = city.market, needs = Object.keys(OPS.needsPerMonth(l));
      const g = needs.length ? pick(needs) : null, diff = g ? Math.round((mk[g].p / GOODS[g].base - 1) * 100) : 0;
      const tips = [g && diff > 8 ? `${GOODS[g].name} is ${diff}% above normal. Maybe buy through a warehouse.` : null, g && diff < -5 ? `${GOODS[g].name} is cheap right now (${diff}%). Good moment to stock up.` : null,
        l.ops.morale < 45 ? 'Your crew looks tired. A team meeting might help.' : null, (l.ops.orders || []).some((o) => o.status === 'new') ? 'You have clients waiting for an answer.' : null,
        city.econ === 'Recession' ? 'Recession pricing: budget prices sell better now.' : city.econ === 'Boom' ? 'Boom times. Premium prices could pay off.' : null, 'Nice numbers this month. Keep it up.'].filter(Boolean);
      OPS.post(l, city.players[bid], pick(tips), Date.now());
    }));
  });
  if (city.listings.every((l) => l.owner) && rand() < 0.15) {
    const bot = pick(Object.values(city.players).filter((p) => p.bot && p.cash > 20)); const target = bot && pick(city.listings.filter((l) => l.owner && l.owner.k === 'p' && !CB.isBank(l) && !city.players[l.owner.id].bot && !city.players[l.owner.id].admin));
    if (bot && target && !city.offers.some((o) => o.status === 'open' && o.lid === target.id)) { const amt = Math.round(listingValue(target) * (1.1 + rand() * 0.4)); if (bot.cash >= amt) { city.offers.push({ id: uid('o'), lid: target.id, from: bot.id, to: target.owner.id, amount: amt, m, status: 'open' }); feed(city.players[target.owner.id], m, `${bot.name} offers ${amt} M for your ${TYPES[target.type].name}`, 'Accept or decline in the Empire tab.', 'info'); } }
  }
  Object.values(city.players).filter((p) => !p.bot).forEach((h) => {
    if (rand() < 0.06) { const b = pick(Object.values(city.players).filter((p) => p.bot && !h.net.includes(p.id) && !city.netReqs.some((r) => r.status === 'open' && r.from === p.id && r.to === h.id))); if (b) { city.netReqs.push({ id: uid('n'), from: b.id, to: h.id, m, status: 'open' }); feed(h, m, `${b.name} wants to join your network`, 'Accept in the Network tab to trade supply contracts.', 'info'); } }
    if (rand() < 0.08) {
      for (const bid of h.net) { const b = city.players[bid]; if (!b || !b.bot) continue;
        const pairs = []; ownedBy(city, 'p', b.id).forEach((bl) => ownedBy(city, 'p', h.id).forEach((hl) => { if (contractValid(city, bl.id, hl.id, b.id, h.id).ok) pairs.push([bl, hl]); }));
        if (pairs.length) { const [bl, hl] = pick(pairs); city.contracts.push({ id: uid('c'), a: bl.id, b: hl.id, from: b.id, to: h.id, status: 'pending', m }); feed(h, m, `${b.name} offers a supply contract`, `${TYPES[bl.type].name} (${bl.district}) ↔ your ${TYPES[hl.type].name} (${hl.district}).`, 'info'); break; }
      }
    }
  });
}

// ---------------------------------------------------------------- decisions with autopilot
function decisionsMonthly(city, m) {
  Object.values(city.players).filter((p) => !p.bot).forEach((p) => {
    p.inbox.filter((d) => d.dueM <= m).forEach((d) => { const def = DECISIONS.find((x) => x.id === d.def); const safeIx = def.options.findIndex((o) => o.safe);
      const ix = p.policy === 'cautious' ? safeIx : p.policy === 'bold' ? 1 - safeIx : Math.floor(rand() * 2); resolveDecisionFor(city, p, d.id, ix, true); });
  });
}
function resolveDecisionFor(city, p, did, ix, auto) {
  const d = p.inbox.find((x) => x.id === did); if (!d) return err('This decision is no longer open.');
  const def = DECISIONS.find((x) => x.id === d.def), o = def.options[ix]; if (!o) return err('Unknown option.');
  const fx = o.fx; let out = '';
  if (fx.cash) p.cash += fx.cash;
  if (fx.inf) p.inf = Math.max(0, p.inf + fx.inf);
  if (fx.gamble) { const v = rand() < fx.gamble[0] ? fx.gamble[1] : fx.gamble[2]; p.cash += v; out = v > 0 ? ` It paid off: +${v} M.` : v < 0 ? ` It went wrong: ${v} M.` : ' Nothing came of it.'; }
  if (fx.risk) { if (rand() < fx.risk[0]) { p.inf = Math.max(0, p.inf + fx.risk[1]); out = ' The tabloids ran a scandal story: −1 Influence.'; } else out = ' Everything went smoothly.'; }
  p.inbox = p.inbox.filter((x) => x !== d);
  const mx = (p.mail || []).find((y) => y.dec === did);
  if (mx) closeMail(city, p, mx, ix, auto, out.trim() || 'Done.', p.name); else feed(p, city.m, def.title, `${auto ? 'Autopilot chose' : 'You chose'}: ${o.l}.${out}`, auto ? 'info' : 'good');
  return { ok: true, msg: `${o.l}.${out}` };
}

// ---------------------------------------------------------------- shared helpers for actions
// ---------------------------------------------------------------- hostile takeovers of neglected companies
// A company is protected while its owner is active, while a Legal head guards it, or while it runs itself (fully staffed).
// who may buy the national bank, and which sectors its governor is in (no levy on your own sector)
const cbBuyCtx = (city) => ({ tier: (p) => (city.life && p.life ? LIFE.tierOf(city, p) : 0), tierName: (t) => PRESTIGE_TIERS[t].name, finLevel: (p) => (p.career ? CAR.level(p.career.xp.finance) : 1) });
export const cbEligible = (city, p) => CB.eligible(p, cbBuyCtx(city));
function govTypes(city, pid) { const t = new Set(ownedBy(city, 'p', pid).map((l) => l.type)); Object.values(city.holdings || {}).filter((h) => h.members[pid]).forEach((h) => ownedBy(city, 'h', h.id).forEach((l) => t.add(l.type))); return t; }
export const cbGovTypes = govTypes;
export function protection(city, l) {
  if (!l.owner || l.owner.k !== 'p') return { safe: true, why: 'Not a private company' };
  if (CB.isBank(l)) return { safe: true, why: 'The national bank cannot be taken over' };
  const p = city.players[l.owner.id]; if (!p || p.bot) return { safe: true, why: '' };
  if (p.admin) return { safe: true, why: 'Administrator' };
  if (hasHead(city, l, p, 'robert')) return { safe: true, why: 'Legal head blocks hostile bids' };
  if (l.ops && OPS.automation(l, 'ops') >= 0.8 && OPS.automation(l, 'sales') >= 0.8) return { safe: true, why: 'Fully staffed: it runs itself' };
  if (!inactive(city, p)) return { safe: true, why: 'Owner is active', soft: true };
  return { safe: false, why: 'Owner away and company unprotected' };
}
export function takeoverPrice(city, l) { const rep = l.ops ? l.ops.rep : 50; return Math.max(1, Math.round(listingValue(l) * (0.7 + 0.3 * rep / 100))); }
function hostileBid(city, p, a) {
  const l = listing(city, a.lid); if (!l || !l.owner || l.owner.k !== 'p' || l.owner.id === p.id) return err('Pick a company owned by another tycoon.');
  if (protection(city, l).safe) return err('This company is protected. You can only make a friendly offer.');
  const amt = Math.round(Number(a.amt) || takeoverPrice(city, l)); if (amt < takeoverPrice(city, l) * TAKEOVER.minBid) return err(`The board will not consider less than ${Math.ceil(takeoverPrice(city, l) * TAKEOVER.minBid)} M.`);
  if (p.cash < amt) return err('You need the full amount in cash.');
  if (city.offers.some((o) => o.status === 'open' && o.lid === l.id && o.hostile)) return err('Another hostile bid is already running for this company.');
  placeHostile(city, l, p, amt); return ok(`Hostile bid placed. If ${city.players[l.owner.id].name} does not reject it within ${TAKEOVER.bidMonths} months, the company is yours.`);
}
function placeHostile(city, l, buyer, amt) {
  const owner = city.players[l.owner.id], m = city.m;
  city.offers.push({ id: uid('o'), lid: l.id, from: buyer.id, to: owner.id, amount: amt, m, status: 'open', hostile: true, dueM: m + TAKEOVER.bidMonths });
  feed(owner, m, `Hostile takeover bid on your ${TYPES[l.type].name}`, `${buyer.name} bids ${amt} M while you were away. Reject it within ${TAKEOVER.bidMonths} months or the company changes hands. A Legal head or a fully staffed company stops this.`, 'bad');
  news(city, m, `${buyer.name} launches a hostile bid for ${owner.name}'s ${TYPES[l.type].name}`, `${l.district} · ${amt} M. The owner has not been seen for months.`, 'bad', { who: buyer.id });
}
function takeoverMonth(city, m) {
  city.offers.filter((o) => o.status === 'open' && o.hostile && m >= o.dueM).forEach((o) => {
    const l = listing(city, o.lid); if (!l || !ownerIs(l, 'p', o.to)) { o.status = 'failed'; return; }
    completeOffer(city, o, m); if (o.status === 'accepted') feed(city.players[o.to], m, `${TYPES[l.type].name} was taken over`, 'You never answered the hostile bid. Keep a Legal head or a fully staffed company to stay protected while you are away.', 'bad');
  });
  // rivals circle around neglected companies
  city.listings.forEach((l) => {
    if (!l.owner || l.owner.k !== 'p' || protection(city, l).safe || city.offers.some((o) => o.status === 'open' && o.lid === l.id && o.hostile)) return;
    if (rand() > TAKEOVER.botChance) return;
    const amt = Math.round(takeoverPrice(city, l) * (0.85 + rand() * 0.25));
    const bots = Object.values(city.players).filter((b) => b.bot && b.cash > amt + 3).sort((a, b) => b.cash - a.cash);
    if (bots.length) placeHostile(city, l, bots[0], amt);
  });
}
function feed(p, m, title, text, kind) { if (!p) return; p.feed.unshift({ m, title, text, kind }); if (p.feed.length > 60) p.feed.length = 60; }
function news(city, m, title, text, kind, extra) {
  if (city.players[ADMIN_ID] && (quiet || (extra && extra.who === ADMIN_ID) || String(title + ' ' + text).includes(ADMIN_NAME))) return; // the administrator stays out of the news
  city.news.unshift({ m, title, text, kind, ...(extra || {}) }); if (city.news.length > 120) city.news.length = 120; }
const ok = (msg) => ({ ok: true, msg });
const err = (msg) => ({ ok: false, msg });
function tradeStock(city, p, id, qty) {
  const st = city.stocks[id]; if (!st || !qty) return err('Unknown stock.');
  const cur = p.shares[id] || 0;
  if (!p.cost) { p.cost = {}; p.realized = 0; p.rlz = {}; }
  let msg;
  const live = priceAt(city, id); if (qty > 0) { const c = qty * live; if (p.cash < c) return err('Not enough cash.'); p.cash -= c; p.shares[id] = cur + qty; p.cost[id] = (p.cost[id] || 0) + c; msg = `Bought ${qty} × ${STOCKS.find((x) => x.id === id).name} for ${r2(c)} M.`; }
  else {
    const q = Math.min(-qty, cur); if (!q) return err('You hold no shares.');
    const avg = (p.cost[id] || 0) / cur, proceeds = q * live, gain = proceeds - avg * q;
    p.cash += proceeds; p.shares[id] = cur - q; p.cost[id] = Math.max(0, (p.cost[id] || 0) - avg * q);
    p.realized = (p.realized || 0) + gain; p.rlz[id] = (p.rlz[id] || 0) + gain; CAR.stock(city, p, STOCK_SECTOR[id], gain, cctx(city));
    if (!p.shares[id]) { delete p.shares[id]; delete p.cost[id]; }
    qty = -q; msg = `Sold ${q} shares for ${r2(proceeds)} M (${gain >= 0 ? '+' : '−'}${r2(Math.abs(gain))} M ${gain >= 0 ? 'profit' : 'loss'}).`;
  }
  st.p = Math.max(0.1, r2(st.p * (1 + (CAR.hasSpec(p, 'investor') ? 0.001 : 0.002) * qty))); st.h[st.h.length - 1] = st.p; // market impact from real orders
  return ok(msg);
}
function linkNetwork(city, a, b, m) {
  const A = city.players[a], B = city.players[b]; if (!A || !B) return;
  if (!A.net.includes(b)) A.net.push(b); if (!B.net.includes(a)) B.net.push(a);
  city.netReqs.forEach((r) => { if (r.status === 'open' && ((r.from === a && r.to === b) || (r.from === b && r.to === a))) r.status = 'accepted'; });
  feed(A, m, `${B.name} joined your network`, 'You can now offer supply contracts and share market insight.', 'good');
  feed(B, m, `${A.name} joined your network`, 'You can now offer supply contracts and share market insight.', 'good');
}
export function contractValid(city, aId, bId, fromId, toId, selfId) {
  const a = listing(city, aId), b = listing(city, bId);
  if (!a || !b) return err('Unknown company.');
  if (!ownerIs(a, 'p', fromId) || !ownerIs(b, 'p', toId)) return err('Both companies must be owned by the two players.');
  if (!city.players[fromId].net.includes(toId)) return err('You can only sign contracts with players in your network.');
  const pair = SYNERGY.some(([x, y]) => (a.type === x && b.type === y) || (a.type === y && b.type === x));
  if (!pair) return err(`${TYPES[a.type].name} and ${TYPES[b.type].name} have no supply synergy.`);
  const count = (id) => city.contracts.filter((c) => c.status === 'active' && (c.a === id || c.b === id)).length;
  if (count(a.id) >= 2 || count(b.id) >= 2) return err('A company can hold at most 2 supply contracts.');
  if (city.contracts.some((c) => c.id !== selfId && (c.status === 'active' || c.status === 'pending') && ((c.a === a.id && c.b === b.id) || (c.a === b.id && c.b === a.id)))) return err('This contract already exists or is pending.');
  return ok();
}
function completeOffer(city, o, m) {
  const l = listing(city, o.lid), buyer = city.players[o.from], seller = city.players[o.to];
  if (!l || !ownerIs(l, 'p', o.to) || buyer.cash < o.amount) { o.status = 'failed'; feed(buyer, m, 'Your takeover offer fell through', 'The company changed hands or you were short of cash.', 'bad'); return; }
  buyer.cash -= o.amount; seller.cash += o.amount; city.contracts = city.contracts.filter((c) => c.a !== l.id && c.b !== l.id);
  if (seller.assign) Object.keys(seller.assign).forEach((k) => { if (seller.assign[k].lid === l.id) delete seller.assign[k]; }); assignOwner(city, l, { k: 'p', id: buyer.id }, m); l.upgrade = null; o.status = 'accepted';
  feed(buyer, m, `Takeover complete: ${TYPES[l.type].name}`, `You paid ${seller.name} ${o.amount} M for the company in ${l.district}.`, 'good');
  feed(seller, m, `You sold ${TYPES[l.type].name} to ${buyer.name}`, `+${o.amount} M.`, 'good');
  news(city, m, `${buyer.name} takes over ${TYPES[l.type].name}`, `${seller.name} sold the ${l.district} company for ${o.amount} M.`, 'info', { who: buyer.id });
}
function activateContract(city, c, m) {
  c.status = 'active'; c.m = m; const a = listing(city, c.a), b = listing(city, c.b);
  const t = `${TYPES[a.type].name} (${a.district}) ↔ ${TYPES[b.type].name} (${b.district}). Both companies now earn the synergy bonus.`;
  feed(city.players[c.from], m, `Supply contract signed with ${city.players[c.to].name}`, t, 'good');
  feed(city.players[c.to], m, `Supply contract signed with ${city.players[c.from].name}`, t, 'good');
}
function makeHolding(city, pid, name, amount, m) {
  const p = city.players[pid]; const id = uid('h');
  const h = { id, name, members: { [pid]: amount }, founder: pid, treasury: amount, settledG: city.g, accrued: 0, payout: 0.5, proposals: [], invites: [], createdM: m, hist: [], color: pick(['#7b4fb3', '#9b59b6', '#6c3fa0']) };
  p.cash -= amount; city.holdings[id] = h; return h;
}
function joinHolding(city, h, p, amount, m) {
  const t = holdingShares(h), nav = holdingNav(city, h), price = t ? nav / t : 1, sh = amount / price;
  p.cash -= amount; h.treasury += amount; h.members[p.id] = (h.members[p.id] || 0) + sh;
  Object.keys(h.members).forEach((pid) => { const x = city.players[pid]; if (x && !x.bot) feed(x, m, `${p.name} invested ${amount} M in ${h.name}`, `New stake: ${Math.round(sh / holdingShares(h) * 100)}%.`, 'good'); });
}

// ---------------------------------------------------------------- player actions (validated; the server runs the same function)
export function apply(city, pid, action, a = {}, now = Date.now()) {
  advance(city, now);
  const p = city.players[pid]; if (!p) return err('Join the city first.');
  if (!p.admin) return applyAs(city, pid, p, action, a, now);
  refillAdmin(city); quiet = true;
  try { return applyAs(city, pid, p, action, a, now); } finally { quiet = false; refillAdmin(city); }
}
let quiet = false; // true while the administrator acts: nothing they do reaches the city news
function applyAs(city, pid, p, action, a, now) {
  const m = city.m;
  if (!p.bot) p.lastAct = m;
  if (action === 'ping') return ok();
  if (action === 'hire' || action === 'fire' || /^t[A-Z]/.test(action)) {
    if (a.oid && !a.tid) { const o = (city.tOffers || []).find((x) => x.id === a.oid); if (o) a.tid = o.tid; }
    if (!a.tid && a.id) a.tid = a.id;
    // a.coop: the co-owner acts for their coop, paid from the coop treasury
    let emp = p; if (a.coop) { const h = city.holdings[a.coop]; if (!h || !h.members[pid] || !humanCoop(city, h)) return err('Not your coop.'); emp = TAL.coopEmp(city, h); }
    const r = TAL.act(city, emp, action, a, { ...TCTX, inactive: (x) => inactive(city, x) }); if (r) return r;
  }
  if (action === 'hostileBid') return hostileBid(city, p, a);
  if (action === 'cbRate' || action === 'cbLevy') return CB.act(city, p, action, a, { governor: (c, id) => canRun(c, id, listing(c, CB.ID)), ownTypes: (c, id) => govTypes(c, id), news: (t, x, k) => news(city, m, t, x, k) });
  // the tycoon's own career: lead a department yourself, step down, pick a sector specialisation
  if (action === 'meHead') { if (p.bot || p.admin) return err('Only tycoons lead departments themselves.'); const l = listing(city, a.lid); if (!l || !canRun(city, pid, l)) return err('You do not run this company.'); if (!l.ops) l.ops = OPS.newOps(l, false); if (l.ops.managed) return err('This company runs on autopilot.'); if (!OPS.DEPT[a.dept]) return err('Unknown department.'); const ctx = cctx(city); if (!p.career || !p.career.seeded) CAR.seed(city, p, ctx); return CAR.take(city, p, l, a.dept, ctx); }
  if (action === 'meLeave') return CAR.leave(city, p, a.lid, a.dept);
  if (action === 'meSpec') return CAR.choose(city, p, a.sector, a.pick, cctx(city));
  if (/^(life|home|item|bid|trade|host|bank)/.test(action)) {
    const ctx = { ...LCTX, canRun: (l) => canRun(city, pid, l), clientsBoost: (id, n) => { let k = 0; ownedBy(city, 'p', id).forEach((l) => (l.ops && l.ops.clients || []).forEach((c) => { if (c.status === 'active') { c.mood = Math.min(100, c.mood + n); k++; } })); return k; } };
    const r = LIFE.act(city, p, action, a, ctx); if (r) return r;
  }
  switch (action) {
    case 'buy': {
      const l = listing(city, a.lid); if (!l) return err('Unknown company.'); if (l.owner) return err('Someone already owns this company.');
      if (CB.isBank(l)) { const e = CB.eligible(p, cbBuyCtx(city)); if (!e.ok) return err(e.why); }
      const price = listingPrice(l);
      if (a.as && a.as !== 'me') {
        const h = city.holdings[a.as]; if (!h || !h.members[pid]) return err('You are not an owner of that coop.');
        if (h.proposals.some((x) => x.status === 'open' && x.lid === l.id)) return err('A proposal for this company is already open.');
        const pr = { id: uid('p'), by: pid, kind: 'buy', lid: l.id, votes: { [pid]: true }, m, dueM: m + 1, status: 'open' };
        h.proposals.push(pr); botVotes(city, h, pr); closeProposal(city, h, pr, false);
        return ok(pr.status === 'passed' ? `${h.name} bought it.` : pr.status === 'open' ? 'Proposal sent to your co-owners. It closes next game month.' : `Proposal ${pr.status}.`);
      }
      if (p.cash < price) return err(`You need ${price} M and have ${r2(p.cash)} M. Borrow at the bank or bring in co-owners through a coop.`);
      p.cash -= price; assignOwner(city, l, { k: 'p', id: pid }, m);
      news(city, m, `${p.name} buys ${TYPES[l.type].name}`, `${l.district} · ${price} M.`, 'info', { who: pid });
      return ok(`${l.title || TYPES[l.type].name} in ${l.district} is yours.`);
    }
    case 'offer': {
      const l = listing(city, a.lid); const amt = Math.round(Number(a.amt) || 0);
      if (!l || !l.owner || l.owner.k !== 'p' || l.owner.id === pid) return err('You can only bid on companies owned by other players.');
      if (CB.isBank(l)) { const e = CB.eligible(p, cbBuyCtx(city)); if (!e.ok) return err(e.why); }
      if (amt <= 0 || p.cash < amt) return err('You need the full amount in cash to bid.');
      if (city.offers.some((o) => o.status === 'open' && o.from === pid && o.lid === l.id)) return err('You already have an open offer on this company.');
      const o = { id: uid('o'), lid: l.id, from: pid, to: l.owner.id, amount: amt, m, status: 'open' }; city.offers.push(o);
      if (!city.players[o.to].bot) feed(city.players[o.to], m, `${p.name} offers ${amt} M for your ${TYPES[l.type].name}`, 'Answer in the Empire tab.', 'info');
      return ok(`Offer sent to ${city.players[o.to].name}. They answer next game month.`);
    }
    case 'offerAccept': { const o = city.offers.find((x) => x.id === a.id && x.to === pid && x.status === 'open'); if (!o) return err('The offer is no longer open.'); completeOffer(city, o, m); return ok(); }
    case 'offerDecline': { const o = city.offers.find((x) => x.id === a.id && x.to === pid && x.status === 'open'); if (o) { o.status = 'declined'; feed(city.players[o.from], m, `${p.name} turned down your offer`, '', 'info'); } return ok(); }
    case 'sell': { const l = listing(city, a.lid);
      // a coop's company is sold by a vote of its owners (by stake); the money goes to the coop treasury
      if (l && l.owner && l.owner.k === 'h') { const h = city.holdings[l.owner.id]; if (!h || !h.members[pid]) return err('Not your coop.'); if (h.proposals.some((x) => x.status === 'open' && x.kind === 'sell' && x.lid === l.id)) return err('A sale vote is already running.');
        const pr = { id: uid('p'), by: pid, kind: 'sell', lid: l.id, votes: { [pid]: true }, m, dueM: m + 1, status: 'open' }; h.proposals.push(pr); botVotes(city, h, pr); closeProposal(city, h, pr, false); return ok(pr.status === 'passed' ? 'Sold. The money is in the coop treasury.' : 'Sale proposed to your co-owners.'); }
      if (!l || !ownerIs(l, 'p', pid)) return err('You do not own this company.'); const v = r2(listingValue(l) * 0.8); p.cash += v; releaseListing(city, l); return ok(`Sold for ${v} M.`); }
    case 'upgrade': {
      const l = listing(city, a.lid); if (!l) return err('Unknown company.');
      if (l.owner && l.owner.k === 'h') { const h = city.holdings[l.owner.id]; if (!h.members[pid]) return err('Not your coop.'); const pr = { id: uid('p'), by: pid, kind: 'upgrade', lid: l.id, votes: { [pid]: true }, m, dueM: m + 1, status: 'open' }; h.proposals.push(pr); botVotes(city, h, pr); closeProposal(city, h, pr, false); return ok(pr.status === 'passed' ? 'Upgrade started.' : 'Proposal sent to your co-owners.'); }
      if (!ownerIs(l, 'p', pid)) return err('You do not own this company.'); if (l.upgrade) return err('An upgrade is already running.'); if (l.level >= 5) return err('Already at the top level.');
      const c = upgradeCost(l); if (p.cash < c) return err(`The upgrade costs ${c} M.`);
      p.cash -= c; l.upgrade = { to: l.level + 1, doneM: m + upgradeMonths(l) };
      return ok(`Construction started. Level ${l.level + 1} in ${upgradeMonths(l)} game month${upgradeMonths(l) > 1 ? 's' : ''}.`);
    }
    case 'hire': {
      const s = staffDef(a.id); if (!s) return err('Unknown specialist.'); if (hasStaff(p, a.id)) return err('Already at your HQ.');
      if (p.staff.length >= capacity(p)) return err(`Your HQ holds ${capacity(p)} specialists.`);
      const c = staffCost(p, a.id); if (p.cash < c) return err(`Recruiting costs ${c} M.`);
      p.cash -= c; p.staff.push(a.id); return ok(`${s.name} joined your HQ.`);
    }
    case 'fire': { p.staff = p.staff.filter((s) => s !== a.id); unassign(city, p, a.id); return ok(); }
    // ---------------- company management (human-owned companies)
    case 'deptOpen': case 'deptClose': case 'workers': case 'deptSet': case 'task': case 'listGoods': case 'exportGoods': case 'assignHead': case 'order': case 'buySupply': {
      const l = listing(city, a.lid); if (!l || !canRun(city, pid, l)) return err('You do not run this company.');
      if (!l.ops) l.ops = OPS.newOps(l, false);
      // a coop's company is paid for from the coop treasury, not the pocket of the owner pressing the button
      const hq = l.owner.k === 'h' ? city.holdings[l.owner.id] : null;
      const payer = hq ? { get cash() { return hq.treasury; }, set cash(v) { hq.treasury = v; } } : p;
      const o = l.ops, d = a.dept ? OPS.deptFor(l, a.dept) : null;
      if (action === 'deptOpen') { if (!d) return err('Unknown department.'); if (o.depts[a.dept]) return err('Already open.'); const c = OPS.deptOpenCost(l, a.dept); if (payer.cash < c) return err(`Opening costs ${c} M.`); payer.cash -= c; o.depts[a.dept] = { w: 0, set: { ...DEPT_DEFAULTS[a.dept] }, head: null }; return ok(`${d.name} is open. Hire workers to automate it, or run it yourself.`); }
      if (action === 'deptClose') { if (!d || a.dept === 'ops' || !o.depts[a.dept]) return err('Cannot close this department.'); const dd = o.depts[a.dept]; if (dd.head === 'self') dropSelf(city, l, a.dept); else if (dd.head) dropHead(city, l, a.dept, dd.head); payer.cash -= dd.w * WORKER.salary * 0.25; delete o.depts[a.dept]; return ok(`${d.name} closed.`); }
      if (action === 'workers') {
        const dd = o.depts[a.dept]; if (!dd) return err('Open the department first.'); const n = Math.trunc(Number(a.delta)) || 0, max = OPS.needWorkers(l, a.dept) * 3;
        if (n > 0) { if (dd.w + n > max) return err(`This department has room for ${max} workers.`); const fee = n * WORKER.hireFee * (o.depts.hr && o.depts.hr.head === 'emily' ? 0.5 : 1) * (OPS.selfLv(l, 'hr') >= 6 ? 0.75 : 1); if (payer.cash < fee) return err('Not enough cash.'); payer.cash -= fee; dd.w += n; return ok(); }
        if (n < 0) { const q = Math.min(-n, dd.w); dd.w -= q; payer.cash -= q * WORKER.salary * 0.25; o.morale = Math.max(0, o.morale - 2 * q); return ok(); }
        return ok();
      }
      if (action === 'deptSet') { const dd = o.depts[a.dept]; if (!dd) return err('Open the department first.'); const st = d.settings.find((x) => x.k === a.k); if (!st || !st.opts.some(([v]) => String(v) === String(a.v))) return err('Unknown setting.'); dd.set[a.k] = st.opts.find(([v]) => String(v) === String(a.v))[0]; return ok(); }
      if (action === 'task') { const r = OPS.doTask(city, CTX, l, a.task, a); if (r && r.ok) CAR.task(city, p, l, a.task, cctx(city)); return r; }
      if (action === 'order') { const r = OPS.orderAction(city, CTX, l, a.op, a); if (r && r.ok && a.op === 'deliver') CAR.task(city, p, l, 'deliver', cctx(city)); return r; }
      if (action === 'buySupply') return OPS.buySupply(city, CTX, l, a.g, Number(a.qty) || 1, LOG.CARRIER[a.carrier] ? a.carrier : undefined);
      if (action === 'listGoods') { const g = a.g; if (!GOODS[g]) return err('Unknown supply.'); const qty = Math.min(Number(a.qty) || o.inv[g] || 0, o.inv[g] || 0); if (qty < 1) return err('Nothing in stock.'); const price = Number(a.price) || city.market[g].p; OPS.listGoods(city, l, g, qty, price, false); return ok(`Listed ${Math.round(qty)} ${GOODS[g].unit} of ${GOODS[g].name.toLowerCase()} at ${(price * 1000).toFixed(1)} k each.`); }
      if (action === 'exportGoods') { const g = a.g; if (!GOODS[g]) return err('Unknown supply.'); const cid = LOG.CARRIER[a.carrier] ? a.carrier : OPS.setting(l, 'procurement', 'carrier'); const r = OPS.exportGoods(city, CTX, l, g, Number(a.qty) || o.inv[g] || 0, cid); if (!r) return err('Nothing in stock.'); return ok(`Export booked with ${LOG.CARRIER[cid].name}. ${r.value} M arrives on delivery in about ${Math.round(r.days)} days (freight $${Math.round(r.freight * 1000)}k).`); }
      if (action === 'assignHead') {
        // a coop's own specialists lead only that coop's companies; a co-owner may also lend a personal specialist
        const boss = a.coop ? (hq && a.coop === hq.id ? TAL.coopEmp(city, hq) : null) : p; if (!boss) return err('Coop specialists lead only that coop\'s companies.');
        const spec = a.spec; if (!hasStaff(boss, spec)) return err('Recruit this specialist first.'); if (!d || d.head !== spec) return err('This specialist cannot lead that department.'); if (!o.depts[a.dept]) return err('Open the department first.');
        const moved = !boss.assign[spec] || boss.assign[spec].lid !== l.id; dropSelf(city, l, a.dept); dropHead(city, l, a.dept, spec); unassign(city, boss, spec); o.depts[a.dept].head = spec; o.depts[a.dept].who = boss.team && boss.team[spec]; boss.assign[spec] = { lid: l.id, dept: a.dept };
        const tid = boss.team && boss.team[spec]; if (tid && city.talent) { const t = city.talent[tid]; o.depts[a.dept].hb = TAL.headBonus(t.rating); if (moved) { t.boredom = Math.max(0, t.boredom - 30); t.chal = m; } }
        return ok(`${(boss.team && boss.team[spec] ? TAL.PERSON[boss.team[spec]].name : staffDef(spec).name)} now leads ${d.name} at ${TYPES[l.type].name}.`);
      }
      return err('Unknown action.');
    }
    case 'adLaunch': case 'adStop': {
      const l = listing(city, a.lid); if (!l || !canRun(city, pid, l)) return err('You do not run this company.');
      if (action === 'adStop') return ADS.stop(city, l);
      const hq = l.owner.k === 'h' ? city.holdings[l.owner.id] : null;
      const payer = hq ? { get cash() { return hq.treasury; }, set cash(v) { hq.treasury = v; } } : p;
      return ADS.launch(city, p, l, a, payer);
    }
    case 'unassignHead': { if (a.coop) { const h = city.holdings[a.coop]; if (!h || !h.members[pid]) return err('Not your coop.'); unassign(city, TAL.coopEmp(city, h), a.spec); } else unassign(city, p, a.spec); return ok(); }
    case 'post': { const l = listing(city, a.lid); if (!l || !canSeeCompany(city, pid, l)) return err('Only the owner and their coop partners can post here.'); if (!l.ops) return err('This company is not running yet.'); return OPS.post(l, p, a.text, now); }
    case 'whBuy': { LOG.ensureWarehouses(city); return LOG.buy(city, p, a.wid); }
    case 'whSell': case 'whImport': case 'whDispatch': case 'whExport': case 'whUpgrade': case 'whAuto': {
      LOG.ensureWarehouses(city); const w = LOG.warehouse(city, a.wid); if (!w || w.owner !== pid) return err('Not your warehouse.');
      if (action === 'whSell') return LOG.sell(city, p, w);
      if (action === 'whImport') return LOG.importTo(city, p, w, a.g, Number(a.qty), OPS.importPrice(city, a.g), city.g, LOG.CARRIER[a.carrier] ? a.carrier : 'ridge');
      if (action === 'whDispatch') return LOG.dispatch(city, p, w, listing(city, a.lid), a.g, Number(a.qty), city.g);
      if (action === 'whExport') return LOG.exportFrom(city, p, w, a.g, Number(a.qty), OPS.exportPrice(city, a.g), city.g, LOG.CARRIER[a.carrier] ? a.carrier : 'ridge');
      if (action === 'whUpgrade') return LOG.upgrade(city, p, w);
      if (action === 'whAuto') { if (!hasStaff(p, 'carlos')) return err('Hire Carlos Mendoza, Logistics Planner, to automate your warehouses.'); if (a.supply !== undefined) w.auto.supply = !!a.supply; if (LOG.CARRIER[a.carrier]) w.auto.carrier = a.carrier; if (a.importMonths !== undefined) w.auto.importMonths = Math.max(0, Math.min(3, Number(a.importMonths) || 0)); return ok('Warehouse rules saved.'); }
    }
    case 'dealOffer': return DEAL.offer(city, p, a, dctx(city));
    case 'dealAccept': return DEAL.accept(city, p, a, dctx(city));
    case 'dealDecline': return DEAL.decline(city, p, a, dctx(city));
    case 'dealWithdraw': return DEAL.withdraw(city, p, a, dctx(city));
    case 'dealDeliver': return DEAL.deliver(city, p, a, dctx(city));
    case 'cancelOffer': { const o = (city.book || []).find((x) => x.id === a.id && x.seller.k === 'p' && x.seller.id === pid); if (!o) return err('Offer not found.'); OPS.cancelOffer(city, o); return ok('Offer withdrawn. The goods are back in stock.'); }
    case 'approveAll': { let n = 0; ownedBy(city, 'p', pid).forEach((l) => { if (l.ops && l.ops.orders) l.ops.orders.filter((o) => o.status === 'new' && o.earning > 0).forEach((o) => { OPS.orderAction(city, CTX, l, 'accept', { oid: o.id }); n++; }); }); return n ? ok(`Accepted ${n} profitable orders. Remember to deliver them.`) : err('No profitable new orders.'); }
    case 'loan': { const amt = Number(a.amt) || 5; if (debt(p) + amt > loanCap(city, p)) return err(`The bank lends up to ${loanCap(city, p)} M in total right now.`); p.loans.push({ amt, rate: 'bank', m }); p.cash += amt + (hasStaff(p, 'michael') ? 0.5 : 0); return ok(`Borrowed ${amt} M.`); }
    case 'repay': { let amt = Math.min(Number(a.amt) || 5, debt(p), p.cash); if (amt <= 0) return err('Nothing to repay, or not enough cash.'); p.cash -= amt; for (const l of p.loans) { const x = Math.min(l.amt, amt); l.amt -= x; amt -= x; } p.loans = p.loans.filter((l) => l.amt > 0.01); return ok(); }
    case 'trade': return tradeStock(city, p, a.id, Math.trunc(Number(a.qty)));
    case 'policy': if (!['cautious', 'balanced', 'bold'].includes(a.policy)) return err('Unknown policy.'); p.policy = a.policy; return ok();
    case 'decide': return resolveDecisionFor(city, p, a.id, Number(a.opt), false);
    case 'mailAnswer': return answerMail(city, p, a.id, Number(a.opt), false);
    case 'netRequest': {
      const t = city.players[a.pid]; if (!t || t.id === pid) return err('Unknown player.'); if (p.net.includes(t.id)) return err('Already in your network.');
      const incoming = city.netReqs.find((r) => r.status === 'open' && r.from === t.id && r.to === pid); if (incoming) { linkNetwork(city, pid, t.id, m); return ok(`${t.name} is now in your network.`); }
      if (city.netReqs.some((r) => r.status === 'open' && r.from === pid && r.to === t.id)) return err('Request already sent.');
      city.netReqs.push({ id: uid('n'), from: pid, to: t.id, m, status: 'open' }); if (!t.bot) feed(t, m, `${p.name} wants to join your network`, '', 'info');
      return ok(`Request sent to ${t.name}.`);
    }
    case 'netAccept': { const r = city.netReqs.find((x) => x.status === 'open' && x.from === a.pid && x.to === pid); if (!r) return err('No open request.'); linkNetwork(city, a.pid, pid, m); return ok(); }
    case 'netDecline': { const r = city.netReqs.find((x) => x.status === 'open' && x.from === a.pid && x.to === pid); if (r) r.status = 'declined'; return ok(); }
    case 'netRemove': { const t = city.players[a.pid]; if (!t) return err('Unknown player.'); p.net = p.net.filter((x) => x !== t.id); t.net = t.net.filter((x) => x !== pid);
      city.contracts.forEach((c) => { if (c.status === 'active' && ((c.from === pid && c.to === t.id) || (c.from === t.id && c.to === pid))) c.status = 'ended'; }); return ok(); }
    case 'contractPropose': {
      const v = contractValid(city, a.mine, a.theirs, pid, listing(city, a.theirs)?.owner?.id); if (!v.ok) return v;
      const to = listing(city, a.theirs).owner.id; const c = { id: uid('c'), a: a.mine, b: a.theirs, from: pid, to, status: 'pending', m }; city.contracts.push(c);
      if (!city.players[to].bot) feed(city.players[to], m, `${p.name} offers a supply contract`, '', 'info');
      return ok(`Contract offered to ${city.players[to].name}. They answer next game month.`);
    }
    case 'contractAccept': { const c = city.contracts.find((x) => x.id === a.id && x.to === pid && x.status === 'pending'); if (!c) return err('No such offer.'); const v = contractValid(city, c.a, c.b, c.from, c.to, c.id); if (!v.ok) { c.status = 'declined'; return v; } activateContract(city, c, m); return ok('Contract signed.'); }
    case 'contractDecline': { const c = city.contracts.find((x) => x.id === a.id && x.to === pid && x.status === 'pending'); if (c) c.status = 'declined'; return ok(); }
    case 'contractEnd': { const c = city.contracts.find((x) => x.id === a.id && (x.to === pid || x.from === pid) && x.status === 'active'); if (c) c.status = 'ended'; return ok('Contract ended.'); }
    case 'holdingCreate': {
      const amt = Math.round(Number(a.amt) || 0); const name = String(a.name || '').trim().slice(0, 32);
      if (!name) return err('Give your coop a name.'); if (amt < 5) return err('Put in at least 5 M.'); if (p.cash < amt) return err('Not enough cash.');
      const h = makeHolding(city, pid, name, amt, m); news(city, m, `${p.name} founds ${h.name}`, 'A new coop parent company opens for investors.', 'info');
      return ok(`${h.name} is founded. Invite co-owners and propose your first acquisition.`);
    }
    case 'holdingInvite': { const h = city.holdings[a.hid]; const t = city.players[a.pid]; if (!h || !h.members[pid]) return err('Not your coop.'); if (!t) return err('Unknown player.'); if (h.members[t.id]) return err('Already an owner.'); if (h.invites.some((i) => i.pid === t.id)) return err('Already invited.');
      h.invites.push({ pid: t.id, by: pid, m }); if (!t.bot) feed(t, m, `${p.name} invites you to co-own ${h.name}`, 'Open the Network tab to invest.', 'info'); return ok(`${t.name} is invited. Bots answer next game month.`); }
    case 'holdingJoin': { const h = city.holdings[a.hid]; const amt = Math.round(Number(a.amt) || 0); if (!h) return err('Unknown coop.'); if (!h.members[pid] && !h.open && !h.invites.some((i) => i.pid === pid)) return err('You need an invitation.');
      if (!h.members[pid] && h.buyIn && amt < h.buyIn) return err(`The buy-in for ${h.name} is ${h.buyIn} M.`); if (amt < 1 || p.cash < amt) return err('Not enough cash.');
      h.invites = h.invites.filter((i) => i.pid !== pid); joinHolding(city, h, p, amt, m); return ok(`You invested ${amt} M in ${h.name}.`); }
    // ---- parent company: every human empire runs under one (own, or co-owned with a buy-in)
    case 'coFound': {
      if (BR.brandOf(city, pid) && !p.bot) return err('You already have a parent company.');
      const n = BR.checkCoName(city, a.name, { pid }); if (!n.ok) return n;
      const b = BR.checkBrand(a); if (!b.ok) return b;
      if (a.mode === 'coop') {
        const amt = Math.round(Number(a.amt) || 0), buyIn = Math.max(BR.MIN_STAKE, Math.round(Number(a.buyIn) || amt));
        if (amt < BR.MIN_STAKE) return err(`Put in at least ${BR.MIN_STAKE} M.`); if (p.cash < amt) return err(`You have ${r2(p.cash)} M.`);
        const h = makeHolding(city, pid, n.name, amt, m); h.parent = true; h.brand = { color: b.color, font: b.font, sym: b.sym }; h.buyIn = buyIn; h.open = a.open !== false; h.color = BR.colorHex(b.color);
        p.co = { hid: h.id, m };
        news(city, m, `${p.name} founds ${h.name}`, `A co-owned parent company. New owners buy in from ${buyIn} M.`, 'info', { who: pid });
        return ok(`${h.name} is founded. Invite co-owners from the Network tab.`);
      }
      p.co = { name: n.name, color: b.color, font: b.font, sym: b.sym, hid: null, m };
      news(city, m, `${p.name} founds ${n.name}`, 'A new parent company opens an office at Harbor Row.', 'info', { who: pid });
      return ok(`${n.name} is founded. Your empire runs under it.`);
    }
    case 'coJoin': {
      if (BR.brandOf(city, pid)) return err('You already have a parent company.');
      const h = city.holdings[a.hid]; if (!h || !h.parent) return err('Unknown parent company.');
      if (!h.open && !h.invites.some((i) => i.pid === pid)) return err(`${h.name} only takes invited co-owners.`);
      const amt = Math.round(Number(a.amt) || h.buyIn || BR.MIN_STAKE);
      if (amt < (h.buyIn || BR.MIN_STAKE)) return err(`The buy-in is ${h.buyIn || BR.MIN_STAKE} M.`); if (p.cash < amt) return err(`The buy-in is ${amt} M and you have ${r2(p.cash)} M.`);
      h.invites = h.invites.filter((i) => i.pid !== pid); joinHolding(city, h, p, amt, m); p.co = { hid: h.id, m };
      return ok(`You bought into ${h.name} for ${amt} M.`);
    }
    case 'coBrand': {
      const cur = BR.brandOf(city, pid); if (!cur || cur.auto) return err('Found your parent company first.');
      const h = cur.hid ? city.holdings[cur.hid] : null; if (h && h.founder !== pid) return err(`Only the founder can change the logo of ${h.name}.`);
      const n = BR.checkCoName(city, a.name ?? cur.name, { pid, hid: cur.hid }); if (!n.ok) return n;
      const b = BR.checkBrand({ color: a.color ?? cur.color, font: a.font ?? cur.font, sym: a.sym ?? cur.sym }); if (!b.ok) return b;
      if (h) { h.name = n.name; h.brand = { color: b.color, font: b.font, sym: b.sym }; h.color = BR.colorHex(b.color); } else Object.assign(p.co, { name: n.name, color: b.color, font: b.font, sym: b.sym });
      return ok('The logo is updated.');
    }
    case 'avatarName': { // players from before e-mail accounts pick their first + last name once
      if (p.first) return err('Your avatar name is already set.');
      const av = BR.checkAvatarName(a.first, a.last); if (!av.ok) return av;
      p.first = av.first; p.last = av.last; p.name = av.name; return ok(`You are ${av.name}.`);
    }
    case 'holdingBuyIn': {
      const h = city.holdings[a.hid]; if (!h || !h.members[pid]) return err('Not your coop.');
      if (a.amt != null) { const v = Math.round(Number(a.amt) || 0); if (v < BR.MIN_STAKE) return err(`The buy-in is at least ${BR.MIN_STAKE} M.`); h.buyIn = v; }
      if (a.open != null) h.open = !!a.open;
      return ok(h.open ? `Anyone can buy in from ${h.buyIn || BR.MIN_STAKE} M.` : 'Only invited players can buy in.');
    }
    case 'holdingPropose': { const h = city.holdings[a.hid]; if (!h || !h.members[pid]) return err('Not your coop.'); const pr = { id: uid('p'), by: pid, kind: a.kind, lid: a.lid || null, pct: a.pct, votes: { [pid]: true }, m, dueM: m + 1, status: 'open' };
      if (!['buy', 'upgrade', 'sell', 'payout'].includes(pr.kind)) return err('Unknown proposal.');
      if (pr.kind === 'sell') { const l = listing(city, pr.lid); if (!l || !ownerIs(l, 'h', h.id)) return err('The coop does not own that company.'); if (h.proposals.some((x) => x.status === 'open' && x.kind === 'sell' && x.lid === l.id)) return err('A sale vote is already running.'); } h.proposals.push(pr); botVotes(city, h, pr); closeProposal(city, h, pr, false); return ok(pr.status === 'open' ? 'Proposal sent to your co-owners.' : `Proposal ${pr.status}.`); }
    case 'holdingVote': { const h = city.holdings[a.hid]; if (!h || !h.members[pid]) return err('Not your coop.'); const pr = h.proposals.find((x) => x.id === a.prid && x.status === 'open'); if (!pr) return err('Voting has closed.'); pr.votes[pid] = !!a.yes; closeProposal(city, h, pr, false); return ok(); }
    case 'holdingLeave': {
      const h = city.holdings[a.hid]; if (!h || !h.members[pid]) return err('Not your coop.');
      const stake = holdingStake(city, h, pid), value = r2(holdingNav(city, h) * stake * 0.9);
      const dropParent = () => { if (p.co && p.co.hid === h.id) p.co = null; }; // the player then founds or joins a new parent company
      if (Object.keys(h.members).length === 1) { ownedBy(city, 'h', h.id).forEach((l) => { h.treasury += listingValue(l) * 0.8; releaseListing(city, l); }); if (city.talent) TAL.releaseAll(city, TAL.coopEmp(city, h), TCTX); p.cash += h.treasury; delete city.holdings[h.id]; dropParent(); return ok('The coop is dissolved and its assets sold.'); }
      if (h.treasury < value) return err(`The treasury has ${r2(h.treasury)} M. Your stake is worth ${value} M. Propose a sale first.`);
      h.treasury -= value; p.cash += value; delete h.members[pid]; dropParent(); return ok(`You sold your stake for ${value} M.`);
    }
    default: return err('Unknown action.');
  }
}
