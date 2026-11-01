// Aurex Bay Tycoon — warehouses and shipments.
// Goods travel in real time: imports arrive at a warehouse after the site's lead time,
// trucks then carry them to your companies, taking longer the farther they drive.
import { GOODS, RECIPES, WAREHOUSE_SITES, LOGISTICS, CONFIG, SIZES, CARRIERS, MAP } from './content.js';

const r2 = (v) => Math.round(v * 100) / 100;
const uid = (p) => p + Math.random().toString(36).slice(2, 9);
const DAY = 1 / 365; // in game years
export const SITE = Object.fromEntries(WAREHOUSE_SITES.map((s) => [s.id, s]));
export const CARRIER = Object.fromEntries(CARRIERS.map((c) => [c.id, c]));
export const CARRIERS_BY_SITE = Object.fromEntries(CARRIERS.map((c) => [c.partner.site, c]));
const rnd = Math.random;
const between = ([a, b]) => a + rnd() * (b - a);

// ---------------------------------------------------------------- carriers
// route: 'import' (from abroad), 'local' (from a seller in the city), 'export' (out of the city)
export function freight(cid, value, qty, route, siteId) {
  const c = CARRIER[cid] || CARRIER.ridge, pt = c.partner && c.partner.site === siteId ? c.partner : null;
  let cost = c.fee + value * c.pct * (route === 'local' ? 0.4 : 1);
  if (c.bulkQty && qty >= c.bulkQty) cost *= 1 - c.bulk;
  if (pt) cost *= pt.cost;
  const span = route === 'local' ? c.localDays : c.days, f = pt ? pt.days : 1;
  return { cost: Math.round(cost * 10000) / 10000, minDays: Math.round(span[0] * f * 10) / 10, maxDays: Math.round(span[1] * f * 10) / 10, carrier: c.id, partner: !!pt };
}
// books a shipment with a carrier: the promised ETA, and what will really happen (delay, damage) is decided now
export function book(city, o) {
  const c = CARRIER[o.carrier] || CARRIER.ridge, pt = c.partner && c.partner.site === o.siteId ? c.partner : null;
  const q = freight(c.id, o.value || 0, o.qty, o.route, o.siteId);
  const days = Math.round(between([q.minDays, q.maxDays]) * 10) / 10;
  const delayP = pt && pt.delay !== undefined ? pt.delay : c.delay;
  const late = rnd() < delayP ? Math.round(between(c.delayDays) * 10) / 10 : 0;
  const dmg = rnd() < c.dmgChance ? Math.round(between(c.dmg) * 100) / 100 : 0;
  const sh = ship(city, { g: o.g, qty: o.qty, from: o.from, to: o.to, owner: o.owner, departG: o.gNow, etaG: o.gNow + days * DAY, arriveG: o.gNow + (days + late) * DAY, mode: c.mode, carrier: c.id, freight: q.cost, value: o.value || 0, route: o.route, dmg, pay: o.pay || 0 });
  return { sh, freight: q.cost, days, eta: days };
}
export function status(s, g) { if (g >= s.arriveG) return 'Delivered'; if (g > (s.etaG ?? s.arriveG)) return 'Delayed'; if (g - s.departG < (s.arriveG - s.departG) * 0.08) return 'Picked up'; return 'In transit'; }
export const myShipments = (city, pid) => (city.shipments || []).filter((s) => s.owner === pid);

export function ensureWarehouses(city) {
  if (!city.warehouses) city.warehouses = WAREHOUSE_SITES.map((s) => ({ id: s.id, owner: null, level: 1, stock: {}, auto: { supply: false, importMonths: 0 }, since: null }));
  if (!city.shipments) city.shipments = [];
}
export const warehouse = (city, id) => (city.warehouses || []).find((w) => w.id === id);
export const capacityOf = (w) => Math.round(SITE[w.id].cap * Math.pow(LOGISTICS.levelCap, w.level - 1));
export const stored = (w) => Object.values(w.stock).reduce((a, b) => a + b, 0);
export const inbound = (city, w) => city.shipments.filter((s) => s.to.k === 'w' && s.to.id === w.id).reduce((a, s) => a + s.qty, 0);
export const upgradeCost = (w) => r2(SITE[w.id].price * LOGISTICS.upgradeCostMult * w.level);
export const ownedWarehouses = (city, pid) => (city.warehouses || []).filter((w) => w.owner === pid);
export function truckDays(site, l) { const d = Math.hypot(site.x - l.x, site.y - l.y); return Math.max(LOGISTICS.minTruckDays, Math.round(d / 100 * LOGISTICS.truckDaysPer100px * 10) / 10); }
export function importQuote(city, w, g, qty, importPrice, cid = 'ridge') {
  const site = SITE[w.id]; let unit = importPrice * site.importMult; if (qty >= LOGISTICS.bulkDiscountQty) unit *= 1 - LOGISTICS.bulkDiscount;
  const goods = r2(unit * qty), f = freight(cid, goods, qty, 'import', w.id);
  return { unit, goods, freight: f.cost, cost: Math.round((goods + f.cost) * 10000) / 10000, days: f.maxDays, minDays: f.minDays, partner: f.partner };
}
// shipments: { id, g, qty, from:{k:'import'|'w', id}, to:{k:'w'|'l', id}, owner, departG, arriveG, mode }
function ship(city, s) { s.id = uid('s'); city.shipments.push(s); return s; }
export function arrivals(city, g, notify) {
  if (!city.shipments || !city.shipments.length) return;
  const keep = [];
  city.shipments.forEach((s) => {
    if (s.arriveG > g) { keep.push(s); return; }
    const got = s.qty * (1 - (s.dmg || 0)); s.got = got;
    if (s.to.k === 'export') { const v = (s.pay || 0) * (1 - (s.dmg || 0)), p = city.players[s.owner], h = !p && city.holdings && city.holdings[s.owner]; if (p) p.cash += v; else if (h) { h.treasury += v; h.accrued += v; } } // a coop's export pays its treasury
    else if (s.to.k === 'w') { const w = warehouse(city, s.to.id); if (w && w.owner === s.owner) w.stock[s.g] = (w.stock[s.g] || 0) + got; }
    else { const l = city.listings.find((x) => x.id === s.to.id); if (l && l.ops && l.owner && l.owner.id === s.owner) l.ops.inv[s.g] = (l.ops.inv[s.g] || 0) + got; }
    if (notify && s.qty >= 1) notify(s);
  });
  city.shipments = keep;
}

