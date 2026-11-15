// Marina Royale: the casino overlay. Lobby with the three rooms as big pictures, a room with its tables, the cashier
// and the Blackjack table itself. Rules, money and the shoe live in supabase/functions/_shared/casino.js; this file only
// draws the table and sends casBuy/casSit/casDeal/casHit/... Cards that are new since the last draw slide in from the
// shoe one after another, the hole card turns over, and the result shows once the cards are down.
import * as E from '../supabase/functions/_shared/engine.js';
import { CASINO as C, PRESTIGE_TIERS } from '../supabase/functions/_shared/content.js';
import { city, me, meId, esc, M } from './util.js';
import { pokerHTML, pokerRoomHTML, pokerClick, pokerTick, pokerFly, pokerSeat, pokerOpen, POKER_CSS } from './poker.js';

const CAS = E.CAS, ROOMS = C.rooms, V = 2; // V: image version (bump when a cas-*.jpg/webp is replaced)
export const img = (n, ext = 'jpg') => `img/${n}.${ext}?v=${V}`;
export const kM = (k) => M(k / 1000);
export const CZ = { open: false, view: 'lobby', room: null, bet: { main: 0, pp: 0, t3: 0 }, last: null, target: 'main', cashier: false, hint: false, anim: new Map(), next: -1, nextAt: 0, queue: 0, first: true, tick: null, lastTick: 0, act: null, busy: false };
const settleIn = () => Math.max(0, (CZ.queue + 550 - Date.now()) / 1000 + 0.15).toFixed(2); // when the last card is down

// ---------------------------------------------------------------- open, close, refresh
export function openCasino(act, room) {
  try { new Image().src = img('cas-loading'); } catch (e) { /* preload the curtain */ }
  CZ.act = act; css();
  let el = document.getElementById('casino');
  if (!el) { el = document.createElement('div'); el.id = 'casino'; (document.getElementById('app') || document.body).appendChild(el); el.addEventListener('click', onClick); el.addEventListener('change', onChange); window.addEventListener('resize', () => { if (CZ.open) render(); }); }
  el.hidden = false; CZ.open = true;
  const at = city().casino && CAS.seatOf(city(), meId());
  const pk = pokerSeat();
  if (at) { CZ.view = 'table'; CZ.room = at.t.room; } else if (pk) { pokerOpen(pk.t.id); CZ.room = 'main'; } else if (room && ROOMS[room]) { CZ.view = 'room'; CZ.room = room; } else CZ.view = 'lobby';
  CZ.anim = new Map(); CZ.queue = 0; CZ.first = true;
  render();
  if (!CZ.tick) CZ.tick = setInterval(tick, 200);
}
export function closeCasino() { const el = document.getElementById('casino'); if (el) { el.hidden = true; el.innerHTML = ''; } CZ.open = false; clearInterval(CZ.tick); CZ.tick = null; }
export function casinoRefresh() { if (CZ.open) render(); }
export const casinoOpen = () => CZ.open;
export async function send(action, args) { if (CZ.busy && !['casTick', 'pkTick', 'pkHole'].includes(action)) return { ok: false }; CZ.busy = true; let r; try { r = await CZ.act(action, args || {}); } finally { CZ.busy = false; } render(); return r; }

const myTable = () => { const c = city(); const at = c.casino && CAS.seatOf(c, meId()); return at || null; };
export const cas = () => { const p = me(); return (p && p.life && p.life.cas) || { chips: 0, buy: 0, turn: 0, net: 0, best: 0, hands: 0, mTurn: 0, limit: 0 }; };
const tierGate = (room) => { const c = city(), p = me(); return CAS.gate(c, p, room, { tier: (x) => E.LIFE.tierOf(c, x), tierName: (t) => PRESTIGE_TIERS[t].name }); };

// fill in the clocks right after a redraw (the HTML itself has no seconds in it, so an unchanged table is not redrawn)
function tick0() { const now = Date.now(); document.querySelectorAll('#casino [data-dl]').forEach((x) => { const left = Math.max(0, +x.dataset.dl - now), tot = +x.dataset.tot || 0, s = Math.ceil(left / 1000); if (tot) { x.style.setProperty('--f', Math.min(1, left / (tot * 1000)).toFixed(3)); x.classList.toggle('low', s <= 5); const b = x.querySelector('b'); if (b) b.textContent = s + ' s'; } else { x.textContent = s + ' s'; x.classList.toggle('low', s <= 5); } }); }
// the server only moves a table on when somebody acts: whoever sits there asks it to once a timer has run out
function tick() {
  if (!CZ.open) return;
  const now = Date.now();
  document.querySelectorAll('#casino [data-dl]').forEach((x) => {
    const left = Math.max(0, +x.dataset.dl - now), tot = +x.dataset.tot || 0, s = Math.ceil(left / 1000);
    if (tot) { const f = Math.min(1, left / (tot * 1000)); x.style.setProperty('--f', f.toFixed(3)); x.classList.toggle('low', s <= 5); const b = x.querySelector('b'); if (b) b.textContent = s + ' s'; }
    else { x.textContent = s + ' s'; x.classList.toggle('low', s <= 5); }
  });
  pokerTick();
  if (now < CZ.queue + 900 && CZ.view === 'table' && !CZ.cashier) { if (now - (CZ.drawn || 0) > 180) { CZ.drawn = now; render(); } CZ.held = true; } // cards on their way: totals follow them
  else if (CZ.held) { CZ.held = false; render(); } // the cards have landed: show the buttons
  const at = myTable(); if (!at) return;
  if (at.t.dl && Date.now() > at.t.dl + 400 && Date.now() - CZ.lastTick > 2500) { CZ.lastTick = Date.now(); send('casTick'); }
}

// ---------------------------------------------------------------- clicks
async function onClick(ev) {
  const b = ev.target.closest('[data-c]'); if (!b) return;
  ev.preventDefault(); const d = b.dataset, cz = cas();
  if (d.c.startsWith('pk')) { await pokerClick(d); return; }
  switch (d.c) {
    case 'close': { const at = myTable(); if (at && !(at.t.ph !== 'bet' && at.s.hands.length && !at.s.done)) await send('casLeave'); if (pokerSeat()) await send('pkLeave'); closeCasino(); return; }
    case 'lobby': CZ.view = 'lobby'; render(); return;
    case 'room': CZ.view = 'room'; CZ.room = d.r; render(); return;
    case 'sit': { const [rm, no] = d.t.split('-'); const r = await loading(`${ROOMS[rm] ? ROOMS[rm].name : 'Marina Royale'} · Table ${no}`, () => send('casSit', { tid: d.t })); if (r && r.ok) { CZ.view = 'table'; CZ.room = d.t.split('-')[0]; CZ.bet = { main: 0, pp: 0, t3: 0 }; CZ.anim = new Map(); CZ.first = true; render(); } return; }
    case 'leave': { const r = await send('casLeave'); if (r && r.ok) { CZ.view = 'room'; render(); } return; }
    case 'cashier': CZ.cashier = !CZ.cashier; render(); return;
    case 'buy': { const amt = d.v === 'x' ? Number((document.getElementById('cz-amt') || {}).value) : Number(d.v); await send('casBuy', { amt }); return; }
    case 'cash': await send('casCash'); if (!myTable() && CZ.view === 'table') CZ.view = 'room'; render(); return;
    case 'target': CZ.target = d.t; render(); return;
    case 'chip': {
      const v = Number(d.v), t = myTable(); if (!t) return; const r = ROOMS[t.t.room], max = CAS.maxBet(city(), t.t.room), bet = CZ.bet;
      const sum = bet.main + bet.pp + bet.t3, cap = CZ.target === 'main' ? max : r.side;
      if (sum + v > cz.chips) { CZ.flash = 'Not enough chips. Visit the cashier.'; render(); return; }
      if (bet[CZ.target] + v > cap) { CZ.flash = `${CZ.target === 'main' ? 'Table maximum' : 'Side bets up to'} ${kM(cap)}.`; render(); return; }
      bet[CZ.target] += v; CZ.flash = ''; render(); return;
    }
    case 'clear': CZ.bet = { main: 0, pp: 0, t3: 0 }; render(); return;
    case 'next': { const at = myTable(); if (!at) return; CZ.next = at.t.round; CZ.nextAt = Date.now(); CZ.bet = { main: 0, pp: 0, t3: 0 }; render(); setTimeout(render, COL + 80); return; }
    case 'deal': { const bet = { ...CZ.bet }; if (!bet.main) { CZ.flash = 'Put chips on the main spot first.'; render(); return; } const r = await send('casDeal', bet); if (r && r.ok) { CZ.last = bet; CZ.bet = { main: 0, pp: 0, t3: 0 }; CZ.hint = false; } render(); return; }
    case 'ins': await send('casIns', { take: d.v === '1' }); return;
    case 'move': CZ.hint = false; await send('cas' + d.m); return;
    case 'hint': CZ.hint = !CZ.hint; render(); return;
    case 'quiet': await send('casQuiet', { on: d.v === '1' }); return;
  }
}
async function onChange(ev) { if (ev.target.id === 'cz-limit') await send('casLimit', { k: Number(ev.target.value) }); }

