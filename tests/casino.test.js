// Marina Royale: Blackjack rules, chips, the hidden shoe, shared tables, the house, prestige, the pit boss and bots.
import * as E from '../supabase/functions/_shared/engine.js';
import * as LIFE from '../supabase/functions/_shared/life.js';
import * as CAS from '../supabase/functions/_shared/casino.js';
import { CASINO, PRESTIGE_TIERS } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
CAS.setSecret('test-secret');
// cards by face value (1 = A, 2–10, 11 J, 12 Q, 13 K) and suit (♠ 0, ♥ 1, ♦ 2, ♣ 3)
const c = (v, s = 0) => v - 1 + 13 * s, A = 1, T = 10, K = 13;

// --- the rules on their own
assert(CAS.total([c(A), c(6)]).t === 17 && CAS.total([c(A), c(6)]).soft, 'A-6 is soft 17');
assert(CAS.total([c(A), c(A), c(9)]).t === 21, 'A-A-9 is 21');
assert(CAS.total([c(K), c(5), c(9)]).t === 24, 'K-5-9 busts');
assert(CAS.basic([c(T), c(6)], c(T)) === 'surrender' && CAS.basic([c(T), c(6)], c(T), { surrender: false }) === 'hit', 'hard 16 against a ten: surrender, else hit');
assert(CAS.basic([c(7), c(7)], c(5)) === 'split' && CAS.basic([c(T), c(T)], c(5)) === 'stand', 'split sevens, never tens');
assert(CAS.basic([c(5), c(6)], c(6)) === 'double' && CAS.basic([c(A), c(7)], c(9)) === 'hit', 'double 11, hit soft 18 against a nine');
assert(CAS.perfectPairs(c(8, 1), c(8, 1)) === 'perfect' && CAS.perfectPairs(c(8, 1), c(8, 2)) === 'colour' && CAS.perfectPairs(c(8, 0), c(8, 1)) === 'mixed', 'perfect, coloured and mixed pairs');
assert(CAS.twentyOne3(c(4, 2), c(5, 2), c(6, 2)) === 'sflush' && CAS.twentyOne3(c(A), c(12, 1), c(K, 2)) === 'straight' && CAS.twentyOne3(c(3), c(3, 1), c(3, 2)) === 'trips', '21+3 hands');

// --- the shoe: same key and secret, same shoe; another secret, another shoe
const city = E.createCity(now, { speed: 2016 }); E.advance(city, now);
E.addPlayer(city, 'u', 'Thomas Teg', now); const p = city.players.u; p.life.wallet = 50;
const tb = city.casino.tables['main-1']; assert(tb && city.casino.tables['vault-1'], 'six tables in three rooms');
const s1 = CAS.shoeOf(tb).slice(0, 20).join(); CAS.setSecret('other'); const s2 = CAS.shoeOf({ id: 'x', shoe: tb.shoe }).slice(0, 20).join(); CAS.setSecret('test-secret');
assert(s1 === CAS.shoeOf(tb).slice(0, 20).join() && s1 !== s2, 'the shoe follows the secret');
assert(CAS.shoeOf(tb).length === 312 && [...Array(52).keys()].every((k) => CAS.shoeOf(tb).filter((x) => x === k).length === 6), 'six full decks');

const A_ = (a, x) => E.apply(city, 'u', a, x, now);
let r = A_('casDeal', { main: 5 }); assert(!r.ok, 'sit down first');
r = A_('casBuy', { amt: 1 }); assert(r.ok && p.life.cas.chips === 1000 && Math.abs(p.life.wallet - 49) < 1e-9, 'chips from the private wallet');
assert(Math.abs(LIFE.netWorth(city, p) - (49 + 1 + LIFE.equity(city, p) + LIFE.collectionValue(city, p))) < 1e-6, 'chips count in your net worth');
assert(A_('casSit', { tid: 'main-1' }).ok && CAS.seatOf(city, 'u').t.id === 'main-1', 'take a seat on the Main Floor');
assert(!A_('casSit', { tid: 'high-1' }).ok && /Respected/.test(A_('casSit', { tid: 'high-1' }).msg), 'the High Limit Salon needs Respected');
assert(!A_('casDeal', { main: 30 }).ok && !A_('casDeal', { main: 0.5 }).ok, 'table limits 1–25 k');

