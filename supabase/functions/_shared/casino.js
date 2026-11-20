// Marina Royale: Blackjack with chips. Three rooms (Main Floor, High Limit Salon, The Vault), shared tables with
// up to five seats (tycoons and rival bots), Las Vegas rules: 6-deck shoe, dealer stands on all 17, blackjack 3:2,
// dealer peeks on an ace or ten, insurance 2:1, double on any two (also after a split), split to four hands,
// split aces get one card, late surrender, side bets Perfect Pairs and 21+3.
//
// The shoe is never stored: it is shuffled from a server secret (setSecret) and the shoe's public key, so the city
// state that every browser reads only holds the cards already on the table and the index of the dealer's hole card.
// Money: chips, bets and payouts are in thousands (k). Your chips (p.life.cas.chips) are bought from and cashed back
// to your private wallet; what the players lose or win at a table goes to or comes from the casino's owner.
import { CASINO as C } from './content.js';

const ok = (msg, x) => ({ ok: true, msg, ...x }), err = (msg) => ({ ok: false, msg });
const r2 = (v) => Math.round(v * 100) / 100;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const ROOMS = C.rooms;

// ---------------------------------------------------------------- the secret shuffle
let SECRET = null;
export function setSecret(s) { SECRET = s ? String(s) : null; }
const secret = () => { if (!SECRET) SECRET = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36); return SECRET; };
// SHA-256 (plain, synchronous): the stream of random numbers for a shuffle
const KS = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
export function sha256(str) {
  const bytes = []; for (const ch of unescape(encodeURIComponent(str))) bytes.push(ch.charCodeAt(0));
  const bits = bytes.length * 8; bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bits >>> (i * 8)) & 0xff);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64);
  const rot = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < bytes.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
    for (let i = 16; i < 64; i++) { const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + KS[i] + w[i]) | 0, t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map((x) => x >>> 0);
}
const SHOES = new Map();
// the whole shoe for a table's current key: card i is shoe[i] (0–51: rank = c % 13, suit = floor(c / 13))
export function shoeOf(t) {
  const k = t.id + '|' + t.shoe.key; if (SHOES.has(k)) return SHOES.get(k);
  const n = 52 * C.decks, a = Array.from({ length: n }, (_, i) => i % 52), sec = secret();
  let buf = [], ctr = 0; const next = () => { if (!buf.length) buf = sha256(sec + '|' + k + '|' + ctr++); return buf.pop(); };
  for (let i = n - 1; i > 0; i--) { const j = next() % (i + 1); const x = a[i]; a[i] = a[j]; a[j] = x; }
  SHOES.set(k, a); if (SHOES.size > 40) SHOES.delete(SHOES.keys().next().value);
  return a;
}

// tests only: put a known order of cards in a table's current shoe (card 0 is burned)
export function testShoe(t, cards) { const a = shoeOf(t).slice(); cards.forEach((c, i) => { a[1 + i] = c; }); SHOES.set(t.id + '|' + t.shoe.key, a); }

// ---------------------------------------------------------------- cards and hands
export const rank = (c) => c % 13;                                   // 0 = A, 1–8 = 2–9, 9 = 10, 10 J, 11 Q, 12 K
export const suit = (c) => Math.floor(c / 13) % 4;                   // 0 ♠, 1 ♥, 2 ♦, 3 ♣
export const red = (c) => suit(c) === 1 || suit(c) === 2;
export const cval = (c) => { const r = rank(c); return r === 0 ? 11 : r >= 9 ? 10 : r + 1; };
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], SUITS = ['♠', '♥', '♦', '♣'];
export const label = (c) => RANKS[rank(c)] + SUITS[suit(c)];
export function total(cards) { let t = 0, aces = 0; cards.forEach((c) => { t += cval(c); if (rank(c) === 0) aces++; }); while (t > 21 && aces) { t -= 10; aces--; } return { t, soft: aces > 0 && t <= 21 }; }
export const natural = (h) => h.c.length === 2 && !h.sp && total(h.c).t === 21;
const hiLo = (c) => { const v = cval(c); return v <= 6 ? 1 : v >= 10 ? -1 : 0; };

