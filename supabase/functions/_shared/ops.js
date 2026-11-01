// Aurex Bay Tycoon — company operations and the city supply market.
// Every owned company produces once per game month: it buys supplies, turns them into
// output, sells to customers and puts surplus supplies on the city market.
// Bots and coops run in "managed" mode (fully staffed); human-owned companies run
// exactly as well as their departments are staffed — or as attentive as the owner is.
import { TYPES, SIZES, GOODS, RECIPES, DEPTS, DEPT_DEFAULTS, WORKER, MARKET_KIND, CLIENT_RULES, CLIENT_NAMES, DISTRICTS } from './content.js';

const r2 = (v) => Math.round(v * 100) / 100;
const r4 = (v) => Math.round(v * 10000) / 10000;
const rand = Math.random;
const uid = (p) => p + Math.random().toString(36).slice(2, 9);
export const DEPT = Object.fromEntries(DEPTS.map((d) => [d.id, d]));
const ECON_DEMAND = { Boom: 1.15, Stable: 1, Recession: 0.85, Crisis: 0.75 };
const PRICE = { budget: { mult: 0.85, demand: 1.25 }, standard: { mult: 1, demand: 1 }, premium: { mult: 1.25, demand: 0.75 } };
const B2B = { undercut: 0.92, market: 1, premium: 1.08 };

// ---------------------------------------------------------------- basics
export const lvMult = (l) => 1 + 0.35 * (l.level - 1);
export const scale = (l) => SIZES[l.size].mult * lvMult(l);
export const baseCap = (l) => RECIPES[l.type].cap * scale(l);
export function needWorkers(l, dept) { return Math.max(1, Math.round(DEPT[dept].need * Math.sqrt(scale(l)))); }
export function deptOpenCost(l, dept) { return r2(DEPT[dept].cost * SIZES[l.size].mult); }
export function inputCostUnit(l) { return Object.entries(RECIPES[l.type].in).reduce((a, [g, q]) => a + q * GOODS[g].base, 0); }
export function setting(l, dept, k) { const d = l.ops && l.ops.depts[dept]; return (d && d.set && d.set[k] !== undefined) ? d.set[k] : DEPT_DEFAULTS[dept][k]; }
export function automation(l, dept) {
  if (!l.ops) return 0; if (l.ops.managed) return 1;
  const d = l.ops.depts[dept]; if (!d) return 0;
  return Math.min(1, d.w / needWorkers(l, dept) + (d.head ? (d.hb ?? 0.5) : 0));
}
export function deptState(l, dept) {
  const d = l.ops && l.ops.depts[dept]; if (l.ops && l.ops.managed) return 'auto';
  if (!d) return 'closed'; const a = automation(l, dept);
  return a >= 1 ? 'auto' : a > 0 ? 'partial' : 'manual';
}

export function newOps(l, managed) {
  const ops = { managed: !!managed, depts: { ops: { w: managed ? needWorkers(l, 'ops') : 0, set: { ...DEPT_DEFAULTS.ops }, head: null } }, inv: {}, customers: 100, rep: 50, morale: 70, rp: 0, tech: 0, eff: 1,
    pending: [], fg: 0, cur: { b2c: 0, goods: 0, sup: 0 }, hist: [], cd: {}, booksM: -1, legalUntil: -1, overtimeM: -1, board: [] };
  if (!managed) ensureClientsFor(l, ops);
  if (managed) ['procurement', 'sales', 'social', 'hr', 'finance'].forEach((k) => (ops.depts[k] = { w: needWorkers(l, k), set: { ...DEPT_DEFAULTS[k] }, head: null }));
  // a starter month of supplies so a new owner sees production running before the first restock
  Object.entries(RECIPES[l.type].in).forEach(([g, q]) => (ops.inv[g] = Math.ceil(q * baseCap(l) * 1.25)));
  return ops;
}
function ensureClientsFor(l, ops) { const t = l.ops; l.ops = ops; ensureClients(l); l.ops = t; }
export function ensureOps(l, managed) { if (!l.ops) l.ops = newOps(l, managed); return l.ops; }
export function takeOverOps(l) { // a human (or a human coop) takes over a running company
  const ops = ensureOps(l, true); ops.managed = false;
  // the previous owner's staff and departments go with them: you start with only Operations, no workers,
  // and open departments and hire your own team, exactly like a company bought from the market
  ops.depts = { ops: { w: 0, set: { ...DEPT_DEFAULTS.ops }, head: null } };
  ensureClients(l);
}

// ---------------------------------------------------------------- yearly running costs of one company (continuous, in M per year)
export function runningCosts(l) {
  if (!l.ops) return { salaries: 0, budgets: 0, total: 0 };
  const s = SIZES[l.size].mult;
  if (l.ops.managed) { const t = r2(0.6 * scale(l)); return { salaries: t, budgets: 0, total: t, workers: 0 }; }
  const wageMult = { low: 0.85, market: 1, high: 1.2 }[setting(l, 'hr', 'wages')];
  let salaries = 0, workers = 0;
  Object.entries(l.ops.depts).forEach(([k, d]) => { const shift = k === 'ops' ? [1, 1, 1.3, 1.6][setting(l, 'ops', 'shifts')] : 1; salaries += d.w * WORKER.salary * wageMult * shift; workers += d.w; });
  let budgets = 0;
  if (l.ops.depts.social) budgets += { off: 0, normal: 0.3, viral: 1 }[setting(l, 'social', 'intensity')] * s;
  if (l.ops.depts.rnd) budgets += { off: 0, low: 0.3, high: 0.8 }[setting(l, 'rnd', 'budget')] * s;
  if (l.ops.depts.hr && setting(l, 'hr', 'training') === 'on') budgets += 0.15 * s;
  if (l.ops.depts.legal && setting(l, 'legal', 'level') === 'strict') budgets += 0.2 * s;
  let mult = 1;
  if (l.ops.depts.finance) { if (setting(l, 'finance', 'costs') === 'lean') mult -= 0.06; if (automation(l, 'finance') > 0) mult -= 0.03; if (l.ops.depts.finance.head) mult -= 0.05; }
  if (l.ops.booksPenalty) mult += 0.05;
  if (l.ops.costCutM !== undefined && l.ops.costCutM === l.ops.curM) mult -= 0.04;
  return { salaries: r2(salaries * mult), budgets: r2(budgets * mult), total: r2((salaries + budgets) * mult), workers };
}

