// Building sites in the browser: the site panel (company card, company page and aurexbuild.ab/site/<id>), the
// construction company's "Building sites" box and the city's building portal aurexbuild.ab. Rules: _shared/build.js.
import * as E from '../supabase/functions/_shared/engine.js';
import { GOODS, TYPES, SIZES, CONFIG as GC } from '../supabase/functions/_shared/content.js';
import { city, me, esc, M, K, N, lname, coImg, dur, now } from './util.js';

const BLD = E.BLD, B = BLD.B;
export const HOST = 'aurexbuild.ab';
const ctxOf = (c) => E.bctx(c);
const imp = (c) => (g) => (c.market[g] ? c.market[g].p : GOODS[g].base);
const wk = (n) => `${n} week${n === 1 ? '' : 's'}`;
const realWeeks = (n) => { const c = city(); return dur(n * GC.YEAR_MS / 48 / c.clock.speed); };
const realIn = (g) => { const c = city(); return dur(Math.max(0, (g - E.gameNow(c, now())) * GC.YEAR_MS / c.clock.speed)); };
const starTxt = (v) => (v == null ? 'No jobs yet' : `${'★'.repeat(Math.round(v))}${'☆'.repeat(5 - Math.round(v))} ${v.toFixed(1)}`);
const ownerName = (c, l) => (!l.owner ? 'For sale' : typeof l.owner === 'string' ? (c.players[l.owner] || {}).name || '' : l.owner.k === 'p' ? (c.players[l.owner.id] || {}).name || '' : (c.holdings[l.owner.id] || {}).name || '');

export function statusOf(l) {
  const s = l.site; if (!s) return null;
  const pc = Math.round(BLD.progress(l) * 100);
  if (!s.c) return { label: s.tender ? `${s.kind === 'new' ? 'Plot' : 'Works'} · asking for bids` : s.kind === 'new' ? `Building plot${pc ? ` · ${pc}% built` : ''}` : `${BLD.kindName(s)} · needs a builder`, cls: 'warn' };
  if (s.st === 'task') return { label: `${pc}% · crane task waiting`, cls: 'warn' };
  if (s.stall) return { label: `${pc}% · waiting for supplies`, cls: 'bad' };
  return { label: `${BLD.kindName(s)} · ${pc}%`, cls: 'info' };
}

