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
O.ensureMarket(city);
assert(city.market.concrete && Math.abs(city.market.concrete.p / GOODS.concrete.base - 1) < 0.2, 'concrete trades on the city market');
// an older city without concrete in its market gets it on the next advance
delete city.market.concrete; E.advance(city, now + 1);
assert(city.market.concrete, 'older markets gain concrete');
if (l.owner) { l.owner = null; l.ops = null; }
assert(E.apply(city, 'u', 'buy', { lid: l.id }, now + 2).ok, 'buy the concrete plant');
const y = E.listingYield(city, l, { k: 'p', id: 'u' });
assert(Math.abs(y.ypi - 1.4) < 0.01 && Math.abs(y.trade - 1) < 0.01, `1.4 M YPI and 1 M Trade a year (${y.ypi} + ${y.trade})`);
assert(Math.abs(E.monthLines(city, l).maint - 0.5 / 12) < 1e-9, 'kiln upkeep 0.5 M a year');
console.log('all concrete tests passed');
