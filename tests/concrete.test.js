// Bayside Concrete: a concrete plant in Harbor Row; concrete is a supply on the city market and Structura builds with it
import * as E from '../supabase/functions/_shared/engine.js';
import * as O from '../supabase/functions/_shared/ops.js';
import { GOODS, RECIPES, TYPES, SIZES } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 200;
const l = city.listings.find((x) => x.type === 'concrete');
assert(l && l.title === 'Bayside Concrete' && l.d === 'harbor' && l.size === 'M', 'Bayside Concrete is a medium plant in Harbor Row');
assert(TYPES.concrete.price * SIZES[l.size].mult === 10, 'it costs 10 M');
assert(GOODS.concrete.producer === 'concrete' && RECIPES.concrete.out.concrete === 1, 'concrete is made by the plant');
assert(RECIPES.construction.in.concrete > 0, 'construction companies build with concrete');
assert(['cement', 'gravel', 'sand', 'water', 'energy'].every((g) => GOODS[g] && RECIPES.concrete.in[g] > 0) && RECIPES.concrete.yard.gravel === 4000 && RECIPES.concrete.yard.sand === 2000 && RECIPES.concrete.yard.cement === 1000 && RECIPES.concrete.yard.concrete === 2000, 'the plant mixes cement, gravel and sand from its yard');
O.ensureMarket(city);
assert(city.market.concrete && city.market.concrete.p >= O.exportPrice(city, 'concrete') && city.market.concrete.p <= O.importPrice(city, 'concrete'), 'concrete trades on the city market');
// an older city without concrete in its market gets it on the next advance
delete city.market.concrete; delete city.market.sand; E.advance(city, now + 1);
assert(city.market.concrete && city.market.sand, 'older markets gain the new goods');
if (l.owner) { l.owner = null; l.ops = null; }
assert(E.apply(city, 'u', 'buy', { lid: l.id }, now + 2).ok, 'buy the concrete plant');
assert(TYPES.concrete.ypi === 1.4 && TYPES.concrete.trade === 1, 'base 1.4 M YPI and 1 M Trade a year');
assert(E.listingYield(city, l, { k: 'p', id: 'u' }).ypi > 0, 'it earns passive income');
assert(Math.abs(E.monthLines(city, l).maint - 0.5 / 12) < 1e-9, 'kiln upkeep 0.5 M a year');
// the yard starts half full, nothing is used by the month, the owner mixes by hand
const inv = l.ops.inv;
assert(inv.gravel === 2000 && inv.sand === 1000 && inv.cement === 500 && !inv.concrete, 'the yard starts half full of raw materials');
let t = now + 2; for (let i = 0; i < 9; i++) { t += 7 * 24 * 3600 * 1000 / 2016 / 48 * 4; p.lastAct = city.m; E.advance(city, t); }
assert(l.ops.last.units === 0 && ['cement', 'gravel', 'sand'].filter((g) => l.ops.inv[g] < RECIPES.concrete.yard[g] / 2).length <= 1, `two months pass and nothing is mixed by itself (${JSON.stringify(l.ops.inv)})`); // a happening may still spoil one pile
Object.assign(l.ops.inv, { cement: 500, gravel: 2000, sand: 1000, water: 50, energy: 10 });
const r = E.apply(city, 'u', 'mixBatch', { lid: l.id, qty: 75 }, t), used = (g, start) => Math.round((start - l.ops.inv[g]) * 100) / 100;
assert(r.ok && l.ops.inv.concrete === 75 && used('cement', 500) === 10 && used('sand', 1000) === 20 && used('gravel', 2000) === 40 && used('water', 50) === 5 && used('energy', 10) === 1.5, `75 t takes 10 t cement, 20 sand, 40 gravel, 5 water and 1.5 MWh (${r.msg})`);
assert(O.mixMax(l) <= O.capacity(l) - 75, 'a month mixes at most what the plant can make');
l.ops.mixed = 0; l.ops.inv.concrete = 1995; assert(O.mixMax(l) === 5, 'finished concrete stops at 2000 t');
const b = E.apply(city, 'u', 'buySupply', { lid: l.id, g: 'cement', qty: 900 }, t);
assert(b.ok && Math.abs(E.LOG.onTheWay(city, l, 'cement') + l.ops.inv.cement - 1000) < 1, `cement orders stop at the 1000 t yard (${b.msg})`);
assert(!E.apply(city, 'u', 'buySupply', { lid: l.id, g: 'cement', qty: 10 }, t).ok, 'a full yard refuses more');
// an older save: the plant gets its starting stock once
const ops = l.ops; delete ops.yardV; ops.inv.sand = 3; E.advance(city, t + 1);
assert(ops.inv.sand === 1000 && ops.yardV === 1, 'older saves fill the yard to half once');
console.log('all concrete tests passed');
