// Headless season simulation: runs a full 10-year season with one scripted human and the bots.
import * as E from '../supabase/functions/_shared/engine.js';
import { CONFIG } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } };
let wins = 0, ranks = [];
for (let run = 0; run < 12; run++) {
  let now = 1_700_000_000_000;
  const city = E.createCity(now, { speed: 2016 });
  assert(Object.keys(city.players).length === 9, 'bots created');
  const me = 'u1'; E.addPlayer(city, me, 'Thomas', now);
  const stepMs = E.realMsPerMonth(city) / 3;
  let hid = null;
  while (city.g < 10) {
    now += stepMs; E.advance(city, now);
    const p = city.players[me];
    // scripted player: buys affordable synergies, upgrades, hires, networks, forms a coop
    const free = city.listings.filter((l) => !l.owner).sort((a, b) => E.listingPrice(a) - E.listingPrice(b));
    if (free[0] && p.cash > E.listingPrice(free[0]) + 2) E.apply(city, me, 'buy', { lid: free[0].id }, now);
    const up = E.ownedBy(city, 'p', me).find((l) => !l.upgrade && l.level < 5 && E.upgradeCost(l) < p.cash - 3);
    if (up) E.apply(city, me, 'upgrade', { lid: up.id }, now);
    if (p.staff.length < 2 && p.cash > 6) { const t = E.TAL; const f = Object.keys(city.talent).find((id) => !city.talent[id].owner && !p.team[t.PERSON[id].kind]); if (f) E.apply(city, me, 'hire', { tid: f, salary: t.ask(city, f) * 1.05, years: 2 }, now); }
    E.TAL.teamOf(city, p).forEach((tid) => { const s = city.talent[tid]; if (s.until - city.m <= 6) E.apply(city, me, 'tRenew', { tid, salary: E.TAL.renewAsk(city, tid) * 1.05, years: 2 }, now); if (s.stress > 70) E.apply(city, me, 'tVacation', { tid }, now); if (s.boredom > 60) E.apply(city, me, 'tChallenge', { tid }, now); });
    (city.tOffers || []).filter((o) => o.to === me && o.status === 'open').forEach((o) => E.apply(city, me, 'tOfferDecline', { oid: o.id }, now));
    city.netReqs.filter((r) => r.to === me && r.status === 'open').forEach((r) => E.apply(city, me, 'netAccept', { pid: r.from }, now));
    city.contracts.filter((c) => c.to === me && c.status === 'pending').forEach((c) => E.apply(city, me, 'contractAccept', { id: c.id }, now));
    if (p.net.length < 2) { const b = Object.values(city.players).find((x) => x.bot && !p.net.includes(x.id)); E.apply(city, me, 'netRequest', { pid: b.id }, now); }
    if (!hid && p.cash > 9) { const r = E.apply(city, me, 'holdingCreate', { name: 'Thomas & Co', amt: 8 }, now); assert(r.ok, 'create holding ' + r.msg); hid = Object.values(city.holdings).find((h) => h.founder === me).id; E.apply(city, me, 'holdingInvite', { hid, pid: 'bot-lars' }, now); }
    if (hid && city.holdings[hid]) { const h = city.holdings[hid]; const f = city.listings.find((l) => !l.owner && E.listingPrice(l) <= h.treasury); if (f && !h.proposals.some((x) => x.status === 'open')) E.apply(city, me, 'buy', { lid: f.id, as: hid }, now); }
    city.offers.filter((o) => o.to === me && o.status === 'open').forEach((o) => E.apply(city, me, 'offerDecline', { id: o.id }, now));
    if (city.listings.every((l) => l.owner) && p.cash > 40) { const t = city.listings.find((l) => l.owner.k === 'p' && l.owner.id !== me); if (t) E.apply(city, me, 'offer', { lid: t.id, amt: Math.round(E.listingValue(t) * 1.45) }, now); }
    E.ownedBy(city, 'p', me).forEach((l) => {
      (l.ops.orders || []).slice().forEach((o) => {
        if (o.status === 'new') E.apply(city, me, 'order', { lid: l.id, op: o.earning > 0 ? 'accept' : 'reject', oid: o.id }, now);
        else if (o.status === 'accepted') E.apply(city, me, 'order', { lid: l.id, op: 'deliver', oid: o.id, cid: o.cid }, now);
        else if (o.status === 'cancelled') E.apply(city, me, 'order', { lid: l.id, op: 'archive', oid: o.id }, now);
      });
      E.OPS.tasks(city, l).filter((t) => !['orders', 'deliver', 'archive'].includes(t.id)).forEach((t) => E.apply(city, me, 'task', { lid: l.id, task: t.id, choice: 'listen' }, now));
      if (p.cash > 6 && !l.ops.depts.sales) { E.apply(city, me, 'deptOpen', { lid: l.id, dept: 'sales' }, now); E.apply(city, me, 'workers', { lid: l.id, dept: 'sales', delta: E.OPS.needWorkers(l, 'sales') }, now); }
      if (p.cash > 6 && !l.ops.depts.procurement) { E.apply(city, me, 'deptOpen', { lid: l.id, dept: 'procurement' }, now); E.apply(city, me, 'workers', { lid: l.id, dept: 'procurement', delta: E.OPS.needWorkers(l, 'procurement') }, now); }
    });
    if (Object.keys(city.stocks).length && p.cash > 30) { E.apply(city, me, 'trade', { id: 'gold', qty: 3 }, now); }
    if ((p.shares.gold || 0) > 6) { const r = E.apply(city, me, 'trade', { id: 'gold', qty: -3 }, now); assert(r.ok, 'sell stock'); }
    p.inbox.slice(0, 1).forEach((d) => E.apply(city, me, 'decide', { id: d.id, opt: 0 }, now));
    for (const [k, v] of Object.entries(city.stocks)) assert(Number.isFinite(v.p) && v.p > 0, 'stock price ' + k);
    assert(Number.isFinite(p.cash), 'cash finite');
  }
  assert(!city.over, 'the city never ends'); const st = E.standings(city); const r = st.findIndex((x) => x.id === me) + 1; ranks.push(r); if (r === 1) wins++;
  if (run === 0) {
    console.log('final', st.map((x) => `${x.name}:${Math.round(x.score)}`).join(' | '));
    console.log('news', city.news.length, 'holdings', Object.values(city.holdings).map((h) => `${h.name}(${Object.keys(h.members).length} owners, NAV ${Math.round(E.holdingNav(city, h))})`).join(', '));
    console.log('my holding', hid && city.holdings[hid] ? JSON.stringify({owners:Object.keys(city.holdings[hid].members), nav:E.holdingNav(city, city.holdings[hid]), listings:E.ownedBy(city,'h',hid).length}) : 'none');
    console.log('portfolio', JSON.stringify({ realized: Math.round((city.players[me].realized || 0) * 100) / 100, phist: city.players[me].phist.length, cost: city.players[me].cost }));
    console.log('owned listings', city.listings.filter((l) => l.owner).length, '/', city.listings.length, 'contracts active', city.contracts.filter((c) => c.status === 'active').length);
    console.log('player feed sample', city.players[me].feed.slice(0, 4).map((f) => f.title));
  }
}
console.log('scripted player win rate', wins / 12, 'avg rank', (ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(2));
// offline progress: a city left alone for 3 real days at live speed advances 3/7 of a year
let now = 1_700_000_000_000; const c2 = E.createCity(now, { speed: 1 }); E.addPlayer(c2, 'x', 'X', now);
{ const f = c2.listings.filter((l) => !l.owner).sort((a, b) => E.listingPrice(a) - E.listingPrice(b))[0]; if (f) { c2.players.x.cash = 40; E.apply(c2, 'x', 'buy', { lid: f.id }, now); } }
const before = c2.players.x.cash; now += 3 * 24 * 3600e3; E.advance(c2, now);
console.log('offline 3 days: months passed', c2.m - CONFIG.HISTORY_MONTHS, 'cash', before.toFixed(1), '->', c2.players.x.cash.toFixed(1));
const json = JSON.stringify(c2); console.log('city JSON size', Math.round(json.length / 1024), 'KB');
// admin speed change: game time so far is kept, only the rate from now on changes
{ let t = 1_700_000_000_000; const c3 = E.createCity(t, { speed: 1 }); t += 24 * 3600e3; const g0 = E.gameNow(c3, t);
  assert(!E.validSpeed(0) && !E.validSpeed(-1) && !E.validSpeed(5000) && !E.validSpeed(NaN) && E.validSpeed(1) && E.validSpeed(168), 'speed bounds');
  E.setSpeed(c3, 168, t); assert(Math.abs(E.gameNow(c3, t) - g0) < 1e-9, 'speed change keeps the clock');
  t += 3600e3; assert(Math.abs(E.gameNow(c3, t) - g0 - 1) < 1e-9, 'one game year per hour at 168');
  E.advance(c3, t); assert(c3.wk >= Math.floor((g0 + 1) * 48) - 1, 'weeks caught up after speed-up'); }
// a replaced business: the owner of the old Fashion House on L1 is bought out at full value, Eastbridge opens for sale
{ let t = 1_700_000_000_000; const c4 = E.createCity(t, { speed: 1 }); E.addPlayer(c4, 'y', 'Y', t);
  const l1 = c4.listings.find((l) => l.id === 'L1'); assert(l1.type === 'clothing' && l1.title === 'Eastbridge Supply Co.', 'Eastbridge on L1');
  Object.assign(l1, { type: 'fashion', size: 'M', level: 2 }); delete l1.title; c4.players.y.cash = 0; l1.owner = { k: 'p', id: 'y' }; l1.ops = {};
  const v = E.listingValue(l1); t += 3600e3; E.advance(c4, t);
  const n = c4.listings.find((l) => l.id === 'L1'); assert(n.type === 'clothing' && !n.owner && n.title === 'Eastbridge Supply Co.', 'Eastbridge replaces the old listing');
  assert(Math.abs(c4.players.y.cash - v) < 0.5, 'owner bought out at full value'); }
// Watertower Sound (music) replaces the Ironport Film Production on L26
{ const c5 = E.createCity(1_700_000_000_000, { speed: 1 }); const l = c5.listings.find((x) => x.id === 'L26');
  assert(l.type === 'music' && l.title === 'Watertower Sound' && l.d === 'ironport' && E.listingPrice(l) === 12, 'Watertower Sound on L26'); }
// the administrator player: unlimited money, hidden from standings and news, never taken over
{ let t = 1_700_000_000_000; const c6 = E.createCity(t, { speed: 2016 }); E.addPlayer(c6, 'z', 'Z', t);
  const a = E.ensureAdmin(c6, t); assert(a.admin && c6.players[E.ADMIN_ID] === a && E.BR.brandOf(c6, E.ADMIN_ID), 'admin player with a parent company');
  assert(!E.standings(c6).some((x) => x.id === E.ADMIN_ID), 'admin not in the standings');
  const newsN = c6.news.length, free = c6.listings.filter((l) => !l.owner).sort((x, y) => E.listingPrice(y) - E.listingPrice(x));
  free.slice(0, 3).forEach((l) => assert(E.apply(c6, E.ADMIN_ID, 'buy', { lid: l.id }, t).ok, 'admin buys ' + l.id));
  assert(c6.players[E.ADMIN_ID].cash >= E.ADMIN_CASH, 'admin cash refilled after buying');
  assert(!c6.news.slice(0, c6.news.length - newsN).some((n) => String(n.title + n.text).includes(E.ADMIN_NAME)), 'admin stays out of the news');
  t += E.realMsPerMonth(c6) * 6; E.advance(c6, t); assert(c6.players[E.ADMIN_ID].cash >= E.ADMIN_CASH && !E.inactive(c6, c6.players[E.ADMIN_ID]), 'still unlimited and never inactive');
  assert(E.protection(c6, free[0]).safe, 'admin companies are protected');
  assert(E.ensureAdmin(c6, t) === c6.players[E.ADMIN_ID], 'ensureAdmin is idempotent');
  assert(E.apply(c6, 'z', 'buy', { lid: c6.listings.find((l) => !l.owner).id }, t).ok !== undefined, 'normal players unaffected'); }
// the test player: an ordinary tycoon with normal start money and a parent company, ready to play
{ const t = 1_700_000_000_000; const c7 = E.createCity(t, { speed: 2016 });
  const tp = E.ensureAs(c7, E.TEST_ID, t); assert(tp.test && !tp.admin && tp.cash === 10 && E.BR.brandOf(c7, E.TEST_ID) && !E.BR.needsParent(c7, E.TEST_ID), 'test player ready with 10 M');
  assert(E.ensureAs(c7, E.TEST_ID, t) === tp && E.standings(c7).some((x) => x.id === E.TEST_ID), 'test player is ordinary and created once');
  const l = c7.listings.find((x) => !x.owner && E.listingPrice(x) > 10); assert(!E.apply(c7, E.TEST_ID, 'buy', { lid: l.id }, t).ok, 'test player cannot overspend'); }
console.log('OK');
