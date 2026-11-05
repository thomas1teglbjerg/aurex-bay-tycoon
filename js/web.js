// The in-game web browser: websites of Aurex Bay you browse like a real browser.
// Auction house, dealers, property listings and the city newspaper all live here.
import * as E from '../supabase/functions/_shared/engine.js';
import { HOMES, ROOMS, LIFESTYLES, SALARIES, TAX, LIFE as LC, RARITY, PRESTIGE_TIERS, COLLECT_CATS, COLLECTIBLES, SETS, STOCKS } from '../supabase/functions/_shared/content.js';
import { city, me, meId, esc, M, P, lineChart, shortDate, dateLabel, msUntilMonth, dur, coImg } from './util.js';
import { money, ricon, homeBg, bidBase, standing } from './life.js';
import { apexSite } from './team.js';
import { carrierSite } from './freight.js';
import { CARRIERS, CENTRAL, CENTRAL_BANK, WORLD, TYPES, GOODS, HOUSE_AD } from '../supabase/functions/_shared/content.js';

const L = E.LIFE;
export const HOME_URL = 'baylink.ab';

// ---------------------------------------------------------------- the sites
const DEALERS = {
  art: { host: 'kestrelvey.gallery', name: 'Kestrel & Vey', sub: 'Modern and post-war art · Ironport', logo: ['K&V', '#111', '#fff'], hero: 'img/h1-art.jpg', theme: 'gal', slogan: 'Art that holds its value',
    blurb: 'Museum-grade works, hand-picked for discerning collectors. Viewings by appointment, or buy online today.', buy: 'Acquire', private: 'Works in private collections' },
  wine: { host: 'cellardoor.wine', name: 'Cellar Door', sub: 'Fine wine merchants · Harbor Row', logo: ['CD', '#5a1424', '#f3e3c3'], hero: 'img/h1-wine.jpg', theme: 'wine', slogan: 'Laid down for the years ahead',
    blurb: 'Cases from the great châteaux, stored at perfect temperature until they reach your cellar.', buy: 'Add case', private: 'In other cellars' },
  watch: { host: 'hourandhand.ab', name: 'Hour & Hand', sub: 'Watches of distinction · Aurex City', logo: ['H&H', '#0f1e3a', '#d9b45a'], hero: 'img/h1-watch.jpg', theme: 'watch', slogan: 'Time, beautifully kept',
    blurb: 'Certified pre-owned and limited pieces. Every watch is serviced, authenticated and ready to wear.', buy: 'Reserve', private: 'On other wrists' },
  car: { host: 'coastlineclassics.ab', name: 'Coastline Classics', sub: 'Classic and collector cars · Sunset Strand', logo: ['CC', '#e0662b', '#fff7ea'], hero: 'img/x-c4.jpg', theme: 'cars', slogan: 'Built for the coast road',
    blurb: 'Matching numbers, full histories and a test drive along the coast road. Garage required.', buy: 'Buy this car', private: 'In other garages' }
};
export const SITES = {
  'baylink.ab': { name: 'Baylink', tag: 'Search Aurex Bay', logo: ['b', '#2f6fb0', '#fff'] },
  'aurexauctions.ab': { name: 'Aurex & Co.', tag: 'Auctioneers since 1889', logo: ['A&C', '#0d0b09', '#e8d6a8'] },
  ...Object.fromEntries(Object.entries(DEALERS).map(([cat, d]) => [d.host, { name: d.name, tag: d.sub, logo: d.logo, cat }])),
  'apextalent.ab': { name: 'Apex Talent', tag: 'Executive search and transfers', logo: ['AT', '#111827', '#f5c84c'] },
  ...Object.fromEntries(CARRIERS.map((c) => [c.host, { name: c.name, tag: c.tag, logo: [c.short.split(' ').map((w) => w[0]).join(''), c.color, '#fff'], carrier: c.id }])),
  'bankofaurex.ab': { name: 'Bank of Aurex', tag: 'The national bank · business loans and the bank rate', logo: ['BA', '#14110d', '#d9b45a'] },
  'harbortrust.ab': { name: 'Harbor Trust', tag: 'Private banking · your personal account', logo: ['HT', '#0b3d4f', '#7fe0c9'] },
  'bayhomes.ab': { name: 'BayHomes', tag: 'Find your place in Aurex Bay', logo: ['BH', '#0e8a7e', '#fff'] },
  'aurexgazette.ab': { name: 'The Aurex Gazette', tag: 'News, markets and society', logo: ['G', '#fff', '#111'] }
};
const favicon = (host, s = 22) => { const [t, bg, fg] = SITES[host].logo; return `<span class="fav" style="width:${s}px;height:${s}px;background:${bg};color:${fg};font-size:${Math.round(s * (t.length > 2 ? 0.34 : 0.48))}px">${esc(t)}</span>`; };
const go = (u, inner, cls = '') => `<a href="#" class="${cls}" data-a="webGo" data-u="${esc(u)}">${inner}</a>`;
const CARD_FALLBACK = { art: 'img/h1-art.jpg', wine: 'img/h1-wine.jpg', watch: 'img/h1-watch.jpg', car: 'img/ph-car.svg' };
export function itemBg(cid) {
  const c = L.ITEM[cid];
  if (c.pic) return `background-image:url(img/${c.pic}.jpg);background-size:cover;background-position:58% center`;
  return c.img ? `background-image:url(img/x-${cid}.jpg);background-position:${c.img};background-size:cover` : `background-image:${L.isMade(c) ? '' : `url(img/x-${cid}.jpg), `}linear-gradient(135deg, rgba(40,30,20,0.35), rgba(20,14,8,0.55)), url(${CARD_FALLBACK[c.cat]});background-size:cover;background-position:center`;
}

// ---------------------------------------------------------------- ads: Marketing campaigns bought by companies in the city
const ADS = E.ADS;
const DEALER_HOST = Object.fromEntries(Object.entries(DEALERS).map(([cat, d]) => [cat, d.host]));
// where an ad leads: the company card, or the piece at the auction house or at its dealer
function adTarget(c, ad) {
  if (ad.kind === 'co') return `data-a="adCo" data-lid="${esc(ad.lid)}"`;
  const lot = c.life && c.life.lots.find((x) => x.cid === ad.cid && (!ad.uid || x.uid === ad.uid));
  const it = L.ITEM[ad.cid], u = lot ? `aurexauctions.ab/lot/${lot.id}` : it ? `${DEALER_HOST[it.cat]}/item/${ad.cid}` : HOME_URL;
  return `data-a="webGo" data-u="${esc(u)}"`;
}
export function adHTML(ad, cls = '', preview = false) {
  const c = city(), l = E.listing(c, ad.lid); if (!l) return '';
  const it = ad.kind === 'item' ? L.ITEM[ad.cid] : null; if (ad.kind === 'item' && !it) return '';
  const img = it ? itemBg(ad.cid) : `background-image:url(${coImg(l)})`;
  const cta = it ? (c.life.lots.some((x) => x.cid === ad.cid) ? 'Bid at Aurex & Co. ›' : 'See the piece ›') : `Visit ${ADS.coName(l)} ›`;
  const inner = `<span class="adv-img" style="${img}"></span><span class="adv-t"><small>Advertisement · ${esc(ADS.coName(l))}</small><b>${esc(ad.head)}</b><span>${esc(ad.line)}</span><em>${esc(cta)}</em></span>`;
  return preview ? `<div class="adv ${cls} tone-${ad.tone}">${inner}</div>` : `<a href="#" class="adv ${cls} tone-${ad.tone}" ${adTarget(c, ad)}>${inner}</a>`;
}
// one ad for a slot on a page; slots on the same page show different campaigns, and they rotate week by week
function adSlot(slot, cls = '') {
  const c = city(), list = ADS.live(c).filter((a) => E.listing(c, a.lid)).sort((a, b) => (a.bot ? 1 : 0) - (b.bot ? 1 : 0) || a.from - b.from);
  if (!list.length) return '';
  return adHTML(list[(c.wk + slot) % list.length], cls);
}

