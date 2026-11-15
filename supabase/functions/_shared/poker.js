// Marina Royale: Texas Hold'em (No-Limit) on the Main Floor. Tycoons and rival bots play each other at six-seat tables;
// at least two bots sit at every table at all times, so there is always a game to join. The house takes a rake
// (CASINO.poker.rake, only when the flop is dealt) that goes to the casino's owner.
//
// Money is in k like the Blackjack tables: a tycoon buys in with chips (p.life.cas.chips → seat.stack, mirrored in
// p.life.cas.pk so it counts in net worth) and gets the stack back as chips on leaving. Bots buy in from their wallet.
//
// The deck is never stored: it is shuffled from the casino's server secret and the hand's key (CAS.deckOf), so the city
// state that every browser reads holds only positions in the deck for the hole cards (h.hole) and the board cards that
// have been turned. A tycoon gets their own two cards in the answer to any pk action (holeFor) or with pkHole.
//
// Every hand is a list of events (h.ev) with the moment each one shows on screen: the server plays bots at once but
// spaces their moves at a human pace, and a tycoon's clock (h.dl) starts once everything before their turn has been
// shown (t.vis). The browser replays the events with view(t, now).
import { CASINO } from './content.js';
import { deckOf, testDeck } from './casino.js';

const C = () => CASINO.poker;
const ok = (msg, x) => ({ ok: true, msg, ...x }), err = (msg) => ({ ok: false, msg });
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
export const RIG = { next: null }; // tests only: the next hand's deck from the top (card 0 = small blind's first)
export const def = (t) => C().tables.find((d) => d.id === t.id) || C().tables[0];

// ---------------------------------------------------------------- hands: the best five of seven
// cards are 0–51 like the Blackjack shoe (rank = c % 13 with 0 = ace, suit = floor(c / 13)); here 2–14 (ace high)
export const pr = (c) => { const r = c % 13; return r === 0 ? 14 : r + 1; };
const B5 = 759375; // 15^5: score = category × 15^5 + up to five tie-breaking ranks
const enc = (cat, ks) => { let v = 0; for (let i = 0; i < 5; i++) v = v * 15 + (ks[i] || 0); return cat * B5 + v; };
const topStraight = (mask) => { if (mask & (1 << 14)) mask |= 2; for (let h = 14; h >= 5; h--) { const m = 31 << (h - 4); if ((mask & m) === m) return h; } return 0; };
export function score(cards) {
  const cnt = Array(15).fill(0), suits = [[], [], [], []]; let mask = 0;
  for (const c of cards) { const r = pr(c); cnt[r]++; suits[Math.floor(c / 13) % 4].push(r); mask |= 1 << r; }
  const fl = suits.find((s) => s.length >= 5);
  if (fl) { let m = 0; fl.forEach((r) => { m |= 1 << r; }); const sf = topStraight(m); if (sf) return enc(8, [sf]); }
  const quads = [], trips = [], pairs = [], singles = [];
  for (let r = 14; r >= 2; r--) { if (cnt[r] === 4) quads.push(r); else if (cnt[r] === 3) trips.push(r); else if (cnt[r] === 2) pairs.push(r); else if (cnt[r] === 1) singles.push(r); }
  const kick = (skip, n) => { const out = []; for (let r = 14; r >= 2 && out.length < n; r--) if (cnt[r] && !skip.includes(r)) out.push(r); return out; };
  if (quads.length) return enc(7, [quads[0], ...kick([quads[0]], 1)]);
  if (trips.length && (trips.length > 1 || pairs.length)) return enc(6, [trips[0], trips.length > 1 ? Math.max(trips[1], pairs[0] || 0) : pairs[0]]);
  if (fl) return enc(5, fl.sort((a, b) => b - a).slice(0, 5));
  const st = topStraight(mask); if (st) return enc(4, [st]);
  if (trips.length) return enc(3, [trips[0], ...kick([trips[0]], 2)]);
  if (pairs.length >= 2) return enc(2, [pairs[0], pairs[1], ...kick([pairs[0], pairs[1]], 1)]);
  if (pairs.length) return enc(1, [pairs[0], ...kick([pairs[0]], 3)]);
  return enc(0, kick([], 5));
}
export const HANDS = ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];
const RN = { 14: 'Aces', 13: 'Kings', 12: 'Queens', 11: 'Jacks', 10: 'Tens', 9: 'Nines', 8: 'Eights', 7: 'Sevens', 6: 'Sixes', 5: 'Fives', 4: 'Fours', 3: 'Threes', 2: 'Twos' };
const R1 = { 14: 'Ace', 13: 'King', 12: 'Queen', 11: 'Jack', 10: 'Ten', 9: 'Nine', 8: 'Eight', 7: 'Seven', 6: 'Six', 5: 'Five', 4: 'Four', 3: 'Three', 2: 'Two' };
export function handName(sc) {
  const cat = Math.floor(sc / B5), k = []; let v = sc % B5; for (let i = 0; i < 5; i++) { k.unshift(v % 15); v = Math.floor(v / 15); }
  switch (cat) {
    case 8: return k[0] === 14 ? 'Royal flush' : `Straight flush, ${R1[k[0]]} high`;
    case 7: return `Four ${RN[k[0]]}`;
    case 6: return `Full house, ${RN[k[0]]} full of ${RN[k[1]]}`;
    case 5: return `Flush, ${R1[k[0]]} high`;
    case 4: return `Straight, ${R1[k[0]]} high`;
    case 3: return `Three ${RN[k[0]]}`;
    case 2: return `Two pair, ${RN[k[0]]} and ${RN[k[1]]}`;
    case 1: return `Pair of ${RN[k[0]]}`;
    default: return `${R1[k[0]]} high`;
  }
}
// what a hand is worth against n random hands with the board so far (Monte Carlo, for the bots)
export function equity(hole, board, n, sims = C().bots.sims) {
  if (n < 1) return 1;
  const used = new Set([...hole, ...board]), left = []; for (let c = 0; c < 52; c++) if (!used.has(c)) left.push(c);
  let won = 0;
  for (let k = 0; k < sims; k++) {
    const a = left.slice(); let top = a.length;
    const draw = () => { const j = Math.floor(Math.random() * top); const x = a[j]; a[j] = a[--top]; return x; };
    const bd = board.slice(); while (bd.length < 5) bd.push(draw());
    const mine = score([...hole, ...bd]); let best = 0, ties = 1, beat = false;
    for (let o = 0; o < n && !beat; o++) { const s = score([draw(), draw(), ...bd]); if (s > mine) beat = true; else if (s === mine) ties++; if (s > best) best = s; }
    if (!beat) won += 1 / ties;
  }
  return won / sims;
}

