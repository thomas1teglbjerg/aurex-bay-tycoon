// Vineyards: once a year a chance to bottle a collectible wine that players can sell to the dealer, auction or keep
import * as E from '../supabase/functions/_shared/engine.js';
import { LISTINGS, VINTAGE } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
const L = E.LIFE;
let now = 1_700_000_000_000;

const vines = LISTINGS.filter((l) => l.type === 'vineyard');
assert(vines.length === 3 && ['S', 'M', 'L'].every((s) => vines.some((v) => v.size === s)), 'three vineyards on the map: small, medium and large');
assert(LISTINGS.find((l) => l.type === 'hotel' && l.d === 'sunset').img === 'c-hotel-sunset', 'the Sunset Strand hotel has its own picture');

const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 500;
assert(city.listings.filter((l) => l.type === 'vineyard').length === 3, 'a new city has the vineyards');

// the odds: about half the harvests, small estates never Legendary, specialists help
const roll = (size, heads, n) => { const l = { id: 'X' + size, size, level: 1 }; let hits = 0; const rar = {}; for (let i = 0; i < n; i++) { const r = L.vintage(city, l, { heads, name: 'Test' }); if (r.def) { hits++; rar[r.def.rarity] = (rar[r.def.rarity] || 0) + 1; delete city.life.made[r.def.id]; delete city.life.items[r.def.id]; } } l.cellar = []; return { rate: hits / n, rar }; };
const s = roll('S', [], 3000), big = roll('L', [], 3000), led = roll('S', [5, 5, 4], 3000);
assert(s.rate > 0.45 && s.rate < 0.55, `about 50% of harvests make a collectible (${s.rate.toFixed(2)})`);
assert(!s.rar.Legendary, 'a small vineyard never makes a Legendary');
assert((s.rar.Common || 0) > (s.rar.Rare || 0) && (s.rar.Epic || 0) < s.rate * 3000 * 0.08, `small estates mostly make everyday wine (${JSON.stringify(s.rar)})`);
assert((big.rar.Epic || 0) + (big.rar.Legendary || 0) > (s.rar.Epic || 0) * 2, `large estates make rarer wine (${JSON.stringify(big.rar)})`);
assert(led.rate > 0.68 && led.rate <= VINTAGE.maxChance + 0.03, `three specialists raise the chance (${led.rate.toFixed(2)})`);
assert((led.rar.Rare || 0) / (led.rate * 3000) > (s.rar.Rare || 0) / (s.rate * 3000), 'specialists raise the rarity');

// buy the medium estate and let a year pass: the harvest happens on its own
const l = city.listings.find((x) => x.type === 'vineyard' && x.size === 'M');
assert(E.apply(city, 'u', 'buy', { lid: l.id }, now).ok, 'buy the vineyard');
const weekMs = E.realMsPerMonth(city) / 4;
for (let i = 0; i < 50; i++) { now += weekMs; E.apply(city, 'u', 'ping', {}, now); }
assert(l.vintY != null, 'the vineyard harvested this year');
assert(p.feed.some((f) => /Harvest at|bottled a/.test(f.title)), 'the owner hears about the harvest');

// bottle a vintage by hand to test the cellar
let r; do { r = L.vintage(city, l, { heads: [], name: l.title }); } while (!r.def);
const d = r.def, cid = d.id;
assert(l.cellar.filter((x) => x.cid === cid).length === d.ed && d.ed >= 1, `${d.ed} cases of ${d.name} (${d.rarity}) in the estate cellar`);
assert(L.available(city, cid) === 0, 'cases in the cellar are not for sale anywhere else');
assert(Math.abs(L.itemValue(city, cid) / d.v - city.life.items[cid].f * city.life.ix.wine) < 0.01, 'a new vintage is worth its base value');

// survives a save and a reload in another process
const copy = JSON.parse(JSON.stringify(city)); delete L.ITEM[cid]; E.advance(copy, now); assert(L.ITEM[cid] && L.ITEM[cid].name === d.name, 'the vintage is back in the catalogue after a reload');
L.register(city);

// sell one to the wine merchant: the company is paid and the case is in the shop for anyone
const cash0 = p.cash, c0 = l.cellar.find((x) => x.cid === cid);
let res = E.apply(city, 'u', 'itemCellar', { lid: l.id, uid: c0.uid, how: 'dealer' }, now);
assert(res.ok && p.cash > cash0, `sold to Cellar Door: ${res.msg}`);
if (d.ed > 1) assert(city.life.dealer.includes(cid) && L.available(city, cid) === 1, 'the case is in the wine merchant\'s shop');

// others cannot touch the cellar
E.addPlayer(city, 'x', 'Rival', now); const x = city.players.x;
if (l.cellar.length) assert(!E.apply(city, 'x', 'itemCellar', { lid: l.id, uid: l.cellar[0].uid, how: 'dealer' }, now).ok, 'a rival cannot sell your wine');

// bottle more and put one up for auction; a rival with money bids for it
let r2; do { r2 = L.vintage(city, l, { heads: [], name: l.title }); } while (!r2.def || r2.def.rarity !== 'Common');
const cid2 = r2.def.id, a1 = l.cellar.find((y) => y.cid === cid2);
res = E.apply(city, 'u', 'itemCellar', { lid: l.id, uid: a1.uid, how: 'auction' }, now); assert(res.ok, 'put a case up for auction');
const lot = city.life.lots.find((y) => y.uid === a1.uid); assert(lot && lot.lid === l.id, 'the lot belongs to the estate');
assert(!E.apply(city, 'u', 'itemCellar', { lid: l.id, uid: a1.uid, how: 'dealer' }, now).ok, 'a case at auction cannot be sold twice');
x.life.wallet = 5; x.life.homes.push({ uid: 'hx', hid: 'H1', boughtM: 0, paid: 1, bal: 0, rented: false, rooms: { wine: 1 }, improve: 0 }); x.life.res = 'hx';
assert(E.apply(city, 'x', 'bid', { lot: lot.id, amt: L.itemValue(city, cid2) * 3 }, now).ok, 'a rival bids');
for (let i = 0; i < 8; i++) { now += weekMs; E.apply(city, 'u', 'ping', {}, now); }
assert(x.life.items.some((y) => y.cid === cid2), 'the rival won the case');
assert(!l.cellar.some((y) => y.uid === a1.uid) && p.feed.some((f) => f.title.startsWith('Sold at auction')), 'the case left the cellar and the company was paid');

// move a case to your own cellar: needs room at home
const t1 = l.cellar.find((y) => y.cid === cid2 && !y.lot);
if (t1) {
  assert(!E.apply(city, 'u', 'itemCellar', { lid: l.id, uid: t1.uid, how: 'take' }, now).ok, 'no home, no room for wine');
  p.life.homes.push({ uid: 'hu', hid: 'H1', boughtM: 0, paid: 1, bal: 0, rented: false, rooms: { wine: 1 }, improve: 0 }); p.life.res = 'hu';
  assert(E.apply(city, 'u', 'itemCellar', { lid: l.id, uid: t1.uid, how: 'take' }, now).ok, 'moved a case home');
  assert(p.life.items.some((y) => y.uid === t1.uid), 'it is in your collection, ready to trade');
  const ed0 = L.ITEM[cid2].ed; p.life.dinnerM = -1;
  assert(E.apply(city, 'u', 'host', { uid: t1.uid, guests: 'bankers' }, now).ok, 'serve it at a dinner');
  assert(L.ITEM[cid2].ed === ed0 - 1, 'a case that is drunk is gone for good');
}
console.log('ALL OK');