// basic strategy for 6 decks, dealer stands on soft 17, double after split, late surrender (the hint and the bots)
export function basic(cards, up, o = {}) {
  const { t, soft } = total(cards), d = cval(up), two = cards.length === 2;
  const can = (x) => o[x] !== false;
  if (two && can('split') && cval(cards[0]) === cval(cards[1])) {
    const v = cval(cards[0]);
    const sp = v === 11 || v === 8 || (v === 9 && ![7, 10, 11].includes(d)) || (v === 7 && d <= 7) || (v === 6 && d <= 6) || (v === 4 && (d === 5 || d === 6)) || ((v === 2 || v === 3) && d <= 7);
    if (sp) return 'split';
  }
  if (two && can('surrender') && !soft && ((t === 16 && d >= 9) || (t === 15 && d === 10))) return 'surrender';
  const dbl = two && can('double');
  if (soft) {
    if (t >= 19) return 'stand';
    if (t === 18) { if (d >= 3 && d <= 6) return dbl ? 'double' : 'stand'; return d <= 8 ? 'stand' : 'hit'; }
    if (t === 17) return d >= 3 && d <= 6 && dbl ? 'double' : 'hit';
    if (t === 15 || t === 16) return d >= 4 && d <= 6 && dbl ? 'double' : 'hit';
    return d >= 5 && d <= 6 && dbl ? 'double' : 'hit';
  }
  if (t >= 17) return 'stand';
  if (t >= 13) return d <= 6 ? 'stand' : 'hit';
  if (t === 12) return d >= 4 && d <= 6 ? 'stand' : 'hit';
  if (t === 11) return d <= 10 && dbl ? 'double' : 'hit';
  if (t === 10) return d <= 9 && dbl ? 'double' : 'hit';
  if (t === 9) return d >= 3 && d <= 6 && dbl ? 'double' : 'hit';
  return 'hit';
}
// side bets on your first two cards (+ the dealer's up card for 21+3)
export function perfectPairs(a, b) { if (rank(a) !== rank(b)) return null; if (suit(a) === suit(b)) return 'perfect'; return red(a) === red(b) ? 'colour' : 'mixed'; }
export function twentyOne3(a, b, u) {
  const cs = [a, b, u], rs = cs.map(rank).sort((x, y) => x - y), flush = cs.every((c) => suit(c) === suit(a)), trips = rs[0] === rs[2];
  const run = (x) => x[1] === x[0] + 1 && x[2] === x[1] + 1, straight = run(rs) || (rs[0] === 0 && rs[1] === 11 && rs[2] === 12); // A-2-3 … Q-K-A
  if (trips && flush) return 'strips'; if (straight && flush) return 'sflush'; if (trips) return 'trips'; if (straight) return 'straight'; if (flush) return 'flush'; return null;
}
export const SIDE_NAME = { mixed: 'Mixed pair', colour: 'Coloured pair', perfect: 'Perfect pair', flush: 'Flush', straight: 'Straight', trips: 'Three of a kind', sflush: 'Straight flush', strips: 'Suited trips' };

// ---------------------------------------------------------------- state
export function ensure(city) {
  if (!city.casino) city.casino = { tables: {}, cfg: { owner: null, max: { main: 1, high: 1, vault: 1 }, comp: 1 }, log: [] };
  const cs = city.casino;
  Object.entries(ROOMS).forEach(([rid, r]) => { for (let i = 1; i <= r.tables; i++) { const id = `${rid}-${i}`; if (!cs.tables[id]) cs.tables[id] = newTable(id, rid, i); } });
  return cs;
}
function newTable(id, room, no) { return { id, room, no, seats: Array(C.seats).fill(null), ph: 'bet', dl: null, d: { c: [], hole: null, bj: false }, turn: null, shoe: freshShoe(null), round: 0, log: [], dealer: C.dealers[room][(no - 1) % C.dealers[room].length] }; }
function freshShoe(old) { const n = 52 * C.decks; return { key: Math.random().toString(36).slice(2, 12), n: ((old && old.n) || 0) + 1, pos: 1, cut: Math.floor(n * C.pen), rc: 0, size: n }; } // pos 1: one card burned
export function cas(p) {
  const L = p.life; if (!L) return null;
  if (!L.cas) L.cas = { chips: 0, buy: 0, turn: 0, net: 0, best: 0, hands: 0, mTurn: 0, limit: 0, quiet: false, seat: null, pit: { warn: 0, at: -99 } };
  return L.cas;
}
export const chipsK = (p) => (p && p.life && p.life.cas ? p.life.cas.chips : 0);
export const cardOf = (c) => { const t = (c && c.turn) || 0; let out = C.card[0]; C.card.forEach((x) => { if (t >= x.min) out = x; }); return out; };
export const maxBet = (city, room) => Math.round(ROOMS[room].max * ((city.casino && city.casino.cfg.max[room]) || 1));
export const shared = (t) => t.seats.filter((s) => s && s.k === 'p').length > 1;
export function seatOf(city, pid) { const cs = city.casino; if (!cs) return null; for (const t of Object.values(cs.tables)) { const i = t.seats.findIndex((s) => s && s.id === pid); if (i >= 0) return { t, i, s: t.seats[i] }; } return null; }
const inHand = (t, s) => t.ph !== 'bet' && s.hands.length > 0 && !s.done;
// who may sit in a room: prestige (humans only), the Players Card opens the Vault one tier early
export function gate(city, p, room, ctx) {
  const r = ROOMS[room]; if (!r) return 'Unknown room.';
  if (p.bot || p.admin || !r.tier) return null;
  const tier = ctx.tier(p), c = cas(p), card = cardOf(c);
  if (tier >= r.tier) return null;
  if (r.black != null && card.id === 'black' && tier >= r.black) return null;
  return `${r.name} is for ${ctx.tierName(r.tier)} tycoons and above${r.black != null ? ` (or ${ctx.tierName(r.black)} with a Black Players Card)` : ''}. Grow your prestige in Personal first.`;
}
function say(t, who, text, kind) { t.log.unshift({ at: Date.now(), who, text, k: kind || '' }); if (t.log.length > 8) t.log.length = 8; }