// ---------------------------------------------------------------- drawing
function render() {
  const el = document.getElementById('casino'); if (!el || !CZ.open) return;
  const c = city(); if (!c || !me()) return;
  if (!c.casino) { el.innerHTML = `<div class="cz-wait">Opening Marina Royale…</div>`; return; }
  const at = myTable();
  if (CZ.view === 'table' && !at) CZ.view = CZ.room ? 'room' : 'lobby';
  if (CZ.view === 'poker' && pokerSeat() == null && !CZ.pk) CZ.view = 'room';
  const body = CZ.view === 'poker' ? pokerHTML() : CZ.view === 'table' ? tableHTML(at) : CZ.view === 'room' ? roomHTML(CZ.room) : lobbyHTML();
  const html = body + (CZ.cashier ? cashierHTML() : '') + loadHTML();
  if (CZ.view === 'poker' && html === CZ.html) return; // nothing new: keep the buttons under your finger
  // keep the room's scroll position when it is redrawn (a seat picker opening, the tables moving on)
  const sc = el.querySelector('.cz-roomv'), keep = sc && CZ.view === 'room' && CZ.scrollRoom === CZ.room ? sc.scrollTop : 0;
  CZ.html = html; el.innerHTML = html; if (CZ.view === 'poker') tick0();
  if (CZ.view === 'room') { const n = el.querySelector('.cz-roomv'); if (n && keep) n.scrollTop = keep; CZ.scrollRoom = CZ.room; } else CZ.scrollRoom = null;
  CZ.first = false;
  if (CZ.view === 'table') fly(el);
  if (CZ.view === 'poker') pokerFly(el);
}
// a short curtain on the way to a table (img/cas-loading.jpg), so sitting down feels like walking up to it
const LOAD = 2600;
// loading(label, then): shows the curtain at once, runs then() meanwhile (e.g. sitting down) and returns its result; the
// curtain lifts by itself after LOAD ms, or at once if then() fails. Any table can use it (Blackjack, Poker).
export async function loading(label, then) {
  CZ.load = { at: Date.now(), label }; render(); setTimeout(render, LOAD + 60);
  let r; try { r = then ? await then() : { ok: true }; } catch (e) { r = { ok: false }; }
  if (r && r.ok === false) { CZ.load = null; render(); }
  return r;
}
function loadHTML() {
  const L = CZ.load; if (!L) return ''; const gone = Date.now() - L.at; if (gone >= LOAD) { CZ.load = null; return ''; }
  const dl = `animation-delay:${(-gone / 1000).toFixed(2)}s !important`;
  return `<div class="cz-load" style="${dl}"><div class="cz-load-img" style="background-image:url('${img('cas-loading')}');${dl}"></div>
    <div class="cz-load-txt"><small>${esc(L.label || 'Marina Royale')}</small><b>Getting ready for action</b><span class="cz-load-bar"><i style="${dl}"></i></span></div></div>`;
}
CZ.redraw = () => render();
// each card on its way starts at the shoe: measure where it will lie and set the flight as --dx/--dy
function fly(el) {
  const shoe = el.querySelector('.cz-shoe-cards'); if (!shoe) return;
  const sr = shoe.getBoundingClientRect(), sx = sr.left + sr.width / 2, sy = sr.top + sr.height / 2;
  const to = (sel, cls) => { const tg = el.querySelector(sel); if (!tg) return; const tr = tg.getBoundingClientRect(), tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
    el.querySelectorAll(cls).forEach((c) => { c.style.setProperty('animation-name', 'none', 'important'); const r = c.getBoundingClientRect(); c.style.removeProperty('animation-name');
      c.style.setProperty('--gx', `${Math.round(tx - (r.left + r.width / 2))}px`); c.style.setProperty('--gy', `${Math.round(ty - (r.top + r.height / 2))}px`); }); };
  to('.cz-discard span', '.cz-card.gone'); to('.cz-dealer', '.cz-fly.take'); to('.cz-bal', '.cz-fly.pay');
  el.querySelectorAll('.cz-card.deal').forEach((c) => {
    c.style.setProperty('animation-name', 'none', 'important'); const r = c.getBoundingClientRect(); c.style.removeProperty('animation-name');
    c.style.setProperty('--dx', `${Math.round(sx - (r.left + r.width / 2))}px`); c.style.setProperty('--dy', `${Math.round(sy - (r.top + r.height / 2))}px`);
  });
}
const CROWN = '<svg viewBox="0 0 48 30" aria-hidden="true"><path d="M4 26h40l3-17-11 8-12-14-12 14-11-8z" fill="currentColor"/><circle cx="24" cy="3" r="2.6" fill="currentColor"/><circle cx="2" cy="8" r="2.2" fill="currentColor"/><circle cx="46" cy="8" r="2.2" fill="currentColor"/></svg>';
export function topBar(left) {
  const cz = cas(), p = me(), card = CAS.cardOf(cz);
  return `<header class="cz-top"><div class="cz-brand">${left || `<span class="cz-crown">${CROWN}</span><b>Marina Royale</b><small>Casino</small>`}</div>
    <div class="cz-pills"><span class="cz-pill" title="Your chips">Chips <b>${kM(cz.chips)}</b></span><span class="cz-pill hide-s" title="Your private account">Wallet <b>${M(p.life.wallet)}</b></span>
    <span class="cz-pill card-${card.id}" title="Players Card">${card.name}</span>
    <button class="cz-pill btn" data-c="cashier">Cashier</button><button class="cz-pill btn x" data-c="close" aria-label="Leave the casino">✕</button></div></header>`;
}
function lobbyHTML() {
  const c = city();
  const rooms = Object.entries(ROOMS).map(([id, r], i) => {
    const g = tierGate(id), n = Object.values(c.casino.tables).filter((t) => t.room === id).reduce((a, t) => a + t.seats.filter((s) => s && s.k === 'p').length, 0);
    return `<button class="cz-room r-${id}${g ? ' locked' : ''}" data-c="room" data-r="${id}" style="background-image:url('${img(r.img)}')">
      <span class="cz-shade"></span>
      <span class="cz-room-in"><small>${['I', 'II', 'III'][i]} · Blackjack${id === 'main' ? ' · Poker' : ''}</small><h2>${esc(r.name)}</h2><p>${esc(r.tag)}</p>
      <span class="cz-lim">${kM(r.min)} – ${kM(CAS.maxBet(c, id))} a hand${n ? ` · ${n} at the tables` : ''}</span>
      ${g ? `<span class="cz-lock">🔒 ${esc(ROOMS[id].black != null ? 'Elite, or Respected with a Black card' : 'Respected tycoons and above')}</span>` : `<span class="cz-enter">Enter</span>`}</span></button>`;
  }).join('');
  return `<div class="cz-lobby">${topBar()}<div class="cz-rooms">${rooms}</div></div>`;
}
function roomHTML(id) {
  const c = city(), r = ROOMS[id], tables = Object.values(c.casino.tables).filter((t) => t.room === id), g = tierGate(id);
  const list = tables.map((t) => {
    const seats = t.seats.map((s) => `<i class="${s ? (s.k === 'p' ? 'p' : 'b') : ''}" title="${s ? esc(s.name) : 'Free seat'}">${s ? esc(s.name.split(' ').map((x) => x[0]).join('').slice(0, 2)) : ''}</i>`).join('');
    const free = t.seats.filter((s) => !s).length;
    return `<div class="cz-tcard"><div><b>Table ${t.no}</b><small>Dealer ${esc(t.dealer)} · ${kM(r.min)} – ${kM(CAS.maxBet(c, id))}${r.csm ? ' · shuffled every round' : ' · 6-deck shoe'}</small></div>
      <div class="cz-seats">${seats}</div><button class="cz-btn gold" data-c="sit" data-t="${t.id}" ${free && !g ? '' : 'disabled'}>${free ? 'Take a seat' : 'Full'}</button></div>`;
  }).join('');
  return `<div class="cz-roomv" style="background-image:url('${img(r.img)}')"><span class="cz-shade"></span>${topBar(`<button class="cz-back" data-c="lobby">‹ Lobby</button><b>${esc(r.name)}</b>`)}
    <div class="cz-roomp"><h2>${esc(r.name)}</h2><p>${esc(r.tag)}</p>${g ? `<p class="cz-note">${esc(g)}</p>` : ''}
    <h3 class="pk-h">Blackjack</h3><div class="cz-rules">Blackjack pays 3 to 2 · Dealer stands on all 17 · Insurance pays 2 to 1 · Double on any two, also after a split · Split to four hands · Late surrender · Side bets Perfect Pairs and 21+3 up to ${kM(r.side)}</div>
    <div class="cz-tlist">${list}</div>${id === 'main' ? pokerRoomHTML() : ''}${cas().chips ? '' : `<p class="cz-note">You have no chips yet. <a href="#" data-c="cashier">Visit the cashier</a>.</p>`}</div></div>`;
}

// ---------------------------------------------------------------- cards and chips
const PIPS = { 2: [[50, 18], [50, 82]], 3: [[50, 18], [50, 50], [50, 82]], 4: [[33, 18], [67, 18], [33, 82], [67, 82]], 5: [[33, 18], [67, 18], [50, 50], [33, 82], [67, 82]],
  6: [[33, 18], [67, 18], [33, 50], [67, 50], [33, 82], [67, 82]], 7: [[33, 18], [67, 18], [50, 34], [33, 50], [67, 50], [33, 82], [67, 82]], 8: [[33, 18], [67, 18], [50, 34], [33, 50], [67, 50], [50, 66], [33, 82], [67, 82]],
  9: [[33, 18], [67, 18], [33, 39], [67, 39], [50, 50], [33, 61], [67, 61], [33, 82], [67, 82]], 10: [[33, 18], [67, 18], [50, 29], [33, 39], [67, 39], [33, 61], [67, 61], [50, 71], [33, 82], [67, 82]] };