// ---------------------------------------------------------------- capacity and demand
export function capacity(l) {
  const o = l.ops; if (!o) return 0;
  const staff = o.managed ? 1 : 0.3 + 0.7 * Math.min(1, (o.depts.ops?.w || 0) / needWorkers(l, 'ops'));
  const shift = o.managed ? 1 : [1, 1, 1.35, 1.6][setting(l, 'ops', 'shifts')];
  const morale = 0.8 + 0.4 * o.morale / 100;
  const training = !o.managed && o.depts.hr && setting(l, 'hr', 'training') === 'on' ? 1.08 : 1;
  const overtime = o.boost && o.boost.m === o.curM ? o.boost.mult : (o.overtimeM === o.curM ? 1.2 : 1);
  const chief = !o.managed && o.depts.ops && o.depts.ops.head ? 1.1 : 1;
  return baseCap(l) * staff * shift * morale * training * overtime * chief;
}
export function demand(city, l) {
  const o = l.ops; const price = PRICE[o.managed ? 'standard' : setting(l, 'sales', 'price')];
  const led = (tid) => !o.managed && Object.values(o.depts).some((d) => d && d.head && d.who === tid);
  const econ = led('dario') ? Math.max(1, ECON_DEMAND[city.econ]) : ECON_DEMAND[city.econ];
  return baseCap(l) * (o.customers / 100) * (0.8 + 0.4 * o.rep / 100) * price.demand * (1 + 0.06 * o.tech) * econ * (led('rohan') ? 1.15 : 1);
}
export function unitPrice(l, yieldTrade) {
  const price = PRICE[l.ops.managed ? 'standard' : setting(l, 'sales', 'price')];
  return ((yieldTrade / 12) / baseCap(l) + inputCostUnit(l) * 1.3) * price.mult * (1 + 0.04 * l.ops.tech);
}
export function needsPerMonth(l) { const c = capacity(l); return Object.fromEntries(Object.entries(RECIPES[l.type].in).map(([g, q]) => [g, q * c])); }
export function coverMonths(l) { const n = needsPerMonth(l); let min = Infinity; Object.entries(n).forEach(([g, q]) => { if (q > 0) min = Math.min(min, (l.ops.inv[g] || 0) / q); }); return min === Infinity ? 99 : min; }

// ---------------------------------------------------------------- city market
export function ensureMarket(city) {
  if (!city.market) { city.market = {}; Object.entries(GOODS).forEach(([g, d]) => (city.market[g] = { p: d.base, h: [d.base], bought: 0, imported: 0, exported: 0, sold: 0 })); }
  if (!city.book) city.book = [];
}
export function importPrice(city, g) { let p = GOODS[g].base * (GOODS[g].producer ? 1.5 : 1.1); if (g === 'energy' && city.fx && city.fx.id === 'energy') p *= 1.8; return r4(p); }
export function exportPrice(city, g) { return r4(GOODS[g].base * 0.7); }
export function offersFor(city, g) { return city.book.filter((o) => o.g === g && o.qty > 0.001).sort((a, b) => a.price - b.price); }
export function listedQty(city, g) { return city.book.filter((o) => o.g === g).reduce((a, o) => a + o.qty, 0); }

