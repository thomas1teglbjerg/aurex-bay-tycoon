// Marina Royale: the Texas Hold'em tables on the Main Floor, drawn inside the casino overlay (js/casino.js).
// Rules, money and the hidden deck live in supabase/functions/_shared/poker.js. Every hand is a list of events with
// the moment each one shows; this file replays them (PK.view) so cards fly from the dealer one at a time, bets slide in,
// the pot is gathered after each street, hands turn over at the showdown, the pot goes to the winner and the table is
// cleared before the next hand. Your own two cards come in the server's answers (r.hole), never in the city state.
import * as E from '../supabase/functions/_shared/engine.js';
import { CASINO } from '../supabase/functions/_shared/content.js';
import { city, meId, esc } from './util.js';
import { CZ, img, kM, face, chipStack, topBar, send, cas, loading } from './casino.js';

const PK = E.PK, P = CASINO.poker, MS = P.ms, DUR = 1200, GONE = 750;
const S = () => (CZ.pk = CZ.pk || { tid: null, raise: 0, rkey: '', hole: null, asked: '', buy: null, lastTick: 0 });
const tableOf = (tid) => (city().casino && city().casino.pk && city().casino.pk[tid]) || null;
export const pokerSeat = () => { const c = city(); return c && c.casino && c.casino.pk ? PK.seatOf(c, meId()) : null; };
const initials = (n) => esc(String(n || '?').split(' ').map((x) => x[0]).join('').slice(0, 2));
const back = () => `<span class="cz-backimg" style="background-image:url('${img(CASINO.rooms.main.back, 'webp')}')"></span>`;

// ---------------------------------------------------------------- talking to the server
async function psend(action, args) { const r = await send(action, args); if (r && r.hole) { const o = S().hole; S().hole = r.hole; if (!o || o.n !== r.hole.n || o.tid !== r.hole.tid) CZ.redraw(); } return r; }
export function pokerOpen(tid) { const st = S(); st.tid = tid; st.buy = null; CZ.view = 'poker'; }
// the server moves a table on when somebody asks: whoever sits or watches asks once a clock or the pause has run out
export function pokerTick() {
  const st = S(), now = Date.now();
  if (CZ.view === 'room' && CZ.room === 'main') { // keep the bots dealing while the room is open
    if (now - st.lastTick > 20000 && PK.tables(city()).some((t) => (!t.h || t.h.done) && now > (t.next || 0) + 500)) { st.lastTick = now; psend('pkTick', {}); }
    return;
  }
  if (CZ.view !== 'poker') return;
  const t = tableOf(st.tid); if (!t) return;
  const h = t.h, at = pokerSeat(), mine = at && at.t === t ? at.i : -1;
  // your two cards for a hand that someone else's move dealt
  if (h && mine >= 0 && h.ids[mine] === meId() && !(st.hole && st.hole.tid === t.id && st.hole.n === h.n) && st.asked !== t.id + h.n) { st.asked = t.id + h.n; psend('pkHole', {}); }
  const due = (h && !h.done && h.dl && now > h.dl + 400) || ((!h || h.done) && now > (t.next || 0) + 400);
  if (due && now - st.lastTick > 2500) { st.lastTick = now; psend('pkTick', { tid: t.id }); }
  // redraw while something moves on the table
  const v = h && PK.view(t, now), moving = v && (v.pending || now < Math.max(v.lastAt, t.vis || 0) + DUR + 200 || (h.done && now > t.next - MS.clear - 200 && now < t.next + 1500));
  if (moving && now - (st.drawn || 0) > 170) { st.drawn = now; CZ.redraw(); }
}