export function face(cd) {
  const r = CAS.rank(cd), s = CAS.SUITS[CAS.suit(cd)], R = CAS.RANKS[r], col = CAS.red(cd) ? ' red' : '';
  let mid;
  if (r === 0) mid = `<span class="cz-ace">${s}</span>`;
  else if (r >= 10) mid = `<span class="cz-court"><em>${R}</em><i>${s}</i>${r === 12 ? `<u>${CROWN}</u>` : r === 11 ? '<u>♛</u>' : '<u>⚜</u>'}</span>`;
  else mid = PIPS[r + 1].map(([x, y]) => `<span class="cz-pip${y > 55 ? ' f' : ''}" style="left:${x}%;top:${y}%">${s}</span>`).join('');
  return `<span class="cz-ix">${R}<br>${s}</span><span class="cz-ix b">${R}<br>${s}</span>${mid}`;
}
// one card; key says which card it is in this round, so new ones fly in and the hole card turns over
// Each card's animation gets a start time the first time it is drawn; cards queue one after another (CZ.queue), and a
// redraw in the middle simply carries on with a negative delay.
const STEP = C.dealMs || 650, FLIP = 700, DUR = 1200; // DUR: from the shoe to the spot (first half) and turned over (second half); // keep STEP in step with CASINO.dealMs: the server's timers wait for it
// Pauses: the opening deal runs card after card (STEP); a card for another hand than the last one (the next player,
// a bot, the dealer) waits GAP first so you can follow whose turn it is; the dealer turns the hole card after GAP and
// draws at DSTEP. The server's clocks allow for the same (CASINO.dealMs, turnGap).
const GAP = C.turnGap || 1300, DSTEP = 1100;
function reg(cd, key) {
  const now = Date.now(); let a = CZ.anim.get(key);
  const part = key.split(':'), dealer = part[0] === 'd', who = part.slice(0, -1).join(':'), opening = dealer ? +part[2] < 2 : +part[3] === 0 && +part[4] < 2;
  if (!a) {
    const gap = CZ.first || opening ? 0 : who !== CZ.lastWho ? GAP : dealer ? DSTEP - STEP : 0;
    a = { at: CZ.first ? 0 : Math.max(now, CZ.queue) + gap, k: 'deal', back: cd == null }; if (!CZ.first) CZ.queue = a.at + STEP; CZ.anim.set(key, a); CZ.lastWho = who;
  } else if (a.back && cd != null) { a.back = false; a.k = 'flip'; a.at = Math.max(now, CZ.queue) + GAP; CZ.queue = a.at + FLIP; CZ.lastWho = who; }
  return a;
}
// queue the cards in the order a dealer deals them (one to each player, the dealer's up card, a second round, the hole
// card, then whatever was drawn), not in the order they are drawn on the page
function queueRound(t) {
  const dk = (i) => `d:${t.round}:${i}`, sk = (s, hi, ci) => `s:${t.round}:${s.id}:${hi}:${ci}`, live = t.seats.filter((s) => s && s.hands.length);
  const first = (ci) => live.forEach((s) => { const c = s.hands[0].c[ci]; if (c != null && !s.hands[0].sp) reg(c, sk(s, 0, ci)); });
  first(0); if (t.d.c.length) reg(t.d.c[0], dk(0));
  first(1); if (t.d.hole != null) reg(null, dk(1)); else if (t.d.c.length > 1) reg(t.d.c[1], dk(1));
  live.forEach((s) => s.hands.forEach((h, hi) => h.c.forEach((c, ci) => reg(c, sk(s, hi, ci)))));
  t.d.c.slice(1).forEach((c, i) => reg(c, dk(i + 1)));
}
// the cards of a hand that are already on the table (the total only counts those)
const landed = (cards, key) => cards.filter((c, i) => { const a = CZ.anim.get(key(i)); return !a || !a.at || Date.now() >= a.at + (a.k === 'flip' ? FLIP : DUR) * 0.8; });
const settled = () => CZ.queue + DUR - STEP; // the last card has landed and been turned over
function cardHTML(cd, key, room) {
  const now = Date.now(), a = reg(cd, key); let cls = 'cz-card', style = '';
  if (cd == null) cls += ' back'; else if (CAS.red(cd)) cls += ' red';
  const back = `<span class="cz-backimg" style="background-image:url('${img(ROOMS[room].back, 'webp')}')"></span>`;
  let over = '';
  if (a.at && now < a.at + DUR) { const dl = `animation-delay:${((a.at - now) / 1000).toFixed(2)}s !important`; cls += ' ' + a.k + (a.k === 'deal' && cd != null ? ' up' : ''); style = dl; if (cd != null) over = `<span class="cz-flipb ${a.k}" style="${dl}">${back}</span>`; }
  return `<span class="${cls}" style="${style}">${cd == null ? back : face(cd) + over}</span>`;
}
export function chipStack(k, small) {
  if (!(k > 0)) return '';
  const out = []; let left = k; for (const v of [...C.chips].reverse()) { while (left >= v - 1e-9 && out.length < 9) { out.push(v); left -= v; } }
  if (left > 0.01 && out.length < 9) out.push(C.chips[0]);
  return `<span class="cz-stack${small ? ' sm' : ''}">${out.reverse().map((v, i) => `<img src="${img('cas-chip-' + v, 'webp')}" style="--i:${i}" alt="">`).join('')}<b>${kM(k)}</b></span>`;
}
const totalLabel = (cards, done) => { const t = CAS.total(cards); return t.soft && t.t < 21 && cards.length && !done ? `${t.t - 10} / ${t.t}` : String(t.t); };
const RES = { bj: ['Blackjack', 'win'], win: ['Win', 'win'], push: ['Push', 'push'], lose: ['Lose', 'lose'], bust: ['Bust', 'lose'], sur: ['Surrender', 'push'] };

