// Aurex Bay Tycoon — building sites. New companies start as a plot (BUILD in content.js). Whoever buys the plot is the
// developer: they ask construction companies for bids (a tender on aurexbuild.ab) or hire the city's own crew. The
// accepted bid is a contract: its price is held by the city and paid to the builder phase by phase. The site uses
// building supplies every game week through four phases (foundation, structure, walls and roof, fit-out); without
// the week's supplies it stands still. A player builder ends each phase with a short crane task (js/crane.js); its
// score makes the builder's stars and can save a week. When the last phase is done the company opens, new.
// Buildings wear (l.cond, 0–100) while nobody owns them or the owner is away. Worn buildings earn less; a ruin
// earns nothing until it is renovated. Renovations and upgrades from level 2 are smaller projects (Structure + Walls).
//
// l.site = { kind: 'new'|'reno'|'up', frac, to?, ph, wk, used: { g: qty this phase }, stock: { g: qty }, cut, stall,
//            st: 'open'|'build'|'task', tender: { turnkey, g } | null, bids: [{ id, lid, pid, price, weeks, g }],
//            c: { by: lid | 'city', price, held, paid, g, due, weeks } | null, q: [scores], taskDue }
// The engine hands in what it needs through ctx (no import of engine.js or ops.js here).
import { BUILD, GOODS, RECIPES, TYPES, SIZES } from './content.js';

const r2 = (v) => Math.round(v * 100) / 100;
const r4 = (v) => Math.round(v * 10000) / 10000;
const uid = () => 'bd' + Math.random().toString(36).slice(2, 9);
const ok = (msg, x) => ({ ok: true, msg, ...(x || {}) }), err = (msg) => ({ ok: false, msg });
const WEEK = 1 / 48;
export const B = BUILD;
export const PHASES = BUILD.phases;
export const CITY = 'city';

// ---------------------------------------------------------------- what a listing is
export const unbuilt = (l) => !!(l && l.site && l.site.kind === 'new');
export const cond = (l) => (l && l.cond != null ? l.cond : 100);
export const ruined = (l) => !!l && !unbuilt(l) && cond(l) < B.cond.ruin;
// not running: a building site, or a ruin waiting for its renovation
export const idle = (l) => unbuilt(l) || ruined(l);
export const condLabel = (l) => { const c = cond(l); return c >= B.cond.worn ? 'Good' : c >= B.cond.poor ? 'Worn' : c >= B.cond.ruin ? 'Poor' : 'Ruin'; };
// what wear does to income and production
export const condMult = (l) => { if (idle(l)) return 0; const c = cond(l); return c >= B.cond.worn ? 1 : c >= B.cond.poor ? B.condMult.worn : B.condMult.poor; };
// ... and to the price
export const condPrice = (l) => { if (unbuilt(l)) return 1; const c = cond(l); return c >= B.cond.worn ? 1 : c >= B.cond.poor ? B.condMult.worn : c >= B.cond.ruin ? B.condMult.poor : B.ruinPrice; };
export const isPlotId = (id) => B.plots.includes(id) || Number(String(id).slice(1)) >= B.firstPlot;
export const isBuilder = (l) => !!l && l.type === 'construction' && !idle(l);
export const kindName = (s) => (s.kind === 'new' ? 'New building' : s.kind === 'reno' ? 'Renovation' : `Upgrade to level ${s.to}`);

