// Aurex Bay Tycoon — web client
import * as E from '../supabase/functions/_shared/engine.js';
import { MAP, DISTRICT, TYPES, SIZES, DISTRICTS, STAFF, STOCKS, WORLD, DECISIONS, SPEEDS, GOODS, CONFIG as GC } from '../supabase/functions/_shared/content.js';
import { CONFIG } from './config.js';
import { createLocalBackend, createOnlineBackend } from './backends.js';
import { S, city, me, meId, now, $, esc, kfix, lname, M, K, P, N, dollars, msUntilMonth, dur, dateLabel, ICON, spark, cropStyle } from './util.js';
import { companyHTML, companyRow } from './company.js';
import { stocksHTML, stockModal, livePrice, liveH, PX } from './stocks.js';
import { deliveryHTML, warehouseHTML, MODE_LABEL } from './interact.js';
import { taskButton } from './company.js';
import { SCENES, startScene, endScene, scenesHTML, sceneFor, tickScenes, sceneTitle } from './scenes.js';
import { WAREHOUSE_SITES, INTERACTIONS, HOMES, TAKEOVER as GC_T } from '../supabase/functions/_shared/content.js';
import { webHTML, parseUrl, HOME_URL } from './web.js';
import { teamBoxHTML, talentModal, talentStep } from './team.js';
import { lifeHTML, lifeModal, newDinner, startDinner, dinnerHTML, money, bidBase } from './life.js';
import { logoMark, logoFull } from './brand.js';
import { authHTML, avatarHTML, passwordHTML, secureHTML, foundHTML, foundPreview, newFound } from './onboard.js';

const ECON_COL = { Boom: '#23905a', Stable: '#2f6fb0', Recession: '#d08a1e', Crisis: '#c0392b' };
const STAFF_BY = Object.fromEntries(STAFF.map((s) => [s.id, s]));
const UI = { tab: 'map', qty: 1, modal: null, coopAmt: 10, offerAmt: {}, company: null, sqty: 10, buyQty: {}, whQty: {}, whTarget: {}, whShowAll: false, carrier: {}, whCarrier: {}, from: 'empire', life: { view: 'home', room: null } };
let B = null; // backend

const deptOfSpec = (id) => E.OPS.DEPTS_BY_HEAD[id];
function ownerLabel(c, l) {
  if (!l.owner) return { name: 'For sale', color: 'var(--gold)' };
  if (l.owner.k === 'h') { const h = c.holdings[l.owner.id]; return { name: h ? h.name : 'Coop', color: 'var(--coop)', coop: true, mine: !!(h && h.members[meId()]), brand: E.BR.holdingBrand(h) }; }
  const p = c.players[l.owner.id], b = E.BR.brandOf(c, p.id); return { name: p.id === meId() ? 'You' : p.name, color: p.id === meId() ? 'var(--good)' : p.color, mine: p.id === meId(), pid: p.id, brand: b, full: b ? `${b.name} · ${p.name}` : p.name };
}
function avatar(p, size) {
  const st = size ? `width:${size}px;height:${size}px;` : '';
  if (!p) return '';
  if (p.avatar) return `<span class="av" style="${st}background-image:url(${p.avatar});--avc:${p.color}" aria-hidden="true"></span>`;
  const ini = p.name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return `<span class="av" style="${st}background:${p.color};--avc:${p.color}" aria-hidden="true">${esc(ini)}</span>`;
}
function toast(msg, kind) {
  document.querySelectorAll('.toast').forEach((x) => x.remove());
  const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = kfix(msg); $('app').appendChild(t);
  setTimeout(() => t.remove(), 3400);
}
async function act(action, args, okMsg) {
  const r = await B.act(action, args);
  if (r && r.ok === false) { toast(r.msg, 'bad'); return r; }
  if (okMsg || (r && r.msg)) toast(okMsg || r.msg, 'good');
  if (me() && E.BR.needsParent(city(), meId())) { gate(); return r; } // e.g. left a co-owned parent company
  renderAll(); refreshModal(); return r;
}

