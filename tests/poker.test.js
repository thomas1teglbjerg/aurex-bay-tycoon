// Marina Royale: Texas Hold'em. Hand ranking, side pots, the hidden deck, bots always seated, a tycoon's hands,
// timeouts, the rake to the owner, and money that never appears or disappears.
import * as E from '../supabase/functions/_shared/engine.js';
import * as LIFE from '../supabase/functions/_shared/life.js';
import * as CAS from '../supabase/functions/_shared/casino.js';
import * as PK from '../supabase/functions/_shared/poker.js';
import { CASINO } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
CAS.setSecret('poker-secret');
// cards: face 2–14 (14 = ace) and suit (♠ 0, ♥ 1, ♦ 2, ♣ 3)
const c = (v, s = 0) => (v === 14 ? 0 : v - 1) + 13 * s;
const sc = (...x) => PK.score(x);

// --- hand ranking
assert(PK.handName(sc(c(14), c(13), c(12), c(11), c(10), c(2, 1), c(3, 2))) === 'Royal flush', 'royal flush');
assert(PK.handName(sc(c(14), c(2), c(3), c(4), c(5), c(9, 1), c(9, 2))) === 'Straight flush, Five high', 'the wheel straight flush');
assert(PK.handName(sc(c(9), c(9, 1), c(9, 2), c(4), c(4, 1), c(4, 2), c(2))) === 'Full house, Nines full of Fours', 'two sets make a full house');
assert(sc(c(14), c(14, 1), c(13), c(13, 1), c(2), c(3, 2), c(7, 3)) > sc(c(14), c(14, 1), c(12), c(12, 1), c(13, 2), c(3, 2), c(7, 3)), 'aces and kings beat aces and queens');
assert(sc(c(10), c(10, 1), c(14), c(5, 2), c(3, 3)) > sc(c(10), c(10, 1), c(13), c(5, 2), c(3, 3)), 'the kicker decides');
assert(PK.handName(sc(c(14, 1), c(5, 1), c(9, 1), c(2, 1), c(7, 1), c(13), c(13, 2))) === 'Flush, Ace high', 'a flush beats a pair');
assert(PK.handName(sc(c(6), c(7, 1), c(8, 2), c(9, 3), c(10), c(10, 1), c(2))) === 'Straight, Ten high', 'straight');
assert(sc(c(14), c(14, 1), c(14, 2), c(14, 3), c(2)) > sc(c(13), c(13, 1), c(13, 2), c(12), c(12, 1)), 'quads beat a full house');
const eqAA = PK.equity([c(14), c(14, 1)], [], 1, 600), eq72 = PK.equity([c(7), c(2, 1)], [], 1, 600);
assert(eqAA > 0.75 && eq72 < 0.42, `equity: aces ${eqAA.toFixed(2)}, seven-two ${eq72.toFixed(2)}`);

// --- side pots
const pots = PK.pots({ in: [0, 1, 2], put: { 0: 50, 1: 200, 2: 200 }, fold: {} });
assert(pots.length === 2 && pots[0].v === 150 && pots[0].who.join() === '0,1,2' && pots[1].v === 300 && pots[1].who.join() === '1,2', 'an all-in for less makes a main pot and a side pot');
const p2 = PK.pots({ in: [0, 1, 2], put: { 0: 30, 1: 120, 2: 80 }, fold: { 0: true } });
assert(p2.reduce((a, p) => a + p.v, 0) === 230 && p2[p2.length - 1].who.join() === '1', 'the uncalled part goes back to the one who bet it');