// ---------------------------------------------------------------- the house: the casino's owner pays and gets paid
function house(city, t, s, v, ctx) { // v = what the house wins (k), negative when the player wins
  if (!v) return;
  const l = ctx.listing(C.lid); if (!l || !l.owner) return;
  if (s.k === 'p' && ctx.canRun(s.id, l)) return; // you never play against your own house
  ctx.credit(l.owner, v / 1000);
  if (l.ops) { l.ops.cur = l.ops.cur || {}; l.ops.cur.tbl = (l.ops.cur.tbl || 0) + v / 1000; }
  const cs = city.casino; cs.mo = cs.mo && cs.mo.m === city.m ? cs.mo : { m: city.m, net: 0, turn: 0, hands: 0, big: 0 }; cs.mo.net += v;
}
function pay(city, s, v) { if (s.k === 'p') { const p = city.players[s.id]; if (p) cas(p).chips += v; } else s.stack += v; }
function chipsAt(city, s) { if (s.k === 'p') { const p = city.players[s.id]; return p ? cas(p).chips : 0; } return s.stack; }
function take(city, s, v) { if (chipsAt(city, s) < v - 1e-9) return false; pay(city, s, -v); s.staked += v; return true; }

// ---------------------------------------------------------------- the round
function exposed(t, c) { t.shoe.rc += hiLo(c); return c; }
function draw(t) { const c = shoeOf(t)[t.shoe.pos++]; t.pend = (t.pend || 0) + 1; return exposed(t, c); }
// a timer starts once the cards dealt since the last one have landed on screen (C.dealMs each), so dealing never eats a player's time
function due(t, now, sec) { const at = now + sec * 1000 + (t.pend ? t.pend * C.dealMs + C.dealTail : 0) + (t.gap || 0) * C.turnGap; t.pend = 0; t.gap = 0; return at; }
function needShuffle(t, now) { const r = ROOMS[t.room]; return r.csm || t.shoe.pos >= t.shoe.cut || (t.pref && t.pref > now); }