// ---------------------------------------------------------------- the project
export function newSite(l, kind, frac, to) {
  return { kind, frac: r4(frac == null ? 1 : frac), ...(to ? { to } : {}), ph: 0, wk: 0, used: {}, stock: {}, cut: 0, stall: 0, st: 'open', tender: null, bids: [], c: null, q: [] };
}
export const phaseIds = (s) => (s.kind === 'new' ? PHASES.map((_, i) => i) : B.parts.slice());
export const phase = (s, i = s.ph) => PHASES[phaseIds(s)[i]];
export const phaseCount = (s) => phaseIds(s).length;
// materials follow the company's price: a Medium company of BUILD.ref M uses the phase lists as written
const sizeM = (l) => Math.round(TYPES[l.type].price * SIZES[l.size].mult * 2) / 2 / B.ref;
// the company's own main supply goes into the fit-out (steel for a car factory, chips for a data centre ...)
export function fitGood(l) {
  const r = RECIPES[l.type]; const g = r && Object.keys(r.in).find((x) => !GOODS[x].mains && x !== 'energy');
  return g || 'chemicals';
}
// weeks of phase i (the builder's speed: the city crew is slower; a fast task saves a week of the next phase)
export function phaseWeeks(l, s, i = s.ph, by) {
  const p = phase(s, i); let w = B.weeks[l.size] * p.share * (s.kind === 'new' ? 1 : B.partWeeks);
  if ((by || (s.c && s.c.by)) === CITY) w *= B.city.slow;
  return Math.max(1, Math.round(w) - (i === s.ph ? s.cut || 0 : 0));
}
export const totalWeeks = (l, s, by) => phaseIds(s).reduce((a, _, i) => a + phaseWeeks(l, { ...s, cut: 0 }, i, by), 0);
// materials of phase i
export function phaseNeed(l, s, i = s.ph) {
  const p = phase(s, i), k = sizeM(l) * s.frac, out = {};
  Object.entries(p.need).forEach(([g, q]) => { out[g] = Math.round(q * k); });
  if (p.fit) { const g = fitGood(l); out[g] = (out[g] || 0) + Math.max(1, Math.round(p.fit * k / GOODS[g].base)); }
  return out;
}
// what this week of the current phase uses
export function weekNeed(l, s) {
  const need = phaseNeed(l, s), w = phaseWeeks(l, s), left = Math.max(1, w - s.wk), out = {};
  Object.entries(need).forEach(([g, q]) => { const rest = Math.max(0, q - (s.used[g] || 0)); out[g] = rest / left; });
  return out;
}
// everything still needed from here to the end, per good (less what already lies on site)
export function stillNeeded(l, s) {
  const out = {};
  for (let i = s.ph; i < phaseCount(s); i++) Object.entries(phaseNeed(l, s, i)).forEach(([g, q]) => { out[g] = (out[g] || 0) + (i === s.ph ? Math.max(0, q - (s.used[g] || 0)) : q); });
  return out;
}
export const room = (l, s, g) => Math.max(0, Math.floor((stillNeeded(l, s)[g] || 0) - (s.stock[g] || 0)));
export function materialsValue(city, l, s, priceOf) {
  return r2(Object.entries(stillNeeded(l, s)).reduce((a, [g, q]) => a + Math.max(0, q - (s.stock[g] || 0)) * priceOf(g), 0));
}
// 0 … 1 over all phases, by weeks
export function progress(l, s = l.site) {
  if (!s) return 1; let done = 0, all = 0;
  phaseIds(s).forEach((_, i) => { const w = phaseWeeks(l, { ...s, cut: 0 }, i); all += w; if (i < s.ph) done += w; else if (i === s.ph) done += Math.min(w, s.wk + (s.cut || 0)); });
  return all ? Math.min(1, done / all) : 0;
}
// a fair builder's fee for this project (bids are free, this is the guide)
export const fairFee = (l, s, fullPrice) => r2(fullPrice * B.labour * (s.kind === 'new' ? 1 : s.frac));
// the city crew: materials at market price + the fee, all with a markup; they bring everything themselves
export const cityPrice = (city, l, s, fullPrice, priceOf) => r2((materialsValue(city, l, s, priceOf) + fairFee(l, s, fullPrice) * (1 - progress(l, s))) * B.city.markup);
// sites a construction company can run at once, and the ones it runs
export const slots = (bl) => B.slots[bl.size] + Math.max(0, (bl.level || 1) - 1);
export const contractsOf = (city, lid) => city.listings.filter((l) => l.site && l.site.c && l.site.c.by === lid);
export const freeSlots = (city, bl) => slots(bl) - contractsOf(city, bl.id).length;
export const stars = (bl) => { const s = bl.stars || []; return s.length ? Math.round(s.reduce((a, x) => a + x, 0) / s.length * 10) / 10 : null; };
export const builders = (city) => city.listings.filter((l) => isBuilder(l) && l.owner);
export const tenders = (city) => city.listings.filter((l) => l.site && l.site.st === 'open' && l.site.tender && l.owner);
export const sitesOf = (city, ctx, pid) => city.listings.filter((l) => l.site && l.owner && ctx.canRun(pid, l));
export const builderName = (city, ctx, s) => (!s.c ? '' : s.c.by === CITY ? B.city.name : (() => { const bl = ctx.listing(s.c.by); return bl ? ctx.name(bl) : 'the builder'; })());