// ---------------------------------------------------------------- the table
// After a hand: the cards stay with the results until you press Next hand; then the dealer gathers them (COL ms) onto
// the discard pile, takes the chips that lost and pushes the winnings to you. Betting opens the moment you press it.
const COL = 1300;
const roundState = (t, s) => {
  const over = t.ph === 'bet' && t.round > 0, mine = over && s.done && s.hands.length > 0, col = over && CZ.next === t.round ? Date.now() - CZ.nextAt : -1;
  return { over, waitNext: mine && CZ.next !== t.round, col, collecting: col >= 0 && col < COL, gone: col >= COL };
};
function goneCard(cd, i, room) {
  if (cd == null) return `<span class="cz-card back gone" style="animation-delay:${(CZ.nextAt + i * 45 - Date.now()) / 1000}s !important"><span class="cz-backimg" style="background-image:url('${img(ROOMS[room].back, 'webp')}')"></span></span>`;
  const dl = `animation-delay:${((CZ.nextAt + i * 45 - Date.now()) / 1000).toFixed(2)}s !important`;
  return `<span class="cz-card gone${CAS.red(cd) ? ' red' : ''}" style="${dl}">${face(cd)}<span class="cz-flipb gone" style="${dl}"><span class="cz-backimg" style="background-image:url('${img(ROOMS[room].back, 'webp')}')"></span></span></span>`;
}
const WIDE = [[17, 50], [32, 59], [50, 61], [68, 59], [83, 50]], TALL = [[15, 30], [16, 52], [50, 60], [84, 52], [85, 30]];
function tableHTML(at) {
  const c = city(), t = at.t, me_ = at.s, r = ROOMS[t.room], tall = innerWidth / Math.max(1, innerHeight) < 0.95;
  if (CZ.anim.size > 400) CZ.anim = new Map([...CZ.anim].slice(-120)); // keys carry the round: old ones simply stop matching
  const pos = tall ? TALL : WIDE, mine = at.i;
  const inRound = t.ph !== 'bet' || (me_.hands.length && me_.done);
  // the dealer: up card, then the hole card (a back until it is turned), then what the dealer drew
  const dk = (i) => `d:${t.round}:${i}`;
  const RS = roundState(t, me_); let gi = 0; // gi: order in which the dealer gathers the cards
  if (!RS.collecting && !RS.gone) queueRound(t);
  let dealer = '';
  if (RS.gone) dealer = `<div class="cz-dealer empty"><span class="cz-dname">Dealer ${esc(t.dealer)}</span></div>`;
  else if (RS.collecting) dealer = `<div class="cz-dealer"><span class="cz-cards">${t.d.c.map((cd) => goneCard(cd, gi++, t.room)).join('')}</span></div>`;
  else if (t.d.c.length || t.d.hole != null) {
    const shown = [cardHTML(t.d.c[0], dk(0), t.room)];
    if (t.d.hole != null) shown.push(cardHTML(null, dk(1), t.room));
    t.d.c.slice(1).forEach((cd, i) => shown.push(cardHTML(cd, dk(i + 1), t.room)));
    const dl = landed(t.d.c, dk), dn = dl.length === t.d.c.length && t.d.hole == null;
    dealer = `<div class="cz-dealer">${dl.length ? `<span class="cz-tot">${dn ? totalLabel(t.d.c, true) : dl.length === 1 ? CAS.cval(dl[0]) === 11 ? 'A' : CAS.cval(dl[0]) : totalLabel(dl, false)}</span>` : ''}<span class="cz-cards">${shown.join('')}</span></div>`;
  } else dealer = `<div class="cz-dealer empty"><span class="cz-dname">Dealer ${esc(t.dealer)}</span></div>`;
  // seats, turned so that you sit in the middle
  const seats = t.seats.map((s, i) => {
    if (!s) return '';
    const [x, y] = pos[(i - mine + 2 + 5) % 5], isMe = i === mine, turnHere = t.turn && t.turn.s === i;
    const hands = RS.gone ? '' : RS.collecting ? s.hands.map((h) => `<span class="cz-hand"><span class="cz-cards">${h.c.map((cd) => goneCard(cd, gi++, t.room)).join('')}</span></span>`).join('') : s.hands.map((h, hi) => {
      const active = turnHere && t.turn.h === hi && t.ph === 'play';
      const cards = h.c.map((cd, ci) => cardHTML(cd, `s:${t.round}:${s.id}:${hi}:${ci}`, t.room)).join('');
      const res = h.res && RES[h.res] ? `<span class="cz-res ${RES[h.res][1]}" style="animation-delay:${settleIn()}s !important">${RES[h.res][0]}${h.res !== 'push' ? ` ${h.won - h.bet > 0 ? '+' : ''}${kM(h.won - h.bet)}` : ''}</span>` : '';
      return `<span class="cz-hand${active ? ' on' : ''}">${res}<span class="cz-cards">${cards}</span>${(() => { const lc = landed(h.c, (ci) => `s:${t.round}:${s.id}:${hi}:${ci}`); return lc.length ? `<span class="cz-tot">${totalLabel(lc, h.st !== 'play' && lc.length === h.c.length)}</span>` : ''; })()}${s.hands.length > 1 || h.dbl ? chipStack(h.bet, true) : ''}</span>`;
    }).join('');
    const staked = s.hands.reduce((a, h) => a + h.bet, 0), won = s.hands.reduce((a, h) => a + (h.won || 0), 0);
    const showBet = isMe && RS.waitNext ? staked : isMe && t.ph === 'bet' && !s.ready ? CZ.bet.main : RS.over && (RS.collecting || RS.gone) && !s.ready ? 0 : s.hands.length ? (s.hands.length === 1 && !s.hands[0].dbl ? s.hands[0].bet : 0) : s.ready ? s.bet : 0;
    // the chips after the hand: what you won waits beside the bet; on Next hand the losing chips go to the dealer, the rest to you
    const pay = isMe && RS.waitNext && won > staked ? `<span class="cz-win" style="animation-delay:${settleIn()}s !important">${chipStack(won - staked, true)}</span>` : '';
    const fly = isMe && RS.collecting ? `${won < staked ? `<span class="cz-fly take" style="animation-delay:${((CZ.nextAt + 150 - Date.now()) / 1000).toFixed(2)}s !important">${chipStack(staked - won)}</span>` : ''}${won > 0 ? `<span class="cz-fly pay" style="animation-delay:${((CZ.nextAt + 350 - Date.now()) / 1000).toFixed(2)}s !important">${chipStack(won)}</span>` : ''}` : '';
    const spot = `<span class="cz-spot${isMe && t.ph === 'bet' && CZ.target === 'main' ? ' sel' : ''}" ${isMe && t.ph === 'bet' ? 'data-c="target" data-t="main"' : ''}>${chipStack(showBet)}${pay}${fly}</span>`;
    const side = isMe ? ['pp', 't3'].map((k) => { const v = t.ph === 'bet' && !s.ready ? CZ.bet[k] : s.side && s.side[k] ? s.side[k].bet : 0, sr = s.side && s.side[k];
      return `<span class="cz-side ${k}${t.ph === 'bet' && CZ.target === k ? ' sel' : ''}" ${t.ph === 'bet' ? `data-c="target" data-t="${k}"` : ''}><small>${k === 'pp' ? 'Pairs' : '21+3'}</small>${chipStack(v, true)}${sr && t.round && inRound && !RS.collecting && !RS.gone ? `<em class="${sr.won ? 'win' : 'lose'}">${sr.won ? `${CAS.SIDE_NAME[sr.k]} +${kM(sr.won - sr.bet)}` : '–'}</em>` : ''}</span>`; }).join('') : '';
    const wait = t.dl && ((t.ph === 'play' && turnHere) || (t.ph === 'bet' && s.ready)) ? `<span class="cz-clock" data-dl="${t.dl}">${Math.max(0, Math.ceil((t.dl - Date.now()) / 1000))} s</span>` : '';
    return `<div class="cz-seat${isMe ? ' me' : ''}${s.k === 'b' ? ' bot' : ''}${turnHere ? ' turn' : ''}" style="left:${x}%;top:${y}%">
      <span class="cz-hands">${hands}</span><span class="cz-bets">${isMe ? `<span class="cz-side-l">${side}</span>` : ''}${spot}</span>
      <span class="cz-name">${esc(isMe ? 'You' : s.name)}${s.k === 'b' ? ' · rival' : ''}${s.k === 'b' ? ` · ${kM(s.stack)}` : ''}${wait}</span></div>`;
  }).join('');
  // the result of your round, once the cards are down
  let banner = '';
  if (RS.waitNext) {
    const net = me_.net, bj = me_.hands.some((h) => h.res === 'bj');
    banner = `<div class="cz-banner ${net > 0 ? 'win' : net < 0 ? 'lose' : 'push'}" style="animation-delay:${(+settleIn() + 0.2).toFixed(2)}s !important"><b>${bj && net > 0 ? 'Blackjack!' : net > 0 ? 'You win' : net < 0 ? (me_.hands.every((h) => h.res === 'bust') ? 'Bust' : 'Dealer wins') : 'Push'}</b>${net ? `<span>${net > 0 ? '+' : '−'}${kM(Math.abs(net))}</span>` : ''}</div>`;
  }
  const talk = t.log.slice(0, 4).map((x) => `<p class="${x.k}${Date.now() - x.at < 9000 ? ' new' : ''}"><b>${esc(x.who)}</b> ${esc(x.text)}</p>`).join('');
  const shoeLeft = Math.max(0, 1 - t.shoe.pos / t.shoe.size);
  return `<div class="cz-tablev r-${t.room}${tall ? ' tall' : ''}" style="background-image:url('${img(r.img)}')">
    ${topBar(`<button class="cz-back" data-c="leave">‹ ${esc(r.name)}</button><b class="hide-s">Table ${t.no} · ${kM(r.min)} – ${kM(CAS.maxBet(c, t.room))}</b>`)}
    <div class="cz-stage" style="--felt:url('${img(r.felt)}')">
      <div class="cz-felt"></div>
      ${t.room === 'vault' ? '<div class="cz-print">Blackjack pays 3 to 2 · Dealer stands on all 17 · Insurance pays 2 to 1</div>' : ''}
      <div class="cz-shoe" title="${Math.round(shoeLeft * 100)}% of the shoe left"><span class="cz-shoe-cards" style="--left:${shoeLeft};background-image:url('${img(r.back, 'webp')}')"></span><span class="cz-shoe-box"></span></div>
      <div class="cz-discard" title="Discard tray"><span style="--n:${Math.min(1, t.shoe.pos / (t.shoe.size * 0.75)).toFixed(2)};background-image:url('${img(r.back, 'webp')}')"></span></div>
      <div class="cz-plaque"><b>${esc(r.name)}</b>${kM(r.min)} – ${kM(CAS.maxBet(c, t.room))}<br>${r.csm ? 'Shuffled every round' : '6 decks · cut at 75%'}</div>
      ${dealer}${seats}${banner}
      <div class="cz-talk">${talk}</div>
    </div>
    ${controlsHTML(at)}
  </div>`;
}
function controlsHTML(at) {
  const t = at.t, s = at.s, r = ROOMS[t.room], cz = cas(), msg = CZ.flash ? `<div class="cz-flash">${esc(CZ.flash)}</div>` : '';
  const rack = `<div class="cz-rack">${C.chips.map((v) => `<button class="cz-chip" data-c="chip" data-v="${v}" ${t.ph !== 'bet' || s.ready || v > cz.chips || roundState(t, s).waitNext ? 'disabled' : ''} aria-label="${kM(v)} chip"><img src="${img('cas-chip-' + v, 'webp')}" alt=""></button>`).join('')}
    <span class="cz-bal"><small>Chips</small><b>${kM(cz.chips - (t.ph === 'bet' && !s.ready ? CZ.bet.main + CZ.bet.pp + CZ.bet.t3 : 0))}</b></span></div>`;
  let acts = '';
  const bar = (label, tot) => t.dl ? `<div class="cz-timer" data-dl="${t.dl}" data-tot="${tot}"><i></i><span>${label}<b>${Math.max(0, Math.ceil((t.dl - Date.now()) / 1000))} s</b></span></div>` : '';
  const dealing = Date.now() < CZ.queue + DUR - STEP && (t.ph !== 'bet' || s.hands.length > 0); if (dealing) CZ.held = true;
  const RS = roundState(t, s);
  if (!dealing && RS.waitNext) acts = `${bar('The cards are dealt in', C.betSec)}<div class="cz-acts"><button class="cz-act deal" data-c="next"><i>↻</i>Next hand</button></div>`;
  else if (dealing) acts = `<p class="cz-waitp">${t.ph === 'play' && !t.turn ? 'The dealer plays…' : 'Dealing…'}</p>`;
  else if (t.ph === 'bet') {
    if (s.ready) acts = `<p class="cz-waitp">Waiting for the other players${t.dl ? ` · <span data-dl="${t.dl}"></span>` : ''}</p>`;
    else {
      const sum = CZ.bet.main + CZ.bet.pp + CZ.bet.t3;
      acts = `${bar('The cards are dealt in', C.betSec)}<p class="cz-target">Chips go on: <b>${CZ.target === 'main' ? 'the main bet' : CZ.target === 'pp' ? 'Perfect Pairs' : '21+3'}</b> · tap a spot to switch</p>
        <div class="cz-acts"><button class="cz-act" data-c="clear" ${sum ? '' : 'disabled'}><i>✕</i>Clear</button>
        <button class="cz-act deal" data-c="deal" ${CZ.bet.main >= r.min ? '' : 'disabled'}><i>▶</i>Deal${CZ.bet.main ? ` ${kM(sum)}` : ''}</button></div>`;
    }
  } else if (t.ph === 'ins') {
    acts = s.hands.length && s.ins == null ? `${bar('Decide on insurance', C.insSec)}<p class="cz-target">The dealer shows an ace. Insurance costs ${kM(s.hands[0].bet / 2)} and pays 2 to 1.</p><div class="cz-acts"><button class="cz-act" data-c="ins" data-v="1"><i>☂</i>Insurance</button><button class="cz-act" data-c="ins" data-v="0"><i>✕</i>No insurance</button></div>` : `<p class="cz-waitp">Waiting for insurance${t.dl ? ` · <span data-dl="${t.dl}"></span>` : ''}</p>`;
  } else if (t.ph === 'play') {
    const myTurn = t.turn && t.seats[t.turn.s] === s;
    if (myTurn) {
      const h = s.hands[t.turn.h], o = CAS.opts(city(), t, s, h), hint = r.hint ? CAS.basic(h.c, t.d.c[0], o) : null;
      const B = (m, ic, label) => `<button class="cz-act${hint === m && CZ.hint ? ' hint' : ''}" data-c="move" data-m="${m[0].toUpperCase() + m.slice(1)}" ${o[m] ? '' : 'disabled'}><i>${ic}</i>${label}</button>`;
      acts = `${bar('Your turn', C.turnSec)}<div class="cz-acts">${B('hit', '+', 'Hit')}${B('stand', '✋', 'Stand')}${B('double', '×2', 'Double')}${B('split', '⇹', 'Split')}${B('surrender', '⚑', 'Surrender')}${r.hint ? `<button class="cz-act sm" data-c="hint"><i>?</i>Hint</button>` : ''}</div>
        ${CZ.hint && hint ? `<p class="cz-target">Basic strategy says: <b>${hint[0].toUpperCase() + hint.slice(1)}</b></p>` : ''}`;
    } else acts = `<p class="cz-waitp">${t.turn ? `${esc(t.seats[t.turn.s].name)} is playing${t.dl ? ` · <span data-dl="${t.dl}"></span>` : ''}` : 'The dealer plays…'}</p>`;
  }
  return `<div class="cz-ctl">${rack}<div class="cz-right">${msg}${acts}</div></div>`;
}