// --- the city: two poker tables on the Main Floor, bots already playing
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 1 }); E.advance(city, now);
const tb = city.casino.pk['pk-1'], tb2 = city.casino.pk['pk-2'];
assert(tb && tb2 && PK.def(tb).bb === 2 && PK.def(tb2).bb === 10, 'two Hold\'em tables: 1/2 k and 5/10 k');
const bots = (t) => t.seats.filter((s) => s && s.k === 'b').length;
assert(bots(tb) >= 2 && bots(tb2) >= 2, `bots sit down by themselves (${bots(tb)} and ${bots(tb2)})`);
assert(tb.h && tb.h.ev.length > 3, 'and a hand is played between bots with nobody watching');
const json = JSON.stringify(city.casino.pk);
const deck = CAS.deckOf(tb.h.key), hole0 = tb.h.hole[tb.h.in[0]].map((x) => deck[x]);
assert(Number.isInteger(tb.h.hole[tb.h.in[0]][0]) && tb.h.hole[tb.h.in[0]][0] < 20, 'hole cards are stored as places in the hidden deck');
void json; void hole0;
// money check: bots' wallets + cash + stacks stay the same over many bot hands (minus the rake)
const botMoney = () => Object.values(city.players).filter((p) => p.bot).reduce((a, p) => a + p.life.wallet * 1000 + p.cash * 1000, 0) + PK.tables(city).reduce((a, t) => a + t.seats.reduce((x, s) => x + (s && s.k === 'b' ? s.stack : 0), 0) + (t.h && !t.h.done ? Object.values(t.h.put).reduce((x, y) => x + y, 0) : 0), 0);
let rake = 0; const m0 = botMoney(), r0 = PK.tables(city).reduce((a, t) => a + (t.h && t.h.done ? t.h.rake : 0), 0);
let hands = 0, minBots = 9;
for (let k = 0; k < 300; k++) {
  now += 40_000;
  PK.tables(city).forEach((t) => { const n = t.n; PK.step(city, t, now, E.csx(city)); if (t.n !== n) { hands++; rake += t.h.done ? t.h.rake : 0; } minBots = Math.min(minBots, bots(t)); });
}
assert(hands > 300, `bots keep playing on their own (${hands} hands)`);
assert(minBots >= 2, 'never fewer than two bots at a table');
assert(Math.abs(botMoney() - m0 + rake) < 1e-6 * Math.abs(m0) + 1, `bots' money only changes by the rake (${rake} k)`);
void r0;

// --- a tycoon sits down
E.addPlayer(city, 'u', 'Thomas Teg', now); const p = city.players.u; p.life.wallet = 50;
const A = (a, x) => E.apply(city, 'u', a, x, now);
assert(!A('pkSit', { tid: 'pk-1', buy: 100 }).ok, 'chips first');
A('casBuy', { amt: 1 });
assert(!A('pkSit', { tid: 'pk-1', buy: 20 }).ok && !A('pkSit', { tid: 'pk-1', buy: 300 }).ok, 'buy-in 40–200 k at 1/2');
let r = A('pkSit', { tid: 'pk-1', buy: 200 });
assert(r.ok && p.life.cas.chips === 800 && p.life.cas.pk === 200, 'buy in with 200 k of your chips');
assert(Math.abs(LIFE.netWorth(city, p) - (49 + 1 + LIFE.equity(city, p) + LIFE.collectionValue(city, p))) < 1e-6, 'the stack at the table counts in your net worth');
assert(!A('casSit', { tid: 'main-1' }).ok, 'one table at a time');
const me = () => PK.seatOf(city, 'u');
// play until it is our turn, then take simple moves; check that our hole cards come only in answers
let myHands = 0, sawHole = 0, sawTurn = 0, bad = '';
const total0 = () => p.life.cas.chips + (me() ? me().s.stack : 0);
for (let k = 0; k < 4000 && myHands < 40; k++) {
  const at = me(); if (!at) break; const t = at.t, h = t.h;
  if (h && !h.done && h.turn === at.i) {
    now = Math.max(now, t.vis) + 500; sawTurn++;
    const o = PK.options(t, at.i), x = Math.random();
    r = x < 0.15 ? A('pkFold') : x < 0.7 ? A(o.check ? 'pkCheck' : 'pkCall') : o.raise ? A('pkRaise', { to: o.min }) : A('pkCall');
    if (!r.ok) bad = r.msg; if (r.hole && r.hole.c.length === 2 && r.hole.tid === 'pk-1') sawHole++;
    continue;
  }
  const n = t.n; now += 3000; r = A('pkTick', { tid: 'pk-1' }); if (t.n !== n) myHands++;
  if (me() && me().s.stack < 20) A('pkTop');
}
assert(!bad, `every move went through ${bad}`);
assert(myHands >= 30 && sawTurn > 20 && sawHole === sawTurn, `a tycoon plays hands with the bots (${myHands} hands, ${sawTurn} moves), your two cards ride in every answer`);
assert(!/"c":\[\d+,\d+\]/.test(JSON.stringify(city.casino.pk['pk-1'].h.ev.filter((e) => e.k !== 'show'))), 'no hole cards in the table state until a showdown');
assert(p.life.cas.pkHands >= 30, 'hands played are counted');