// ---------------------------------------------------------------- older cities: plots, car factories, wear
export function migrate(city, ctx) {
  city.listings.forEach((l) => {
    if (l.cond == null) l.cond = 100;
    if (!l.owner && l.freeSince == null) l.freeSince = city.m;
    if (!isPlotId(l.id) || l.built || l.site) return;
    // a site that becomes a plot: its owner is bought out at full value first
    if (l.owner) ctx.buyOut(l);
    l.level = 1; l.upgrade = null; l.ops = null; l.site = newSite(l, 'new', 1);
  });
}
// a plot or project changes owner or is sold: a running contract ends and the held money goes back
export function onRelease(city, l, ctx) {
  const s = l.site; if (!s) return;
  if (s.c) { if (s.c.held > 0.001) ctx.credit(l.owner, s.c.held); endContract(city, l, ctx, 'The developer sold the site. The contract ended.'); }
  s.tender = null; s.bids = [];
}

// ---------------------------------------------------------------- mail
const siteUrl = (l) => `aurexbuild.ab/site/${l.id}`;
function mailRunners(ctx, l, x) { ctx.runners(l).forEach((p) => ctx.mail(p.id, { lid: l.id, web: siteUrl(l), kind: 'info', ...x })); }
function mailBuilder(city, ctx, l, x) { const s = l.site; if (!s.c || s.c.by === CITY) return; const bl = ctx.listing(s.c.by); if (bl) ctx.runners(bl).forEach((p) => ctx.mail(p.id, { lid: bl.id, web: siteUrl(l), kind: 'info', ...x })); }
const crew = (ctx, l) => ({ n: 'Site office', r: `${ctx.name(l)}` });

