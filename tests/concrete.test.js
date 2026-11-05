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
assert(['cement', 'gravel', 'sand'].every((g) => GOODS[g] && RECIPES.concrete.in[g] > 0) && RECIPES.concrete.yard.length === 3, 'the plant mixes cement, gravel and sand from its warehouse');
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
console.log('all concrete tests passed');