// ---------------------------------------------------------------- tables
export function ensure(city) {
  const cs = city.casino; if (!cs) return;
  if (!cs.pk) cs.pk = {};
  C().tables.forEach((d, i) => { if (!cs.pk[d.id]) cs.pk[d.id] = { id: d.id, room: d.room, no: i + 1, seats: Array(C().seats).fill(null), btn: -1, n: 0, h: null, next: 0, vis: 0, log: [], dealer: C().dealers[i % C().dealers.length] }; });
  return cs.pk;
}
export const tables = (city) => Object.values((city.casino && city.casino.pk) || {});
export function seatOf(city, pid) { for (const t of tables(city)) { const i = t.seats.findIndex((s) => s && s.id === pid); if (i >= 0) return { t, i, s: t.seats[i] }; } return null; }
const live = (h) => (h && !h.done ? h.in.filter((i) => !h.fold[i]) : []);
export const inHand = (t, i) => !!(t.h && !t.h.done && t.h.in.includes(i) && !t.h.fold[i]);
const cas = (p) => p && p.life && p.life.cas;
function say(t, who, text, k) { t.log.unshift({ at: Date.now(), who, text, k: k || '' }); if (t.log.length > 8) t.log.length = 8; }
// an event on the table's screen clock: shows `gap` ms after the one before it (or now)
function ev(t, now, e, gap = 0) { const at = Math.max(now, t.vis || 0) + gap; e.at = at; t.vis = at; t.h.ev.push(e); return e; }
function money(city, s, v) { // a seat's stack back to its owner
  if (!(v > 0)) return;
  const p = city.players[s.id]; if (!p) return;
  if (s.k === 'p') { const c = cas(p); if (c) { c.chips += v; c.pk = 0; } } else if (p.life) p.life.wallet += v / 1000; else p.cash += v / 1000;
}
function leaveSeat(city, t, i, line) {
  const s = t.seats[i]; if (!s) return;
  money(city, s, s.stack); if (s.k === 'p') { const c = cas(city.players[s.id]); if (c) c.pk = 0; }
  if (line) say(t, s.k === 'b' ? s.name : t.dealer, line, s.k === 'b' ? 'bot' : 'dealer');
  t.seats[i] = null;
}
const mirror = (city, s) => { if (s && s.k === 'p') { const c = cas(city.players[s.id]); if (c) c.pk = s.stack; } };