// ---------------------------------------------------------------- each game week
export function weekStep(city, ctx) {
  city.listings.forEach((l) => {
    const s = l.site; if (!s) return;
    // bids run out
    s.bids = (s.bids || []).filter((b) => city.g - b.g < B.bidWeeks * WEEK - 1e-9 && ctx.listing(b.lid) && isBuilder(ctx.listing(b.lid)));
    if (!s.c) return;
    // the builder is gone (sold to the market): the contract ends and the rest of the money goes back
    if (s.c.by !== CITY) { const bl = ctx.listing(s.c.by); if (!bl || !bl.owner || !isBuilder(bl)) { if (s.c.held > 0.001) ctx.credit(l.owner, s.c.held); endContract(city, l, ctx, 'Your builder closed down. The money still held for the work went back to you.'); return; } }
    if (s.st === 'task') { if (city.g >= s.taskDue - 1e-9) endPhase(city, l, ctx, B.auto, true); return; }
    if (s.st !== 'build') return;
    const need = weekNeed(l, s);
    if (s.c.by !== CITY) {
      const short = Object.entries(need).filter(([g, q]) => (s.stock[g] || 0) + 1e-6 < q);
      if (short.length) {
        s.stall = (s.stall || 0) + 1;
        if (s.stall === 1 || s.stall % 4 === 0) {
          const what = short.map(([g, q]) => `${Math.ceil(q - (s.stock[g] || 0))} ${GOODS[g].unit} of ${GOODS[g].name.toLowerCase()}`).join(', ');
          const x = { from: crew(ctx, l), subj: `Work stopped at ${ctx.name(l)}`, body: `${phase(s).name}: the crew is waiting for supplies. Short this week: ${what}. Bring supplies to the site from the market or from your own companies.` };
          mailRunners(ctx, l, x); mailBuilder(city, ctx, l, x);
        }
        return;
      }
      Object.entries(need).forEach(([g, q]) => { s.stock[g] = r4(Math.max(0, (s.stock[g] || 0) - q)); if (s.stock[g] < 1e-4) delete s.stock[g]; });
    }
    Object.entries(need).forEach(([g, q]) => { s.used[g] = r4((s.used[g] || 0) + q); });
    // the city crew is paid as it works, week by week
    if (s.c.by === CITY) { const pay = r2(Math.min(s.c.held, s.c.price / Math.max(1, s.c.weeks))); s.c.held = r2(s.c.held - pay); s.c.paid = r2(s.c.paid + pay); }
    s.stall = 0; s.wk++;
    if (s.wk < phaseWeeks(l, s)) return;
    // the phase is built: a player builder lifts the last pieces in by hand (the crane task)
    if (s.c.by !== CITY && ctx.runners(ctx.listing(s.c.by)).length) {
      s.st = 'task'; s.taskDue = r4(city.g + B.taskWeeks * WEEK);
      mailBuilder(city, ctx, l, { from: crew(ctx, l), subj: `${phase(s).task}: ${ctx.name(l)}`, body: `${phase(s).name} is ready for the crane. Do the 20-second task on the site page within ${B.taskWeeks} weeks, or the crew does it without you. A good job lifts your stars and can save a week.` });
      return;
    }
    endPhase(city, l, ctx, s.c.by === CITY ? B.cityScore : B.auto, true);
  });
}
// one phase is finished (score 0…1): the builder is paid its part and the next phase starts, or the building opens
function endPhase(city, l, ctx, score, auto) {
  const s = l.site, c = s.c, n = phaseCount(s), p = phase(s), share = p.share / phaseIds(s).reduce((a, i) => a + PHASES[i].share, 0);
  s.q.push(r2(score));
  if (s.ph < n - 1) {
    const pay = c.by === CITY ? 0 : r2(Math.min(c.held, c.price * share)); c.held = r2(c.held - pay); c.paid = r2(c.paid + pay); payBuilder(city, ctx, l, pay);
    s.ph++; s.wk = 0; s.used = {}; s.st = 'build'; s.stall = 0; s.cut = score >= B.fast ? 1 : 0; s.taskDue = null;
    mailRunners(ctx, l, { from: crew(ctx, l), subj: `${p.name} done at ${ctx.name(l)}`, body: `${builderName(city, ctx, s)} finished the ${p.name.toLowerCase()}${auto ? '' : ` (task ${Math.round(score * 100)}%)`}. Next: ${phase(s).name.toLowerCase()}, ${phaseWeeks(l, s)} weeks.${pay > 0 ? ` ${r2(pay)} M of the contract was paid to the builder.` : ''}` });
    return;
  }
  finish(city, l, ctx);
}
function payBuilder(city, ctx, l, v) {
  const c = l.site.c; if (v <= 0 || c.by === CITY) return;
  const bl = ctx.listing(c.by); if (!bl || !bl.owner) return;
  ctx.credit(bl.owner, v); if (bl.ops && bl.ops.cur) bl.ops.cur.goods += v;
}
function finish(city, l, ctx) {
  const s = l.site, c = s.c, late = Math.max(0, Math.ceil((city.g - c.due) * 48 - 1e-6));
  const fine = c.by === CITY ? 0 : r2(Math.min(c.held, c.price * Math.min(B.fineMax, late * B.fine)));
  if (fine > 0) ctx.credit(l.owner, fine);
  const last = r2(c.held - fine); c.paid = r2(c.paid + last); c.held = 0; payBuilder(city, ctx, l, last);
  const avg = s.q.length ? s.q.reduce((a, x) => a + x, 0) / s.q.length : B.auto, st = Math.max(1, Math.min(5, Math.round(1 + avg * 4 - (late > 0 ? 1 : 0))));
  if (c.by !== CITY) { const bl = ctx.listing(c.by); if (bl) { bl.stars = (bl.stars || []).concat(st).slice(-10); bl.built = (bl.built || 0) + 1; } }
  const kind = s.kind, by = builderName(city, ctx, s);
  delete l.site; l.cond = 100;
  if (kind === 'new') { l.built = true; l.level = 1; l.newUntil = city.m + B.newMonths; ctx.opened(l); }
  if (kind === 'up') l.level = s.to;
  const what = kind === 'new' ? `${ctx.name(l)} is built and open for business` : kind === 'reno' ? `${ctx.name(l)} is renovated` : `${ctx.name(l)} reached level ${l.level}`;
  const tail = `${by} handed it over${late ? ` ${late} week${late > 1 ? 's' : ''} late (${fine} M back to you as a late fine)` : ' on time'}.${kind === 'new' ? ` A new building earns +${Math.round(B.newBonus * 100)}% YPI its first year.` : ''}`;
  ctx.runners(l).forEach((p) => ctx.mail(p.id, { lid: l.id, from: crew(ctx, l), subj: what, body: tail, kind: 'good' }));
  if (c.by !== CITY) { const bl = ctx.listing(c.by); if (bl) ctx.runners(bl).forEach((p) => ctx.mail(p.id, { lid: bl.id, from: crew(ctx, l), subj: `Handed over: ${ctx.name(l)}`, body: `The job is done. ${r2(c.paid)} M paid in all${fine ? `, less a late fine of ${fine} M` : ''}. The developer's rating: ${'★'.repeat(st)}${'☆'.repeat(5 - st)}.`, kind: 'good' })); }
  if (kind === 'new') ctx.news(`${ctx.name(l)} opens`, `${by} finished the new ${TYPES[l.type].name.toLowerCase()} in ${l.district}.`, 'good');
}
function endContract(city, l, ctx, why) {
  const s = l.site, c = s.c; if (!c) return;
  if (c.by !== CITY) { const bl = ctx.listing(c.by); if (bl) ctx.runners(bl).forEach((p) => ctx.mail(p.id, { lid: bl.id, from: crew(ctx, l), subj: `Contract ended: ${ctx.name(l)}`, body: why, kind: 'bad' })); }
  s.c = null; s.st = 'open'; s.stall = 0; s.taskDue = null; s.tender = null; s.bids = [];
}