// buy qty of good g for a buyer company; returns { qty, cost, imported }
export function buyGoods(city, ctx, buyerL, g, qty, policy, opts) {
  ensureMarket(city);
  const mk = city.market[g], imp = importPrice(city, g), owner = buyerL.owner;
  let left = qty, cost = 0, fromBook = 0, bookCost = 0, sellerL = null;
  if (policy !== 'import') {
    let offers = offersFor(city, g).filter((o) => o.price <= imp);
    if (policy === 'own') offers = offers.filter((o) => sameOwner(o.seller, owner)).concat(offers.filter((o) => !sameOwner(o.seller, owner)));
    for (const o of offers) {
      if (left <= 0.001) break;
      const q = Math.min(left, o.qty), v = q * o.price;
      o.qty -= q; left -= q; cost += v; fromBook += q; bookCost += v; if (!sellerL) sellerL = o.lid;
      ctx.credit(city, o.seller, v);
      const sl = city.listings.find((x) => x.id === o.lid); if (sl && sl.ops) sl.ops.cur.goods += v;
    }
    city.book = city.book.filter((o) => o.qty > 0.001);
  }
  const imported = Math.max(0, left); cost += imported * imp;
  mk.bought += fromBook; mk.imported += imported;
  // human-run companies receive goods by carrier: they arrive later and freight is paid now
  if (opts && opts.carrier && ctx.book && !buyerL.ops.managed) {
    let freight = 0, eta = 0;
    if (fromBook > 0.001) { const b = ctx.book(city, buyerL, { carrier: opts.carrier, g, qty: fromBook, value: bookCost, route: 'local', from: sellerL ? { k: 'l', id: sellerL } : { k: 'import', id: 'road' } }); freight += b.freight; eta = Math.max(eta, b.days); }
    if (imported > 0.001) { const b = ctx.book(city, buyerL, { carrier: opts.carrier, g, qty: imported, value: imported * imp, route: 'import' }); freight += b.freight; eta = Math.max(eta, b.days); }
    ctx.debit(city, owner, cost + freight); buyerL.ops.cur.sup += cost; buyerL.ops.cur.fr = (buyerL.ops.cur.fr || 0) + freight;
    return { qty, cost: r4(cost + freight), goods: r4(cost), freight: r4(freight), eta, imported: r2(imported), fromBook: r2(fromBook) };
  }
  ctx.debit(city, owner, cost);
  buyerL.ops.inv[g] = (buyerL.ops.inv[g] || 0) + qty; buyerL.ops.cur.sup += cost;
  return { qty, cost: r2(cost), imported: r2(imported), fromBook: r2(fromBook) };
}
const sameOwner = (a, b) => a && b && a.k === b.k && a.id === b.id;
export function listGoods(city, l, g, qty, price, auto) {
  ensureMarket(city);
  qty = Math.min(qty, l.ops.inv[g] || 0); if (qty <= 0.001) return null;
  l.ops.inv[g] -= qty;
  const o = { id: uid('g'), g, qty, price: r4(price), seller: { ...l.owner }, lid: l.id, auto: !!auto, m: city.m };
  city.book.push(o); return o;
}
export function cancelOffer(city, o) {
  const l = city.listings.find((x) => x.id === o.lid);
  if (l && l.ops && l.owner && sameOwner(l.owner, o.seller)) l.ops.inv[o.g] = (l.ops.inv[o.g] || 0) + o.qty;
  city.book = city.book.filter((x) => x !== o);
}
export function exportGoods(city, ctx, l, g, qty, cid) {
  qty = Math.min(qty, l.ops.inv[g] || 0); if (qty <= 0.001) return 0;
  const v = qty * exportPrice(city, g); l.ops.inv[g] -= qty; city.market[g].exported += qty;
  if (cid && ctx.book && !l.ops.managed) { const b = ctx.book(city, l, { carrier: cid, g, qty, value: v, pay: v, route: 'export', from: { k: 'l', id: l.id }, to: { k: 'export', id: ctx.carrierMode(cid) } }); ctx.debit(city, l.owner, b.freight); l.ops.cur.fr = (l.ops.cur.fr || 0) + b.freight; l.ops.cur.goods += v; return { value: r2(v), freight: b.freight, days: b.days }; }
  ctx.credit(city, l.owner, v); l.ops.cur.goods += v;
  return r2(v);
}
export function restock(city, ctx, l, months) {
  const need = needsPerMonth(l), policy = l.ops.depts.procurement ? setting(l, 'procurement', 'policy') : 'cheapest';
  let cost = 0, imported = 0;
  let wants = {}; Object.entries(need).forEach(([g, q]) => { const want = q * months - (l.ops.inv[g] || 0) - (ctx.onTheWay ? ctx.onTheWay(city, l, g) : 0); if (want > 0.5) wants[g] = want; });
  if (policy === 'warehouse' && ctx.fromWarehouse) wants = ctx.fromWarehouse(city, l, wants);
  Object.entries(wants).forEach(([g, want]) => { if (want > 0.5) { const r = buyGoods(city, ctx, l, g, Math.ceil(want), policy === 'warehouse' ? 'cheapest' : policy, { carrier: setting(l, 'procurement', 'carrier') }); cost += r.cost; imported += r.imported; } });
  if (l.ops.depts.procurement && l.ops.depts.procurement.head === 'carlos') { const back = cost * 0.05; ctx.credit(city, l.owner, back); cost -= back; }
  return { cost: r2(cost), imported: r2(imported) };
}