// ---------------------------------------------------------------- rival bots: always at least C().bots.min at a table
function botsMove(city, t, now) {
  const B = C().bots, D = def(t), bb = D.bb, isBot = (s) => s && s.k === 'b';
  t.seats.forEach((s, i) => {
    if (!isBot(s) || s.stack >= B.rebuyBB * bb) return;
    const top = Math.min(D.max, B.buyBB * bb) - s.stack, b = city.players[s.id];
    if (b && Math.random() < 0.85 && fund(b, top)) { s.stack += top; } else leaveSeat(city, t, i, pick(C().talk.leave));
  });
  const bots = () => t.seats.filter(isBot).length, free = () => t.seats.filter((s) => !s).length;
  if (bots() > B.min && Math.random() < B.swap) { const i = t.seats.findIndex(isBot); leaveSeat(city, t, i, pick(C().talk.leave)); }
  if (!free() && bots() > B.min) { const i = t.seats.findIndex(isBot); leaveSeat(city, t, i, pick(C().talk.leave)); } // room for a tycoon
  for (let g = 0; g < 6; g++) {
    const want = bots() < B.min ? free() > 0 : bots() < B.max && free() > 1 && Math.random() < B.join;
    if (!want || !sitBot(city, t, now)) break;
    if (bots() >= B.min) break; // one newcomer at a time once the table has its two
  }
}
function fund(b, k) { const v = k / 1000; if (b.life && b.life.wallet >= v) { b.life.wallet -= v; return true; } if (b.cash >= v + 1) { b.cash -= v; return true; } return false; }
function sitBot(city, t, now) {
  const D = def(t), buy = Math.min(D.max, C().bots.buyBB * D.bb);
  const seated = new Set([...tables(city), ...Object.values(city.casino.tables || {})].flatMap((x) => x.seats.filter(Boolean).map((s) => s.id)));
  const pool = Object.values(city.players).filter((b) => b.bot && !seated.has(b.id) && ((b.life && b.life.wallet * 1000 >= buy) || b.cash * 1000 >= buy + 1000));
  const b = pick(pool); if (!b || !fund(b, buy)) return false;
  const free = t.seats.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0), i = pick(free);
  t.seats[i] = { k: 'b', id: b.id, name: b.name, stack: buy, seen: now, style: botStyle(b.id) };
  if (Math.random() < 0.5) say(t, b.name, pick(C().talk.sit), 'bot');
  return true;
}
// a bot's way of playing from its id: how loose (calls with less) and how aggressive (bets and raises more)
function botStyle(id) { let h = 7; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return { loose: ((h % 100) / 100) * 0.12 - 0.03, aggr: 0.25 + ((h >>> 8) % 100) / 100 * 0.5 }; }

