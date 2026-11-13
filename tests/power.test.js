// Power plants: Aurex Energy (Harbor Row) and Aurex City PowerPlant (Ironport) make energy for the city market
import './open-doors.js';
import './standing.js';
import * as E from '../supabase/functions/_shared/engine.js';
import * as O from '../supabase/functions/_shared/ops.js';
import { TYPES, GOODS, CONFIG } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 200;
const ae = city.listings.find((l) => l.title === 'Aurex Energy'), pp = city.listings.find((l) => l.title === 'Aurex City PowerPlant');
assert(ae && ae.type === 'power' && ae.d === 'harbor', 'Aurex Energy is in Harbor Row');
assert(pp && pp.type === 'power' && pp.d === 'ironport' && pp.img === 'c-powerplant', 'Aurex City PowerPlant is in Ironport with its own picture');
assert(E.listingPrice(ae) === 21.5 && E.listingPrice(pp) === 14.5, `prices ${E.listingPrice(ae)} M and ${E.listingPrice(pp)} M`);
const ind = ['metal', 'chemical', 'chip', 'car'].map((t) => TYPES[t].ypi / TYPES[t].price);
assert(ind.every((x) => TYPES.power.ypi / TYPES.power.price < x), 'lower YPI per M than other industry');
assert(GOODS.energy.producer === 'power', 'energy is made in the city now');
assert(Math.abs(O.importPrice(city, 'energy') - GOODS.energy.base * 1.25 * ((city.cb && city.cb.px) || 1)) < 1e-4, 'grid import is 1.25x base');
for (const l of [ae, pp]) if (l.owner) { l.owner = null; l.ops = null; }
assert(E.apply(city, 'u', 'buy', { lid: ae.id }, now).ok, 'buy Aurex Energy');
ae.ops.inv.fuel = 2000;
const before = city.market.energy.sold || 0;
for (let i = 0; i < 3; i++) { now += CONFIG.YEAR_MS / 12 / 2016 + 1; E.advance(city, now); }
const made = ae.ops.hist.reduce((a, h) => a + (h.units || 0), 0);
assert(made > 0, `the plant generated ${Math.round(made)} MWh`);
assert(ae.ops.inv.fuel < 2000, 'it burned natural gas');
const listed = city.book.filter((o) => o.lid === ae.id && o.g === 'energy').reduce((a, o) => a + o.qty, 0);
assert(listed > 0 || (ae.ops.inv.energy || 0) > 0 || ae.ops.hist.some((h) => h.goods > 0), 'its energy is on the market or sold');
console.log('all power tests passed');
