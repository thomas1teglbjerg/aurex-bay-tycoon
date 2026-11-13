// Personal tab: your home, personal account, collections, auction house and dinner parties.
import * as E from '../supabase/functions/_shared/engine.js';
import { HOMES, ROOMS, LIFESTYLES, SALARIES, TAX, LIFE as LC, RARITY, PRESTIGE_TIERS, PRESTIGE_PERKS, COLLECT_CATS, COLLECTIBLES, SETS, DINNER, CARS } from '../supabase/functions/_shared/content.js';
import { city, me, meId, esc, M, P, lineChart, seg, shortDate, msUntilMonth, dur } from './util.js';
import { cropLayer } from './util.js';
import { profilePageHTML } from './profile.js';
import { mortQuote } from './banks.js';
import { carPanel, carTag, garageBoxes, meetHTML, condBar } from './garage.js';

const L = E.LIFE;
const CATS = ['art', 'wine', 'watch', 'car'];
const ROOM_ORDER = ['living', 'art', 'wine', 'watch', 'car'];
export const ROOM_ICON = {
  living: '<path d="M3 11V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"/><path d="M2 17v-4a2 2 0 0 1 4 0v1h12v-1a2 2 0 0 1 4 0v4zM5 17v2M19 17v2"/>',
  art: '<rect x="3" y="4" width="18" height="15" rx="1"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="8.5" r="1.6"/>',
  wine: '<path d="M8 3h8l-.6 6a3.4 3.4 0 0 1-6.8 0z"/><path d="M12 12.4V20M8.5 20.5h7"/>',
  watch: '<circle cx="12" cy="12" r="5.5"/><path d="M12 9.5V12l1.6 1.2M9 6.6 9.8 3h4.4l.8 3.6M9 17.4l.8 3.6h4.4l.8-3.6"/>',
  car: '<path d="M4 16v-3l2-5h12l2 5v3z"/><path d="M4 13h16"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  crown: '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>'
};
export const ricon = (k, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ROOM_ICON[k]}</svg>`;

// money: millions above 1 M, thousands below
export const money = (v, sign) => { const a = Math.abs(v); if (a >= 1) return M(v, sign); if (a < 0.0005) return '$0'; const s = (v < -0.0004 ? '−' : sign && v > 0.0004 ? '+' : '') + '$' + Math.round(a * 1000).toLocaleString('en-US') + 'k'; return s; };
const pct = (now0, was) => (was > 0 ? (now0 / was - 1) * 100 : 0);
const chip = (d) => `<span class="chip ${d >= 0 ? 'good' : 'bad'}">${P(d)}</span>`;

// images. Missing files simply fall through to the next layer.

// Bump HOME_V when home pictures in img/h*-*.jpg are added or replaced: /img (also a 404) is cached as immutable for a week.
export const HOME_V = 2;
export function homeBg(hid, room) {
  const def = L.HOME[hid], own = `url(img/${def.img}-${room === 'living' ? 'living' : room}.jpg?v=${HOME_V})`;
  if (room === 'ext') { const f = cropLayer(def, 3, 1.8); return `background-image:${own}, ${f.img};background-size:cover, ${f.size};background-position:center, ${f.pos}`; }
  const generic = room === 'car' ? 'url(img/ph-car.svg)' : `url(img/h1-${room}.jpg)`;
  return `background-image:${own}, ${generic};background-size:cover;background-position:center`;
}
const CARD_FALLBACK = { art: 'img/h1-art.jpg', wine: 'img/h1-wine.jpg', watch: 'img/h1-watch.jpg', car: 'img/ph-car.svg' };
const hue = (id) => [...id].reduce((a, c) => a + c.charCodeAt(0) * 37, 0) % 360;

// ---------------------------------------------------------------- collector cards
export function cardHTML(cid, o = {}) {
  const c = L.ITEM[cid], r = RARITY[c.rarity], cty = city(), v = o.value ?? L.itemValue(cty, cid);
  const h = cty.life.items[cid].h, d = o.cost ? pct(v, o.cost) : h.length > 2 ? pct(h[h.length - 1], h[Math.max(0, h.length - 13)]) : 0;
  const mono = c.maker.split(' ').map((w) => w[0]).join('').slice(0, 2);
  const tag = o.tag ? `<span class="ctag">${esc(o.tag)}</span>` : '';
  return `<button class="ccard r-${c.rarity.toLowerCase()} ${o.cls || ''}" style="--rc:${r.col}" data-a="${o.a || 'cid'}" ${o.attrs || `data-cid="${cid}"`} aria-label="${esc(c.name)}, ${c.rarity}">
    <span class="cimg" style="${c.pic ? `background-image:linear-gradient(180deg, transparent 60%, rgba(10,8,6,0.6)), url(img/${c.pic}.jpg);background-size:cover;background-position:center, 58% center` : c.img ? `background-image:linear-gradient(180deg, transparent 60%, rgba(10,8,6,0.6)), url(img/x-${cid}.jpg);background-position:center, ${c.img}` : `background-image:linear-gradient(180deg, transparent 55%, rgba(10,8,6,0.75)), ${L.isMade(c) ? '' : `url(img/x-${cid}.jpg), `}linear-gradient(135deg, hsla(${hue(cid)},45%,40%,0.55), rgba(20,14,8,0.4)), url(${CARD_FALLBACK[c.cat]})`}">${c.img || c.pic ? '' : `<span class="mono">${esc(mono)}</span>${ricon(c.cat, 16)}`}<span class="rar">${c.rarity}</span>${tag}${o.cond ? condBar(o.cond) : ''}</span>
    <span class="cbody"><b>${esc(c.name)}</b><span>${esc(c.maker)} · ${c.year}</span><span class="cval"><strong>${money(v)}</strong>${o.noDelta ? '' : `<em class="${d >= 0 ? 'up' : 'down'}">${P(d)}</em>`}</span></span>
    ${c.set ? `<span class="cset" title="${esc(SETS[c.set].name)}">Set</span>` : ''}</button>`;
}
const emptySlot = (txt) => `<div class="ccard empty"><span>${esc(txt)}</span></div>`;

// ---------------------------------------------------------------- tab
export function lifeHTML(UI) {
  const c = city(), p = me(); if (!c.life || !p.life) return '<p class="empty">Loading…</p>';
  const st = UI.life;
  if (st.room) return roomHTML(UI);
  const Lp = p.life, res = Lp.homes.find((h) => h.uid === Lp.res);
  const view = st.view || 'home';
  const nav = `<div class="lnav">${[['home', 'Home'], ['collection', 'Collection'], ['property', 'Property'], ['profile', 'Profile']].map(([v, l]) => `<button data-a="lifeView" data-v="${v}" aria-pressed="${view === v}">${l}</button>`).join('')}<button class="webnav" data-a="web" data-u="aurexauctions.ab">${WEB_ICON} Shop online${myBids(c).length ? `<i>${myBids(c).length}</i>` : ''}</button></div>`;
  if (view === 'profile') return `<div class="lifep lprof">${nav}</div>${profilePageHTML(UI, meId())}`;
  const body = view === 'collection' ? collectionView(UI) : view === 'property' ? propertyView(UI) : homeView(UI, res);
  return `<div class="lifep">${heroHTML(res)}${nav}${inboxHTML()}${body}</div>`;
}
const WEB_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z"/></svg>';
const DEALER_SITE = { art: ['kestrelvey.gallery', 'Kestrel & Vey Gallery'], wine: ['cellardoor.wine', 'Cellar Door wine merchants'], watch: ['hourandhand.ab', 'Hour & Hand watches'], car: ['coastlineclassics.ab', 'Coastline Classics'] };
const myBids = (c) => c.life.lots.filter((l) => l.bids[meId()] != null);
export const bidBase = (l) => Math.max(l.est, (l.high || 0) * 1.05, (l.bids[meId()] || 0) * 1.05);
export function standing(l) {
  const c = city(), mine = l.bids[meId()];
  if (!l.high) return mine != null ? '<span class="chip good">You lead</span>' : '<span class="muted">No bids yet</span>';
  const who = c.players[l.hb];
  if (mine != null && mine > l.high) return `<span class="chip good">You lead · rivals at ${money(l.high)}</span>`;
  return `<span class="chip ${mine != null ? 'bad' : 'info'}">${mine != null ? 'Outbid · ' : ''}Highest ${money(l.high)}${who ? ` · ${esc(who.name.split(' ')[0])}` : ''}</span>`;
}

function heroHTML(res) {
  const c = city(), p = me(), pr = L.prestige(c, p);
  if (!res) {
    return `<section class="lhero" style="${homeBg('H1', 'ext')}"><div class="lh-in"><span class="cap">Your life in Aurex Bay</span><h1>Find a home</h1>
      <p>Your companies make money. Your home and collections are where you keep it. Buy a place, then start collecting art, wine, watches and cars.</p>
      <div class="lh-chips"><span class="chip dark">${ricon('crown', 15)} ${esc(pr.name)} · ${pr.score}</span><button class="chip dark" data-a="web" data-u="harbortrust.ab">Bank ${money(p.life.wallet)} ›</button></div></div></section>`;
  }
  const def = L.HOME[res.hid], v = L.homeValue(c, res), d = pct(v, res.paid + 0);
  const others = p.life.homes.filter((h) => h !== res);
  return `<section class="lhero" style="${homeBg(res.hid, 'ext')}"><div class="lh-in"><span class="cap">Your home · ${esc(def.district)}</span><h1>${esc(def.name)}</h1>
    <p>Worth <b>${money(v)}</b> ${chip(d)} <span class="muted">since you bought it</span></p>
    <div class="lh-chips"><button class="chip dark" data-a="lifeView" data-v="home">${ricon('crown', 15)} ${esc(pr.name)} · ${pr.score}</button><button class="chip dark" data-a="web" data-u="harbortrust.ab">Bank ${money(p.life.wallet)} ›</button>${others.length ? `<button class="chip dark" data-a="lifeView" data-v="property">${ricon('key', 15)} +${others.length} more</button>` : ''}</div></div></section>`;
}

function inboxHTML() {
  const c = city(), p = me(), items = [];
  if (p.life.offer && p.life.offer.until >= c.m) { const o = p.life.offer, it = L.ITEM[o.cid]; items.push(`<div class="lnote">${ricon('key', 18)}<div class="grow"><b>Private offer: ${esc(it.name)}</b><span>${money(o.price)} · market ${money(L.itemValue(c, o.cid))} · until ${shortDate(o.until)}</span></div><button class="btn sm gold" data-a="lifeOffer">Buy</button></div>`); }
  c.life.trades.filter((t) => t.status === 'open' && t.to === meId()).forEach((t) => {
    const from = c.players[t.from], give = t.give.map((u) => (from.life.items.find((i) => i.uid === u) || {}).cid).filter(Boolean), get = t.get.map((u) => (p.life.items.find((i) => i.uid === u) || {}).cid).filter(Boolean);
    items.push(`<div class="lnote">${ricon('crown', 18)}<div class="grow"><b>${esc(from.name)} proposes a trade</b><span>You get ${give.map((x) => esc(L.ITEM[x].name)).join(', ') || 'nothing'}${t.cash > 0 ? ` + ${money(t.cash)}` : ''}. You give ${get.map((x) => esc(L.ITEM[x].name)).join(', ') || 'nothing'}${t.cash < 0 ? ` + ${money(-t.cash)}` : ''}.</span></div><button class="btn sm gold" data-a="tradeAccept" data-id="${t.id}">Accept</button><button class="btn sm" data-a="tradeDecline" data-id="${t.id}">No</button></div>`);
  });
  c.life.trades.filter((t) => t.status === 'open' && t.from === meId()).forEach((t) => items.push(`<div class="lnote">${ricon('crown', 18)}<div class="grow"><b>Waiting for ${esc(c.players[t.to].name)}</b><span>Your trade proposal expires after 3 months.</span></div><button class="btn sm" data-a="tradeDecline" data-id="${t.id}">Withdraw</button></div>`));
  return items.length ? `<div class="lnotes">${items.join('')}</div>` : '';
}

// a home can give a room its own name (a studio keeps its art in a basement storage unit)
const rname = (hid, room) => (hid && L.HOME[hid].names && L.HOME[hid].names[room] ? L.HOME[hid].names[room][0] : ROOMS[room].name);
const rinstall = (hid, room) => (hid && L.HOME[hid].names && L.HOME[hid].names[room] ? L.HOME[hid].names[room][1] : ROOMS[room].install);
// ---------------------------------------------------------------- home: rooms and wealth
function roomStatus(p, room) {
  if (room === 'living') return { open: true, text: 'Finances · lifestyle · dinners' };
  const homes = p.life.homes.filter((h) => !h.rented), cap = L.capacity(p, room), used = L.used(p, room);
  if (L.street(p, room)) return { open: true, street: true, text: `${used} / ${cap} street parking`, used, cap };
  if (cap > 0) return { open: true, text: `${used} / ${cap} ${ROOMS[room].unit}`, used, cap };
  if (homes.some((h) => L.roomLevel(h, room) === 0)) return { open: false, install: true, text: `Not installed · ${rinstall((homes.find((h) => L.roomLevel(h, room) === 0) || {}).hid, room)}` };
  const res = p.life.homes.find((h) => h.uid === p.life.res);
  return { open: false, text: res ? (room === 'car' ? L.HOME[res.hid].noCar || 'No garage here' : L.HOME[res.hid].noWine || 'No space here') : 'Buy a home first' };
}
function homeView(UI, res) {
  const c = city(), p = me();
  if (!res) return noHomeView();
  const tiles = ROOM_ORDER.map((room) => {
    const s = roomStatus(p, room), v = room === 'living' ? null : L.collectionValue(c, p, room);
    return `<button class="rtile ${s.open ? '' : 'locked'} ${room === 'living' ? 'wide' : ''}" data-a="lifeRoom" data-v="${room}" style="${homeBg(res.hid, s.street ? 'ext' : room)}">
      <span class="rt-in"><span class="rt-ic">${ricon(s.open || s.install ? room : 'lock', 20)}</span><b>${s.street ? 'Street parking' : esc(rname(res.hid, room))}</b><span>${esc(s.text)}</span>${v ? `<strong>${money(v)}</strong>` : ''}</span></button>`;
  }).join('');
  return `<div class="rtiles">${tiles}</div>${moneyBox(true)}${wealthHTML()}${prestigeHTML()}`;
}
function noHomeView() {
  const p = me();
  const s = roomStatus(p, 'car'), car = `<div class="rtiles"><button class="rtile wide" data-a="lifeRoom" data-v="car" style="${homeBg('H1', 'ext')}"><span class="rt-in"><span class="rt-ic">${ricon('car', 20)}</span><b>Street parking</b><span>${esc(s.text)}</span>${L.used(p, 'car') ? `<strong>${money(L.collectionValue(city(), p, 'car'))}</strong>` : ''}</span></button></div>`;
  return `${moneyBox(true)}${car}<section class="box"><h2>Homes for sale <small>${HOMES.length} buildings</small></h2><div class="in"><div class="hgrid">${HOMES.map(homeCardSmall).join('')}</div></div></section>${prestigeHTML()}`;
}
function wealthHTML() {
  const c = city(), p = me(), Lp = p.life, eq = L.equity(c, p), coll = L.collectionValue(c, p), nw = Lp.wallet + (Lp.savings || 0) + eq + coll;
  const h = Lp.hist.slice(-36);
  const chart = h.length > 1 ? lineChart([{ v: h.map((x) => x[1] + x[2] + x[3]), c: '#d9ad45', w: 2.5, fill: true }, { v: h.map((x) => x[2]), c: '#7fb3e6' }, { v: h.map((x) => x[3]), c: '#c792ea' }], h.map((x) => shortDate(x[0])), { fmt: (v) => v.toFixed(1), label: 'Personal wealth over time', h: 180 }) : '<p class="empty">Your wealth chart starts at the end of this month.</p>';
  return `<section class="box"><h2>Personal wealth <small>Not your empire</small></h2><div class="in">
    <div class="kpis sm"><div class="stat"><small>Total</small><b>${money(nw)}</b></div><div class="stat"><small>Bank accounts</small><b>${money(Lp.wallet + (Lp.savings || 0))}</b></div><div class="stat"><small>Home equity</small><b>${money(eq)}</b></div><div class="stat"><small>Collections</small><b>${money(coll)}</b></div></div>
    ${chart}<div class="legend"><span><i style="background:#d9ad45"></i>Total</span><span><i style="background:#7fb3e6"></i>Home equity</span><span><i style="background:#c792ea"></i>Collections</span></div></div></section>`;
}
function prestigeHTML() {
  const c = city(), p = me(), pr = L.prestige(c, p), lo = PRESTIGE_TIERS[pr.tier].min, w = pr.next ? Math.min(100, (pr.score - lo) / (pr.next - lo) * 100) : 100;
  const parts = [['Home', pr.parts.home], ['Collection', pr.parts.items], ['Sets', pr.parts.sets], ['Lifestyle', pr.parts.lifestyle], ['Legacy', pr.parts.legacy]];
  return `<section class="box"><h2>Prestige <small>${esc(pr.name)}</small></h2><div class="in">
    <div class="prest"><span class="pr-ic">${ricon('crown', 26)}</span><div class="grow"><b>${pr.score} points</b><div class="bar"><i style="width:${w.toFixed(0)}%"></i></div><span class="muted">${pr.next ? `${pr.next - pr.score} to ${esc(pr.nextName)}` : 'Top tier'}</span></div></div>
    <div class="chips">${parts.map(([k, v]) => `<span class="chip">${k} ${v}</span>`).join('')}</div>
    <div class="perks">${PRESTIGE_PERKS.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
    <p class="empty">Right now: luxury companies +${pr.tier * 2}% demand, bank rate −${(pr.tier * 0.5).toFixed(1)} pp, new clients +${pr.tier * 2} mood, +${pr.tier} Influence a year.</p></div></section>`;
}

// ---------------------------------------------------------------- rooms
function roomHTML(UI) {
  const c = city(), p = me(), room = UI.life.room, res = p.life.homes.find((h) => h.uid === p.life.res) || p.life.homes[0];
  const hid = res ? res.hid : 'H1', s = roomStatus(p, room), R = ROOMS[room];
  const head = `<section class="rhead ${s.open ? '' : 'locked'}" style="${homeBg(hid, s.street ? 'ext' : room)}"><button class="chip dark back" data-a="lifeBack">‹ ${res ? esc(L.HOME[res.hid].name) : 'Life'}</button>
    <div class="rh-in"><span class="cap">${esc(R.short)}</span><h1>${s.street ? 'Street parking' : esc(rname(res && hid, room))}</h1><p>${s.street ? `No garage yet, so ${CARS.street === 1 ? "one car parks" : CARS.street + " cars park"} on the street outside. A home with a garage holds more.` : esc(R.blurb)}</p>${s.cap ? `<div class="rcap"><div class="bar"><i style="width:${Math.min(100, s.used / s.cap * 100)}%"></i></div><span>${esc(s.text)}</span></div>` : `<span class="chip dark">${esc(s.text)}</span>`}</div></section>`;
  if (room === 'living') return `<div class="lifep">${head}${livingHTML()}</div>`;
  const installs = p.life.homes.filter((h) => L.HOME[h.hid].rooms[room] && L.roomCost(h, room) != null).map((h) => {
    const lv = L.roomLevel(h, room), d = L.HOME[h.hid].rooms[room], cost = L.roomCost(h, room);
    return `<div class="row"><div class="grow"><b>${lv === 0 ? esc(rinstall(h.hid, room)) : `Expand the ${rname(h.hid, room).toLowerCase()}`}</b><span>${esc(L.HOME[h.hid].name)} · ${lv === 0 ? `room for ${d.cap}` : `from ${d.cap} to ${d.cap * 2}`} ${R.unit} · adds value to the home</span></div><button class="btn sm gold" data-a="homeRoom" data-uid="${h.uid}" data-room="${room}">${money(cost)}</button></div>`;
  }).join('');
  const mine = p.life.items.filter((i) => L.ITEM[i.cid].cat === room), sets = L.completeSets(p);
  const cards = mine.map((i) => cardHTML(i.cid, { a: 'item', attrs: `data-uid="${i.uid}"`, value: L.instValue(c, p, i, sets), cost: i.cost, tag: room === 'car' ? carTag(p, i) || (s.street && !i.lent ? 'On the street' : '') : i.lot ? 'At auction' : i.lent ? 'At the museum' : '', cond: room === 'car' ? i : null })).join('');
  const free = s.cap ? Math.max(0, s.cap - L.used(p, room)) : 0, empties = free ? emptySlot(s.street ? 'Free street spot' : `${free} free ${R.unit}`) : '';
  const val = L.collectionValue(c, p, room), cost = mine.reduce((a, i) => a + (i.cost || 0), 0);
  const ix = c.life.ixh[room], ixd = ix.length > 12 ? pct(ix[ix.length - 1], ix[ix.length - 13]) : pct(ix[ix.length - 1], ix[0]);
  const setRows = Object.entries(SETS).filter(([k]) => COLLECTIBLES.some((x) => x.set === k && x.cat === room)).map(([k, st]) => {
    const all = COLLECTIBLES.filter((x) => x.set === k), have = all.filter((x) => p.life.items.some((i) => i.cid === x.id)).length;
    return `<div class="row"><div class="grow"><b>${esc(st.name)}</b><span>${all.map((x) => esc(x.name)).join(' · ')}</span></div><span class="chip ${have === all.length ? 'good' : ''}">${have}/${all.length} · +${Math.round(st.bonus * 100)}% value</span></div>`;
  }).join('');
  const shop = c.life.dealer.filter((cid) => L.ITEM[cid].cat === room).map((cid) => cardHTML(cid, { a: 'web', attrs: `data-u="${DEALER_SITE[room][0]}/item/${cid}"`, tag: 'Dealer', noDelta: true, value: L.itemValue(c, cid) * LC.dealerMarkup })).join('');
  const lots = c.life.lots.filter((l) => L.ITEM[l.cid].cat === room).map((l) => cardHTML(l.cid, { a: 'web', attrs: `data-u="aurexauctions.ab/lot/${l.id}"`, tag: l.bids[meId()] != null ? 'Your bid' : 'Auction', noDelta: true, value: l.est })).join('');
  return `<div class="lifep">${head}
    <div class="kpis sm"><div class="stat"><small>Value</small><b>${money(val)}</b></div><div class="stat"><small>Paid</small><b>${money(cost)}</b></div><div class="stat"><small>Gain</small><b class="${val - cost >= 0 ? 'up' : 'down'}">${money(val - cost, true)}</b></div><div class="stat"><small>${esc(COLLECT_CATS[room].name)} market, 12 mo</small><b class="${ixd >= 0 ? 'up' : 'down'}">${P(ixd)}</b></div></div>
    ${installs ? `<section class="box"><h2>Build</h2><div class="in"><div class="rows">${installs}</div></div></section>` : ''}
    <div class="cgrid">${cards}${empties}${!cards && !s.cap ? `<p class="empty">${esc(s.text)}.</p>` : ''}</div>
    ${room === 'car' && s.cap ? garageBoxes() : ''}
    ${setRows ? `<section class="box"><h2>Sets <small>Complete a set for bonus value and prestige</small></h2><div class="in"><div class="rows">${setRows}</div></div></section>` : ''}
    <section class="box"><h2>Buy ${esc(COLLECT_CATS[room].name.toLowerCase())}</h2><div class="in">${shop || lots ? `<div class="cstrip">${lots}${shop}</div>` : ''}<div class="chips"><button class="btn sm gold" data-a="web" data-u="${DEALER_SITE[room][0]}">${WEB_ICON} ${esc(DEALER_SITE[room][1])}</button><button class="btn sm" data-a="web" data-u="aurexauctions.ab">${WEB_ICON} Aurex &amp; Co. auctions</button></div></div></section>
    <section class="box"><h2>${esc(COLLECT_CATS[room].name)} market index</h2><div class="in">${lineChart([{ v: ix.slice(-48), c: '#d9ad45', fill: true }], ix.slice(-48).map((_, i, a) => shortDate(c.m - a.length + 1 + i)), { fmt: (v) => (v * 100).toFixed(0), label: 'Market index', h: 150 })}<p class="empty">100 = the start of the season. Booms lift collectibles, crises hit them${room === 'wine' ? '. Wine also ages: each case has a peak year' : ''}.</p></div></section></div>`;
}

function livingHTML() {
  const c = city(), p = me(), Lp = p.life, b = Lp.last;
  const est = E.LIFE.monthly(c, p);
  const line = (k, v, cls) => `<div class="lrow"><span>${k}</span><b class="${cls || ''}">${money(v, true)}</b></div>`;
  const breakdown = [
    ['Salary after tax', est.salaryNet], ['Rent from tenants', est.rent], ['Museum loan fees', est.lend],
    ['Building charges', -est.charges], ['Property tax', -est.propTax], ['Maintenance', -est.upkeep], ['Mortgage interest', -est.interest], ['Mortgage repayment', -est.principal],
    ['Living costs', -est.lifestyle], ['Insurance and upkeep of collections', -est.care], ['Overdraft interest', -est.overdraft]
  ].filter(([, v]) => Math.abs(v) > 0.00005);
  const homes = Lp.homes.map((h) => homeRow(h)).join('');
  return `${moneyBox(false)}
    <section class="box"><h2>Dinner party <small>Once a month</small></h2><div class="in"><p class="empty">Open a case from your cellar and invite people who matter. Clients get happier, bankers lower your rate, or collectors offer you a piece below market.</p>
      <button class="btn gold" data-a="dinnerOpen" ${p.life.dinnerM === c.m ? 'disabled' : ''}>${p.life.dinnerM === c.m ? 'Hosted this month' : 'Host a dinner'}</button></div></section>
    <section class="box"><h2>Your homes</h2><div class="in"><div class="rows">${homes}</div><button class="btn" data-a="lifeView" data-v="property">Browse property</button></div></section>`;
}
// your personal account lives at Harbor Trust online banking; home only shows a card that opens it
function moneyBox(compact) {
  const c = city(), p = me(), Lp = p.life, est = L.monthly(c, p), st = LIFESTYLES.find((x) => x.id === Lp.style) || LIFESTYLES[0];
  return `<button class="bankcard" data-a="web" data-u="harbortrust.ab"><span class="bc-top"><b>Harbor Trust</b><span>Private banking</span></span><span class="bc-bal"><small>Current account</small><strong>${money(Lp.wallet)}</strong></span>
    <span class="bc-row"><span>${Lp.savings ? `Savings ${money(Lp.savings)} · ` : ''}${money(est.net, true)} a month</span><span>Open online banking ›</span></span></button>
    ${compact ? '' : `<section class="box"><h2>Lifestyle <small>${money(st.cost)}/yr</small></h2><div class="in"><div class="seg wrap" role="group">${LIFESTYLES.map((x) => `<button data-a="lifeStyle" data-v="${x.id}" aria-pressed="${Lp.style === x.id}">${x.name} · ${money(x.cost)}/yr</button>`).join('')}</div><span class="muted small">${esc(st.note)} Prestige +${st.prestige}.</span></div></section>`}`;
}
function homeRow(h) {
  const c = city(), p = me(), def = L.HOME[h.hid], v = L.homeValue(c, h), isRes = h.uid === p.life.res;
  return `<div class="hrow"><span class="hthumb" style="${homeBg(h.hid, 'ext')}"></span><div class="grow"><b>${esc(def.name)}</b><span>${isRes ? 'You live here' : h.rented ? `Rented out · ${money(v * LC.rentYield)}/yr` : 'Empty'} · worth ${money(v)} ${chip(pct(v, h.paid))}</span><span>Mortgage ${h.bal > 0.0001 ? money(h.bal) : 'paid off'} · equity ${money(v - h.bal)}</span>
    <div class="chips">${!isRes ? `<button class="btn sm" data-a="homeMove" data-uid="${h.uid}">Move in</button><button class="btn sm" data-a="homeRent" data-uid="${h.uid}">${h.rented ? 'End lease' : 'Rent out'}</button>` : ''}${h.bal > 0.0001 ? `<button class="btn sm" data-a="homeRepay" data-uid="${h.uid}" data-v="0.5">Repay ${money(Math.min(0.5, h.bal))}</button>` : ''}<button class="btn sm danger" data-a="homeSell" data-uid="${h.uid}">Sell · ${money(v * (1 - LC.sellFee) - h.bal)}</button></div></div></div>`;
}

// ---------------------------------------------------------------- collection, auction, property
function collectionView() {
  const c = city(), p = me(), sets = L.completeSets(p);
  const groups = CATS.map((cat) => {
    const its = p.life.items.filter((i) => L.ITEM[i.cid].cat === cat); const s = roomStatus(p, cat);
    return `<section class="cgroup"><button class="cg-h" data-a="lifeRoom" data-v="${cat}">${ricon(cat, 18)}<b>${esc(ROOMS[cat].name)}</b><span>${esc(s.text)} · ${money(L.collectionValue(c, p, cat))}</span><em>Open ›</em></button>
      ${its.length ? `<div class="cstrip">${its.map((i) => cardHTML(i.cid, { a: 'item', attrs: `data-uid="${i.uid}"`, value: L.instValue(c, p, i, sets), cost: i.cost, tag: i.lot ? 'At auction' : i.lent ? 'Museum' : '' })).join('')}</div>` : `<p class="empty">${s.open ? 'Nothing here yet. Visit the auction house or the dealer.' : esc(s.text) + '.'}</p>`}</section>`;
  }).join('');
  const others = Object.values(c.players).filter((x) => x.id !== meId() && !x.admin && x.life && x.life.items.length).sort((a, b) => L.collectionValue(c, b) - L.collectionValue(c, a));
  return `${groups}<section class="box"><h2>Other collectors <small>Trade or admire</small></h2><div class="in"><div class="rows">${others.map((o) => `<button class="crow" data-a="tradeOpen" data-to="${o.id}"><span class="av" style="${o.avatar ? `background-image:url(${o.avatar})` : `background:${o.color}`};--avc:${o.color}"></span><div class="grow"><b>${esc(o.name)}</b><span>${o.life.items.length} pieces · ${esc(L.prestige(c, o).name)}</span></div><div class="right"><b>${money(L.collectionValue(c, o))}</b><span>Propose trade ›</span></div></button>`).join('')}</div></div></section>`;
}
function auctionView() {
  const c = city(), p = me(), t = L.prestige(c, p).tier;
  const lots = c.life.lots.slice().sort((a, b) => a.endM - b.endM).map((l) => {
    const it = L.ITEM[l.cid], mine = l.bids[meId()], seller = l.seller ? c.players[l.seller] : null, locked = t < l.tier;
    return `<div class="lot">${cardHTML(l.cid, { a: 'lot', attrs: `data-lot="${l.id}"`, noDelta: true, value: l.est, cls: 'sm' })}<div class="grow"><b>${esc(it.name)}</b><span>${esc(it.maker)} · ${it.rarity}${seller ? ` · from ${esc(seller.id === meId() ? 'you' : seller.name)}` : ''}</span><span>Estimate ${money(l.est)} · reserve ${money(l.est * LC.reserve)}</span>${standing(l)}<span class="muted">Hammer in ${dur(msUntilMonth(l.endM))}</span>
      ${locked ? `<span class="chip warn">${esc(PRESTIGE_TIERS[l.tier].name)} collectors only</span>` : l.seller === meId() ? '<span class="chip info">Your lot</span>' : `<div class="chips">${mine != null ? `<span class="chip good">Your max ${money(mine)}</span><button class="btn sm" data-a="bidCancel" data-lot="${l.id}">Withdraw</button>` : ''}${[1, 1.15, 1.35].map((k) => { const v = bidBase(l) * k; return `<button class="btn sm ${k === 1.15 ? 'gold' : ''}" data-a="bid" data-lot="${l.id}" data-v="${v.toFixed(4)}">Bid ${money(v)}</button>`; }).join('')}</div>`}</div></div>`;
  }).join('');
  const dealer = c.life.dealer.map((cid) => cardHTML(cid, { tag: 'Buy now', noDelta: true, value: L.itemValue(c, cid) * LC.dealerMarkup })).join('');
  return `<section class="box"><h2>Aurex Bay Auction House <small>Closes monthly</small></h2><div class="in"><p class="empty">Bid your maximum. You pay just above the next highest bid, plus a ${Math.round(LC.auctionPremium * 100)}% buyer's premium. Keep the money in your wallet and a free spot at home when the hammer falls.</p><div class="lots">${lots || '<p class="empty">No lots right now.</p>'}</div></div></section>
    <section class="box"><h2>Dealer <small>Buy now at +${Math.round((LC.dealerMarkup - 1) * 100)}%</small></h2><div class="in"><div class="cstrip">${dealer || '<p class="empty">The dealer restocks every quarter.</p>'}</div></div></section>`;
}
function homeCardSmall(def) {
  const c = city(), price = def.price * c.life.homes[def.id].ix, left = L.unitsLeft(c, def.id), h = c.life.homes[def.id].h, d = h.length > 12 ? pct(h[h.length - 1], h[h.length - 13]) : pct(h[h.length - 1], h[0]);
  const rooms = CATS.map((k) => { const r = def.rooms[k]; return `<span class="ri ${r ? (r.add ? 'opt' : 'yes') : 'no'}" title="${esc(ROOMS[k].name)}: ${r ? (r.add ? 'can be installed' : `${r.cap} ${ROOMS[k].unit}`) : 'not possible'}">${ricon(k, 15)}</span>`; }).join('');
  return `<button class="hcard" data-a="homeOpen" data-hid="${def.id}"><span class="hc-img" style="${homeBg(def.id, 'ext')}"><span class="chip dark">${left > 0 ? `${left} of ${def.units} left` : 'Sold out'}</span></span><span class="hc-b"><b>${esc(def.name)}</b><span>${esc(def.district)} · ${chip(d)} 12 mo</span><span class="rooms">${rooms}</span><strong>${money(price)}</strong></span></button>`;
}
function propertyView() {
  const p = me();
  return `${p.life.homes.length ? `<section class="box"><h2>Your homes</h2><div class="in"><div class="rows">${p.life.homes.map(homeRow).join('')}</div></div></section>` : moneyBox(true)}
    <section class="box"><h2>Homes for sale <small>Prices follow the district</small></h2><div class="in"><div class="hgrid">${HOMES.map(homeCardSmall).join('')}</div>
    <p class="empty">Homes are investments: values move with the district and the economy. You pay building charges, property tax and maintenance. Rent out homes you do not live in.</p></div></section>`;
}

// ---------------------------------------------------------------- modals
export function lifeModal(st, UI) {
  const c = city(), p = me(); if (!c.life || !p) return '';
  if (st.t === 'home') return homeModal(st);
  if (st.t === 'item') return itemModal(st);
  if (st.t === 'cid') return cidModal(st);
  if (st.t === 'lot') return lotModal(st);
  if (st.t === 'trade') return tradeModal(st);
  if (st.t === 'dinner') return dinnerHTML(st);
  if (st.t === 'meet') return meetHTML(st, cardHTML);
  return '';
}
function homeModal(st) {
  const c = city(), p = me(), def = L.HOME[st.hid], price = def.price * c.life.homes[def.id].ix, left = L.unitsLeft(c, def.id), down = st.down || 0.2;
  const loan = price * (1 - down), mq = mortQuote(c, p, loan), r = mq.rate / 100 / 12, n = LC.mortgageYears * 12, pay = loan > 0 ? loan * r / (1 - Math.pow(1 + r, -n)) : 0;
  const yearly = def.charges + price * (LC.propTax + LC.upkeep), need = price * down + price * LC.closing, owned = p.life.homes.filter((h) => h.hid === def.id).length;
  const rooms = CATS.map((k) => { const x = def.rooms[k]; return `<div class="row"><span class="rt-ic sm">${ricon(x ? k : 'lock', 18)}</span><div class="grow"><b>${esc(ROOMS[k].name)}</b><span>${x ? (x.add ? `Can be installed for ${money(x.add)} · ${x.cap} ${ROOMS[k].unit}` : `Included · ${x.cap} ${ROOMS[k].unit}`) : esc(k === 'car' ? def.noCar || 'Not possible here' : def.noWine || 'Not possible here')}</span></div></div>`; }).join('');
  const hh = c.life.homes[def.id].h.slice(-36);
  return `<article class="sheet lifep"><header class="whead" style="${homeBg(def.id, 'ext')}"><div><span class="chip">${esc(def.district)}</span><h2>${esc(def.name)}</h2><p>${money(price)} · ${left} of ${def.units} units left</p></div></header>
    <p>${esc(def.desc)}</p>
    <div class="kpis sm"><div class="stat"><small>Price</small><b>${money(price)}</b></div><div class="stat"><small>Running costs</small><b>${money(yearly)}</b><span class="sub">per year</span></div><div class="stat"><small>Rent if let</small><b>${money(price * LC.rentYield)}</b><span class="sub">per year</span></div><div class="stat"><small>Prestige</small><b>+${def.prestige}</b></div></div>
    ${lineChart([{ v: hh, c: '#d9ad45', fill: true }], hh.map((_, i) => shortDate(c.m - hh.length + 1 + i)), { fmt: (v) => v.toFixed(1), label: 'Price history', h: 140 })}
    <div class="rows">${rooms}</div>
    ${left > 0 ? `<div><span class="cap">Down payment</span>${seg('homeDown', `data-hid="${def.id}"`, [[0.2, '20%'], [0.5, '50%'], [1, 'Cash']], down)}</div>
    <div class="ledger"><div class="lrow"><span>From your account now</span><b>${money(need)}</b></div><div class="lrow"><span>Mortgage${mq.name ? ` from ${esc(mq.name)}` : ''} at ${mq.rate.toFixed(2)}%</span><b>${money(loan)}</b></div><div class="lrow"><span>Mortgage payment</span><b>${money(pay * 12)}/yr</b></div></div>
    <button class="btn gold" data-a="homeBuy" data-hid="${def.id}" data-v="${down}" ${p.life.wallet < need ? 'disabled' : ''}>Buy · ${money(need)} now</button>
    ${p.life.wallet < need ? `<p class="empty">Your account has ${money(p.life.wallet)}. Take a dividend from your empire at Harbor Trust first.</p>` : ''}` : '<p class="empty">Every unit in this building is taken. Check back when an owner sells.</p>'}
    ${owned ? `<p class="empty">You own ${owned} here.</p>` : ''}</article>`;
}
function itemInfo(cid) {
  const c = city(), it = L.ITEM[cid], owned = L.ownedCount(c, cid), w = L.wineWindow(it, c.m / 12);
  const h = c.life.items[cid].h;
  return `<div class="cbig">${cardHTML(cid, { cls: 'lg', noDelta: true })}</div>
    <div class="chips"><span class="chip" style="border-color:${RARITY[it.rarity].col}">${it.rarity}</span><span class="chip">${esc(it.medium)}</span><span class="chip">${it.ed === 1 ? 'One of a kind' : `${owned} of ${it.ed} in the city`}</span>${w ? `<span class="chip ${/peak now/.test(w) ? 'good' : /Past/.test(w) ? 'bad' : 'info'}">${esc(w)}</span>` : ''}${it.set ? `<span class="chip warn">${esc(SETS[it.set].name)}</span>` : ''}</div>
    ${lineChart([{ v: h, c: RARITY[it.rarity].col, fill: true, w: 2.5 }], h.map((_, i) => shortDate(c.m - h.length + 1 + i)), { fmt: (v) => money(v), label: 'Value history', h: 140 })}`;
}
function itemModal(st) {
  const c = city(), p = me(), i = p.life.items.find((x) => x.uid === st.uid); if (!i) return '<article class="sheet lifep"><p>This piece is no longer yours.</p></article>';
  const it = L.ITEM[i.cid], v = L.instValue(c, p, i), others = Object.values(c.players).filter((x) => x.id !== meId() && !x.admin);
  const busy = !!i.lot, isCar = it.cat === 'car', away = !!(i.shop || i.loan || (isCar && i.lent));
  return `<article class="sheet lifep"><span class="cap">${esc(ROOMS[it.cat].name)} · ${esc(it.maker)}</span><h2>${esc(it.name)}</h2>${itemInfo(i.cid)}${isCar ? carPanel(st, i) : ''}
    <div class="kpis sm"><div class="stat"><small>Value now</small><b>${money(v)}</b></div><div class="stat"><small>You paid</small><b>${i.cost ? money(i.cost) : 'Gift'}</b></div><div class="stat"><small>Gain</small><b class="${v - (i.cost || 0) >= 0 ? 'up' : 'down'}">${money(v - (i.cost || 0), true)}</b></div><div class="stat"><small>${esc(COLLECT_CATS[it.cat].careName || 'Storage')}</small><b>${money(v * COLLECT_CATS[it.cat].care * (L.isDaily(p, i) ? CARS.daily.care : 1))}</b><span class="sub">per year</span></div></div>
    ${isCar && (st.shop || st.lend) ? '' : isCar && away ? (i.lent && !i.loan ? `<button class="btn" data-a="itemLend" data-uid="${i.uid}">Bring it home from the museum</button>` : '') : busy ? `<div class="lnote">At auction this month.<button class="btn sm" data-a="itemWithdraw" data-uid="${i.uid}">Withdraw</button></div>` : `
    <div class="acts">
      <button class="btn" data-a="itemSell" data-uid="${i.uid}" data-v="dealer">Sell to dealer · ${money(v * LC.dealerBuyback)}</button>
      <button class="btn gold" data-a="itemSell" data-uid="${i.uid}" data-v="auction">Put up for auction · est. ${money(v)}</button>
      ${it.cat === 'art' ? `<button class="btn" data-a="itemLend" data-uid="${i.uid}">${i.lent ? 'Bring home from the museum' : `Lend to the museum · ${money(v * LC.lendFee)}/yr`}</button>` : ''}
      ${it.cat === 'wine' ? '<button class="btn" data-a="dinnerOpen">Serve it at a dinner</button>' : ''}
      <button class="btn" data-a="tradeOpen" data-give="${i.uid}">Trade</button>
    </div>
    <div class="giftrow"><select id="gift-to" aria-label="Give to">${others.map((o) => `<option value="${o.id}">${esc(o.name)}${p.net.includes(o.id) ? ' · network' : ''}</option>`).join('')}</select><button class="btn" data-a="itemGift" data-uid="${i.uid}">Give away</button></div>
    ${st.confirm ? `<button class="btn danger" data-a="itemDonate" data-uid="${i.uid}" data-v="yes">Yes, donate it to the museum for good</button>` : `<button class="btn danger" data-a="itemDonate" data-uid="${i.uid}">Donate to the museum · ${money(v * TAX.donationCredit)} tax credit</button>`}`}</article>`;
}
function cidModal(st) {
  const c = city(), p = me(), it = L.ITEM[st.cid], price = L.itemValue(c, st.cid) * LC.dealerMarkup, atDealer = c.life.dealer.includes(st.cid);
  const owner = Object.values(c.players).find((x) => x.life && x.life.items.some((i) => i.cid === st.cid));
  return `<article class="sheet lifep"><span class="cap">${esc(ROOMS[it.cat].name)} · ${esc(it.maker)}</span><h2>${esc(it.name)}</h2>${itemInfo(st.cid)}
    <div class="kpis sm"><div class="stat"><small>Market value</small><b>${money(L.itemValue(c, st.cid))}</b></div>${atDealer ? `<div class="stat"><small>Dealer price</small><b>${money(price)}</b></div>` : ''}</div>
    ${atDealer ? `<button class="btn gold" data-a="itemBuy" data-cid="${st.cid}" ${p.life.wallet < price ? 'disabled' : ''}>Buy now · ${money(price)}</button>${L.roomFree(p, it.cat) < 1 ? `<p class="empty">You need a free spot in a ${esc(ROOMS[it.cat].name.toLowerCase())} first.</p>` : ''}` : owner && owner.id !== meId() ? `<button class="btn" data-a="tradeOpen" data-to="${owner.id}">Owned by ${esc(owner.name)} · propose a trade</button>` : ''}</article>`;
}
function lotModal(st) {
  const c = city(), p = me(), l = c.life.lots.find((x) => x.id === st.lot); if (!l) return '<article class="sheet lifep"><p>The hammer has fallen on this lot.</p></article>';
  const it = L.ITEM[l.cid], t = L.prestige(c, p).tier, amt = st.amt || bidBase(l) * 1.1;
  return `<article class="sheet lifep"><span class="cap">Auction · hammer in ${dur(msUntilMonth(l.endM))}</span><h2>${esc(it.name)}</h2>${itemInfo(l.cid)}
    <div class="kpis sm"><div class="stat"><small>Estimate</small><b>${money(l.est)}</b></div><div class="stat"><small>Reserve</small><b>${money(l.est * LC.reserve)}</b></div>${l.high ? `<div class="stat"><small>Highest rival bid</small><b>${money(l.high)}</b></div>` : ''}<div class="stat"><small>Your max bid</small><b>${l.bids[meId()] != null ? money(l.bids[meId()]) : '—'}</b></div></div>
    ${t < l.tier ? `<p class="empty">This lot is for ${esc(PRESTIGE_TIERS[l.tier].name)} collectors. Grow your prestige to bid.</p>` : l.seller === meId() ? '<p class="empty">This is your lot.</p>' : `<div class="bidrow"><div class="stepper"><button data-a="lotAmt" data-v="-1" aria-label="Lower">−</button><output>${money(amt)}</output><button data-a="lotAmt" data-v="1" aria-label="Higher">+</button></div><button class="btn gold" data-a="bid" data-lot="${l.id}" data-v="${amt.toFixed(4)}">Bid ${money(amt)}</button></div>
    <p class="empty">With the buyer's premium you pay up to ${money(amt * (1 + LC.auctionPremium))}. Account: ${money(p.life.wallet)}.</p>`}</article>`;
}
function tradeModal(st) {
  const c = city(), p = me(), others = Object.values(c.players).filter((x) => x.id !== meId() && !x.admin && x.life);
  const to = c.players[st.to] || others[0]; st.to = to.id;
  const sets = L.completeSets(p);
  const pickCard = (pl, i, side) => cardHTML(i.cid, { a: 'tradePick', attrs: `data-side="${side}" data-uid="${i.uid}"`, cls: 'sm' + ((side === 'give' ? st.give : st.get).includes(i.uid) ? ' picked' : ''), value: L.instValue(c, pl, i), noDelta: true });
  const vGive = st.give.reduce((a, u) => { const i = p.life.items.find((x) => x.uid === u); return a + (i ? L.instValue(c, p, i, sets) : 0); }, 0);
  const vGet = st.get.reduce((a, u) => { const i = to.life.items.find((x) => x.uid === u); return a + (i ? L.instValue(c, to, i) : 0); }, 0);
  return `<article class="sheet lifep"><span class="cap">Trade</span><h2>Propose a trade</h2>
    <select id="trade-to" data-a="tradeTo" aria-label="Trade with">${others.map((o) => `<option value="${o.id}" ${o.id === to.id ? 'selected' : ''}>${esc(o.name)}${o.bot ? '' : ' · player'}</option>`).join('')}</select>
    <span class="cap">You give · ${money(vGive)}</span><div class="cstrip">${p.life.items.filter((i) => !i.lot).map((i) => pickCard(p, i, 'give')).join('') || '<p class="empty">You have nothing to trade yet.</p>'}</div>
    <span class="cap">You get from ${esc(to.name)} · ${money(vGet)}</span><div class="cstrip">${to.life.items.filter((i) => !i.lot).map((i) => pickCard(to, i, 'get')).join('') || '<p class="empty">Nothing to trade.</p>'}</div>
    <div><span class="cap">Cash ${st.cash >= 0 ? 'you add' : 'they add'}</span><div class="stepper"><button data-a="tradeCash" data-v="-1">−</button><output>${money(Math.abs(st.cash))}</output><button data-a="tradeCash" data-v="1">+</button></div></div>
    <p class="empty">Balance for you: <b class="${vGet - vGive - st.cash >= 0 ? 'up' : 'down'}">${money(vGet - vGive - st.cash, true)}</b>. ${to.bot ? 'Rivals want about 5% more than they give.' : 'They will see it in their Life tab.'}</p>
    <button class="btn gold" data-a="tradeSend">Send proposal</button></article>`;
}
export function dinnerHTML(st) {
  const c = city(), p = me(), res = p.life.homes.find((h) => h.uid === p.life.res);
  const bg = res ? homeBg(res.hid, 'living') : homeBg('H1', 'living');
  const head = `<header style="${bg.replace('background-image:', 'background-image:linear-gradient(180deg, rgba(40,22,8,0.55), rgba(20,12,6,0.9)), ')}"><span class="dh-ic">${ricon('wine', 26)}</span><div><span class="cap" style="color:#fff;opacity:.8">${res ? esc(L.HOME[res.hid].name) : 'At home'}</span><h3>${esc(DINNER.title)}</h3><p>${esc(DINNER.scene)}</p></div><div class="pulse" aria-hidden="true"><i></i><i></i><i></i></div></header>`;
  if (st.phase === 'setup') {
    const wines = p.life.items.filter((i) => L.ITEM[i.cid].cat === 'wine' && !i.lot);
    return `<article class="scene lifep">${head}<div class="scene-in"><div class="ask"><b>Who do you invite?</b>${DINNER.guests.map((g) => `<button class="opt ${st.guests === g.id ? 'sel' : ''}" data-a="dinnerGuests" data-v="${g.id}"><b>${esc(g.label)}</b><span>${esc(g.note)}</span></button>`).join('')}</div>
      <div class="ask"><b>Which case do you open?</b>${wines.length ? `<div class="cstrip">${wines.map((i) => cardHTML(i.cid, { a: 'dinnerWine', attrs: `data-uid="${i.uid}"`, cls: 'sm' + (st.uid === i.uid ? ' picked' : ''), noDelta: true })).join('')}</div><span class="muted small">Better wine makes a stronger impression. The case is used up.</span>` : '<p class="empty">Your cellar is empty. Buy a case at the auction house or from the dealer.</p>'}</div>
      <button class="btn gold" data-a="dinnerStart" ${st.guests && st.uid ? '' : 'disabled'}>Light the candles</button></div></article>`;
  }
  const t = Math.min(1, (Date.now() - st.start) / (DINNER.seconds * 1000)), shown = Math.min(st.speakers.length, Math.floor(t * (st.speakers.length + 1)));
  const bubbles = st.speakers.slice(0, shown).map((sp, i) => `<div class="bub ${i % 2 ? 'r' : ''}"><span class="av" style="background:${sp.color};--avc:${sp.color}">${esc(sp.name[0])}</span><div><b>${esc(sp.name)}</b><p>${esc(sp.line)}</p></div></div>`).join('');
  const foot = st.phase === 'done' ? `<div class="ask"><b>${esc(st.result || 'What an evening.')}</b><button class="btn gold" data-a="close">Good night</button></div>` : `<div class="scene-prog"><div class="bar"><i style="width:${(t * 100).toFixed(1)}%"></i></div><span class="cap">${Math.ceil(DINNER.seconds * (1 - t))} s</span></div>`;
  return `<article class="scene lifep">${head}<div class="scene-in"><div class="bubs" aria-live="polite">${bubbles || '<p class="muted">The first guests ring the bell…</p>'}</div>${foot}</div></article>`;
}
export function newDinner() { return { t: 'dinner', phase: 'setup', guests: null, uid: null }; }
export function startDinner(st) {
  const names = DINNER.names.slice().sort(() => Math.random() - 0.5), lines = DINNER.lines.slice().sort(() => Math.random() - 0.5), colors = ['#b5651d', '#7d3c98', '#2e8b57', '#c0392b', '#2f6fb0'];
  st.phase = 'run'; st.start = Date.now(); st.speakers = names.slice(0, 5).map((name, i) => ({ name, line: lines[i], color: colors[i] }));
}
