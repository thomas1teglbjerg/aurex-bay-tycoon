// Supply makers produce a quarter of the month's output every week instead of everything at the month boundary
import * as E from '../supabase/functions/_shared/engine.js';
import * as O from '../supabase/functions/_shared/ops.js';
import { RECIPES, CONFIG } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 500;
const l = city.listings.find((x) => x.type === 'metal');
if (l.owner) { l.owner = null; l.ops = null; }
assert(E.apply(city, 'u', 'buy', { lid: l.id }, now).ok, 'buy a steel mill');
const rec = RECIPES[l.type], out = Object.keys(rec.out)[0];
Object.entries(rec.in).forEach(([g, q]) => { l.ops.inv[g] = q * O.capacity(l) * 10; });
const week = CONFIG.YEAR_MS / 48 / 2016 + 1;
// run to the next month boundary
const m0 = city.m; while (city.m === m0) { now += week; E.advance(city, now); }
const per = l.ops.pl && l.ops.pl.per;
assert(per > 0 && l.ops.pl.left === 3, `a quarter of the month planned per week (${Math.round(per)} ${rec.unit})`);
const have = () => (l.ops.inv[out] || 0) + city.book.filter((o) => o.lid === l.id && o.g === out).reduce((a, o) => a + o.qty, 0);
const seen = [];
for (let i = 0; i < 3; i++) { const a = have(); now += week; E.advance(city, now); seen.push(have() - a); }
assert(city.m === m0 + 1, 'still the same month');
assert(seen.every((d) => d > 0), `${out} grows every week: ${seen.map((d) => Math.round(d)).join(', ')}`);
assert(l.ops.pl.left === 0, 'the month is used up after three more weeks');
// with empty stores nothing is made
Object.keys(rec.in).forEach((g) => { l.ops.inv[g] = 0; });
l.ops.pl = { per, left: 1 }; const a = l.ops.inv[out] || 0;
assert(O.makeWeek(city, {}, l, per) === 0 && (l.ops.inv[out] || 0) === a, 'no supplies in stock, no output');
console.log('all weekly tests passed');