// ---------------------------------------------------------------- map: the city and its districts
// Level 1 shows the whole city: hover a district to see what is there, click to go in.
// Level 2 shows one district with simple pins; hover a pin for a card, click it to open.
const view = { s: 1, x: 0, y: 0, min: 0.3, max: 3, W: MAP.w, H: MAP.h, crop: null, level: null };
const PIN_COL = { sale: '#e0a526', mine: '#1f9d63', taken: '#3567b0', coop: '#7b5cc4', wh: '#0f8b8d', home: '#d1477a', homeMine: '#1f9d63' };
const PIN_SVG = {
  company: '<path d="M4 20V9l5 3V9l5 3V5l6 3v12z"/>',
  wh: '<path d="M3 10l9-5 9 5v10H3z"/><path d="M7 20v-6h10v6"/>',
  home: '<path d="M4 11l8-6 8 6v9h-5v-5H9v5H4z"/>'
};
const pinIcon = (k) => `<svg viewBox="0 0 24 24" width="14" height="14" fill="#fff" aria-hidden="true">${PIN_SVG[k]}</svg>`;
function layerFor(level) {
  const d = level ? DISTRICT[level] : null;
  if (!d) return { W: MAP.w, H: MAP.h, img: MAP.img, crop: null };
  if (d.img) return { W: d.w, H: d.h, img: d.img, crop: null };
  return { W: d.box.w, H: d.box.h, img: MAP.img, crop: d.box };
}
function buildMap() { setLevel(null, true); }
function setLevel(level, instant) {
  hideMapCard(); flying = true;
  const w = $('world'), L = layerFor(level);
  const swap = () => {
    cancelAnimationFrame(anim);
    Object.assign(view, { W: L.W, H: L.H, crop: L.crop, level });
    w.style.width = L.W + 'px'; w.style.height = L.H + 'px';
    w.innerHTML = `<img src="${L.img}" alt="${level ? esc(DISTRICT[level].name) : 'Satellite map of Aurex Bay'}" id="mapimg" draggable="false" style="${L.crop ? `position:absolute;left:${-L.crop.x}px;top:${-L.crop.y}px;width:${MAP.w}px;height:${MAP.h}px;max-width:none` : `width:${L.W}px;height:${L.H}px`}"><div id="mapmarks"></div>`;
    w.classList.toggle('indist', !!level);
    view.s = 0; fitMap(); const vp = $('viewport');
    view.s = view.min * (level ? 1.02 : 1.04); view.x = -(L.W * view.s - vp.clientWidth) / 2; view.y = -(L.H * view.s - vp.clientHeight) * (level ? 0.5 : 0.3); applyView();
    renderMarks(); renderMapNav(); flying = false; hideMapCard();
    requestAnimationFrame(() => w.classList.remove('fade'));
  };
  if (instant) swap(); else { w.classList.add('fade'); setTimeout(swap, 220); }
}
function districtStats(c, d) {
  const ls = c.listings.filter((l) => l.d === d.id), mine = ls.filter((l) => ownerLabel(c, l).mine).length;
  return { total: ls.length, sale: ls.filter((l) => !l.owner).length, mine, wh: WAREHOUSE_SITES.filter((x) => x.d === d.id).length, homes: HOMES.filter((h) => h.d === d.id).length };
}
function renderMarks() {
  const c = city(), box = $('mapmarks'); if (!box || !c) return;
  if (!view.level) {
    box.innerHTML = DISTRICTS.map((d) => { const st = districtStats(c, d);
      return `<button class="zone" data-zone="${d.id}" style="left:${d.box.x}px;top:${d.box.y}px;width:${d.box.w}px;height:${d.box.h}px" aria-label="${esc(d.name)}"><span class="zlabel"${d.ly ? ` style="top:${d.ly * 100}%"` : ''}><b>${esc(d.name)}</b><span>${st.total} compan${st.total === 1 ? 'y' : 'ies'}${st.sale ? ` · <em class="s">${st.sale} for sale</em>` : ''}${st.mine ? ` · <em class="m">${st.mine} yours</em>` : ''}</span></span></button>`; }).join('');
    return;
  }
  const d = DISTRICT[view.level], pos = (o) => ({ x: o.p[0] * view.W, y: o.p[1] * view.H }), out = [];
  c.listings.filter((l) => l.d === d.id).forEach((l) => { const o = ownerLabel(c, l), col = !l.owner ? PIN_COL.sale : o.mine ? PIN_COL.mine : o.coop ? PIN_COL.coop : PIN_COL.taken, q = pos(l);
    out.push(`<button class="mp ${o.mine ? 'mine' : ''}" data-mk="l:${l.id}" style="left:${q.x}px;top:${q.y}px;--c:${col}" aria-label="${esc(TYPES[l.type].name)}">${pinIcon('company')}</button>`); });
  WAREHOUSE_SITES.filter((x) => x.d === d.id).forEach((site) => { const w = (c.warehouses || []).find((x) => x.id === site.id), mine = w && w.owner === meId(), q = pos(site);
    out.push(`<button class="mp sq ${mine ? 'mine' : ''}" data-mk="w:${site.id}" style="left:${q.x}px;top:${q.y}px;--c:${mine ? PIN_COL.mine : PIN_COL.wh}" aria-label="${esc(site.name)}">${pinIcon('wh')}</button>`); });
  HOMES.filter((h) => h.d === d.id).forEach((h) => { const lp = me() && me().life, mine = lp && lp.homes.some((x) => x.hid === h.id), q = pos(h);
    out.push(`<button class="mp ${mine ? 'mine' : ''}" data-mk="h:${h.id}" style="left:${q.x}px;top:${q.y}px;--c:${mine ? PIN_COL.homeMine : PIN_COL.home}" aria-label="${esc(h.name)}">${pinIcon('home')}</button>`); });
  box.innerHTML = out.join('');
}
function renderMapNav() {
  const nav = $('mapnav'); if (!nav) return;
  if (!view.level) { nav.innerHTML = `<div class="mn-crumb glass"><b>Aurex Bay</b><span>Choose a district</span></div>`; return; }
  const d = DISTRICT[view.level], i = DISTRICTS.indexOf(d), prev = DISTRICTS[(i + DISTRICTS.length - 1) % DISTRICTS.length], next = DISTRICTS[(i + 1) % DISTRICTS.length];
  nav.innerHTML = `<div class="mn-crumb glass"><button data-a="mapCity" class="mn-back" aria-label="Back to the city">‹ Aurex Bay</button><b>${esc(d.name)}</b><span class="mn-step"><button data-a="mapGo" data-v="${prev.id}" aria-label="Previous district: ${esc(prev.name)}">‹</button><button data-a="mapGo" data-v="${next.id}" aria-label="Next district: ${esc(next.name)}">›</button></span></div>
    <div class="mn-legend glass"><span><i style="--c:${PIN_COL.sale}"></i>For sale</span><span><i style="--c:${PIN_COL.taken}"></i>Owned</span><span><i style="--c:${PIN_COL.mine}"></i>Yours</span><span><i class="sq" style="--c:${PIN_COL.wh}"></i>Warehouse</span><span><i style="--c:${PIN_COL.home}"></i>Home</span></div>`;
}
// the hover card
let cardKey = null, cardTimer = 0, lastPointer = 'mouse', flying = false;
function mapCardHTML(key) {
  const c = city(), [k, id] = key.split(':'), row = (a, b) => `<div class="mc-r"><span>${a}</span><b>${b}</b></div>`;
  if (k === 'z') { const d = DISTRICT[id], st = districtStats(c, d);
    return `<div class="mc-img" style="${cropStyle({ d: d.id, p: [0.5, 0.5] }, 1.2)}"></div><div class="mc-b"><span class="mc-k">District</span><h4>${esc(d.name)}</h4><p>${esc(d.blurb)}</p>${row('Companies', `${st.total}${st.sale ? ` · ${st.sale} for sale` : ''}`)}${st.mine ? row('Yours', st.mine) : ''}${row('Warehouses', st.wh)}${row('Homes', st.homes)}<div class="mc-foot">Click to explore</div></div>`; }
  if (k === 'l') { const l = E.listing(c, id), o = ownerLabel(c, l), y = E.listingYield(c, l, l.owner || { k: 'p', id: meId() });
    return `<div class="mc-img" style="background-image:url(img/c-${l.type}.jpg)"></div><div class="mc-b"><span class="mc-k">${esc(TYPES[l.type].sector)}</span><h4>${esc(lname(l))}</h4><p>${l.title ? esc(TYPES[l.type].name) + ' · ' : ''}${esc(l.district)} · ${SIZES[l.size].label} · Level ${l.level}</p>
      ${row('Owner', l.owner ? `${o.brand ? logoMark(o.brand, 16) : `<i class="mc-dot" style="background:${o.color}"></i>`} ${esc(o.mine ? 'You' : o.brand ? o.brand.name : o.name)}` : '<em class="s">For sale</em>')}${row(l.owner ? 'Value' : 'Price', M(l.owner ? E.listingValue(l) : E.listingPrice(l)))}${row('Earns', `${M(y.total, true)} / yr`)}<div class="mc-foot">${lastPointer === 'touch' ? '<button class="btn sm gold" data-a="open" data-lid="' + l.id + '">Open</button>' : 'Click to open'}</div></div>`; }
  if (k === 'w') { const site = WAREHOUSE_SITES.find((x) => x.id === id), w = (c.warehouses || []).find((x) => x.id === id), own = w && w.owner ? c.players[w.owner] : null;
    return `<div class="mc-img" style="${site.img ? `background-image:url(${site.img})` : cropStyle(site, 2.4)}"></div><div class="mc-b"><span class="mc-k">Warehouse · ${esc(MODE_LABEL[site.mode])}</span><h4>${esc(site.name)}</h4><p>${esc(site.district)}</p>${row('Owner', own ? `<i class="mc-dot" style="background:${own.id === meId() ? 'var(--good)' : own.color}"></i>${esc(own.id === meId() ? 'You' : own.name)}` : '<em class="s">For sale</em>')}${row(own ? 'Storage' : 'Price', own ? `${N(E.LOG.capacityOf(w))} units` : M(site.price))}${row('Upkeep', `${M(site.upkeep)} / yr`)}<div class="mc-foot">${lastPointer === 'touch' ? `<button class="btn sm gold" data-a="wh" data-wid="${id}">Open</button>` : 'Click to open'}</div></div>`; }
  if (k === 'h') { const h = HOMES.find((x) => x.id === id), lp = me().life, mine = lp && lp.homes.find((x) => x.hid === id), price = c.life ? h.price * c.life.homes[id].ix : h.price, left = c.life ? E.LIFE.unitsLeft(c, id) : h.units;
    return `<div class="mc-img" style="background-image:url(img/${h.img}-ext.jpg), url(img/h1-ext.jpg)"></div><div class="mc-b"><span class="mc-k">Residential</span><h4>${esc(h.name)}</h4><p>${esc(h.district)}</p>${row('Status', mine ? '<em class="m">Yours</em>' : left > 0 ? `${left} of ${h.units} units for sale` : 'Sold out')}${row('Price', money(price))}${row('Prestige', '+' + h.prestige)}<div class="mc-foot">${lastPointer === 'touch' ? `<button class="btn sm gold" data-a="mapHome" data-hid="${id}">Open</button>` : 'Click to open'}</div></div>`; }
  return '';
}
function showMapCard(key, el) {
  clearTimeout(cardTimer); const card = $('mapcard'); if (!card) return;
  cardKey = key; card.innerHTML = mapCardHTML(key); card.hidden = false;
  const r = el.getBoundingClientRect(), app = $('app').getBoundingClientRect(), cw = card.offsetWidth, ch = card.offsetHeight;
  let x = r.right + 12 - app.left, y = r.top + r.height / 2 - ch / 2 - app.top;
  if (x + cw > app.width - 10) x = r.left - cw - 12 - app.left;
  const top = parseFloat(getComputedStyle($('app')).getPropertyValue('--topH')) || 90;
  x = Math.max(10, Math.min(app.width - cw - 10, x)); y = Math.max(top, Math.min(app.height - ch - 84, y));
  card.style.left = x + 'px'; card.style.top = y + 'px';
}
function hideMapCard(now) { clearTimeout(cardTimer); const go = () => { const card = $('mapcard'); if (card) card.hidden = true; cardKey = null; document.querySelectorAll('.zone.on').forEach((z) => z.classList.remove('on')); }; if (now === false) cardTimer = setTimeout(go, 160); else go(); }
function openMark(key) {
  const [k, id] = key.split(':');
  if (k === 'l') openListing(id); else if (k === 'w') openWarehouse(id);
  else if (k === 'h') { const p = me(), mine = p && p.life && p.life.homes.some((x) => x.hid === id); if (mine) setTab('life'); else openWeb(`bayhomes.ab/home/${id}`); }
}
function setupMapEvents() {
  const w = $('world');
  w.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse'; }, true);
  w.addEventListener('mouseover', (e) => {
    if (lastPointer === 'touch' || flying) return;
    const z = e.target.closest('.zone'), m = e.target.closest('.mp'), t = z || m; if (!t) return;
    const key = z ? 'z:' + z.dataset.zone : m.dataset.mk; if (key === cardKey) return;
    document.querySelectorAll('.zone.on').forEach((x) => x.classList.remove('on')); if (z) z.classList.add('on');
    showMapCard(key, z ? z.querySelector('.zlabel') : m);
  });
  w.addEventListener('mouseout', (e) => { if (lastPointer === 'touch') return; const t = e.target.closest('.zone, .mp'); if (t && !t.contains(e.relatedTarget)) hideMapCard(false); });
  w.addEventListener('click', (e) => {
    const z = e.target.closest('.zone'), m = e.target.closest('.mp');
    if (z) { hideMapCard(); enterDistrict(z.dataset.zone); return; }
    if (m) { if (lastPointer === 'touch' && cardKey !== m.dataset.mk) { showMapCard(m.dataset.mk, m); return; } hideMapCard(); openMark(m.dataset.mk); return; }
    hideMapCard();
  });
  $('mapcard').addEventListener('mouseenter', () => clearTimeout(cardTimer));
  $('mapcard').addEventListener('click', (e) => { if (cardKey && cardKey.startsWith('z:') && !e.target.closest('[data-a]')) { const id = cardKey.slice(2); hideMapCard(); enterDistrict(id); } });
  $('mapcard').addEventListener('mouseleave', () => hideMapCard(false));
}
function enterDistrict(id) {
  const d = DISTRICT[id], vp = $('viewport'), ts = Math.min(view.max, Math.max(vp.clientWidth / d.box.w, vp.clientHeight / d.box.h) * 0.9);
  flying = true; flyTo(d.x, d.y, ts); setTimeout(() => setLevel(id), 400);
}
function updatePins() { renderMarks(); }
function applyView() {
  const vp = $('viewport'), W = view.W * view.s, H = view.H * view.s;
  view.x = Math.min(0, Math.max(vp.clientWidth - W, view.x)); view.y = Math.min(0, Math.max(vp.clientHeight - H, view.y));
  if (W < vp.clientWidth) view.x = (vp.clientWidth - W) / 2; if (H < vp.clientHeight) view.y = (vp.clientHeight - H) / 2;
  $('world').style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
  $('world').style.setProperty('--inv', String(1 / view.s));
}
function fitMap() { const vp = $('viewport'); view.min = Math.max(vp.clientWidth / view.W, vp.clientHeight / view.H); view.max = Math.max(view.min * 3, view.level ? 2 : 2.2); view.s = Math.max(view.min, Math.min(view.s, view.max)); applyView(); }
function zoomAt(cx, cy, f) { const ns = Math.max(view.min, Math.min(view.max, view.s * f)), k = ns / view.s; view.x = cx - (cx - view.x) * k; view.y = cy - (cy - view.y) * k; view.s = ns; applyView(); }
let anim = 0;
function flyTo(x, y, s) {
  const vp = $('viewport'), from = { ...view }, ts = Math.max(view.min, Math.min(view.max, s)), to = { s: ts, x: vp.clientWidth / 2 - x * ts, y: vp.clientHeight * 0.55 - y * ts }, t0 = performance.now();
  cancelAnimationFrame(anim);
  const step = (t) => { const k = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - k, 3); view.s = from.s + (to.s - from.s) * e; view.x = from.x + (to.x - from.x) * e; view.y = from.y + (to.y - from.y) * e; applyView(); if (k < 1) anim = requestAnimationFrame(step); };
  anim = requestAnimationFrame(step);
}
function setupPanZoom() {
  const vp = $('viewport'), pts = new Map(); let last = null, moved = 0;
  const pair = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  vp.addEventListener('pointerdown', (e) => { cancelAnimationFrame(anim); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 1) moved = 0; last = pts.size === 2 ? pair() : null; vp.classList.add('drag'); });
  window.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    if (pts.size === 1) { view.x += dx; view.y += dy; applyView(); }
    else if (pts.size === 2 && last) { const c = pair(), r = vp.getBoundingClientRect(); zoomAt(c.x - r.left, c.y - r.top, c.d / Math.max(1, last.d)); view.x += c.x - last.x; view.y += c.y - last.y; applyView(); last = c; }
  });
  const up = (e) => { pts.delete(e.pointerId); last = pts.size === 2 ? pair() : null; if (!pts.size) vp.classList.remove('drag'); };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  vp.addEventListener('click', (e) => { if (moved > 8) { e.stopPropagation(); e.preventDefault(); } }, true);
  vp.addEventListener('wheel', (e) => { e.preventDefault(); const r = vp.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  window.addEventListener('resize', () => { fitMap(); measureTop(); hideMapCard(); });
  vp.addEventListener('pointerdown', () => hideMapCard());
}
function measureTop() { const t = $('top'); if (t.hidden) return; $('app').style.setProperty('--topH', t.getBoundingClientRect().bottom + 8 + 'px'); }

// ---------------------------------------------------------------- top bar
function renderTop() {
  const c = city(), p = me(); if (!p) return;
  $('datelbl').textContent = c.over ? `Season ${c.season} is over` : `${dateLabel(c.m)} · W${((c.wk ?? c.m * 4) % 4) + 1}`;
  $('econ').innerHTML = `<i style="background:${ECON_COL[c.econ]}"></i>${c.econ}`;
  const brand = E.BR.brandOf(c, p.id), lg = $('mylogo'), key = brand ? [brand.name, brand.color, brand.font, brand.sym].join('|') : '';
  lg.hidden = !brand; if (lg.dataset.k !== key) { lg.dataset.k = key; lg.innerHTML = brand ? logoFull(brand, { size: 30 }) : ''; }
  const est = E.annualEstimate(c, 'p', p.id), st = E.standings(c);
  $('t-inc').textContent = M(est, true); $('t-inc').className = 'num ' + (est >= 0 ? '' : 'down');
  $('t-nw').textContent = M(E.netWorth(c, p.id));
  $('t-rank').textContent = `#${st.findIndex((x) => x.id === p.id) + 1} of ${st.length}`;
  const sp = $('speed');
  sp.hidden = !B.canSetSpeed;
  sp.classList.toggle('admin', B.mode === 'online'); sp.setAttribute('aria-label', B.mode === 'online' ? 'Admin: game speed for everyone' : 'Game speed');
  if (B.canSetSpeed) {
    if (innerWidth <= 720) { const i = SPEEDS.findIndex((s) => s.id === c.clock.speed), cur = SPEEDS[i] || SPEEDS[2], nxt = SPEEDS[(i + 1) % SPEEDS.length]; sp.innerHTML = `<button data-speed="${nxt.id}" aria-pressed="true" title="Switch to ${nxt.label}: ${nxt.note}">${cur.label} ⟳</button>`; }
    else sp.innerHTML = SPEEDS.map((s) => `<button data-speed="${s.id}" aria-pressed="${c.clock.speed === s.id}" title="${s.note}">${s.label}</button>`).join('');
  }
  const inbox = p.inbox.length + c.offers.filter((o) => o.status === 'open' && o.to === p.id).length + E.ownedBy(c, 'p', p.id).reduce((a, l) => a + E.OPS.tasks(c, l).length, 0);
  const net = c.netReqs.filter((x) => x.status === 'open' && x.to === p.id).length + c.contracts.filter((x) => x.status === 'pending' && x.to === p.id).length;
  const coop = Object.values(c.holdings).filter((h) => h.invites.some((i) => i.pid === p.id)).length + E.myHoldings(c, p.id).reduce((a, h) => a + h.proposals.filter((x) => x.status === 'open' && !(p.id in x.votes)).length, 0);
  const lifeN = c.life && p.life ? c.life.trades.filter((t) => t.status === 'open' && t.to === p.id).length + (p.life.offer && p.life.offer.until >= c.m ? 1 : 0) : 0;
  [['empire', inbox], ['network', net], ['coop', coop], ['life', lifeN]].forEach(([k, n]) => { const d = $('dot-' + k); d.hidden = !n; d.textContent = n; });
}
// numbers that move every frame
let lastTicker = 0;
function liveUpdate() {
  const c = city(), p = me(); if (!c || !p) return;

  tickScenes((st) => { toast(`${sceneTitle(st)}: your call`, 'good'); renderAll(); });
  if (UI.modal && UI.modal.t === 'dinner') tickDinner();
  // share prices tick between weekly closes: refresh the exchange views every second or so
  if (Date.now() - lastTicker > 1200) { lastTicker = Date.now(); if ((UI.tab === 'stocks' || UI.tab === 'market') && !UI.company && !$('panel').hidden) renderPanel(); if (UI.modal && UI.modal.t === 'stock') openStock(UI.modal.id); }
  const t = now();
  document.querySelectorAll('[data-live]').forEach((el) => {
    const [k, id] = el.dataset.live.split(':');
    if (k === 'cash') el.textContent = dollars(E.liveCash(c, p.id, t));
    else if (k === 'treasury') el.textContent = dollars(E.liveTreasury(c, id, t));
    else if (k === 'until') el.textContent = dur(msUntilMonth(Number(id)));
    else if (k === 'prog') { const l = E.listing(c, id); if (l && l.upgrade) { const total = E.upgradeMonths({ level: l.upgrade.to - 1 }), left = l.upgrade.doneM - E.gameNow(c, t) * 12; el.style.width = Math.max(2, Math.min(100, (1 - left / total) * 100)) + '%'; } }
  });
}

// ---------------------------------------------------------------- cards
function companyCard(l) {
  const c = city(), def = TYPES[l.type], o = ownerLabel(c, l), y = E.listingYield(c, l, l.owner || { k: 'p', id: meId() });
  const price = l.owner ? E.listingValue(l) : E.listingPrice(l), yieldPct = Math.round(y.total / Math.max(0.1, price) * 100);
  const coord = `${l.id} · ${l.district.toUpperCase()} · ${(l.p[0] * 90).toFixed(1)}N`;
  const chips = def.perks.map((p) => `<span class="dz-perk up" title="${esc(p.d)}">+ ${esc(p.t)} <i>${esc(p.d)}</i></span>`).join('') + def.neg.map((p) => `<span class="dz-perk down" title="${esc(p.d)}">− ${esc(p.t)} <i>${esc(p.d)}</i></span>`).join('');
  return `<article class="sheet dz dzc">
    <div class="dz-hero" style="background-image:url(img/c-${l.type}.jpg)" role="img" aria-label="${esc(lname(l))}"><span class="dz-coord">${esc(coord)}</span>${l.owner ? `<span class="dz-own">${o.brand ? logoMark(o.brand, 18) : `<i style="background:${o.mine ? 'var(--good)' : o.color}"></i>`}${esc(o.mine ? 'Yours' + (o.brand ? ' · ' + o.brand.name : '') : o.full || o.name)}</span>` : '<span class="dz-own sale">For sale</span>'}</div>
    <div class="dz-body">
      <div class="dz-title"><div><span class="dz-k">${esc(def.sector)}</span><h2>${esc(lname(l))}</h2><span class="dz-sub">${l.title ? esc(def.name) + ' · ' : ''}${SIZES[l.size].label} · Level ${l.level}</span></div>
        <div class="dz-price"><span>${l.owner ? 'Value' : 'Asking'}</span><b>${M(price)}</b></div></div>
      <div class="dz-tiles"><div><span>Earns</span><b class="up">${M(y.total, true)}</b></div><div><span>Yield</span><b>${yieldPct}%</b></div><div><span>YPI</span><b>${y.ypi.toFixed(1)}</b></div><div><span>Trade</span><b>${y.trade.toFixed(1)}</b></div></div>
      ${y.notes.length ? `<p class="dz-notes">${esc(y.notes.join(' · '))}</p>` : ''}
      <div class="dz-perks">${chips}</div>
      <div class="act">${listingActions(l)}</div>
      <div class="dz-tags">${def.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
    </div>
  </article>`;
}
function listingActions(l) {
  const c = city(), p = me(), o = ownerLabel(c, l), out = [];
  if (!l.owner) {
    const price = E.listingPrice(l);
    out.push(`<button class="btn gold" data-a="buy" data-lid="${l.id}" ${p.cash < price ? 'disabled' : ''}>Buy for ${M(price)}${p.cash < price ? ` · you have ${M(p.cash)}` : ''}</button>`);
    E.myHoldings(c, p.id).forEach((h) => out.push(`<button class="btn coop" data-a="buyas" data-lid="${l.id}" data-hid="${h.id}" ${h.treasury < price ? 'disabled' : ''}>Buy with ${esc(h.name)} · treasury ${M(h.treasury)}</button>`));
  } else if (o.mine && !o.coop) {
    out.push(`<button class="btn gold" data-a="company" data-lid="${l.id}">Open company dashboard</button>`);
    if (l.upgrade) out.push(`<div><div class="cap">Upgrading to level ${l.upgrade.to} · ready in <span data-live="until:${l.upgrade.doneM}">…</span></div><div class="bar" style="margin-top:6px"><i data-live="prog:${l.id}"></i></div></div>`);
    else if (l.level < 5) out.push(`<button class="btn navy" data-a="upgrade" data-lid="${l.id}" ${p.cash < E.upgradeCost(l) ? 'disabled' : ''}>Upgrade to level ${l.level + 1} · ${M(E.upgradeCost(l))} · ${dur(E.upgradeMonths(l) * E.realMsPerMonth(c))}</button>`);
    const cs = c.contracts.filter((k) => k.status === 'active' && (k.a === l.id || k.b === l.id));
    cs.forEach((k) => { const other = E.listing(c, k.a === l.id ? k.b : k.a), op = c.players[other.owner?.id]; out.push(`<div class="row" style="padding:4px 0"><div class="grow"><b>Supply contract</b><span>${esc(TYPES[other.type].name)} · ${esc(op ? op.name : '')}</span></div><button class="btn sm" data-a="contractEnd" data-id="${k.id}">End</button></div>`); });
    const partners = [];
    p.net.forEach((pid) => E.ownedBy(c, 'p', pid).forEach((ol) => { if (E.contractValid(c, l.id, ol.id, p.id, pid).ok) partners.push(ol); }));
    if (partners.length) out.push(`<div class="cap">Supply contracts available in your network</div>` + partners.slice(0, 4).map((ol) => `<button class="btn" data-a="contract" data-mine="${l.id}" data-theirs="${ol.id}">Offer contract to ${esc(c.players[ol.owner.id].name)} · ${esc(TYPES[ol.type].name)}</button>`).join(''));
    out.push(`<button class="btn danger" data-a="sell" data-lid="${l.id}">Sell to the market for ${M(E.listingValue(l) * 0.8)}</button>`);
  } else if (o.coop) {
    if (o.mine) {
      if (E.canRun(c, p.id, l)) out.push(`<button class="btn gold" data-a="company" data-lid="${l.id}">Open company dashboard</button>`);
      if (l.upgrade) out.push(`<div class="cap">Upgrading · ready in <span data-live="until:${l.upgrade.doneM}">…</span></div>`);
      else if (l.level < 5) out.push(`<button class="btn coop" data-a="upgrade" data-lid="${l.id}">Propose upgrade to level ${l.level + 1} · ${M(E.upgradeCost(l))}</button>`);
    } else out.push('<p class="empty">Owned by a coop. Coop companies can only change hands by a vote of their owners.</p>');
  } else {
    const prot = E.protection(c, l), tp = E.takeoverPrice(c, l), running = c.offers.find((x) => x.status === 'open' && x.lid === l.id && x.hostile);
    if (!prot.safe) out.push(`<div class="hostilebox"><b>Vulnerable: ${esc(o.name)} has been away for months</b><span>Nobody protects this company. Bid now and it is yours unless the owner comes back and rejects within ${GC_T.bidMonths} months.</span>${running ? `<span class="chip warn">${running.from === p.id ? 'Your hostile bid is running' : 'Another hostile bid is running'}</span>` : `<button class="btn danger" data-a="hostileBid" data-lid="${l.id}" data-v="${tp}" ${p.cash < tp ? 'disabled' : ''}>Launch hostile bid · ${M(tp)}</button>`}</div>`);
    else if (!o.coop && c.players[o.pid] && !c.players[o.pid].bot) out.push(`<p class="empty" style="font-size:13px">Protected: ${esc(prot.why.toLowerCase())}.</p>`);
    const def = Math.round(E.listingValue(l) * 1.3); const amt = UI.offerAmt[l.id] ?? def;
    out.push(`<div class="cap">Takeover offer to ${esc(o.name)}</div><div class="btns" style="align-items:center"><div class="stepper"><button data-a="offeramt" data-lid="${l.id}" data-v="-1" aria-label="Lower offer">−</button><output class="num">${M(amt)}</output><button data-a="offeramt" data-lid="${l.id}" data-v="1" aria-label="Raise offer">+</button></div><button class="btn gold" data-a="offer" data-lid="${l.id}" ${p.cash < amt ? 'disabled' : ''}>Send offer</button></div><p class="empty" style="font-size:13px">Owners usually want 20–50% above the company's value. They answer next game month.</p>`);
    if (p.net.includes(o.pid)) E.ownedBy(c, 'p', p.id).forEach((ml) => { if (E.contractValid(c, ml.id, l.id, p.id, o.pid).ok) out.push(`<button class="btn" data-a="contract" data-mine="${ml.id}" data-theirs="${l.id}">Offer supply contract from your ${esc(TYPES[ml.type].name)}</button>`); });
    else out.push(`<button class="btn" data-a="netRequest" data-pid="${o.pid}">Add ${esc(o.name)} to your network</button>`);
  }
  return out.join('');
}
function staffCard(s) {
  const p = me(), hired = E.hasStaff(p, s.id), cost = E.staffCost(p, s.id);
  return `<article class="sc">
    <div class="sc-head">${esc(s.role)}</div>
    <div class="sc-art" style="background-image:url(img/s-${s.id}.jpg)" role="img" aria-label="${esc(s.name)}"></div>
    <div class="sc-name"><span>${esc(s.name)}</span><small>${hired ? 'HIRED' : 'JUNIOR'}</small></div>
    <div class="sc-cost"><div>Recruit <b class="num">${M(cost)}</b></div><div>Upkeep <b class="num">${M(s.upkeep)}</b>/yr</div></div>
    <div class="sc-band">Passive ability</div><div class="sc-txt"><b>${esc(s.passive[0])}</b>${esc(s.passive[1])}</div>
    <div class="sc-band">As department head</div><div class="sc-txt">${esc(s.hq)}</div>
    <div class="sc-tags">${esc(s.tags)}</div>
    <div class="act">${hired ? `${p.assign && p.assign[s.id] ? `<p class="empty" style="font-size:13.5px">Heads ${esc(E.OPS.DEPT[p.assign[s.id].dept].name)} at ${esc(TYPES[E.listing(city(), p.assign[s.id].lid).type].name)}.</p>` : '<p class="empty" style="font-size:13.5px">Not assigned yet. Open one of your companies and make them head of their department.</p>'}<button class="btn danger" data-a="fire" data-id="${s.id}">Let go</button>` : `<button class="btn gold" data-a="hire" data-id="${s.id}" ${p.cash < cost ? 'disabled' : ''}>Recruit for ${M(cost)}</button>`}</div>
  </article>`;
}

// ---------------------------------------------------------------- panels
function setTab(t) {
  UI.company = null;
  UI.tab = t;
  document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  if (t === 'life') UI.life.room = null;
  $('panel').classList.toggle('dark', t === 'life');
  hideMapCard(); $('mapnav').hidden = t !== 'map';
  $('panel').hidden = t === 'map'; if (t !== 'map') { $('panel').scrollTop = 0; renderPanel(); }
}
function renderPanel() {
  if (UI.tab === 'map' || !me()) return;
  const el = $('panel'), st = el.scrollTop, active = document.activeElement && el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
  if (active) return; // never wipe a field someone is typing in
  const html = (UI.tab === 'empire' || UI.tab === 'coop') && UI.company ? companyHTML(UI.company, UI) : { empire: empireHTML, market: marketHTML, stocks: () => stocksHTML(UI), network: networkHTML, coop: coopHTML, life: () => lifeHTML(UI) }[UI.tab]();
  el.innerHTML = `<div class="panel-in">${html}</div>`;
  applyCollapsed(el);
  el.scrollTop = st; liveUpdate();
}
// every box on a page can be folded away; the choice is remembered per page and box title
const boxKey = (h2) => `${UI.company || UI.tab}:${(h2.childNodes[0] && h2.childNodes[0].textContent || '').trim()}`;
function applyCollapsed(el) {
  let closed = UI.closed; if (!closed) { try { closed = new Set(JSON.parse(localStorage.getItem('ab-closed') || '[]')); } catch { closed = new Set(); } UI.closed = closed; }
  el.querySelectorAll('.box > h2').forEach((h2) => { const box = h2.parentElement; h2.setAttribute('role', 'button'); h2.tabIndex = 0; const shut = closed.has(boxKey(h2)); box.classList.toggle('closed', shut); h2.setAttribute('aria-expanded', String(!shut)); });
}
function toggleBox(h2) {
  const k = boxKey(h2), box = h2.parentElement; if (UI.closed.has(k)) UI.closed.delete(k); else UI.closed.add(k);
  const shut = UI.closed.has(k); box.classList.toggle('closed', shut); h2.setAttribute('aria-expanded', String(!shut));
  try { localStorage.setItem('ab-closed', JSON.stringify([...UI.closed])); } catch { /* private mode */ }
}
function feedHTML(items, max) {
  if (!items.length) return '<p class="empty">Nothing yet.</p>';
  return `<div class="feed">${items.slice(0, max || 12).map((n) => `<div><time>${esc(dateLabel(n.m))}</time><b class="${n.kind === 'bad' ? 'down' : n.kind === 'good' ? 'up' : ''}">${esc(n.title)}</b>${n.text ? `<p>${esc(n.text)}</p>` : ''}</div>`).join('')}</div>`;
}
function empireHTML() {
  const c = city(), p = me(), r = E.rates(c, 'p', p.id), mine = E.ownedBy(c, 'p', p.id), hist = p.hist.map((h) => h[1]);
  const offers = c.offers.filter((o) => o.status === 'open' && o.to === p.id);
  const decisions = p.inbox.map((d) => { const def = DECISIONS.find((x) => x.id === d.def);
    return `<div class="decision">${def.needs ? `<div class="art" style="background-image:url(img/c-${def.needs}.jpg)"></div>` : ''}<div class="in"><span class="cap">Autopilot decides in <span data-live="until:${d.dueM}">…</span></span><h3>${esc(def.title)}</h3><p>${esc(def.text)}</p>
      ${def.options.map((o, i) => `<button class="opt" data-a="decide" data-id="${d.id}" data-opt="${i}"><b>${esc(o.l)}</b><span>${esc(o.d)}</span></button>`).join('')}</div></div>`; }).join('');
  const offerHTML = offers.map((o) => { const l = E.listing(c, o.lid), b = c.players[o.from]; return `<div class="row ${o.hostile ? 'hostile' : ''}">${avatar(b)}<div class="grow"><b>${o.hostile ? `Hostile bid: ${esc(b.name)} wants your company for ${M(o.amount)}` : `${esc(b.name)} offers ${M(o.amount)}`}</b>${o.hostile ? `<span class="down">Goes through in <span data-live="until:${o.dueM}">…</span> unless you reject it</span>` : ''}<span>for your ${esc(TYPES[l.type].name)} in ${esc(l.district)} (value ${M(E.listingValue(l))})</span></div><div class="btns"><button class="btn sm gold" data-a="offerAccept" data-id="${o.id}">Sell</button><button class="btn sm" data-a="offerDecline" data-id="${o.id}">Decline</button></div></div>`; }).join('');
  const comps = mine.map(companyRow).join('');
  const allTasks = mine.flatMap((l) => E.OPS.tasks(c, l).map((t) => ({ ...t, l })));
  const orderValue = mine.reduce((a, l) => a + (l.ops ? l.ops.pending.reduce((x, o) => x + o.value, 0) : 0), 0);
  const specs = STAFF.map((s) => { const hired = E.hasStaff(p, s.id), a = p.assign && p.assign[s.id], al = a ? E.listing(c, a.lid) : null;
    return `<button class="row" style="width:100%;text-align:left" data-a="staff" data-id="${s.id}"><span class="thumb" style="background-image:url(img/s-${s.id}.jpg);background-position:center 20%"></span><div class="grow"><b>${esc(s.name)}</b><span>${esc(s.role)} · leads ${esc(E.OPS.DEPT[deptOfSpec(s.id)].name)}</span>${hired ? `<span class="${al ? 'up' : 'down'}">${al ? `Heads ${esc(E.OPS.DEPT[a.dept].name)} at ${esc(TYPES[al.type].name)}, ${esc(al.district)}` : 'Hired, not assigned: open a company and make them head of a department'}</span>` : ''}</div>${hired ? '<span class="chip good">Hired</span>' : `<span class="chip num">${M(E.staffCost(p, s.id))}</span>`}</button>`; }).join('');
  return `<div class="grid"><div class="col">
      ${parentBox(c, p)}
      <div class="box"><h2>${esc(p.name)}'s empire<small>LIVE</small></h2><div class="in">
        <div><div class="cap">Cash, counting in real time</div><div class="hero-cash num" data-live="cash">$0</div></div>
        <div class="stats"><div class="stat"><small>Profit / yr (est.)</small><b class="num ${E.annualEstimate(c, 'p', p.id) >= 0 ? 'up' : 'down'}">${M(E.annualEstimate(c, 'p', p.id), true)}</b></div><div class="stat"><small>Wages, budgets, interest</small><b class="num down">${M(-r.costs)}</b></div><div class="stat"><small>Net worth</small><b class="num">${M(E.netWorth(c, p.id))}</b></div><div class="stat"><small>Influence</small><b class="num">${p.inf}</b></div></div>
        ${hist.length > 1 ? `<div>${spark(hist, 320, 46)}<div class="cap" style="margin-top:2px">Net worth since you arrived</div></div>` : ''}
        <p class="empty" style="font-size:13.5px">Your companies keep earning while you are away. At live speed one game year lasts one real week.</p></div></div>
      ${offers.length || decisions || allTasks.length || Object.keys(SCENES).length ? `<div class="box"><h2>Inbox<small>${p.inbox.length + offers.length + allTasks.length}</small></h2><div class="in">
        ${Object.keys(SCENES).length ? `<div class="cap">Running now</div>${scenesHTML(() => true, true)}` : ''}
        ${allTasks.filter((t) => !(t.interactive && sceneFor(t.l.id, t.id))).length ? `<div class="cap">Company to-dos</div><div class="rows">${allTasks.filter((t) => !(t.interactive && sceneFor(t.l.id, t.id))).slice(0, 6).map((t) => `<div class="row"><span class="thumb" style="background-image:url(img/c-${t.l.type}.jpg)"></span><div class="grow"><b>${esc(t.label)}</b><span>${esc(lname(t.l))} · ${esc(t.l.district)}${t.value ? ` · ${M(t.value)}` : ''}</span></div>${taskButton(t.l, t)}</div>`).join('')}</div>${allTasks.length > 6 ? `<p class="empty" style="font-size:13px">${allTasks.length - 6} more inside your companies.</p>` : ''}` : ''}
        ${offerHTML ? `<div class="rows">${offerHTML}</div>` : ''}${decisions}</div></div>` : ''}
      <div class="box"><h2>Autopilot</h2><div class="in"><p class="empty">When you don't answer a decision in time, your managers choose for you.</p>
        <div class="seg" role="group">${[['cautious', 'Cautious'], ['balanced', 'Balanced'], ['bold', 'Bold']].map(([k, l]) => `<button data-a="policy" data-v="${k}" aria-pressed="${p.policy === k}">${l}</button>`).join('')}</div></div></div>
      <div class="box"><h2>Your companies<small>${mine.length}</small></h2><div class="in">${mine.length ? `<div class="rows">${comps}</div><p class="empty" style="font-size:13px">Open a company to run its departments, supplies and orders.</p>` : '<p class="empty">You own no companies yet. Tap a gold pin on the map to buy your first one.</p>'}<button class="btn" data-a="tab" data-v="map">Find companies on the map</button></div></div>
      <div class="box"><h2>Warehouses<small>${E.LOG.ownedWarehouses(c, p.id).length} OWNED</small></h2><div class="in">${E.LOG.ownedWarehouses(c, p.id).length ? `<div class="rows">${E.LOG.ownedWarehouses(c, p.id).map((w) => { const site = E.LOG.SITE[w.id]; return `<button class="row" style="width:100%;text-align:left" data-a="wh" data-wid="${w.id}"><span class="thumb wthumb wh-${site.mode}">${WH_ICON[site.mode]}</span><div class="grow"><b>${esc(site.name)}</b><span>${N(E.LOG.stored(w))} / ${N(E.LOG.capacityOf(w))} units stored · ${N(E.LOG.inbound(c, w))} on the way${w.auto.supply ? ' · supplies your companies' : ''}</span></div></button>`; }).join('')}</div>` : '<p class="empty">Warehouses let you import cheaper, keep a buffer and truck supplies to your companies. Tap a warehouse on the map. The airport has the biggest one.</p>'}</div></div>
    </div><div class="col">
      ${teamBoxHTML()}
      <div class="box"><h2>Your activity</h2><div class="in">${feedHTML(p.feed, 14)}</div></div>
    </div></div>`;
}
function marketHTML() {
  const c = city(), p = me(), intel = E.intelFor(c, p.id), q = UI.qty, nextQ = (Math.floor(c.m / 3) + 1) * 3;
  const last = c.lastCard ? WORLD.find((w) => w.id === c.lastCard.id) : null;
  const stocks = STOCKS.map((s) => { const st = { p: livePrice(c, s.id) }, h = liveH(c, s.id), ch = h.length > 1 ? (h[h.length - 1] / h[h.length - 2] - 1) * 100 : 0, own = p.shares[s.id] || 0;
    return `<div class="srow"><img src="img/k-${s.id}.jpg" alt=""><div style="min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.name)}</b><span class="num muted" style="font-size:13px">${PX(st.p)} <span class="${ch >= 0 ? 'up' : 'down'}">${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%</span> · own ${own}</span></div>
      <div class="btns" style="flex-wrap:nowrap;gap:6px">${spark(h.slice(-48), 54, 24)}<button class="btn sm gold" data-a="trade" data-id="${s.id}" data-q="${q}" ${p.cash < q * st.p ? 'disabled' : ''}>Buy</button><button class="btn sm" data-a="trade" data-id="${s.id}" data-q="${-q}" ${own ? '' : 'disabled'}>Sell</button></div></div>`; }).join('');
  const supplies = Object.entries(GOODS).map(([g, d]) => { const mk = c.market[g], last = mk.last || {}, vs = (mk.p / d.base - 1) * 100;
    return `<tr><td><b>${esc(d.name)}</b><span>${d.producer ? 'Made by ' + esc(TYPES[d.producer].name) : 'Import only'}</span></td><td class="num">${K(mk.p)}</td><td class="num ${vs > 5 ? 'down' : vs < -5 ? 'up' : ''}">${P(vs)}</td><td>${spark(mk.h.slice(-18), 60, 22)}</td><td class="num muted">${K(E.OPS.importPrice(c, g))}</td><td class="num muted">${K(E.OPS.exportPrice(c, g))}</td><td class="num">${N(E.OPS.listedQty(c, g))}</td><td class="num">${N(last.bought || 0)}</td><td class="num">${N(last.imported || 0)}</td></tr>`; }).join('');
  const myOffers = (c.book || []).filter((x) => x.seller.k === 'p' && x.seller.id === p.id).map((x) => { const l = E.listing(c, x.lid); return `<div class="row"><div class="grow"><b>${N(x.qty)} ${esc(GOODS[x.g].unit)} ${esc(GOODS[x.g].name.toLowerCase())}</b><span>${K(x.price)} each · from ${esc(l ? TYPES[l.type].name : '')}${x.auto ? ' · listed by Sales' : ''}</span></div><button class="btn sm" data-a="cancelOffer" data-id="${x.id}">Withdraw</button></div>`; }).join('');
  const debt = E.debt(p), r = E.rates(c, 'p', p.id);
  return `<div class="grid"><div class="col">
      <div class="box"><h2>World economy<small>${c.econ.toUpperCase()}</small></h2><div class="in">
        ${last ? `<div><div class="cap">Latest World Card · ${esc(dateLabel(c.lastCard.m))}</div><b style="font-family:var(--head);font-size:18px">${esc(last.title)}</b><p class="empty" style="margin-top:4px">${esc(last.text)}</p></div>` : ''}
        <div class="stat"><small>Next World Card in</small><b class="num" data-live="until:${nextQ}">…</b></div>
        ${intel ? `<div class="prop"><span class="cap">Market insight from ${esc(intel.from)}</span><b>Next quarter: ${esc(intel.next.title)}</b><span class="muted" style="font-size:13.5px">${esc(intel.next.text)}</span></div>` : '<p class="empty" style="font-size:13.5px">Hire Jason Miller, or add someone who has him to your network, to see the next World Card before it hits.</p>'}
        <p class="empty" style="font-size:13.5px">Booms raise Trade income 30%. Recessions cut it 40%, crises 60%. Every player in the city lives in the same economy.</p></div></div>
      <div class="box"><h2>Supplies market<small>CITY-WIDE</small></h2><div class="in">
        <p class="empty" style="font-size:13.5px">Every company in Aurex Bay buys and sells here. Prices float between the export floor and the import ceiling, driven by what players produce and need.</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Supply</th><th>Price</th><th>vs normal</th><th>Trend</th><th>Import</th><th>Export</th><th>On offer</th><th>Bought last mo</th><th>Imported</th></tr></thead><tbody>${supplies}</tbody></table></div></div></div>
      ${myOffers ? `<div class="box"><h2>Your offers<small>OPEN</small></h2><div class="in"><div class="rows">${myOffers}</div></div></div>` : ''}
    </div><div class="col">
      <div class="box"><h2>Bank of Aurex</h2><div class="in"><div class="stats"><div class="stat"><small>Debt</small><b class="num down">${M(-debt)}</b></div><div class="stat"><small>Rate</small><b class="num">${E.loanRate(c, p)}%</b></div><div class="stat"><small>Interest / yr</small><b class="num">${M(-r.interest)}</b></div><div class="stat"><small>Credit limit</small><b class="num">${M(E.loanCap(c, p))}</b></div></div>
        <div class="btns"><button class="btn navy" data-a="loan" data-v="5">Borrow 5 M</button><button class="btn navy" data-a="loan" data-v="20">Borrow 20 M</button><button class="btn" data-a="repay" data-v="5" ${debt ? '' : 'disabled'}>Repay 5 M</button><button class="btn" data-a="repay" data-v="999" ${debt ? '' : 'disabled'}>Repay all</button></div></div></div>
      <div class="box"><h2>Aurex Bay Gazette<small>CITY NEWS</small></h2><div class="in">${feedHTML(c.news, 16)}</div></div>
    </div></div>`;
}
function networkHTML() {
  const c = city(), p = me(), st = E.standings(c);
  const inReq = c.netReqs.filter((r) => r.status === 'open' && r.to === p.id), outReq = c.netReqs.filter((r) => r.status === 'open' && r.from === p.id);
  const inCon = c.contracts.filter((k) => k.status === 'pending' && k.to === p.id), active = c.contracts.filter((k) => k.status === 'active' && (k.to === p.id || k.from === p.id));
  const conLabel = (k) => { const a = E.listing(c, k.a), b = E.listing(c, k.b); return `${TYPES[a.type].name} (${c.players[k.from].name.split(' ')[0]}) ↔ ${TYPES[b.type].name} (${c.players[k.to].name.split(' ')[0]})`; };
  const members = p.net.map((id) => c.players[id]).filter(Boolean).map((m) => { const ls = E.ownedBy(c, 'p', m.id);
    let n = 0; ls.forEach((ol) => E.ownedBy(c, 'p', p.id).forEach((ml) => { if (E.contractValid(c, ml.id, ol.id, p.id, m.id).ok) n++; }));
    return `<div class="row">${avatar(m)}<div class="grow"><b>${esc(m.name)}</b><span>${M(E.netWorth(c, m.id))} · ${ls.map((l) => TYPES[l.type].name).join(', ') || 'no companies yet'}</span>${n ? `<span class="up">${n} possible supply contract${n > 1 ? 's' : ''}: open one of your companies to offer</span>` : ''}${E.hasStaff(m, 'jason') ? '<span>Shares market insight with you</span>' : ''}</div><button class="btn sm" data-a="netRemove" data-pid="${m.id}">Remove</button></div>`; }).join('');
  const board = st.map((r, i) => { const x = c.players[r.id], inNet = p.net.includes(r.id), pend = outReq.some((q) => q.to === r.id);
    return `<div class="row"><b class="num" style="width:24px">${i + 1}</b>${avatar(x)}<div class="grow"><b>${esc(r.id === p.id ? r.name + ' (you)' : r.name)}</b>${E.BR.brandOf(c, r.id) ? `<span class="lgline">${logoMark(E.BR.brandOf(c, r.id), 16)}${esc(E.BR.brandOf(c, r.id).name)}</span>` : ''}<span>${M(r.nw)} net worth · ${r.inf} influence · ${E.ownedBy(c, 'p', r.id).length} companies</span></div>${r.id === p.id ? '' : inNet ? '<span class="chip">In network</span>' : pend ? '<span class="chip">Requested</span>' : `<button class="btn sm navy" data-a="netRequest" data-pid="${r.id}">Add</button>`}</div>`; }).join('');
  return `<h2 class="ph1">Network</h2><p class="lede">Play together while each of you keeps your own companies. People in your network can sign supply contracts that give both companies a synergy bonus, and share market insight.</p>
    <div class="grid"><div class="col">
      ${inReq.length || inCon.length ? `<div class="box"><h2>Waiting for you<small>${inReq.length + inCon.length}</small></h2><div class="in"><div class="rows">
        ${inReq.map((r) => `<div class="row">${avatar(c.players[r.from])}<div class="grow"><b>${esc(c.players[r.from].name)}</b><span>wants to join your network</span></div><div class="btns"><button class="btn sm gold" data-a="netAccept" data-pid="${r.from}">Accept</button><button class="btn sm" data-a="netDecline" data-pid="${r.from}">Decline</button></div></div>`).join('')}
        ${inCon.map((k) => `<div class="row">${avatar(c.players[k.from])}<div class="grow"><b>Supply contract offer</b><span>${esc(conLabel(k))}</span></div><div class="btns"><button class="btn sm gold" data-a="contractAccept" data-id="${k.id}">Sign</button><button class="btn sm" data-a="contractDecline" data-id="${k.id}">Decline</button></div></div>`).join('')}
      </div></div></div>` : ''}
      <div class="box"><h2>Your network<small>${p.net.length}</small></h2><div class="in">${members ? `<div class="rows">${members}</div>` : '<p class="empty">Nobody yet. Add players from the city ranking.</p>'}${outReq.length ? `<p class="empty" style="font-size:13.5px">Waiting for: ${outReq.map((q) => esc(c.players[q.to].name)).join(', ')}</p>` : ''}</div></div>
      <div class="box"><h2>Supply contracts<small>${active.length} ACTIVE</small></h2><div class="in">${active.length ? `<div class="rows">${active.map((k) => `<div class="row"><div class="grow"><b>${esc(conLabel(k))}</b><span>Signed ${esc(dateLabel(k.m))}</span></div><button class="btn sm" data-a="contractEnd" data-id="${k.id}">End</button></div>`).join('')}</div>` : '<p class="empty">Valid pairs: Metal → Car or Chip, Chip → Data or Pharma, Film or Hotel → Fashion, Finance → Data.</p>'}</div></div>
    </div><div class="col">
      <div class="box"><h2>City ranking<small>SEASON ${c.season}</small></h2><div class="in"><div class="rows">${board}</div></div></div>
    </div></div>`;
}
function coopHTML() {
  const c = city(), p = me(), mineH = E.myHoldings(c, p.id), invites = Object.values(c.holdings).filter((h) => h.invites.some((i) => i.pid === p.id));
  const others = Object.values(c.holdings).filter((h) => !h.members[p.id]);
  const card = (h) => {
    const r = E.rates(c, 'h', h.id), tot = E.holdingShares(h), nav = E.holdingNav(c, h), stake = E.holdingStake(c, h, p.id), ls = E.ownedBy(c, 'h', h.id);
    const members = Object.entries(h.members).map(([pid, sh]) => ({ p: c.players[pid], sh }));
    const props = h.proposals.filter((x) => x.status === 'open').map((pr) => { let yes = 0, no = 0; Object.entries(pr.votes).forEach(([pid, v]) => { const s = h.members[pid] || 0; if (v) yes += s; else no += s; });
      return `<div class="prop"><b>${esc(E.proposalLabel(c, pr))}</b><span class="muted" style="font-size:13px">Proposed by ${esc(c.players[pr.by].name)} · yes ${Math.round(yes / tot * 100)}% · no ${Math.round(no / tot * 100)}% · closes in <span data-live="until:${pr.dueM}">…</span></span>
        ${p.id in pr.votes ? `<span class="chip">You voted ${pr.votes[p.id] ? 'yes' : 'no'}</span>` : `<div class="btns"><button class="btn sm gold" data-a="vote" data-hid="${h.id}" data-prid="${pr.id}" data-v="1">Vote yes</button><button class="btn sm" data-a="vote" data-hid="${h.id}" data-prid="${pr.id}" data-v="0">Vote no</button></div>`}</div>`; }).join('');
    const partnerCos = Object.keys(h.members).filter((pid) => pid !== p.id).flatMap((pid) => E.ownedBy(c, 'p', pid));
    const freeAff = c.listings.filter((l) => !l.owner && E.listingPrice(l) <= h.treasury).sort((a, b) => E.listingPrice(b) - E.listingPrice(a));
    const invitable = Object.values(c.players).filter((x) => !h.members[x.id] && !h.invites.some((i) => i.pid === x.id)).sort((a, b) => (p.net.includes(b.id) ? 1 : 0) - (p.net.includes(a.id) ? 1 : 0));
    return `<div class="coopcard"><header>${logoMark(E.BR.holdingBrand(h), 40)}<div style="flex:1"><b>${esc(h.name)}</b><div style="font-size:13px;opacity:.85">${h.parent ? 'Co-owned parent company' : 'Coop parent company'} · founded ${esc(dateLabel(h.createdM))}${h.parent ? ` · buy-in ${M(h.buyIn || E.BR.MIN_STAKE)} · ${h.open ? 'open to all' : 'invited only'}` : ''}</div></div><span class="chip" style="background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.3)">Your stake ${Math.round(stake * 100)}%</span></header><div class="in">
      <div class="stats"><div class="stat"><small>Treasury</small><b class="num" data-live="treasury:${h.id}">…</b></div><div class="stat"><small>Value (NAV)</small><b class="num">${M(nav)}</b></div><div class="stat"><small>Income / yr</small><b class="num up">${M(r.net, true)}</b></div><div class="stat"><small>Dividend</small><b class="num">${Math.round(h.payout * 100)}% of profit</b></div></div>
      <div><div class="cap" style="margin-bottom:5px">Owners</div><div class="stake">${members.map((m) => `<i style="width:${m.sh / tot * 100}%;background:${m.p.id === p.id ? 'var(--good)' : m.p.color}" title="${esc(m.p.name)}"></i>`).join('')}</div>
        <div class="chips" style="margin-top:6px">${members.map((m) => `<span class="chip">${esc(m.p.id === p.id ? 'You' : m.p.name)} ${Math.round(m.sh / tot * 100)}%</span>`).join('')}${h.invites.map((i) => `<span class="chip muted">${esc(c.players[i.pid]?.name)} invited</span>`).join('')}</div></div>
      <div><div class="cap" style="margin-bottom:4px">Companies</div>${ls.length ? `<div class="rows">${ls.map((l) => `<button class="row" style="width:100%;text-align:left" data-a="open" data-lid="${l.id}"><span class="thumb" style="background-image:url(img/c-${l.type}.jpg)"></span><div class="grow"><b>${esc(TYPES[l.type].name)}</b><span>${esc(l.district)} · Level ${l.level}${l.upgrade ? ' → ' + l.upgrade.to : ''}</span></div><b class="num up">${M(E.listingYield(c, l, l.owner).total, true)}</b></button>`).join('')}</div>` : '<p class="empty">No companies yet. Propose a purchase below.</p>'}</div>
      ${partnerCos.length ? `<div><div class="cap" style="margin-bottom:4px">Your partners' own companies</div><div class="rows">${partnerCos.map((l) => `<button class="row" style="width:100%;text-align:left" data-a="viewCompany" data-lid="${l.id}"><span class="thumb" style="background-image:url(img/c-${l.type}.jpg)"></span><div class="grow"><b>${esc(TYPES[l.type].name)}</b><span>${esc(c.players[l.owner.id].name)} · ${esc(l.district)} · ${(l.ops && l.ops.board ? l.ops.board.length : 0)} board posts</span></div><span class="chip">View</span></button>`).join('')}</div></div>` : ''}
      ${props ? `<div class="cap">Open votes</div>${props}` : ''}
      <div class="field"><label for="buy-${h.id}">Propose a purchase</label><div class="btns" style="flex-wrap:nowrap"><select id="buy-${h.id}">${freeAff.length ? freeAff.map((l) => `<option value="${l.id}">${esc(TYPES[l.type].name)} · ${esc(l.district)} · ${M(E.listingPrice(l))}</option>`).join('') : '<option value="">Treasury too small for any company for sale</option>'}</select><button class="btn coop" data-a="hpropose" data-hid="${h.id}" ${freeAff.length ? '' : 'disabled'}>Propose</button></div></div>
      ${h.parent ? `<div class="field"><label>Buy-in for new owners</label><div class="btns" style="align-items:center"><div class="stepper"><button data-a="hbuyin" data-hid="${h.id}" data-v="-5" aria-label="Lower">−</button><output class="num">${M(h.buyIn || E.BR.MIN_STAKE)}</output><button data-a="hbuyin" data-hid="${h.id}" data-v="5" aria-label="Raise">+</button></div><div class="seg" role="group"><button data-a="hopen" data-hid="${h.id}" data-v="1" aria-pressed="${!!h.open}">Open to all</button><button data-a="hopen" data-hid="${h.id}" data-v="0" aria-pressed="${!h.open}">Invited only</button></div></div></div>` : ''}
      <div class="field"><label for="inv-${h.id}">Invite a co-owner</label><div class="btns" style="flex-wrap:nowrap"><select id="inv-${h.id}">${invitable.map((x) => `<option value="${x.id}">${esc(x.name)}${p.net.includes(x.id) ? ' (network)' : ''}</option>`).join('')}</select><button class="btn" data-a="hinvite" data-hid="${h.id}">Invite</button></div></div>
      <div class="btns" style="align-items:center"><div class="stepper"><button data-a="camt" data-v="-5" aria-label="Less">−</button><output class="num">${M(UI.coopAmt)}</output><button data-a="camt" data-v="5" aria-label="More">+</button></div><button class="btn coop" data-a="hjoin" data-hid="${h.id}">Invest more</button>
        <div class="seg">${[0.25, 0.5, 0.75].map((v) => `<button data-a="hpayout" data-hid="${h.id}" data-v="${v}" aria-pressed="${h.payout === v}" title="Propose dividend payout">${v * 100}%</button>`).join('')}</div>
        <button class="btn danger" data-a="hleave" data-hid="${h.id}">${Object.keys(h.members).length === 1 ? 'Dissolve' : 'Sell my stake'}</button></div>
    </div></div>`;
  };
  return `<h2 class="ph1">Coop parent companies</h2><p class="lede">Pool money with other players in a shared parent company. Every owner holds a stake in proportion to what they put in. Purchases, upgrades and dividends are decided by vote. Owners don't need to be online at the same time: open votes close after one game month.</p>
    ${invites.length ? `<div class="box"><h2>Invitations<small>${invites.length}</small></h2><div class="in"><div class="rows">${invites.map((h) => `<div class="row"><div class="grow"><b>${esc(h.name)}</b><span>Value ${M(E.holdingNav(c, h))} · ${Object.keys(h.members).length} owners</span></div><button class="btn sm coop" data-a="hjoin" data-hid="${h.id}">Invest ${M(UI.coopAmt)}</button></div>`).join('')}</div></div></div>` : ''}
    <div class="grid"><div class="col">${mineH.map(card).join('') || '<div class="box"><div class="in"><p class="empty">You are not part of a coop yet. Found one to buy companies that are too expensive alone.</p></div></div>'}</div>
    <div class="col">
      <div class="box"><h2>Found a coop</h2><div class="in"><div class="field"><label for="coop-name">Name</label><input id="coop-name" maxlength="32" placeholder="Harbor Row Capital" autocomplete="off"></div>
        <div class="btns" style="align-items:center"><span class="cap">Your capital</span><div class="stepper"><button data-a="camt" data-v="-5" aria-label="Less">−</button><output class="num">${M(UI.coopAmt)}</output><button data-a="camt" data-v="5" aria-label="More">+</button></div></div>
        <button class="btn coop" data-a="hcreate" ${p.cash < UI.coopAmt ? 'disabled' : ''}>Found coop with ${M(UI.coopAmt)}</button></div></div>
      <div class="box"><h2>Other coops in the city<small>${others.length}</small></h2><div class="in">${others.length ? `<div class="rows">${others.map((h) => `<div class="row">${logoMark(E.BR.holdingBrand(h), 32)}<div class="grow"><b>${esc(h.name)}</b><span>${Object.keys(h.members).map((pid) => esc(c.players[pid]?.name)).join(', ')} · value ${M(E.holdingNav(c, h))}</span>${h.open ? `<span>Open for buy-in from ${M(h.buyIn || E.BR.MIN_STAKE)}</span>` : ''}</div>${h.open ? `<button class="btn sm coop" data-a="hbuy" data-hid="${h.id}">Buy in</button>` : ''}</div>`).join('')}</div>` : '<p class="empty">None yet.</p>'}</div></div>
    </div></div>`;
}

// ---------------------------------------------------------------- modals
function modal(html) { const m = $('modal'); m.innerHTML = `<div class="wrap"><button class="close" data-a="close" aria-label="Close">${ICON.x}</button>${html}</div>`; m.hidden = false; liveUpdate(); }
function closeModal() { $('modal').hidden = true; $('modal').innerHTML = ''; UI.modal = null; }
function openListing(lid) { UI.modal = { t: 'listing', id: lid }; const st = $('modal').scrollTop; modal(companyCard(E.listing(city(), lid))); $('modal').scrollTop = st; }
function openStaff(id, keep) { if (!keep || !UI.modal || UI.modal.id !== id) UI.modal = { t: 'staff', id }; const sc = $('modal').scrollTop; modal(c0().talent ? talentModal(UI.modal) : staffCard(STAFF_BY[id])); if (keep) $('modal').scrollTop = sc; }
const c0 = () => city();
function openStock(id) { UI.modal = { t: 'stock', id }; const st = $('modal').scrollTop; modal(stockModal(id, UI.sqty)); $('modal').scrollTop = st; }
function openWarehouse(id) { UI.modal = { t: 'wh', id }; const st = $('modal').scrollTop; modal(warehouseHTML(id, UI)); $('modal').scrollTop = st; }
function openDelivery(lid, sel) {
  UI.modal = { t: 'deliv', lid, sel, truck: null }; renderDelivery();
  // Start the map scrolled to the clients so pins near the edges are in view.
  const w = document.querySelector('.dmap-wrap'), l = E.listing(city(), lid), cl = l && l.ops ? E.OPS.activeClients(l.ops) : [];
  if (w && cl.length) { const cx = cl.reduce((s, c) => s + c.x, 0) / cl.length / MAP.w; w.scrollLeft = Math.max(0, cx * w.scrollWidth - w.clientWidth / 2); }
}
function renderDelivery() { const st = $('modal').scrollTop, mapEl = document.querySelector('.dmap-wrap'), sx = mapEl ? mapEl.scrollLeft : 0; modal(deliveryHTML(UI.modal)); $('modal').scrollTop = st; const m2 = document.querySelector('.dmap-wrap'); if (m2) m2.scrollLeft = sx; }
const LIFE_MODALS = ['home', 'item', 'cid', 'lot', 'trade'];
function openLife(st) { UI.modal = st; const sc = $('modal').scrollTop, strips = [...document.querySelectorAll('#modal .cstrip')].map((x) => x.scrollLeft); modal(lifeModal(st, UI)); $('modal').scrollTop = sc; document.querySelectorAll('#modal .cstrip').forEach((x, i) => { x.scrollLeft = strips[i] || 0; }); }
let lastDinner = 0;
function tickDinner() {
  const st = UI.modal; if (st.phase !== 'run') return;
  if (Date.now() - st.start >= GC_DINNER_MS) { st.phase = 'finishing'; B.act('host', { guests: st.guests, uid: st.uid }).then((r) => { st.phase = 'done'; st.result = r && r.msg ? r.msg : 'What an evening.'; if (r && r.ok === false) st.result = r.msg; renderAll(); modal(dinnerHTML(st)); }); return; }
  if (Date.now() - lastDinner > 450) { lastDinner = Date.now(); const el = document.querySelector('.scene'); if (el) el.outerHTML = dinnerHTML(st); }
}
const GC_DINNER_MS = 20000;
function refreshModal() { if (!UI.modal) return; if (LIFE_MODALS.includes(UI.modal.t)) openLife(UI.modal); if (UI.modal.t === 'wh') openWarehouse(UI.modal.id); if (UI.modal.t === 'deliv' && !UI.modal.truck) renderDelivery(); if (UI.modal.t === 'listing') openListing(UI.modal.id); if (UI.modal.t === 'staff') openStaff(UI.modal.id, true); if (UI.modal.t === 'stock') openStock(UI.modal.id); }
// ---------------------------------------------------------------- account and parent company (shown before the game)
// Order: log in (online) → avatar name → parent company → game. Older guest players are asked once to add e-mail + password.
function parentBox(c, p) {
  const b = E.BR.brandOf(c, p.id); if (!b) return '';
  const h = b.hid ? c.holdings[b.hid] : null, acc = B.account;
  const owners = h ? Object.keys(h.members).filter((id) => id !== p.id).map((id) => c.players[id]?.name).filter(Boolean) : [];
  return `<div class="box parentbox" style="--brand:${E.BR.colorHex(b.color)}"><div class="in">
    <div class="pb-logo">${logoFull(b, { size: 44 })}</div>
    <p class="pb-sub">${h ? `Co-owned parent company · your stake ${Math.round(E.holdingStake(c, h, p.id) * 100)}%${owners.length ? ' · with ' + esc(owners.join(', ')) : ''} · buy-in ${M(h.buyIn || E.BR.MIN_STAKE)}` : `Parent company of ${esc(p.name)} · 100% yours`}</p>
    <div class="btns">${!h || h.founder === p.id ? '<button class="btn sm" data-a="editLogo">Edit logo</button>' : ''}${h ? '<button class="btn sm coop" data-a="tab" data-v="coop">Co-owners and buy-in</button>' : ''}
      ${acc ? (acc.anon ? '<button class="btn sm gold" data-a="secure">Save your city</button>' : `<span class="pb-acc">${esc(acc.email)}</span><button class="linkbtn" data-a="signOut">Log out</button>`) : ''}</div></div></div>`;
}
function obState() { if (!UI.ob) UI.ob = { view: 'signup', first: '', last: '', email: '' }; return UI.ob; }
function renderOb() {
  const st = UI.modal, c = city(), o = obState(), m = $('modal'), sc = m.scrollTop;
  const html = st.view === 'auth' ? authHTML(o, c) : st.view === 'avatar' ? avatarHTML(o) : st.view === 'password' ? passwordHTML(o, B.recovery ? 'Choose a new password' : 'Choose your password')
    : st.view === 'secure' ? secureHTML(o, me()) : foundHTML(UI.found, c, me());
  m.innerHTML = `<div class="wrap">${st.view === 'found' && UI.found.edit ? `<button class="close" data-a="close" aria-label="Close">${ICON.x}</button>` : ''}${html}</div>`; m.hidden = false; m.scrollTop = sc;
}
function showOb(view) {
  if (!UI.modal || UI.modal.t !== 'ob' || UI.modal.view !== view) { obState().err = null; obState().note = null; if (view === 'found' && (!UI.found || UI.found.edit)) UI.found = newFound(city()); }
  UI.modal = { t: 'ob', view }; renderOb();
  const f = $('modal').querySelector('input:not([type=checkbox])'); if (f && !f.value && innerWidth > 720) f.focus();
}
// decide what the player has to do before (or instead of) playing
function gate() {
  const c = city(), acc = B.account, p = me();
  if (B.mode === 'online') {
    if (B.recovery) return showOb('password');
    if (!acc || (acc.anon && !p)) { if (acc && acc.anon) obState().view = 'signup'; return showOb('auth'); }
    if (acc.needsPassword && !acc.anon) return showOb('password');
  }
  if (!p) { const o = obState(); if (acc) { o.first = o.first || acc.first; o.last = o.last || acc.last; } return showOb('avatar'); }
  if (!p.first) { const o = obState(); if (!o.first && !o.last) { const [f, ...l] = p.name.split(' '); o.first = f; o.last = l.join(' '); } return showOb('avatar'); }
  if (E.BR.needsParent(c, p.id)) return showOb('found');
  if (acc && acc.anon && !UI.secureLater) return showOb('secure');
  if (UI.modal && UI.modal.t === 'ob') closeModal();
  startGame();
}
function editLogo() {
  const b = E.BR.brandOf(city(), meId()); if (!b) return;
  const end = E.BR.NAME_ENDINGS.find((e) => b.name.endsWith(' ' + e)) || '';
  UI.found = { ...newFound(city()), base: end ? b.name.slice(0, -end.length - 1) : b.name, end, color: b.color, font: b.font, sym: b.sym, edit: true };
  UI.modal = { t: 'ob', view: 'found' }; renderOb();
}
async function obSubmit(kind) {
  const o = obState(), v = (id) => ($(id) ? $(id).value : '');
  if (kind === 'auth' || kind === 'avatar' || kind === 'secure') { o.first = v('ob-first') || o.first; o.last = v('ob-last') || o.last; o.email = v('ob-email') || o.email; }
  const pw = v('ob-pw'); // read before the re-render below clears the field
  o.busy = true; o.err = null; o.note = null; renderOb();
  let r;
  if (kind === 'auth') r = o.view === 'signup' ? await B.signUp({ email: o.email, password: pw, first: o.first, last: o.last }) : o.view === 'reset' ? await B.resetPassword(o.email) : await B.signIn({ email: o.email, password: pw });
  else if (kind === 'avatar') r = me() ? await B.act('avatarName', { first: o.first, last: o.last }) : await B.join({ first: o.first, last: o.last });
  else if (kind === 'password') r = await B.setPassword(pw);
  else if (kind === 'secure') r = await B.secure({ email: o.email, password: pw });
  o.busy = false;
  if (!r || r.ok === false) { o.err = (r && r.msg) || 'Something went wrong. Try again.'; return renderOb(); }
  if (r.confirm || (kind === 'auth' && o.view === 'reset')) { o.note = r.msg; return renderOb(); }
  if (kind === 'secure') toast('Your city is saved to your account.', 'good');
  gate();
}
async function obFound() {
  const f = UI.found; f.busy = true; f.err = null; renderOb();
  const name = [f.base.trim(), f.end].filter(Boolean).join(' ');
  const r = f.edit ? await B.act('coBrand', { name, color: f.color, font: f.font, sym: f.sym })
    : await B.act('coFound', { mode: f.mode, name, color: f.color, font: f.font, sym: f.sym, amt: f.amt, buyIn: f.buyIn, open: f.open });
  f.busy = false;
  if (!r || r.ok === false) { f.err = (r && r.msg) || 'Something went wrong.'; return renderOb(); }
  toast(r.msg, 'good');
  if (f.edit) { closeModal(); renderAll(); return; }
  gate();
}
function showSeasonEnd() {
  const c = city(), st = c.final || E.standings(c), myRank = st.findIndex((x) => x.id === meId()) + 1;
  UI.modal = { t: 'season' };
  modal(`<div class="sheet"><span class="cap">Season ${c.season} · final standings</span><h2>${myRank === 1 ? 'You rule Aurex Bay' : `${esc(st[0].name)} wins the season`}</h2><p>You finished #${myRank} of ${st.length}. Score is net worth plus influence.</p>
    <div class="rows">${st.slice(0, 10).map((r, i) => `<div class="row"><b class="num" style="width:22px">${i + 1}</b>${avatar(c.players[r.id])}<div class="grow"><b>${esc(r.id === meId() ? 'You' : r.name)}</b><span>${M(r.nw)} · ${r.inf} influence</span></div><b class="num">${Math.round(r.score)}</b></div>`).join('')}</div>
    ${B.mode === 'local' ? '<button class="btn gold" data-a="reset">Start a new season</button>' : ''}</div>`);
}

// ---------------------------------------------------------------- events
async function onClick(e) {
  { const p0 = me(), c1 = city(); if (p0 && c1 && c1.m - (p0.lastAct ?? c1.m) >= 1) B.act('ping', {}); } // being here counts as being active
  { const h2 = e.target.closest('#panel .box > h2'); if (h2 && !e.target.closest('[data-a]')) { toggleBox(h2); return; } }
  const t = e.target.closest('[data-a]'); if (!t || t.disabled) return;
  if (t.tagName === 'A') e.preventDefault();
  const d = t.dataset, a = d.a, c = city();
  switch (a) {
    // ---- the in-game browser
    case 'web': openWeb(d.u || (UI.web && UI.web.url) || HOME_URL); return;
    case 'webGo': navWeb(d.u); return;
    case 'webBack': if (UI.web.back.length) { UI.web.fwd.push(UI.web.url); UI.web.url = UI.web.back.pop(); UI.web.amt = null; renderWeb(true); } return;
    case 'webFwd': if (UI.web.fwd.length) { UI.web.back.push(UI.web.url); UI.web.url = UI.web.fwd.pop(); UI.web.amt = null; renderWeb(true); } return;
    case 'webHome': navWeb(HOME_URL); return;
    case 'webClose': closeWeb(); return;
    case 'webDown': UI.web.down = Number(d.v); renderWeb(); return;
    case 'webAmt': { const l = c.life.lots.find((x) => x.id === d.lot); if (!l) return; const base = UI.web.amt || Math.max(l.est, (l.high || 0) * 1.05, (l.bids[meId()] || 0) * 1.05) * 1.1; UI.web.amt = Math.max(l.est * 0.8, (l.high || 0) * 1.01, base + Number(d.v) * l.est * 0.05); renderWeb(); return; }
    case 'close': closeModal(); return;
    case 'tab': closeModal(); setTab(d.v); return;
    case 'open': hideMapCard(); openListing(d.lid); return;
    case 'mapCity': { const d0 = DISTRICT[view.level]; setLevel(null); return; }
    case 'mapGo': setLevel(d.v); return;
    case 'mapHome': hideMapCard(); openMark('h:' + d.hid); return;
    case 'company': closeModal(); setTab('empire'); UI.company = d.lid; $('panel').scrollTop = 0; renderPanel(); return;
    case 'back': UI.company = null; $('panel').scrollTop = 0; renderPanel(); return;
    case 'viewCompany': UI.company = d.lid; $('panel').scrollTop = 0; renderPanel(); return;
    case 'gotoSupplies': { if (UI.company !== d.lid) { closeModal(); setTab('empire'); UI.company = d.lid; renderPanel(); } const el = $('supplies-box'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    case 'gotoOrders': { if (UI.company !== d.lid) { closeModal(); setTab('empire'); UI.company = d.lid; renderPanel(); } const el = $('orders-box'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    case 'scene': if (!sceneFor(d.lid, d.task)) startScene(d.lid, d.task, d.from); renderAll(); return;
    case 'sceneClose': endScene(d.k); renderAll(); return;
    case 'interChoose': { const st = SCENES[d.k]; if (!st || st.phase !== 'decide') return; st.phase = 'busy'; const r = await B.act('task', { lid: st.lid, task: st.task, choice: d.v }); st.phase = 'done'; st.result = r && r.msg ? r.msg : (r && r.ok === false ? 'Could not do that now.' : 'Done.'); renderAll(); return; }
    case 'deliverOpen': openDelivery(d.lid, d.oid); return;
    case 'deliverSel': UI.modal.sel = d.id; UI.modal.bad = null; renderDelivery(); return;
    case 'deliverTo': {
      const st = UI.modal, l = E.listing(c, st.lid), ready = (l.ops.orders || []).filter((x) => x.status === 'accepted'), od = ready.find((x) => x.id === st.sel) || ready[0];
      if (!od || st.truck) return;
      const target = l.ops.clients.find((x) => x.id === d.cid);
      const r = await B.act('order', { lid: st.lid, op: 'deliver', oid: od.id, cid: d.cid });
      if (!r || r.ok === false) { st.bad = d.cid; renderDelivery(); toast(r ? r.msg : 'Failed.', 'bad'); return; }
      st.truck = { x: l.x, y: l.y, ms: 1400 }; st.good = d.cid; renderDelivery();
      requestAnimationFrame(() => requestAnimationFrame(() => { const tr = document.querySelector('.deliv .truck'); if (tr) { tr.style.left = (target.x / MAP.w * 100) + '%'; tr.style.top = (target.y / MAP.h * 100) + '%'; } }));
      setTimeout(() => { if (UI.modal !== st) return; st.truck = null; st.good = null; st.sel = null; toast(r.msg, 'good'); renderAll(); renderDelivery(); }, 1600);
      return;
    }
    case 'order': await act('order', { lid: d.lid, op: d.op, oid: d.oid, ask: Number(d.ask) || undefined }); return;
    case 'buyQty': UI.buyQty[d.g] = Math.max(10, (UI.buyQty[d.g] || Number(t.parentElement.querySelector('output').textContent)) + Number(d.v)); renderPanel(); return;
    case 'buySupply': await act('buySupply', { lid: d.lid, g: d.g, qty: Number(d.q), carrier: d.c }); return;
    case 'carrier': UI.carrier[d.lid] = d.v; renderPanel(); return;
    case 'acctPeriod': UI.acct = UI.acct || {}; UI.acct[d.lid] = d.v; renderPanel(); return;
    case 'whCarrier': UI.whCarrier[d.wid] = d.v; refreshModal(); return;
    case 'wh': hideMapCard(); openWarehouse(d.wid); return;
    case 'whBuy': await act('whBuy', { wid: d.wid }); return;
    case 'whq': UI.whQty[d.g] = Math.max(10, (UI.whQty[d.g] ?? 100) + Number(d.v)); refreshModal(); return;
    case 'whImport': await act('whImport', { wid: d.wid, g: d.g, qty: Number(d.q), carrier: d.c }); return;
    case 'whDispatch': await act('whDispatch', { wid: d.wid, g: d.g, qty: Number(d.q), lid: d.lid }); return;
    case 'whExport': await act('whExport', { wid: d.wid, g: d.g, qty: Number(d.q), carrier: d.c }); return;
    case 'whUpgrade': await act('whUpgrade', { wid: d.wid }); return;
    case 'whSell': await act('whSell', { wid: d.wid }); return;
    case 'whAll': UI.whShowAll = !UI.whShowAll; refreshModal(); return;
    case 'whImportMonths': await act('whAuto', { wid: d.wid, importMonths: Number(d.v) }); return;
    case 'stock': openStock(d.id); return;
    case 'sqty': UI.sqty = Math.max(1, UI.sqty + Number(d.v)); refreshModal(); return;
    case 'sqtyset': UI.sqty = Number(d.v); refreshModal(); return;
    case 'deptOpen': await act('deptOpen', { lid: d.lid, dept: d.dept }); return;
    case 'deptClose': await act('deptClose', { lid: d.lid, dept: d.dept }); return;
    case 'workers': await act('workers', { lid: d.lid, dept: d.dept, delta: Number(d.v) }); return;
    case 'deptSet': await act('deptSet', { lid: d.lid, dept: d.dept, k: d.k, v: d.v }); return;
    case 'task': await act('task', { lid: d.lid, task: d.task }); return;
    case 'restock': await act('task', { lid: d.lid, task: 'restock', months: Number(d.v) }); return;
    case 'listGoods': await act('listGoods', { lid: d.lid, g: d.g }); return;
    case 'exportGoods': await act('exportGoods', { lid: d.lid, g: d.g, carrier: d.c }); return;
    case 'cancelOffer': await act('cancelOffer', { id: d.id }); return;
    case 'assignHead': await act('assignHead', { lid: d.lid, dept: d.dept, spec: d.spec }); return;
    case 'unassignHead': await act('unassignHead', { spec: d.spec }, 'Head removed.'); return;
    case 'approveAll': await act('approveAll', {}); return;
    case 'staff': openStaff(d.id); return;
    case 'obView': { const o = obState(); ['ob-first', 'ob-last', 'ob-email'].forEach((id) => { if ($(id)) o[id.slice(3)] = $(id).value; }); o.view = d.v; o.err = null; o.note = null; renderOb(); return; }
    case 'obMode': UI.found.mode = d.v; UI.found.err = null; renderOb(); return;
    case 'obColor': UI.found.color = d.v; renderOb(); return;
    case 'obFont': UI.found.font = d.v; renderOb(); return;
    case 'obSym': UI.found.sym = d.v; renderOb(); return;
    case 'obAmt': { const f = UI.found, mx = Math.max(E.BR.MIN_STAKE, Math.floor(me().cash)); f[d.k] = Math.max(E.BR.MIN_STAKE, Math.min(d.k === 'amt' ? mx : 200, f[d.k] + Number(d.v))); renderOb(); return; }
    case 'obSuggest': { const n = E.BR.suggestName(city()), end = E.BR.NAME_ENDINGS.find((e) => n.endsWith(' ' + e)) || ''; UI.found.base = end ? n.slice(0, -end.length - 1) : n; UI.found.end = end; renderOb(); return; }
    case 'obFound': await obFound(); return;
    case 'obJoin': { const f = UI.found; const r = await B.act('coJoin', { hid: d.hid }); if (!r || r.ok === false) { f.err = (r && r.msg) || 'Could not buy in.'; renderOb(); return; } toast(r.msg, 'good'); gate(); return; }
    case 'hbuyin': { const h = city().holdings[d.hid]; await act('holdingBuyIn', { hid: d.hid, amt: Math.max(E.BR.MIN_STAKE, (h.buyIn || E.BR.MIN_STAKE) + Number(d.v)) }); return; }
    case 'hbuy': { const h = city().holdings[d.hid]; await act('holdingJoin', { hid: d.hid, amt: h.buyIn || E.BR.MIN_STAKE }); return; }
    case 'hopen': await act('holdingBuyIn', { hid: d.hid, open: d.v === '1' }); return;
    case 'obLater': UI.secureLater = true; gate(); return;
    case 'secure': UI.secureLater = false; showOb('secure'); return;
    case 'editLogo': editLogo(); return;
    case 'signOut': await B.signOut(); return;
    case 'buy': await act('buy', { lid: d.lid }); return;
    case 'buyas': await act('buy', { lid: d.lid, as: d.hid }); return;
    case 'sell': await act('sell', { lid: d.lid }); return;
    case 'upgrade': await act('upgrade', { lid: d.lid }); return;
    case 'hire': { const r = await act('hire', { tid: d.tid || d.id, salary: Number(d.v), years: Number(d.y) }); return; }
    case 'fire': { const r = await act('fire', { tid: d.tid || d.id }); if (r && r.ok) closeModal(); return; }
    case 'tStep': talentStep(UI.modal, d.k, Number(d.v)); openStaff(UI.modal.id, true); return;
    case 'tYears': UI.modal.years = Number(d.v); openStaff(UI.modal.id, true); return;
    case 'tSalary': UI.modal.salary = null; await act('tSalary', { tid: d.tid, salary: Number(d.v) }); return;
    case 'tVacation': case 'tChallenge': case 'tBonus': case 'tScout': await act(a, { tid: d.tid }); return;
    case 'tRenew': await act('tRenew', { tid: d.tid, salary: Number(d.v), years: Number(d.y) }); return;
    case 'tList': await act('tList', { tid: d.tid, price: Number(d.v) }); return;
    case 'tOffer': await act('tOffer', { tid: d.tid, fee: Number(d.f), salary: Number(d.v), years: Number(d.y) }); return;
    case 'tOfferAccept': case 'tOfferDecline': await act(a, { oid: d.oid }); return;
    case 'hostileBid': await act('hostileBid', { lid: d.lid, amt: Number(d.v) }); return;
    case 'loan': await act('loan', { amt: Number(d.v) }); return;
    case 'repay': await act('repay', { amt: Number(d.v) }, 'Repaid.'); return;
    case 'qty': UI.qty = Number(d.v); renderPanel(); return;
    case 'trade': await act('trade', { id: d.id, qty: Number(d.q) }); return;
    case 'policy': await act('policy', { policy: d.v }, 'Autopilot updated.'); return;
    case 'decide': await act('decide', { id: d.id, opt: Number(d.opt) }); return;
    case 'offeramt': { const l = E.listing(c, d.lid), base = UI.offerAmt[d.lid] ?? Math.round(E.listingValue(l) * 1.3); UI.offerAmt[d.lid] = Math.max(1, base + Number(d.v) * Math.max(1, Math.round(E.listingValue(l) * 0.05))); refreshModal(); return; }
    case 'offer': { const l = E.listing(c, d.lid); await act('offer', { lid: d.lid, amt: UI.offerAmt[d.lid] ?? Math.round(E.listingValue(l) * 1.3) }); return; }
    case 'offerAccept': await act('offerAccept', { id: d.id }, 'Sold.'); return;
    case 'offerDecline': await act('offerDecline', { id: d.id }, 'Offer declined.'); return;
    case 'netRequest': await act('netRequest', { pid: d.pid }); return;
    case 'netAccept': await act('netAccept', { pid: d.pid }, 'Added to your network.'); return;
    case 'netDecline': await act('netDecline', { pid: d.pid }); return;
    case 'netRemove': await act('netRemove', { pid: d.pid }, 'Removed from your network.'); return;
    case 'contract': await act('contractPropose', { mine: d.mine, theirs: d.theirs }); return;
    case 'contractAccept': await act('contractAccept', { id: d.id }); return;
    case 'contractDecline': await act('contractDecline', { id: d.id }); return;
    case 'contractEnd': await act('contractEnd', { id: d.id }); return;
    case 'camt': UI.coopAmt = Math.max(5, UI.coopAmt + Number(d.v)); renderPanel(); return;
    case 'hcreate': { const name = ($('coop-name').value || '').trim(); if (!name) { toast('Give your coop a name.', 'bad'); return; } $('coop-name').blur(); await act('holdingCreate', { name, amt: UI.coopAmt }); return; }
    case 'hinvite': await act('holdingInvite', { hid: d.hid, pid: $('inv-' + d.hid).value }); return;
    case 'hjoin': await act('holdingJoin', { hid: d.hid, amt: UI.coopAmt }); return;
    case 'hpropose': await act('holdingPropose', { hid: d.hid, kind: 'buy', lid: $('buy-' + d.hid).value }); return;
    case 'hpayout': await act('holdingPropose', { hid: d.hid, kind: 'payout', pct: Number(d.v) }); return;
    case 'vote': await act('holdingVote', { hid: d.hid, prid: d.prid, yes: d.v === '1' }, 'Vote cast.'); return;
    case 'hleave': await act('holdingLeave', { hid: d.hid }); return;
    case 'reset': await B.reset(); closeModal(); gate(); return;
    // ---- life
    case 'lifeView': { const was = UI.life.room; UI.life.view = d.v; UI.life.room = null; const pn = $('panel'), sc = pn.scrollTop; renderPanel(); const hero = document.querySelector('.lhero'), top = hero ? hero.offsetHeight - 14 : 0; pn.scrollTop = top; return; }
    case 'lifeRoom': UI.life.room = d.v; $('panel').scrollTop = 0; renderPanel(); return;
    case 'lifeBack': UI.life.room = null; $('panel').scrollTop = 0; renderPanel(); return;
    case 'lifeSalary': await act('lifeSalary', { v: Number(d.v) }); return;
    case 'lifeStyle': await act('lifeStyle', { id: d.v }); return;
    case 'lifeDiv': await act('lifeDividend', { amt: Number(d.v) }); return;
    case 'lifeInv': await act('lifeInvest', { amt: Number(d.v) }); return;
    case 'bankSave': await act('bankSave', { amt: Number(d.v) }); return;
    case 'bankWithdraw': await act('bankWithdraw', { amt: Number(d.v) }); return;
    case 'lifeOffer': await act('lifeOffer', {}); return;
    case 'homeOpen': openWeb(`bayhomes.ab/home/${d.hid}`); return;
    case 'homeDown': UI.modal.down = Number(d.v); openLife(UI.modal); return;
    case 'homeBuy': { const r = await act('homeBuy', { hid: d.hid, down: Number(d.v) }); if (r && r.ok) { closeModal(); closeWeb(); setTab('life'); } return; }
    case 'homeSell': await act('homeSell', { uid: d.uid }); return;
    case 'homeRent': await act('homeRent', { uid: d.uid }); return;
    case 'homeMove': await act('homeMove', { uid: d.uid }); return;
    case 'homeRepay': await act('homeRepay', { uid: d.uid, amt: Number(d.v) }); return;
    case 'homeRoom': await act('homeRoom', { uid: d.uid, room: d.room }); return;
    case 'item': openLife({ t: 'item', uid: d.uid }); return;
    case 'cid': openLife({ t: 'cid', cid: d.cid }); return;
    case 'lot': openLife({ t: 'lot', lot: d.lot }); return;
    case 'lotAmt': { const l = city().life.lots.find((x) => x.id === UI.modal.lot); if (!l) return; UI.modal.amt = Math.max(l.est * 0.8, (l.high || 0) * 1.01, (UI.modal.amt || Math.max(l.est, (l.high || 0) * 1.05) * 1.1) + Number(d.v) * l.est * 0.05); openLife(UI.modal); return; }
    case 'itemBuy': { const r = await act('itemBuy', { cid: d.cid }); if (r && r.ok) closeModal(); return; }
    case 'bid': await act('bid', { lot: d.lot, amt: Number(d.v) }); return;
    case 'bidCancel': await act('bidCancel', { lot: d.lot }); return;
    case 'itemSell': { const r = await act('itemSell', { uid: d.uid, how: d.v }); if (r && r.ok && d.v === 'dealer') closeModal(); return; }
    case 'itemWithdraw': await act('itemWithdraw', { uid: d.uid }); return;
    case 'itemLend': await act('itemLend', { uid: d.uid }); return;
    case 'itemGift': { const r = await act('itemGift', { uid: d.uid, to: $('gift-to').value }); if (r && r.ok) closeModal(); return; }
    case 'itemDonate': { if (d.v !== 'yes') { UI.modal.confirm = true; openLife(UI.modal); return; } const r = await act('itemDonate', { uid: d.uid }); if (r && r.ok) closeModal(); return; }
    case 'tradeOpen': openLife({ t: 'trade', to: d.to || null, give: d.give ? [d.give] : [], get: [], cash: 0 }); return;
    case 'tradePick': { const k = d.side === 'give' ? 'give' : 'get', a = UI.modal[k]; UI.modal[k] = a.includes(d.uid) ? a.filter((x) => x !== d.uid) : [...a, d.uid]; openLife(UI.modal); return; }
    case 'tradeCash': { const step = Math.abs(UI.modal.cash + Number(d.v) * 0.05) > 1 ? 0.5 : 0.05; UI.modal.cash = Math.round((UI.modal.cash + Number(d.v) * step) * 100) / 100; openLife(UI.modal); return; }
    case 'tradeSend': { const st = UI.modal; const r = await act('tradePropose', { to: st.to, give: st.give, get: st.get, cash: st.cash }); if (r && r.ok) closeModal(); return; }
    case 'tradeAccept': await act('tradeAccept', { id: d.id }); return;
    case 'tradeDecline': await act('tradeDecline', { id: d.id }, 'Done.'); return;
    case 'dinnerOpen': UI.modal = newDinner(); modal(dinnerHTML(UI.modal)); return;
    case 'dinnerGuests': UI.modal.guests = d.v; modal(dinnerHTML(UI.modal)); return;
    case 'dinnerWine': UI.modal.uid = d.uid; modal(dinnerHTML(UI.modal)); return;
    case 'dinnerStart': startDinner(UI.modal); modal(dinnerHTML(UI.modal)); return;
  }
}

function renderAll() { if (!me()) return; renderTop(); updatePins(); renderPanel(); measureTop(); if (UI.web) renderWeb(); }
// ---------------------------------------------------------------- in-game browser
function openWeb(url) { if (!UI.web) UI.web = { url: parseUrl(url).url, back: [], fwd: [], q: '' }; else if (parseUrl(url).url !== UI.web.url) { UI.web.back.push(UI.web.url); UI.web.fwd = []; UI.web.url = parseUrl(url).url; } $('web').hidden = false; renderWeb(true); }
function navWeb(url) { const u = parseUrl(url).url; if (u !== UI.web.url) { UI.web.back.push(UI.web.url); UI.web.fwd = []; UI.web.url = u; UI.web.amt = null; UI.web.down = null; } renderWeb(true); }
function closeWeb() { UI.web = null; $('web').hidden = true; $('web').innerHTML = ''; }
function renderWeb(top) {
  const el = $('web'); if (!UI.web || el.hidden) return;
  const act0 = document.activeElement; if (!top && act0 && el.contains(act0) && act0.tagName === 'INPUT') return;
  const pg = $('wpage'), sc = pg ? pg.scrollTop : 0;
  el.innerHTML = webHTML(UI.web); if (!top) $('wpage').scrollTop = sc;
}
let shownSeasonEnd = false;
function startGame() {
  ['top', 'tabs'].forEach((id) => ($(id).hidden = false));
  renderAll(); measureTop(); renderMapNav(); $('mapnav').hidden = UI.tab !== 'map';
}

async function boot(hot) {
  // ?demo=1 always opens the offline demo (city simulated in this browser, bots as rivals), even when Supabase is configured.
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const online = !demo && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY;
  try { B = online ? await createOnlineBackend(CONFIG) : createLocalBackend(hot || {}); }
  catch (e) { B = createLocalBackend(hot || {}); toast('Could not reach the live city. Running the offline demo.', 'bad'); }
  S.B = B;
  $('demotag').hidden = B.mode !== 'local';
  $('boot').remove();
  buildMap(); setupPanZoom(); setupMapEvents();
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('#panel .box > h2')) { e.preventDefault(); toggleBox(e.target); } });
  document.addEventListener('change', async (e) => {
    const t = e.target, d = t.dataset;
    if (d.a === 'whTarget') { UI.whTarget[d.g] = t.value; refreshModal(); }
    if (d.a === 'whSupply') await act('whAuto', { wid: d.wid, supply: t.checked });
    if (d.a === 'tradeTo') { UI.modal.to = t.value; UI.modal.get = []; openLife(UI.modal); }
    if (t.id === 'ob-end') { UI.found.end = t.value; foundPreview(UI.found); }
    if (t.id === 'ob-open') UI.found.open = t.checked;
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'ob-base' && UI.found) { UI.found.base = e.target.value; foundPreview(UI.found); } });
  document.addEventListener('submit', async (e) => {
    const wf = e.target.closest('[data-form="addr"], [data-form="search"]');
    if (wf) { e.preventDefault(); const v = wf.querySelector('input').value.trim(); wf.querySelector('input').blur(); if (wf.dataset.form === 'addr') navWeb(v || HOME_URL); else { UI.web.q = v; renderWeb(true); } return; }
    const ob = e.target.closest('[data-form="auth"], [data-form="avatar"], [data-form="password"], [data-form="secure"]');
    if (ob) { e.preventDefault(); await obSubmit(ob.dataset.form); return; }
    const f = e.target.closest('[data-form="post"]'); if (!f) return; e.preventDefault();
    const inp = f.querySelector('input'), text = inp.value.trim(); if (!text) return;
    inp.value = ''; inp.blur(); await act('post', { lid: f.dataset.lid, text }, 'Posted to the company board.');
  });

  $('speed').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-speed]'); if (!b) return;
    const sp = SPEEDS.find((s) => s.id === Number(b.dataset.speed));
    if (B.mode === 'online' && !confirm(`Change the game speed for every player to ${sp.label} (${sp.note})?`)) return;
    const r = await B.setSpeed(sp.id); renderAll();
    if (r && r.ok === false) toast(r.msg, 'bad'); else toast(B.mode === 'online' ? `Admin: everyone now plays at ${sp.note}` : sp.note, 'good');
  });
  document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); setTab(b.dataset.tab); }));
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && UI.modal && UI.modal.t !== 'ob') closeModal(); });
  B.subscribe(() => { renderAll(); if (UI.modal && ['listing', 'wh', 'deliv', 'home', 'lot'].includes(UI.modal.t)) refreshModal(); if (city().over && me() && !shownSeasonEnd) { shownSeasonEnd = true; showSeasonEnd(); } });
  updatePins();
  gate();
  if (hot && hot.tab && me()) setTab(hot.tab);
  setInterval(() => B.tick(), 1000);
  setInterval(liveUpdate, 150);
}
window.claude?.hot?.snapshot?.(() => ({ ...(B && B.snapshot ? B.snapshot() : {}), tab: UI.tab }));
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? null);
