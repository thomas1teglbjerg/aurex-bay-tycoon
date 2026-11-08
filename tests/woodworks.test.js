// Wood works: Old Oak Joinery (small) and Crown Hills Timberworks (large) in Crown Hills make wooden beams and wall elements
import './standing.js';
import * as E from '../supabase/functions/_shared/engine.js';
import { TYPES, GOODS, CONFIG } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 200;
const oak = city.listings.find((l) => l.title === 'Old Oak Joinery'), tw = city.listings.find((l) => l.title === 'Crown Hills Timberworks');
assert(oak && oak.type === 'woodworks' && oak.d === 'crown' && oak.size === 'S', 'Old Oak Joinery is a small wood works in Crown Hills');
assert(tw && tw.type === 'woodworks' && tw.d === 'crown' && tw.size === 'L' && tw.img === 'c-timberworks', 'Crown Hills Timberworks is a large one with its own picture');
assert(E.listingPrice(oak) < E.listingPrice(tw), `the small one is cheaper (${E.listingPrice(oak)} M vs ${E.listingPrice(tw)} M)`);
assert(E.listingYield(city, oak).ypi < E.listingYield(city, tw).ypi, 'and has lower YPI');
assert(GOODS.beams.producer === 'woodworks' && GOODS.walls.producer === 'woodworks', 'beams and wall elements are made in the city');
assert(city.market.beams && city.market.walls && city.market.timber, 'all three goods are on the supplies market');
assert(TYPES.woodworks.group === 'industry', 'it is industry');
for (const l of [oak, tw]) if (l.owner) { l.owner = null; l.ops = null; }
assert(E.apply(city, 'u', 'buy', { lid: tw.id }, now).ok, 'buy Crown Hills Timberworks');
tw.ops.inv.timber = 2000; tw.ops.inv.energy = 2000;
for (let i = 0; i < 3; i++) { now += CONFIG.YEAR_MS / 12 / 2016 + 1; E.advance(city, now); }
const made = tw.ops.hist.reduce((a, h) => a + (h.units || 0), 0);
assert(made > 0, `the workshop ran ${Math.round(made)} saw runs`);
assert(tw.ops.inv.timber < 2000, 'it sawed timber');
const out = (g) => (tw.ops.inv[g] || 0) + city.book.filter((o) => o.lid === tw.id && o.g === g).reduce((a, o) => a + o.qty, 0);
assert(out('beams') > 0 || tw.ops.hist.some((h) => h.goods > 0), 'beams in stock, on the market or sold');
assert(out('walls') > 0 || tw.ops.hist.some((h) => h.goods > 0), 'wall elements in stock, on the market or sold');
console.log('all wood works tests passed');