// ---------------------------------------------------------------- browser chrome
export function parseUrl(u) { const s = String(u || HOME_URL).trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, ''); const [host, ...rest] = s.split('/'); return { host: host.toLowerCase(), path: rest, url: s || HOME_URL }; }
export function webHTML(st) {
  const u = parseUrl(st.url), site = SITES[u.host];
  const page = !site ? notFound(u) : u.host === 'baylink.ab' ? portal(st) : u.host === 'aurexauctions.ab' ? auctions(u, st) : SITES[u.host].cat ? dealer(SITES[u.host].cat, u) : u.host === 'bayhomes.ab' ? homes(u, st) : u.host === 'harbortrust.ab' ? bank(u) : u.host === 'bankofaurex.ab' ? boa(u) : u.host === 'apextalent.ab' ? apexSite(u, go) : SITES[u.host].carrier ? carrierSite(u.host, u, go) : gazette();
  const bm = Object.keys(SITES).filter((h) => h !== 'baylink.ab').map((h) => `<button data-a="webGo" data-u="${h}" class="${u.host === h ? 'on' : ''}">${favicon(h, 18)}<span>${esc(SITES[h].name.replace(/^The /, ''))}</span></button>`).join('');
  return `<div class="wwin"><div class="wchrome">
    <div class="wbar"><button data-a="webBack" aria-label="Back" ${st.back.length ? '' : 'disabled'}>‹</button><button data-a="webFwd" aria-label="Forward" ${st.fwd.length ? '' : 'disabled'}>›</button><button data-a="webHome" aria-label="Home" class="hm"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg></button>
      <form class="waddr" data-form="addr"><span class="lock" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span><input name="u" value="${esc(u.url)}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Address"></form>
      <button data-a="webClose" aria-label="Close browser" class="x">✕</button></div>
    <div class="wbm">${bm}</div></div>
    <div class="wpage" id="wpage"><div class="site s-${site ? (SITES[u.host].cat ? DEALERS[SITES[u.host].cat].theme : u.host.split('.')[0]) : 'nf'}">${page}${site && u.host !== 'baylink.ab' ? `<div class="adrow">${adSlot(Object.keys(SITES).indexOf(u.host) + u.path.length, 'wide')}</div>` : ''}</div></div></div>`;
}
function notFound(u) {
  return `<div class="nf-in"><h1>This site can’t be reached</h1><p><b>${esc(u.host)}</b> does not exist in Aurex Bay.</p>${go(HOME_URL, 'Search on Baylink', 'nfbtn')}</div>`;
}

// ---------------------------------------------------------------- Baylink portal
function portal(st) {
  const c = city(), q = (st.q || '').toLowerCase().trim();
  const list = Object.entries(SITES).filter(([h]) => h !== 'baylink.ab').filter(([h, s]) => !q || (h + s.name + s.tag).toLowerCase().includes(q));
  const movers = STOCKS.map((s) => { const h = c.stocks[s.id].h; return { s, p: c.stocks[s.id].p, ch: h.length > 1 ? (h[h.length - 1] / h[h.length - 2] - 1) * 100 : 0 }; }).sort((a, b) => Math.abs(b.ch) - Math.abs(a.ch)).slice(0, 5);
  const temp = 14 + Math.round(8 * Math.sin((c.m % 12 - 3) / 12 * Math.PI * 2)), sky = ['Sunny', 'Light clouds', 'Sea breeze', 'Clear skies'][c.wk % 4];
  const news = c.news.slice(0, 4);
  return `<div class="bl-top"><div class="bl-logo"><span>b</span><span>a</span><span>y</span><span>l</span><span>i</span><span>n</span><span>k</span></div>
    <form data-form="search" class="bl-search"><input name="q" value="${esc(st.q || '')}" placeholder="Search sites, art, wine, homes…" aria-label="Search"><button>Search</button></form>
    <div class="bl-meta"><span>Aurex Bay ${temp}° · ${sky}</span><span>${esc(dateLabel(c.m))}</span></div></div>
    <div class="bl-grid">${list.map(([h, s]) => `<a href="#" class="bl-tile" data-a="webGo" data-u="${h}">${favicon(h, 44)}<b>${esc(s.name)}</b><span>${esc(s.tag)}</span><em>${esc(h)}</em></a>`).join('') || '<p class="bl-none">No sites match your search.</p>'}</div>
    <div class="bl-cols"><section><h3>Today in Aurex Bay</h3>${news.map((n) => go('aurexgazette.ab', `<b>${esc(n.title)}</b><span>${esc(n.text || '')}</span>`, 'bl-news')).join('')}</section>
    <section><h3>Market movers this week</h3>${movers.map((x) => `<div class="bl-mv"><span>${esc(x.s.name)}</span><b>${M(x.p)}</b><em class="${x.ch >= 0 ? 'up' : 'down'}">${P(x.ch)}</em></div>`).join('')}</section></div>
    ${adSlot(0, 'hero') || `<a href="#" class="bl-ad" data-a="webGo" data-u="coastlineclassics.ab/item/c4" style="background-image:linear-gradient(90deg, rgba(20,12,4,0.85), rgba(20,12,4,0.1)), url(img/x-c4.jpg)"><small>Advertisement</small><b>The Vellano V9. Built for the coast road.</b><span>Now at Coastline Classics ›</span></a>`}`;
}