// ---------------------------------------------------------------- clicks
export async function pokerClick(d) {
  const st = S(), at = pokerSeat();
  switch (d.c) {
    case 'pkWatch': { const here = pokerSeat(); if (here && here.t.id === d.t) { pokerOpen(d.t); CZ.redraw(); return true; }
      await loading(label(d.t), () => psend('pkTick', { tid: d.t })); pokerOpen(d.t); CZ.redraw(); return true; }
    case 'pkBuy': st.buy = st.buy === d.t ? null : d.t; CZ.redraw(); return true;
    case 'pkSit': { const watching = CZ.view === 'poker' && st.tid === d.t, go = () => psend('pkSit', { tid: d.t, buy: Number(d.v) }), r = watching ? await go() : await loading(label(d.t), go); if (r && r.ok) { pokerOpen(d.t); CZ.redraw(); } return true; }
    case 'pkLeave': { if (at) { const r = await psend('pkLeave', {}); if (!(r && r.ok)) return true; } st.tid = null; CZ.view = 'room'; CZ.room = 'main'; CZ.redraw(); return true; }
    case 'pkTop': await psend('pkTop', {}); return true;
    case 'pkChip': { const o = myOpts(); if (!o) return true; st.raise = Math.min(o.max, Math.max(o.min, (st.raise || o.min) + Number(d.v))); CZ.redraw(); return true; }
    case 'pkSet': { const o = myOpts(); if (!o) return true; const t = tableOf(st.tid), v = PK.view(t, Date.now()), pot = v.pot + Object.values(v.bet).reduce((a, b) => a + b, 0);
      const want = d.v === 'min' ? o.min : d.v === 'max' ? o.max : o.cur + Math.round((pot + o.call) * Number(d.v));
      st.raise = Math.min(o.max, Math.max(o.min, want)); CZ.redraw(); return true; }
    case 'pkMove': {
      const m = d.m, o = myOpts(); if (!o) return true;
      const r = await psend('pk' + m, m === 'Raise' ? { to: Math.max(o.min, st.raise || o.min) } : {});
      if (r && r.ok) st.raise = 0; return true;
    }
  }
  return false;
}
const label = (tid) => { const t = tableOf(tid); return `Main Floor · Hold'em ${t ? t.no : ''}`; };
function myOpts() {
  const at = pokerSeat(); if (!at || at.t.id !== S().tid) return null;
  const v = PK.view(at.t, Date.now()); if (!v || v.turn !== at.i) return null;
  return PK.options(at.t, at.i);
}

// ---------------------------------------------------------------- the room list on the Main Floor
export function pokerRoomHTML() {
  const c = city(), st = S(), chips = cas().chips || 0, at = pokerSeat();
  const list = PK.tables(c).map((t) => {
    const D = PK.def(t), seats = t.seats.map((s) => `<i class="${s ? (s.k === 'p' ? 'p' : 'b') : ''}" title="${s ? esc(s.name) + ' · ' + kM(s.stack) : 'Free seat'}">${s ? initials(s.name) : ''}</i>`).join('');
    const free = t.seats.filter((s) => !s).length, here = at && at.t === t;
    const buys = [D.min, Math.round((D.min + D.max) / 2 / D.bb) * D.bb, D.max];
    const picker = st.buy === t.id ? `<div class="pk-buy"><span>Buy in with</span>${buys.map((v) => `<button class="cz-btn${v === D.max ? ' gold' : ''}" data-c="pkSit" data-t="${t.id}" data-v="${v}" ${v <= chips ? '' : 'disabled'}>${kM(v)}</button>`).join('')}${chips < D.min ? `<span class="cz-note">You need ${kM(D.min)} in chips. <a href="#" data-c="cashier">Cashier</a></span>` : ''}</div>` : '';
    return `<div class="cz-tcard pk-tcard"><div><b>Hold'em ${t.no} · blinds ${D.sb}/${D.bb} k</b><small>Dealer ${esc(t.dealer)} · buy-in ${kM(D.min)} – ${kM(D.max)} · No limit${t.h ? ` · hand ${t.h.n}` : ''}</small></div>
      <div class="cz-seats">${seats}</div><div class="pk-tb"><button class="cz-btn" data-c="pkWatch" data-t="${t.id}">${here ? 'Back to the table' : 'Watch'}</button>${here ? '' : `<button class="cz-btn gold" data-c="pkBuy" data-t="${t.id}" ${free ? '' : 'disabled'}>${free ? 'Take a seat' : 'Full'}</button>`}</div>${picker}</div>`;
  }).join('');
  return `<h3 class="pk-h">Texas Hold'em</h3><div class="cz-rules">No limit · Six seats · Play the other tycoons and the rivals · The house takes ${Math.round(P.rake * 100)}% of the pot when the flop is dealt, at most ${P.rakeCap} big blinds · Your stack goes back to your chips when you leave</div><div class="cz-tlist">${list}</div>`;
}

