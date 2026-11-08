// Building sites: new companies start as plots, the developer hires a builder (or the city crew), supplies go in
// week by week through the phases, the builder does a crane task after each phase and is paid phase by phase.
// Old buildings wear, ruins are renovated, upgrades from level 2 are building projects. Car factories are plots now.
import * as E from '../supabase/functions/_shared/engine.js';
import { BUILD, CONFIG, GOODS } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
const BLD = E.BLD;
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
E.addPlayer(city, 'u', 'Thomas', now); E.addPlayer(city, 'b', 'Mikkel', now);
const u = city.players.u, b = city.players.b; u.cash = 300; b.cash = 300;
const week = () => { now += CONFIG.YEAR_MS / 48 / 2016 + 1; E.advance(city, now); u.lastAct = city.m; b.lastAct = city.m; };
const L = (id) => E.listing(city, id);
const free = (l) => { if (l.owner) { l.owner = null; l.ops = null; } };

// ---- what is a plot
const hrb = city.listings.find((l) => l.title === 'Harbor Row Builders'), cbb = city.listings.find((l) => l.title === 'Crown Bridge Builders');
assert(hrb && hrb.id === 'L42' && hrb.type === 'construction' && hrb.size === 'S' && cbb && cbb.size === 'L', 'two new construction companies: Harbor Row Builders (S) and Crown Bridge Builders (L)');
assert(BLD.unbuilt(hrb) && BLD.unbuilt(cbb), 'they start as building plots');
const cars = city.listings.filter((l) => l.type === 'car');
assert(cars.length === 2 && cars.every(BLD.unbuilt), 'every car factory is a building plot');
assert(!BLD.unbuilt(L('L36')) && !BLD.unbuilt(L('L1')), 'the older companies count as built');
assert(Math.abs(E.listingPrice(hrb) - E.fullPrice(hrb) * BUILD.plotShare) <= 0.5, `a plot costs a quarter of the company (${E.listingPrice(hrb)} of ${E.fullPrice(hrb)} M)`);
assert(E.listingYield(city, hrb).total === 0, 'a plot earns nothing');
assert(E.protection(city, hrb).safe, 'no hostile bids on a building site');

// ---- older city: a car factory with an owner is bought out and becomes a plot
{
  const c2 = E.createCity(now, { speed: 2016 }); E.addPlayer(c2, 'x', 'Old Owner', now);
  const car = c2.listings.find((l) => l.type === 'car'); delete car.site; car.owner = { k: 'p', id: 'x' }; car.level = 2; car.ops = null;
  const before = c2.players.x.cash;
  E.advance(c2, now + 1);
  assert(BLD.unbuilt(car) && !car.owner && car.level === 1, 'an owned car factory in an older city becomes a plot');
  assert(c2.players.x.cash > before + 20, `its owner was bought out at full value (+${Math.round(c2.players.x.cash - before)} M)`);
}

// ---- buy the plot and Structura
free(hrb); const str = L('L36'); free(str);
assert(E.apply(city, 'u', 'buy', { lid: hrb.id }, now).ok, 'Thomas buys the Harbor Row Builders plot');
assert(!hrb.ops, 'a plot has no company to run yet');
assert(!E.apply(city, 'u', 'deptOpen', { lid: hrb.id, dept: 'sales' }, now).ok, 'no departments on a building site');
assert(E.apply(city, 'b', 'buy', { lid: str.id }, now).ok, 'Mikkel buys Structura Construction');
const bots = Object.values(city.players).filter((x) => x.bot);
for (let i = 0; i < 2; i++) week();
assert(!cars.some((l) => l.owner && city.players[l.owner.id] && city.players[l.owner.id].bot), 'bots stay away from plots');