// ---------------------------------------------------------------- Aurex & Co. auctions
function auctions(u, st) {
  const c = city(), p = me(), tier = L.prestige(c, p).tier;
  const nav = `<div class="ac-head"><div class="ac-logo">AUREX <i>&amp;</i> CO.</div><span>Auctioneers since 1889</span><nav>${go('aurexauctions.ab', 'Current sale', u.path[0] ? '' : 'on')}${go('aurexauctions.ab/results', 'Results', u.path[0] === 'results' ? 'on' : '')}${go('aurexauctions.ab/consign', 'Sell with us', u.path[0] === 'consign' ? 'on' : '')}</nav></div>`;
  const lots = c.life.lots.slice().sort((a, b) => a.endM - b.endM || b.est - a.est);
  const num = (l) => 100 + c.life.lots.indexOf(l) + (c.m % 50) * 7;
  if (u.path[0] === 'lot') {
    const l = c.life.lots.find((x) => x.id === u.path[1]);
    if (!l) return nav + `<div class="ac-body"><h2>This lot has closed</h2><p>See the ${go('aurexauctions.ab/results', 'latest results')}.</p></div>`;
    const it = L.ITEM[l.cid], h = c.life.items[l.cid].h, amt = st.amt || bidBase(l) * 1.1, locked = tier < l.tier, seller = l.seller ? c.players[l.seller] : null;
    return nav + `<div class="ac-body ac-lot"><div class="ac-img" style="${itemBg(l.cid)}"></div><div class="ac-info">
      <span class="ac-kicker">Lot ${num(l)} · ${esc(COLLECT_CATS[it.cat].name)} · ${it.rarity}</span><h1>${esc(it.name)}</h1><p class="ac-maker">${esc(it.maker)}, ${it.year} · ${esc(it.medium)}</p>
      <p>Estimate <b>${money(l.est * 0.9)} – ${money(l.est * 1.2)}</b> · reserve ${money(l.est * LC.reserve)}</p>${standing(l)}
      <p class="ac-small">Closes in ${dur(msUntilMonth(l.endM))} · ${it.ed === 1 ? 'One of a kind' : `${L.ownedCount(c, l.cid)} of ${it.ed} already in collections`}${seller ? ` · consigned by ${esc(seller.id === meId() ? 'you' : seller.name)}` : ''}</p>
      ${locked ? `<div class="ac-note">Registration for this lot is open to ${esc(PRESTIGE_TIERS[l.tier].name)} collectors and above.</div>` : l.seller === meId() ? '<div class="ac-note">This is your lot.</div>' : `<div class="ac-bid"><div class="stepper"><button data-a="webAmt" data-lot="${l.id}" data-v="-1">−</button><output>${money(amt)}</output><button data-a="webAmt" data-lot="${l.id}" data-v="1">+</button></div><button class="ac-btn" data-a="bid" data-lot="${l.id}" data-v="${amt.toFixed(4)}">Place bid</button></div>
      <p class="ac-small">Your maximum stays secret. With the ${Math.round(LC.auctionPremium * 100)}% buyer's premium you pay up to ${money(amt * (1 + LC.auctionPremium))}. Account: ${money(p.life.wallet)}.${l.bids[meId()] != null ? ` <a href="#" data-a="bidCancel" data-lot="${l.id}">Withdraw my bid</a>` : ''}</p>`}
      <h3>Price history</h3>${lineChart([{ v: h, c: '#9a7b3c', fill: true, w: 2.2 }], h.map((_, i) => shortDate(c.m - h.length + 1 + i)), { fmt: (v) => money(v), label: 'Value history', h: 150 })}</div></div>`;
  }
  if (u.path[0] === 'results') {
    const sold = c.life.sold || [];
    return nav + `<div class="ac-body"><h2>Recent results</h2>${sold.length ? `<div class="ac-res">${sold.map((s) => { const it = L.ITEM[s.cid], b = c.players[s.buyer]; return `<div><span class="ac-thumb" style="${itemBg(s.cid)}"></span><div><b>${esc(it.name)}</b><span>${esc(it.maker)} · ${esc(shortDate(s.m))}</span></div><div class="r"><b>${money(s.price)}</b><span>${b ? esc(b.id === meId() ? 'You' : b.name) : ''}</span></div></div>`; }).join('')}</div>` : '<p>The first hammer falls at the end of this month.</p>'}</div>`;
  }
  if (u.path[0] === 'consign') {
    const mine = p.life.items.filter((i) => !i.lent);
    return nav + `<div class="ac-body"><h2>Sell with Aurex &amp; Co.</h2><p>Consign a piece and it goes under the hammer at the end of the month. Our fee is ${Math.round(LC.sellerFee * 100)}% of the hammer price. Pieces that miss the reserve return to you.</p>
      ${mine.length ? `<div class="ac-res">${mine.map((i) => { const it = L.ITEM[i.cid]; return `<div><span class="ac-thumb" style="${itemBg(i.cid)}"></span><div><b>${esc(it.name)}</b><span>Estimate ${money(L.instValue(c, p, i))}</span></div><div class="r">${i.lot ? `<button class="ac-btn ghost" data-a="itemWithdraw" data-uid="${i.uid}">Withdraw</button>` : `<button class="ac-btn" data-a="itemSell" data-uid="${i.uid}" data-v="auction">Consign</button>`}</div></div>`; }).join('')}</div>` : '<p>Your collection is empty.</p>'}</div>`;
  }
  return nav + `<div class="ac-hero"><span>The ${esc(E.monthName(c.m))} Sale</span><h1>Fine Art, Wine, Watches &amp; Motor Cars</h1><p>${lots.length} lots · bidding closes monthly · ${myBidsCount(c)} of your bids active</p></div>
    <div class="ac-grid">${lots.map((l) => { const it = L.ITEM[l.cid], locked = tier < l.tier; return `<a href="#" class="ac-card" data-a="webGo" data-u="aurexauctions.ab/lot/${l.id}"><span class="ac-img sm" style="${itemBg(l.cid)}">${locked ? `<i>${esc(PRESTIGE_TIERS[l.tier].name)}+</i>` : ''}</span><span class="ac-kicker">Lot ${num(l)} · ${it.rarity}</span><b>${esc(it.name)}</b><span>${esc(it.maker)}, ${it.year}</span><span>Est. ${money(l.est * 0.9)} – ${money(l.est * 1.2)}</span>${standing(l)}<span class="ac-small">Closes in ${dur(msUntilMonth(l.endM))}</span></a>`; }).join('')}</div>`;
}
const myBidsCount = (c) => c.life.lots.filter((l) => l.bids[meId()] != null).length;

// ---------------------------------------------------------------- dealers
function dealer(cat, u) {
  const c = city(), p = me(), d = DEALERS[cat], R = ROOMS[cat], free = L.roomFree(p, cat);
  const head = `<div class="dl-head">${go(d.host, `<b>${esc(d.name)}</b>`, 'dl-logo')}<nav>${go(d.host, 'Shop', u.path[0] ? '' : 'on')}${go(d.host + '/collectors', 'Collectors', u.path[0] === 'collectors' ? 'on' : '')}${go(d.host + '/sell', 'Sell to us', u.path[0] === 'sell' ? 'on' : '')}</nav></div>`;
  const roomNote = free > 0 ? `<div class="dl-note ok">You have ${free} free ${R.unit} at home.</div>` : `<div class="dl-note">${p.life.homes.length ? `No free ${R.unit} at home. Install or expand your ${R.name.toLowerCase()} first.` : 'Buy a home with the right room before you start collecting.'}</div>`;
  if (u.path[0] === 'item') {
    const cid = u.path[1], it = L.ITEM[cid]; if (!it || it.cat !== cat) return head + '<div class="dl-body"><h2>Not found</h2></div>';
    const inStock = c.life.dealer.includes(cid), price = L.itemValue(c, cid) * LC.dealerMarkup, h = c.life.items[cid].h, w = L.wineWindow(it, c.m / 12);
    const owner = Object.values(c.players).find((x) => x.id !== meId() && !x.admin && x.life && x.life.items.some((i) => i.cid === cid));
    return head + `<div class="dl-body dl-item"><div class="dl-img" style="${itemBg(cid)}"></div><div class="dl-info"><span class="dl-kick">${it.rarity} · ${esc(it.medium)}</span><h1>${esc(it.name)}</h1><p class="dl-maker">${esc(it.maker)} · ${it.year}</p>
      <div class="dl-price">${inStock ? money(price) : 'Not in stock'}</div>
      <ul class="dl-facts"><li>${it.ed === 1 ? 'One of a kind' : `${L.ownedCount(c, cid)} of ${it.ed} in Aurex Bay collections`}</li>${w ? `<li>${esc(w)}</li>` : ''}${it.set ? `<li>Part of the ${esc(SETS[it.set].name)} set (+${Math.round(SETS[it.set].bonus * 100)}% when complete)</li>` : ''}<li>Market value ${money(L.itemValue(c, cid))}</li></ul>
      ${inStock ? `<button class="dl-btn" data-a="itemBuy" data-cid="${cid}" ${p.life.wallet < price || free < 1 ? 'disabled' : ''}>${esc(d.buy)} · ${money(price)}</button>${p.life.wallet < price ? `<p class="dl-small">Your account has ${money(p.life.wallet)}.</p>` : ''}${roomNote}` : owner ? `<button class="dl-btn ghost" data-a="tradeOpen" data-to="${owner.id}">Owned by ${esc(owner.name)} · make an offer</button>` : ''}
      <h3>Value history</h3>${lineChart([{ v: h, c: 'currentColor', fill: true, w: 2.2 }], h.map((_, i) => shortDate(c.m - h.length + 1 + i)), { fmt: (v) => money(v), label: 'Value history', h: 140 })}</div></div>`;
  }
  if (u.path[0] === 'collectors') {
    const owned = Object.values(c.players).filter((x) => x.id !== meId() && !x.admin && x.life).flatMap((x) => x.life.items.filter((i) => L.ITEM[i.cid].cat === cat).map((i) => ({ x, i })));
    return head + `<div class="dl-body"><h2>${esc(d.private)}</h2><p>Pieces that are not for sale. Owners sometimes accept a good offer.</p><div class="dl-list">${owned.map(({ x, i }) => `<div class="dl-row"><span class="dl-thumb" style="${itemBg(i.cid)}"></span><div><b>${esc(L.ITEM[i.cid].name)}</b><span>${esc(x.name)} · worth ${money(L.instValue(c, x, i))}</span></div><button class="dl-btn sm ghost" data-a="tradeOpen" data-to="${x.id}">Make an offer</button></div>`).join('') || '<p>Nobody else owns pieces like these yet.</p>'}</div></div>`;
  }
  if (u.path[0] === 'sell') {
    const mine = p.life.items.filter((i) => L.ITEM[i.cid].cat === cat && !i.lot);
    return head + `<div class="dl-body"><h2>Sell to ${esc(d.name)}</h2><p>We pay ${Math.round(LC.dealerBuyback * 100)}% of market value, in cash, today. For a better price, try ${go('aurexauctions.ab/consign', 'Aurex &amp; Co.')}.</p><div class="dl-list">${mine.map((i) => { const v = L.instValue(c, p, i); return `<div class="dl-row"><span class="dl-thumb" style="${itemBg(i.cid)}"></span><div><b>${esc(L.ITEM[i.cid].name)}</b><span>Market ${money(v)}</span></div><button class="dl-btn sm" data-a="itemSell" data-uid="${i.uid}" data-v="dealer">Sell · ${money(v * LC.dealerBuyback)}</button></div>`; }).join('') || '<p>You have nothing of this kind to sell.</p>'}</div></div>`;
  }
  const stock = c.life.dealer.filter((cid) => L.ITEM[cid].cat === cat);
  return head + `<div class="dl-hero" style="background-image:linear-gradient(90deg, var(--dl-shade), transparent), url(${stock[0] && L.ITEM[stock[0]].img ? `img/x-${stock[0]}.jpg` : d.hero})"><div><h1>${esc(d.slogan)}</h1><p>${esc(d.blurb)}</p></div></div>
    <div class="dl-body">${roomNote}<h2>In stock now</h2><div class="dl-grid">${stock.map((cid) => { const it = L.ITEM[cid]; return `<a href="#" class="dl-card" data-a="webGo" data-u="${d.host}/item/${cid}"><span class="dl-img sm" style="${itemBg(cid)}"></span><span class="dl-kick">${it.rarity}</span><b>${esc(it.name)}</b><span>${esc(it.maker)} · ${it.year}</span><strong>${money(L.itemValue(c, cid) * LC.dealerMarkup)}</strong></a>`; }).join('') || '<p>New stock arrives every few weeks. Check back soon.</p>'}</div>
    <p class="dl-small">Prices follow the ${esc(COLLECT_CATS[cat].name.toLowerCase())} market. Stock is refreshed every quarter and new pieces arrive between.</p></div>`;
}

// ---------------------------------------------------------------- BayHomes
function homes(u, st) {
  const c = city(), p = me();
  const head = `<div class="bh-head">${go('bayhomes.ab', '<b>Bay</b>Homes', 'bh-logo')}<span>${HOMES.reduce((a, h) => a + Math.max(0, L.unitsLeft(c, h.id)), 0)} homes for sale</span></div>`;
  const price = (h) => h.price * c.life.homes[h.id].ix;
  const roomsRow = (h) => ['art', 'wine', 'watch', 'car'].map((k) => { const r = h.rooms[k]; return `<span class="bh-r ${r ? (r.add ? 'opt' : 'yes') : 'no'}" title="${esc(ROOMS[k].name)}">${ricon(k, 15)}<em>${r ? (r.add ? 'Option' : r.cap) : '—'}</em></span>`; }).join('');
  if (u.path[0] === 'home') {
    const def = L.HOME[u.path[1]]; if (!def) return head + '<div class="bh-body"><h2>Listing removed</h2></div>';
    const pr = price(def), left = L.unitsLeft(c, def.id), down = st.down || 0.2, loan = pr * (1 - down), r = L.mortgageRate(c) / 100 / 12, n = LC.mortgageYears * 12, pay = loan > 0 ? loan * r / (1 - Math.pow(1 + r, -n)) : 0, need = pr * down + pr * LC.closing, hh = c.life.homes[def.id].h.slice(-36);
    const rooms = ['living', 'art', 'wine', 'watch', 'car'].filter((k) => k === 'living' || def.rooms[k]);
    return head + `<div class="bh-gal"><div class="bh-main" style="${homeBg(def.id, 'ext')}"></div><div class="bh-thumbs">${rooms.map((k) => `<span style="${homeBg(def.id, k)}"><em>${esc(def.names && def.names[k] ? def.names[k][0] : ROOMS[k].name)}</em></span>`).join('')}</div></div>
      <div class="bh-body bh-listing"><div><span class="bh-kick">${esc(def.district)} · ${left} of ${def.units} units available</span><h1>${esc(def.name)}</h1><div class="bh-price">${money(pr)}</div><p>${esc(def.desc)}</p>
      <div class="bh-rooms">${roomsRow(def)}</div>${def.noCar && !def.rooms.car ? `<p class="bh-small">${esc(def.noCar)}</p>` : ''}
      <h3>Price history</h3>${lineChart([{ v: hh, c: '#0e8a7e', fill: true }], hh.map((_, i) => shortDate(c.m - hh.length + 1 + i)), { fmt: (v) => v.toFixed(1), label: 'Price history', h: 140 })}</div>
      <aside class="bh-calc"><h3>Mortgage calculator</h3><div class="bh-seg">${[[0.2, '20%'], [0.5, '50%'], [1, 'Cash']].map(([v, t]) => `<button data-a="webDown" data-v="${v}" aria-pressed="${down === v}">${t}</button>`).join('')}</div>
        <div class="bh-l"><span>Down payment + fees</span><b>${money(need)}</b></div><div class="bh-l"><span>Mortgage at ${L.mortgageRate(c).toFixed(1)}%</span><b>${money(loan)}</b></div><div class="bh-l"><span>Payments</span><b>${money(pay * 12)}/yr</b></div><div class="bh-l"><span>Running costs</span><b>${money(def.charges + pr * (LC.propTax + LC.upkeep))}/yr</b></div><div class="bh-l"><span>Rent if you let it</span><b>${money(pr * LC.rentYield)}/yr</b></div>
        ${left > 0 ? `<button class="bh-btn" data-a="homeBuy" data-hid="${def.id}" data-v="${down}" ${p.life.wallet < need ? 'disabled' : ''}>Buy now</button>${p.life.wallet < need ? `<p class="bh-small">Your account has ${money(p.life.wallet)}. Take a dividend at Harbor Trust.</p>` : ''}` : '<p class="bh-small">Sold out. Check back when an owner sells.</p>'}</aside></div>`;
  }
  return head + `<div class="bh-hero"><h1>Find your place in Aurex Bay</h1><p>Lofts, villas and penthouses. Prices follow the district and the economy.</p></div>
    <div class="bh-body"><div class="bh-grid">${HOMES.map((h) => { const left = L.unitsLeft(c, h.id), hist = c.life.homes[h.id].h, d = hist.length > 12 ? (hist[hist.length - 1] / hist[hist.length - 13] - 1) * 100 : 0, mine = p.life.homes.some((x) => x.hid === h.id);
      return `<a href="#" class="bh-card" data-a="webGo" data-u="bayhomes.ab/home/${h.id}"><span class="bh-img" style="${homeBg(h.id, 'ext')}"><i>${mine ? 'You own here' : left > 0 ? `${left} available` : 'Sold out'}</i></span><span class="bh-c"><strong>${money(price(h))}</strong><b>${esc(h.name)}</b><span>${esc(h.district)} · <em class="${d >= 0 ? 'up' : 'down'}">${P(d)}</em> 12 mo</span><span class="bh-rooms">${roomsRow(h)}</span></span></a>`; }).join('')}</div></div>`;
}

// ---------------------------------------------------------------- The Aurex Gazette
// the house ad is set by the administrator / system (HOUSE_AD in content.js), never bought by players
export function houseAd(cls = '') {
  const a = HOUSE_AD; if (!a) return '';
  return `<div class="adv house ${cls}"><span class="adv-img" style="background-image:url(${esc(a.img)});background-position:${esc(a.pos || 'center')}"></span><span class="adv-t"><small>Advertisement · ${esc(a.from)}</small><b>${esc(a.head)}</b><span>${esc(a.line)}</span></span></div>`;
}
const worldCard = (c) => { const w = c.lastCard ? WORLD.find((x) => x.id === c.lastCard.id) : null; return w ? { ...w, m: c.lastCard.m } : null; };
const movers = (c) => STOCKS.map((s) => { const h = c.stocks[s.id].h; return { s, ch: h.length > 4 ? (h[h.length - 1] / h[h.length - 5] - 1) * 100 : 0 }; }).sort((a, b) => b.ch - a.ch);
const moversHTML = (c) => { const m = movers(c); return [...m.slice(0, 3), ...m.slice(-3)].map((x) => `<div class="gz-mv"><span>${esc(x.s.name)}</span><b class="${x.ch >= 0 ? 'up' : 'down'}">${P(x.ch)}</b></div>`).join(''); };
function gazette() {
  const c = city(), [lead, ...rest] = c.news, wc = worldCard(c);
  const sold = (c.life.sold || []).slice(0, 4);
  return `<div class="gz-mast"><span>${esc(dateLabel(c.m))}</span><h1>The Aurex Gazette</h1><span>Est. 1902 · Price 2¢</span></div>
    ${wc ? `<div class="gz-wc"><small>World Card · ${esc(dateLabel(wc.m))}</small><b>${esc(wc.title)}</b></div>` : ''}
    <div class="gz-cols"><article class="gz-lead">${lead ? `<h2>${esc(lead.title)}</h2><p>${esc(lead.text || '')}</p>` : ''}${rest.slice(0, 3).map((n) => `<h4>${esc(n.title)}</h4><p>${esc(n.text || '')}</p>`).join('')}${adSlot(2, 'wide')}${rest.slice(3, 6).map((n) => `<h4>${esc(n.title)}</h4><p>${esc(n.text || '')}</p>`).join('')}</article>
    <aside>${houseAd('side')}${adSlot(1, 'side')}<h3>Markets this month</h3>${moversHTML(c)}
      <h3>Under the hammer</h3>${sold.map((s) => `<p><b>${esc(L.ITEM[s.cid].name)}</b> went for ${money(s.price)}.</p>`).join('') || '<p>The auction season opens this month.</p>'}<p>${go('aurexauctions.ab', 'See the sale at Aurex &amp; Co. ›')}</p>
      <h3>Society</h3>${rest.slice(6, 12).map((n) => `<p>${esc(n.title)}.</p>`).join('')}</aside></div>`;
}
// a clipping of the Gazette for the Market tab: World Card headline, the 3 latest stories, markets and the house ad; a click opens the site
export function gazetteBox() {
  const c = city(), wc = worldCard(c), news = c.news.slice(0, 3);
  return `<a href="#" class="gzbox" data-a="web" data-u="aurexgazette.ab" aria-label="Open The Aurex Gazette">
    <div class="gz-mast"><span>${esc(dateLabel(c.m))}</span><h1>The Aurex Gazette</h1><span>News, markets and society</span></div>
    ${wc ? `<div class="gz-wc"><small>World Card · ${esc(dateLabel(wc.m))}</small><b>${esc(wc.title)}</b></div>` : ''}
    <div class="gz-cols"><div class="gz-lead">${news.map((n, i) => i ? `<h4>${esc(n.title)}</h4><p>${esc(n.text || '')}</p>` : `<h3 class="gz-h">${esc(n.title)}</h3><p>${esc(n.text || '')}</p>`).join('') || '<p>No news yet.</p>'}</div>
    <aside><h3>Markets this month</h3>${moversHTML(c)}</aside></div>
    ${houseAd('wide')}<span class="gz-more">Read The Aurex Gazette ›</span></a>`;
}

// ---------------------------------------------------------------- Bank of Aurex: the national bank, business loans
const BOA_IMG = 'img/c-bankofaurex.jpg';
function boa(u) {
  const c = city(), p = me(), page = u.path[0] || '', debt = E.debt(p), cap = E.loanCap(c, p), room = Math.max(0, cap - debt), rate = E.loanRate(c, p);
  const r = E.rates(c, 'p', p.id), cb = E.listing(c, CENTRAL_BANK), last = c.lastCard && WORLD.find((w) => w.id === c.lastCard.id);
  const gov = cb && cb.owner ? (cb.owner.k === 'h' ? (c.holdings[cb.owner.id] || {}).name : (c.players[cb.owner.id] || {}).name) : null;
  const cbs = c.cb || { rate: CENTRAL.start, target: CENTRAL.start, hist: [], levy: {}, px: 1, setM: -99, levyM: -99 }, gov0 = E.canRun(c, meId(), cb);
  const tabs = [['', 'Home'], ['loans', 'Business loans'], ['policy', 'Monetary policy'], ...(gov0 ? [['office', "Governor's office"]] : [])];
  const head = `<header class="ba-head"><div class="ba-brand">${go('bankofaurex.ab', '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 37 36H29L20 18 11 36H3Z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M20 14 30 34H10Z" fill="currentColor" opacity=".55"/></svg><span><b>Bank of Aurex</b><small>The national bank · est. 1902</small></span>')}</div>
    <nav class="ba-nav">${tabs.map(([k, t]) => go('bankofaurex.ab' + (k ? '/' + k : ''), t, page === k ? 'on' : '')).join('')}</nav></header>`;
  const stat = (k, v, cls = '') => `<div class="ba-stat"><small>${k}</small><b class="${cls}">${v}</b></div>`;
  const econ = `<span class="ba-econ e-${esc(c.econ.toLowerCase())}">${esc(c.econ)}</span>`;
  let body = '';
  if (page === 'loans') {
    const parts = E.loanRateParts(c, p), steps = [5, 10, 20, 50];
    body = `<h2>Business loans</h2><p class="ba-sub">Credit for ${esc(p.name)}'s companies. Interest is charged on what you owe and paid from your company cash.</p>
      <div class="ba-stats">${stat('You owe', M(debt), debt ? 'down' : '')}${stat('Your rate', rate + '%')}${stat('Interest a year', M(r.interest))}${stat('Credit limit', M(cap))}</div>
      <div class="ba-card"><h3>Borrow <em>${M(room)} available</em></h3><div class="ba-bar"><i style="width:${cap ? Math.min(100, debt / cap * 100) : 0}%"></i></div><p class="ba-small">Your limit is half the value of your companies plus 10 M.</p>
        <div class="ba-btns">${steps.map((v) => `<button class="ba-btn" data-a="loan" data-v="${v}" ${v > room ? 'disabled' : ''}>Borrow ${M(v)}</button>`).join('')}</div></div>
      <div class="ba-card"><h3>Repay <em>${M(p.cash)} in company cash</em></h3><div class="ba-btns">${[5, 20].filter((v) => !debt || v < debt).map((v) => `<button class="ba-btn ghost" data-a="repay" data-v="${v}" ${!debt || p.cash <= 0 ? 'disabled' : ''}>Repay ${M(v)}</button>`).join('')}<button class="ba-btn ghost" data-a="repay" data-v="999" ${!debt || p.cash < debt ? 'disabled' : ''}>Repay all</button></div></div>
      <div class="ba-card"><h3>Your loans</h3>${p.loans.length ? p.loans.map((l, i) => `<div class="ba-l"><span>Loan ${i + 1} · taken ${esc(shortDate(l.m))}</span><b>${M(l.amt)}</b></div>`).join('') + `<div class="ba-l tot"><span>Total</span><b>${M(debt)}</b></div>` : '<p class="ba-small">You have no loans with us.</p>'}</div>
      <div class="ba-card"><h3>How your rate is made</h3>${parts.map(([k, v], i) => `<div class="ba-l"><span>${esc(k)}</span><b>${i ? (v > 0 ? '+' : '−') + Math.abs(v) + ' pts' : v + '%'}</b></div>`).join('')}<div class="ba-l tot"><span>Your rate</span><b>${rate}%</b></div><p class="ba-small">Never below 1%.</p></div>`;
  } else if (page === 'policy' || (page === 'office' && !gov0)) {
    const h = (cbs.hist || []).slice(-24), lv = cbs.levy || {}, pend = cbs.pending;
    const levies = [lv.sector ? [`${TYPES[lv.sector].name} income`, lv.sp] : null, lv.supply ? [`${GOODS[lv.supply].name} purchases`, lv.gp] : null].filter(Boolean);
    body = `<h2>Monetary policy</h2><p class="ba-sub">The Bank of Aurex sets the bank rate that every business loan in the city starts from.</p>
      <div class="ba-stats">${stat('Bank rate', cbs.rate + '%')}${stat('Target', cbs.target + '%')}${stat('Economy', econ)}${stat('Governor', esc(gov || 'Vacant'))}</div>
      ${pend ? `<div class="ba-card ba-note"><h3>Announced</h3><p class="ba-small">${pend.target != null ? `New target ${pend.target}% from next week. ` : ''}${pend.levy ? 'New levies from next week.' : ''}</p></div>` : ''}
      <div class="ba-card"><h3>Bank rate <em>last ${h.length} months</em></h3>${h.length > 1 ? lineChart([{ v: h.map((x) => x[1]), c: '#d9b45a', w: 2.4 }], h.map((x) => shortDate(x[0])), { fmt: (v) => v.toFixed(2) + '%', label: 'Bank rate', h: 150 }) : '<p class="ba-small">The chart fills in month by month.</p>'}</div>
      <div class="ba-card"><h3>What the policy does now</h3>
        <div class="ba-l"><span>Pressure on the economy</span><b>${esc(E.CB.tiltWords(c))}</b></div>
        <div class="ba-l"><span>Supply prices vs normal</span><b>${((cbs.px || 1) * 100 - 100 >= 0 ? '+' : '−') + Math.abs((cbs.px || 1) * 100 - 100).toFixed(1)}%</b></div>
        <div class="ba-l"><span>Home mortgages</span><b>${L.mortgageRate(c).toFixed(1)}%</b></div><div class="ba-l"><span>Savings accounts</span><b>${L.savingsRate(c).toFixed(1)}%</b></div>
        <p class="ba-small">Below ${CENTRAL.calm[0]}% cheap money pushes towards a boom and lifts supply prices. Above ${CENTRAL.calm[1]}% dear money drags towards recession and supply prices fall. The world news still decides; the bank only tilts the odds.</p></div>
      <div class="ba-card"><h3>Levies <em>${esc(M(cbs.collected || 0))} collected for the city</em></h3>${levies.length ? levies.map(([k, v]) => `<div class="ba-l"><span>${esc(k)}</span><b>${v}%</b></div>`).join('') : '<p class="ba-small">No levies right now.</p>'}</div>
      ${last ? `<div class="ba-card"><h3>Latest world news <em>${esc(dateLabel(c.lastCard.m))}</em></h3><b class="ba-news">${esc(last.title)}</b><p class="ba-small">${esc(last.text)}</p></div>` : ''}
      <div class="ba-card"><h3>The governor's seat</h3><p class="ba-small">${gov ? `The bank is owned by ${esc(gov)}.` : 'The bank has no owner yet.'} The owner sets a target rate (${CENTRAL.min}–${CENTRAL.max}%) once a quarter; the rate moves at most ${CENTRAL.moveMax} points a month. Owners need ${esc(PRESTIGE_TIERS[CENTRAL.needTier].name)} prestige and Finance level ${CENTRAL.needFinance}. If the rate stays below ${CENTRAL.extreme[0]}% or above ${CENTRAL.extreme[1]}% for a year, the Finance Ministry may reset it to ${CENTRAL.neutral}%. ${go('bankofaurex.ab/about', 'About the bank ›', 'ba-more')}</p></div>`;
  } else if (page === 'office') {
    const lv = cbs.levy || {}, rateWait = CENTRAL.quarter - (c.m - cbs.setM), levyWait = CENTRAL.quarter - (c.m - cbs.levyM);
    const steps = [-1, -0.5, -0.25, 0.25, 0.5, 1].map((d) => Math.round((cbs.target + d) * 100) / 100).filter((v) => v >= CENTRAL.min && v <= CENTRAL.max);
    const mine = E.cbGovTypes(c, meId()), crowd = E.CB.crowded(c), trade = E.CB.traded(c), pcts = [0, 2, 5, 10];
    const levyBtn = (args, on, label, dis) => `<button class="ba-btn ${on ? '' : 'ghost'}" data-a="cbLevy" ${Object.entries(args).map(([k, v]) => `data-${k}="${esc(String(v ?? ''))}"`).join(' ')} ${dis || levyWait > 0 ? 'disabled' : ''}>${label}</button>`;
    const keepG = { supply: lv.supply || '', gp: lv.gp || 0 }, keepS = { sector: lv.sector || '', sp: lv.sp || 0 };
    body = `<h2>Governor's office</h2><p class="ba-sub">You steer the bank, not the economy. Every decision is announced in the Gazette a week before it takes effect.</p>
      <div class="ba-stats">${stat('Bank rate', cbs.rate + '%')}${stat('Target', cbs.target + '%')}${stat('Pressure', esc(E.CB.tiltWords(c)))}</div>
      <div class="ba-card"><h3>Target rate <em>${rateWait > 0 ? `next decision in ${rateWait} month${rateWait === 1 ? '' : 's'}` : 'the board can decide now'}</em></h3>
        <p class="ba-small">Lower rates make every loan cheaper, yours too. Higher rates earn the bank more: it keeps ${Math.round(CENTRAL.ownerCut * 100)}% of the interest other tycoons pay.</p>
        <div class="ba-btns">${steps.map((v) => `<button class="ba-btn ${v < cbs.target ? 'ghost' : ''}" data-a="cbRate" data-v="${v}" ${rateWait > 0 ? 'disabled' : ''}>${v < cbs.target ? 'Cut' : 'Raise'} to ${v}%</button>`).join('')}</div></div>
      <div class="ba-card"><h3>Levy on a crowded sector <em>${levyWait > 0 ? `next change in ${levyWait} month${levyWait === 1 ? '' : 's'}` : 'once a quarter'}</em></h3>
        <p class="ba-small">Up to ${CENTRAL.levyMax}% of passive income for companies in one of the most crowded sectors. Not on a sector you are in yourself. The money goes to the city.</p>
        ${crowd.length ? crowd.map((x) => `<div class="ba-l"><span>${esc(TYPES[x.type].name)} · ${x.n} companies${mine.has(x.type) ? ' · you are in it' : ''}</span><b>${lv.sector === x.type ? lv.sp + '%' : '0%'}</b></div><div class="ba-btns">${pcts.map((v) => levyBtn({ sector: v ? x.type : '', sp: v, ...keepG }, (lv.sector === x.type ? lv.sp : 0) === v, v + '%', mine.has(x.type) && v > 0)).join('')}</div>`).join('') : '<p class="ba-small">No sector is crowded yet.</p>'}</div>
      <div class="ba-card"><h3>Levy on a traded supply</h3>
        <p class="ba-small">Up to ${CENTRAL.levyMax}% on top of the price when companies buy one of the most traded supplies.</p>
        ${trade.length ? trade.map((x) => `<div class="ba-l"><span>${esc(GOODS[x.g].name)} · ${Math.round(x.q)} ${esc(GOODS[x.g].unit)} last month</span><b>${lv.supply === x.g ? lv.gp + '%' : '0%'}</b></div><div class="ba-btns">${pcts.map((v) => levyBtn({ supply: v ? x.g : '', gp: v, ...keepS }, (lv.supply === x.g ? lv.gp : 0) === v, v + '%')).join('')}</div>`).join('') : '<p class="ba-small">No supply traded last month.</p>'}</div>
      <p class="ba-small">Heavy levies (more than ${CENTRAL.levyLoad} points in all) drag the economy too. If you are away for months, the bank's autopilot steers back to ${CENTRAL.neutral}% and drops the levies.</p>`;
  } else if (page === 'about') {
    body = `<h2>About the bank</h2><div class="ba-card"><p class="ba-small">Founded in 1902, the Bank of Aurex is the national bank of Aurex Bay. It lends to the city's companies and runs from its tower in Aurex City.</p>
      ${cb ? `<div class="ba-btns"><button class="ba-btn" data-a="adCo" data-lid="${cb.id}">See the company ›</button></div>` : ''}</div>`;
  } else {
    body = `<div class="ba-hero" style="background-image:url(${BOA_IMG})"><div><small>Business banking</small><h1>Capital for the companies that build Aurex Bay</h1><p>Borrow for growth, repay when it suits you.</p>${go('bankofaurex.ab/loans', 'Manage your loans', 'ba-cta')}</div></div>
      <div class="ba-stats">${stat('Bank rate', cbs.rate + '%')}${stat('Your rate', rate + '%')}${stat('You owe', M(debt), debt ? 'down' : '')}${stat('Economy', econ)}</div>
      <div class="ba-grid">${go('bankofaurex.ab/loans', `<b>Business loans</b><span>Borrow up to ${M(room)} more today.</span>`, 'ba-tile')}${go('bankofaurex.ab/policy', '<b>Monetary policy</b><span>The bank rate and the state of the economy.</span>', 'ba-tile')}${gov0 ? go('bankofaurex.ab/office', `<b>Governor's office</b><span>Set the target rate and the levies.</span>`, 'ba-tile') : go('bankofaurex.ab/about', '<b>About the bank</b><span>The national bank of Aurex Bay since 1902.</span>', 'ba-tile')}</div>`;
  }
  return `${head}<div class="ba-main">${body}</div>`;
}

