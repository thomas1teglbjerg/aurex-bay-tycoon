// The national bank: the Bank of Aurex (CENTRAL_BANK in content.js). Its owner is the governor and steers the bank rate
// that every business loan starts from, and may put a levy on a crowded sector and a much-traded supply.
// The governor nudges the economy but never controls it: the rate moves slowly, changes are announced a week ahead,
// the world cards still decide, and the Finance Ministry steps in when the rate stays extreme for a year.
import { CENTRAL as C, CENTRAL_BANK, TYPES, GOODS } from './content.js';

const r2 = (x) => Math.round(x * 100) / 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export { C };
export const ID = CENTRAL_BANK;

export function ensure(city) {
  if (!city.cb) city.cb = { rate: C.start, target: C.start, setM: -99, levyM: -99, hist: [[city.m || 0, C.start]], levy: { sector: null, sp: 0, supply: null, gp: 0 }, pending: null, px: 1, extremeSince: null, collected: 0, year: 0 };
  return city.cb;
}
export const rate = (city) => (city.cb ? city.cb.rate : C.start);
export const isBank = (l) => !!l && l.id === ID;
export const px = (city) => (city.cb ? city.cb.px || 1 : 1);
// levy on a company's passive income (percent) and on a supply bought on the city market (share)
export const sectorLevy = (city, type) => (city.cb && city.cb.levy.sector === type ? city.cb.levy.sp : 0);
export const supplyLevy = (city, g) => (city.cb && city.cb.levy.supply === g ? city.cb.levy.gp / 100 : 0);
export const load = (cb) => cb.levy.sp + cb.levy.gp / 2;

// how hard the policy leans on the economy: +1 = cheap money (towards Boom), −1 = dear money or heavy levies (towards Recession)
export function tilt(city) {
  const cb = city.cb; if (!cb) return 0;
  const [lo, hi] = C.calm; let t = 0;
  if (cb.rate < lo) t = (lo - cb.rate) / (lo - C.min); else if (cb.rate > hi) t = -(cb.rate - hi) / (C.max - hi);
  const over = load(cb) - C.levyLoad; if (over > 0) t -= over / 7;
  return clamp(t, -1, 1);
}
export function tiltWords(city) {
  const t = tilt(city);
  return t > 0.5 ? 'Strong push towards a boom' : t > 0.05 ? 'Mild push towards a boom' : t < -0.5 ? 'Strong drag towards recession' : t < -0.05 ? 'Mild drag towards recession' : 'Neutral';
}
const STEPS = ['Crisis', 'Recession', 'Stable', 'Boom'];
// a world card without its own economy moves the economy as usual; the policy may push it one step further
export function nudge(city, econ, rand) {
  const t = tilt(city); if (!t || rand() >= Math.abs(t) * C.tiltMax) return { econ, moved: 0 };
  const i = STEPS.indexOf(econ), j = t > 0 ? Math.min(3, i + 1) : Math.max(1, i - 1);
  return { econ: STEPS[j], moved: j - i };
}

// who may buy the bank: Elite prestige and Finance level 6 (ctx gives tier and finance level)
export function eligible(p, ctx) {
  if (!p || p.bot) return { ok: false, why: 'Only tycoons can run the national bank.' };
  if (p.admin) return { ok: true };
  const tier = ctx.tier(p), fin = ctx.finLevel(p), miss = [];
  if (tier < C.needTier) miss.push(`${ctx.tierName(C.needTier)} prestige`);
  if (fin < C.needFinance) miss.push(`Finance level ${C.needFinance} (you have ${fin})`);
  return miss.length ? { ok: false, why: `The Bank of Aurex is only sold to established tycoons: you need ${miss.join(' and ')}.` } : { ok: true };
}

// the 3 sectors with the most companies running, and the 3 most traded supplies last month
export function crowded(city) {
  const n = {}; city.listings.filter((l) => l.owner).forEach((l) => (n[l.type] = (n[l.type] || 0) + 1));
  return Object.entries(n).filter(([, k]) => k >= 2).sort((a, b) => b[1] - a[1]).slice(0, C.levyPick).map(([type, k]) => ({ type, n: k }));
}
export function traded(city) {
  if (!city.market) return [];
  return Object.entries(city.market).map(([g, mk]) => ({ g, q: mk.last ? mk.last.bought + mk.last.imported : 0 })).filter((x) => x.q > 0).sort((a, b) => b.q - a.q).slice(0, C.levyPick);
}

