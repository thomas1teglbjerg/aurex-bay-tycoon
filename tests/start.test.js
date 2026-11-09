// A company bought mid-month starts at once: this month's share of orders and output, no waiting for the next month
import * as E from '../supabase/functions/_shared/engine.js';
import * as O from '../supabase/functions/_shared/ops.js';
import { RECIPES, CONFIG } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 500;
const week = CONFIG.YEAR_MS / 48 / 2016 + 1;
// into the second week of a month
const m0 = city.m; while (city.m === m0) { now += week; E.advance(city, now); }
now += week; E.advance(city, now);
const m = city.m; assert(city.wk % 4 === 1, `week 2 of month ${m}`);
const buy = (type) => { const l = city.listings.find((x) => x.type === type && !E.BLD.unbuilt(x)); if (l.owner) { l.owner = null; l.ops = null; } assert(E.apply(city, 'u', 'buy', { lid: l.id }, now).ok, `buy ${type}`); return l; };

const shop = buy('clothing'), o = shop.ops;
assert(o.curM === m && o.orders.length === 1, 'the first order is there right away');
const end = (m + 1) / 12;
o.queue = o.queue || [];
assert(o.queue.every((q) => q.at > city.g && q.at < end), `${o.queue.length} more land before the month ends`);
assert(o.line && o.line.left === 2, 'the line runs the weeks left this month');
const queued = o.queue.length;
while (city.m === m) { now += week; E.advance(city, now); }
assert(o.orders.length + o.done.length >= 1 + queued && o.hist.length === 1, `all ${1 + queued} orders arrived, then the month closed as usual`);

// a supply maker starts making at once too
const mill = buy('woodworks'), rec = RECIPES.woodworks;
Object.entries(rec.in).forEach(([g, q]) => { mill.ops.inv[g] = q * O.capacity(mill) * 4; });

assert(mill.ops.pl && mill.ops.pl.per > 0 && Object.keys(rec.out).some((g) => (mill.ops.inv[g] || 0) > 0 || city.book.some((b) => b.lid === mill.id)), 'woodworks: output this week and a plan for the rest of the month');

// only once a month, and not in the last moments of a month
assert(!O.startMid(city, {}, mill, city.g, city.wk), 'no second start in the same month');
console.log('all start tests passed');
