// Things happen all through the week: world cards, decisions, company happenings, bot moves and orders land at their own moments
import './open-doors.js';
import * as E from '../supabase/functions/_shared/engine.js';
import { HAPPENINGS, MAIL_HAP, WORLD } from '../supabase/functions/_shared/content.js';
const MAIL_OPEN = (x) => !!(x.opts && x.opts.length && !x.done);
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 500;
const ls = city.listings.filter((l) => !l.owner).slice(0, 4);
ls.forEach((l) => assert(E.apply(city, 'u', 'buy', { lid: l.id }, now).ok, `buy ${l.type}`));
assert(Array.isArray(city.agenda) && city.agenda.length > 0, 'the coming week is planned');
assert(city.agenda.every((e) => e.at * 48 % 1 > 0.01), 'nothing is planned on a week boundary');
// walk through one week in small steps: the agenda fires between weekly steps
const weekMs = E.realMsPerMonth(city) / 4, wk0 = city.wk;
let fired = 0;
for (let i = 0; i < 40; i++) { const n = city.agenda.length; now += weekMs / 40; E.advance(city, now); if (city.wk === wk0 + (i < 39 ? 0 : 1) && city.agenda.length < n) fired++; }
assert(fired > 0, `planned events fired inside the week (${fired} times)`);
// a year of play
const titles = new Set(), feed0 = p.feed.length;
let worlds = 0, last = city.lastCard && city.lastCard.m;
for (let i = 0; i < 48; i++) { now += weekMs; E.advance(city, now); E.apply(city, 'u', 'ping', {}, now); p.feed.forEach((f) => titles.add(f.title)); (p.mail || []).forEach((x) => { titles.add(x.subj); if (x.dec) titles.add('decision:' + x.subj); }); if (city.lastCard && city.lastCard.m !== last) { worlds++; last = city.lastCard.m; } }
assert(worlds >= 3 && worlds <= 5, `about four world cards a year (${worlds})`);
const happenTitles = HAPPENINGS.map((h) => (MAIL_HAP[h.id] || h).subj || h.title);
assert([...titles].some((t) => happenTitles.some((h) => t.includes(h))), 'companies have small happenings during the year');
// decisions are rarer (about two or three a year, MAIL_PACE): give them a second year
for (let i = 0; i < 48 && ![...titles].some((t) => t.startsWith('decision:')); i++) { now += weekMs; E.advance(city, now); E.apply(city, 'u', 'ping', {}, now); (p.mail || []).forEach((x) => { if (x.dec) titles.add('decision:' + x.subj); }); }
assert([...titles].some((t) => t.startsWith('decision:')), 'decisions arrive during the year or two');
assert(city.agenda.every((e) => e.at >= city.g - 1e-9), 'nothing overdue is left on the agenda');
// the next card is always planned, in the quarter after the last one, and it is the card market insight shows
{ let ok = true, seen = 0, want = city.deck[0], lastM = city.lastCard && city.lastCard.m;
  for (let i = 0; i < 60; i++) {
    const at = E.nextWorldM(city); if (!city.agenda.some((e) => e.k === 'world')) ok = false;
    now += weekMs; E.advance(city, now);
    if (city.lastCard && city.lastCard.m !== lastM) { seen++; if (city.lastCard.id !== want || Math.floor(city.lastCard.m) !== Math.floor(at) || Math.floor(at / 3) !== Math.floor(city.lastCard.m / 3)) ok = false; lastM = city.lastCard.m; want = city.deck[0]; if (Math.floor(E.nextWorldM(city) / 3) !== Math.floor(lastM / 3) + 1) ok = false; }
  }
  assert(ok && seen >= 4, `the countdown and market insight match the card that lands (${seen} cards)`); }
// market insight arrives as one research mail per upcoming card, with no headline, and can be forwarded to the network
{ E.addPlayer(city, 'v', 'Mikkel', now); const q = city.players.v; p.net.push('v'); q.net.push('u'); p.staff.push('jason');
  const card = WORLD.find((w) => w.id === city.deck[0]);
  for (let i = 0; i < 2; i++) { now += weekMs; E.advance(city, now); }
  const notes = p.mail.filter((x) => x.intel && x.intel.endsWith(':' + city.deck[0]));
  assert(notes.length === 1, 'one research note for the next card');
  const nx = notes[0];
  assert(!nx.body.includes(card.title) && !nx.body.includes(card.text), 'the note never names the card');
  assert(!(q.mail || []).some((x) => x.intel), 'the network gets nothing on its own');
  assert(E.apply(city, 'u', 'mailAnswer', { id: nx.id, opt: 0 }, now).ok, 'forward the note');
  assert(q.mail.some((x) => x.subj.startsWith('Fwd from') && x.body === nx.body), 'the contact gets the forwarded note');
  const n0 = p.mail.filter((x) => x.intel).length; for (let i = 0; i < 16; i++) { now += weekMs; E.advance(city, now); }
  assert(p.mail.filter((x) => x.intel).length > n0 && p.mail.filter((x) => x.intel && MAIL_OPEN(x)).length <= 1, 'a new note per card, old ones close'); }
const json = JSON.stringify(city); assert(JSON.parse(json).agenda.length === city.agenda.length, 'the agenda survives a save');
console.log('ALL OK');