// --- timeouts: away three times and the seat is given up, the stack back to chips
const before = total0();
for (let k = 0; k < 400 && me(); k++) { const t = me().t; now = Math.max(now + 2000, (t.h && t.h.dl) ? t.h.dl + 10 : t.next + 10); PK.step(city, t, now, E.csx(city)); }
assert(!me() && p.life.cas.pk === 0, 'away three hands: the seat is given up');
assert(p.life.cas.chips > 0 && p.life.cas.chips <= before, 'and the stack is back with your chips');

// --- the rake goes to the casino's owner
const l = city.listings.find((x) => x.id === CASINO.lid);
E.addPlayer(city, 'o', 'Olivia Owner', now); l.owner = { k: 'p', id: 'o' }; const o = city.players.o, cash0 = o.cash;
let rk = 0; for (let k = 0; k < 120; k++) { now += 40_000; PK.tables(city).forEach((t) => { const n = t.n; PK.step(city, t, now, E.csx(city)); if (t.n !== n && t.h.done) rk += t.h.rake; }); }
assert(rk > 0 && Math.abs((o.cash - cash0) * 1000 - rk) < 1e-6, `the owner gets the rake (${rk} k)`);

// --- rigged hands heads-up between two tycoons
CASINO.poker.bots.min = 0; CASINO.poker.bots.join = 0; CASINO.poker.bots.swap = 0;
const t = city.casino.pk['pk-2'];
t.seats.forEach((s, i) => { if (s) { const b = city.players[s.id]; b.life.wallet += s.stack / 1000; t.seats[i] = null; } }); t.h = null; t.next = 0; t.vis = 0; t.btn = 1;
E.addPlayer(city, 'v', 'Vera Two', now); const pv = city.players.v; pv.life.wallet = 50;
const V = (a, x) => E.apply(city, 'v', a, x, now);
V('casBuy', { amt: 2 }); A('casBuy', { amt: 2 });
// button = seat 0 = small blind. u: A♠ A♥, v: K♠ K♥; board 2♦ 7♣ 9♠ | J♦ | 4♣: aces win
PK.RIG.next = [c(14), c(13), c(14, 1), c(13, 1), c(3, 3), c(2, 2), c(7, 3), c(9), c(5, 3), c(11, 2), c(6, 3), c(4, 3)];
assert(A('pkSit', { tid: 'pk-2', buy: 1000, seat: 0 }).ok && V('pkSit', { tid: 'pk-2', buy: 1000, seat: 1 }).ok, 'two tycoons sit down');
let h = t.h; assert(h && h.in.length === 2 && h.btn === 0 && h.sbS === 0 && h.bbS === 1 && h.turn === 0, 'heads-up: the button posts the small blind and acts first');
assert(A('pkHole').hole.c.join() === [c(14), c(14, 1)].join() && V('pkHole').hole.c.join() === [c(13), c(13, 1)].join(), 'each tycoon sees only their own two cards');
assert(E.pkHole(city, 'u').hole.c[0] === c(14), 'pkHole for the game function');
assert(h.dl >= t.vis + CASINO.poker.turnSec * 1000 && t.vis > h.at + 1500, 'your clock starts once the blinds and cards are shown');
now = t.vis + 100; assert(!V('pkCall').ok, 'not your turn');
assert(!A('pkRaise', { to: 15 }).ok, 'a raise must be at least the big blind more');
assert(A('pkRaise', { to: 30 }).ok && h.cur === 30 && h.turn === 1, 'raise to 30 k');
now = t.vis + 100; assert(V('pkCall').ok && h.street === 1 && h.board.length === 3 && h.board.join() === [c(2, 2), c(7, 3), c(9)].join(), 'call: the flop after a burn card');
assert(h.turn === 1, 'after the flop the big blind acts first heads-up');
now = t.vis + 100; V('pkCheck'); now = t.vis + 100; A('pkRaise', { to: 50 }); now = t.vis + 100; V('pkCall');
assert(h.board.length === 4, 'the turn');
now = t.vis + 100; V('pkCheck'); now = t.vis + 100; A('pkAllin'); now = t.vis + 100; r = V('pkCall');
assert(r.ok && h.done && h.board.length === 5 && h.win.length === 1 && h.win[0].s === 0 && /Pair of Aces/.test(h.win[0].name), 'all in and called: aces win at the showdown');
assert(t.seats[0].stack === 2000 - h.rake && t.seats[1].stack === 0 && h.rake === 30, 'the winner takes the pot minus a 30 k rake (3 big blinds)');
assert(h.ev.filter((e) => e.k === 'show').length === 2, 'both hands are shown');
// the screen replays the events: at the start only the blinds, at the end the whole pot with the winner
const v0 = PK.view(t, h.ev[0].at), v1 = PK.view(t, h.ev[h.ev.length - 1].at);
assert(v0.board.length === 0 && v1.board.length === 5 && v1.stack[0] === 2000 - h.rake && v1.pot === 0, 'the replay ends where the hand ended');
const vm = PK.view(t, h.ev.find((e) => e.k === 'board').at);
assert(vm.board.length === 3 && vm.pot === 60, 'after the flop is turned the pot holds both calls');
// broke: v leaves; a fold wins the blinds
r = V('pkLeave'); assert(r.ok && !PK.seatOf(city, 'v'), 'leave the table');
// split pot: both make the same straight on the board
r = V('casBuy', { amt: 1 }); now = t.next + 10;
PK.RIG.next = [c(2), c(3), c(2, 1), c(3, 1), c(4, 3), c(10), c(11, 1), c(12, 2), c(4, 2), c(13, 3), c(4, 1), c(14, 2)];
assert(V('pkSit', { tid: 'pk-2', buy: 500, seat: 1 }).ok, 'back with 500 k');
h = t.h; assert(h && !h.done && h.in.length === 2, 'next hand');
const s0 = t.seats[0].stack + h.put[0], s1 = t.seats[1].stack + h.put[1];
for (let g = 0; g < 12 && !h.done; g++) { now = t.vis + 100; const who = h.turn === 0 ? A : V; const o = PK.options(t, h.turn); who(o.check ? 'pkCheck' : 'pkCall'); }
assert(h.done && h.win.length === 2 && Math.abs((t.seats[0].stack - s0) - (t.seats[1].stack - s1)) <= 1, 'a straight on the board splits the pot');
// fold to a raise: the raiser takes the blinds, no flop no rake
now = t.next + 10; A('pkTick', { tid: 'pk-2' }); h = t.h; const st = { 0: t.seats[0].stack + h.put[0], 1: t.seats[1].stack + h.put[1] };
now = t.vis + 100; const first = h.turn, F = first === 0 ? A : V, G = first === 0 ? V : A;
F('pkRaise', { to: 40 }); now = t.vis + 100; G('pkFold');
assert(h.done && h.rake === 0 && t.seats[first].stack === st[first] + 10, 'a fold before the flop: the blinds to the raiser, no rake');
console.log('poker: all good');
