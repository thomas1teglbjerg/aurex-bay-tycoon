// Auto repair shops build a collectible tuner car once a year (same model as vineyard wine, CRAFT in content.js)
import * as E from '../supabase/functions/_shared/engine.js';
import { TUNER, DEALER_CARS, CRAFT } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
const L = E.LIFE;
let now = 1_700_000_000_000;

assert(TUNER.models.map((m) => m.name).join('|') === 'Rivermore Trailhawk|Takemi VTEC|Valtor GT-RS', 'the first three tuner cars');
assert(E.makes({ type: 'autorepair' }) && E.makes({ type: 'vineyard' }), 'auto repair and vineyards make collectibles');
assert(E.makes({ type: 'dealer' }) && CRAFT.dealer.cat === 'car', 'dealerships share the model with their own cars');
assert(DEALER_CARS.models.every((m) => /^(Bergwald|Valtor) /.test(m.name)) && !DEALER_CARS.models.some((m) => TUNER.models.some((t) => t.name === m.name)), 'dealerships get Valtor and Bergwald cars, never tuner cars');
assert(!E.makes({ type: 'car' }) && !E.makes({ type: 'bank' }), 'other companies make no collectibles');

let city; do { city = E.createCity(now, { speed: 2016 }); } while (!city.listings.some((x) => x.type === 'autorepair' && !x.owner));
E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 500;

// the odds: about half the years, a small shop never Legendary, the rarity picks the model
const roll = (size, n) => { const l = { id: 'R' + size, type: 'autorepair', size, level: 1 }; let hits = 0; const rar = {}, bad = []; for (let i = 0; i < n; i++) { const r = L.vintage(city, l, { heads: [], name: 'Shop' }); if (r.def) { hits++; const d = r.def; rar[d.rarity] = (rar[d.rarity] || 0) + 1; const mo = TUNER.models.find((m) => m.id === d.model); if (d.cat !== 'car' || !mo || !mo.rar.includes(d.rarity) || d.pic !== mo.pic || d.peak) bad.push(d); delete city.life.made[d.id]; delete city.life.items[d.id]; } } l.cellar = []; return { rate: hits / n, rar, bad }; };
const s = roll('S', 3000), big = roll('L', 3000);
assert(s.rate > 0.45 && s.rate < 0.55, `about 50% of years make a tuner car (${s.rate.toFixed(2)})`);
assert(!s.rar.Legendary, 'a small shop never builds a Legendary');
assert(!s.bad.length && !big.bad.length, 'every build is a car of a model that comes in that rarity, with its picture');
assert((big.rar.Legendary || 0) > 0, `a large shop can build a Legendary (${JSON.stringify(big.rar)})`);
const dl = (() => { const l = { id: 'DM', type: 'dealer', size: 'M', level: 1 }; const bad = [], rare = {}, vals = {}; let n = 0; for (let i = 0; i < 2000; i++) { const r = L.vintage(city, l, { heads: [], name: 'Kazen Motors' }); if (r.def) { n++; rare[r.def.rarity] = 1; if (/^Bergwald/.test(r.def.name)) rare['bw' + r.def.rarity] = 1; vals[r.def.model] = Math.max(vals[r.def.model] || 0, r.def.v); const mo = DEALER_CARS.models.find((m) => m.id === r.def.model); if (!mo || !mo.rar.includes(r.def.rarity) || r.def.cat !== 'car') bad.push(r.def); delete city.life.made[r.def.id]; delete city.life.items[r.def.id]; } } return { n, bad, rare, vals }; })();
assert(dl.n > 800 && !dl.bad.length, `a dealership gets Bergwald collector cars in the rarities each model comes in (${dl.n}/2000)`);
assert(!dl.rare.bwCommon && dl.rare.Common, 'Valtor brings the mid-range cars; Bergwald is never Common');
assert(dl.vals['va-gtr'] > Math.max(dl.vals['va-z37'], dl.vals['va-r500']) * 3, `the Valtor GT-R is the expensive one (${JSON.stringify(dl.vals)})`);

// buy the shop and let a year pass: the tuner show happens on its own
const l = city.listings.find((x) => x.type === 'autorepair' && !x.owner);
assert(E.apply(city, 'u', 'buy', { lid: l.id }, now).ok, 'buy the auto repair shop');
const weekMs = E.realMsPerMonth(city) / 4;
for (let i = 0; i < 50; i++) { now += weekMs; E.apply(city, 'u', 'ping', {}, now); }
assert(l.vintY != null, 'the shop had its tuner show this year');
assert(p.feed.some((f) => /Tuner show at|built a/.test(f.title)), 'the owner hears about it');

// build one by hand to test the garage
let r; do { r = L.vintage(city, l, { heads: [], name: l.title }); } while (!r.def);
const d = r.def, cid = d.id;
assert(l.cellar.filter((x) => x.cid === cid).length === d.ed, `${d.ed} × ${d.name} (${d.rarity}) in the workshop garage`);
assert(L.available(city, cid) === 0, 'cars in the garage are not for sale anywhere else');
const v0 = L.itemValue(city, cid);
assert(Math.abs(v0 / d.v - city.life.items[cid].f * city.life.ix.car) < 0.01, 'a new build is worth its base value');

// sell one to the car dealer
const cash0 = p.cash, c0 = l.cellar.find((x) => x.cid === cid);
let res = E.apply(city, 'u', 'itemCellar', { lid: l.id, uid: c0.uid, how: 'dealer' }, now);
assert(res.ok && p.cash > cash0 && /Coastline Classics/.test(res.msg), `sold to the car dealer: ${res.msg}`);
assert(city.life.dealer.includes(cid), 'the car is in the dealer\'s shop');

// move one home: needs a garage
let t; do { r = L.vintage(city, l, { heads: [], name: l.title }); } while (!r.def); t = l.cellar.find((x) => x.cid === r.def.id);
p.life.homes.push({ uid: 'hu', hid: 'H1', boughtM: 0, paid: 1, bal: 0, rented: false, rooms: { wine: 1 }, improve: 0 }); p.life.res = 'hu';
res = E.apply(city, 'u', 'itemCellar', { lid: l.id, uid: t.uid, how: 'take' }, now);
assert(!res.ok && /garage/.test(res.msg), `a loft with no garage has no room for the car (${res.msg})`);
p.life.homes.push({ uid: 'hv', hid: 'H3', boughtM: 0, paid: 1, bal: 0, rented: false, rooms: {}, improve: 0 });
res = E.apply(city, 'u', 'itemCellar', { lid: l.id, uid: t.uid, how: 'take' }, now);
assert(res.ok && /own garage/.test(res.msg), `moved the car to the beach house garage: ${res.msg}`);
assert(p.life.items.some((y) => y.uid === t.uid), 'it is in your collection, ready to trade');
console.log('ALL OK');