export function buy(city, p, id) {
  const w = warehouse(city, id), site = SITE[id];
  if (!w) return { ok: false, msg: 'Unknown warehouse.' }; if (w.owner) return { ok: false, msg: 'Someone already owns this warehouse.' };
  if (p.cash < site.price) return { ok: false, msg: `The warehouse costs ${site.price} M.` };
  p.cash -= site.price; w.owner = p.id; w.since = city.m; w.stock = {}; w.level = 1; w.auto = { supply: false, importMonths: 0 };
  return { ok: true, msg: `${site.name} is yours. Import goods here and truck them to your companies.` };
}
export function sell(city, p, w) {
  if (w.owner !== p.id) return { ok: false, msg: 'Not your warehouse.' };
  const site = SITE[w.id]; const v = r2(site.price * (0.7 + 0.25 * (w.level - 1)));
  p.cash += v; w.owner = null; w.stock = {}; w.level = 1; city.shipments = city.shipments.filter((s) => !(s.to.k === 'w' && s.to.id === w.id));
  return { ok: true, msg: `Sold for ${v} M. Stock left behind was written off.` };
}
export function importTo(city, p, w, g, qty, importPrice, gNow, cid = 'ridge') {
  if (w.owner !== p.id) return { ok: false, msg: 'Not your warehouse.' };
  if (!GOODS[g]) return { ok: false, msg: 'Unknown supply.' };
  qty = Math.max(1, Math.round(qty));
  const free = capacityOf(w) - stored(w) - inbound(city, w); if (qty > free) return { ok: false, msg: `Only room for ${Math.max(0, Math.floor(free))} more units, counting shipments on the way.` };
  const q = importQuote(city, w, g, qty, importPrice, cid); if (p.cash < q.cost) return { ok: false, msg: `This import costs ${q.cost} M including freight.` };
  p.cash -= q.cost;
  const b = book(city, { carrier: cid, g, qty, value: q.goods, route: 'import', siteId: w.id, from: { k: 'import', id: CARRIER[cid].mode }, to: { k: 'w', id: w.id }, owner: p.id, gNow });
  return { ok: true, msg: `${qty} ${GOODS[g].unit} of ${GOODS[g].name.toLowerCase()} booked with ${CARRIER[cid].name}: ${r2(q.goods)} M + $${Math.round(q.freight * 1000)}k freight. Expected in ${b.days} days.`, cost: q.cost };
}
export function dispatch(city, p, w, l, g, qty, gNow) {
  if (w.owner !== p.id) return { ok: false, msg: 'Not your warehouse.' };
  if (!l || !l.owner || l.owner.k !== 'p' || l.owner.id !== p.id) return { ok: false, msg: 'You can only supply your own companies.' };
  qty = Math.min(Math.round(qty), Math.floor(w.stock[g] || 0)); if (qty < 1) return { ok: false, msg: 'Nothing of that in stock.' };
  w.stock[g] -= qty; if (w.stock[g] < 0.5) delete w.stock[g];
  const days = truckDays(SITE[w.id], l);
  ship(city, { g, qty, from: { k: 'w', id: w.id }, to: { k: 'l', id: l.id }, owner: p.id, departG: gNow, arriveG: gNow + days * DAY, mode: 'truck' });
  return { ok: true, msg: `Truck on the way: ${qty} ${GOODS[g].unit}, arrives in ${days} game days.`, days };
}
export function exportFrom(city, p, w, g, qty, exportPrice, gNow, cid = 'ridge') {
  if (w.owner !== p.id) return { ok: false, msg: 'Not your warehouse.' };
  qty = Math.min(Math.round(qty), Math.floor(w.stock[g] || 0)); if (qty < 1) return { ok: false, msg: 'Nothing of that in stock.' };
  const v = r2(qty * exportPrice * SITE[w.id].exportMult), f = freight(cid, v, qty, 'export', w.id); if (p.cash < f.cost) return { ok: false, msg: `Freight costs ${f.cost} M.` };
  w.stock[g] -= qty; if (w.stock[g] < 0.5) delete w.stock[g]; p.cash -= f.cost;
  const b = book(city, { carrier: cid, g, qty, value: v, pay: v, route: 'export', siteId: w.id, from: { k: 'w', id: w.id }, to: { k: 'export', id: CARRIER[cid].mode }, owner: p.id, gNow });
  return { ok: true, msg: `Export of ${qty} ${GOODS[g].unit} booked with ${CARRIER[cid].name}. You get ${v} M on delivery in about ${b.days} days (freight $${Math.round(f.cost * 1000)}k paid).` };
}
export function upgrade(city, p, w) {
  if (w.owner !== p.id) return { ok: false, msg: 'Not your warehouse.' }; if (w.level >= 4) return { ok: false, msg: 'Already at full size.' };
  const c = upgradeCost(w); if (p.cash < c) return { ok: false, msg: `Expanding costs ${c} M.` };
  p.cash -= c; w.level++; return { ok: true, msg: `Expanded to level ${w.level}: room for ${capacityOf(w)} units.` };
}
// supplies a company needs that are not already on a truck to it
export function onTheWay(city, l, g) { return city.shipments.filter((s) => s.to.k === 'l' && s.to.id === l.id && s.g === g).reduce((a, s) => a + s.qty, 0); }
// procurement and automation: send what companies need from the owner's warehouses, nearest first
export function supplyFromWarehouses(city, p, l, needs, gNow) {
  const ws = ownedWarehouses(city, p.id).sort((a, b) => truckDays(SITE[a.id], l) - truckDays(SITE[b.id], l));
  const left = { ...needs };
  Object.keys(left).forEach((g) => {
    left[g] -= onTheWay(city, l, g);
    for (const w of ws) { if (left[g] < 1) break; const have = Math.floor(w.stock[g] || 0); if (have < 1) continue; const q = Math.min(have, Math.ceil(left[g])); dispatch(city, p, w, l, g, q, gNow); left[g] -= q; }
  });
  return left;
}
// monthly warehouse rules
export function monthly(city, p, needsOf, importPrice, gNow) {
  ownedWarehouses(city, p.id).forEach((w) => {
    if (w.auto.importMonths > 0) {
      const cid = w.auto.carrier || 'ridge';
      const total = {}; city.listings.filter((l) => l.owner && l.owner.k === 'p' && l.owner.id === p.id && l.ops).forEach((l) => Object.entries(needsOf(l)).forEach(([g, q]) => (total[g] = (total[g] || 0) + q)));
      Object.entries(total).forEach(([g, q]) => {
        const want = Math.round(q * w.auto.importMonths - (w.stock[g] || 0) - city.shipments.filter((s) => s.to.k === 'w' && s.to.id === w.id && s.g === g).reduce((a, s) => a + s.qty, 0));
        const free = capacityOf(w) - stored(w) - inbound(city, w);
        const qty = Math.min(want, Math.floor(free)); if (qty >= 5) importTo(city, p, w, g, qty, importPrice(g), gNow, cid);
      });
    }
  });
  if (ownedWarehouses(city, p.id).some((w) => w.auto.supply)) {
    city.listings.filter((l) => l.owner && l.owner.k === 'p' && l.owner.id === p.id && l.ops).forEach((l) => {
      const need = {}; Object.entries(needsOf(l)).forEach(([g, q]) => { const want = q * 1.5 - (l.ops.inv[g] || 0); if (want >= 1) need[g] = want; });
      supplyFromWarehouses(city, p, l, need, gNow);
    });
  }
}
export function upkeep(city, pid) { return ownedWarehouses(city, pid).reduce((a, w) => a + SITE[w.id].upkeep * (1 + 0.3 * (w.level - 1)), 0); }
// where a moving shipment is right now (for drawing it on the map)
export function position(city, s, gNow) {
  const edge = (mode) => (mode === 'air' ? { x: MAP.w + 120, y: 40 } : mode === 'sea' ? { x: 420, y: MAP.h + 120 } : mode === 'rail' ? { x: -100, y: 300 } : { x: MAP.w + 120, y: 420 });
  const at = (e) => (e.k === 'w' ? SITE[e.id] : e.k === 'l' ? city.listings.find((x) => x.id === e.id) : edge(e.id || s.mode));
  const to = at(s.to), from = at(s.from);
  if (!to || !from) return null;
  const k = Math.max(0, Math.min(1, (gNow - s.departG) / Math.max(1e-9, s.arriveG - s.departG)));
  return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, k, angle: Math.atan2(to.y - from.y, to.x - from.x) };
}
