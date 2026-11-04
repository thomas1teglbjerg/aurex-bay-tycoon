// Things happen all through the week: world cards, decisions, company happenings, bot moves and orders land at their own moments
import * as E from '../supabase/functions/_shared/engine.js';
import { HAPPENINGS, MAIL_HAP } from '../supabase/functions/_shared/content.js';
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
assert([...titles].some((t) => t.startsWith('decision:')), 'decisions arrive during the year');
assert(city.agenda.every((e) => e.at >= city.g - 1e-9), 'nothing overdue is left on the agenda');
const json = JSON.stringify(city); assert(JSON.parse(json).agenda.length === city.agenda.length, 'the agenda survives a save');
console.log('ALL OK');