// ---- tender, bid, accept
assert(!E.apply(city, 'b', 'siteBid', { lid: hrb.id, from: str.id, price: 2, weeks: 99 }, now).ok, 'no bids before the call for bids');
let r = E.apply(city, 'u', 'siteTender', { lid: hrb.id, turnkey: false }, now); assert(r.ok, 'call for bids: ' + r.msg);
assert((b.mail || []).some((x) => /Call for bids/.test(x.subj) && x.web === `aurexbuild.ab/site/${hrb.id}`), 'the builder gets a mail with a link to the site page');
const min = BLD.totalWeeks(hrb, hrb.site);
assert(min === BUILD.weeks.S, `a small building takes ${min} weeks`);
assert(!E.apply(city, 'b', 'siteBid', { lid: hrb.id, from: str.id, price: 2, weeks: min - 1 }, now).ok, 'a bid cannot promise less than the work takes');
assert(E.apply(city, 'b', 'siteBid', { lid: hrb.id, from: str.id, price: 2, weeks: min + 2 }, now).ok, 'Structura bids 2 M');
assert(!E.apply(city, 'u', 'siteBid', { lid: hrb.id, from: str.id, price: 1, weeks: min }, now).ok, 'only who runs the builder can bid for it');
const bid = hrb.site.bids[0], ucash = u.cash;
assert(E.apply(city, 'u', 'siteAccept', { lid: hrb.id, bid: bid.id }, now).ok, 'Thomas accepts');
assert(Math.abs(u.cash - (ucash - 2)) < 1e-6 && hrb.site.c.held === 2 && hrb.site.st === 'build', 'the price is held by the city');
assert(!E.apply(city, 'u', 'sell', { lid: hrb.id }, now).ok, 'no selling while a builder works on it');

// ---- no supplies: it stands still
week();
assert(hrb.site.wk === 0 && hrb.site.stall === 1, 'without supplies the site stands still');
assert((u.mail || []).some((x) => /Work stopped/.test(x.subj)), 'and the developer hears about it');

// ---- supplies from the market and from your own company
const need = BLD.stillNeeded(hrb, hrb.site);
assert(need.concrete > 0 && need.steel > 0 && need.beams > 0 && need.walls > 0, 'the building needs concrete, steel, beams and wall elements');
assert(BLD.fitGood(hrb) === 'concrete', 'the fit-out uses the company\'s own main supply');
r = E.apply(city, 'u', 'siteBuy', { lid: hrb.id, g: 'concrete', qty: 1e6 }, now); assert(r.ok && hrb.site.stock.concrete === BLD.stillNeeded(hrb, hrb.site).concrete, 'buying stops at what the site needs: ' + r.msg);
str.ops.inv.steel = 1000;
r = E.apply(city, 'b', 'siteMove', { lid: hrb.id, g: 'steel', qty: 30, from: str.id }, now); assert(r.ok && hrb.site.stock.steel === 30 && str.ops.inv.steel === 970, 'the builder trucks steel from its own yard');
assert(!E.apply(city, 'u', 'siteMove', { lid: hrb.id, g: 'steel', qty: 10, from: str.id }, now).ok, 'nobody sends from a company they do not run');
['steel', 'beams', 'walls', 'chemicals', 'energy'].forEach((g) => { const q = BLD.room(hrb, hrb.site, g); if (q) assert(E.apply(city, 'u', 'siteBuy', { lid: hrb.id, g, qty: q }, now).ok, `${GOODS[g].name.toLowerCase()} delivered`); });

// ---- phase 1 builds, then the crane task
const w1 = BLD.phaseWeeks(hrb, hrb.site); let n = 0;
while (hrb.site.st === 'build' && n++ < 20) week();
assert(hrb.site.st === 'task' && hrb.site.ph === 0, `the foundation took ${w1} weeks and waits for the crane task`);
assert((b.mail || []).some((x) => /Pour the foundation/.test(x.subj)), 'the builder is asked to do it');
assert(!E.apply(city, 'u', 'siteTask', { lid: hrb.id, score: 1 }, now).ok, 'only the builder does the task');
const bcash = b.cash;
assert(E.apply(city, 'b', 'siteTask', { lid: hrb.id, score: 0.95 }, now).ok, 'Mikkel lifts it in (95%)');
assert(hrb.site.ph === 1 && hrb.site.cut === 1 && b.cash > bcash + 0.3, 'phase 2 starts a week shorter and the builder got the first part');

// ---- the rest: tasks done by the crew when the builder does not show up
n = 0; while (hrb.site && n++ < 60) week();
assert(!hrb.site && hrb.built && hrb.ops, `Harbor Row Builders is built after ${n} more weeks and opens`);
assert(hrb.cond === 100 && hrb.newUntil > city.m, 'brand new, with the new-building bonus');
assert(E.listingYield(city, hrb).notes.some((t) => /New building/.test(t)), 'the bonus shows in its income');
assert(str.stars && str.stars.length === 1 && str.stars[0] >= 1, `Structura got ${str.stars[0]} stars`);
assert(Math.abs(E.listingPrice(hrb) - E.fullPrice(hrb)) < 0.01, 'it is worth the full price now');

