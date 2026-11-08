// Interactive moments: 20-second scenes with speech bubbles that end in a decision,
// the delivery map for customer orders, and the warehouse window.
import * as E from '../supabase/functions/_shared/engine.js';
import { TYPES, GOODS, RECIPES, INTERACTIONS, COLLEAGUES, WAREHOUSE_SITES, MAP } from '../supabase/functions/_shared/content.js';
import { city, me, esc, coImg, M, K, N, dur, msUntilMonth, deptIcon, ICON, cropStyle } from './util.js';
import { DEPT_TINT } from './company.js';
import { carrierPicker, shipRow } from './freight.js';
import { money } from './life.js';
import { siteHTML } from './build.js';

const O = E.OPS, L = E.LOG;
const YEAR_MS = 7 * 24 * 3600 * 1000;
const msForGameYears = (dy) => dy * YEAR_MS / city().clock.speed;

// ---------------------------------------------------------------- delivery map
export function deliveryHTML(st) {
  const c = city(), l = E.listing(c, st.lid), o = l.ops; if (!o) return '';
  const ready = (o.orders || []).filter((x) => x.status === 'accepted');
  const sel = ready.find((x) => x.id === st.sel) || ready[0];
  const target = sel ? O.clientById(o, sel.cid) : null;
  // Spread pins that sit on top of each other, and keep labels inside the map.
  const placed = [];
  const pins = O.activeClients(o).map((cl) => {
    let px = cl.x / MAP.w * 100, py = cl.y / MAP.h * 100;
    for (let i = 0; i < 6 && placed.some((q) => Math.abs(q[0] - px) < 9 && Math.abs(q[1] - py) < 5); i++) py += py > 80 ? -5.5 : 5.5;
    placed.push([px, py]);
    const side = px > 72 ? 'r' : px < 22 ? 'l' : '';
    return `<button class="dpin ${side} ${st.bad === cl.id ? 'bad' : ''} ${st.good === cl.id ? 'good' : ''}" style="left:${px.toFixed(2)}%;top:${py.toFixed(2)}%" data-a="deliverTo" data-cid="${cl.id}" aria-label="${esc(cl.name)}"><i></i><span>${esc(cl.name)}</span></button>`;
  }).join('');
  const truck = st.truck ? `<span class="truck" style="left:${(st.truck.x / MAP.w * 100).toFixed(2)}%;top:${(st.truck.y / MAP.h * 100).toFixed(2)}%;transition-duration:${st.truck.ms}ms">${TRUCK}</span>` : '';
  return `<article class="sheet deliv"><span class="cap">${esc(TYPES[l.type].name)} · ${esc(l.district)}</span><h2>Deliver orders</h2>
    <p>Pick an order, then tap the client it belongs to on the map. Finished stock: <b>${N(o.fg || 0)}</b> ${esc(RECIPES[l.type].unit)}.</p>
    ${ready.length ? `<div class="dorders">${ready.map((x) => { const cl = O.clientById(o, x.cid); return `<button class="dord ${sel && sel.id === x.id ? 'on' : ''}" data-a="deliverSel" data-id="${x.id}"><b>${esc(cl ? cl.name : '')}</b><span>${N(x.units)} units · ${M(x.value)} · due ${x.due <= c.m ? 'now' : 'next month'}</span></button>`; }).join('')}</div>` : '<p class="empty">All accepted orders are delivered.</p>'}
    ${target ? `<div class="dhint">Deliver <b>${N(sel.units)} units</b> to <b>${esc(target.name)}</b> in ${esc(target.district)}</div>` : ''}
    <div class="dmap-wrap"><div class="dmap"><img src="img/map.jpg" alt="Map of Aurex Bay with your clients">
      <span class="dhome" style="left:${(l.x / MAP.w * 100).toFixed(2)}%;top:${(l.y / MAP.h * 100).toFixed(2)}%" title="Your ${esc(TYPES[l.type].name)}"><span style="background-image:url(${coImg(l)})"></span></span>
      ${pins}${truck}</div></div>
    <button class="btn" data-a="close">Done</button></article>`;
}
const TRUCK = '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="6" width="13" height="10" rx="1.5" fill="#f2c230" stroke="#1b2b44" stroke-width="1.4"/><path d="M14 9h4l3 3.5V16h-7z" fill="#fff" stroke="#1b2b44" stroke-width="1.4"/><circle cx="6" cy="17.5" r="2" fill="#1b2b44"/><circle cx="17" cy="17.5" r="2" fill="#1b2b44"/></svg>';

