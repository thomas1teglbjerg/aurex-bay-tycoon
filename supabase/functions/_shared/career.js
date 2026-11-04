// Aurex Bay Tycoon — the tycoon's own career: experience, levels, perks and the departments you lead yourself.
// Experience (XP) grows in two tracks at once: a field (one of the eight departments) and a sector (TYPES group).
// Leading Sales at a hotel builds Sales and Service. Every source has a cap, levels come slowly and never drop.
// A department you lead has head 'self': its automation and YPI come from your level in that field,
// the role's own effect (what a specialist head adds) only from level 3. ops.js reads d.hb, d.lv, d.rt and l.ops.sp.
import { DEPTS, TYPES, CAREER as C } from './content.js';
import { headBonus, headYpi } from './talent.js';

const r2 = (v) => Math.round(v * 100) / 100;
const ok = (msg, x) => ({ ok: true, msg, ...(x || {}) });
const err = (msg) => ({ ok: false, msg });
export const FIELDS = DEPTS.map((d) => d.id);
export const FIELD_NAME = Object.fromEntries(DEPTS.map((d) => [d.id, d.name]));
export const SECTORS = Object.keys(C.sectors);
export const sectorOf = (l) => (l && TYPES[l.type] ? TYPES[l.type].group : null);
// which field a company to-do trains
export const TASK_FIELD = { overtime: 'ops', runShift: 'ops', restock: 'procurement', sellSurplus: 'procurement', findCustomers: 'sales', deliver: 'sales', postCampaign: 'social', teamMeeting: 'hr', reviewBooks: 'finance', runExperiment: 'rnd', reviewContracts: 'legal' };
export const SPEC = Object.fromEntries(SECTORS.flatMap((s) => C.sectors[s].specs.map((x) => [x.id, { ...x, sector: s }])));

// ---------------------------------------------------------------- numbers
export const level = (xp) => { let n = 0; C.levels.forEach((t) => { if ((xp || 0) >= t) n++; }); return Math.max(1, n); };
export const nextAt = (xp) => C.levels.find((t) => t > (xp || 0)) ?? null;
export const floorOf = (xp) => C.levels[level(xp) - 1];
export const rating = (lv) => Math.min(5, Math.ceil(lv / 2)); // as a head you work like a specialist of this rating
export const RATING_NAME = ['Junior', 'Associate', 'Head', 'Senior', 'Star'];
export function tycoon(p) { const c = p.career; if (!c) return 0; return FIELDS.reduce((a, f) => a + level(c.xp[f]) - 1, 0) + SECTORS.reduce((a, s) => a + level(c.bx[s]) - 1, 0); }
export function title(p) { const t = tycoon(p); return C.titles.filter((x) => t >= x.min).pop(); }
export const seatsAllowed = (p) => C.seats.filter((x) => tycoon(p) >= x).length;
export const best = (p) => SECTORS.slice().sort((a, b) => (p.career.bx[b] || 0) - (p.career.bx[a] || 0))[0];
export const hasSpec = (p, id) => !!(p && p.career && Object.values(p.career.spec).includes(id));

// ---------------------------------------------------------------- state
export function ensure(p) {
  if (p.career) return p.career;
  p.career = { xp: Object.fromEntries(FIELDS.map((f) => [f, 0])), bx: Object.fromEntries(SECTORS.map((s) => [s, 0])), used: {}, spec: {}, seats: [],
    st: { tasks: 0, orders: 0, bought: 0, sold: 0, won: 0, stockXp: 0 }, cap: { m: -1, task: 0, order: 0, y: -1, stock: 0 }, log: [], tier: 0, crisis: null };
  return p.career;
}
// once per player: what they did before careers existed counts (stock profit, years with companies, prestige)
export function seed(city, p, ctx) {
  const c = ensure(p); if (c.seeded) return; c.seeded = true;
  const m = city.m || 0;
  c.xp.finance += Math.min(C.seedCap, Math.max(0, Math.round((p.realized || 0) * C.xp.stock)));
  const per = {};
  ctx.runs(p).forEach((l) => { const s = sectorOf(l); if (!s) return; per[s] = (per[s] || 0) + Math.max(0, m - (l.boughtM ?? m)) * C.xp.own; });
  Object.entries(per).forEach(([s, v]) => { c.bx[s] += Math.min(C.seedCap, Math.round(v)); });
  c.st.bought = ctx.runs(p).length;
  const tier = ctx.tier(p); if (tier > 0) { FIELDS.forEach((f) => { c.xp[f] += C.xp.tier * tier; }); c.tier = tier; }
  FIELDS.forEach((f) => { c.used[f] = m; });
  if (Object.values(c.xp).some((v) => v > 0) || Object.values(c.bx).some((v) => v > 0)) mile(c, m, 'Your track record so far counts toward your career');
}
function mile(c, m, t) { c.log.unshift({ m, t }); if (c.log.length > 30) c.log.length = 30; }

