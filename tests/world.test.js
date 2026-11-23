// World cards: every sector can go both ways, new cards join older decks once, co pays or charges company owners
import './standing.js';
import './open-doors.js';
import * as E from '../supabase/functions/_shared/engine.js';
import { WORLD, STOCKS, TYPES, SIZES } from '../supabase/functions/_shared/content.js';
import { insightBody } from '../supabase/functions/_shared/mail.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };

assert(new Set(WORLD.map((w) => w.id)).size === WORLD.length, `${WORLD.length} world cards, unique ids`);
WORLD.forEach((w) => {
  Object.keys(w.shock).forEach((k) => assert(STOCKS.some((s) => s.id === k), `${w.id}: stock ${k} exists`));
  Object.keys(w.co || {}).forEach((k) => assert(TYPES[k], `${w.id}: company type ${k} exists`));
  assert(insightBody(w).length > 20, `${w.id}: market insight can be written`);
});
STOCKS.forEach((s) => {
  const up = WORLD.filter((w) => (w.shock[s.id] || 0) > 0).length, down = WORLD.filter((w) => (w.shock[s.id] || 0) < 0).length;
  assert(up >= 1 && down >= 1, `${s.name} has good (${up}) and bad (${down}) cards`);
});
{ const up = WORLD.filter((w) => (w.shock.airline || 0) > 0).length, down = WORLD.filter((w) => (w.shock.airline || 0) < 0).length; assert(up > down, `Clowd Airline: more good cards (${up}) than bad (${down})`); }

// an older city: the new cards join the deck once, never in front
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
assert(city.wv === 2 && WORLD.filter((w) => w.v === 2).some((w) => city.deck.includes(w.id)), 'a new city deals the new cards too');
const old = WORLD.filter((w) => !w.v).map((w) => w.id), first = old[3];
city.deck = [first, ...old.filter((x) => x !== first).slice(0, 5)]; city.wv = undefined;
E.advance(city, now + 1);
const added = WORLD.filter((w) => w.v === 2);
assert(city.deck[0] === first && added.every((w) => city.deck.includes(w.id)) && city.deck.length === 6 + added.length, `older deck gets the ${added.length} new cards behind the next one`);
const n = city.deck.length; E.advance(city, now + 2); assert(city.deck.length === n, 'only once');

// a card with co: owners of that type are paid (or charged) M × size
E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 500;
const hotel = city.listings.find((l) => !l.owner && l.type === 'hotel'), chip = city.listings.find((l) => !l.owner && l.type === 'chip');
const car = city.listings.find((l) => !l.owner && l.type === 'dealer');
[hotel, chip, car].filter(Boolean).forEach((l) => assert(E.apply(city, 'u', 'buy', { lid: l.id }, now).ok, `buy ${l.type}`));
const runCard = (id) => { city.deck = [id, ...city.deck.filter((x) => x !== id)]; const m0 = city.lastCard ? city.lastCard.m : -1; for (let i = 0; i < 400 && (!city.lastCard || city.lastCard.m === m0 || city.lastCard.id !== id); i++) { now += E.realMsPerMonth(city) / 8; E.advance(city, now); city.deck[0] !== id && !(city.lastCard && city.lastCard.id === id && city.lastCard.m !== m0) && (city.deck = [id, ...city.deck.filter((x) => x !== id)]); } return city.lastCard && city.lastCard.id === id; };
assert(runCard('chips'), 'the Global Chip Shortage card is drawn');
const ttl = (t) => p.feed.some((f) => f.title.startsWith(t)) || (p.mail || []).some((x) => (x.subj || '').startsWith(t));
if (chip) assert(ttl(`Global Chip Shortage: +${Math.round(2 * SIZES[chip.size].mult * 100) / 100} M`), 'the chip maker is paid');
if (car) assert(ttl('Global Chip Shortage: −'), 'the car dealer pays');
console.log('world ok');