// ---- the city crew
free(cbb); u.cash = 300;
assert(E.apply(city, 'u', 'buy', { lid: cbb.id }, now).ok, 'Thomas buys the Crown Bridge Builders plot');
const cp = BLD.cityPrice(city, cbb, cbb.site, E.fullPrice(cbb), (g) => city.market[g].p);
assert(cp > E.fullPrice(cbb) * 0.5, `the city crew asks ${cp} M, supplies included`);
r = E.apply(city, 'u', 'siteCity', { lid: cbb.id }, now); assert(r.ok, r.msg);
const cw = cbb.site.c.weeks; assert(cw > BUILD.weeks.L, `slower than a builder: ${cw} weeks`);
week(); week();
assert(cbb.site.wk === 2, 'the city crew brings its own supplies');
r = E.apply(city, 'u', 'siteFire', { lid: cbb.id }, now); assert(r.ok && !cbb.site.c, 'the contract can be ended: ' + r.msg);

// ---- late: a fine back to the developer
{
  const site = cbb.site; site.tender = { turnkey: true, g: city.g };
  assert(E.apply(city, 'b', 'siteBid', { lid: cbb.id, from: str.id, price: 5, weeks: BLD.totalWeeks(cbb, site) }, now).ok, 'Structura bids for the big one too');
  assert(E.apply(city, 'u', 'siteAccept', { lid: cbb.id, bid: site.bids[0].id }, now).ok, 'accepted');
  site.c.due = city.g - 3 / 48; site.ph = BLD.phaseCount(site) - 1; site.wk = 0; site.st = 'build';
  Object.entries(BLD.weekNeed(cbb, site)).forEach(([g]) => { site.stock[g] = BLD.stillNeeded(cbb, site)[g]; });
  const before = u.cash; n = 0; while (cbb.site && n++ < 30) { if (cbb.site.st === 'task') E.apply(city, 'b', 'siteTask', { lid: cbb.id, score: 0.5 }, now); else week(); }
  assert(!cbb.site && u.cash > before, `handed over late: the developer got a late fine back (+${Math.round((u.cash - before) * 100) / 100} M)`);
}

// ---- wear and renovation
const old = L('L3'); free(old); old.freeSince = city.m - BUILD.decay.idle - 30; old.cond = 25;
for (let i = 0; i < 2; i++) BLD.monthStep(city, city.m, E.bctx(city));
assert(old.cond < 25, `an empty building wears (${old.cond}%)`);
old.cond = 10;
assert(BLD.ruined(old) && E.listingYield(city, old).total === 0, 'a ruin earns nothing');
assert(E.listingPrice(old) <= E.fullPrice(old) * BUILD.ruinPrice + 0.5, 'and sells cheap');
u.cash = 300; assert(E.apply(city, 'u', 'buy', { lid: old.id }, now).ok, 'Thomas buys the ruin');
assert(E.apply(city, 'u', 'siteRenovate', { lid: old.id }, now).ok, 'and plans a renovation');
assert(old.site.kind === 'reno' && BLD.phaseCount(old.site) === 2 && old.site.frac > 0.4, 'a renovation is Structure + Walls with part of the materials');
assert(E.apply(city, 'u', 'siteCity', { lid: old.id }, now).ok, 'the city crew renovates it');
n = 0; while (old.site && n++ < 60) week();
assert(!old.site && old.cond === 100 && E.listingYield(city, old).total > 0, 'renovated: it earns again');

// ---- upgrades: level 1 → 2 as before, from 2 a building project
const up = old; up.level = 1; u.cash = 300;
assert(E.apply(city, 'u', 'upgrade', { lid: up.id }, now).ok && up.upgrade && !up.site, 'level 1 → 2: money and months');
up.upgrade = null; up.level = 2; const c2 = E.upgradeCost(up), cash2 = u.cash;
r = E.apply(city, 'u', 'upgrade', { lid: up.id }, now);
assert(r.ok && up.site && up.site.kind === 'up' && up.site.to === 3 && Math.abs(u.cash - (cash2 - c2)) < 1e-6, 'level 2 → 3: half the money and a building project: ' + r.msg);
assert(E.listingYield(city, up).total > 0, 'the company keeps running while it is upgraded');
assert(E.apply(city, 'u', 'siteCity', { lid: up.id }, now).ok, 'city crew hired');
n = 0; while (up.site && n++ < 60) week();
assert(up.level === 3, 'level 3 reached');

console.log('all building tests passed');