// add XP; announces new levels
export function gain(city, p, field, sector, amt, ctx) {
  if (!p || p.bot || p.admin || !(amt > 0)) return;
  const c = ensure(p), m = city.m;
  if (field) { const before = level(c.xp[field]); c.xp[field] = r2(c.xp[field] + amt); c.used[field] = m; const after = level(c.xp[field]); if (after > before) levelUp(city, p, `${FIELD_NAME[field]} level ${after}`, after === 3 ? `As head of ${FIELD_NAME[field]} you now bring the role's own effect too.` : `You lead ${FIELD_NAME[field]} like a ${RATING_NAME[rating(after) - 1].toLowerCase()} now.`, ctx); }
  if (sector) {
    const sAmt = field ? amt * C.sectorShare : amt;
    const before = level(c.bx[sector]); c.bx[sector] = r2(c.bx[sector] + sAmt); const after = level(c.bx[sector]);
    if (after > before) levelUp(city, p, `${C.sectors[sector].name} level ${after}`, after >= C.specLevel && !c.spec[sector] ? 'You can now choose a specialisation in this sector on your profile.' : 'Your sector experience grows.', ctx);
  }
}
function levelUp(city, p, t, x, ctx) {
  const c = p.career, before = c.tt ?? tycoon(p), now = tycoon(p); mile(c, city.m, t); if (ctx && ctx.feed) ctx.feed(p, city.m, t, x, 'good');
  const tb = C.titles.filter((q) => before >= q.min).pop(), tn = C.titles.filter((q) => now >= q.min).pop();
  if (tn !== tb) { mile(c, city.m, `Became ${tn.name}`); if (ctx && ctx.feed) ctx.feed(p, city.m, `You are now ${tn.name}`, seatsAllowed(p) > C.seats.filter((q) => before >= q).length ? 'You can lead one more department yourself.' : 'Your title on your profile changed.', 'good'); }
  c.tt = now;
}
function capped(c, m, k, max) { if (c.cap.m !== m) { c.cap.m = m; c.cap.task = 0; c.cap.order = 0; } if (c.cap[k] >= max) return false; c.cap[k]++; return true; }
const mentor = (city, l) => Object.values(l.ops ? l.ops.depts : {}).some((d) => d && d.head && d.head !== 'self' && d.who && city.talent && city.talent[d.who] && city.talent[d.who].rating >= C.mentorRating);
const leads = (p, l) => p.career && p.career.seats.some((s) => s.lid === l.id);

// ---------------------------------------------------------------- hooks the engine calls
export function task(city, p, l, taskId, ctx) {
  const f = TASK_FIELD[taskId]; if (!f || !p || p.bot) return; const c = ensure(p);
  if (taskId === 'deliver') { if (!capped(c, city.m, 'order', C.caps.order)) return; c.st.orders++; gain(city, p, 'sales', sectorOf(l), C.xp.order, ctx); return; }
  c.st.tasks++; if (!capped(c, city.m, 'task', C.caps.task)) return;
  gain(city, p, f, sectorOf(l), C.xp.task * (leads(p, l) && mentor(city, l) ? C.mentor : 1), ctx);
}
export function stock(city, p, sector, profit, ctx) {
  if (!p || p.bot || !(profit > 0)) return; const c = ensure(p), y = Math.floor(city.m / 12);
  if (c.cap.y !== y) { c.cap.y = y; c.cap.stock = 0; }
  const amt = Math.min(C.caps.stockYear - c.cap.stock, profit * C.xp.stock); if (amt <= 0) return; c.cap.stock += amt; c.st.stockXp = r2(c.st.stockXp + amt);
  gain(city, p, 'finance', null, amt, ctx); if (sector) gain(city, p, null, sector, amt, ctx);
}
export function count(p, k, n = 1) { if (!p || p.bot) return; const c = ensure(p); c.st[k] = (c.st[k] || 0) + n; }