// ---------------------------------------------------------------- the monthly cycle
// phase 1: every company produces and sells to customers
export function produce(city, ctx, l, m) {
  const o = l.ops, rec = RECIPES[l.type], y = ctx.listingYield(city, l, l.owner);
  o.curM = m;
  const cap = capacity(l), dem = demand(city, l), hasOut = Object.keys(rec.out).length > 0;
  const target = hasOut ? cap : o.managed ? Math.min(cap, dem * 1.05) : Math.max(0, Math.min(cap, dem * 1.1 - (o.fg || 0) * 0.6));
  let possible = target;
  Object.entries(rec.in).forEach(([g, q]) => { possible = Math.min(possible, (o.inv[g] || 0) / q); });
  const units = Math.max(0, Math.min(target, possible));
  Object.entries(rec.in).forEach(([g, q]) => { o.inv[g] = Math.max(0, (o.inv[g] || 0) - q * units); });
  Object.entries(rec.out).forEach(([g, q]) => { o.inv[g] = (o.inv[g] || 0) + q * units; });
  o.eff = target > 0.01 ? units / target : 1;
  const price = unitPrice(l, Math.max(0, y.trade));
  let sold;
  if (o.managed) { sold = Math.min(units, dem); const revenue = sold * price; if (revenue > 0) { ctx.credit(city, l.owner, revenue); o.cur.b2c += revenue; o.cur.sold = (o.cur.sold || 0) + sold; } }
  else {
    // finished goods come off the line week by week: a quarter now, the rest over the coming weeks
    if (o.line && o.line.left > 0) o.fg = (o.fg || 0) + o.line.per * o.line.left;
    o.fg = (o.fg || 0) + units * 0.25; o.line = { per: units * 0.25, left: 3 };
    sold = orderMonth(city, ctx, l, m, dem, price);
  }
  // customers, reputation
  const lost = Math.max(0, dem - units);
  o.customers += (80 - o.customers) * 0.06;
  if (o.depts.social || o.managed) {
    const intensity = o.managed ? 'normal' : setting(l, 'social', 'intensity');
    const a = o.managed ? 1 : automation(l, 'social'), head = o.depts.social?.head ? 1.5 : 1;
    const g = { off: 0, normal: 0.03, viral: 0.07 }[intensity] * a * head;
    o.customers *= 1 + g; if (intensity === 'viral' && a > 0) o.rep += 2 * head;
  }
  if (lost > dem * 0.15) { o.rep -= 3; o.customers *= 0.97; }
  else if (!o.managed && setting(l, 'sales', 'price') === 'premium' && o.tech >= 2) o.rep += 1;
  else o.rep += 0.5;
  o.rep = Math.max(0, Math.min(100, o.rep)); o.customers = Math.max(20, Math.min(400, o.customers));
  // morale and quits
  if (!o.managed) {
    let tgt = { low: 45, market: 65, high: 85 }[setting(l, 'hr', 'wages')];
    if (o.depts.hr && setting(l, 'hr', 'training') === 'on') tgt += 5;
    tgt -= [0, 0, 10, 20][setting(l, 'ops', 'shifts')];
    if (o.depts.finance && setting(l, 'finance', 'costs') === 'lean') tgt -= 8;
    if (o.depts.hr?.head) tgt += 8;
    const hr = automation(l, 'hr');
    o.morale += hr > 0 ? (tgt - o.morale) * 0.3 * hr : (tgt - 15 - o.morale) * 0.15;
    if (o.overtimeM === m) o.morale -= 8;
    o.morale = Math.max(0, Math.min(100, o.morale));
    if (o.morale < 30 && rand() < 0.4) { const k = Object.keys(o.depts).sort((a, b) => o.depts[b].w - o.depts[a].w)[0]; if (o.depts[k].w > 0) { o.depts[k].w--; ctx.notify(city, l, `A worker quit ${TYPES[l.type].name} (${DEPT[k].name})`, 'Morale is low. Raise wages, train or hold a team meeting.', 'bad'); } }
  } else o.morale = 70;
  // research
  if (o.depts.rnd && !o.managed) { const b = { off: 0, low: 10, high: 25 }[setting(l, 'rnd', 'budget')]; o.rp += b * (0.5 + 0.5 * automation(l, 'rnd')) * (o.depts.rnd.head ? 1.5 : 1); }
  const tech = Math.min(5, Math.floor(o.rp / 100)); if (tech > o.tech) { o.tech = tech; ctx.notify(city, l, `R&D breakthrough at ${TYPES[l.type].name}`, `Technology level ${tech}: better quality, higher price and demand.`, 'good'); }
  // books
  o.booksPenalty = !o.managed && !!o.depts.finance && automation(l, 'finance') === 0 && o.booksM !== m - 1;
  if (!o.managed && !o.depts.finance) o.booksPenalty = false;
  o.last = { m, cap: r2(cap), dem: r2(dem), units: r2(units), sold: r2(sold), price: r4(price), eff: r2(o.eff) };
}
// phase 2: sellers put surplus on the market
export function autoSell(city, ctx, l) {
  const o = l.ops, rec = RECIPES[l.type]; const a = automation(l, 'sales');
  if (!Object.keys(rec.out).length || a <= 0) return;
  city.book.filter((x) => x.lid === l.id && x.auto).forEach((x) => cancelOffer(city, x));
  const strat = B2B[o.managed ? 'market' : setting(l, 'sales', 'b2b')];
  Object.keys(rec.out).forEach((g) => {
    const mk = city.market[g], stock = o.inv[g] || 0; if (stock < 0.5) return;
    const monthly = rec.out[g] * baseCap(l);
    if (stock > monthly * 4) exportGoods(city, ctx, l, g, stock - monthly * 3); // dump old stock abroad
    const qty = (o.inv[g] || 0) * a; listGoods(city, l, g, qty, Math.min(importPrice(city, g) * 0.99, mk.p * strat), true);
  });
}
// phase 3: buyers restock
export function autoBuy(city, ctx, l) {
  const a = automation(l, 'procurement'); if (a <= 0 || !Object.keys(RECIPES[l.type].in).length) return;
  const months = l.ops.managed ? 1.2 : setting(l, 'procurement', 'stock');
  // with freight, restocking is manual until Procurement is fully automated
  if (a >= 1) restock(city, ctx, l, months);
}
// phase 4: prices move with supply and demand
export function marketMonth(city) {
  Object.entries(city.market).forEach(([g, mk]) => {
    const imp = importPrice(city, g), exp = exportPrice(city, g), listed = listedQty(city, g), demandQ = mk.bought + mk.imported;
    if (mk.imported > 0.5) mk.p += (imp - mk.p) * 0.25 * Math.min(1, mk.imported / Math.max(1, demandQ));
    else if (listed > demandQ * 0.5 + 1) mk.p -= (mk.p - exp) * 0.15;
    else mk.p += (GOODS[g].base - mk.p) * 0.05;
    mk.p = r4(Math.max(exp, Math.min(imp, mk.p * (1 + (rand() - 0.5) * 0.03))));
    mk.h.push(mk.p); if (mk.h.length > 48) mk.h.shift();
    mk.last = { bought: r2(mk.bought), imported: r2(mk.imported), exported: r2(mk.exported), listed: r2(listed) };
    mk.bought = 0; mk.imported = 0; mk.exported = 0;
  });
  city.book = city.book.filter((o) => { if (city.m - o.m >= 6) { cancelOffer(city, o); return false; } return true; });
}
// x = extra lines the engine knows about: passive income (ypi), maintenance, specialist salaries (heads)
export function closeMonth(l, m, x = {}) {
  const o = l.ops, rc = runningCosts(l), c = o.cur;
  o.hist.push({ m, b2c: r2(c.b2c), goods: r2(c.goods), sup: r2(c.sup), fr: r4(c.fr || 0), run: r2(rc.total / 12), sal: r4(rc.salaries / 12), bud: r4(rc.budgets / 12), workers: rc.workers || 0,
    ypi: r4(x.ypi || 0), maint: r4(x.maint || 0), heads: r4(x.heads || 0), units: o.last ? o.last.units : 0, sold: r2(c.sold || 0), orders: c.orders || 0, eff: r2(o.eff) });
  if (o.hist.length > 24) o.hist.shift();
  o.cur = { b2c: 0, goods: 0, sup: 0, fr: 0, sold: 0, orders: 0 };
}