// ---------------------------------------------------------------- a hand
const order = (h, from, ok) => { const n = h.in.length, k = h.in.indexOf(from); for (let j = 1; j <= n; j++) { const i = h.in[(k + j + n) % n]; if (ok(i)) return i; } return null; };
const nextSeat = (seats, from, ok) => { const n = seats.length; for (let j = 1; j <= n; j++) { const i = (from + j + n) % n; if (ok(i)) return i; } return null; };
const canAct = (h, i) => !h.fold[i] && !h.all[i];
function post(t, h, i, v, now, kind) {
  const s = t.seats[i], x = Math.min(v, s.stack); s.stack -= x; h.bet[i] += x; h.put[i] += x; if (!s.stack) h.all[i] = true;
  ev(t, now, { k: 'blind', s: i, a: kind, v: h.bet[i], add: x }, 120);
}
function start(city, t, now, ctx) {
  const D = def(t); botsMove(city, t, now);
  const ready = t.seats.map((s, i) => (s && s.stack >= D.bb && !s.sitout ? i : -1)).filter((i) => i >= 0);
  if (ready.length < 2) return false;
  const btn = nextSeat(t.seats, t.btn, (i) => ready.includes(i)); t.btn = btn;
  const hu = ready.length === 2, sbS = hu ? btn : nextSeat(t.seats, btn, (i) => ready.includes(i)), bbS = nextSeat(t.seats, sbS, (i) => ready.includes(i));
  t.n++;
  const h = t.h = { n: t.n, key: t.id + '|' + t.n + '|' + Math.random().toString(36).slice(2, 10), btn, sbS, bbS, at: Math.max(now, t.vis || 0), in: ready, ids: {}, names: {}, kinds: {}, st: {},
    hole: {}, pos: 0, board: [], ev: [], street: 0, bet: {}, put: {}, fold: {}, all: {}, acted: {}, nr: {}, cur: 0, minR: D.bb, turn: null, dl: null, done: false, rake: 0, win: [] };
  if (RIG.next) { testDeck(h.key, RIG.next); RIG.next = null; }
  ready.forEach((i) => { const s = t.seats[i]; h.ids[i] = s.id; h.names[i] = s.name; h.kinds[i] = s.k; h.st[i] = s.stack; h.bet[i] = 0; h.put[i] = 0; });
  t.vis = h.at; ev(t, now, { k: 'start' }, 0);
  post(t, h, sbS, D.sb, now, 'sb'); post(t, h, bbS, D.bb, now, 'bb');
  h.cur = D.bb;
  // two cards each, one at a time from the small blind round
  const deal = []; for (let r = 0; r < 2; r++) { let i = sbS; for (let k = 0; k < ready.length; k++) { (h.hole[i] = h.hole[i] || []).push(h.pos++); deal.push(i); i = order(h, i, () => true); } }
  ev(t, now, { k: 'deal', o: deal }, 350); t.vis += deal.length * C().ms.card + 400;
  after(city, t, bbS, now, ctx); return true; // first to act: left of the big blind (heads-up: the button)
}
export const toCall = (h, i) => Math.max(0, h.cur - (h.bet[i] || 0));
// what seat i may do now: amounts are the total in front of the seat this street ("raise to")
export function options(t, i) {
  const h = t.h, s = t.seats[i]; if (!h || h.done || h.turn !== i || !s) return null;
  const call = Math.min(toCall(h, i), s.stack), most = h.bet[i] + s.stack, least = Math.min(most, h.cur + h.minR);
  return { check: call === 0, call, raise: !h.nr[i] && most > h.cur && live(h).some((j) => j !== i && !h.all[j]), min: least, max: most, cur: h.cur, bet: h.bet[i], stack: s.stack };
}
function move(city, t, i, a, to, now, gap) {
  const h = t.h, s = t.seats[i], o = options(t, i); let label = a;
  if (a === 'fold') h.fold[i] = true;
  else if (a === 'check') { if (!o.check) return 'You need to call or fold.'; }
  else if (a === 'call') { if (o.check) { label = 'check'; } else { s.stack -= o.call; h.bet[i] += o.call; h.put[i] += o.call; if (!s.stack) { h.all[i] = true; label = 'allin'; } } }
  else if (a === 'raise' || a === 'allin') {
    let T = a === 'allin' ? o.max : Math.round(Number(to) || 0);
    if (T <= h.cur) { if (a === 'allin') return move(city, t, i, 'call', 0, now, gap); return `Raise to more than ${h.cur} k.`; }
    if (!o.raise) { if (a === 'allin') return move(city, t, i, 'call', 0, now, gap); return o.check ? 'Nobody left to raise against. Check.' : 'You can only call or fold here.'; }
    if (T > o.max) T = o.max;
    if (T < o.min) return `The smallest raise is to ${o.min} k.`;
    const add = T - h.bet[i], inc = T - h.cur;
    s.stack -= add; h.bet[i] = T; h.put[i] += add;
    if (inc >= h.minR) { h.minR = inc; h.acted = {}; h.nr = {}; } else { h.nr = { ...h.acted }; } // a short all-in does not reopen the betting
    label = !s.stack ? 'allin' : h.cur === 0 ? 'bet' : 'raise'; h.cur = T; if (!s.stack) h.all[i] = true;
  } else return 'Unknown move.';
  h.acted[i] = true; delete h.nr[i];
  ev(t, now, { k: 'act', s: i, a: label, v: h.bet[i], pot: Object.values(h.put).reduce((x, y) => x + y, 0) }, gap);
  if (s.k === 'b' && label === 'allin' && Math.random() < 0.3) say(t, s.name, pick(C().talk.allin), 'bot');
  return null;
}
// after a move: whose turn, or the street (or the hand) is over
function after(city, t, i, now, ctx) {
  const h = t.h, L = live(h);
  if (L.length === 1) return finish(city, t, now, ctx);
  const pend = L.filter((j) => canAct(h, j) && (!h.acted[j] || h.bet[j] < h.cur));
  if (pend.length) { h.turn = order(h, i, (j) => pend.includes(j)); return run(city, t, now, ctx); }
  h.turn = null; return endStreet(city, t, now, ctx);
}
function endStreet(city, t, now, ctx) {
  const h = t.h, D = def(t), deck = deckOf(h.key), L = live(h);
  const turnCards = (n) => { h.pos++; const c = []; for (let k = 0; k < n; k++) c.push(deck[h.pos++]); h.board.push(...c); ev(t, now, { k: 'board', c, st: h.street + 1 }, C().ms.street); t.vis += n * C().ms.card; h.street++; };
  // the uncalled part of the last bet goes back first, then the bets are gathered into the pot
  const more = L.filter((j) => !h.all[j]).length >= 2;
  if (h.street >= 3) return showdown(city, t, now, ctx);
  if (!more) { while (h.street < 3) turnCards(h.street === 0 ? 3 : 1); return showdown(city, t, now, ctx); }
  turnCards(h.street === 0 ? 3 : 1);
  L.forEach((j) => { h.bet[j] = 0; }); h.in.forEach((j) => { h.bet[j] = 0; }); h.cur = 0; h.minR = D.bb; h.acted = {}; h.nr = {};
  h.turn = order(h, h.btn, (j) => canAct(h, j));
  return run(city, t, now, ctx);
}
// side pots: one per all-in level, each to the best hand among those who put that much in
export function pots(h) {
  const puts = h.in.map((i) => [i, h.put[i] || 0]).filter(([, v]) => v > 0), lv = [...new Set(puts.map(([, v]) => v))].sort((a, b) => a - b), out = [];
  let prev = 0;
  for (const L of lv) {
    const amt = puts.reduce((a, [, v]) => a + Math.max(0, Math.min(v, L) - prev), 0), who = puts.filter(([i, v]) => v >= L && !h.fold[i]).map(([i]) => i);
    if (amt > 0) { if (who.length) out.push({ v: amt, who }); else if (out.length) out[out.length - 1].v += amt; else out.push({ v: amt, who: puts.filter(([i]) => !h.fold[i]).map(([i]) => i) }); }
    prev = L;
  }
  // merge pots with the same players (and a pot only one player could win is their own money back)
  return out.reduce((a, p) => { const l = a[a.length - 1]; if (l && l.who.join() === p.who.join()) l.v += p.v; else a.push(p); return a; }, []);
}
function showdown(city, t, now, ctx) {
  const h = t.h, deck = deckOf(h.key), L = live(h), sc = {};
  L.forEach((i) => { const c = h.hole[i].map((x) => deck[x]); sc[i] = score([...c, ...h.board]); ev(t, now, { k: 'show', s: i, c, name: handName(sc[i]) }, C().ms.show); });
  return finish(city, t, now, ctx, sc);
}
function finish(city, t, now, ctx, sc) {
  const h = t.h, D = def(t), L = live(h), first = (who) => { for (let j = 1; j <= t.seats.length; j++) { const i = (h.btn + j) % t.seats.length; if (who.includes(i)) return i; } return who[0]; };
  const ps = pots(h);
  // the rake: from pots more than one tycoon or bot fought for, once the flop is out; never when the owner sits in
  const l = ctx.listing(CASINO.lid), ownerIn = l && l.owner && h.in.some((i) => h.kinds[i] === 'p' && ctx.canRun(h.ids[i], l));
  let rake = 0;
  if (h.board.length >= 3 && !ownerIn) { // on what was called: the last bet nobody matched goes back untouched
    const pv = h.in.map((i) => h.put[i] || 0).sort((a, b) => b - a), base = pv.reduce((a, b) => a + b, 0) - (pv[0] - (pv[1] || 0));
    rake = Math.min(Math.floor(base * C().rake), C().rakeCap * D.bb);
  }
  let take = rake; const won = {};
  ps.forEach((p) => {
    let v = p.v; if (take > 0 && (p.who.length > 1 || L.length === 1)) { const x = Math.min(take, v); v -= x; take -= x; }
    let best = p.who; if (sc && p.who.length > 1) { const top = Math.max(...p.who.map((i) => sc[i])); best = p.who.filter((i) => sc[i] === top); }
    const share = Math.floor(v / best.length), odd = v - share * best.length, f = first(best);
    best.forEach((i) => { won[i] = (won[i] || 0) + share + (i === f ? odd : 0); });
  });
  h.rake = rake; h.win = [];
  Object.entries(won).forEach(([k, v]) => { const i = +k, s = t.seats[i]; if (s && s.id === h.ids[i]) s.stack += v; else money(city, { k: h.kinds[i], id: h.ids[i] }, v); h.win.push({ s: i, v, name: sc && sc[i] != null ? handName(sc[i]) : '' }); });
  h.win.sort((a, b) => b.v - a.v);
  h.win.forEach((w, n) => ev(t, now, { k: 'win', s: w.s, v: w.v, name: w.name }, n ? 600 : C().ms.win));
  h.done = true; h.turn = null; h.dl = null;
  ev(t, now, { k: 'end' }, 300);
  t.next = t.vis + C().ms.rest;
  if (rake > 0) house(city, rake, ctx);
  // the books: tycoons' results, bots' lines, the Gazette for a big pot
  h.in.forEach((i) => {
    const s = t.seats[i], net = (won[i] || 0) - (h.put[i] || 0);
    if (h.kinds[i] === 'p') {
      const p = city.players[h.ids[i]], c = cas(p); if (!c) return;
      c.pkHands = (c.pkHands || 0) + 1; c.pkNet = (c.pkNet || 0) + net; if (net > (c.pkBest || 0)) c.pkBest = net;
      if (s && s.id === h.ids[i]) mirror(city, s);
      if (net >= CASINO.news && !c.quiet) ctx.news('Big pot at Marina Royale', `${p.name} won ${Math.round(net) / 1000} M in one hand of Texas Hold'em on the Main Floor.`, 'info');
    } else if (s && s.id === h.ids[i]) {
      if (net >= D.bb * 15 && Math.random() < 0.45) say(t, s.name, pick(C().talk.win), 'bot');
      else if (net <= -D.bb * 25 && Math.random() < 0.4) say(t, s.name, pick(C().talk.bad), 'bot');
    }
  });
  // tycoons who were away too often give up the seat
  t.seats.forEach((s, i) => { if (s && s.k === 'p' && (s.away || 0) >= C().awayMax) leaveSeat(city, t, i, `${s.name} has been away for ${C().awayMax} hands and leaves the table.`); });
  return true;
}
function house(city, v, ctx) {
  const l = ctx.listing(CASINO.lid); if (!l || !l.owner) return;
  ctx.credit(l.owner, v / 1000);
  if (l.ops) { l.ops.cur = l.ops.cur || {}; l.ops.cur.tbl = (l.ops.cur.tbl || 0) + v / 1000; }
  const cs = city.casino; cs.mo = cs.mo && cs.mo.m === city.m ? cs.mo : { m: city.m, net: 0, turn: 0, hands: 0, big: 0 }; cs.mo.net += v; cs.mo.rake = (cs.mo.rake || 0) + v;
}
// bots move at once (shown at a human pace); a tycoon gets a clock that starts once the screen has caught up
function run(city, t, now, ctx) {
  const h = t.h;
  for (let g = 0; g < 60 && !h.done; g++) {
    const i = h.turn; if (i == null) return true;
    const s = t.seats[i];
    if (!s || s.id !== h.ids[i]) { move(city, t, i, 'fold', 0, now, 200); after(city, t, i, now, ctx); continue; } // left the table
    if (s.k === 'b') { const [a, to] = decide(t, i); if (move(city, t, i, a, to, now, Math.round(rnd(C().ms.botMin, C().ms.botMax)))) move(city, t, i, options(t, i).check ? 'check' : 'fold', 0, now, 300); after(city, t, i, now, ctx); continue; }
    if (s.sitout) { move(city, t, i, options(t, i).check ? 'check' : 'fold', 0, now, 300); after(city, t, i, now, ctx); continue; }
    h.dl = Math.max(now, t.vis) + C().turnSec * 1000; return true;
  }
  return true;
}