// ---------------------------------------------------------------- the site panel
export function siteHTML(l) {
  const c = city(), p = me(), s = l.site; if (!s) return '';
  const x = ctxOf(c), own = !!(p && l.owner && x.canRun(p.id, l)), bl = s.c && s.c.by !== BLD.CITY ? E.listing(c, s.c.by) : null;
  const builder = !!(p && bl && E.canRun(c, p.id, bl)), n = BLD.phaseCount(s), pc = BLD.progress(l), st = statusOf(l);
  const phases = BLD.phaseIds(s).map((_, i) => { const ph = BLD.phase(s, i), w = BLD.phaseWeeks(l, { ...s, cut: i === s.ph ? s.cut : 0 }, i);
    const cls = i < s.ph ? 'done' : i === s.ph && s.c ? 'now' : '';
    return `<li class="${cls}"><b>${esc(ph.name)}</b><span>${i < s.ph ? `Done${s.q[i] != null ? ` · task ${Math.round(s.q[i] * 100)}%` : ''}` : i === s.ph && s.c ? (s.st === 'task' ? 'Built · crane task waiting' : `Week ${Math.min(w, s.wk + 1)} of ${w}`) : wk(w)}</span></li>`; }).join('');
  const out = [`<div class="bsite"><div class="bs-top"><div><span class="bs-k">${esc(BLD.kindName(s))}</span><b>${s.kind === 'new' ? esc(BLD.what(l)) : esc(lname(l))}</b></div><span class="chip ${st.cls}">${esc(st.label)}</span></div>
    <div class="bs-bar"><i style="width:${Math.max(2, pc * 100)}%"></i></div><div class="bs-cap">${Math.round(pc * 100)}% built · ${n} phase${n > 1 ? 's' : ''} · ${wk(BLD.totalWeeks(l, s))} with a builder at full supply (about ${realWeeks(BLD.totalWeeks(l, s))})</div>
    <ol class="bs-ph">${phases}</ol>`];
  if (s.c) {
    const late = c.g > s.c.due;
    out.push(`<div class="bs-facts"><div><small>Builder</small><b>${esc(BLD.builderName(c, x, s))}</b>${bl ? `<span>${starTxt(BLD.stars(bl))}</span>` : `<span>${esc(B.city.role)}</span>`}</div>
      <div><small>Contract</small><b>${M(s.c.price)}</b><span>${M(s.c.paid)} paid · ${M(s.c.held)} held</span></div>
      <div><small>Hand-over</small><b class="${late ? 'down' : ''}">${late ? 'Late' : `in ${realIn(s.c.due)}`}</b><span>${s.c.by === BLD.CITY ? 'the city crew works at its own pace' : `${Math.round(B.fine * 100)}% fine a week late`}</span></div>
      <div><small>Supplies</small><b>${s.c.by === BLD.CITY ? 'Brought by the city' : s.c.turnkey ? 'The builder brings them' : 'The developer brings them'}</b><span>${s.stall ? `<em class="down">Waiting ${wk(s.stall)}</em>` : 'anyone involved may help'}</span></div></div>`);
    if (s.st === 'task' && builder) out.push(`<div class="bs-task"><div><b>${esc(BLD.phase(s).task)}</b><span>${esc(BLD.phase(s).verb)}. About 20 seconds. Done by ${realIn(s.taskDue)} or the crew does it without you.</span></div><button class="btn gold" data-a="crane" data-lid="${l.id}">Start the crane ›</button></div>`);
    else if (s.st === 'task') out.push(`<p class="bs-note">The ${esc(BLD.phase(s).name.toLowerCase())} is built. ${esc(BLD.builderName(c, x, s))} lifts the last pieces in by crane (within ${realIn(s.taskDue)}).</p>`);
    if (s.c.by !== BLD.CITY && (own || builder)) out.push(materials(c, l, s, own, builder));
    if (own) out.push(`<div class="btns"><button class="btn sm danger" data-a="siteFire" data-lid="${l.id}">End the contract${s.c.held > 0.005 ? ` · ${M(s.c.held)} back to you` : ''}</button></div>`);
    return out.join('') + '</div>';
  }
  if (!l.owner) { out.push(`<p class="bs-note">Buy the plot to build here. You hire a construction company, or the city's own crew, and the building opens when the last phase is done.</p></div>`); return out.join(''); }
  const fee = BLD.fairFee(l, s, x.fullPrice(l)), mat = BLD.materialsValue(c, l, s, (g) => (c.market[g] ? c.market[g].p : GOODS[g].base)), cp = BLD.cityPrice(c, l, s, x.fullPrice(l), imp(c)), cw = Math.round(BLD.totalWeeks(l, s, BLD.CITY) * (1 - BLD.progress(l)));
  if (own) {
    if (!s.tender) out.push(`<div class="bs-hire"><div><b>Ask construction companies for bids</b><span>A fair price for the work is about ${M(fee)}${s.kind === 'new' ? '' : ''}. Supplies cost about ${M(mat)} more at today's market prices.</span>
        <div class="btns"><button class="btn gold sm" data-a="siteTender" data-lid="${l.id}" data-v="1">Ask for bids · turnkey</button><button class="btn sm" data-a="siteTender" data-lid="${l.id}" data-v="0">Ask for bids · labour only</button></div>
        <span class="bs-small">Turnkey: the builder brings the supplies and prices them in. Labour only: you bring them, from the market or from your own companies.</span></div>
      <div><b>${esc(B.city.name)}</b><span>Always free. Brings its own supplies, but costs more and is slower: ${M(cp)} all in, about ${wk(cw)} (${realWeeks(cw)}).</span><div class="btns"><button class="btn sm navy" data-a="siteCity" data-lid="${l.id}" ${E.bctx(c).cashOf(l.owner) < cp ? 'disabled' : ''}>Hire the city crew · ${M(cp)}</button></div></div></div>`);
    else {
      out.push(`<div class="bs-bids"><div class="bs-cap">Asking for bids · ${s.tender.turnkey ? 'turnkey' : 'labour only'} · open on ${HOST}</div>${s.bids.length ? s.bids.map((b) => { const b2 = E.listing(c, b.lid);
        return `<div class="row"><span class="thumb" style="background-image:url(${coImg(b2)})"></span><div class="grow"><b>${esc(lname(b2))} · ${M(b.price)}</b><span>${wk(b.weeks)} (${realWeeks(b.weeks)}) · ${starTxt(BLD.stars(b2))} · ${esc(ownerName(c, b2))}${b.note ? ` · “${esc(b.note)}”` : ''}</span></div><button class="btn sm gold" data-a="siteAccept" data-lid="${l.id}" data-v="${b.id}">Accept</button><button class="btn sm" data-a="siteDecline" data-lid="${l.id}" data-v="${b.id}">Decline</button></div>`; }).join('') : '<p class="empty">No bids yet. Construction companies got a mail.</p>'}
        <div class="btns"><button class="btn sm" data-a="siteCancel" data-lid="${l.id}">Withdraw the call</button><button class="btn sm navy" data-a="siteCity" data-lid="${l.id}">Or hire the city crew · ${M(cp)}</button></div></div>`);
    }
  }
  // builders the viewer runs can bid
  const mine = p ? BLD.builders(c).filter((b2) => E.canRun(c, p.id, b2)) : [];
  if (s.tender && mine.length) {
    const minW = BLD.totalWeeks(l, s), my = s.bids.filter((b) => mine.some((b2) => b2.id === b.lid));
    const free = mine.filter((b2) => BLD.freeSlots(c, b2) > 0);
    out.push(`<div class="bs-bidform"><div class="bs-cap">Bid as a builder${s.tender.turnkey ? ' · turnkey: include the supplies (about ' + M(mat) + ')' : ' · labour only'}</div>
      ${my.map((b) => `<div class="row"><div class="grow"><b>Your bid: ${M(b.price)} · ${wk(b.weeks)}</b><span>${esc(lname(E.listing(c, b.lid)))}</span></div><button class="btn sm" data-a="siteWithdraw" data-lid="${l.id}" data-v="${b.id}">Withdraw</button></div>`).join('')}
      ${free.length ? `<div class="bs-form"><label>Builder<select id="bf-from-${l.id}">${free.map((b2) => `<option value="${b2.id}">${esc(lname(b2))} · ${BLD.freeSlots(c, b2)} free crew</option>`).join('')}</select></label>
      <label>Price, M<input id="bf-price-${l.id}" type="number" min="0" step="0.1" value="${(fee + (s.tender.turnkey ? mat : 0)).toFixed(1)}"></label>
      <label>Weeks<input id="bf-weeks-${l.id}" type="number" min="${minW}" max="${minW * 3}" step="1" value="${minW + 2}"></label>
      <button class="btn sm gold" data-a="siteBid" data-lid="${l.id}">${my.length ? 'Update bid' : 'Send bid'}</button></div><span class="bs-small">The work takes at least ${wk(minW)} at full supply, plus about a week per phase for your crane tasks. Late costs ${Math.round(B.fine * 100)}% a week.</span>` : '<p class="empty">All your crews are busy.</p>'}</div>`);
  }
  return out.join('') + '</div>';
}
function materials(c, l, s, own, builder) {
  const p = me(), still = BLD.stillNeeded(l, s), week = BLD.weekNeed(l, s), now0 = BLD.phaseNeed(l, s);
  const runs = c.listings.filter((x) => x.ops && x.owner && E.canRun(c, p.id, x));
  const rows = Object.keys(still).filter((g) => still[g] > 0.5 || (s.stock[g] || 0) > 0.5).map((g) => {
    const room = BLD.room(l, s, g), q = Math.min(room, Math.max(1, Math.ceil((week[g] || 0) * 2) || Math.ceil(room / 4))), est = room ? E.OPS.quote(c, { owner: null }, g, q, 'cheapest').cost : 0;
    const src = runs.filter((x) => (x.ops.inv[g] || 0) >= 1);
    const short = (week[g] || 0) > (s.stock[g] || 0) + 1e-6;
    return `<div class="bs-m${short ? ' short' : ''}"><div class="bs-mh"><b>${esc(GOODS[g].name)}</b><span>${N(s.stock[g] || 0)} ${esc(GOODS[g].unit)} on site · ${N(week[g] || 0)} a week · ${room ? `${N(room)} still to bring` : 'enough for the rest'}</span><span>This phase: ${N(s.used[g] || 0)} of ${N(now0[g] || 0)} used · market ${K(c.market[g].p)}, import ${K(E.OPS.importPrice(c, g))}</span></div>
      ${room ? `<div class="bs-buy"><input type="number" id="sq-${l.id}-${g}" min="1" max="${room}" step="1" value="${q}" aria-label="Amount of ${esc(GOODS[g].name)}"><button class="btn sm navy" data-a="siteBuy" data-lid="${l.id}" data-g="${g}">Buy · ~${M(est)}</button>${src.length ? `<select id="ss-${l.id}-${g}" aria-label="Send from">${src.map((x) => `<option value="${x.id}">${esc(lname(x))} · ${N(x.ops.inv[g])}</option>`).join('')}</select><button class="btn sm" data-a="siteMove" data-lid="${l.id}" data-g="${g}">Send</button>` : ''}</div>` : ''}</div>`; }).join('');
  return `<div class="bs-cap" style="margin-top:8px">Supplies for the ${esc(BLD.phase(s).name.toLowerCase())} and what comes after</div><div class="bs-ms">${rows}</div>
    <p class="bs-small">The crew uses one week's share every game week (${realWeeks(1)}). Without it the site stands still. Bought supplies come from players' offers first, then import, and go straight to the site. ${own && builder ? '' : own ? 'You pay for what you buy.' : 'Your company pays for what you buy.'} Concrete is poured as it arrives, so it never hardens on site.</p>`;
}

