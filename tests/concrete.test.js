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
assert(TYPES.concrete.ypi === 0.6 && TYPES.concrete.trade === 1, 'base 0.6 M YPI and 1 M Trade a year');
assert(E.listingYield(city, l, { k: 'p', id: 'u' }).ypi > 0, 'it earns passive income');
assert(Math.abs(E.monthLines(city, l).maint - 0.5 / 12) < 1e-9, 'kiln upkeep 0.5 M a year');
// the yard starts half full, nothing is used by the month, the owner mixes by hand
const inv = l.ops.inv;
assert(inv.gravel === 2000 && inv.sand === 1000 && inv.cement === 500 && !inv.concrete, 'the yard starts half full of raw materials');
let t = now + 2; for (let i = 0; i < 9; i++) { t += 7 * 24 * 3600 * 1000 / 2016 / 48 * 4; p.lastAct = city.m; E.advance(city, t); }
assert(l.ops.last.units === 0 && !l.ops.mixed, `two months pass and nothing is mixed by itself (${JSON.stringify(l.ops.inv)})`); // a happening may still spoil one pile
Object.assign(l.ops.inv, { cement: 500, gravel: 2000, sand: 1000, energy: 10 }); const cash0 = p.cash;
const r = E.apply(city, 'u', 'mixStart', { lid: l.id, qty: 75 }, t), used = (g, start) => Math.round((start - l.ops.inv[g]) * 100) / 100;
assert(r.ok && !l.ops.inv.concrete && used('cement', 500) === 10 && used('sand', 1000) === 20 && used('gravel', 2000) === 40 && !l.ops.inv.water && Math.abs(cash0 - p.cash - 5 * city.market.water.p) < 1e-9 && used('energy', 10) === 1.5, `75 t takes 10 t cement, 20 sand, 40 gravel, 1.5 MWh from the yard and 5 m³ mains water paid at once (${r.msg})`);
assert(O.mixMax(l) <= O.mixCap(l) - 75, 'a month mixes at most what the plant can make');
assert(!E.apply(city, 'u', 'mixStart', { lid: l.id, qty: 10 }, t + 1000).ok, 'one batch at a time');
assert(!E.apply(city, 'u', 'mixEnd', { lid: l.id, ok: true }, t + 30_000).ok && l.ops.batch, 'a batch cannot finish before 1 second per tonne');
let e = E.apply(city, 'u', 'mixEnd', { lid: l.id, ok: true }, t + 75_000);
const ready = t + 75_000 + 75 * O.MIX.drumT * 1000;
assert(e.ok && !e.ruined && !l.ops.inv.concrete && l.ops.batch.drum && l.ops.batch.ready === ready, `held right for 75 seconds: the drum mixes it 5 s per tonne (${e.msg})`);
assert(!O.mixStart(l, 10, ready - 1000).ok && /drum/.test(O.mixStart(l, 10, ready - 1000).msg), 'no new mix while the drum is still turning');
assert(!O.mixStep(l, ready - 1000) && !l.ops.inv.concrete, 'nothing in the yard before the drum is done');
// (the engine runs the same step on every advance; called directly here so the fast test clock does not run months on)
assert(O.mixStep(l, ready + 500) === 75 && l.ops.inv.concrete === 75 && !l.ops.batch && l.ops.poured.qty === 75 && O.lotsOf(l, 'concrete', 'inv').some((x) => x.at === ready), `then 75 t of concrete is in the yard, fresh from when it was done (${e.msg})`);
const t2 = ready + 1000;
O.mixStart(l, 20, t2); const before = l.ops.inv.cement;
e = O.mixEnd(l, false, t2 + 5000);
assert(e.ok && e.ruined && l.ops.inv.concrete === 75 && l.ops.inv.cement === before, `a failed mix is thrown out (${e.msg})`);
{ const c0 = l.ops.inv.concrete; O.mixStart(l, 10, t2 + 10_000); const late = O.mixEnd(l, true, t2 + 10_000 + 10_000 + O.MIX.grace + 1000);
  assert(late.ruined && l.ops.inv.concrete === c0 && !l.ops.batch, 'a batch left too long sets in the drum'); }