function deal(city, t, now, ctx) {
  const r = ROOMS[t.room], max = maxBet(city, t.room);
  botsMove(city, t, ctx);
  const players = t.seats.filter((s) => s && (s.k === 'b' || (s.ready && s.bet > 0)));
  if (!players.length) { t.dl = null; return; }
  if (needShuffle(t, now)) { const quietShuffle = r.csm; t.shoe = freshShoe(t.shoe); if (!quietShuffle) say(t, t.dealer, C.talk.shuffle, 'dealer'); }
  t.round++; t.d = { c: [], hole: null, bj: false }; t.turn = null; t.dl = null; t.pend = 0; t.gap = 0;
  const tc = t.shoe.rc / Math.max(0.5, (t.shoe.size - t.shoe.pos) / 52);
  t.seats.forEach((s) => {
    if (!s) return;
    const want = s.k === 'b' || (s.ready && s.bet > 0);
    s.hands = []; s.done = false; s.net = 0; s.staked = 0; s.ins = null; s.side = null; s.res = null; s.ready = false;
    if (!want) return;
    if (s.k === 'b') { s.bet = Math.min(max, s.stack, r.min * pick([1, 1, 2, 2, 3, 5])); s.pp = 0; s.t3 = 0; if (s.bet < r.min) { s.bet = 0; return; } }
    if (!(s.bet > 0)) return;
    const p = s.k === 'p' ? city.players[s.id] : null;
    if (s.bet < r.min || s.bet > max || !take(city, s, s.bet)) { if (p) say(t, s.name, 'sits this one out (not enough chips).', 'sys'); s.bet = 0; return; }
    if (s.pp > 0 && !take(city, s, s.pp)) s.pp = 0;
    if (s.t3 > 0 && !take(city, s, s.t3)) s.t3 = 0;
    s.hands = [{ c: [], bet: s.bet, st: 'play' }];
    if (p) pitWatch(city, t, s, p, tc, now, ctx);
  });
  const live = t.seats.filter((s) => s && s.hands.length);
  if (!live.length) return;
  live.forEach((s) => s.hands[0].c.push(draw(t)));
  t.d.c.push(draw(t));
  live.forEach((s) => s.hands[0].c.push(draw(t)));
  t.d.hole = t.shoe.pos++; t.pend++; // dealt face down: only its place in the shoe is kept
  live.forEach((s) => {
    const h = s.hands[0], [a, b] = h.c, up = t.d.c[0], P = C.pays;
    s.side = {};
    if (s.pp > 0) { const k = perfectPairs(a, b); const won = k ? s.pp * (1 + P.pp[k]) : 0; s.side.pp = { k, bet: s.pp, won }; if (won) pay(city, s, won); s.net += won - s.pp; }
    if (s.t3 > 0) { const k = twentyOne3(a, b, up); const won = k ? s.t3 * (1 + P.t3[k]) : 0; s.side.t3 = { k, bet: s.t3, won }; if (won) pay(city, s, won); s.net += won - s.t3; }
    if (natural(h)) h.st = 'bj';
  });
  const up = t.d.c[0];
  if (rank(up) === 0) { // insurance first
    t.ph = 'ins'; live.forEach((s) => { s.ins = s.k === 'b' ? 0 : null; });
    if (live.filter((s) => s.k === 'p').length > 1) t.dl = due(t, now, C.insSec);
    return;
  }
  peek(city, t, now, ctx);
}
function holeCard(t) { return shoeOf(t)[t.d.hole]; }
function peek(city, t, now, ctx) {
  const up = t.d.c[0], v = cval(up);
  if (v === 10 || v === 11) {
    const bj = total([up, holeCard(t)]).t === 21;
    if (rank(up) === 0) t.seats.forEach((s) => { if (s && s.hands.length && s.ins > 0) { const won = bj ? s.ins * (1 + C.pays.ins) : 0; if (won) pay(city, s, won); s.net += won - s.ins; } });
    if (bj) { t.d.c.push(exposed(t, holeCard(t))); t.d.hole = null; t.d.bj = true; say(t, t.dealer, 'Dealer has blackjack.', 'dealer'); return settle(city, t, now, ctx); }
    if (rank(up) === 0) say(t, t.dealer, 'No blackjack. Insurance loses.', 'dealer');
  }
  t.ph = 'play'; t.turn = null; nextTurn(city, t, now, ctx);
}
function nextTurn(city, t, now, ctx) {
  for (;;) {
    let found = null;
    for (let i = 0; i < t.seats.length && !found; i++) { const s = t.seats[i]; if (!s || !s.hands.length) continue; const hi = s.hands.findIndex((h) => h.st === 'play'); if (hi >= 0) found = { s: i, h: hi }; }
    if (!found) { t.turn = null; t.dl = null; return dealerPlay(city, t, now, ctx); }
    if (t.turn && (t.turn.s !== found.s || t.turn.h !== found.h)) t.gap = (t.gap || 0) + 1; // the screen pauses when the turn moves on
    t.turn = found; const s = t.seats[found.s];
    if (s.k === 'b') { const h = s.hands[found.h]; const a = basic(h.c, t.d.c[0], opts(city, t, s, h)); move(city, t, s, h, a === 'surrender' && !opts(city, t, s, h).surrender ? 'hit' : a); continue; }
    t.dl = shared(t) ? due(t, now, C.turnSec) : null; return;
  }
}
// what a hand may do right now
export function opts(city, t, s, h) {
  const two = h.c.length === 2, room = chipsAt(city, s) >= h.bet, { t: tot } = total(h.c);
  return { hit: !h.sa && tot < 21, stand: true, double: two && !h.sa && room, split: two && s.hands.length < 4 && cval(h.c[0]) === cval(h.c[1]) && room && !h.sa, surrender: two && s.hands.length === 1 && !h.sp };
}
function move(city, t, s, h, a) {
  if (a === 'hit') { h.c.push(draw(t)); const v = total(h.c).t; if (v > 21) h.st = 'bust'; else if (v === 21) h.st = 'stand'; }
  else if (a === 'stand') h.st = 'stand';
  else if (a === 'double') { take(city, s, h.bet); h.bet *= 2; h.dbl = true; h.c.push(draw(t)); h.st = total(h.c).t > 21 ? 'bust' : 'stand'; }
  else if (a === 'split') {
    take(city, s, h.bet); const aces = rank(h.c[0]) === 0, nh = { c: [h.c.pop()], bet: h.bet, st: 'play', sp: true }; h.sp = true;
    s.hands.splice(s.hands.indexOf(h) + 1, 0, nh); h.c.push(draw(t)); nh.c.push(draw(t));
    [h, nh].forEach((x) => { if (aces) { x.sa = true; x.st = 'stand'; } else if (total(x.c).t === 21) x.st = 'stand'; });
  } else if (a === 'surrender') h.st = 'sur';
  if (s.k === 'b' && h.st === 'bust' && Math.random() < 0.3) say(t, s.name, pick(C.talk.bust), 'bot');
}
function dealerPlay(city, t, now, ctx) {
  t.ph = 'dealer';
  if (t.d.hole != null) { t.d.c.push(exposed(t, holeCard(t))); t.d.hole = null; }
  const waiting = t.seats.some((s) => s && s.hands.some((h) => h.st === 'stand'));
  if (waiting) while (total(t.d.c).t < 17) t.d.c.push(draw(t));
  settle(city, t, now, ctx);
}
function settle(city, t, now, ctx) {
  const D = total(t.d.c).t, dbj = t.d.bj || (t.d.c.length === 2 && D === 21);
  t.seats.forEach((s) => {
    if (!s || !s.hands.length) return;
    s.hands.forEach((h) => {
      let back = 0, res;
      if (h.st === 'sur') { back = h.bet / 2; res = 'sur'; }
      else if (h.st === 'bust') res = 'bust';
      else if (h.st === 'bj' && !h.sp) { if (dbj) { back = h.bet; res = 'push'; } else { back = h.bet * (1 + C.pays.bj); res = 'bj'; } }
      else if (dbj) res = 'lose';
      else { const v = total(h.c).t; if (D > 21 || v > D) { back = h.bet * 2; res = 'win'; } else if (v === D) { back = h.bet; res = 'push'; } else res = 'lose'; }
      h.res = res; h.won = back; if (back) pay(city, s, back); s.net += back - h.bet;
    });
    s.done = true;
    const p = s.k === 'p' ? city.players[s.id] : null;
    house(city, t, s, -s.net, ctx);
    if (p) record(city, t, s, p, ctx);
    else { if (s.hands.some((h) => h.res === 'bj') && Math.random() < 0.6) say(t, s.name, pick(C.talk.bj), 'bot'); else if (s.net >= ROOMS[t.room].min * 3 && Math.random() < 0.3) say(t, s.name, pick(C.talk.win), 'bot'); }
  });
  t.ph = 'bet'; t.turn = null; t.dl = null; t.last = now;
}
function record(city, t, s, p, ctx) {
  const c = cas(p); c.turn += s.staked; c.mTurn = (c.mTurn || 0) + s.staked; c.net += s.net; c.hands++; if (s.net > c.best) c.best = s.net;
  const before = c.card; c.card = cardOf(c).id; if (before && before !== c.card) ctx.feed(p, `Marina Royale: ${cardOf(c).name} Players Card`, `You have now bet ${r2(c.turn / 1000)} M at the tables. ${cardOf(c).name} members get ${cardOf(c).rebate}% of a month's bets back${cardOf(c).legacy ? ' and a dinner on the house in any month you play' : ''}.`, 'good');
  const cs = city.casino; cs.mo = cs.mo && cs.mo.m === city.m ? cs.mo : { m: city.m, net: 0, turn: 0, hands: 0, big: 0 }; cs.mo.turn += s.staked; cs.mo.hands++;
  if (s.net >= C.news) { cs.mo.big = Math.max(cs.mo.big, s.net); if (!c.quiet && ROOMS[t.room].tier < 3) ctx.news(`Big night at Marina Royale`, `${p.name} won ${r2(s.net / 1000)} M in one hand of Blackjack at the ${ROOMS[t.room].name}.`, 'info'); }
}
// the pit boss: a player who bets big only when the shoe is good gets a word, then a table that shuffles every round
function pitWatch(city, t, s, p, tc, now, ctx) {
  if (ROOMS[t.room].csm) return;
  const c = cas(p), pit = c.pit, P = C.pit;
  if (pit.shoe !== t.id + t.shoe.key) { pit.shoe = t.id + t.shoe.key; pit.lo = s.bet; pit.n = 0; pit.flag = false; }
  if (tc <= 0) pit.lo = Math.min(pit.lo || s.bet, s.bet);
  if (tc >= P.tc && pit.lo && s.bet >= P.spread * pit.lo) pit.n++;
  if (pit.n >= P.times && !pit.flag) {
    pit.flag = true; if (city.m - (pit.at ?? -99) > 6) pit.warn = 0; pit.warn++; pit.at = city.m;
    if (pit.warn === 1) { say(t, 'Pit boss', C.talk.pit1, 'pit'); ctx.feed(p, 'The pit boss noticed you', 'Your bets jump when the shoe is full of tens. That is legal, but the house watches counters.', 'warn'); }
    else { t.pref = now + P.prefMin * 60000; say(t, 'Pit boss', C.talk.pit2, 'pit'); ctx.feed(p, 'Marina Royale shuffles your table more often', `For the next ${P.prefMin} minutes the shoe at ${ROOMS[t.room].name} is shuffled before every round.`, 'warn'); }
  }
}
// rival bots take a seat now and then at a table where a tycoon plays, and leave again
function botsMove(city, t, ctx) {
  const r = ROOMS[t.room], B = C.bots;
  t.seats.forEach((s, i) => { if (s && s.k === 'b' && (Math.random() < B.leave || s.stack < r.min)) { const b = city.players[s.id]; if (b && b.life) b.life.wallet += s.stack / 1000; if (Math.random() < 0.5) say(t, s.name, pick(C.talk.leave), 'bot'); t.seats[i] = null; } });
  if (!t.seats.some((s) => s && s.k === 'p')) return;
  if (t.seats.filter((s) => s && s.k === 'b').length >= B.max || !t.seats.includes(null) || Math.random() > B.join) return;
  const seated = new Set(Object.values(city.casino.tables).flatMap((x) => x.seats.filter(Boolean).map((s) => s.id)));
  const b = pick(Object.values(city.players).filter((x) => x.bot && !seated.has(x.id) && x.life && x.life.wallet * 1000 >= r.min * B.buyX));
  if (!b) return;
  const stack = Math.round(Math.min(b.life.wallet * 1000 * B.stack, r.max * 20)); b.life.wallet -= stack / 1000;
  const i = t.seats.indexOf(null); t.seats[i] = { k: 'b', id: b.id, name: b.name, stack, bet: 0, pp: 0, t3: 0, hands: [], seen: Date.now() };
  if (Math.random() < 0.6) say(t, b.name, pick(C.talk.sit), 'bot');
}