// --- a rigged hand: player 10+6 against dealer 9 (hole 7), hits a 4 for 20; dealer 16 draws a 5 for 21
CASINO.rooms.main.csm = false; // keep the rigged shoe for this round (the Main Floor shuffles every round)
city.casino.tables['main-1'].seats.forEach((s, i) => { if (s && s.k === 'b') city.casino.tables['main-1'].seats[i] = null; });
CASINO.bots.join = 0;
const t = city.casino.tables['main-1'];
CAS.testShoe(t, [c(T), c(9), c(6), c(7), c(4), c(5)]);
r = A_('casDeal', { main: 10 }); assert(r.ok && t.ph === 'play' && t.seats.find((s) => s && s.id === 'u').hands[0].c.length === 2, 'the deal: two cards each, the dealer shows one');
assert(t.d.c.length === 1 && Number.isInteger(t.d.hole) && !JSON.stringify(t).includes('"shoeCards"'), 'the hole card is only an index into the hidden shoe');
assert(p.life.cas.chips === 990, 'the bet left your chips');
assert(A_('casHit', {}).ok, 'hit');
const me = () => t.seats.find((s) => s && s.id === 'u');
assert(CAS.total(me().hands[0].c).t === 20, 'player has 20');
assert(A_('casStand', {}).ok && t.ph === 'bet' && CAS.total(t.d.c).t === 21 && me().hands[0].res === 'lose', 'dealer draws to 21, player loses');
assert(p.life.cas.chips === 990 && p.life.cas.hands === 1 && p.life.cas.turn === 10, 'loss recorded');

// --- blackjack pays 3:2
CAS.testShoe(t, [c(A), c(9), c(K), c(7)]); t.shoe.pos = 1;
A_('casDeal', { main: 10 }); assert(t.ph === 'bet' && me().hands[0].res === 'bj' && p.life.cas.chips === 1005, 'blackjack pays 15 k on 10 k');
// --- double down: 5+6 against 6, double gets a 10, dealer 6+10+K busts
CAS.testShoe(t, [c(5), c(6), c(6), c(T), c(T), c(K)]); t.shoe.pos = 1;
A_('casDeal', { main: 10 }); r = A_('casDouble', {}); assert(r.ok && me().hands[0].bet === 20 && me().hands[0].res === 'win' && p.life.cas.chips === 1025, 'double down wins twice the bet');
// --- split eights against a 6: 8+3 and 8+K, both stand; dealer 6+T+T busts
CAS.testShoe(t, [c(8), c(6), c(8, 1), c(T), c(3), c(K), c(T)]); t.shoe.pos = 1;
A_('casDeal', { main: 10 }); r = A_('casSplit', {}); assert(r.ok && me().hands.length === 2, 'split into two hands');
A_('casStand', {}); A_('casStand', {}); assert(t.ph === 'bet' && me().hands.every((h) => h.res === 'win') && p.life.cas.chips === 1045, 'both split hands win');
// --- late surrender: 10+6 against a 10 (hole 8)
CAS.testShoe(t, [c(T), c(T), c(6), c(8)]); t.shoe.pos = 1;
A_('casDeal', { main: 10 }); r = A_('casSurrender', {}); assert(r.ok && me().hands[0].res === 'sur' && p.life.cas.chips === 1040, 'surrender gives half back');
// --- insurance: dealer shows an ace and has blackjack
CAS.testShoe(t, [c(T), c(A), c(9), c(K)]); t.shoe.pos = 1;
A_('casDeal', { main: 10 }); assert(t.ph === 'ins', 'an ace up offers insurance');
assert(!A_('casHit', {}).ok, 'no hitting while insurance is open');
A_('casIns', { take: true }); assert(t.ph === 'bet' && t.d.bj && p.life.cas.chips === 1040, 'insurance 2:1 covers the lost hand');
// --- a ten up: the dealer peeks and has blackjack at once
CAS.testShoe(t, [c(T), c(K), c(9), c(A)]); t.shoe.pos = 1;
A_('casDeal', { main: 10 }); assert(t.ph === 'bet' && t.d.bj && p.life.cas.chips === 1030, 'dealer blackjack under a ten ends the round');
// --- side bets: a perfect pair of 8♥ pays 25:1
CAS.testShoe(t, [c(8, 1), c(9), c(8, 1), c(9, 1)]); t.shoe.pos = 1;
A_('casDeal', { main: 10, pp: 2 }); assert(me().side.pp.k === 'perfect' && me().side.pp.won === 52, 'Perfect Pairs 25:1');
A_('casStand', {});