l.ops.mixed = 0; l.ops.inv.concrete = 1995; assert(O.mixMax(l) === 5, 'finished concrete stops at 2000 t');
const b = E.apply(city, 'u', 'buySupply', { lid: l.id, g: 'cement', qty: 900 }, t);
assert(b.ok && Math.abs(E.LOG.onTheWay(city, l, 'cement') + l.ops.inv.cement - 1000) < 1, `cement orders stop at the 1000 t yard (${b.msg})`);
assert(!E.apply(city, 'u', 'buySupply', { lid: l.id, g: 'cement', qty: 10 }, t).ok, 'a full yard refuses more');
// an older save: the plant gets its starting stock once
const ops = l.ops; delete ops.yardV; ops.inv.sand = 3; E.advance(city, t + 1);
assert(ops.inv.sand === 1000 && ops.yardV === 4, 'older saves fill the yard to half once');
ops.yardV = 2; ops.inv.water = 50; ops.inv.sand = 3; O.fillYard(l);
assert(ops.inv.water === undefined && ops.inv.sand === 3 && ops.yardV === 4, 'water is no longer kept in stock');
assert(!E.apply(city, 'u', 'buySupply', { lid: l.id, g: 'water', qty: 10 }, t).ok && !('water' in O.needsPerMonth(l)), 'water cannot be ordered: it comes from the mains');
ops.depts.ops.w = 0; ops.mixed = 0; ops.batch = null; ops.inv.concrete = 0; Object.assign(ops.inv, { cement: 500, sand: 1000, gravel: 2000, energy: 30 });
assert(O.mixMax(l) >= Math.floor(O.baseCap(l)) - 1 && !O.mixBlock(l), `no staff needed to mix (${O.mixMax(l)} t)`);
ops.inv.sand = 0; assert(/sand/.test(O.mixBlock(l)), 'the box says what is missing'); ops.inv.sand = 1000;
// fresh concrete: 48 real hours to ship it, oldest batch first, then it hardens
{ const H = 3600 * 1000, T = 2_000_000_000_000, o = l.ops, notes = [], ctx = { notify: (c, x, t) => notes.push(t) };
  o.inv.concrete = 0; o.fg = 0; o.lots = {}; o.batch = null; o.mixed = 0;
  O.mixStart(l, 30, T); O.mixEnd(l, true, T + 30_000); O.mixStep(l, T + H); O.mixStart(l, 20, T + 10 * H); O.mixEnd(l, true, T + 10 * H + 20_000); O.mixStep(l, T + 11 * H);
  assert(o.inv.concrete === 50 && O.lotsOf(l, 'concrete', 'inv').length === 2, 'two batches wait in the yard');
  o.inv.concrete -= 25; o.fg -= 25; O.freshStep(city, ctx, l, T + 20 * H);
  assert(O.lotsOf(l, 'concrete', 'inv')[0].q === 5, 'what is shipped comes off the oldest batch');
  O.listGoods(city, l, 'concrete', 10, 0.003, false); O.freshStep(city, ctx, l, T + 47 * H);
  assert(o.inv.concrete + city.book.filter((x) => x.lid === l.id).reduce((a, x) => a + x.qty, 0) === 25, 'listed concrete is still counted in the yard');
  O.freshStep(city, ctx, l, T + 49 * H);
  assert(Math.abs(o.inv.concrete + city.book.filter((x) => x.lid === l.id).reduce((a, x) => a + x.qty, 0) - 20) < 1e-9 && Math.abs(o.fg - 20) < 1e-9 && notes.some((t) => /hardened/.test(t)), `after 48 hours the first batch hardens and is thrown out (${notes[0]})`);
  O.freshStep(city, ctx, l, T + 59 * H);
  assert(o.inv.concrete + city.book.filter((x) => x.lid === l.id).reduce((a, x) => a + x.qty, 0) < 1e-9 && o.fg < 1e-9, 'the second batch hardens 48 hours after it was mixed'); }
console.log('all concrete tests passed');