// ---------------------------------------------------------------- clients and orders
const kindOf = (l) => MARKET_KIND[l.type];
export const clientById = (o, id) => (o.clients || []).find((c) => c.id === id);
export function costUnit(city, l) { return Object.entries(RECIPES[l.type].in).reduce((a, [g, q]) => a + q * (city.market ? city.market[g].p : GOODS[g].base), 0); }
function newClient(l, o, opts = {}) {
  const kind = kindOf(l), R = CLIENT_RULES[kind], used = new Set((o.clients || []).map((c) => c.name));
  const pool = CLIENT_NAMES[l.type].filter((n) => !used.has(n));
  const name = pool.length ? pool[Math.floor(rand() * pool.length)] : `${CLIENT_NAMES[l.type][0]} ${(o.clients || []).length + 1}`;
  const d = DISTRICTS[Math.floor(rand() * DISTRICTS.length)];
  const c = { id: uid('k'), name, kind, district: d.name, x: Math.round(d.box.x + (0.15 + rand() * 0.7) * d.box.w), y: Math.round(d.box.y + (0.15 + rand() * 0.7) * d.box.h),
    weight: r2(opts.weight || R.weight[0] + rand() * (R.weight[1] - R.weight[0])), mood: Math.min(100, Math.round((opts.mood || 62 + rand() * 18) + 2 * (o.pt || 0))), terms: r2(opts.terms || 0.95 + rand() * 0.13),
    since: o.curM || 0, orders: 0, revenue: 0, status: 'active' };
  (o.clients = o.clients || []).push(c); return c;
}
export function ensureClients(l) {
  const o = l.ops; if (o.clients) return;
  o.clients = []; o.orders = []; o.done = []; o.board = o.board || [];
  for (let i = 0; i < CLIENT_RULES[kindOf(l)].start; i++) newClient(l, o);
}
function recalc(city, l, od) { od.value = r2(od.units * od.unit); od.cost = r2(od.units * costUnit(city, l)); od.earning = r2(od.value - od.cost); }
export const activeClients = (o) => (o.clients || []).filter((c) => c.status === 'active');
function orderMonth(city, ctx, l, m, dem, price) {
  ensureClients(l);
  const o = l.ops, R = CLIENT_RULES[kindOf(l)], name = TYPES[l.type].name;
  // answers to counter-offers from last month
  o.orders.forEach((od) => {
    if (od.status !== 'renegotiating' || od.askM >= m) return;
    const c = clientById(o, od.cid); const p = R.renegotiate + (c.mood - 50) / 120 - (od.ask - 1) * 2.2;
    if (rand() < p) { od.unit = r4(od.unit * od.ask); recalc(city, l, od); od.status = 'accepted'; od.due = m + 2; c.mood -= 2; ctx.notify(city, l, `${c.name} accepted your counter-offer`, `${name}: ${od.units} units at ${r2(od.value)} M. Deliver within two months.`, 'good'); }
    else { od.status = 'cancelled'; od.reason = 'The client walked away after your counter-offer.'; c.mood -= 6; ctx.notify(city, l, `${c.name} cancelled after your counter-offer`, `${name}: an order worth ${r2(od.value)} M is gone.`, 'bad'); }
  });
  // orders nobody answered, and deliveries that came too late
  o.orders.forEach((od) => {
    const c = clientById(o, od.cid);
    if (od.status === 'new' && m - od.m >= R.expire) { od.status = 'cancelled'; od.reason = 'Nobody answered in time.'; c.mood -= 15; o.rep = Math.max(0, o.rep - 2); }
    else if (od.status === 'accepted' && od.due < m) { od.status = 'cancelled'; od.reason = 'Not delivered in time. The client cancelled.'; c.mood -= 10; o.rep = Math.max(0, o.rep - 2); }
  });
  // unhappy clients leave; the rest slowly calm down
  o.clients.forEach((c) => {
    if (c.status !== 'active') return;
    c.mood = Math.max(0, Math.min(100, c.mood + (60 - c.mood) * 0.04));
    if (c.mood < 25) {
      c.status = 'left'; c.leftM = m; o.customers *= 0.95;
      ctx.notify(city, l, `${c.name} stopped buying from your ${name}`, 'Too many ignored, rejected or late orders.', 'bad');
      o.orders.forEach((od) => { if (od.cid === c.id && ['new', 'accepted', 'renegotiating'].includes(od.status)) { od.status = 'cancelled'; od.reason = `${c.name} stopped working with you.`; } });
    }
  });
  // a growing customer base brings new clients
  const act = activeClients(o), target = Math.max(2, Math.round(R.start * o.customers / 100));
  if (act.length < target && rand() < 0.6) { const c = newClient(l, o); ctx.notify(city, l, `New client for your ${name}: ${c.name}`, `${R.label} in ${c.district}.`, 'good'); }
  // new orders
  const clients = activeClients(o);
  let orderers = clients.filter((c) => rand() < R.orderChance * (c.mood < 40 ? 0.6 : 1));
  if (!orderers.length && clients.length) orderers = [clients[Math.floor(rand() * clients.length)]];
  const tw = orderers.reduce((a, c) => a + c.weight, 0) || 1, fresh = [];
  orderers.forEach((c) => {
    let units = dem * c.weight / tw * (0.85 + rand() * 0.3), unit = price * c.terms * (c.mood < 45 ? 0.92 : 1) * (0.93 + rand() * 0.14), tag = null;
    const r = rand();
    if (r < (c.kind === 'b2c' ? 0.2 : 0.1)) { tag = 'rush'; unit *= 1.15; }
    else if (c.kind === 'b2b' && r < 0.3) { tag = 'bulk'; units *= 1.6; unit *= 0.92; }
    const od = { id: uid('o'), cid: c.id, units: Math.max(1, Math.round(units)), unit: r4(unit), m, tag, status: 'new' };
    recalc(city, l, od);
    // orders trickle in through the month: the first arrives now, the rest in the coming weeks
    const wait = fresh.length ? Math.floor(rand() * 4) : 0;
    if (wait && !o.managed) { (o.queue = o.queue || []).push({ od, wk: m * 4 + wait }); } else { o.orders.push(od); fresh.push(od); }
  });
  // a staffed sales team answers and ships orders by itself
  const a = automation(l, 'sales');
  let shipped = 0;
  if (a > 0) {
    fresh.forEach((od) => autoAnswer(o, od, a, m));
    o.orders.filter((od) => od.status === 'accepted' && (od.auto || a >= 1)).forEach((od) => { if (rand() < a && (o.fg || 0) >= od.units) { shipped += od.units; deliverOrder(city, ctx, l, od, m); } });
    if (a >= 1) o.orders = o.orders.filter((od) => od.status !== 'cancelled');
  }
  o.orders = o.orders.slice(-30);
  return shipped;
}
function autoAnswer(o, od, a, m) { if (rand() < a) { od.auto = true; if (od.earning > 0) accept(o, od, m); else { od.status = 'renegotiating'; od.ask = 1.1; od.askM = m; } } }
// weekly: queued orders arrive one by one
export function weekStep(city, ctx, l, wk) {
  const o = l.ops; if (!o) return;
  if (o.line && o.line.left > 0) {
    o.fg = (o.fg || 0) + o.line.per; o.line.left--;
    // a staffed sales team ships accepted orders as soon as the stock is there
    const a0 = automation(l, 'sales'), m0 = Math.floor(wk / 4);
    if (a0 > 0) (o.orders || []).filter((od) => od.status === 'accepted' && (od.auto || a0 >= 1)).forEach((od) => { if (rand() < a0 && (o.fg || 0) >= od.units) deliverOrder(city, ctx, l, od, m0); });
  }
  if (!o.queue || !o.queue.length) return;
  const due = o.queue.filter((q) => q.wk <= wk); if (!due.length) return;
  o.queue = o.queue.filter((q) => q.wk > wk);
  const m = Math.floor(wk / 4), a = automation(l, 'sales');
  due.forEach((q) => { const c = clientById(o, q.od.cid); if (!c || c.status !== 'active') return; recalc(city, l, q.od); o.orders.push(q.od); if (a > 0) autoAnswer(o, q.od, a, m); });
  o.orders = o.orders.slice(-30);
}
function accept(o, od, m) { const c = clientById(o, od.cid); od.status = 'accepted'; od.due = m + (od.tag === 'rush' ? 1 : 2); if (c) c.mood = Math.min(100, c.mood + 3); }
function deliverOrder(city, ctx, l, od, m) {
  const o = l.ops, c = clientById(o, od.cid);
  o.fg -= od.units; ctx.credit(city, l.owner, od.value); o.cur.b2c += od.value; o.cur.orders = (o.cur.orders || 0) + 1; o.cur.sold = (o.cur.sold || 0) + od.units;
  if (c) { c.mood = Math.min(100, c.mood + (od.due >= m ? 5 : 1)); c.orders++; c.revenue = r2(c.revenue + od.value); }
  od.status = 'delivered'; od.dm = m;
  o.orders = o.orders.filter((x) => x !== od); o.done.unshift(od); if (o.done.length > 15) o.done.length = 15;
}
export function orderAction(city, ctx, l, action, a = {}) {
  ensureClients(l);
  const o = l.ops, m = city.m, od = o.orders.find((x) => x.id === a.oid);
  if (!od) return { ok: false, msg: 'This order is no longer open.' };
  const c = clientById(o, od.cid), R = CLIENT_RULES[kindOf(l)];
  if (action === 'archive') { if (od.status !== 'cancelled') return { ok: false, msg: 'Only cancelled orders can be archived.' }; o.orders = o.orders.filter((x) => x !== od); return { ok: true }; }
  if (action === 'accept') { if (od.status !== 'new') return { ok: false, msg: 'This order is not waiting for an answer.' }; accept(o, od, m); return { ok: true, msg: `Accepted. Deliver to ${c.name} ${od.due === m + 1 ? 'by next month' : 'within two months'}.` }; }
  if (action === 'reject') { if (od.status !== 'new') return { ok: false, msg: 'This order is not waiting for an answer.' }; c.mood -= R.rejectHit; o.orders = o.orders.filter((x) => x !== od); return { ok: true, msg: `Order rejected. ${c.name} is less happy with you.` }; }
  if (action === 'renegotiate') {
    if (od.status !== 'new') return { ok: false, msg: 'You can only renegotiate new orders.' };
    const ask = [1.1, 1.2].includes(Number(a.ask)) ? Number(a.ask) : 1.1;
    od.status = 'renegotiating'; od.ask = ask; od.askM = m; c.mood -= 4;
    return { ok: true, msg: `Counter-offer sent: +${Math.round((ask - 1) * 100)}%. ${c.name} answers next month and may walk away.` };
  }
  if (action === 'deliver') {
    if (od.status !== 'accepted') return { ok: false, msg: 'Accept the order before delivering.' };
    if (a.cid !== od.cid) { const wrong = clientById(o, a.cid); c.mood -= 2; return { ok: false, wrong: true, msg: `Wrong address. That is ${wrong ? wrong.name : 'somewhere else'}. This order goes to ${c.name}.` }; }
    if ((o.fg || 0) < od.units) return { ok: false, msg: `Not enough finished stock: ${Math.floor(o.fg || 0)} of ${od.units} units. Production adds more every month.` };
    deliverOrder(city, ctx, l, od, m);
    return { ok: true, msg: `Delivered to ${c.name}: +${r2(od.value)} M.` };
  }
  return { ok: false, msg: 'Unknown order action.' };
}

