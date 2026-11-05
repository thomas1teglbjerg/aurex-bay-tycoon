// The Aurex Gazette as a company (PAPER in content.js). Its owner runs the city's newspaper as a service:
// 1. the ad desk: every Marketing campaign is booked through the paper at the owner's price, and the money goes to the paper;
//    the owner may approve ads by hand (the autopilot approves after a week; a rejected ad is refunded),
// 2. press releases: any tycoon pays the paper to print a short story about one of their companies,
// 3. the front page: once a week the owner picks one of three stories about other tycoons' companies.
// The house ad (one ad set by the administrator, never by players) also lives here: city.gz.house.
import { PAPER as P, HOUSE_AD, HOUSE_PICS, TYPES, AD_NOUN } from './content.js';

const r2 = (v) => Math.round(v * 100) / 100;
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const ok = (msg) => ({ ok: true, msg });
const err = (msg) => ({ ok: false, msg });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const coName = (l) => l.title || TYPES[l.type].name;

export { P };
export const ID = P.id;
export const isPaper = (l) => !!l && l.id === ID;
export const paper = (city) => city.listings.find((l) => l.id === ID);
export function ensure(city) {
  if (!city.gz) city.gz = { rate: 1, hand: false, press: P.pressStart, queue: [], earned: 0, sold: 0, pressN: 0, front: null };
  return city.gz;
}
// the paper only runs its desk when a tycoon owns it; otherwise ads cost the normal price and nobody is paid
const run = (city, ctx) => { const l = paper(city); return l && l.owner && ctx.owners(l).length ? l : null; };
export const rate = (city) => { const l = paper(city); return l && l.owner && city.gz ? city.gz.rate : 1; };
export const pressFee = (city) => { const l = paper(city); return l && l.owner && city.gz ? city.gz.press : P.pressStart; };
const sameOwner = (a, b) => !!(a && b && a.owner && b.owner && a.owner.k === b.owner.k && a.owner.id === b.owner.id);
function earn(city, l, v, ctx) { if (!(v > 0)) return; const gz = ensure(city); ctx.credit(l.owner, r4(v)); gz.earned = r4(gz.earned + v); if (l.ops) l.ops.cur.gz = r4((l.ops.cur.gz || 0) + v); }

function fill(s, l, ctx) {
  const v = { co: coName(l), d: l.district, thing: AD_NOUN[l.type] || 'business', type: TYPES[l.type].name.toLowerCase(), owner: ctx.ownerName(l) || coName(l) };
  const x = s.replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? v[k] : '')); return x.charAt(0).toUpperCase() + x.slice(1);
}

// ---------------------------------------------------------------- 1. the ad desk
// called right after ADS.launch put a campaign live: pay the paper, or hold the ad for the owner's approval
export function booked(city, ad, ctx) {
  const l = run(city, ctx), co = city.listings.find((x) => x.id === ad.lid); if (!l || !co) return null;
  const gz = ensure(city); gz.sold++;
  if (!gz.hand || sameOwner(l, co)) { earn(city, l, ad.cost, ctx); return null; }
  city.ads = (city.ads || []).filter((x) => x !== ad);
  ad.wait = true; gz.queue.push(ad);
  ctx.mail(l, { from: { n: 'Ad desk', r: coName(l) }, subj: `New ad from ${coName(co)}`, body: `${coName(co)} wants to run this ad for ${ad.weeks} weeks and pays ${ad.cost} M. Approve it and the money is yours; reject it and they get it back.`, kind: 'info', lid: l.id, due: r4(city.g + P.reviewWait), ad, opts: [{ l: 'Approve', d: `+${ad.cost} M for the paper`, safe: true, gz: { k: 'ad', id: ad.id, ok: true } }, { l: 'Reject', d: 'The advertiser is refunded', gz: { k: 'ad', id: ad.id, ok: false } }] });
  return 'The Aurex Gazette reviews new ads. Yours goes live once the paper approves it (within a week).';
}
export const waiting = (city, lid) => ((city.gz && city.gz.queue) || []).find((a) => a.lid === lid);
export function review(city, id, yes, ctx) {
  const gz = ensure(city), ad = gz.queue.find((a) => a.id === id); if (!ad) return err('This ad was already handled.');
  gz.queue = gz.queue.filter((a) => a !== ad);
  const co = city.listings.find((x) => x.id === ad.lid), l = paper(city);
  if (!co || !co.owner) return ok('The advertiser is gone.');
  if (!yes) { ctx.credit(co.owner, ad.cost); ctx.notify(co, `The Aurex Gazette turned down your ad`, `${ad.cost} M is refunded.`, 'bad'); return ok(`${coName(co)} gets ${ad.cost} M back.`); }
  delete ad.wait; ad.from = city.g; ad.until = r4(city.g + ad.weeks / 48);
  (city.ads = city.ads || []).push(ad);
  if (l && l.owner) earn(city, l, ad.cost, ctx);
  ctx.notify(co, `Your ad is live in The Aurex Gazette`, `${ad.weeks} weeks on the city's websites.`, 'good');
  return ok(`+${ad.cost} M for the paper.`);
}