// --- the house: an owner earns what players lose, and you never play against your own casino
const casL = city.listings.find((l) => l.id === CASINO.lid); assert(casL && casL.type === 'casino' && !E.BLD.isPlot(casL), 'Marina Royale stands from day one');
E.addPlayer(city, 'o', 'Owner Person', now); const o = city.players.o; casL.owner = { k: 'p', id: 'o' }; casL.ops = E.OPS.newOps(casL, false); const cash0 = o.cash;
CAS.testShoe(t, [c(T), c(8), c(6), c(T)]); t.shoe.pos = 1;
A_('casDeal', { main: 20 }); A_('casStand', {}); assert(Math.abs(o.cash - cash0 - 0.02) < 1e-9 && Math.abs(casL.ops.cur.tbl - 0.02) < 1e-9, 'the owner wins the 20 k the player lost');
// --- cash out
r = A_('casCash', {}); assert(r.ok && p.life.cas.chips === 0 && !CAS.seatOf(city, 'u'), 'cashing out stands you up and pays the wallet');

// --- prestige: Respected opens the salon, Elite (or Respected with a Black card) the Vault
const setTier = (k) => { p.life.legacy = 0; p.life.legacy = PRESTIGE_TIERS[k].min - LIFE.prestige(city, p).score + 1; };
setTier(2); assert(A_('casSit', { tid: 'high-1' }).ok, 'Respected sits in the High Limit Salon');
assert(!A_('casSit', { tid: 'vault-1' }).ok, 'the Vault needs Elite');
p.life.cas.turn = 30000; assert(A_('casSit', { tid: 'vault-1' }).ok, 'a Black Players Card opens the Vault for Respected');
p.life.cas.turn = 0; setTier(3); A_('casLeave', {});

// --- two tycoons at one table: the deal waits for both, then a timer; an away player stands
E.addPlayer(city, 'v', 'Mikkel Teg', now); const q = city.players.v; q.life.wallet = 10;
const B_ = (a, x) => E.apply(city, 'v', a, x, now);
A_('casBuy', { amt: 1 }); B_('casBuy', { amt: 1 });
const t2 = city.casino.tables['main-2'];
A_('casSit', { tid: 'main-2' }); B_('casSit', { tid: 'main-2' });
CAS.testShoe(t2, [c(T), c(T, 1), c(8), c(7), c(7, 1), c(9)]); t2.shoe.pos = 1;
A_('casDeal', { main: 5 }); assert(t2.ph === 'bet' && t2.dl, 'the deal waits for the other tycoon');
B_('casDeal', { main: 5 }); assert(t2.ph === 'play' && t2.turn && t2.dl, 'both bet: cards out, a turn timer runs');
assert(t2.dl >= now + CASINO.turnSec * 1000 + 6 * CASINO.dealMs, 'the turn timer starts after the six cards have been dealt on screen');
const first = t2.seats[t2.turn.s].id; now += 3000; E.advance(city, now); assert(t2.seats[t2.turn.s].id === first, 'still their turn while the cards are dealt');
now = t2.dl + 100; E.advance(city, now);
assert(t2.turn && t2.seats[t2.turn.s].id !== first, 'the away player stands when the timer runs out');
now = t2.dl + 100; E.advance(city, now); assert(t2.ph === 'bet', 'the round finishes without them');
assert(t2.seats.every((s) => !s || (s.idle || 0) === 1), 'each away hand is counted');
// three hands in a row away: the seat is given up
for (let k = 0; k < 2; k++) { CAS.testShoe(t2, [c(T), c(T, 1), c(8), c(7), c(7, 1), c(9)]); t2.shoe.pos = 1; A_('casDeal', { main: 5 }); B_('casDeal', { main: 5 }); for (let g = 0; g < 4 && t2.ph !== 'bet'; g++) { now = t2.dl + 100; E.advance(city, now); } }
E.advance(city, now + 1); assert(!CAS.seatOf(city, 'u') && !CAS.seatOf(city, 'v'), 'after three hands away the players lose their seats');
A_('casLeave', {}); B_('casLeave', {});
// a tycoon alone has no clock, but once a second one sits down the hand gets one
E.apply(city, 'u', 'casSit', { tid: 'main-3' }, now); const tq = city.casino.tables['main-3']; CAS.testShoe(tq, [c(T), c(T, 1), c(8), c(7)]); tq.shoe.pos = 1;
A_('casDeal', { main: 5 }); assert(tq.ph === 'play' && !tq.dl, 'alone at the table: no turn clock');
B_('casSit', { tid: 'main-3' }); assert(tq.dl, 'a second tycoon sits down: the turn now has a clock');
now = tq.dl + 100; E.advance(city, now); assert(tq.ph === 'bet', 'and the hand cannot be stalled');
for (let k = 0; k < 3; k++) { A_('casDeal', { main: 5 }); for (let g = 0; g < 4 && (tq.ph !== 'bet' || tq.dl); g++) { now = (tq.dl || now) + 100; E.advance(city, now); if (tq.ph === 'ins') A_('casIns', { take: false }); if (tq.ph === 'play' && tq.turn && tq.seats[tq.turn.s].id === 'u') A_('casStand', {}); } }
E.advance(city, now + 1); assert(CAS.seatOf(city, 'u') && !CAS.seatOf(city, 'v'), 'a tycoon who sits out three hands without betting gives up the seat');
A_('casLeave', {}); B_('casLeave', {});

