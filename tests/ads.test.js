// Marketing: ad campaigns on the city's websites, for the company or one piece it makes or the owner holds
import './standing.js';
import * as E from '../supabase/functions/_shared/engine.js';
import { DEPTS, AD } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
const A = E.ADS, L = E.LIFE;
let now = 1_700_000_000_000;

assert(DEPTS.find((d) => d.id === 'social').name === 'Marketing', 'the Social Media department is now called Marketing');

let city; do { city = E.createCity(now, { speed: 2016 }); } while (!city.listings.some((x) => x.type === 'vineyard' && !x.owner));
E.addPlayer(city, 'u', 'Thomas Tycoon', now); const p = city.players.u; p.cash = 500;
const act = (a, x) => E.apply(city, 'u', a, x, now);
const l = city.listings.find((x) => x.type === 'vineyard' && !x.owner);
assert(act('buy', { lid: l.id }).ok, 'buy a vineyard');
if (!l.ops) { now += E.realMsPerMonth(city); act('ping'); }
if (l.ops.depts.social) act('deptClose', { lid: l.id, dept: 'social' });
assert(!act('adLaunch', { lid: l.id, weeks: 4 }).ok, 'no campaign without a Marketing department');
assert(act('deptOpen', { lid: l.id, dept: 'social' }).ok, 'open Marketing');

// the copy: three tones, placeholders filled, the line can be flipped through
const lines = A.TONES.map((t) => A.copy(l, t, 0, null, p.name));
assert(lines.every((x) => x.head && x.line && !/[{}]/.test(x.head + x.line)), 'every tone has a filled-in line');
assert(A.copy(l, 'wink', 1, null, p.name).head !== A.copy(l, 'wink', 0, null, p.name).head, '"Another line" gives a different line');
assert(A.pool(l, 'wink').length > A.pool({ ...l, type: 'bank' }, 'irony').length, 'a vineyard adds its own lines to the tone');

// a company campaign: paid up front, runs for its weeks, then reports and disappears
const cash0 = p.cash, cost = A.cost(l, 4);
assert(cost > 0 && Math.abs(cost - AD.perWeek * 4 * { S: 0.6, M: 1, L: 1.5 }[l.size]) < 1e-6, `4 weeks cost ${cost} M for a size ${l.size} company`);
const r = act('adLaunch', { lid: l.id, subj: 'co', tone: 'sarcasm', n: 2, weeks: 4 });
assert(r.ok && Math.abs(cash0 - p.cash - cost) < 1e-6, 'launch a sarcastic company campaign');
const ad = A.running(city, l.id);
assert(ad && ad.kind === 'co' && ad.head === A.copy(l, 'sarcasm', 2, null, p.name).head, 'the ad keeps the line the player picked');
assert(!act('adLaunch', { lid: l.id, weeks: 2 }).ok, 'one campaign at a time per company');
assert(A.live(city).includes(ad), 'it shows on the websites');
const weekMs = E.realMsPerMonth(city) / 4;
for (let i = 0; i < 2; i++) { now += weekMs; act('ping'); }
assert(ad.views > 0, `the ad is seen (${ad.views} views)`);
for (let i = 0; i < 4; i++) { now += weekMs; act('ping'); }
assert(!A.running(city, l.id), 'after 4 weeks the campaign is over');
assert(p.feed.some((f) => /Ad campaign for .* ended/.test(f.title)), 'the owner hears the result');
assert(l.ops.hist.some((h) => h.bud >= cost - 1e-6), 'the cost shows under department budgets in the accounts');
{ const c0 = l.ops.customers, r0 = l.ops.rep, g = city.g; city.ads.push({ id: 'adT', lid: l.id, kind: 'co', tone: 'wink', head: 'x', line: 'y', weeks: 1, from: g - 0.01, until: g + 0.5, views: 0 });
  A.weekStep(city, g, { notify() {} }); city.ads = city.ads.filter((x) => x.id !== 'adT');
  assert(l.ops.customers > c0 && (l.ops.rep > r0 || r0 >= 100), 'each week a company campaign adds customers and reputation'); }

// a product campaign: a wine the estate bottled
let v; do { v = L.vintage(city, l, { heads: [], name: l.title || 'Vineyard' }); } while (!v.def);
const cid = v.def.id, pr = A.products(city, p, l);
assert(pr.some((x) => x.cid === cid && x.where === 'cellar'), 'the estate’s own wine can be advertised');
assert(!act('adLaunch', { lid: l.id, subj: 'nope', weeks: 2 }).ok, 'not a piece you hold');
const f0 = city.life.items[cid].f;
assert(act('adLaunch', { lid: l.id, subj: pr.find((x) => x.cid === cid).uid, tone: 'wink', weeks: 2 }).ok, 'launch a campaign for the wine');
const ad2 = A.running(city, l.id);
assert(ad2.kind === 'item' && ad2.cid === cid && ad2.head && !/[{}]/.test(ad2.line), 'the ad names the wine');
for (let i = 0; i < 3; i++) { now += weekMs; act('ping'); }
assert(city.life.items[cid].f > f0 * 0.98, 'the piece holds or gains value while advertised');
assert(!A.running(city, l.id), 'the 2-week campaign ended');
assert(act('adLaunch', { lid: l.id, weeks: 8 }).ok && act('adStop', { lid: l.id }).ok && !A.running(city, l.id), 'a campaign can be stopped early');

// a car dealership may advertise cars from the owner's collection, a chip factory may not
const carId = 'tcAD'; city.life.made[carId] = { id: carId, cat: 'car', lid: 'test', name: 'Test GT', maker: 'Test', year: 2020, rarity: 'Rare', v: 0.5, ed: 1 }; city.life.items[carId] = { f: 1, h: [0.5] }; L.register(city);
p.life.items.push({ uid: 'iTEST', cid: carId, m: city.m, cost: 1, lent: false });
assert(A.products(city, p, { id: 'X', type: 'dealer' }).some((x) => x.uid === 'iTEST'), 'a dealership can advertise your car');
assert(!A.products(city, p, { id: 'X', type: 'chip' }).some((x) => x.uid === 'iTEST'), 'a chip factory cannot');

// only players advertise: rival tycoons never do, and old bot ads are cleared
for (let i = 0; i < 12; i++) { now += weekMs * 4; act('ping'); }
assert(!(city.ads || []).some((a) => a.bot), 'rival tycoons run no campaigns');
{ const bl = city.listings.find((x) => x.owner && x.owner.k === 'p' && city.players[x.owner.id].bot && x.ops);
  city.ads.push({ id: 'adOld', lid: bl.id, bot: true, kind: 'co', tone: 'wink', head: 'x', line: 'y', weeks: 4, from: city.g, until: city.g + 0.08, views: 0 });
  assert(!A.live(city).some((a) => a.id === 'adOld'), 'an old bot ad is never shown');
  now += weekMs; act('ping'); assert(!city.ads.some((a) => a.id === 'adOld'), 'and is cleared at the next week'); }

// survives a save and a reload
const back = JSON.parse(JSON.stringify(city)); E.advance(back, now + weekMs);
assert(Array.isArray(back.ads), 'campaigns survive a save');