// ---------------------------------------------------------------- how a bot plays: its hand's chances against the others
function decide(t, i) {
  const h = t.h, s = t.seats[i], o = options(t, i), D = def(t), st = s.style || botStyle(s.id), deck = deckOf(h.key);
  const opp = live(h).length - 1, eq = equity(h.hole[i].map((x) => deck[x]), h.board, opp);
  const pot = Object.values(h.put).reduce((a, b) => a + b, 0), odds = o.call / Math.max(1, pot + o.call), r = Math.random();
  const fair = 1 / (opp + 1), strong = eq > Math.max(0.62, fair + 0.3), good = eq > fair + 0.1;
  const size = (x) => { let to = h.cur + Math.max(o.min - h.cur, Math.round(pot * x)); if (to - h.bet[i] > s.stack * 0.65) to = o.max; return Math.max(o.min, Math.min(o.max, Math.round(to))); };
  if (o.check) {
    if (o.raise && strong && r < 0.55 + st.aggr * 0.4) return ['raise', size(rnd(0.5, 1))];
    if (o.raise && good && r < st.aggr * 0.6) return ['raise', size(rnd(0.35, 0.7))];
    if (o.raise && h.street > 0 && r < st.aggr * 0.12) return ['raise', size(0.5)]; // a bluff now and then
    return ['check'];
  }
  if (o.raise && strong && r < 0.35 + st.aggr * 0.5 && h.minR) return ['raise', size(rnd(0.7, 1.2))];
  if (eq >= odds + 0.04 - st.loose || (h.street === 0 && o.call <= D.bb && eq > fair - st.loose)) return ['call'];
  if (o.call <= D.bb && r < 0.3 + st.loose) return ['call'];
  if (Math.random() < 0.25) say(t, s.name, pick(C().talk.fold), 'bot');
  return ['fold'];
}