// ---------------------------------------------------------------- timers: deal when everyone has bet, stand for whoever is away
export function step(city, t, now, ctx) {
  for (let guard = 0; guard < 12; guard++) {
    if (t.ph === 'bet') {
      t.seats.forEach((s, i) => { if (s && s.k === 'p' && now - (s.seen || 0) > C.idleMin * 60000) { const p = city.players[s.id]; if (p) cas(p).seat = null; t.seats[i] = null; } });
      t.seats.forEach((s, i) => { if (s && s.k === 'p' && Math.max(s.idle || 0, s.out || 0) >= C.awayMax) { const p = city.players[s.id]; if (p) cas(p).seat = null; t.seats[i] = null; say(t, t.dealer, `${s.name} has been away for ${C.awayMax} hands and leaves the seat.`, 'dealer'); } });
      const humans = t.seats.filter((s) => s && s.k === 'p'), ready = humans.filter((s) => s.ready && s.bet > 0);
      if (!humans.length) { t.dl = null; t.seats.forEach((s, i) => { if (s && s.k === 'b') { const b = city.players[s.id]; if (b && b.life) b.life.wallet += s.stack / 1000; t.seats[i] = null; } }); return; }
      if (!ready.length) { t.dl = null; return; }
      if (ready.length === humans.length || (t.dl && now >= t.dl)) { humans.forEach((s) => { s.out = s.ready && s.bet > 0 ? 0 : (s.out || 0) + 1; }); deal(city, t, now, ctx); continue; }
      if (!t.dl) t.dl = due(t, now, C.betSec);
      return;
    }
    if (t.ph === 'ins') {
      const open = t.seats.filter((s) => s && s.hands.length && s.ins == null);
      if (open.length && !(t.dl && now >= t.dl)) return;
      open.forEach((s) => { s.ins = 0; }); t.dl = null; peek(city, t, now, ctx); continue;
    }
    if (t.ph === 'play') {
      if (t.turn && !t.dl && shared(t)) { t.dl = due(t, now, C.turnSec); return; } // someone sat down mid-hand: from now on the turn has a clock
      if (t.turn && t.dl && now >= t.dl) { const s = t.seats[t.turn.s], h = s && s.hands[t.turn.h]; if (h) { h.st = 'stand'; s.idle = (s.idle || 0) + 1; say(t, t.dealer, `${s.name} is away. Standing.`, 'dealer'); } nextTurn(city, t, now, ctx); continue; }
      return;
    }
    return;
  }
}
export function stepAll(city, now, ctx) { if (!city.casino) return; Object.values(city.casino.tables).forEach((t) => step(city, t, now, ctx)); }