// ---------------------------------------------------------------- a construction company's sites
export function builderBox(l, ro) {
  const c = city(); if (!BLD.isBuilder(l)) return '';
  const jobs = BLD.contractsOf(c, l.id), open = BLD.tenders(c).filter((x) => !x.site.c);
  return `<div class="box"><h2>Building sites<small>${jobs.length} OF ${BLD.slots(l)} CREWS</small></h2><div class="in">
    ${jobs.length ? `<div class="rows">${jobs.map((x) => { const st = statusOf(x); return `<button class="row" style="width:100%;text-align:left" data-a="open" data-lid="${x.id}"><span class="thumb" style="background-image:url(${coImg(x)})"></span><div class="grow"><b>${esc(lname(x))} · ${esc(BLD.whereOf(x))}</b><span>${esc(BLD.kindName(x.site))} · ${M(x.site.c.price)} · ${esc(ownerName(c, x))}</span></div><span class="chip ${st.cls}">${esc(st.label)}</span></button>`; }).join('')}</div>` : '<p class="empty">No building work right now.</p>'}
    ${!ro && open.length ? `<div class="cap" style="margin-top:8px">Calls for bids in the city</div><div class="rows">${open.map((x) => `<button class="row" style="width:100%;text-align:left" data-a="open" data-lid="${x.id}"><span class="thumb" style="background-image:url(${coImg(x)})"></span><div class="grow"><b>${esc(lname(x))} · ${esc(BLD.whereOf(x))}</b><span>${esc(BLD.kindName(x.site))} · ${x.site.tender.turnkey ? 'turnkey' : 'labour only'} · ${x.site.bids.length} bid${x.site.bids.length === 1 ? '' : 's'}</span></div><span class="chip warn">Bid</span></button>`).join('')}</div>` : ''}
    <p class="empty" style="font-size:13px">${starTxt(BLD.stars(l))}${l.built ? '' : ''}. Developers hire you through bids on ${HOST}. Each crew runs one site; every level above 1 adds a crew. <a href="#" data-a="webGo" data-u="${HOST}">Open ${HOST} ›</a></p></div></div>`;
}