// ---------------------------------------------------------------- the clock: deal when the table is ready, fold for whoever is away
export function step(city, t, now, ctx) {
  for (let g = 0; g < 4; g++) {
    t.seats.forEach((s, i) => { if (s && s.k === 'p' && now - (s.seen || 0) > C().idleMin * 60000 && !inHand(t, i)) leaveSeat(city, t, i, `${s.name} has left the table.`); });
    const h = t.h;
    if (h && !h.done) {
      if (h.dl && now >= h.dl && h.turn != null) {
        const i = h.turn, s = t.seats[i], o = options(t, i);
        if (s) { s.away = (s.away || 0) + 1; say(t, t.dealer, `${s.name} ${o && o.check ? 'is away and checks.' : C().talk.away}`, 'dealer'); }
        h.dl = null; move(city, t, i, o && o.check ? 'check' : 'fold', 0, now, 200); after(city, t, i, now, ctx); continue;
      }
      return;
    }
    if (now < (t.next || 0)) return;
    start(city, t, now, ctx); return;
  }
}
export function stepAll(city, now, ctx) { tables(city).forEach((t) => step(city, t, now, ctx)); }

// ---------------------------------------------------------------- your cards: only in the answer to you, never in the city state
export function holeFor(city, pid) {
  const at = seatOf(city, pid); const t = at ? at.t : null; if (!t || !t.h) return null;
  const h = t.h, i = Object.keys(h.ids).map(Number).find((k) => h.ids[k] === pid); if (i == null || !h.hole[i]) return null;
  const deck = deckOf(h.key); return { tid: t.id, n: h.n, c: h.hole[i].map((x) => deck[x]) };
}

