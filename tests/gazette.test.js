// The Aurex Gazette as a company: ad desk, press releases, the front page and the administrator's house ad
import './standing.js';
import * as E from '../supabase/functions/_shared/engine.js';
import { PAPER, HOUSE_AD } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
const G = E.GZ;
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
E.addPlayer(city, 'ed', 'Thomas Editor', now); E.addPlayer(city, 'ad', 'Mikkel Advertiser', now);
const ED = city.players.ed, AD = city.players.ad; ED.cash = 500; AD.cash = 500;
const act = (pid, a, x) => E.apply(city, pid, a, x, now);

const paper = G.paper(city);
assert(paper && paper.type === 'newspaper' && paper.title === 'The Aurex Gazette' && paper.d === 'aurex', 'The Aurex Gazette is a company in Aurex City');
assert(E.listingPrice(paper) === 14, 'it costs 14 M');
assert(G.houseAd(city).head === HOUSE_AD.head, 'the default house ad is the Bergwald one');

// an ad before anyone owns the paper costs the normal price and pays nobody
const shop = city.listings.find((l) => l.type === 'vineyard' && !l.owner) || city.listings.find((l) => l.type === 'vineyard');
if (shop.owner) { shop.owner = null; shop.ops = null; }
assert(act('ad', 'buy', { lid: shop.id }).ok, 'advertiser buys a vineyard');
if (!shop.ops) { now += E.realMsPerMonth(city); act('ad', 'ping'); }
if (!shop.ops.depts.social) assert(act('ad', 'deptOpen', { lid: shop.id, dept: 'social' }).ok, 'open Marketing');
const base = E.ADS.cost(shop, 4, city);

if (paper.owner) { paper.owner = null; paper.ops = null; }
assert(act('ed', 'buy', { lid: paper.id }).ok, 'the editor buys the paper');
if (!paper.ops) { now += E.realMsPerMonth(city); act('ed', 'ping'); }
assert(!act('ad', 'gzSet', { rate: 2 }).ok, 'only the owner sets the ad price');
assert(act('ed', 'gzSet', { rate: 1.5 }).ok && city.gz.rate === 1.5, 'owner sets the ad price ×1.5');
assert(Math.abs(E.ADS.cost(shop, 4, city) - base * 1.5) < 1e-3, 'ads now cost 1.5× the normal price');

// 1. ad desk, live at once: the paper is paid
let e0 = ED.cash; let r = act('ad', 'adLaunch', { lid: shop.id, weeks: 4 }); assert(r.ok, 'ad launched: ' + r.msg);
let ad = city.ads[city.ads.length - 1];
assert(Math.abs(ED.cash - e0 - ad.cost) < 1e-6 && city.gz.sold === 1, 'the paper earns the ad money');
act('ad', 'adStop', { lid: shop.id });

// by hand: the ad waits, a mail asks the owner, reject refunds
assert(act('ed', 'gzSet', { hand: true }).ok && city.gz.hand, 'owner approves ads by hand');
let a0 = AD.cash; e0 = ED.cash;
r = act('ad', 'adLaunch', { lid: shop.id, weeks: 2 }); assert(r.ok && /approve/i.test(r.msg), 'ad waits for approval: ' + r.msg);
assert(!E.ADS.running(city, shop.id) && G.waiting(city, shop.id), 'not live while waiting');
assert(!act('ad', 'adLaunch', { lid: shop.id, weeks: 2 }).ok, 'no second ad while one waits');
let m = ED.mail.find((x) => x.opts && x.opts.some((o) => o.gz && o.gz.k === 'ad'));
assert(m && m.ad, 'the owner gets a mail with the ad');
assert(ED.cash === e0, 'nothing paid yet');
r = act('ed', 'mailAnswer', { id: m.id, opt: 1 }); assert(r.ok, 'owner rejects: ' + r.msg);
assert(Math.abs(AD.cash - a0) < 1e-6 && !G.waiting(city, shop.id), 'the advertiser is refunded');
r = act('ad', 'adLaunch', { lid: shop.id, weeks: 2 }); ad = G.waiting(city, shop.id);
r = act('ed', 'gzReview', { id: ad.id, ok: true }); assert(r.ok, 'owner approves from the newsroom: ' + r.msg);
assert(E.ADS.running(city, shop.id) && Math.abs(ED.cash - e0 - ad.cost) < 1e-6, 'approved ad is live and paid');

// 2. press releases
assert(act('ed', 'gzSet', { press: 0.2 }).ok && G.pressFee(city) === 0.2, 'owner sets the press release price');
const rep0 = shop.ops.rep; a0 = AD.cash; e0 = ED.cash;
r = act('ad', 'gzPress', { lid: shop.id, kind: 'open' }); assert(r.ok, 'press release printed: ' + r.msg);
assert(Math.abs(a0 - AD.cash - 0.2) < 1e-6 && Math.abs(ED.cash - e0 - 0.2) < 1e-6, 'the fee goes to the paper');
assert(shop.ops.rep > rep0 && city.news[0].press && city.news[0].lid === shop.id, 'reputation up and the story is in the news');
assert(!act('ad', 'gzPress', { lid: shop.id, kind: 'hire' }).ok, 'one press release every 4 weeks');
assert(!act('ed', 'gzPress', { lid: shop.id, kind: 'hire' }).ok, 'only for your own companies');

// 3. the front page: a weekly mail with three stories about other tycoons' companies
Object.values(city.players).filter((x) => x.bot).slice(0, 3).forEach((b) => { const l = city.listings.find((x) => !x.owner && !E.BLD.idle(x) && !E.CB.isBank(x) && x.type !== 'newspaper'); l.owner = { k: 'p', id: b.id }; l.ops = E.OPS.newOps(l, true); }); // bots start empty-handed: three of them run a company
const wk = city.wk; let tries = 0;
while (!ED.mail.some((x) => x.subj === 'Pick this week\'s front page' && !x.done) && tries++ < 4) { now += E.realMsPerMonth(city) / 4; E.advance(city, now); }
m = ED.mail.find((x) => x.subj === 'Pick this week\'s front page' && !x.done);
assert(m && m.opts.length === PAPER.front.cands && city.wk > wk, 'the newsroom mails three front page stories');
assert(m.opts.every((o) => { const l = E.listing(city, o.gz.lid); return l && !(l.owner.k === 'p' && l.owner.id === 'ed'); }), 'never about the editor\'s own companies');
const x = E.listing(city, m.opts[0].gz.lid), xr = x.ops.rep;
r = act('ed', 'mailAnswer', { id: m.id, opt: 0 }); assert(r.ok, 'editor picks the front page: ' + r.msg);
assert(city.gz.front && city.gz.front.lid === x.id && city.news[0].front, 'the story leads the paper');
assert(x.ops.rep >= Math.min(100, xr + PAPER.front.rep) - 1, 'the company gains reputation');

// house ad: administrator only through setHouseAd (the game function checks the e-mail)
assert(!E.setHouseAd(city, { pic: 'nope', head: 'x' }).ok, 'house ad needs one of the pictures');
assert(E.setHouseAd(city, { pic: 'x-bergwald-gt', from: 'Bergwald', head: 'The GT is here', line: 'Test drive today' }).ok && G.houseAd(city).img === 'img/x-bergwald-gt.jpg', 'admin sets a new house ad');
assert(E.setHouseAd(city, { off: true }).ok && G.houseAd(city) === null, 'admin turns it off');
assert(E.setHouseAd(city, { reset: true }).ok && G.houseAd(city).head === HOUSE_AD.head, 'admin goes back to the default');
console.log('gazette ok');