// ---------------------------------------------------------------- warehouses
export const MODE_LABEL = { air: 'Air cargo', sea: 'Sea freight', rail: 'Rail freight', road: 'Road freight' };
export function mapCrop(o) { return cropStyle(o, 2.6, 3); }
export function warehouseHTML(id, ui) {
  const c = city(), p = me(), site = L.SITE[id], w = L.warehouse(c, id), mine = w.owner === p.id, owner = w.owner ? c.players[w.owner] : null;
  const head = `<header class="whead" style="${site.img ? `background-image:url(${site.img});background-size:cover;background-position:center` : mapCrop(site)}"><div><span class="chip">${MODE_LABEL[site.mode]}</span><h2>${esc(site.name)}</h2><p>${esc(site.district)} · ${w.site ? 'Building plot · ' : ''}${owner ? (mine ? 'Yours' : 'Owned by ' + esc(owner.name)) : `For sale · ${M(L.whPrice(w))}`}</p></div></header>`;
  if (w.site) return plotHTML(c, p, id, site, w, mine, head);
  const stats = `<div class="kpis sm"><div class="stat"><small>Storage</small><b class="num">${N(L.capacityOf(w))}</b><span class="sub">units</span></div><div class="stat"><small>Import price</small><b class="num">${site.importMult < 1 ? '−' : '+'}${Math.round(Math.abs(1 - site.importMult) * 100)}%</b><span class="sub">vs direct import</span></div>${(() => { const cr = E.LOG.CARRIERS_BY_SITE[id]; return cr ? `<div class="stat"><small>Partner carrier</small><b style="color:${cr.color}">${esc(cr.short)}</b><span class="sub">${esc(cr.partner.note.split(":")[0])}</span></div>` : `<div class="stat"><small>Partner carrier</small><b>None</b><span class="sub">All carriers at standard rates</span></div>`; })()}<div class="stat"><small>Upkeep</small><b class="num">${M(site.upkeep)}</b><span class="sub">per year</span></div></div>`;
  if (!mine) {
    const myCo = E.ownedBy(c, 'p', p.id);
    const near = myCo.map((l) => `<span class="chip">${esc(TYPES[l.type].name)}: ${L.truckDays(site, l)} days</span>`).join('');
    return `<article class="sheet wh">${head}<p>${esc(site.desc)}</p>${stats}
      ${near ? `<div><span class="cap">Truck time to your companies</span><div class="chips" style="margin-top:6px">${near}</div></div>` : ''}
      ${!w.owner ? `<button class="btn gold" data-a="whBuy" data-wid="${id}" ${p.cash < site.price ? 'disabled' : ''}>Buy warehouse · ${M(site.price)}</button>${p.cash < site.price ? `<p class="empty">You need ${M(site.price - p.cash)} more cash. Smaller depots start at 8 M.</p>` : ''}` : '<p class="empty">This warehouse is taken. Rivals truck their supplies from here.</p>'}</article>`;
  }
  const myCo = E.ownedBy(c, 'p', p.id), used = new Set(myCo.flatMap((l) => Object.keys(RECIPES[l.type].in)));
  const goods = Object.keys(GOODS).filter((g) => used.has(g) || (w.stock[g] || 0) > 0 || ui.whShowAll);
  const wcid = (ui.whCarrier && ui.whCarrier[id]) || 'ridge', g1 = goods[0];
  const st = L.stored(w), inb = L.inbound(c, w), cap = L.capacityOf(w);
  const rows = goods.map((g) => {
    const q = ui.whQty[g] ?? 100, quote = L.importQuote(c, w, g, q, O.importPrice(c, g), wcid), users = myCo.filter((l) => g in RECIPES[l.type].in), tgt = ui.whTarget[g] || (users[0] && users[0].id), tl = tgt ? E.listing(c, tgt) : null;
    return `<div class="whrow"><div class="whg"><b>${esc(GOODS[g].name)}</b><span>${N(w.stock[g] || 0)} in stock · market ${K(c.market[g].p)}</span></div>
      <div class="whctl"><div class="stepper"><button data-a="whq" data-g="${g}" data-v="-50" aria-label="Less">−</button><output class="num">${q}</output><button data-a="whq" data-g="${g}" data-v="50" aria-label="More">+</button></div>
        <button class="btn sm navy" data-a="whImport" data-wid="${id}" data-g="${g}" data-q="${q}" data-c="${wcid}">Import · ${money(quote.cost)} · ${quote.minDays}–${quote.days} d</button>
        ${users.length ? `<select data-a="whTarget" data-g="${g}" aria-label="Send to">${users.map((l) => `<option value="${l.id}" ${l.id === tgt ? 'selected' : ''}>${esc(TYPES[l.type].name)} (${L.truckDays(site, l)} d)</option>`).join('')}</select><button class="btn sm" data-a="whDispatch" data-wid="${id}" data-g="${g}" data-q="${q}" data-lid="${tgt}" ${(w.stock[g] || 0) < 1 ? 'disabled' : ''}>Truck ${Math.min(q, Math.floor(w.stock[g] || 0)) || q} to ${tl ? esc(TYPES[tl.type].name) : ''}</button>` : ''}
        <button class="btn sm" data-a="whExport" data-wid="${id}" data-g="${g}" data-q="${q}" data-c="${wcid}" ${(w.stock[g] || 0) < 1 ? 'disabled' : ''}>Export</button></div></div>`;
  }).join('');
  const ships = c.shipments.filter((s) => s.owner === p.id && ((s.to.k === 'w' && s.to.id === id) || (s.from.k === 'w' && s.from.id === id)));
  const gNow = E.gameNow(c, Date.now());
  return `<article class="sheet wh">${head}
    <div><div style="display:flex;justify-content:space-between"><span class="cap">Storage ${N(st)} / ${N(cap)}${inb ? ` · ${N(inb)} on the way` : ''}</span><span class="cap">Level ${w.level}</span></div><div class="bar" style="margin-top:5px;height:10px"><i style="width:${Math.min(100, (st + inb) / cap * 100)}%"></i></div></div>
    <div class="set"><span class="cap">Import and export with</span>${carrierPicker('whCarrier', `data-wid="${id}"`, wcid, g1 ? (cid) => { const qq = L.importQuote(c, w, g1, ui.whQty[g1] ?? 100, O.importPrice(c, g1), cid); return { freight: qq.freight, minDays: qq.minDays, maxDays: qq.days, partner: qq.partner }; } : null)}<span class="muted" style="font-size:12.5px">★ = this is the carrier's partner terminal. Trucks to your companies are your own.</span></div>
    <div class="rows">${rows || '<p class="empty">Buy companies that use supplies, or show all goods.</p>'}</div>
    <button class="linkbtn" data-a="whAll">${ui.whShowAll ? 'Show only goods my companies use' : 'Show all goods'}</button>
    <div class="box" style="box-shadow:none"><h2>Automation <small>${E.hasStaff(p, 'carlos') ? 'CARLOS MENDOZA' : 'LOCKED'}</small></h2><div class="in">
      ${E.hasStaff(p, 'carlos') ? `<label class="tog"><input type="checkbox" data-a="whSupply" data-wid="${id}" ${w.auto.supply ? 'checked' : ''}> <span>Keep my companies supplied from my warehouses</span></label>
      <div class="set"><span class="cap">Auto-import: keep stock for</span><div class="seg">${[[0, 'Off'], [1, '1 month'], [2, '2 months'], [3, '3 months']].map(([v, t]) => `<button data-a="whImportMonths" data-wid="${id}" data-v="${v}" aria-pressed="${w.auto.importMonths === v}">${t}</button>`).join('')}</div></div>
      <p class="empty" style="font-size:13px">Set Procurement to “My warehouses first” in a company and Carlos pulls supplies from here before buying on the market.</p>`
      : `<p class="empty">Without a logistics specialist you import, ship and export by hand. Hire Carlos Mendoza, Logistics Planner, to run auto-import, keep your companies supplied and let Procurement pull from your warehouses.</p><button class="btn gold" data-a="staff" data-id="carlos">Meet Carlos Mendoza</button>`}</div></div>
    ${ships.length ? `<div><span class="cap">On the way</span><div class="rows">${ships.map((s) => shipRow(s, gNow)).join('')}</div></div>` : ''}
    <div class="btns">${w.level < 4 ? `<button class="btn navy" data-a="whUpgrade" data-wid="${id}">Expand · ${M(L.upgradeCost(w))}</button>` : ''}<button class="btn danger" data-a="whSell" data-wid="${id}">Sell warehouse</button></div>
  </article>`;
}
// a warehouse that is still a building site: buy the plot, then build it like a company (js/build.js)
function plotHTML(c, p, id, site, w, mine, head) {
  const price = L.whPrice(w), cap = Math.round(site.cap);
  return `<article class="sheet wh">${head}<p>${esc(site.desc)}</p>
    <p class="empty" style="font-size:13px">Not built yet. Built, it stores ${N(cap)} units at ${site.importMult < 1 ? '−' : '+'}${Math.round(Math.abs(1 - site.importMult) * 100)}% on imports and costs ${M(site.upkeep)} a year to run.</p>
    ${siteHTML(w)}
    ${!w.owner ? `<button class="btn gold" data-a="whBuy" data-wid="${id}" ${p.cash < price ? 'disabled' : ''}>Buy the plot · ${M(price)}</button>${p.cash < price ? `<p class="empty">You need ${M(price - p.cash)} more cash.</p>` : ''}`
      : mine ? `<div class="btns"><button class="btn danger" data-a="whSell" data-wid="${id}">Sell the plot · ${M(price)}</button></div>` : ''}
  </article>`;
}