// ---------------------------------------------------------------- the cashier
function cashierHTML() {
  const p = me(), cz = cas(), card = CAS.cardOf(cz), next = C.card.find((x) => x.min > (cz.turn || 0)), at = myTable(), busy = at && at.t.ph !== 'bet' && at.s.hands.length && !at.s.done;
  const buys = [0.1, 0.5, 1, 5, 25].filter((v) => v <= p.life.wallet + 1e-9).map((v) => `<button class="cz-btn" data-c="buy" data-v="${v}">${M(v)}</button>`).join('') || '<span class="cz-note">Your private account is empty. Move money from your empire in Personal.</span>';
  const lim = [0, 250, 1000, 5000, 25000].map((v) => `<option value="${v}" ${cz.limit === v ? 'selected' : ''}>${v ? 'Stop at −' + kM(v) : 'No limit'}</option>`).join('');
  const night = cz.buy ? cz.chips - cz.buy : 0;
  return `<div class="cz-cashier" role="dialog" aria-label="Cashier"><div class="cz-cbox">
    <header><b>Cashier</b><button class="cz-x" data-c="cashier" aria-label="Close">✕</button></header>
    <div class="cz-cgrid"><div><small>Private account</small><b>${M(p.life.wallet)}</b></div><div><small>Chips</small><b>${kM(cz.chips)}</b></div><div><small>Tonight</small><b class="${night > 0 ? 'up' : night < 0 ? 'down' : ''}">${night ? (night > 0 ? '+' : '−') + kM(Math.abs(night)) : '±0'}</b></div></div>
    <div class="cz-cap">Buy chips</div><div class="cz-row">${buys}</div>
    <div class="cz-row"><input id="cz-amt" type="number" min="0.001" step="0.1" placeholder="Amount in M"><button class="cz-btn" data-c="buy" data-v="x">Buy</button></div>
    <div class="cz-row"><button class="cz-btn gold" data-c="cash" ${cz.chips && !busy ? '' : 'disabled'}>Cash out ${kM(cz.chips)}</button></div>
    <div class="cz-cap">Tonight's limit</div><div class="cz-row"><select id="cz-limit">${lim}</select><span class="cz-note">The tables stop taking your bets at this loss until you cash out.</span></div>
    <div class="cz-cap">Players Card · ${card.name}</div>
    <p class="cz-note">You have bet ${kM(cz.turn || 0)} in all, ${kM(cz.mTurn || 0)} this month. ${card.name} members get ${card.rebate}% of a month's bets back${card.legacy ? ' and dinner on the house' : ''}.${next ? ` ${next.name} from ${kM(next.min)} bet.` : ''}${card.id === 'black' ? ' A Black card opens The Vault from Respected.' : ''}</p>
    <p class="cz-note">Hands ${cz.hands || 0} · all-time ${cz.net >= 0 ? '+' : '−'}${kM(Math.abs(cz.net || 0))} · best hand ${kM(cz.best || 0)}</p>
    <div class="cz-row"><label class="cz-check"><input type="checkbox" ${cz.quiet ? 'checked' : ''} data-c="quiet" data-v="${cz.quiet ? '0' : '1'}"> Discretion: keep my wins out of the Gazette</label></div>
  </div></div>`;
}

// ---------------------------------------------------------------- the owner's box on the company dashboard
export function casinoBox(c, l, ro) {
  if (l.type !== 'casino' || !c.casino) return '';
  const cs = c.casino, mo = cs.mo && cs.mo.m === c.m ? cs.mo : { net: 0, turn: 0, hands: 0, big: 0 }, cfg = cs.cfg;
  const rows = Object.entries(ROOMS).map(([id, r]) => `<div class="lrow"><span>${esc(r.name)} · ${kM(r.min)} – ${kM(CAS.maxBet(c, id))}</span>${ro ? '' : `<span class="seg sm">${C.maxX.map((x) => `<button data-a="casCfg" data-room="${id}" data-x="${x}" aria-pressed="${(cfg.max[id] || 1) === x}">${x === 1 ? 'Standard' : x < 1 ? 'Half' : 'Double'}</button>`).join('')}</span>`}</div>`).join('');
  const seated = Object.values(cs.tables).reduce((a, t) => a + t.seats.filter(Boolean).length, 0);
  return `<div class="box"><h2>Blackjack tables<small>${seated} SEATED</small></h2><div class="in">
    <div class="kpis sm"><div class="stat"><small>House result this month</small><b class="num ${mo.net >= 0 ? 'up' : 'down'}">${kM(mo.net)}</b></div><div class="stat"><small>Bets this month</small><b class="num">${kM(mo.turn)}</b><span class="sub">${mo.hands} hands</span></div><div class="stat"><small>Biggest win</small><b class="num">${kM(mo.big)}</b></div></div>
    <p class="empty" style="font-size:13px">What tycoons and rivals lose at the tables comes to the company, and what they win comes out of it. The house edge is small, so a lucky night can cost you. You never play against your own house.</p>
    <div class="cap">Table maximum</div><div class="ledger">${rows}</div>
    <div class="cap" style="margin-top:8px">Players Card cashback</div>${ro ? `<p>${esc((C.comp.find(([x]) => x === cfg.comp) || [0, 'Standard'])[1])}</p>` : `<span class="seg sm">${C.comp.map(([x, n]) => `<button data-a="casCfg" data-comp="${x}" aria-pressed="${cfg.comp === x}">${n}</button>`).join('')}</span>`}
    <div class="btns" style="margin-top:10px"><button class="btn gold" data-a="casino">Walk onto the floor</button></div>
  </div></div>`;
}