// ---------------------------------------------------------------- buying single supplies
export function quote(city, l, g, qty, policy, cid) {
  const imp = importPrice(city, g); let left = qty, cost = 0, fromBook = 0, bookCost = 0;
  if (policy !== 'import') {
    let offers = offersFor(city, g).filter((o) => o.price <= imp);
    if (policy === 'own') offers = offers.filter((o) => sameOwner(o.seller, l.owner)).concat(offers.filter((o) => !sameOwner(o.seller, l.owner)));
    for (const o of offers) { if (left <= 0) break; const q = Math.min(left, o.qty); cost += q * o.price; bookCost += q * o.price; left -= q; fromBook += q; }
  }
  const imported = Math.max(0, left); cost += imported * imp;
  let freight = 0, minDays = 0, maxDays = 0;
  if (cid && freightQuote) { [[fromBook, bookCost, 'local'], [imported, imported * imp, 'import']].forEach(([q, v, route]) => { if (q > 0.001) { const f = freightQuote(cid, v, q, route); freight += f.cost; minDays = Math.max(minDays, f.minDays); maxDays = Math.max(maxDays, f.maxDays); } }); }
  return { cost: r4(cost + freight), goods: r4(cost), freight: r4(freight), minDays, maxDays, fromBook: Math.round(fromBook), imported: Math.round(imported), avg: qty ? r4(cost / qty) : 0 };
}
let freightQuote = null; export function setFreightQuote(f) { freightQuote = f; }
export function buySupply(city, ctx, l, g, qty, cid) {
  if (!(g in RECIPES[l.type].in)) return { ok: false, msg: 'This company does not use that supply.' };
  qty = Math.max(1, Math.round(qty));
  const policy = l.ops.depts.procurement ? setting(l, 'procurement', 'policy') : 'cheapest';
  const r = buyGoods(city, ctx, l, g, qty, policy, { carrier: cid || setting(l, 'procurement', 'carrier') });
  return { ok: true, msg: r.freight !== undefined ? `Ordered ${qty} ${GOODS[g].unit} of ${GOODS[g].name.toLowerCase()}: ${r2(r.goods)} M + $${Math.round(r.freight * 1000)}k freight. Expected in about ${Math.round(r.eta)} days.` : `Bought ${qty} ${GOODS[g].unit} of ${GOODS[g].name.toLowerCase()} for ${r.cost} M.` };
}