// ---------------------------------------------------------------- the month: Players Card cashback and dinners
export function monthStep(city, m, ctx) {
  if (!city.casino) return;
  const l = ctx.listing(C.lid), comp = city.casino.cfg.comp ?? 1;
  Object.values(city.players).forEach((p) => {
    const c = p.life && p.life.cas; if (!c || p.bot || !(c.mTurn > 0)) return;
    const card = cardOf(c), back = Math.floor(c.mTurn * card.rebate / 100 * comp * 10) / 10;
    if (back >= 0.1) {
      p.life.wallet += back / 1000; ctx.tx(p, `Marina Royale · ${card.name} cashback`, back / 1000);
      if (l && l.owner && !ctx.canRun(p.id, l)) { ctx.credit(l.owner, -back / 1000); if (l.ops) { l.ops.cur = l.ops.cur || {}; l.ops.cur.tbl = (l.ops.cur.tbl || 0) - back / 1000; } }
    }
    if (card.legacy && c.mTurn >= C.compMin) { p.life.legacy = (p.life.legacy || 0) + card.legacy; ctx.feed(p, 'Dinner on the house', `Marina Royale invited you to dinner as a ${card.name} member. People saw you there (+${card.legacy} legacy prestige).`, 'good'); }
    c.mTurn = 0;
  });
  // a new owner starts from the house settings
  const who = l && l.owner ? `${l.owner.k}:${l.owner.id}` : null;
  if (city.casino.cfg.owner !== who) city.casino.cfg = { owner: who, max: { main: 1, high: 1, vault: 1 }, comp: 1 };
}