// ---------------------------------------------------------------- the table
const WIDE = [[50, 83], [15, 67], [15, 26], [50, 8], [85, 26], [85, 67]], TALL = [[50, 86], [14, 64], [14, 30], [50, 8], [86, 30], [86, 64]];
const anim = (at, now) => `animation-delay:${((at - now) / 1000).toFixed(2)}s !important`;
function card(cd, at, now, opts = {}) {
  // a card that lands at `at`: flies from the dealer face down, turned face up on the spot if we know it
  const cls = ['cz-card', 'pk-c']; let style = '', over = '';
  const flying = at && now < at + DUR;
  if (cd == null) cls.push('back'); else if (E.CAS.red(cd)) cls.push('red');
  if (opts.gone != null) { cls.push('gone'); style = anim(opts.gone, now); if (cd != null) over = `<span class="cz-flipb gone" style="${style}">${back()}</span>`; return `<span class="${cls.join(' ')}" data-to="deck" style="${style}">${cd == null ? back() : face(cd) + over}</span>`; }
  if (opts.flip != null && now < opts.flip + 700 && cd != null) { cls.push('flip'); style = anim(opts.flip, now); over = `<span class="cz-flipb flip" style="${style}">${back()}</span>`; }
  else if (flying) { cls.push('deal'); if (cd != null) cls.push('up'); style = anim(at, now); if (cd != null) over = `<span class="cz-flipb deal" style="${style}">${back()}</span>`; }
  return `<span class="${cls.join(' ')}" ${flying ? 'data-from="deck"' : ''} style="${style}">${cd == null ? back() : face(cd) + over}</span>`;
}
const SAY = { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise', allin: 'All in', sb: 'Small blind', bb: 'Big blind' };
export function pokerHTML() {
  const c = city(), st = S(), t = tableOf(st.tid); if (!t) { CZ.view = 'room'; return ''; }
  const now = Date.now(), D = PK.def(t), h = t.h, v = h ? PK.view(t, now) : null, at = pokerSeat(), mine = at && at.t === t ? at.i : -1;
  const tall = innerWidth / Math.max(1, innerHeight) < 0.95, pos = tall ? TALL : WIDE, base = mine >= 0 ? mine : 0;
  const clearing = h && h.done && now >= t.next - MS.clear, cleared = h && h.done && now >= t.next;
  const hole = st.hole && h && st.hole.tid === t.id && st.hole.n === h.n ? st.hole.c : null;
  const seatAt = (i) => pos[(i - base + 6) % 6];
  // the deal order: card k of the deal event lands at dealAt + k × card
  const dealt = {}; if (v && v.dealAt) v.dealt.forEach((s, k) => { (dealt[s] = dealt[s] || []).push(v.dealAt + k * MS.card); });
  const foldAt = {}; if (h) h.ev.forEach((e) => { if (e.k === 'act' && e.a === 'fold' && e.at <= now) foldAt[e.s] = e.at; });
  const winAt = v && v.win.length ? v.win[0].at : 0;
  const seats = t.seats.map((s, i) => {
    const [x, y] = seatAt(i), inH = h && h.in.includes(i) && h.ids[i] === (s ? s.id : h.ids[i]);
    if (!s && !(inH && v)) return mine < 0 ? '' : `<div class="pk-seat empty" style="left:${x}%;top:${y}%"><span class="pk-av"></span></div>`;
    const name = s ? s.name : h.names[i], isMe = i === mine, k = s ? s.k : h.kinds[i];
    const stack = v && inH && !cleared ? v.stack[i] : s ? s.stack : 0;
    // cards
    let cards = '';
    if (v && inH && !cleared && dealt[i]) {
      const sh = v.show[i], folded = v.fold[i], fa = foldAt[i];
      const cds = sh ? sh.c : isMe && hole ? hole : [null, null];
      const list = dealt[i].map((a, n) => clearing ? card(cds[n], 0, now, { gone: t.next - MS.clear + n * 40 }) : folded && fa != null ? (now < fa + GONE ? card(isMe ? cds[n] : null, 0, now, { gone: fa }) : '') : card(cds[n], a, now, { flip: sh && !isMe ? sh.at : null }));
      cards = list.join('');
      if (folded && isMe && now >= (fa || 0) + GONE && !clearing) cards = cds.map((cd) => `<span class="cz-card pk-c dim${cd != null && E.CAS.red(cd) ? ' red' : ''}">${cd == null ? back() : face(cd)}</span>`).join('');
    }
    const last = v && v.last[i] && !cleared ? v.last[i] : null, fresh = last && now - last.at < 2600;
    const tag = v && v.fold[i] && !cleared ? `<em class="pk-tag fold">Fold</em>` : last && (fresh || last.a === 'allin') ? `<em class="pk-tag ${last.a}">${SAY[last.a] || last.a}${['bet', 'raise', 'call'].includes(last.a) ? ' ' + kM(last.v) : ''}</em>` : '';
    const sh = v && v.show[i] && !clearing ? `<em class="pk-hn">${esc(v.show[i].name)}</em>` : '';
    const turn = v && (v.turn === i || (v.turn == null && v.next === i && !v.fold[i])), clock = turn && v.turn === i && v.dl ? `<span class="pk-clock" data-dl="${v.dl}" data-tot="${P.turnSec}"><b></b></span>` : turn ? '<span class="pk-think">…</span>' : '';
    const won = v && v.win.find((w) => w.s === i) && !clearing;
    return `<div data-i="${i}" class="pk-seat${y < 15 ? ' top' : ''}${isMe ? ' me' : ''}${k === 'b' ? ' bot' : ''}${turn ? ' turn' : ''}${v && v.fold[i] ? ' out' : ''}${won ? ' won' : ''}" style="left:${x}%;top:${y}%">
      <span class="pk-cards">${cards}</span>${sh}
      <span class="pk-av">${initials(name)}${clock}</span>
      <span class="pk-name">${esc(isMe ? 'You' : name)}${k === 'b' ? ' · rival' : ''}</span><span class="pk-stack">${kM(stack)}</span>${tag}</div>`;
  }).join('');
  // bets in front of the seats (a third of the way to the middle), the pot and the board
  const toward = (i, f) => { const [x, y] = seatAt(i); if (i === mine && f > 0.3) f = 0.56; return [x + (50 - x) * f, y + (46 - y) * f]; };
  let bets = '';
  if (v && !cleared) {
    Object.entries(v.bet).forEach(([k, b]) => { if (!(b > 0)) return; const i = +k, [x, y] = toward(i, 0.36), l = v.last[i], pop = l && now - l.at < 450; bets += `<span class="pk-bet${pop ? ' new' : ''}" style="left:${x}%;top:${y}%">${chipStack(b, true)}</span>`; });
    if (v.sweepAt && now < v.sweepAt + 800) Object.entries(v.swept).forEach(([k, b]) => { if (!(b > 0)) return; const [x, y] = toward(+k, 0.36); bets += `<span class="pk-bet cz-fly take" data-to="pot" style="left:${x}%;top:${y}%;${anim(v.sweepAt, now)}">${chipStack(b, true)}</span>`; });
    v.win.forEach((w) => { if (now < w.at + 900) bets += `<span class="pk-bet cz-fly pay pk-pay" data-to="seat:${w.s}" style="left:50%;top:60%;${anim(w.at, now)}">${chipStack(w.v, true)}</span>`; });
  }
  const pot = v && !cleared && v.pot > 0 ? `<div class="pk-pot"><span>Pot</span>${chipStack(v.pot, true)}</div>` : `<div class="pk-pot empty"></div>`;
  const board = v && !cleared ? v.board.map((cd, n) => clearing ? card(cd, 0, now, { gone: t.next - MS.clear + 200 + n * 40 }) : card(cd, v.boardAt[n] + (n - v.boardAt.indexOf(v.boardAt[n])) * MS.card, now)).join('') : '';
  const btnSeat = h ? h.btn : t.btn, [bx, by] = btnSeat >= 0 ? toward(btnSeat, 0.2) : [0, 0];
  const dbtn = btnSeat >= 0 && !cleared ? `<span class="pk-dbtn" style="left:${bx + 4}%;top:${by}%">D</span>` : '';
  // the result once the pot is pushed
  let banner = '';
  if (v && v.win.length && !clearing) {
    const w = v.win[0], mineWon = w.s === mine, nm = mineWon ? 'You win' : `${esc((t.seats[w.s] && t.seats[w.s].name) || h.names[w.s])} wins`;
    banner = `<div class="cz-banner pk-banner ${mineWon ? 'win' : mine >= 0 && h.in.includes(mine) ? 'lose' : 'push'}" style="${anim(winAt + 300, now)}"><b>${nm} ${kM(w.v)}</b>${w.name ? `<span>${esc(w.name)}</span>` : ''}${v.win.length > 1 ? `<small>Split pot</small>` : ''}</div>`;
  }
  const talk = t.log.slice(0, 4).map((x) => `<p class="${x.k}${now - x.at < 9000 ? ' new' : ''}"><b>${esc(x.who)}</b> ${esc(x.text)}</p>`).join('');
  const r = CASINO.rooms.main;
  return `<div class="cz-tablev pk r-main${tall ? ' tall' : ''}" style="background-image:url('${img(r.img)}')">
    ${topBar(`<button class="cz-back" data-c="pkLeave">‹ ${mine >= 0 ? 'Leave table' : 'Main Floor'}</button><b class="hide-s">Hold'em ${t.no} · ${D.sb}/${D.bb} k</b>`)}
    <div class="cz-stage" style="--pfelt:url('${img('cas-felt-poker')}')">
      <div class="pk-felt"><span class="pk-line"></span><span class="pk-print">Marina Royale · Texas Hold'em</span></div>
      <div class="pk-deck" title="Dealer ${esc(t.dealer)}"><span style="background-image:url('${img(r.back, 'webp')}')"></span><small>Dealer ${esc(t.dealer)}</small></div>
      <div class="pk-board">${board}</div>${pot}${bets}${dbtn}${seats}${banner}
      <div class="cz-talk pk-talk">${talk}</div>
    </div>
    ${controlsHTML(t, v, mine, now)}
  </div>`;
}
function controlsHTML(t, v, mine, now) {
  const st = S(), D = PK.def(t), cz = cas(), h = t.h;
  if (mine < 0) {
    const free = t.seats.filter((s) => !s).length, buys = [D.min, Math.round((D.min + D.max) / 2 / D.bb) * D.bb, D.max];
    return `<div class="cz-ctl"><div class="cz-rack pk-info"><span class="cz-bal"><small>Your chips</small><b>${kM(cz.chips || 0)}</b></span></div><div class="cz-right">
      <p class="cz-waitp">You are watching. ${free ? 'Buy in to play from the next hand.' : 'The table is full.'}</p>
      ${free ? `<div class="cz-acts pk-buyrow">${buys.map((b) => `<button class="cz-btn${b === D.max ? ' gold' : ''}" data-c="pkSit" data-t="${t.id}" data-v="${b}" ${b <= (cz.chips || 0) ? '' : 'disabled'}>Sit with ${kM(b)}</button>`).join('')}</div>` : ''}</div></div>`;
  }
  const me_ = t.seats[mine], myTurn = v && v.turn === mine, o = myTurn ? PK.options(t, mine) : null;
  // the raise you build with chips starts at the smallest raise each time it comes to you
  const key = h ? `${h.n}:${h.street}:${h.cur}` : ''; if (myTurn && st.rkey !== key) { st.rkey = key; st.raise = o ? o.min : 0; }
  const R = o ? Math.min(o.max, Math.max(o.min, st.raise || o.min)) : 0;
  const rack = `<div class="cz-rack">${CASINO.chips.map((c) => `<button class="cz-chip" data-c="pkChip" data-v="${c}" ${o && o.raise && R + c <= o.max ? '' : 'disabled'} aria-label="${kM(c)} chip"><img src="${img('cas-chip-' + c, 'webp')}" alt=""></button>`).join('')}
    <span class="cz-bal"><small>At the table</small><b>${kM(v && h.in.includes(mine) && !h.done ? v.stack[mine] : me_.stack)}</b></span></div>`;
  let acts = '';
  const bar = v && v.dl && myTurn ? `<div class="cz-timer" data-dl="${v.dl}" data-tot="${P.turnSec}"><i></i><span>Your turn<b></b></span></div>` : '';
  if (myTurn && o) {
    const B = (m, ic, label, on = true, cls = '') => `<button class="cz-act${cls}" data-c="pkMove" data-m="${m}" ${on ? '' : 'disabled'}><i>${ic}</i>${label}</button>`;
    acts = `${bar}${o.raise ? `<p class="cz-target pk-raise">Raise to <b>${kM(R)}</b> · tap chips to add · <button data-c="pkSet" data-v="min">Min</button><button data-c="pkSet" data-v="0.5">½ pot</button><button data-c="pkSet" data-v="1">Pot</button></p>` : ''}
      <div class="cz-acts">${B('Fold', '✕', 'Fold')}${o.check ? B('Check', '✓', 'Check') : B('Call', '↓', `Call ${kM(o.call)}`)}${o.raise ? B('Raise', '↑', `Raise ${kM(R)}`, R >= o.min, ' deal') : ''}${B('Allin', '⚡', 'All in', o.stack > 0)}</div>`;
  } else {
    let msg;
    if (!h || (h.done && now >= t.next)) msg = t.seats.filter((s) => s && s.stack >= D.bb).length < 2 ? 'Waiting for players…' : 'Shuffling for the next hand…';
    else if (h.done || (v && v.win.length)) msg = `Next hand in <span data-dl="${t.next}"></span>`;
    else if (!h.in.includes(mine) || h.ids[mine] !== meId()) msg = 'You are in from the next hand.';
    else if (v && v.fold[mine]) msg = 'You folded. Wait for the next hand.';
    else if (v && v.turn == null && v.next != null) msg = `${esc((t.seats[v.next] && t.seats[v.next].name) || h.names[v.next])} is thinking…`;
    else if (v && v.turn != null) msg = `${esc((t.seats[v.turn] && t.seats[v.turn].name) || h.names[v.turn])} is thinking${v.dl ? ` · <span data-dl="${v.dl}"></span>` : '…'}`;
    else msg = 'Dealing…';
    const between = !h || h.done || !h.in.includes(mine);
    acts = `<p class="cz-waitp">${msg}</p>${between && me_.stack < D.max && (cz.chips || 0) > 0 ? `<div class="cz-acts"><button class="cz-act sm" data-c="pkTop"><i>+</i>Top up</button></div>` : ''}`;
  }
  return `<div class="cz-ctl">${rack}<div class="cz-right">${acts}</div></div>`;
}

// each card or chip on its way: measure where it lies and where it comes from or goes to (dealer, pot, a seat)
export function pokerFly(el) {
  const ctr = (n) => { const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const target = (k) => { if (k === 'deck') return el.querySelector('.pk-deck span'); if (k === 'pot') return el.querySelector('.pk-pot'); if (k.startsWith('seat:')) return el.querySelector(`.pk-seat[data-i="${k.slice(5)}"]`); return null; };
  el.querySelectorAll('.pk [data-from], .pk [data-to]').forEach((n) => {
    n.style.setProperty('animation-name', 'none', 'important'); const [x, y] = ctr(n); n.style.removeProperty('animation-name');
    if (n.dataset.from) { const g = target(n.dataset.from); if (g) { const [gx, gy] = ctr(g); n.style.setProperty('--dx', `${Math.round(gx - x)}px`); n.style.setProperty('--dy', `${Math.round(gy - y)}px`); } }
    if (n.dataset.to) { const g = target(n.dataset.to); if (g) { const [gx, gy] = ctr(g.querySelector ? (g.querySelector('.pk-av') || g) : g); n.style.setProperty('--gx', `${Math.round(gx - x)}px`); n.style.setProperty('--gy', `${Math.round(gy - y)}px`); } }
  });
}

export const POKER_CSS = `
.pk-h { margin: 14px 0 0; font-family: 'Playfair Display', Georgia, serif; font-size: 26px; color: #fff; }
.pk-tcard { flex-wrap: wrap; } .pk-tb { display: flex; gap: 6px; }
.pk-buy { flex-basis: 100%; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; padding-top: 6px; border-top: 1px solid #ecc56a33; font-size: 13px; }
.pk-felt { position: absolute; left: 7%; right: 7%; top: 10%; bottom: 12%; border-radius: 50%; background: radial-gradient(ellipse at 50% 42%, #ffffff10 0%, #0000 45%, #000b 100%), var(--pfelt) center / cover no-repeat, #0d2466;
  box-shadow: 0 0 0 calc(var(--cw) * 0.06) #c79a4a, 0 0 0 calc(var(--cw) * 0.36) #151515, 0 0 0 calc(var(--cw) * 0.39) #2b2b2b, 0 calc(var(--cw) * 0.3) calc(var(--cw) * 0.9) #000; }
.pk-felt::before { content: ''; position: absolute; inset: calc(var(--cw) * -0.36); border-radius: 50%; background: repeating-linear-gradient(45deg, #ffffff06 0 2px, #0000 2px 5px); pointer-events: none; }
.pk-line { position: absolute; inset: 9% 7%; border-radius: 50%; border: 1.5px solid #ecc56a55; }
.pk-print { position: absolute; left: 50%; top: 27%; transform: translateX(-50%); font-family: 'Cinzel', Georgia, serif; color: #e7c77a; opacity: 0.55; font-size: calc(var(--cw) * 0.18); letter-spacing: 0.2em; white-space: nowrap; text-transform: uppercase; }
.pk-deck { position: absolute; left: 31%; top: 45%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 4px; }
.pk-deck span { width: calc(var(--cw) * 0.62); height: calc(var(--cw) * 0.9); border-radius: 5px; background-size: cover; box-shadow: 1px 1px 0 #e8e0cc, 2px 2px 0 #f4eedf, 3px 3px 0 #e8e0cc, 0 6px 12px #000a; transform: rotate(-8deg); }
.pk-deck small { font-family: 'Playfair Display', Georgia, serif; font-style: italic; color: #e7c77a; font-size: calc(var(--cw) * 0.15); white-space: nowrap; }
.pk-board { position: absolute; left: 50%; top: 45%; transform: translate(-50%, -50%); display: flex; gap: calc(var(--cw) * 0.1); min-height: calc(var(--cw) * 1.45); }
.pk-board .cz-card + .cz-card, .pk-cards .cz-card + .cz-card { margin-left: 0; }
.pk-pot { position: absolute; left: 50%; top: 64%; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 8px; background: #0008; border: 1px solid #ecc56a66; border-radius: 30px; padding: 3px 14px 3px 10px; }
.pk-pot.empty { border: 0; background: none; width: 10px; height: 10px; padding: 0; }
.pk-pot > span { font-family: 'Cinzel', Georgia, serif; font-size: calc(var(--cw) * 0.15); color: #ecc56a; letter-spacing: 0.15em; }
.pk-pot .cz-stack b { position: static; transform: none; margin-left: 4px; }
.pk-pot .cz-stack { display: flex; align-items: center; width: auto; padding-left: calc(var(--cw) * 0.55); }
.pk-pot .cz-stack img { width: calc(var(--cw) * 0.5); height: calc(var(--cw) * 0.5); top: 50%; margin-top: calc(var(--cw) * -0.25); }
.pk-bet { position: absolute; transform: translate(-50%, -50%); z-index: 5; pointer-events: none; }
.pk-bet.new { animation: pkIn 0.45s both; }
@keyframes pkIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } }
.pk-dbtn { position: absolute; transform: translate(-50%, -50%); width: calc(var(--cw) * 0.36); height: calc(var(--cw) * 0.36); border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fff, #d9d3c4); color: #111; font-weight: 900; font-family: 'Montserrat', sans-serif; font-size: calc(var(--cw) * 0.17); display: grid; place-items: center; box-shadow: 0 2px 5px #000a; z-index: 4; transition: left 0.6s, top 0.6s; }
.pk-seat { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 2px; z-index: 6; --cw: min(4vw, 7.2vh); }
.pk-seat.me { --cw: min(5.2vw, 9.2vh); }
.pk-seat.empty .pk-av { background: #0005; border: 1.5px dashed #ecc56a55; }
.pk-cards { display: flex; gap: calc(var(--cw) * 0.06); min-height: calc(var(--cw) * 1.45); margin-bottom: calc(var(--cw) * -0.45); z-index: 1; }
.pk-seat:not(.me) .pk-cards .cz-card:nth-child(2) { margin-left: calc(var(--cw) * -0.45); }
.pk-cards .cz-card:first-child { transform: rotate(-5deg); } .pk-cards .cz-card:nth-child(2) { transform: rotate(5deg); }
.pk-cards .cz-card.deal, .pk-cards .cz-card.flip, .pk-cards .cz-card.gone { transform: none; }
.pk-c.dim { opacity: 0.35; filter: grayscale(0.7); }
.pk-av { position: relative; z-index: 2; width: calc(var(--cw) * 0.95); height: calc(var(--cw) * 0.95); border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: calc(var(--cw) * 0.3); background: radial-gradient(circle at 40% 30%, #4a3a1c, #160f06); color: #ecc56a; border: 2px solid #ecc56a; box-shadow: 0 4px 12px #000b; font-family: 'Montserrat', sans-serif; }
.pk-seat.bot .pk-av { background: radial-gradient(circle at 40% 30%, #6b3a3a, #2a1010); color: #f1d6c8; border-color: #b87a6a; }
.pk-seat.turn .pk-av { box-shadow: 0 0 0 3px #ecc56a, 0 0 26px #ecc56a; }
.pk-seat.won .pk-av { box-shadow: 0 0 0 3px #7ee2a8, 0 0 30px #1f8a4a; }
.pk-seat.out .pk-av, .pk-seat.out .pk-name { opacity: 0.5; }
.pk-name { font-size: calc(var(--cw) * 0.2); background: #000b; border: 1px solid #ecc56a55; padding: 1px 9px; border-radius: 10px; white-space: nowrap; margin-top: -4px; z-index: 3; }
.pk-seat.me .pk-name { color: #ecc56a; font-weight: 700; }
.pk-stack { font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: calc(var(--cw) * 0.22); color: #fff; text-shadow: 0 1px 3px #000; }
.pk-tag { position: absolute; top: calc(var(--cw) * 0.95); left: 100%; margin-left: 4px; font-style: normal; font-weight: 800; font-size: calc(var(--cw) * 0.19); padding: 2px 8px; border-radius: 6px; background: #000c; border: 1px solid #ecc56a77; white-space: nowrap; animation: pkIn 0.3s both; font-family: 'Montserrat', sans-serif; }
.pk-tag.fold { color: #bbb; border-color: #555; } .pk-tag.raise, .pk-tag.bet { color: #ffd27a; } .pk-tag.allin { background: #8b1a24; color: #fff; border-color: #e0444f; } .pk-tag.check, .pk-tag.call { color: #c8e6ff; }
.pk-hn { position: absolute; top: calc(var(--cw) * -0.3); font-style: normal; font-weight: 800; font-size: calc(var(--cw) * 0.18); padding: 1px 8px; border-radius: 6px; background: #ecc56a; color: #1a1206; white-space: nowrap; z-index: 4; font-family: 'Montserrat', sans-serif; }
.pk-clock { position: absolute; bottom: -4px; right: -14px; background: #000; border: 1.5px solid #ecc56a; border-radius: 10px; padding: 0 5px; font-size: calc(var(--cw) * 0.17); }
.pk-clock.low { border-color: #e0444f; color: #ff9a9a; }
.pk-think { position: absolute; bottom: -4px; right: -10px; background: #000; border-radius: 10px; padding: 0 6px; font-size: calc(var(--cw) * 0.2); color: #ecc56a; animation: czBlink 1s steps(2) infinite; }
.pk-banner { top: 61%; padding: calc(var(--cw) * 0.08) calc(var(--cw) * 0.35); } .pk-banner b { font-size: calc(var(--cw) * 0.3); } .pk-banner span { font-size: calc(var(--cw) * 0.2); } .pk-banner small { display: block; font-size: calc(var(--cw) * 0.16); color: #ddd; }
.pk-raise button { background: #1c150c; border: 1px solid #ecc56a77; color: #ecc56a; border-radius: 6px; margin-left: 4px; padding: 1px 7px; cursor: pointer; font-size: 12px; font-weight: 700; }
.pk-talk { left: 2%; top: 40%; width: 14%; }
.pk-buyrow { gap: 6px; }
.cz-tablev.pk .cz-act { width: auto; min-width: 72px; white-space: nowrap; }
.pk-seat.top { flex-direction: column-reverse; } .pk-seat.top .pk-cards { margin: calc(var(--cw) * -0.3) 0 0; order: -1; } .pk-seat.top .pk-hn { top: auto; bottom: calc(var(--cw) * -0.35); }
.cz-tablev.pk.tall .pk-deck { left: 50%; top: 31%; }
.cz-tablev.pk.tall .cz-stage { bottom: 250px; } .cz-tablev.pk.tall .pk-print { display: none; }
.cz-tablev.pk.tall .pk-felt { left: 9%; right: 9%; top: 9%; bottom: 13%; }
.cz-tablev.pk.tall .pk-seat { --cw: min(10vw, 6.2vh); } .cz-tablev.pk.tall .pk-seat.me { --cw: min(13vw, 7.8vh); }
.cz-tablev.pk.tall .pk-board { --cw: min(11vw, 7vh); }
.cz-tablev.pk.tall .pk-tag { left: 50%; transform: translateX(-50%); top: 100%; margin: 2px 0 0; }
@media (prefers-reduced-motion: reduce) { #casino .pk-bet.new, #casino .pk-tag { animation: pkIn 0.4s both !important; } #casino .pk-think { animation: czBlink 1s steps(2) infinite !important; } }
`;