// ---------------------------------------------------------------- 2. press releases
export const pressReady = (city, l) => !(l.ops && l.ops.pressG != null && city.g < l.ops.pressG + P.pressWeeks / 48 - 1e-9);
export function press(city, p, l, kind, payer, ctx) {
  if (!l.ops) return err('This company is not running yet.');
  if (!P.PRESS[kind]) return err('Pick what the story is about.');
  if (!pressReady(city, l)) return err('One press release every 4 weeks per company.');
  const fee = pressFee(city); if (payer.cash < fee) return err(`A press release costs ${fee} M.`);
  payer.cash = r4(payer.cash - fee);
  const t = P.PRESS[kind], o = l.ops;
  o.pressG = city.g; o.rep = clamp(o.rep + P.pressRep, 0, 100); o.customers = clamp(o.customers * (1 + P.pressCust), 20, 400);
  ctx.news(fill(t[0], l, ctx), fill(t[1], l, ctx), 'good', { press: true, lid: l.id });
  const pl = run(city, ctx); if (pl) { earn(city, pl, fee, ctx); ensure(city).pressN++; }
  return ok(`Printed in The Aurex Gazette. Reputation +${P.pressRep}, more customers this month.`);
}

// ---------------------------------------------------------------- 3. the front page of the week
export function weekStep(city, ctx) {
  const gz = ensure(city);
  // ads nobody answered (the paper changed hands, or approval was switched off) go live after two weeks
  gz.queue.filter((a) => !gz.hand || !run(city, ctx) || a.from + 2 / 48 <= city.g + 1e-9).map((a) => a.id).forEach((id) => review(city, id, true, ctx));
  gz.queue = gz.queue.filter((a) => { const co = city.listings.find((x) => x.id === a.lid); return !!(co && co.owner); });
  const l = run(city, ctx); if (!l || ctx.owners(l).every((p) => ctx.inactive(p))) return;
  const pool = city.listings.filter((x) => x.owner && x.ops && !isPaper(x) && !sameOwner(x, l) && !ctx.isAdmin(x));
  if (!pool.length) return;
  const pick = [], take = (arr) => { while (arr.length && pick.length < P.front.cands) { const i = Math.floor(ctx.rand() * arr.length); pick.push(arr.splice(i, 1)[0]); } };
  take(pool.filter((x) => ctx.human(x))); take(pool.filter((x) => !pick.includes(x)));
  const used = new Set();
  const opts = pick.map((x) => { let i; do i = Math.floor(ctx.rand() * P.FRONT.length); while (used.has(i) && used.size < P.FRONT.length); used.add(i); const t = P.FRONT[i];
    return { l: fill(t[0], x, ctx), d: `${coName(x)}, ${x.district}${ctx.ownerName(x) ? ` · ${ctx.ownerName(x)}` : ''}`, gz: { k: 'front', lid: x.id, t: fill(t[0], x, ctx), x: fill(t[1], x, ctx) } }; });
  if (opts.length) opts[0].safe = true;
  ctx.mail(l, { from: { n: 'The newsroom', r: coName(l) }, subj: 'Pick this week\'s front page', body: 'Three stories are ready. The one you pick leads the paper this week, and that company wins customers and reputation. If you do not pick, the editor does it within a week.', kind: 'info', lid: l.id, due: r4(city.g + 0.9 / 48), opts });
}
export function front(city, o, ctx) {
  const x = city.listings.find((y) => y.id === o.lid), l = paper(city);
  if (!x || !x.owner || !x.ops) return ok('That company has closed. No front page this week.');
  x.ops.rep = clamp(x.ops.rep + P.front.rep, 0, 100); x.ops.customers = clamp(x.ops.customers * (1 + P.front.cust), 20, 400);
  if (l && l.ops) l.ops.rep = clamp(l.ops.rep + P.front.paperRep, 0, 100);
  ensure(city).front = { lid: x.id, g: city.g, t: o.t, x: o.x };
  ctx.news(o.t, o.x, 'good', { front: true, lid: x.id });
  ctx.notify(x, `${coName(x)} made the front page`, `The Aurex Gazette leads with "${o.t}". Customers and reputation are up.`, 'good');
  return ok('It leads the paper this week.');
}
// a mail answer: an ad review or the front page pick
export function answer(city, o, ctx) { return o.k === 'ad' ? review(city, o.id, !!o.ok, ctx) : o.k === 'front' ? front(city, o, ctx) : err('Unknown answer.'); }

// ---------------------------------------------------------------- the owner's settings
export function set(city, a) {
  const gz = ensure(city), bits = [];
  if (a.rate != null) { const v = Math.round(clamp(Number(a.rate) || 1, P.rate[0], P.rate[1]) / P.rateStep) * P.rateStep; gz.rate = r2(v); bits.push(`Ad price ×${gz.rate}`); }
  if (a.press != null) { const v = Math.round(clamp(Number(a.press) || P.pressStart, P.press[0], P.press[1]) / P.pressStep) * P.pressStep; gz.press = r2(v); bits.push(`Press release ${gz.press} M`); }
  if (a.hand != null) { gz.hand = !!a.hand; bits.push(gz.hand ? 'You approve new ads' : 'New ads go live at once'); }
  return ok(bits.join(' · ') || 'Nothing changed.');
}

// ---------------------------------------------------------------- the house ad (administrator only; checked by the game function)
export const houseAd = (city) => { const h = city && city.gz && city.gz.house; return h === false ? null : h || HOUSE_AD; };
export function setHouse(city, a) {
  const gz = ensure(city);
  if (a.off) { gz.house = false; return ok('The house ad is off.'); }
  if (a.reset) { delete gz.house; return ok('The house ad is back to the default.'); }
  const pic = HOUSE_PICS.find(([k]) => k === a.pic); if (!pic) return err('Pick one of the pictures.');
  const t = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const head = t(a.head, 70), line = t(a.line, 90), from = t(a.from, 40) || 'The Aurex Gazette';
  if (!head) return err('Write a headline.');
  gz.house = { img: `img/${pic[0]}.jpg`, pos: 'center', from, head, line };
  return ok('House ad saved. Everyone sees it now.');
}