// ---------------------------------------------------------------- Harbor Trust online banking
function bank(u) {
  const c = city(), p = me(), Lp = p.life, est = L.monthly(c, p), page = u.path[0] || '';
  const tabs = [['', 'Overview'], ['accounts', 'Statement'], ['transfer', 'Transfers'], ['salary', 'Salary & tax'], ['mortgages', 'Mortgages'], ['budget', 'Budget']];
  const nav = `<nav class="bk-nav">${tabs.map(([k, t]) => go('harbortrust.ab' + (k ? '/' + k : ''), t, page === k ? 'on' : '')).join('')}</nav>`;
  const head = `<div class="bk-head">${favicon('harbortrust.ab', 34)}<div><b>Harbor Trust</b><span>Private banking</span></div><span class="bk-user">${esc(p.name)}</span></div>`;
  const row = (t) => `<div class="bk-tx"><div><b>${esc(t.text)}</b><span>${esc(shortDate(t.m))}${t.sav ? ' · Savings' : ''}</span></div><div class="r"><b class="${t.amt >= 0 ? 'up' : 'down'}">${money(t.amt, true)}</b>${t.sav ? '' : `<span>${money(t.bal)}</span>`}</div></div>`;
  const txs = Lp.tx || [];
  const acct = (name, no, bal, sub) => `<div class="bk-acct"><span>${esc(name)}</span><em>${no}</em><b class="${bal < 0 ? 'down' : ''}">${money(bal)}</b><small>${sub}</small></div>`;
  const loans = Lp.homes.filter((h) => h.bal > 0.0001);
  const loanTot = loans.reduce((a, h) => a + h.bal, 0);
  const net = Lp.wallet + (Lp.savings || 0) + L.equity(c, p) + L.collectionValue(c, p);
  let body = '';
  if (page === 'accounts') {
    body = `<h2>Statement</h2><p class="bk-small">Current account · the last ${txs.length} transactions</p><div class="bk-card">${txs.map(row).join('') || '<p class="bk-small">No transactions yet. Your first statement arrives at the end of the month.</p>'}</div>`;
  } else if (page === 'transfer') {
    body = `<h2>Transfers</h2>
      <div class="bk-card"><h3>Dividend from your empire</h3><p class="bk-small">Your empire has ${M(p.cash)} in cash. Dividends are taxed ${Math.round(TAX.dividend * 100)}% before they reach your account.</p><div class="bk-btns">${[0.5, 1, 2, 5, 10].map((v) => `<button class="bk-btn" data-a="lifeDiv" data-v="${v}" ${p.cash < v ? 'disabled' : ''}>${M(v)} → ${money(v * (1 - TAX.dividend))}</button>`).join('')}</div></div>
      <div class="bk-card"><h3>Invest in your empire</h3><p class="bk-small">Move money back to the company account. No tax.</p><div class="bk-btns">${[0.1, 0.5, 1, 5].map((v) => `<button class="bk-btn ghost" data-a="lifeInv" data-v="${v}" ${Lp.wallet < v ? 'disabled' : ''}>${money(v)}</button>`).join('')}</div></div>
      <div class="bk-card"><h3>Savings account · ${L.savingsRate(c).toFixed(1)}% a year</h3><p class="bk-small">Interest is paid monthly and follows the economy. Balance ${money(Lp.savings || 0)}.</p>
        <div class="bk-btns">${[0.1, 0.5, 1, 5].map((v) => `<button class="bk-btn ghost" data-a="bankSave" data-v="${v}" ${Lp.wallet < v ? 'disabled' : ''}>Save ${money(v)}</button>`).join('')}</div>
        <div class="bk-btns">${[0.1, 0.5, 1].map((v) => `<button class="bk-btn ghost" data-a="bankWithdraw" data-v="${v}" ${(Lp.savings || 0) < 0.0001 ? 'disabled' : ''}>Withdraw ${money(v)}</button>`).join('')}<button class="bk-btn ghost" data-a="bankWithdraw" data-v="${Lp.savings || 0}" ${(Lp.savings || 0) < 0.0001 ? 'disabled' : ''}>Withdraw all</button></div></div>`;
  } else if (page === 'salary') {
    const net0 = (v) => v - L.incomeTax(v);
    body = `<h2>Salary & tax</h2><div class="bk-card"><h3>Monthly salary from your empire</h3><p class="bk-small">The salary is a cost for your empire and is paid to your account at the end of every month after income tax.</p>
      <div class="bk-sal">${SALARIES.map((v) => `<button data-a="lifeSalary" data-v="${v}" aria-pressed="${Lp.salary === v}"><b>${v ? M(v) : 'None'}</b><span>${v ? `${money(net0(v))} after tax` : 'Keep it in the company'}</span></button>`).join('')}</div></div>
      <div class="bk-card"><h3>Income tax</h3>${TAX.brackets.map(([top, r], i) => `<div class="bk-l"><span>${i === 0 ? 'Up to' : top === Infinity ? 'Above' : 'Up to'} ${top === Infinity ? M(TAX.brackets[i - 1][0]) : M(top)}</span><b>${Math.round(r * 100)}%</b></div>`).join('')}
        <div class="bk-l"><span>Dividends</span><b>${Math.round(TAX.dividend * 100)}%</b></div><div class="bk-l"><span>Tax credit on museum donations</span><b>${Math.round(TAX.donationCredit * 100)}% of value</b></div>
        <div class="bk-l tot"><span>Your income tax this year</span><b>${money(L.incomeTax(Lp.salary))}</b></div></div>`;
  } else if (page === 'mortgages') {
    body = `<h2>Mortgages</h2><p class="bk-small">Variable rate, now ${L.mortgageRate(c).toFixed(1)}%. It follows the economy.</p>${Lp.homes.length ? Lp.homes.map((h) => { const def = L.HOME[h.hid], v = L.homeValue(c, h); return `<div class="bk-card bk-loan"><span class="bk-hthumb" style="${homeBg(h.hid, 'ext')}"></span><div><h3>${esc(def.name)}</h3>
      <div class="bk-l"><span>Home value</span><b>${money(v)}</b></div><div class="bk-l"><span>Loan balance</span><b>${h.bal > 0.0001 ? money(h.bal) : 'Paid off'}</b></div><div class="bk-l"><span>Loan to value</span><b>${Math.round(h.bal / v * 100)}%</b></div><div class="bk-l"><span>Equity</span><b>${money(v - h.bal)}</b></div>
      ${h.bal > 0.0001 ? `<div class="bk-btns">${[0.05, 0.25, 1].filter((x) => x < h.bal).map((x) => `<button class="bk-btn ghost" data-a="homeRepay" data-uid="${h.uid}" data-v="${x}" ${Lp.wallet < x ? 'disabled' : ''}>Repay ${money(x)}</button>`).join('')}<button class="bk-btn" data-a="homeRepay" data-uid="${h.uid}" data-v="${h.bal}" ${Lp.wallet < h.bal ? 'disabled' : ''}>Pay off ${money(h.bal)}</button></div>` : ''}</div></div>`; }).join('') : `<div class="bk-card"><p>You have no mortgages. Find a home on ${go('bayhomes.ab', 'BayHomes')}.</p></div>`}`;
  } else if (page === 'budget') {
    const lines = [['Salary after tax', est.salaryNet], ['Rent from tenants', est.rent], ['Museum loan fees', est.lend], ['Building charges', -est.charges], ['Property tax', -est.propTax], ['Maintenance', -est.upkeep], ['Mortgage interest', -est.interest], ['Mortgage repayment', -est.principal], ['Living costs', -est.lifestyle], ['Collection insurance and upkeep', -est.care], ['Overdraft interest', -est.overdraft]].filter(([, v]) => Math.abs(v) > 0.00005);
    const hist = (Lp.ledger || []).slice(-12);
    body = `<h2>Budget</h2><div class="bk-card"><h3>Next month</h3>${lines.map(([k, v]) => `<div class="bk-l"><span>${k}</span><b class="${v >= 0 ? 'up' : 'down'}">${money(v, true)}</b></div>`).join('')}<div class="bk-l tot"><span>Net per month</span><b class="${est.net >= 0 ? 'up' : 'down'}">${money(est.net, true)}</b></div><p class="bk-small">Mortgage repayments build equity in your home. Change your living costs in the living room at home.</p></div>
      <div class="bk-card"><h3>Money in and out</h3>${hist.length > 1 ? lineChart([{ v: hist.map((x) => x.in), c: '#1e9c7c', w: 2.4 }, { v: hist.map((x) => x.out), c: '#d0644f', w: 2.4 }], hist.map((x) => shortDate(x.m)), { fmt: (v) => money(v), label: 'Money in and out', h: 160 }) : '<p class="bk-small">The chart fills in month by month.</p>'}<div class="bk-leg"><span><i style="background:#1e9c7c"></i>In</span><span><i style="background:#d0644f"></i>Out</span></div></div>`;
  } else {
    body = `<div class="bk-hello"><span>Good ${['morning', 'afternoon', 'evening'][c.wk % 3]}, ${esc(p.name.split(' ')[0])}</span><b>${money(net)}</b><small>Personal net worth: accounts, home equity and collections</small></div>
      <div class="bk-accts">${acct('Current account', '•••• 4471', Lp.wallet, Lp.wallet < 0 ? `Overdraft at ${Math.round(LC.overdraft * 100)}%` : 'Available')}${acct('Savings', '•••• 9020', Lp.savings || 0, `${L.savingsRate(c).toFixed(1)}% a year`)}${acct('Mortgages', `${loans.length} loan${loans.length === 1 ? '' : 's'}`, -loanTot, `${L.mortgageRate(c).toFixed(1)}% variable`)}</div>
      <div class="bk-quick">${go('harbortrust.ab/transfer', '<b>↓</b>Take dividend')}${go('harbortrust.ab/transfer', '<b>↑</b>Invest in empire')}${go('harbortrust.ab/salary', '<b>€</b>Salary')}${go('harbortrust.ab/budget', '<b>≡</b>Budget')}</div>
      <div class="bk-card"><h3>This month <em class="${est.net >= 0 ? 'up' : 'down'}">${money(est.net, true)} net</em></h3><div class="bk-bar"><i style="width:${Math.min(100, est.inflow / Math.max(est.inflow, est.outflow, 0.0001) * 100)}%;background:#1e9c7c"></i></div><div class="bk-l"><span>In</span><b>${money(est.inflow)}</b></div><div class="bk-bar"><i style="width:${Math.min(100, est.outflow / Math.max(est.inflow, est.outflow, 0.0001) * 100)}%;background:#d0644f"></i></div><div class="bk-l"><span>Out</span><b>${money(est.outflow)}</b></div></div>
      <div class="bk-card"><h3>Latest transactions ${go('harbortrust.ab/accounts', 'See all ›', 'bk-more')}</h3>${txs.slice(0, 6).map(row).join('') || '<p class="bk-small">No transactions yet.</p>'}</div>`;
  }
  return `${head}<div class="bk-wrap">${nav}<div class="bk-main">${body}</div></div>`;
}