// ---------------------------------------------------------------- aurexbuild.ab
export function buildSite(u, go) {
  const c = city(), p = me(), page = u.path[0] || '';
  const tabs = [['', 'Projects'], ['builders', 'Builders'], ['mine', 'My sites']];
  const head = `<header class="ab-head"><a href="#" class="ab-logo" data-a="webGo" data-u="${HOST}"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 34V14l10-6v26M16 12h18M30 12v10M28 22h4v4h-4z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg><span><b>AUREX BUILD</b><small>Building plots, tenders and builders</small></span></a>
    <nav class="ab-nav">${tabs.map(([k, t]) => `<a href="#" class="${page === k ? 'on' : ''}" data-a="webGo" data-u="${HOST}${k ? '/' + k : ''}">${t}</a>`).join('')}</nav></header>`;
  let body = '';
  if (page === 'site') {
    const l = E.siteOf(c, u.path[1]);
    body = !l || !l.site ? `<div class="ab-card"><b>Nothing is being built here now.</b>${l ? ` <a href="#" data-a="open" data-lid="${l.id}">Open ${esc(lname(l))} ›</a>` : ''}</div>`
      : `<section class="ab-sitehero" style="background-image:linear-gradient(90deg, rgba(18,20,16,.9), rgba(18,20,16,.45)), url(${coImg(l)})"><small>${esc(BLD.whereOf(l))} · ${esc(l.id)}</small><h1>${esc(lname(l))}</h1><p>${esc(BLD.kindName(l.site))} for ${esc(ownerName(c, l)) || 'whoever buys the plot'}.</p><a href="#" class="ab-btn" data-a="open" data-lid="${l.id}">${BLD.isWh(l) ? 'Open the warehouse' : 'Open the company card'}</a></section><div class="ab-card">${siteHTML(l)}</div>`;
  } else if (page === 'builders') {
    const bs = c.listings.filter((x) => x.type === 'construction');
    body = `<h2 class="ab-h">Construction companies</h2><div class="ab-grid">${bs.map((b2) => `<a href="#" class="ab-tile" data-a="open" data-lid="${b2.id}"><span class="ab-img" style="background-image:url(${coImg(b2)})"></span><b>${esc(lname(b2))}</b><span>${esc(b2.district)} · ${esc(SIZES[b2.size].label)}${BLD.unbuilt(b2) ? ' · still a plot' : ` · ${BLD.slots(b2)} crew${BLD.slots(b2) > 1 ? 's' : ''}`}</span><span>${BLD.unbuilt(b2) ? 'Not built yet' : `${starTxt(BLD.stars(b2))} · ${b2.owner ? `${BLD.freeSlots(c, b2)} free · ${esc(ownerName(c, b2))}` : 'for sale'}`}</span></a>`).join('')}
      <div class="ab-tile city"><b>${esc(B.city.name)}</b><span>${esc(B.city.role)}</span><span>Takes any job, brings its own supplies. About ${Math.round((B.city.markup - 1) * 100)}% dearer and ${Math.round((B.city.slow - 1) * 100)}% slower.</span></div></div>`;
  } else if (page === 'mine') {
    const ctx = ctxOf(c), mine = p ? BLD.sitesOf(c, ctx, p.id) : [], jobs = p ? BLD.all(c).filter((x) => x.site && x.site.c && x.site.c.by !== BLD.CITY && E.canRun(c, p.id, E.listing(c, x.site.c.by))) : [];
    body = `<h2 class="ab-h">My sites</h2>${mine.length ? `<div class="ab-list">${mine.map((x) => siteRow(c, x)).join('')}</div>` : '<p class="ab-sub">You own no building plot or project. Plots are for sale on the map.</p>'}
      <h2 class="ab-h">My jobs as a builder</h2>${jobs.length ? `<div class="ab-list">${jobs.map((x) => siteRow(c, x)).join('')}</div>` : '<p class="ab-sub">No contracts. Run a construction company and bid on calls.</p>'}`;
  } else {
    const plots = BLD.all(c).filter((x) => x.site), calls = plots.filter((x) => x.site.tender && !x.site.c), works = plots.filter((x) => x.site.c), forSale = plots.filter((x) => !x.owner);
    body = `<section class="ab-hero"><small>The city's building register</small><h1>Every new company in Aurex Bay is built by tycoons.</h1><p>Buy a plot, ask construction companies for bids, and watch your company rise week by week. Concrete from the pier, beams and wall elements from Crown Hills.</p></section>
      <div class="ab-facts"><div><b>${calls.length}</b><span>calls for bids</span></div><div><b>${works.length}</b><span>sites at work</span></div><div><b>${forSale.length}</b><span>plots for sale</span></div><div><b>${BLD.builders(c).length}</b><span>builders in business</span></div></div>
      <h2 class="ab-h">Calls for bids</h2>${calls.length ? `<div class="ab-list">${calls.map((x) => siteRow(c, x)).join('')}</div>` : '<p class="ab-sub">No open calls right now.</p>'}
      <h2 class="ab-h">At work</h2>${works.length ? `<div class="ab-list">${works.map((x) => siteRow(c, x)).join('')}</div>` : '<p class="ab-sub">No site is being built right now.</p>'}
      <h2 class="ab-h">Plots for sale</h2>${forSale.length ? `<div class="ab-list">${forSale.map((x) => siteRow(c, x)).join('')}</div>` : '<p class="ab-sub">All plots are taken.</p>'}`;
  }
  return `${head}<div class="ab-wrap">${body}</div>`;
}
function siteRow(c, l) {
  const st = statusOf(l);
  return `<a href="#" class="ab-row" data-a="webGo" data-u="${HOST}/site/${l.id}"><span class="ab-img" style="background-image:url(${coImg(l)})"></span><div><b>${esc(lname(l))}</b><span>${esc(BLD.typeName(l))} · ${esc(BLD.whereOf(l))} · ${esc(SIZES[BLD.sizeOf(l)].label)} · ${esc(BLD.kindName(l.site))}</span><span>${l.owner ? `Developer: ${esc(ownerName(c, l))}` : `Plot for sale · ${M(BLD.isWh(l) ? E.LOG.whPrice(l) : E.listingPrice(l))}`}</span></div><span class="chip ${st.cls}">${esc(st.label)}</span></a>`;
}