// ---------------------------------------------------------------- the seats you lead
// set every department you lead to your current level (0 automation while you are away), and the specialisations
// each company gets from the people who own it. Called before production, after a seat or a choice changes.
export function refresh(city, ctx) {
  Object.values(city.players).forEach((p) => {
    if (!p.career || p.bot) return; const c = p.career, away = ctx.inactive(p);
    c.seats = c.seats.filter((s) => {
      const l = ctx.listing(city, s.lid), d = l && l.ops && l.ops.depts[s.dept];
      const valid = !!(d && ctx.canRun(p.id, l) && d.head === 'self' && d.who === 'p:' + p.id);
      if (!valid) { if (d && d.head === 'self' && d.who === 'p:' + p.id) { d.head = null; d.who = null; } return false; }
      const lv = level(c.xp[s.dept]); d.lv = lv; d.rt = rating(lv); d.hb = away ? 0 : headBonus(d.rt); return true;
    });
  });
  city.listings.forEach((l) => {
    if (!l.ops) return; const owners = ctx.owners(l), s = sectorOf(l);
    const sp = owners.map((p) => p && p.career && p.career.spec[s]).filter(Boolean);
    if (sp.length) l.ops.sp = [...new Set(sp)]; else delete l.ops.sp;
  });
}
export function take(city, p, l, dept, ctx) {
  const c = ensure(p);
  if (!l || !ctx.canRun(p.id, l)) return err('You do not run this company.');
  const d = l.ops && l.ops.depts[dept]; if (!d) return err('Open the department first.');
  if (d.head === 'self' && d.who === 'p:' + p.id) return err('You already lead it.');
  if (d.head === 'self') return err('A co-owner already leads this department.');
  if (c.seats.length >= seatsAllowed(p)) { const n = C.seats[c.seats.length]; return err(n == null ? 'You lead as many departments as you can.' : `You can lead ${c.seats.length} department${c.seats.length > 1 ? 's' : ''} now. Reach Tycoon level ${n} for one more, or step down somewhere else first.`); }
  if (d.head) ctx.dropHead(l, dept, d.head); // the specialist goes back to the bench
  d.head = 'self'; d.who = 'p:' + p.id; c.seats.push({ lid: l.id, dept, m: city.m });
  const lv = level(c.xp[dept]); d.lv = lv; d.rt = rating(lv); d.hb = headBonus(d.rt);
  if (!c.first) { c.first = true; mile(c, city.m, `First seat: head of ${FIELD_NAME[dept]} at ${ctx.name(l)}`); }
  refresh(city, ctx);
  return ok(`You now lead ${FIELD_NAME[dept]} at ${ctx.name(l).replace(/\.$/, '')}${lv < 3 ? '. The role\'s own effect comes at level 3.' : '.'}`);
}
export function leave(city, p, lid, dept) {
  const c = ensure(p), s = c.seats.find((x) => x.lid === lid && x.dept === dept); if (!s) return err('You do not lead that department.');
  c.seats = c.seats.filter((x) => x !== s);
  const l = city.listings.find((x) => x.id === lid), d = l && l.ops && l.ops.depts[dept];
  if (d && d.head === 'self' && d.who === 'p:' + p.id) { d.head = null; d.who = null; d.hb = undefined; d.lv = undefined; d.rt = undefined; }
  return ok('You stepped down.');
}
export function choose(city, p, sector, pick, ctx) {
  const c = ensure(p), sec = C.sectors[sector]; if (!sec) return err('Unknown sector.');
  const sp = sec.specs.find((x) => x.id === pick); if (!sp) return err('Unknown specialisation.');
  if (level(c.bx[sector]) < C.specLevel) return err(`Reach ${sec.name} level ${C.specLevel} first.`);
  if (c.spec[sector] === pick) return err('Already your specialisation.');
  const switching = !!c.spec[sector]; if (switching) c.bx[sector] = r2(c.bx[sector] * (1 - C.respec));
  if (level(c.bx[sector]) < C.specLevel) { c.bx[sector] = C.levels[C.specLevel - 1]; }
  c.spec[sector] = pick; mile(c, city.m, `${sec.name}: specialised as ${sp.name}`); refresh(city, ctx);
  return ok(`${sp.name}: ${sp.d}${switching ? ` You gave up ${Math.round(C.respec * 100)}% of your ${sec.name} experience to switch.` : ''}`);
}