// ---------------------------------------------------------------- once a month: wear
export function monthStep(city, m, ctx) {
  city.listings.forEach((l) => {
    if (unbuilt(l)) return;
    const was = cond(l); let c = was;
    if (!l.owner) { if (l.freeSince == null) l.freeSince = m; if (m - l.freeSince >= B.decay.idle) c -= B.decay.free; }
    else if (ctx.away(l)) c -= B.decay.away;
    if (l.site && l.site.kind === 'reno') c = was; // under renovation: no more wear
    l.cond = Math.max(0, Math.round(c * 10) / 10);
    if (l.owner && was >= B.cond.poor && l.cond < B.cond.poor) ctx.notify(l, `${ctx.name(l)} is in poor repair`, `Condition ${Math.round(l.cond)}%. It earns ${Math.round((1 - B.condMult.poor) * 100)}% less until it is renovated.`, 'bad');
    if (l.owner && was >= B.cond.ruin && l.cond < B.cond.ruin) ctx.notify(l, `${ctx.name(l)} is a ruin`, 'It stopped working. Renovate it to open again.', 'bad');
  });
}

// ---------------------------------------------------------------- actions
const num = (v) => Number(v) || 0;
export function act(city, p, action, a, ctx) {
  const l = ctx.listing(a.lid); if (!l) return err('Unknown site.');
  const own = ctx.canRun(p.id, l);
  if (action === 'siteRenovate') {
    if (!own) return err('You do not run this company.');
    if (l.site) return err('Work is already planned here.'); if (l.upgrade) return err('An upgrade is running.');
    if (cond(l) >= B.renoBelow) return err(`Nothing to renovate yet: condition ${Math.round(cond(l))}%.`);
    l.site = newSite(l, 'reno', B.reno[0] + B.reno[1] * (1 - cond(l) / 100));
    return ok('Renovation planned. Ask builders for bids or hire the city crew.');
  }
  const s = l.site; if (!s) return err('No building work here.');
  const bl = a.from && a.from !== CITY ? ctx.listing(a.from) : null;
  const builderRun = s.c && s.c.by !== CITY && ctx.canRun(p.id, ctx.listing(s.c.by));
  switch (action) {
    case 'siteTender': {
      if (!own) return err('Only the developer asks for bids.'); if (s.c) return err('A builder is already on site.');
      s.tender = { turnkey: !!a.turnkey, g: city.g }; s.bids = [];
      const bs = builders(city).filter((x) => freeSlots(city, x) > 0);
      bs.forEach((x) => ctx.runners(x).forEach((r) => ctx.mail(r.id, { lid: x.id, web: siteUrl(l), from: { n: p.name, r: `${ctx.name(l)} · aurexbuild.ab`, k: 'player', pid: p.id }, subj: `Call for bids: ${kindName(s).toLowerCase()} in ${l.district}`, body: `${ctx.name(l)} (${SIZES[l.size].label}) needs a builder: ${kindName(s).toLowerCase()}, ${totalWeeks(l, s)} weeks of work. ${s.tender.turnkey ? 'Turnkey: the builder brings the supplies.' : 'Labour only: the developer brings the supplies.'} Send your price on the site page.`, kind: 'info' })));
      return ok(bs.length ? `Call for bids sent to ${bs.length} construction compan${bs.length > 1 ? 'ies' : 'y'}.` : 'Call for bids posted on aurexbuild.ab. No construction company has a free crew right now: the city crew can always take it.');
    }
    case 'siteCancel': { if (!own) return err('Not your site.'); s.tender = null; s.bids = []; return ok('Call for bids withdrawn.'); }
    case 'siteBid': {
      if (!bl || !isBuilder(bl) || !ctx.canRun(p.id, bl)) return err('Bid from a construction company you run.');
      if (!s.tender || s.c) return err('This site is not asking for bids.');
      if (freeSlots(city, bl) <= 0) return err(`${ctx.name(bl)} has no free crew: it runs ${slots(bl)} site${slots(bl) > 1 ? 's' : ''} at once.`);
      const price = r2(num(a.price)), weeks = Math.round(num(a.weeks)), min = totalWeeks(l, s);
      if (!(price >= 0) || price > 500) return err('Name a price for the work.');
      if (weeks < min) return err(`The work takes at least ${min} weeks.`); if (weeks > min * 3) return err(`Promise the job within ${min * 3} weeks.`);
      s.bids = s.bids.filter((b) => b.lid !== bl.id).concat({ id: uid(), lid: bl.id, pid: p.id, price, weeks, g: city.g, note: String(a.note || '').trim().slice(0, 140) });
      mailRunners(ctx, l, { from: { n: p.name, r: `${ctx.name(bl)} · aurexbuild.ab`, k: 'player', pid: p.id }, subj: `Bid for ${ctx.name(l)}: ${price} M`, body: `${ctx.name(bl)} offers to do the ${kindName(s).toLowerCase()} for ${price} M in ${weeks} weeks.${a.note ? `\n“${String(a.note).slice(0, 140)}”` : ''}\nAccept or decline it on the site page within ${B.bidWeeks} weeks.` });
      return ok('Bid sent. The developer gets a mail.');
    }
    case 'siteWithdraw': { const b = s.bids.find((x) => x.id === a.bid); if (!b || !ctx.canRun(p.id, ctx.listing(b.lid))) return err('Not your bid.'); s.bids = s.bids.filter((x) => x !== b); return ok('Bid withdrawn.'); }
    case 'siteDecline': { if (!own) return err('Not your site.'); const b = s.bids.find((x) => x.id === a.bid); if (!b) return err('The bid is gone.'); s.bids = s.bids.filter((x) => x !== b); const b2 = ctx.listing(b.lid); if (b2) ctx.runners(b2).forEach((r) => ctx.mail(r.id, { lid: b2.id, web: siteUrl(l), from: { n: p.name, r: ctx.name(l), k: 'player', pid: p.id }, subj: `Bid declined: ${ctx.name(l)}`, body: 'The developer went another way this time.', kind: 'info' })); return ok('Bid declined.'); }
    case 'siteAccept': {
      if (!own) return err('Not your site.'); if (s.c) return err('A builder is already on site.');
      const b = s.bids.find((x) => x.id === a.bid); if (!b) return err('The bid is gone.');
      const b2 = ctx.listing(b.lid); if (!b2 || !isBuilder(b2) || !b2.owner) return err('That company no longer builds.');
      if (freeSlots(city, b2) <= 0) return err(`${ctx.name(b2)} took other work in the meantime: no free crew.`);
      if (ctx.cashOf(l.owner) < b.price) return err(`The contract is ${b.price} M. You have ${r2(ctx.cashOf(l.owner))} M.`);
      ctx.debit(l.owner, b.price);
      s.c = { by: b2.id, price: b.price, held: b.price, paid: 0, g: city.g, weeks: b.weeks, due: r4(city.g + b.weeks * WEEK), turnkey: !!(s.tender && s.tender.turnkey) };
      s.st = 'build'; s.tender = null; s.bids = []; s.stall = 0;
      ctx.runners(b2).forEach((r) => ctx.mail(r.id, { lid: b2.id, web: siteUrl(l), from: { n: p.name, r: ctx.name(l), k: 'player', pid: p.id }, subj: `You got the job: ${ctx.name(l)}`, body: `${b.price} M is held by the city and paid to you phase by phase. Hand it over within ${b.weeks} weeks: every week late costs ${Math.round(B.fine * 100)}% of the price. ${s.c.turnkey ? 'Turnkey: bring the supplies to the site.' : 'The developer brings the supplies, you can help.'} First up: ${phase(s).name.toLowerCase()}.`, kind: 'good' }));
      return ok(`${ctx.name(b2)} starts on the ${phase(s).name.toLowerCase()}. ${b.price} M is held and paid phase by phase.`);
    }
    case 'siteCity': {
      if (!own) return err('Not your site.'); if (s.c) return err('A builder is already on site.');
      const price = cityPrice(city, l, s, ctx.fullPrice(l), ctx.priceOf);
      if (ctx.cashOf(l.owner) < price) return err(`${B.city.name} asks ${price} M, supplies included. You have ${r2(ctx.cashOf(l.owner))} M.`);
      ctx.debit(l.owner, price); const weeks = Math.round(totalWeeks(l, s, CITY) * (1 - progress(l, s)));
      // supplies already on site are the city's to use: they count against the price
      s.stock = {};
      s.c = { by: CITY, price, held: price, paid: 0, g: city.g, weeks, due: r4(city.g + (weeks + 1) * WEEK), turnkey: true }; s.st = 'build'; s.tender = null; s.bids = []; s.stall = 0;
      return ok(`${B.city.name} takes the job for ${price} M, supplies included: about ${weeks} weeks.`);
    }
    case 'siteFire': {
      if (!own) return err('Not your site.'); if (!s.c) return err('Nobody is working here.');
      if (s.c.by !== CITY) { const b2 = ctx.listing(s.c.by); if (b2) b2.stars = (b2.stars || []).concat(1).slice(-10); }
      const back = r2(s.c.held); if (back > 0) ctx.credit(l.owner, back);
      endContract(city, l, ctx, `${p.name} ended the contract for ${ctx.name(l)}. What was built stays on site.`);
      return ok(`Contract ended. ${back} M came back to you. What was built and the supplies on site stay.`);
    }
    case 'siteBuy': case 'siteMove': {
      const g = a.g; if (!GOODS[g] || GOODS[g].mains) return err('Unknown supply.');
      if (!(own || builderRun)) return err('Only the developer and their builder bring supplies.');
      if (s.c && s.c.by === CITY) return err(`${B.city.name} brings its own supplies.`);
      const free = room(l, s, g); if (free < 1) return err(`The site needs no more ${GOODS[g].name.toLowerCase()}.`);
      const qty = Math.min(free, Math.max(1, Math.round(num(a.qty))));
      if (action === 'siteBuy') {
        const payer = own && !builderRun ? l.owner : builderRun && !own ? ctx.listing(s.c.by).owner : (a.pay === 'builder' && builderRun ? ctx.listing(s.c.by).owner : l.owner);
        const est = ctx.quote(g, qty); if (ctx.cashOf(payer) < est) return err(`That costs about ${r2(est)} M.`);
        const r = ctx.buy(payer, g, qty); s.stock[g] = r4((s.stock[g] || 0) + qty);
        if (payer !== l.owner) { const b2 = ctx.listing(s.c.by); if (b2 && b2.ops && b2.ops.cur) b2.ops.cur.sup += r.cost; }
        return ok(`${qty} ${GOODS[g].unit} of ${GOODS[g].name.toLowerCase()} delivered to the site: ${r2(r.cost)} M.`);
      }
      const src = ctx.listing(a.from); if (!src || !src.ops || !ctx.canRun(p.id, src)) return err('Send from a company you run.');
      const have = Math.floor(src.ops.inv[g] || 0); if (have < 1) return err(`${ctx.name(src)} has no ${GOODS[g].name.toLowerCase()} in stock.`);
      const q = Math.min(qty, have); src.ops.inv[g] = r4((src.ops.inv[g] || 0) - q); s.stock[g] = r4((s.stock[g] || 0) + q);
      return ok(`${q} ${GOODS[g].unit} of ${GOODS[g].name.toLowerCase()} trucked from ${ctx.name(src)} to the site.`);
    }
    case 'siteTask': {
      if (s.st !== 'task' || !builderRun) return err('No crane task is waiting for you here.');
      const score = Math.max(0, Math.min(1, num(a.score)));
      endPhase(city, l, ctx, score, false);
      return ok(`${Math.round(score * 100)}%: ${score >= B.fast ? 'a clean lift. The next phase is a week shorter.' : score >= 0.5 ? 'good work.' : 'it holds, but the developer noticed.'}`);
    }
  }
  return null;
}
// an upgrade from level 2 on is a building project: half the money now, the rest is supplies and the builder
export function startUpgrade(l) { l.site = newSite(l, 'up', B.upShare * l.level, l.level + 1); return l.site; }
// bots (and nobody else) hire the city crew at once
export function cityHire(city, l, ctx) {
  const s = l.site, price = cityPrice(city, l, s, ctx.fullPrice(l), ctx.priceOf); if (ctx.cashOf(l.owner) < price) return false;
  ctx.debit(l.owner, price); const weeks = totalWeeks(l, s, CITY);
  s.c = { by: CITY, price, held: price, paid: 0, g: city.g, weeks, due: r4(city.g + (weeks + 1) * WEEK), turnkey: true }; s.st = 'build'; return true;
}
