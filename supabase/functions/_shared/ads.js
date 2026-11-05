// Marketing: ad campaigns. A company with a Marketing department pays for a few weeks of ads on the
// city's websites (the in-game browser shows them). The ad shows the company picture or one piece the
// company makes or the owner holds, with a line of copy in the tone the player picks.
import { TYPES, SIZES, AD, AD_NOUN, AD_CATS, AD_COPY } from './content.js';
import * as LIFE from './life.js';
import { roleOn, selfLv, hasSp } from './ops.js';
import { rate as paperRate } from './gazette.js';

const r4 = (v) => Math.round(v * 1e4) / 1e4;
const rand = Math.random;
const uid = () => 'ad' + Math.random().toString(36).slice(2, 9);
const ok = (msg) => ({ ok: true, msg });
const err = (msg) => ({ ok: false, msg });

export const coName = (l) => l.title || TYPES[l.type].name;
// the price follows the rate The Aurex Gazette's owner sets for the ad desk (gazette.js)
export const cost = (l, weeks, city) => r4(AD.perWeek * SIZES[l.size].mult * weeks * (selfLv(l, 'social') >= 6 ? 0.9 : 1) * (city ? paperRate(city) : 1));
export const TONES = AD.tones.map(([k]) => k);
export const live = (city, g = city.g) => (city.ads || []).filter((a) => a.until > g + 1e-9 && !a.bot);
export const running = (city, lid, g) => live(city, g).find((a) => a.lid === lid);
export const strength = (l) => (l.ops && roleOn(l.ops.depts.social) ? AD.head : 1) * (l.ops && hasSp(l, 'star') ? 1.1 : 1);

// pieces this company can advertise: what it made itself (its cellar, or already in the owner's collection)
// and pieces from the player's own collection that fit its trade (cars for a dealership, wine for a restaurant…)
export function products(city, p, l) {
  const cats = AD_CATS[l.type] || [], out = [], seen = new Set();
  (l.cellar || []).forEach((x) => { if (seen.has(x.cid) || !LIFE.ITEM[x.cid]) return; seen.add(x.cid); out.push({ uid: x.uid, cid: x.cid, where: 'cellar' }); });
  ((p && p.life && p.life.items) || []).forEach((i) => { const c = LIFE.ITEM[i.cid]; if (c && (c.lid === l.id || cats.includes(c.cat))) out.push({ uid: i.uid, cid: i.cid, where: 'home' }); });
  return out;
}

// the lines a tone offers for this company or piece; the player can flip through them before launching
export function pool(l, tone, cid) {
  const t = TONES.includes(tone) ? tone : 'wink';
  if (cid) { const c = LIFE.ITEM[cid]; const own = c && AD_COPY.item[c.cat] && AD_COPY.item[c.cat][t]; if (own) return own; }
  return [...AD_COPY.co[t], ...((AD_COPY.type[l.type] || {})[t] || [])];
}
const fill = (s, v) => {
  if (v.item && v.year && String(v.item).includes(String(v.year))) s = s.replace(/(, | · | \()\{year\}\)?/g, ''); // made pieces carry the year in their name already
  const x = s.replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? v[k] : '')); return x.charAt(0).toUpperCase() + x.slice(1); };
export function copy(l, tone, n, cid, ownerName) {
  const lines = pool(l, tone, cid), i = ((Math.trunc(n) || 0) % lines.length + lines.length) % lines.length, c = cid ? LIFE.ITEM[cid] : null;
  const v = { co: coName(l), d: l.district, thing: AD_NOUN[l.type] || 'it', type: TYPES[l.type].name.toLowerCase(), item: c ? c.name : '', maker: c ? c.maker : '', year: c ? c.year : '', owner: ownerName || coName(l) };
  return { head: fill(lines[i][0], v), line: fill(lines[i][1], v), n: i };
}

// start a campaign; payer is whoever pays for the company (the player or the coop treasury)
export function launch(city, p, l, a, payer) {
  const o = l.ops; if (!o) return err('This company is not running yet.');
  if (!o.depts.social) return err('Open the Marketing department first.');
  if (running(city, l.id)) return err('A campaign is already running for this company.');
  const weeks = AD.weeks.includes(Number(a.weeks)) ? Number(a.weeks) : AD.weeks[1], tone = TONES.includes(a.tone) ? a.tone : 'wink';
  let kind = 'co', cid = null, pu = null;
  if (a.subj && a.subj !== 'co') {
    const pr = products(city, p, l).find((x) => x.uid === a.subj); if (!pr) return err('That piece is not yours to advertise.');
    kind = 'item'; cid = pr.cid; pu = pr.uid;
  }
  const c = cost(l, weeks, city); if (payer.cash < c) return err(`A ${weeks}-week campaign costs ${c} M.`);
  payer.cash -= c; o.cur.ads = r4((o.cur.ads || 0) + c);
  const t = copy(l, tone, a.n, cid, p.name);
  const ad = { id: uid(), lid: l.id, by: p.id, kind, cid, uid: pu, tone, head: t.head, line: t.line, weeks, from: city.g, until: r4(city.g + weeks / 48), cost: c, views: 0 };
  (city.ads = city.ads || []).push(ad);
  return ok(`Campaign live for ${weeks} weeks. Look for it on the city's websites.`);
}
export function stop(city, l) {
  const ad = running(city, l.id); if (!ad) return err('No campaign is running.');
  ad.until = city.g; city.ads = city.ads.filter((x) => x !== ad);
  return ok('Campaign stopped. The ad space is not refunded.');
}

// every week: running campaigns work, finished ones are reported and cleared
export function weekStep(city, g, ctx) {
  if (!city.ads || !city.ads.length) return;
  city.ads.forEach((ad) => {
    const l = city.listings.find((x) => x.id === ad.lid);
    if (!l || !l.owner || !l.ops || ad.bot || (l.owner.k === 'p' ? !!(city.players[l.owner.id] && city.players[l.owner.id].bot) : !!(city.holdings && city.holdings[l.owner.id] && city.holdings[l.owner.id].bot))) { ad.until = 0; ad.bot = true; return; } // only players advertise
    if (ad.from >= g || ad.until < g - 1e-9) return;
    const k = strength(l), o = l.ops;
    ad.views += Math.round((600 + rand() * 500) * SIZES[l.size].mult * k);
    if (ad.kind === 'co') { o.customers = Math.max(20, Math.min(400, o.customers * (1 + AD.cust * k))); o.rep = Math.max(0, Math.min(100, o.rep + AD.rep * k)); }
    else if (city.life && city.life.items[ad.cid]) { const st = city.life.items[ad.cid]; st.f = r4(st.f * (1 + AD.lift * k)); }
  });
  city.ads.filter((ad) => ad.until <= g + 1e-9).forEach((ad) => {
    const l = city.listings.find((x) => x.id === ad.lid); if (!l || !l.owner || ad.bot) return; // dropped campaigns and bots get no report
    const what = ad.kind === 'co' ? coName(l) : (LIFE.ITEM[ad.cid] || {}).name || 'your piece';
    ctx.notify(city, l, `Ad campaign for ${what} ended`, `${ad.weeks} weeks, about ${ad.views.toLocaleString('en-US')} views on the city's websites.${ad.kind === 'co' ? ' Customers and reputation grew every week it ran.' : ' The piece is worth a little more for the attention.'}`, 'info');
  });
  city.ads = city.ads.filter((ad) => ad.until > g + 1e-9);
}