// ---------------------------------------------------------------- the governor's actions
// ctx: { governor(city, pid) -> bool, ownTypes(city, pid) -> Set, news(title, text, kind), wk }
export function act(city, p, action, a, ctx) {
  const cb = ensure(city), m = city.m;
  if (!ctx.governor(city, p.id)) return { ok: false, msg: 'Only the owner of the Bank of Aurex sets policy.' };
  if (action === 'cbRate') {
    const t = Math.round(clamp(Number(a.target), C.min, C.max) / C.step) * C.step;
    if (!Number.isFinite(t)) return { ok: false, msg: 'Pick a rate.' };
    if (m - cb.setM < C.quarter) return { ok: false, msg: `The board meets once a quarter. Next rate decision in ${C.quarter - (m - cb.setM)} month${C.quarter - (m - cb.setM) === 1 ? '' : 's'}.` };
    if (t === cb.target) return { ok: false, msg: `The target is already ${t}%.` };
    cb.setM = m; cb.pending = { ...(cb.pending || {}), wk: city.wk + 1, target: t };
    ctx.news(`Bank of Aurex to ${t > cb.target ? 'raise' : 'cut'} the bank rate`, `From next week the national bank aims for ${t}% (now ${cb.rate}%). The rate moves at most ${C.moveMax} points a month.`, t > cb.target ? 'bad' : 'good');
    return { ok: true, msg: `Announced: the target becomes ${t}% next week.` };
  }
  if (action === 'cbLevy') {
    if (m - cb.levyM < C.quarter) return { ok: false, msg: `Levies change once a quarter. Next change in ${C.quarter - (m - cb.levyM)} month${C.quarter - (m - cb.levyM) === 1 ? '' : 's'}.` };
    const sp = Math.round(clamp(Number(a.sp) || 0, 0, C.levyMax)), gp = Math.round(clamp(Number(a.gp) || 0, 0, C.levyMax));
    const sector = sp ? a.sector : null, supply = gp ? a.supply : null;
    if (sector && !crowded(city).some((x) => x.type === sector)) return { ok: false, msg: 'Levies only go on one of the most crowded sectors.' };
    if (sector && ctx.ownTypes(city, p.id).has(sector)) return { ok: false, msg: 'You cannot put a levy on a sector you are in yourself.' };
    if (supply && !traded(city).some((x) => x.g === supply)) return { ok: false, msg: 'Levies only go on one of the most traded supplies.' };
    const next = { sector, sp: sector ? sp : 0, supply, gp: supply ? gp : 0 }, cur = cb.levy;
    if (next.sector === cur.sector && next.sp === cur.sp && next.supply === cur.supply && next.gp === cur.gp) return { ok: false, msg: 'Nothing changes.' };
    cb.levyM = m; cb.pending = { ...(cb.pending || {}), wk: city.wk + 1, levy: next };
    const words = [next.sector ? `${next.sp}% on ${TYPES[next.sector].name} income` : null, next.supply ? `${next.gp}% on ${GOODS[next.supply].name.toLowerCase()}` : null].filter(Boolean);
    ctx.news(words.length ? 'Bank of Aurex announces new levies' : 'Bank of Aurex scraps its levies', words.length ? `From next week: ${words.join(' and ')}. The money goes to the city treasury.` : 'From next week no sector or supply pays a levy.', words.length ? 'bad' : 'good');
    return { ok: true, msg: 'Announced. The levies apply from next week.' };
  }
  return null;
}

// ---------------------------------------------------------------- the clock
// weekly: announced changes take effect
export function weekStep(city) {
  const cb = city.cb; if (!cb || !cb.pending || city.wk < cb.pending.wk) return;
  if (cb.pending.target != null) cb.target = cb.pending.target;
  if (cb.pending.levy) cb.levy = cb.pending.levy;
  cb.pending = null;
}
// monthly: the rate moves towards the target, prices follow, the autopilot and the ministry keep it in bounds
// ctx: { rand, activeGovernor() -> bool, owned() -> bool, news(title, text, kind), collected (M levied this month) }
export function monthStep(city, m, ctx) {
  const cb = ensure(city);
  if (ctx.owned() && !ctx.activeGovernor()) { cb.target = C.neutral; cb.levy = { sector: null, sp: 0, supply: null, gp: 0 }; cb.pending = null; }
  const d = clamp(cb.target - cb.rate, -C.moveMax, C.moveMax);
  if (d) cb.rate = r2(cb.rate + d);
  const [lo, hi] = C.calm;
  if (cb.rate < lo) cb.px += C.pxMove * (lo - cb.rate) / (lo - C.min);
  else if (cb.rate > hi) cb.px -= C.pxMove * (cb.rate - hi) / (C.max - hi);
  else cb.px += (1 - cb.px) * 0.1;
  cb.px = Math.round(clamp(cb.px, C.px[0], C.px[1]) * 1e4) / 1e4;
  const out = cb.rate < C.extreme[0] || cb.rate > C.extreme[1];
  cb.extremeSince = out ? (cb.extremeSince ?? m) : null;
  if (out && m - cb.extremeSince >= C.extremeMonths && ctx.rand() < C.ministry) {
    cb.rate = cb.target = C.neutral; cb.pending = null; cb.setM = m; cb.extremeSince = null;
    ctx.news('Finance Ministry overrules the Bank of Aurex', `After a year at an extreme rate the ministry resets the bank rate to ${C.neutral}%. The governor can decide again next quarter.`, 'bad');
  }
  cb.collected = r2((cb.collected || 0) + (ctx.collected || 0));
  cb.hist.push([m, cb.rate]); if (cb.hist.length > 48) cb.hist.shift();
}