// ---------------------------------------------------------------- what the screen shows at time T (shared with the browser)
// stacks, bets in front of each seat, the pot, the board, folds, the last move per seat and the cards shown so far
export function view(t, T) {
  const h = t.h; if (!h) return null;
  const v = { n: h.n, stack: { ...h.st }, bet: {}, put: {}, fold: {}, all: {}, last: {}, board: [], show: {}, win: [], pot: 0, dealt: [], dealAt: 0, boardAt: [], sweepAt: 0, swept: {}, ended: 0, lastAt: 0, act: null };
  h.in.forEach((i) => { v.bet[i] = 0; v.put[i] = 0; });
  for (const e of h.ev) {
    if (e.at > T) { v.pending = true; break; }
    v.lastAt = e.at;
    if (e.k === 'blind' || e.k === 'act') {
      if (e.k === 'act' && e.a === 'fold') v.fold[e.s] = true;
      else { const add = e.v - v.bet[e.s]; v.bet[e.s] = e.v; v.put[e.s] += add; v.stack[e.s] -= add; if (v.stack[e.s] <= 0) v.all[e.s] = true; }
      v.last[e.s] = { a: e.a, v: e.v, at: e.at }; v.act = { s: e.s, a: e.a, at: e.at };
    } else if (e.k === 'deal') { v.dealt = e.o; v.dealAt = e.at; }
    else if (e.k === 'board') { v.swept = { ...v.bet }; v.sweepAt = e.at; Object.keys(v.bet).forEach((k) => { v.bet[k] = 0; }); v.board.push(...e.c); e.c.forEach(() => v.boardAt.push(e.at)); Object.keys(v.last).forEach((k) => { if (v.last[k].a !== 'allin') delete v.last[k]; }); }
    else if (e.k === 'show') v.show[e.s] = { c: e.c, name: e.name, at: e.at };
    else if (e.k === 'win') { if (!v.win.length) { v.swept = { ...v.bet }; v.sweepAt = e.at; Object.keys(v.bet).forEach((k) => { v.bet[k] = 0; }); } v.win.push(e); v.stack[e.s] = (v.stack[e.s] || 0) + e.v; }
    else if (e.k === 'end') v.ended = e.at;
  }
  v.pot = Object.values(v.put).reduce((a, b) => a + b, 0) - Object.values(v.bet).reduce((a, b) => a + b, 0) - v.win.reduce((a, w) => a + w.v, 0) - (v.win.length ? h.rake : 0);
  if (v.pot < 0) v.pot = 0;
  v.caught = !v.pending; v.turn = v.caught && !h.done ? h.turn : null; v.dl = v.caught ? h.dl : null;
  return v;
}