// ---------------------------------------------------------------- the company board (owner and coop partners)
export function post(l, author, text, now) {
  const o = l.ops; o.board = o.board || [];
  const msg = { id: uid('b'), pid: author.id, name: author.name, text: String(text).trim().slice(0, 280), m: o.curM || 0, at: now };
  if (!msg.text) return { ok: false, msg: 'Write a message first.' };
  o.board.unshift(msg); if (o.board.length > 40) o.board.length = 40; return { ok: true, msg: 'Posted.' };
}

// ---------------------------------------------------------------- manual work for owners without staff
export function tasks(city, l) {
  const o = l.ops; if (!o || o.managed) return [];
  const m = city.m, out = [], ords = o.orders || [], R = CLIENT_RULES[kindOf(l)];
  const fresh = ords.filter((x) => x.status === 'new'), ready = ords.filter((x) => x.status === 'accepted'), gone = ords.filter((x) => x.status === 'cancelled');
  if (fresh.length) out.push({ id: 'orders', dept: 'sales', label: `${fresh.length} new order${fresh.length > 1 ? 's' : ''} need an answer`, value: r2(fresh.reduce((a, x) => a + x.value, 0)), urgent: fresh.some((x) => m - x.m >= R.expire - 1) });
  if (ready.length) out.push({ id: 'deliver', dept: 'sales', label: `${ready.length} order${ready.length > 1 ? 's' : ''} ready to deliver`, value: r2(ready.reduce((a, x) => a + x.value, 0)), urgent: ready.some((x) => x.due <= m) });
  if (gone.length) out.push({ id: 'archive', dept: 'sales', label: `${gone.length} cancelled order${gone.length > 1 ? 's' : ''} to archive` });
  if (automation(l, 'ops') === 0 && !(o.boost && o.boost.m === m + 1)) out.push({ id: 'runShift', dept: 'ops', label: 'No production staff: run the line yourself this month', urgent: true });
  if (automation(l, 'procurement') < 1 && coverMonths(l) < 1.05) out.push({ id: 'restock', dept: 'procurement', label: coverMonths(l) < 0.05 ? 'Production is stopped: buy supplies' : `Supplies last ${coverMonths(l).toFixed(1)} months: restock`, urgent: coverMonths(l) < 0.5 });
  const outs = Object.keys(RECIPES[l.type].out).filter((g) => (o.inv[g] || 0) >= 1);
  if (automation(l, 'sales') < 1 && outs.length) out.push({ id: 'sellSurplus', dept: 'sales', label: `Sell surplus ${outs.map((g) => GOODS[g].name.toLowerCase()).join(' and ')}` });
  if (automation(l, 'sales') < 1 && o.cd.findCustomers !== m) out.push({ id: 'findCustomers', dept: 'sales', label: 'Find new clients', interactive: true });
  if (o.depts.social && automation(l, 'social') === 0 && o.cd.postCampaign !== m) out.push({ id: 'postCampaign', dept: 'social', label: 'Shoot a social media campaign', interactive: true });
  if (automation(l, 'hr') === 0 && o.morale < 70 && o.cd.teamMeeting !== m) out.push({ id: 'teamMeeting', dept: 'hr', label: `Morale is ${Math.round(o.morale)}: hold a team meeting`, urgent: o.morale < 35, interactive: true });
  if (o.depts.finance && automation(l, 'finance') === 0 && o.booksM !== m) out.push({ id: 'reviewBooks', dept: 'finance', label: 'Close the monthly books', interactive: true });
  if (o.depts.rnd && automation(l, 'rnd') === 0 && o.cd.runExperiment !== m) out.push({ id: 'runExperiment', dept: 'rnd', label: 'Run an R&D experiment', interactive: true });
  if (o.depts.legal && automation(l, 'legal') === 0 && o.legalUntil < m) out.push({ id: 'reviewContracts', dept: 'legal', label: 'Review contracts', interactive: true });
  return out;
}
export function doTask(city, ctx, l, task, a = {}) {
  const o = l.ops, m = city.m, s = SIZES[l.size].mult, ch = a.choice;
  const workers = Object.values(o.depts).reduce((x, d) => x + d.w, 0);
  const once = (k) => { if (o.cd[k] === m) return false; o.cd[k] = m; return true; };
  switch (task) {
    case 'restock': { if (automation(l, 'procurement') < 1) return { ok: false, msg: 'Order each supply by hand below, or fully staff Procurement to restock automatically.' }; const r = restock(city, ctx, l, Number(a.months) || (o.depts.procurement ? setting(l, 'procurement', 'stock') : 1)); return { ok: true, msg: r.cost > 0 ? `Bought supplies for ${r2(r.cost)} M${r.imported > 0 ? ` (${Math.round(r.imported)} units imported)` : ''}.` : 'Stock is already full.' }; }
    case 'sellSurplus': { let v = 0; Object.keys(RECIPES[l.type].out).forEach((g) => { const mk = city.market[g]; const q = o.inv[g] || 0; if (q >= 1) { listGoods(city, l, g, q, mk.p * B2B[setting(l, 'sales', 'b2b')], false); v += q * mk.p; } }); return { ok: true, msg: `Listed on the city market for about ${r2(v)} M. Buyers pay when they buy.` }; }
    case 'runShift': { if (o.boost && o.boost.m === m + 1) return { ok: false, msg: 'You already worked the line this month.' }; o.boost = { m: m + 1, mult: 2 }; return { ok: true, msg: 'You run the line yourself. Output this month is doubled. Hire Operations staff to automate it.' }; }
    case 'teamMeeting': {
      if (!once('teamMeeting')) return { ok: false, msg: 'Already held this month.' };
      if (ch === 'bonus') { const c = r2(0.05 * Math.max(1, workers)); ctx.debit(city, l.owner, c); o.morale = Math.min(100, o.morale + 18); return { ok: true, msg: `Bonus paid (${c} M). Morale +18.` }; }
      if (ch === 'firm') { o.morale = Math.min(100, o.morale + 3); o.boost = { m: m + 1, mult: 1.1 }; return { ok: true, msg: 'Targets stay. +10% output next month, morale +3.' }; }
      o.morale = Math.min(100, o.morale + 9); return { ok: true, msg: 'The team feels heard. Morale +9.' };
    }
    case 'findCustomers': {
      ensureClients(l); if (!once('findCustomers')) return { ok: false, msg: 'Already done this month.' };
      const kind = kindOf(l), big = kind === 'b2b' ? 2.2 : 1.4;
      if (ch === 'small') { const a1 = newClient(l, o, { weight: kind === 'b2b' ? 0.8 : 0.5 }), a2 = newClient(l, o, { weight: kind === 'b2b' ? 0.7 : 0.45 }); o.customers = Math.min(400, o.customers * 1.06); return { ok: true, msg: `Signed ${a1.name} and ${a2.name}.` }; }
      if (ch === 'discount') { const c = newClient(l, o, { weight: kind === 'b2b' ? 1.2 : 0.8, terms: 0.88 }); o.customers = Math.min(400, o.customers * 1.05); return { ok: true, msg: `${c.name} signed on at a 10% discount.` }; }
      if (rand() < 0.55) { const c = newClient(l, o, { weight: big, mood: 72 }); o.customers = Math.min(400, o.customers * 1.1); return { ok: true, msg: `Big win: ${c.name} is now a client.` }; }
      return { ok: true, msg: 'The big account went with a competitor this time.' };
    }
    case 'postCampaign': {
      if (!once('postCampaign')) return { ok: false, msg: 'Already posted this month.' };
      if (ch === 'influencer') { const c = r2(0.1 * s); ctx.debit(city, l.owner, c); o.customers = Math.min(400, o.customers * 1.07); return { ok: true, msg: `Influencer post live (${c} M). Customers +7%.` }; }
      if (ch === 'flash') { o.customers = Math.min(400, o.customers * 1.09); o.rep = Math.max(0, o.rep - 3); return { ok: true, msg: 'Flash sale! Customers +9%, reputation −3.' }; }
      o.customers = Math.min(400, o.customers * 1.03); o.rep = Math.min(100, o.rep + 4); return { ok: true, msg: 'Story published. Customers +3%, reputation +4.' };
    }
    case 'reviewBooks': {
      o.booksM = m; o.booksPenalty = false;
      if (ch === 'cut') { o.costCutM = m + 1; return { ok: true, msg: 'Books closed. Running costs −4% next month.' }; }
      if (ch === 'chase') { const last = o.hist[o.hist.length - 1]; const v = r2((last ? last.b2c : 0) * (0.01 + rand() * 0.02)); if (v > 0) ctx.credit(city, l.owner, v); return { ok: true, msg: `Books closed. Collected ${v} M from late payers.` }; }
      return { ok: true, msg: 'Books closed for this month.' };
    }
    case 'runExperiment': {
      if (!once('runExperiment')) return { ok: false, msg: 'Already ran one this month.' };
      if (ch === 'push') { const win = rand() < 0.7; o.rp += win ? 30 : 5; return { ok: true, msg: win ? 'It held! +30 research points.' : 'The prototype failed. +5 research points.' }; }
      if (ch === 'share') { o.rp += 10; o.rep = Math.min(100, o.rep + 3); return { ok: true, msg: '+10 research points, reputation +3.' }; }
      o.rp += 15; return { ok: true, msg: '+15 research points.' };
    }
    case 'reviewContracts': {
      if (ch === 'tight') { ctx.debit(city, l.owner, 0.1); o.legalUntil = m + 4; return { ok: true, msg: 'Clauses rewritten. Covered for 4 months.' }; }
      if (ch === 'skim') { o.legalUntil = m + 1; return { ok: true, msg: 'Covered for 1 month.' }; }
      o.legalUntil = m + 3; return { ok: true, msg: 'Contracts reviewed. Covered for 3 months.' };
    }
    case 'overtime': {
      if (o.boost && o.boost.m === m + 1) return { ok: false, msg: 'Next month is already planned.' };
      if (ch === 'paid') { const c = r2(0.03 * Math.max(1, o.depts.ops.w)); ctx.debit(city, l.owner, c); o.boost = { m: m + 1, mult: 1.2 }; o.morale = Math.max(0, o.morale - 4); return { ok: true, msg: `Paid overtime booked (${c} M): +20% output next month.` }; }
      if (ch === 'volunteer') { o.boost = { m: m + 1, mult: 1.1 }; o.morale = Math.max(0, o.morale - 8); return { ok: true, msg: 'Volunteers found: +10% output next month.' }; }
      o.morale = Math.min(100, o.morale + 4); return { ok: true, msg: 'Normal hours. Morale +4.' };
    }
    default: return { ok: false, msg: 'Unknown task.' };
  }
}
export function legallyCovered(l) {
  const o = l.ops; if (!o) return false; if (o.managed) return rand() < 0.5;
  const d = o.depts.legal; if (!d) return false;
  return !!d.head || (setting(l, 'legal', 'level') === 'strict' && automation(l, 'legal') > 0) || o.legalUntil >= o.curM;
}
export function cyberProtected(l) { const o = l.ops; if (!o) return false; if (o.managed) return rand() < 0.5; const d = o.depts.rnd; return !!(d && (d.head === 'anika' || automation(l, 'rnd') >= 1)); }
export const DEPTS_BY_HEAD = Object.fromEntries(DEPTS.filter((d) => d.head).map((d) => [d.head, d.id]));