// --- the pit boss notices big bets on a good count
CASINO.rooms.high.csm = false; const th = city.casino.tables['high-1'];
A_('casSit', { tid: 'high-1' }); p.life.cas.chips = 100000;
const play = (bet) => { CAS.testShoe(th, [c(T), c(8), c(9), c(9)]); th.shoe.pos = 1; A_('casDeal', { main: bet }); if (th.ph === 'play') A_('casStand', {}); };
th.shoe.rc = -10; play(10);
for (let i = 0; i < 3; i++) { th.shoe.rc = 30; play(200); }
assert(p.life.cas.pit.warn === 1 && th.log.some((x) => x.who === 'Pit boss'), 'the pit boss has a word');
th.shoe.key = 'next'; th.shoe.rc = -10; play(10); for (let i = 0; i < 3; i++) { th.shoe.rc = 30; play(200); }
assert(th.pref > now, 'second time: the shoe is shuffled every round for a while');
A_('casLeave', {});

// --- bots sit down at a table where a tycoon plays, and play by the book
CASINO.bots.join = 1; CASINO.rooms.main.csm = true;
Object.values(city.players).filter((b) => b.bot).forEach((b) => { b.life.wallet = 5; });
A_('casSit', { tid: 'main-3' }); const t3 = city.casino.tables['main-3'];
for (let i = 0; i < 6 && !t3.seats.some((s) => s && s.k === 'b'); i++) { A_('casDeal', { main: 1 }); while (t3.ph === 'play') A_('casStand', {}); if (t3.ph === 'ins') { A_('casIns', { take: false }); while (t3.ph === 'play') A_('casStand', {}); } }
assert(t3.seats.some((s) => s && s.k === 'b'), 'a rival bot takes a seat');
A_('casLeave', {}); E.advance(city, now); assert(!t3.seats.some(Boolean), 'bots leave an empty table and take their chips home');

// --- the long run: basic strategy loses about half a percent (1 M hands would be exact; 60 000 is enough to see it)
const sim = E.createCity(now, { speed: 2016 }); E.advance(sim, now); E.addPlayer(sim, 's', 'Sim Player', now); const sp = sim.players.s;
sp.life.wallet = 1e6; E.apply(sim, 's', 'casBuy', { amt: 100000 }, now); E.apply(sim, 's', 'casSit', { tid: 'main-1' }, now);
CASINO.bots.join = 0; CASINO.rooms.main.csm = false; const ts = sim.casino.tables['main-1'];
const ctx = E.csx(sim); let bets = 0, bjs = 0; const N = 60000;
for (let i = 0; i < N; i++) {
  CAS.act(sim, sp, 'casDeal', { main: 10 }, ctx, now); bets += 10;
  if (ts.ph === 'ins') CAS.act(sim, sp, 'casIns', { take: false }, ctx, now);
  const S = ts.seats.find((x) => x && x.id === 's'); if (S.hands[0] && S.hands[0].res === 'bj') bjs++;
  let guard = 0;
  while (ts.ph === 'play' && guard++ < 20) { const h = S.hands[ts.turn.h], o = CAS.opts(sim, ts, S, h); const m = CAS.basic(h.c, ts.d.c[0], o); CAS.act(sim, sp, 'cas' + m[0].toUpperCase() + m.slice(1), {}, ctx, now); }
}
const edge = sp.life.cas.net / bets * 100;
console.log(`   house edge over ${N} hands: ${(-edge).toFixed(2)}% · blackjacks ${(bjs / N * 100).toFixed(2)}%`);
assert(edge > -1.9 && edge < 1, 'basic strategy is close to an even game (house edge about 0.5%)');
assert(bjs / N > 0.042 && bjs / N < 0.053, 'blackjack about once in 21 hands');
CASINO.rooms.main.csm = true;
console.log('OK');