// ---------------------------------------------------------------- actions
export function act(city, p, action, a, ctx, now = Date.now()) {
  ensure(city);
  if (p.bot) return err('Bots play on their own.');
  if (!p.life) return err('Your personal account is not open yet.');
  const c = p.life.cas || (p.life.cas = { chips: 0, buy: 0, turn: 0, net: 0, best: 0, hands: 0, mTurn: 0, limit: 0, quiet: false, seat: null, pit: { warn: 0, at: -99 } });
  const at = seatOf(city, p.id);
  if (at) { at.s.seen = now; step(city, at.t, now, ctx); }
  const T = at && at.t, i = at && at.i, S = at && at.s;
  const done = (r) => { const x = r || ok(); const hc = holeFor(city, p.id); if (hc) x.hole = hc; return x; };
  switch (action) {
    case 'pkHole': return done();
    case 'pkTick': { const t = city.casino.pk[a.tid] || T; if (t) step(city, t, now, ctx); return done(); }
    case 'pkSit': {
      const t = city.casino.pk[a.tid]; if (!t) return err('Unknown table.');
      const D = def(t), buy = Math.round(Number(a.buy) || 0);
      if (T === t) return done();
      if (T) { if (inHand(T, i)) return err('Finish the hand first.'); leaveSeat(city, T, i); }
      if (Object.values(city.casino.tables || {}).some((x) => x.seats.some((q) => q && q.id === p.id))) return err('Leave the Blackjack table first.');
      if (buy < D.min || buy > D.max) return err(`Buy in with ${D.min}–${D.max} k at this table.`);
      if (c.chips < buy) return err('Not enough chips. Visit the cashier.');
      if (c.limit && c.buy - c.chips + buy > c.limit) return err('That would pass tonight\'s limit. Change it at the cashier.');
      let k = Number.isInteger(a.seat) && a.seat >= 0 && a.seat < t.seats.length && !t.seats[a.seat] ? a.seat : -1;
      if (k < 0) { const free = t.seats.map((s, j) => (s ? -1 : j)).filter((j) => j >= 0); k = free.length ? free[0] : -1; }
      if (k < 0 && t.seats.filter((s) => s && s.k === 'b').length > C().bots.min) { // a bot gives up its seat when the table is full
        const j = t.seats.findIndex((s, x) => s && s.k === 'b' && !inHand(t, x)); if (j >= 0) { leaveSeat(city, t, j, pick(C().talk.leave)); k = j; }
      }
      if (k < 0) return err('The table is full. Try the other one.');
      c.chips -= buy; t.seats[k] = { k: 'p', id: p.id, name: p.name, stack: buy, seen: now, away: 0 }; c.pk = buy;
      say(t, t.dealer, `Welcome, ${p.name.split(' ')[0]}. You are in from the next hand.`, 'dealer');
      step(city, t, now, ctx); return done();
    }
    case 'pkTop': {
      if (!T) return err('Take a seat first.'); if (inHand(T, i)) return err('Top up between hands.');
      const D = def(T), add = Math.min(D.max - S.stack, c.chips); if (add <= 0) return err(S.stack >= D.max ? 'You already have the table maximum.' : 'No chips left. Visit the cashier.');
      c.chips -= add; S.stack += add; mirror(city, S); return done(ok(`Topped up to ${S.stack} k.`));
    }
    case 'pkLeave': {
      if (!T) return ok();
      if (inHand(T, i)) { const h = T.h, mine = h.turn === i; move(city, T, i, 'fold', 0, now, 200); if (mine) after(city, T, i, now, ctx); else if (live(h).length === 1) finish(city, T, now, ctx); }
      const v = S.stack; leaveSeat(city, T, i); step(city, T, now, ctx);
      return ok(`Left the table with ${v >= 1000 ? Math.round(v) / 1000 + ' M' : v + ' k'} in chips.`);
    }
    case 'pkSitOut': { if (!T) return err('Take a seat first.'); S.sitout = !!a.on; if (!a.on) S.away = 0; return done(); }
    case 'pkFold': case 'pkCheck': case 'pkCall': case 'pkRaise': case 'pkAllin': {
      if (!T || !T.h || T.h.done || T.h.turn !== i) return err('It is not your turn.');
      const m = action.slice(2).toLowerCase(), e = move(city, T, i, m, a.to, now, C().ms.you); if (e) return err(e);
      S.away = 0; T.h.dl = null; after(city, T, i, now, ctx); return done();
    }
  }
  return null;
}