// ---------------------------------------------------------------- monthly: seats, owning, prestige, crises, rust
export function monthStep(city, m, ctx) {
  const crisis = city.econ === 'Crisis';
  Object.values(city.players).forEach((p) => {
    if (p.bot || p.admin) return; const c = ensure(p); if (!c.seeded) seed(city, p, ctx);
    const away = ctx.inactive(p);
    if (!away) {
      c.seats.forEach((s) => {
        const l = ctx.listing(city, s.lid); if (!l) return;
        const size = C.size[l.size] || 1, loss = ctx.profit(l) < 0 ? 0.5 : 1;
        gain(city, p, s.dept, sectorOf(l), C.xp.lead * size * loss * (mentor(city, l) ? C.mentor : 1), ctx);
      });
      const per = {};
      ctx.runs(p).forEach((l) => { const s = sectorOf(l); if (!s) return; (per[s] = per[s] || []).push(l); });
      Object.entries(per).forEach(([s, ls]) => ls.slice(0, C.caps.ownPerSector).forEach((l) => gain(city, p, null, s, C.xp.own + Math.min(C.caps.ownProfit, Math.max(0, ctx.profit(l))), ctx)));
    }
    const tier = ctx.tier(p);
    if (tier > (c.tier || 0)) { for (let t = (c.tier || 0) + 1; t <= tier; t++) FIELDS.forEach((f) => gain(city, p, f, null, C.xp.tier, null)); c.tier = tier; mile(c, m, `Reached ${ctx.tierName(p)}`); }
    // a crisis: come through it with every company in profit
    const mine = ctx.runs(p);
    if (crisis) { if (!c.crisis) c.crisis = { bad: false, n: 0 }; c.crisis.n++; if (mine.some((l) => ctx.profit(l) < 0)) c.crisis.bad = true; }
    else if (c.crisis) {
      if (!c.crisis.bad && mine.length) { const secs = [...new Set(mine.map(sectorOf).filter(Boolean))]; secs.forEach((s) => gain(city, p, null, s, C.xp.crisis, ctx)); mile(c, m, 'Came through the crisis with every company in profit'); }
      c.crisis = null;
    }
    // rust: a field you have not used for two years slowly loses XP, never below the start of your level
    FIELDS.forEach((f) => { if (m - (c.used[f] ?? m) >= C.rustAfter && c.xp[f] > 0) c.xp[f] = Math.max(floorOf(c.xp[f]), r2(c.xp[f] * (1 - C.rust))); });
    c.tt = tycoon(p);
  });
}

// ---------------------------------------------------------------- what the profile shows
export function headYpiOf(d) { return d && d.head === 'self' && d.hb > 0 ? headYpi(d.rt || 1) : 0; }
export const PERKS = C.perks;
export function perksOf(p) { const c = p.career; if (!c) return []; const out = []; FIELDS.forEach((f) => { const lv = level(c.xp[f]); (C.perks[f] || []).forEach((x) => { if (lv >= x.lv) out.push({ f, ...x }); }); }); return out; }