// ---------------------------------------------------------------- actions
export function act(city, p, action, a, ctx, now = Date.now()) {
  ensure(city);
  if (p.bot) return err('Bots play on their own.');
  if (!p.life) return err('Your personal account is not open yet.');
  const c = cas(p), at = seatOf(city, p.id);
  if (at) { if (action !== 'casTick') at.s.seen = now; step(city, at.t, now, ctx); }
  const T = at && at.t, S = at && at.s;
  switch (action) {
    case 'casBuy': {
      const amt = r2(Number(a.amt) || 0); if (amt <= 0) return err('Choose an amount.');
      if (p.life.wallet < amt - 1e-9) return err('Not that much on your private account.');
      p.life.wallet -= amt; c.chips += Math.round(amt * 1000); c.buy += Math.round(amt * 1000); ctx.tx(p, 'Marina Royale · chips bought', -amt);
      return ok(`${amt >= 1 ? amt + ' M' : Math.round(amt * 1000) + ' k'} in chips. Good luck.`);
    }
    case 'casCash': {
      if (T && inHand(T, S)) return err('Finish the hand first.');
      if (!(c.chips > 0)) return err('You have no chips.');
      const v = c.chips, net = v - c.buy; p.life.wallet += v / 1000; ctx.tx(p, 'Marina Royale · chips cashed', v / 1000); c.chips = 0; c.buy = 0;
      if (T) { T.seats[at.i] = null; c.seat = null; }
      return ok(`Cashed ${r2(v / 1000)} M. ${net > 0 ? `You are ${r2(net / 1000)} M up tonight.` : net < 0 ? `Down ${r2(-net / 1000)} M tonight.` : 'Even tonight.'}`);
    }
    case 'casLimit': { const k = Math.max(0, Math.round(Number(a.k) || 0)); c.limit = k; return ok(k ? `Stop at a loss of ${r2(k / 1000)} M tonight.` : 'No limit tonight.'); }
    case 'casQuiet': { c.quiet = !!a.on; return ok(c.quiet ? 'The casino keeps your wins out of the Gazette.' : 'Big wins may make the Gazette.'); }
    case 'casSit': {
      const t = city.casino.tables[a.tid]; if (!t) return err('Unknown table.');
      const g = gate(city, p, t.room, ctx); if (g) return err(g);
      if (T === t) return ok();
      if (T) { if (inHand(T, S)) return err('Finish the hand first.'); T.seats[at.i] = null; }
      let i = Number.isInteger(a.seat) && !t.seats[a.seat] ? a.seat : t.seats.indexOf(null);
      if (i < 0 || i >= C.seats) return err('The table is full. Try another.');
      t.seats[i] = { k: 'p', id: p.id, name: p.name, bet: 0, pp: 0, t3: 0, hands: [], seen: now, ready: false };
      c.seat = t.id; if (t.ph === 'bet' && !t.round) say(t, t.dealer, `Welcome to ${ROOMS[t.room].name}, ${p.name.split(' ')[0]}.`, 'dealer');
      step(city, t, now, ctx); return ok();
    }
    case 'casLeave': {
      if (!T) return ok(); if (inHand(T, S)) return err('Finish the hand first.');
      T.seats[at.i] = null; c.seat = null; step(city, T, now, ctx); return ok();
    }
    case 'casDeal': {
      if (!T) return err('Take a seat first.'); if (T.ph !== 'bet') return err('Wait for the next round.');
      const r = ROOMS[T.room], max = maxBet(city, T.room), main = Number(a.main) || 0, pp = Number(a.pp) || 0, t3 = Number(a.t3) || 0;
      if (![main, pp, t3].every(Number.isInteger)) return err('Bet in whole chips.');
      if (main < r.min) return err(`The minimum here is ${r.min} k.`); if (main > max) return err(`The maximum here is ${max >= 1000 ? max / 1000 + ' M' : max + ' k'}.`);
      if (pp < 0 || t3 < 0 || pp > r.side || t3 > r.side) return err(`Side bets are up to ${r.side} k.`);
      if (main + pp + t3 > c.chips) return err('Not enough chips. Visit the cashier.');
      if (c.limit && c.buy - c.chips + main + pp + t3 > c.limit) return err(`You set a limit of ${r2(c.limit / 1000)} M tonight. Change it at the cashier.`);
      S.bet = main; S.pp = pp; S.t3 = t3; S.ready = true;
      step(city, T, now, ctx); return ok();
    }
    case 'casIns': {
      if (!T || T.ph !== 'ins' || !S.hands.length || S.ins != null) return err('No insurance to decide.');
      const v = a.take ? S.hands[0].bet / 2 : 0; if (v && !take(city, S, v)) return err('Not enough chips for insurance.');
      S.ins = v; step(city, T, now, ctx); return ok();
    }
    case 'casHit': case 'casStand': case 'casDouble': case 'casSplit': case 'casSurrender': {
      if (!T || T.ph !== 'play' || !T.turn || T.seats[T.turn.s] !== S) return err('It is not your turn.');
      const h = S.hands[T.turn.h], o = opts(city, T, S, h), m = action.slice(3).toLowerCase();
      if (!o[m]) return err({ hit: 'You cannot take another card.', double: 'You can only double on your first two cards (and need the chips).', split: 'You can only split two cards of the same value (and need the chips).', surrender: 'Surrender only on your first two cards.' }[m] || 'Not now.');
      S.idle = 0; move(city, T, S, h, m); if (h.st !== 'play') nextTurn(city, T, now, ctx); else if (shared(T)) T.dl = due(T, now, C.turnSec);
      return ok();
    }
    case 'casTick': if (T) step(city, T, now, ctx); return ok();
    case 'casCfg': {
      const l = ctx.listing(C.lid); if (!l || !ctx.canRun(p.id, l)) return err('Only the casino\'s owner sets the tables.');
      const cfg = city.casino.cfg;
      if (a.room) { if (!ROOMS[a.room] || !C.maxX.includes(Number(a.x))) return err('Pick one of the limits.'); cfg.max[a.room] = Number(a.x); return ok(`${ROOMS[a.room].name}: maximum ${maxBet(city, a.room)} k.`); }
      if (a.comp != null) { const v = Number(a.comp); if (!C.comp.some(([x]) => x === v)) return err('Pick one of the settings.'); cfg.comp = v; return ok('Players Card cashback set.'); }
      return err('Nothing to change.');
    }
  }
  return null;
}