// ---------------------------------------------------------------- styles
function css() {
  if (document.getElementById('casino-css')) return;
  const s = document.createElement('style'); s.id = 'casino-css';
  s.textContent = `
#casino { position: absolute; inset: 0; z-index: 36; background: #07050a; color: #f3e6c4; font-family: 'Source Sans 3', system-ui, sans-serif; overflow: hidden; -webkit-user-select: none; user-select: none; }
#casino[hidden] { display: none; }
#casino button { font: inherit; color: inherit; }
.cz-wait { display: grid; place-items: center; height: 100%; font-family: 'Playfair Display', Georgia, serif; font-size: 22px; }
.cz-top { position: absolute; z-index: 20; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 10px; background: linear-gradient(#000d, #0000); }
.cz-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.cz-brand b { font-family: 'Playfair Display', Georgia, serif; font-size: 20px; letter-spacing: 0.12em; text-transform: uppercase; color: #ecc56a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cz-brand small { font-family: 'Cinzel', Georgia, serif; font-size: 11px; letter-spacing: 0.4em; color: #d8c08a; }
.cz-crown { width: 30px; color: #ecc56a; display: inline-flex; } .cz-crown svg { width: 100%; }
.cz-back { background: #0009; border: 1px solid #ecc56a66; border-radius: 20px; padding: 6px 12px; cursor: pointer; white-space: nowrap; }
.cz-pills { display: flex; gap: 6px; align-items: center; flex-wrap: nowrap; }
.cz-pill { border: 1px solid #ecc56a55; border-radius: 20px; padding: 5px 11px; background: #000a; font-size: 13px; white-space: nowrap; }
.cz-pill b { color: #ecc56a; margin-left: 4px; }
.cz-pill.btn { cursor: pointer; background: linear-gradient(#3a2a12, #1d1408); border-color: #ecc56a; color: #ecc56a; font-weight: 700; }
.cz-pill.x { padding: 5px 10px; }
.cz-pill.card-gold { color: #ecc56a; border-color: #ecc56a; } .cz-pill.card-black { background: #000; color: #fff; border-color: #fff8; } .cz-pill.card-silver { color: #d9dde3; }
/* lobby: three rooms side by side, the one under the pointer opens up */
.cz-lobby { position: absolute; inset: 0; }
.cz-rooms { position: absolute; inset: 0; display: flex; }
.cz-room { position: relative; flex: 1; border: 0; padding: 0; background-size: cover; background-position: center; cursor: pointer; transition: flex 0.6s cubic-bezier(.2,.8,.2,1), filter 0.4s; overflow: hidden; text-align: left; filter: saturate(0.85) brightness(0.8); }
.cz-room + .cz-room { border-left: 1px solid #ecc56a55; }
.cz-room:hover, .cz-room:focus-visible { flex: 2.1; filter: none; }
.cz-room.r-main { background-position: 35% center; } .cz-room.r-high { background-position: 30% center; } .cz-room.r-vault { background-position: 40% center; }
.cz-shade { position: absolute; inset: 0; background: linear-gradient(180deg, #0008 0%, #0000 25%, #0000 45%, #000e 100%); pointer-events: none; }
.cz-room-in { position: absolute; left: 0; right: 0; bottom: 0; padding: 26px 28px calc(30px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: 8px; }
.cz-room-in small { font-family: 'Cinzel', Georgia, serif; letter-spacing: 0.3em; font-size: 12px; color: #ecc56a; }
.cz-room-in h2 { margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: clamp(26px, 3.2vw, 46px); line-height: 1.05; color: #fff; text-shadow: 0 2px 20px #000; }
.cz-room-in p { margin: 0; max-width: 460px; font-size: 15px; line-height: 1.4; color: #eadfca; opacity: 0; max-height: 0; transition: opacity 0.4s, max-height 0.5s; }
.cz-room:hover .cz-room-in p, .cz-room:focus-visible .cz-room-in p { opacity: 1; max-height: 80px; }
.cz-lim { font-size: 13.5px; font-weight: 700; color: #f3e6c4; }
.cz-enter, .cz-lock { align-self: flex-start; margin-top: 6px; border: 1px solid #ecc56a; color: #ecc56a; padding: 8px 22px; border-radius: 30px; font-family: 'Cinzel', Georgia, serif; letter-spacing: 0.2em; font-size: 13px; background: #0007; }
.cz-lock { border-color: #fff5; color: #ddd; letter-spacing: 0.03em; font-family: inherit; }
.cz-room.locked { filter: grayscale(0.6) brightness(0.55); }
.cz-room.r-main .cz-room-in h2 { color: #d7e4ff; } .cz-room.r-high .cz-room-in h2 { color: #d9f0dc; } .cz-room.r-vault .cz-room-in h2 { color: #ffd9d2; }
@media (max-width: 760px) { .cz-rooms { flex-direction: column; } .cz-room + .cz-room { border-left: 0; border-top: 1px solid #ecc56a55; } .cz-room:hover { flex: 1.6; } .cz-room-in { padding: 16px 18px 18px; } .cz-room-in p { display: none; } .cz-pill.hide-s, .hide-s { display: none; } .cz-room:first-child .cz-room-in { padding-top: 70px; } }
/* a room and its tables */
.cz-roomv { position: absolute; inset: 0; background-size: cover; background-position: center; overflow-y: auto; }
.cz-roomv .cz-shade { position: fixed; background: linear-gradient(90deg, #000d 0%, #000a 45%, #0004 100%); }
.cz-roomp { position: relative; max-width: 640px; padding: 90px 22px 40px clamp(18px, 5vw, 64px); display: flex; flex-direction: column; gap: 12px; }
.cz-roomp h2 { margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: clamp(30px, 4vw, 52px); color: #fff; }
.cz-roomp p { margin: 0; line-height: 1.45; color: #eadfca; }
.cz-rules { font-size: 13.5px; color: #d8c08a; border-top: 1px solid #ecc56a44; border-bottom: 1px solid #ecc56a44; padding: 8px 0; line-height: 1.5; }
.cz-tlist { display: flex; flex-direction: column; gap: 10px; }
.cz-tcard { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: #0b0806cc; border: 1px solid #ecc56a44; backdrop-filter: blur(6px); }
.cz-tcard > div:first-child { flex: 1; display: flex; flex-direction: column; } .cz-tcard small { color: #cbb98f; font-size: 12.5px; }
.cz-seats { display: flex; gap: 4px; } .cz-seats i { width: 26px; height: 26px; border-radius: 50%; border: 1px dashed #ecc56a66; display: grid; place-items: center; font-style: normal; font-size: 10.5px; font-weight: 700; }
.cz-seats i.p { background: #ecc56a; color: #1a1206; border: 0; } .cz-seats i.b { background: #6b3a3a; border: 0; }
.cz-btn { border: 1px solid #ecc56a88; background: #1c150c; border-radius: 10px; padding: 8px 14px; cursor: pointer; font-weight: 700; white-space: nowrap; }
.cz-btn.gold { background: linear-gradient(#f2d27a, #c4952b); color: #1a1206; border: 0; }
.cz-btn:disabled { opacity: 0.4; cursor: default; }
.cz-note { font-size: 13px; color: #cbb98f; } .cz-note a, .cz-roomp a { color: #ecc56a; }
/* the table */
.cz-tablev { position: absolute; inset: 0; background-size: cover; background-position: center; }
.cz-tablev::before { content: ''; position: absolute; inset: 0; background: #0009; backdrop-filter: blur(10px) brightness(0.6); }
.cz-stage { --cw: min(5.4vw, 9.6vh); position: absolute; left: 50%; top: 50%; width: min(100vw, 177.7vh); aspect-ratio: 16 / 9; transform: translate(-50%, -50%); }
.cz-felt { position: absolute; inset: 0; background: var(--felt) center / 100% 100% no-repeat; filter: drop-shadow(0 20px 40px #000); }
.cz-print { position: absolute; left: 50%; top: 52%; transform: translateX(-50%); font-family: 'Cinzel', Georgia, serif; color: #e7c77a; opacity: 0.8; font-size: calc(var(--cw) * 0.2); letter-spacing: 0.18em; white-space: nowrap; text-transform: uppercase; }
.cz-shoe { position: absolute; right: 12%; top: 7%; width: calc(var(--cw) * 1.9); height: calc(var(--cw) * 1.25); transform: rotate(-14deg); }
.cz-shoe-cards { position: absolute; left: 12%; top: 14%; width: 46%; height: 72%; border-radius: 4px; background-size: cover; background-position: center; box-shadow: calc(var(--left) * 14px) 0 0 -1px #e8e0cc, calc(var(--left) * 7px) 0 0 -1px #f4eedf; }
.cz-shoe-box { position: absolute; inset: 0; border-radius: 10px 40% 12px 12px / 10px 50% 12px 12px; background: linear-gradient(160deg, #5a321c, #24140b 60%, #120a06); box-shadow: 0 10px 18px #000a, inset 0 2px 0 #ffffff22; clip-path: polygon(0 0, 0 100%, 100% 100%, 100% 32%, 62% 0); }
.cz-shoe-box::after { content: ''; position: absolute; left: 9%; top: 11%; width: 52%; height: 78%; border: 2px solid #c79a4a; border-radius: 5px; }
.cz-shoe-cards { z-index: 1; }
.cz-plaque { position: absolute; left: 9%; top: 8%; transform: rotate(-10deg); background: linear-gradient(#1d1d1d, #050505); border: 1px solid #ecc56a77; padding: calc(var(--cw) * 0.12) calc(var(--cw) * 0.22); border-radius: 4px; font-size: calc(var(--cw) * 0.17); line-height: 1.45; color: #e9dcbf; box-shadow: 6px 10px 16px #0009; }
.cz-plaque b { display: block; font-family: 'Cinzel', Georgia, serif; color: #ecc56a; letter-spacing: 0.15em; text-transform: uppercase; }
.cz-dealer { position: absolute; left: 50%; top: 12%; transform: translateX(-50%); display: flex; align-items: center; gap: calc(var(--cw) * 0.2); }
.cz-dealer.empty .cz-dname { font-family: 'Playfair Display', Georgia, serif; font-style: italic; color: #e7c77a; opacity: 0.85; font-size: calc(var(--cw) * 0.24); }
.cz-cards { display: flex; }
.cz-card { position: relative; width: var(--cw); height: calc(var(--cw) * 1.45); border-radius: calc(var(--cw) * 0.08); background: linear-gradient(160deg, #fffdf6, #f1ecdf); box-shadow: 0 3px 8px #0008, 0 0 0 1px #0002; color: #16161a; font-family: 'Playfair Display', Georgia, serif; font-weight: 700; flex: none; }
.cz-card + .cz-card { margin-left: calc(var(--cw) * -0.6); }
.cz-card.red { color: #b3122a; }
.cz-card.back { background: #222; } .cz-backimg { position: absolute; inset: 0; border-radius: inherit; background-size: cover; background-position: center; }
.cz-ix { position: absolute; left: 5%; top: 3%; font-size: calc(var(--cw) * 0.22); line-height: 0.95; text-align: center; letter-spacing: -0.06em; }
.cz-ix.b { left: auto; top: auto; right: 5%; bottom: 3%; transform: rotate(180deg); }
.cz-pip { position: absolute; transform: translate(-50%, -50%); font-size: calc(var(--cw) * 0.21); line-height: 1; } .cz-pip.f { transform: translate(-50%, -50%) rotate(180deg); }
.cz-ace { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: calc(var(--cw) * 0.62); }
.cz-court { position: absolute; inset: 15% 17%; border: 1.5px solid currentColor; border-radius: 4px; display: grid; place-items: center; background: linear-gradient(160deg, #f7e7b8, #e2c57d); overflow: hidden; }
.cz-court em { font-style: normal; font-size: calc(var(--cw) * 0.5); line-height: 1; } .cz-court i { position: absolute; bottom: 4%; font-style: normal; font-size: calc(var(--cw) * 0.22); }
.cz-court u { position: absolute; top: 5%; text-decoration: none; width: 46%; display: grid; place-items: center; font-size: calc(var(--cw) * 0.2); color: #8a6516; } .cz-court u svg { width: 100%; }
/* dealt: slides face down from the shoe (--dx/--dy, set in fly()) to its spot, then a card for a player is turned over */
.cz-card.deal { animation: czDeal 1.2s both; z-index: 4; }
@keyframes czDeal { 0% { transform: translate(var(--dx, calc(var(--cw) * 7)), var(--dy, calc(var(--cw) * -6))) rotate(-14deg) scale(0.62); opacity: 0; animation-timing-function: cubic-bezier(.25,.7,.3,1); } 4% { opacity: 1; } 50%, 100% { transform: none; } }
.cz-card.deal.up { animation-name: czDealUp; }
@keyframes czDealUp { 0% { transform: translate(var(--dx, calc(var(--cw) * 7)), var(--dy, calc(var(--cw) * -6))) rotate(-14deg) scale(0.62); opacity: 0; animation-timing-function: cubic-bezier(.25,.7,.3,1); } 4% { opacity: 1; } 50% { transform: none; animation-timing-function: ease-in; } 72% { transform: translateY(calc(var(--cw) * -0.22)) scaleX(0.02); animation-timing-function: ease-out; } 100% { transform: none; } }
.cz-card.flip { animation: czFlip 0.7s ease-in-out both; }
@keyframes czFlip { 0% { transform: none; } 45% { transform: translateY(calc(var(--cw) * -0.25)) scaleX(0.02); } 55% { transform: translateY(calc(var(--cw) * -0.25)) scaleX(0.02); } 100% { transform: none; } }
.cz-flipb { position: absolute; inset: 0; border-radius: inherit; z-index: 3; opacity: 0; }
.cz-flipb.flip { animation: czFlipB 0.7s steps(1, end) both; }
.cz-flipb.deal { animation: czDealB 1.2s steps(1, end) both; }
@keyframes czFlipB { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 0; } }
@keyframes czDealB { 0% { opacity: 1; } 72% { opacity: 0; } 100% { opacity: 0; } }
/* gathered after Next hand: each card turns face down on its way to the discard tray (--gx/--gy from fly()) */
.cz-card.gone { animation: czGone 0.75s cubic-bezier(.4,0,.7,1) both; z-index: 4; }
@keyframes czGone { 0% { transform: none; } 30% { transform: translateY(calc(var(--cw) * -0.2)) scaleX(0.02); } 45% { transform: translateY(calc(var(--cw) * -0.2)); } 100% { transform: translate(var(--gx, 0), var(--gy, -200px)) rotate(12deg) scale(0.62); opacity: 0.9; } }
.cz-flipb.gone { animation: czGoneB 0.75s steps(1, end) both; }
@keyframes czGoneB { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 1; } }
.cz-discard { position: absolute; left: 27%; top: 5%; width: calc(var(--cw) * 1.1); height: calc(var(--cw) * 1.5); transform: rotate(9deg); border-radius: 8px; border: 1.5px solid #ecc56a55; background: #0005; box-shadow: inset 0 2px 8px #000a; }
.cz-discard span { position: absolute; left: 7%; right: 7%; bottom: 5%; height: calc(var(--n) * 88% + 2%); border-radius: 4px; background-size: cover; background-position: center top; box-shadow: 0 -1px 0 #e8e0cc, 0 -3px 0 #f4eedf; opacity: calc(0.25 + var(--n)); }
.cz-tablev.tall .cz-discard { left: 6%; top: 3%; }
.cz-spot { overflow: visible; }
.cz-win { position: absolute; left: 105%; top: 18%; animation: czPop 0.35s both; }
.cz-fly { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 6; }
.cz-fly.take, .cz-fly.pay { animation: czChip 0.8s cubic-bezier(.4,0,.3,1) both; }
@keyframes czChip { 0% { transform: translate(-50%, -50%); opacity: 1; } 85% { opacity: 1; } 100% { transform: translate(calc(-50% + var(--gx, 0px)), calc(-50% + var(--gy, 0px))) scale(0.7); opacity: 0; } }

/* loading curtain before a table */
.cz-load { position: absolute; inset: 0; z-index: 60; background: #050302; animation: czLoad ${LOAD}ms ease both; pointer-events: auto; overflow: hidden; }
@keyframes czLoad { 0% { opacity: 0; } 10%, 84% { opacity: 1; } 100% { opacity: 0; } }
.cz-load-img { position: absolute; inset: 0; background-size: cover; background-position: 60% 72%; animation: czLoadZoom ${LOAD}ms ease-out both; }
@keyframes czLoadZoom { from { transform: scale(1.08); } to { transform: scale(1); } }
.cz-load::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, #000d 0%, #0008 45%, #0000 75%), linear-gradient(0deg, #000c, #0000 40%); }
.cz-load-txt { position: absolute; left: 7%; bottom: 14%; z-index: 1; display: flex; flex-direction: column; gap: 10px; max-width: 86%; }
.cz-load-txt small { font-family: 'Cinzel', Georgia, serif; color: #ecc56a; letter-spacing: 0.2em; text-transform: uppercase; font-size: 13px; }
.cz-load-txt b { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-weight: 600; color: #fff; font-size: clamp(30px, 5vw, 60px); line-height: 1.05; text-shadow: 0 2px 18px #000; }
.cz-load-bar { width: min(320px, 70vw); height: 3px; background: #ffffff22; border-radius: 2px; overflow: hidden; margin-top: 6px; }
.cz-load-bar i { display: block; height: 100%; background: linear-gradient(90deg, #b88a2c, #ecc56a); transform-origin: left; animation: czLoadBar ${LOAD - 400}ms ease-in-out both; }
@keyframes czLoadBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }

/* the dealing is the game's pace, not decoration: keep it when the device asks for reduced motion (index.html turns every other animation off) */
@media (prefers-reduced-motion: reduce) {
  #casino .cz-card.deal { animation: czDeal 1.2s both !important; } #casino .cz-card.deal.up { animation-name: czDealUp !important; }
  #casino .cz-card.flip { animation: czFlip 0.7s ease-in-out both !important; }
  #casino .cz-flipb.flip { animation: czFlipB 0.7s steps(1, end) both !important; } #casino .cz-flipb.deal { animation: czDealB 1.2s steps(1, end) both !important; }
  #casino .cz-card.gone { animation: czGone 0.75s cubic-bezier(.4,0,.7,1) both !important; } #casino .cz-flipb.gone { animation: czGoneB 0.75s steps(1, end) both !important; }
  #casino .cz-fly.take, #casino .cz-fly.pay { animation: czChip 0.8s cubic-bezier(.4,0,.3,1) both !important; } #casino .cz-win { animation: czPop 0.35s both !important; }
  #casino .cz-load { animation: czLoad ${LOAD}ms ease both !important; } #casino .cz-load-bar i { animation: czLoadBar ${LOAD - 400}ms ease-in-out both !important; }
  #casino .cz-res { animation: czPop 0.35s both !important; } #casino .cz-banner { animation: czBan 0.5s both !important; }
}
.cz-tot { min-width: calc(var(--cw) * 0.5); height: calc(var(--cw) * 0.5); padding: 0 calc(var(--cw) * 0.08); border-radius: 999px; background: #0c0c0c; border: 2px solid #ecc56a; display: grid; place-items: center; font-weight: 800; font-size: calc(var(--cw) * 0.2); color: #fff; font-family: 'Montserrat', sans-serif; white-space: nowrap; }
.cz-seat { position: absolute; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: calc(var(--cw) * 0.1); }
.cz-seat:not(.me) { --cw: min(4.3vw, 7.6vh); }
.cz-hands { display: flex; gap: calc(var(--cw) * 0.35); align-items: flex-end; }
.cz-hand { position: relative; display: flex; flex-direction: column; align-items: center; gap: calc(var(--cw) * 0.08); padding: calc(var(--cw) * 0.06); border-radius: 8px; }
.cz-hand.on { box-shadow: 0 0 0 2px #ecc56a, 0 0 24px #ecc56a88; }
.cz-hand .cz-tot { position: absolute; left: calc(var(--cw) * -0.62); top: calc(var(--cw) * 0.45); }
.cz-res { position: absolute; top: calc(var(--cw) * -0.38); left: 50%; transform: translateX(-50%); padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: calc(var(--cw) * 0.17); white-space: nowrap; animation: czPop 0.35s both; z-index: 2; font-family: 'Montserrat', sans-serif; }
.cz-res.win { background: #1f8a4a; color: #fff; } .cz-res.lose { background: #6d1520; color: #fff; } .cz-res.push { background: #333; color: #eee; }
@keyframes czPop { from { opacity: 0; transform: translateX(-50%) scale(0.6); } }
.cz-bets { display: flex; align-items: center; gap: calc(var(--cw) * 0.2); }
.cz-side-l { display: contents; }
.cz-spot { order: 2; width: calc(var(--cw) * 1.25); height: calc(var(--cw) * 1.25); border-radius: 50%; border: 2px solid #ecc56acc; display: grid; place-items: center; position: relative; }
.cz-seat.me .cz-spot { cursor: pointer; }
.cz-side { width: calc(var(--cw) * 0.85); height: calc(var(--cw) * 0.85); border-radius: 50%; border: 1.5px dashed #ecc56a99; display: grid; place-items: center; position: relative; cursor: pointer; }
.cz-side.pp { order: 1; } .cz-side.t3 { order: 3; }
.cz-side small { position: absolute; top: -1.4em; font-size: calc(var(--cw) * 0.14); color: #e7c77a; white-space: nowrap; font-weight: 700; }
.cz-side em { position: absolute; bottom: -1.6em; font-style: normal; font-size: calc(var(--cw) * 0.14); white-space: nowrap; font-weight: 800; } .cz-side em.win { color: #7ee2a8; } .cz-side em.lose { color: #bbb; }
.cz-spot.sel, .cz-side.sel { box-shadow: 0 0 0 3px #ecc56a66, 0 0 18px #ecc56a99; border-style: solid; }
.cz-stack { position: relative; width: calc(var(--cw) * 0.8); height: calc(var(--cw) * 0.8); display: block; }
.cz-stack img { position: absolute; left: 0; top: 0; width: 100%; height: 100%; transform: translateY(calc(var(--i) * var(--cw) * -0.1)); filter: drop-shadow(0 2px 2px #0009); }
.cz-stack b { position: absolute; left: 50%; top: 100%; transform: translateX(-50%); margin-top: 2px; font-size: calc(var(--cw) * 0.15); white-space: nowrap; background: #000b; padding: 0 5px; border-radius: 4px; color: #fff; font-family: 'Montserrat', sans-serif; }
.cz-stack.sm { width: calc(var(--cw) * 0.55); height: calc(var(--cw) * 0.55); }
.cz-name { font-size: calc(var(--cw) * 0.16); background: #000a; border: 1px solid #ecc56a55; padding: 2px 9px; border-radius: 10px; white-space: nowrap; margin-top: calc(var(--cw) * 0.14); display: flex; gap: 6px; align-items: center; }
.cz-seat.me .cz-name { color: #ecc56a; font-weight: 700; }
.cz-seat.turn .cz-name { border-color: #ecc56a; }
.cz-clock { color: #ffd27a; font-weight: 800; } .cz-clock.low { color: #ff7b7b; animation: czBlink 1s steps(2) infinite; }
@keyframes czBlink { 50% { opacity: 0.45; } }
.cz-timer { position: relative; align-self: stretch; min-width: min(420px, 100%); height: 24px; border-radius: 11px; background: #000b; border: 1px solid #ecc56a66; overflow: hidden; margin-bottom: 6px; --f: 1; }
.cz-timer i { position: absolute; inset: 0; transform-origin: left; transform: scaleX(var(--f)); background: linear-gradient(90deg, #b88a2c, #ecc56a); transition: transform 0.2s linear; }
.cz-timer.low i { background: linear-gradient(90deg, #8b1a24, #e0444f); }
.cz-timer span { position: relative; display: flex; justify-content: space-between; padding: 0 12px; font-size: 13px; line-height: 22px; font-weight: 700; color: #fff; text-shadow: 0 1px 2px #000; }
.cz-timer.low span b { animation: czBlink 1s steps(2) infinite; }
.cz-banner { position: absolute; left: 50%; top: 37%; transform: translate(-50%, -50%); padding: calc(var(--cw) * 0.15) calc(var(--cw) * 0.5); border-radius: 12px; background: #000c; border: 1.5px solid #ecc56a; text-align: center; animation: czBan 0.5s both; z-index: 5; pointer-events: none; }
.cz-banner b { display: block; font-family: 'Playfair Display', Georgia, serif; font-size: calc(var(--cw) * 0.42); color: #fff; }
.cz-banner span { font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: calc(var(--cw) * 0.3); }
.cz-banner.win span { color: #7ee2a8; } .cz-banner.win { border-color: #7ee2a8; box-shadow: 0 0 40px #1f8a4a88; } .cz-banner.lose span { color: #ff9a9a; } .cz-banner.push span { color: #ddd; }
@keyframes czBan { from { opacity: 0; transform: translate(-50%, -40%) scale(0.85); } }
.cz-talk { position: absolute; left: 6%; top: 25%; width: 20%; display: flex; flex-direction: column-reverse; gap: 4px; pointer-events: none; }
.cz-talk p { margin: 0; font-size: calc(var(--cw) * 0.15); color: #eadfca; background: #0008; padding: 3px 8px; border-radius: 8px; opacity: 0.55; }
.cz-talk p.new { opacity: 1; } .cz-talk p.pit { color: #ffd27a; } .cz-talk p b { color: #ecc56a; }
/* controls: chips on the left, moves on the right (a row at the bottom on a phone) */
.cz-ctl { position: absolute; z-index: 15; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; padding: 12px 16px calc(14px + env(safe-area-inset-bottom, 0px)); pointer-events: none; }
.cz-ctl > * { pointer-events: auto; }
.cz-rack { display: flex; align-items: center; gap: 6px; background: #000b; border: 1px solid #ecc56a55; border-radius: 40px; padding: 6px 14px 6px 8px; }
.cz-chip { width: 52px; height: 52px; padding: 0; border: 0; background: none; cursor: pointer; border-radius: 50%; transition: transform 0.12s; }
.cz-chip img { width: 100%; height: 100%; display: block; filter: drop-shadow(0 3px 4px #000a); }
.cz-chip:hover:not(:disabled) { transform: translateY(-4px); } .cz-chip:active:not(:disabled) { transform: scale(0.93); }
.cz-chip:disabled { opacity: 0.35; cursor: default; }
.cz-bal { display: flex; flex-direction: column; margin-left: 6px; line-height: 1.15; } .cz-bal small { font-size: 11px; opacity: 0.75; } .cz-bal b { color: #ecc56a; font-size: 18px; font-family: 'Montserrat', sans-serif; }
.cz-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.cz-acts { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.cz-act { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 72px; background: none; border: 0; cursor: pointer; font-size: 11.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #f3e6c4; }
.cz-act i { width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; font-style: normal; font-size: 20px; background: radial-gradient(circle at 40% 30%, #3b3b3b, #0d0d0d); border: 2px solid #ecc56a; box-shadow: 0 4px 10px #000a; }
.cz-act.deal i { background: radial-gradient(circle at 40% 30%, #f2d27a, #b8862a); color: #1a1206; }
.cz-act.hint i { box-shadow: 0 0 0 3px #7ee2a8, 0 0 20px #7ee2a8; }
.cz-act.sm i { width: 40px; height: 40px; font-size: 16px; }
.cz-act:disabled { opacity: 0.3; cursor: default; }
.cz-act:hover:not(:disabled) i { transform: translateY(-2px); }
.cz-target, .cz-waitp { margin: 0; font-size: 13px; background: #000a; padding: 4px 10px; border-radius: 8px; } .cz-target b { color: #ecc56a; }
.cz-flash { background: #6d1520; color: #fff; padding: 5px 10px; border-radius: 8px; font-size: 13px; font-weight: 700; }
/* phone: the table fills the screen between the top bar and the controls */
.cz-tablev.tall .cz-stage { --cw: min(14vw, 8vh); width: 100%; height: auto; top: 56px; bottom: 170px; aspect-ratio: auto; transform: translateX(-50%); }
.cz-tablev.tall .cz-seat:not(.me) { --cw: min(10vw, 6vh); }
.cz-tablev.tall .cz-felt { background-size: auto 125%; background-position: center 100%; }
.cz-tablev.tall .cz-plaque, .cz-tablev.tall .cz-talk { display: none; }
.cz-tablev.tall .cz-shoe { right: 3%; top: 3%; }
.cz-tablev.tall .cz-dealer { top: 6%; }
.cz-tablev.tall .cz-ctl { flex-direction: column-reverse; align-items: stretch; gap: 8px; padding: 8px 10px calc(10px + env(safe-area-inset-bottom, 0px)); }
.cz-tablev.tall .cz-rack { justify-content: center; padding: 5px 8px; gap: 3px; }
.cz-tablev.tall .cz-chip { width: 42px; height: 42px; }
.cz-tablev.tall .cz-bal b { font-size: 15px; }
.cz-tablev.tall .cz-right { align-items: center; }
.cz-tablev.tall .cz-acts { justify-content: center; gap: 0; flex-wrap: nowrap; }
.cz-tablev.tall .cz-act { width: 15.5vw; max-width: 64px; font-size: 8.5px; letter-spacing: 0.02em; } .cz-tablev.tall .cz-act i { width: 44px; height: 44px; font-size: 16px; } .cz-tablev.tall .cz-act.sm i { width: 36px; height: 36px; }
.cz-tablev.tall .cz-print { top: 34%; }
@media (max-width: 520px) { .cz-brand small { display: none; } .cz-lobby .cz-brand b { font-size: 15px; } .cz-tablev .cz-brand b, .cz-roomv .cz-brand > b { display: none; } }
/* the cashier */
.cz-cashier { position: absolute; inset: 0; z-index: 30; background: #000a; display: grid; place-items: center; padding: 16px; }
.cz-cbox { width: min(460px, 100%); max-height: 100%; overflow-y: auto; background: linear-gradient(#1d150b, #0d0905); border: 1px solid #ecc56a77; border-radius: 16px; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 20px 60px #000; -webkit-user-select: text; user-select: text; }
.cz-cbox header { display: flex; justify-content: space-between; align-items: center; } .cz-cbox header b { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #ecc56a; }
.cz-x { background: none; border: 0; font-size: 18px; cursor: pointer; }
.cz-cgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; } .cz-cgrid div { background: #0007; border-radius: 10px; padding: 8px 10px; display: flex; flex-direction: column; } .cz-cgrid small { font-size: 11.5px; opacity: 0.75; } .cz-cgrid b { font-size: 17px; font-family: 'Montserrat', sans-serif; } .cz-cgrid .up { color: #7ee2a8; } .cz-cgrid .down { color: #ff9a9a; }
.cz-cap { font-family: 'Cinzel', Georgia, serif; font-size: 12px; letter-spacing: 0.2em; color: #ecc56a; text-transform: uppercase; margin-top: 4px; }
.cz-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.cz-row input, .cz-row select { background: #0009; color: #f3e6c4; border: 1px solid #ecc56a66; border-radius: 8px; padding: 7px 10px; font: inherit; }
.cz-row input { width: 140px; }
.cz-check { display: flex; gap: 8px; align-items: center; font-size: 13.5px; cursor: pointer; }
`;
  s.textContent += POKER_CSS;
  document.head.appendChild(s);
}
