// Private banks in the browser: each bank's website (rates, borrow, your loans, the bank office), the Lending box on a
// bank's dashboard, the bank list on bankofaurex.ab and the credit committee: a 20-second meeting where the file on an
// applicant is read out line by line before you decide. Rules live in _shared/banks.js (E.BK).
import * as E from '../supabase/functions/_shared/engine.js';
import { BANKS as B, TYPES } from '../supabase/functions/_shared/content.js';
import { city, me, meId, esc, M, coImg, shortDate } from './util.js';

const BK = E.BK;
const pct = (v) => `${Math.round(v * 100) / 100}%`;
const r2 = (v) => Math.round(v * 100) / 100, r4 = (v) => Math.round(v * 1e4) / 1e4;
const sign = (v) => (Math.abs(v) < 0.005 ? '0' : `${v < 0 ? '−' : '+'}${M(Math.abs(v))}`);
// the bank's account: interest in, funding out, losses, net (shared by the bank office and the Lending box)
function accountRows(f, cls) {
  const row = (a, b, k = '') => `<div class="${cls} ${k}"><span>${a}</span><b>${b}</b></div>`;
  return row(`Interest from customers${f.line ? ` <small>avg ${pct(f.avg)}</small>` : ''}`, sign(f.inc))
    + (f.own ? row(`Paid for by your equity <small>${M(f.own)}, no funding cost</small>`, '0') : '')
    + row(`Funding line at the Bank of Aurex <small>${f.line ? `${M(f.line)} at ${pct(f.fr)}` : 'nothing drawn'}</small>`, sign(-f.cost))
    + row('Losses on bad loans this year', f.loss ? sign(-f.loss) : '0')
    + row('<b>Net</b>', `<span class="${f.net < 0 ? 'down' : 'up'}">${sign(f.net)}</span>`, 'net');
}
const pts = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v * 100) / 100)}`;
const ownerName = (c, l) => (!l.owner ? null : l.owner.k === 'p' ? (c.players[l.owner.id] || {}).name : (c.holdings[l.owner.id] || {}).name);

// repay a business loan: 1 M or 5 M at a time (at least B.minRepay), or all of it
export function repayBtns(p, y, cls) {
  const amt = Math.round(y.amt * 1e4) / 1e4, steps = [B.minRepay, 5].filter((v) => v < amt - 0.01);
  return `<span class="repay-btns" style="display:inline-flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${steps.map((v) => `<button class="${cls}" data-a="repay" data-id="${y.id || ''}" data-v="${v}" ${p.cash < v ? 'disabled' : ''}>Repay ${M(v)}</button>`).join('')}<button class="${cls}" data-a="repay" data-id="${y.id || ''}" data-v="${amt}" ${p.cash < amt ? 'disabled' : ''}>${steps.length ? `Repay all ${M(amt)}` : 'Repay'}</button></span>`;
}
// ---------------------------------------------------------------- sites: every bank that lends has one
// host → listing id, for the banks that stand now (Harbor Trust lives under its personal banking site)
export function bankHosts(c = city()) { return Object.fromEntries(BK.lenders(c).filter((l) => !BK.host(l).includes('/')).map((l) => [BK.host(l), l.id])); }
const initials = (l) => BK.name(l).split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join('').slice(0, 3) || 'B';
export function bankMeta(host) {
  const lid = bankHosts()[host]; if (!lid) return null; const l = E.listing(city(), lid);
  return { name: BK.name(l), tag: `${TYPES[l.type].name} · loans and mortgages · ${l.district}`, logo: [initials(l), '#16324f', '#f3c969'], bank: lid };
}
const tabsOf = (base, run) => [['', 'Home'], ['loans', 'Borrow'], ['mine', 'Your loans'], ...(run ? [['office', 'Bank office']] : [])];
export function bankSite(lid, path, base, go) {
  const c = city(), p = me(), l = E.listing(c, lid), x = E.kx(c);
  if (!l || !BK.isLender(l)) return `<div class="pb"><div class="pb-main"><h2>${esc(l ? BK.name(l) : 'Bank')}</h2><p class="pb-small">${l && E.BLD.unbuilt(l) ? 'The bank opens its business desk when the new building is ready.' : 'This bank does not lend right now.'}</p></div></div>`;
  const page = path[0] || '', run = E.canRun(c, meId(), l), own = BK.ownsBank(c, meId());
  const head = `<header class="pb-head"><div class="pb-brand">${go(base, `<span class="pb-logo">${esc(initials(l))}</span><span><b>${esc(BK.name(l))}</b><small>${esc(TYPES[l.type].name)} · ${esc(l.district)}</small></span>`)}</div>
    <nav class="pb-nav">${tabsOf(base, run).map(([k, t]) => go(base + (k ? '/' + k : ''), t, page === k ? 'on' : '')).join('')}</nav></header>`;
  const rate = BK.quote(c, p, l, x), mrate = BK.mRateOf(c, l, x), bk = BK.book(c, l.id), max = BK.bookMax(l), cfg = BK.cfg(c, l), mk = BK.market(c);
  const stat = (k, v, s = '') => `<div class="pb-stat"><small>${k}</small><b>${v}</b>${s ? `<span>${s}</span>` : ''}</div>`;
  const war = (c.bk && c.bk.war) ? Object.entries(c.bk.war).find(([, w]) => w.vs === l.id && w.until > c.g) : null;
  let body = '';
  if (page === 'loans') {
    const offer = BK.offers(c, p, x).find((o) => o.l.id === l.id), cap = E.loanCap(c, p), d = E.debt(p), room = Math.max(0, Math.min(cap - d, offer ? offer.room : 0));
    const pend = (c.bk ? c.bk.apps : []).find((a) => a.pid === meId() && a.lid === l.id && (a.status === 'open' || a.status === 'counter'));
    const pledges = E.ownedBy(c, 'p', meId()).filter((y) => !E.BLD.unbuilt(y) && !p.loans.some((z) => z.pledge === y.id));
    const pl = (UIB.pledge && pledges.some((y) => y.id === UIB.pledge)) ? UIB.pledge : '';
    body = `<h2>Business loans</h2><p class="pb-sub">${run ? 'You run this bank. Its owners borrow from the Bank of Aurex at the market rate.' : `Credit for your companies at ${pct(rate)} a year, fixed for the life of the loan. Repay whenever you like.`}</p>
      <div class="pb-stats">${stat('Our rate for you', pct(rate), run ? `market ${pct(mk)} ${pts(rate - mk)}` : 'fixed for the life of the loan')}${stat('Your credit limit', M(cap), `you owe ${M(d)} in all`)}${stat('You can borrow here', M(room), (cfg.hand && offer && offer.run) || (offer && offer.croom < room) ? 'the bank reviews it first' : 'paid out at once')}</div>
      ${run ? '' : own ? `<div class="pb-card"><p class="pb-small">You own a bank, so the Bank of Aurex lends to you at the market rate. ${go('bankofaurex.ab/loans', 'Borrow there ›', 'pb-more')}</p></div>` : ''}
      ${pend ? `<div class="pb-card pb-note"><h3>Your application</h3><p class="pb-small">${pend.status === 'counter' ? `The bank made you a counter-offer: ${M(pend.amt)} at ${pct(pend.terms.rate)}. Answer it in your mail.` : `${M(pend.amt)} at ${pct(pend.rate)}: waiting for the credit committee.`}</p></div>` : ''}
      ${!run && offer && !offer.closed && !pend ? `<div class="pb-card"><h3>Borrow</h3>
        ${pledges.length ? `<div class="pb-l"><span>Security</span><b><select data-a="bkPledge" aria-label="Pledge a company"><option value="">No pledge</option>${pledges.map((y) => `<option value="${y.id}" ${pl === y.id ? 'selected' : ''}>${esc(BK.name(y))} · ${M(E.listingValue(y))}</option>`).join('')}</select></b></div><p class="pb-small">A pledged company makes a committee more willing to say yes. If you default, the bank takes it.</p>` : ''}
        <div class="pb-btns">${[5, 10, 20, 50].map((v) => `<button class="pb-btn" data-a="loan" data-v="${v}" data-bank="${l.id}" data-pledge="${pl}" ${v > room + 1e-9 ? 'disabled' : ''}>${(cfg.hand && offer.run) || offer.croom < v - 1e-9 ? 'Apply for' : 'Borrow'} ${M(v)}</button>`).join('')}</div></div>` : ''}
      ${offer && offer.closed ? '<div class="pb-card"><p class="pb-small">The bank takes no new loans right now.</p></div>' : ''}
      <div class="pb-card"><h3>How it works</h3><p class="pb-small">Your rate is our rate minus your own discounts (prestige, friends among bankers, the Banker specialisation). One customer may owe us up to ${M(offer && offer.run ? cfg.max : B.max)}. If your company account stays in the red for ${B.arrears} months, the loan defaults: we take a pledged company, and every bank remembers it for ${B.bad} months.</p></div>`;
  } else if (page === 'mine') {
    const mine = p.loans.filter((y) => y.bank === l.id), homes = p.life ? p.life.homes.filter((h) => h.bank === l.id && h.bal > 0) : [];
    body = `<h2>Your loans</h2>
      <div class="pb-card">${mine.length ? mine.map((y) => { const pl = y.pledge && E.listing(c, y.pledge); return `<div class="pb-l" style="flex-wrap:wrap"><span>${M(y.amt)} at ${pct(y.rate)} · since ${esc(shortDate(y.m))}${pl ? ` · pledge: ${esc(BK.name(pl))}` : ''}</span><b>${repayBtns(p, y, 'pb-btn ghost sm')}</b></div>`; }).join('') : '<p class="pb-small">You have no business loans with us.</p>'}</div>
      <div class="pb-card"><h3>Mortgages</h3>${homes.length ? homes.map((h) => `<div class="pb-l"><span>${esc(E.LIFE.HOME[h.hid].name)} · ${pct(h.rate)}</span><b>${M(h.bal)}</b></div>`).join('') + '<p class="pb-small">Pay mortgages off at Harbor Trust, your personal bank.</p>' : '<p class="pb-small">No mortgages with us.</p>'}</div>`;
  } else if (page === 'office' && run) {
    body = officeHTML(c, l, x);
  } else {
    body = `<div class="pb-hero" style="background-image:url(${coImg(l)})"><div><small>${esc(l.district)}</small><h1>${esc(BK.name(l))}</h1><p>${war ? 'Our rates are under pressure from a rival bank.' : 'Loans for companies, mortgages for homes.'}</p>${go(base + '/loans', 'Borrow from us', 'pb-cta')}</div></div>
      <div class="pb-stats">${stat('Business loans', pct(BK.rateOf(c, l, x)), run ? `market ${pct(mk)} ${pts(BK.rateOf(c, l, x) - mk)}` : 'fixed for the life of the loan')}${stat('Mortgages', pct(mrate), run ? `market ${pct(E.LIFE.mortgageRate(c))} ${pts(mrate - E.LIFE.mortgageRate(c))}` : 'fixed rate')}${stat('Lent out', `${M(bk.total)}`, `of ${M(max)}`)}${stat('Run by', esc(ownerName(c, l) || 'the loan officers'), l.owner ? '' : 'no owner yet')}</div>
      <div class="pb-card"><h3>Every bank in the city ${go('bankofaurex.ab/loans', 'Compare ›', 'pb-more')}</h3>${banksTable(c, p, go)}</div>`;
  }
  return `<div class="pb">${head}<div class="pb-main">${body}</div></div>`;
}
export const UIB = { pledge: '' };
// the mortgage a tycoon would get for a home now: the cheapest bank with room (bank owners: the market mortgage rate)
export function mortQuote(c, p, amt) { const r = BK.mortgage(c, p, Math.max(0.01, amt), null, E.kx(c)); return r.ok ? { rate: r.rate ?? E.LIFE.mortgageRate(c), name: r.name } : { rate: E.LIFE.mortgageRate(c), name: null, none: r.msg }; }
function capRow(c, l, x) {
  const k = BK.capital(c, l, x); if (!k.on) return '';
  return `<div class="row"><div class="grow"><b class="${k.short ? 'down' : ''}">Equity ${M(k.cap)}${k.short ? ` · needs ${M(k.need)}` : ''}</b><span>${k.short ? 'No new loans until you put in more' : `room for ${M(Math.min(k.room, Math.max(0, BK.bookMax(l) - BK.book(c, l.id).total)))} more in loans`}</span></div></div>`;
}
// equity: 8% of the risk-weighted loans, put in or taken out by the owner
function capCard(c, l, x) {
  const k = BK.capital(c, l, x), R = Math.round(B.capital.ratio * 100), cash = E.kx(c).cashOf(l.owner);
  const btn = (v) => `<button class="pb-btn ${v > 0 ? '' : 'ghost'} sm" data-a="bkCap" data-lid="${l.id}" data-v="${v}" ${v > 0 ? (cash < v ? 'disabled' : '') : (-v > k.free + 1e-9 ? 'disabled' : '')}>${v > 0 ? 'Put in' : 'Take out'} ${M(Math.abs(v))}</button>`;
  return `<div class="pb-card ${k.short ? 'pb-warn' : ''}"><h3>Equity <em>${R}% of loans, mortgages count half</em></h3>
    <div class="pb-l"><span>Your equity in the bank</span><b>${M(k.cap)}</b></div>
    <div class="pb-l"><span>Needed for today's loans <small>${R}% of ${M(k.w)}</small></span><b class="${k.short ? 'down' : ''}">${M(k.need)}</b></div>
    <div class="pb-l"><span>The bank can lend more</span><b>${M(k.room === Infinity ? 0 : Math.min(k.room, Math.max(0, BK.bookMax(l) - BK.book(c, l.id).total)))}</b></div>
    <div class="pb-btns">${[1, 5, 10].map(btn).join('')}${[-1, -5].map(btn).join('')}</div>
    <p class="pb-small">${k.short ? `Below ${R}%: the bank makes no new loans until you put in ${M(r2(k.need - k.cap))} more.` : `Equity funds part of the loans itself, so the funding line is smaller. Losses come off the equity first. You can take out ${M(k.free)}.`}</p></div>`;
}
// the owner's office: rates, limits, the committee's applications and the loan book
function officeHTML(c, l, x) {
  const cfg = BK.cfg(c, l), mk = BK.market(c), mm = E.LIFE.mortgageRate(c), bk = BK.book(c, l.id), max = BK.bookMax(l), f = BK.funding(c, l, x);
  const apps = (c.bk ? c.bk.apps : []).filter((a) => a.lid === l.id && a.status === 'open');
  const war = c.bk && Object.values(c.bk.war || {}).find((w) => w.vs === l.id && w.until > c.g);
  const step = (k, cur, d, lo, hi) => `<button class="pb-btn ghost sm" data-a="bkSet" data-lid="${l.id}" data-k="${k}" data-v="${Math.round((cur + d) * 100) / 100}" ${cur + d < lo - 1e-9 || cur + d > hi + 1e-9 ? 'disabled' : ''}>${d > 0 ? '+' : '−'}${Math.abs(d)}</button>`;
  const loans = Object.values(c.players).flatMap((p) => p.loans.filter((y) => y.bank === l.id).map((y) => ({ p, y }))).sort((a, b) => b.y.amt - a.y.amt);
  const homes = Object.values(c.players).flatMap((p) => ((p.life && p.life.homes) || []).filter((h) => h.bank === l.id && h.bal > 0).map((h) => ({ p, h })));
  return `<h2>Bank office</h2><p class="pb-sub">You set the margin over the market rate (${pct(mk)}, set by the Bank of Aurex). Loans keep the rate they were made at. What the bank lends it draws on its funding line at the Bank of Aurex, which follows the market rate.</p>
    ${war ? `<div class="pb-card pb-warn"><h3>Rate war</h3><p class="pb-small">${esc((c.players[war.bid] || {}).name || 'A rival')}'s bank lends at market ${pts(war.sp)} and takes over loans from tycoons who bank with you. Cut your margin, or wait it out.</p></div>` : ''}
    <div class="pb-stats"><div class="pb-stat"><small>Net a year</small><b class="${f.net < 0 ? 'down' : 'up'}">${f.net < 0 ? '−' : '+'}${M(Math.abs(f.net))}</b><span>${f.line ? `${pts(r2(f.avg - f.fr))} pts margin` : 'nothing lent out yet'}</span></div><div class="pb-stat"><small>Lent out</small><b>${M(bk.total)}</b><span>of ${M(max)}</span></div><div class="pb-stat"><small>Customers</small><b>${bk.n}</b><span>loans and mortgages</span></div></div>
    ${capCard(c, l, x)}
    <div class="pb-card"><h3>What the bank earns <em>a year, at today's rates</em></h3>${accountRows(f, 'pb-l')}
      <p class="pb-small">${f.line ? `If the market rate rises 1 point, the net falls by ${M(f.shock)} to ${sign(r4(f.net - f.shock))}: your loans keep their rate, the funding line does not.` : 'Nothing lent out yet: the funding line is empty and costs nothing.'}${f.lossLast ? ` Losses last year: ${M(f.lossLast)}.` : ''}</p></div>
    <div class="pb-card"><h3>Business loans <em>${pct(BK.rateOf(c, l, x))}</em></h3><div class="pb-l"><span>Market ${pct(mk)} + your margin</span><b>${pts(cfg.sp)} pts</b></div>
      <div class="pb-btns">${step('sp', cfg.sp, -0.5, B.range[0], B.range[1])}${step('sp', cfg.sp, -0.25, B.range[0], B.range[1])}${step('sp', cfg.sp, 0.25, B.range[0], B.range[1])}${step('sp', cfg.sp, 0.5, B.range[0], B.range[1])}</div></div>
    <div class="pb-card"><h3>Mortgages <em>${pct(BK.mRateOf(c, l, x))}</em></h3><div class="pb-l"><span>Market mortgage rate ${pct(mm)} + your margin</span><b>${pts(cfg.msp)} pts</b></div>
      <div class="pb-btns">${step('msp', cfg.msp, -0.5, B.mRange[0], B.mRange[1])}${step('msp', cfg.msp, -0.25, B.mRange[0], B.mRange[1])}${step('msp', cfg.msp, 0.25, B.mRange[0], B.mRange[1])}${step('msp', cfg.msp, 0.5, B.mRange[0], B.mRange[1])}</div><p class="pb-small">The bank keeps the margin on every mortgage payment.</p></div>
    <div class="pb-card"><h3>Lending rules</h3>
      <div class="pb-l"><span>Most one customer may owe the bank</span><b>${M(cfg.max)}</b></div><div class="pb-btns">${[10, 25, 50, 100].map((v) => `<button class="pb-btn ${cfg.max === v ? '' : 'ghost'} sm" data-a="bkSet" data-lid="${l.id}" data-k="max" data-v="${v}">${M(v)}</button>`).join('')}</div>
      <div class="pb-l"><span>Applications</span><b>${cfg.hand ? 'The credit committee decides' : 'Loan officers approve at once'}</b></div><div class="pb-btns"><button class="pb-btn ${cfg.hand ? '' : 'ghost'} sm" data-a="bkSet" data-lid="${l.id}" data-k="hand" data-v="${!cfg.hand}">${cfg.hand ? 'Let the loan officers decide' : 'Review every application yourself'}</button><button class="pb-btn ghost sm" data-a="bkSet" data-lid="${l.id}" data-k="open" data-v="${!cfg.open}">${cfg.open ? 'Stop new loans' : 'Take new loans again'}</button></div>
      <p class="pb-small">Loan officers approve a credit score of ${Math.round(B.auto * 100)} or more within your limits. Rival tycoons ask for loans more often when you review them yourself.</p></div>
    <div class="pb-card"><h3>Credit committee <em>${apps.length} waiting</em></h3>${apps.length ? apps.map((a) => appRow(c, a)).join('') : '<p class="pb-small">No applications right now.</p>'}</div>
    ${loanBook(c, l, mk, loans, homes)}`;
}
// the loan book: what the bank's loans have earned the owner in all, the loans it holds now and the ones that are closed
const HOW = { repaid: 'paid off', default: 'defaulted', seized: 'defaulted, pledge taken', foreclosed: 'foreclosed', moved: 'moved to another bank' };
const pl = (v, cls = true) => `<b class="${cls ? (v < -0.0005 ? 'down' : v > 0.0005 ? 'up' : '') : ''}">${Math.abs(v) < 0.0005 ? '0' : sign(v)}</b>`;
function loanBook(c, l, mk, loans, homes) {
  const e = BK.earned(c, l) || { total: 0, earn: 0, eq: 0, loss: 0, m0: c.m, open: [], past: [] };
  const got = (key) => (e.open.find((z) => z.key === key) || { earn: 0, loss: 0 });
  const sub = (v) => `<small class="${v < -0.0005 ? 'down' : 'up'}">${Math.abs(v) < 0.0005 ? 'earned 0' : `earned ${sign(v)}`}</small>`;
  const nowRows = loans.map(({ p, y }) => { const pg = y.pledge && E.listing(c, y.pledge), g = got(y.id); return `<div class="pb-l"><span>${esc(p.name)} · ${pct(y.rate)} · since ${esc(shortDate(y.m ?? c.m))}${pg ? ` · pledge ${esc(BK.name(pg))}` : ''}${BK.badRecord(c, p.id) ? ' · <i class="down">late before</i>' : ''}<br>${sub(g.earn - g.loss)}</span><b class="${y.rate < mk ? 'down' : ''}">${M(y.amt)}</b></div>`; }).join('')
    + homes.map(({ p, h }) => { const g = got(`h:${h.uid}`); return `<div class="pb-l"><span>${esc(p.name)} · mortgage ${esc(E.LIFE.HOME[h.hid].name)} · ${pct(h.rate)}<br>${sub(g.earn - g.loss)}</span><b>${M(h.bal)}</b></div>`; }).join('');
  const pastRows = e.past.map((z) => `<div class="pb-l"><span>${esc(z.name)} · ${z.k === 'home' ? `mortgage ${esc((E.LIFE.HOME[z.hid] || {}).name || 'home')}` : 'loan'} ${M(z.amt)}${z.rate != null ? ` at ${pct(z.rate)}` : ''}<br><small>${esc(shortDate(z.m0))} – ${esc(shortDate(z.m1))} · ${HOW[z.how] || z.how}${z.loss > 0.0005 ? ` · lost ${M(z.loss)}` : z.loss < -0.0005 ? ` · pledge worth ${M(-z.loss)} more than the loan` : ''}</small></span>${pl(z.earn - z.loss)}</div>`).join('');
  const pastSum = e.past.reduce((a, z) => a + z.earn - z.loss, 0);
  return `<div class="pb-card"><h3>Loan book <em>since ${esc(shortDate(e.m0))}</em></h3>
    <div class="pb-stats"><div class="pb-stat"><small>Earned in all</small><b class="${e.total < -0.0005 ? 'down' : 'up'}">${Math.abs(e.total) < 0.0005 ? '0' : sign(e.total)}</b><span>${e.past.length} closed, ${loans.length + homes.length} open</span></div></div>
    <div class="pb-acct"><div class="pb-al"><span>Margin on loans and mortgages <small>over the funding line</small></span>${pl(e.earn)}</div>${e.eq > 0.0005 ? `<div class="pb-al"><span>Your equity's return <small>no funding cost on it</small></span>${pl(e.eq)}</div>` : ''}<div class="pb-al"><span>Losses on bad loans</span>${pl(-e.loss)}</div><div class="pb-al net"><span><b>Earned in all</b></span>${pl(e.total)}</div></div>
    <h3 style="margin-top:14px">Open loans <em>${loans.length + homes.length}</em></h3>
    ${nowRows || '<p class="pb-small">Nobody owes the bank anything yet.</p>'}
    <h3 style="margin-top:14px">Earlier loans <em>${e.past.length ? `${e.past.length} · ${Math.abs(pastSum) < 0.0005 ? '0' : sign(pastSum)}` : 'none yet'}</em></h3>
    ${pastRows || '<p class="pb-small">Loans that are paid off, defaulted or moved show here with what each one earned or lost.</p>'}
    <p class="pb-small">Counted from ${esc(shortDate(e.m0))}${e.m0 > 0 ? ', when you took over the bank or the loan book started keeping accounts' : ''}. Earned = the rate the customer pays minus the funding line, less any loss.</p></div>`;
}
function appRow(c, a) {
  const p = c.players[a.pid], pl = a.pledge && E.listing(c, a.pledge);
  return `<div class="pb-app"><div><b>${esc(p ? p.name : 'Unknown')}</b><span>${M(a.amt)} at ${pct(a.rate)}${pl ? ` · pledge ${esc(BK.name(pl))}` : ' · unsecured'} · the officers decide in ${Math.max(0, Math.ceil((a.due - c.g) * 48))} wk</span></div><button class="pb-btn sm" data-a="bkCredit" data-app="${a.id}">Hold the meeting</button></div>`;
}
// every bank, cheapest first, with what it would charge you
export function banksTable(c, p, go) {
  const offs = BK.offers(c, p, E.kx(c)), mine = BK.lenders(c).filter((l) => E.canRun(c, meId(), l));
  if (!offs.length && !mine.length) return `<p class="pb-small">No bank stands in the city right now. The Bank of Aurex lends as last resort at the market rate + ${B.lastResort}.</p>`;
  return `<div class="pb-tab">${offs.map((o) => `<div class="pb-l"><span>${go(BK.host(o.l), esc(BK.name(o.l)), 'pb-more')} · ${esc(o.l.district)}${o.closed ? ' · closed for new loans' : o.hand ? ' · committee decides' : ''}</span><b>${pct(o.rate)}</b></div>`).join('')}${mine.map((l) => `<div class="pb-l"><span>${go(BK.host(l), esc(BK.name(l)), 'pb-more')} · your bank</span><b>${pct(BK.rateOf(c, l, E.kx(c)))}</b></div>`).join('')}</div>`;
}

// ---------------------------------------------------------------- the Lending box on a bank's company page
export function lendingBox(c, l, ro) {
  if (!BK.isLender(l)) return '';
  const x = E.kx(c), bk = BK.book(c, l.id), apps = (c.bk ? c.bk.apps : []).filter((a) => a.lid === l.id && a.status === 'open'), f = BK.funding(c, l, x);
  return `<div class="box" id="lending-box"><h2>Lending<small>${apps.length ? `${apps.length} WAITING` : 'BANK'}</small></h2><div class="in">
    <div class="rows"><div class="row"><div class="grow"><b>Business loans at ${pct(BK.rateOf(c, l, x))}</b><span>market ${pct(BK.market(c))} ${pts(BK.spreadOf(c, l, x))} · mortgages ${pct(BK.mRateOf(c, l, x))}</span></div></div>
    <div class="row"><div class="grow"><b>${M(bk.total)} lent out of ${M(BK.bookMax(l))}</b><span>${bk.n} loan${bk.n === 1 ? '' : 's'} · ${f.own ? `${M(f.own)} from equity, ` : ''}${M(f.line)} on the funding line at the Bank of Aurex</span></div></div>
    ${capRow(c, l, x)}${(() => { const e = BK.earned(c, l); return e && !ro ? `<div class="row"><div class="grow"><b>Earned in all: <span class="${e.total < -0.0005 ? 'down' : 'up'}">${Math.abs(e.total) < 0.0005 ? '0' : sign(e.total)}</span></b><span>since ${esc(shortDate(e.m0))} · ${e.past.length} closed loan${e.past.length === 1 ? '' : 's'} in the loan book</span></div></div>` : ''; })()}</div>
    <div class="pb-acct">${accountRows(f, 'pb-al')}</div>
    ${f.line ? `<p class="small" style="margin:6px 0 0">If the market rate rises 1 point: net ${sign(r4(f.net - f.shock))} a year.</p>` : ''}
    ${ro ? '' : apps.map((a) => appRow(c, a)).join('')}
    ${ro ? '' : `<div class="btns"><button class="btn sm gold" data-a="webGo" data-u="${esc(BK.host(l))}/office">Open the bank office</button></div>`}</div></div>`;
}

// ---------------------------------------------------------------- the credit committee: 20 seconds with the file
const SECS = 20;
let CC = null;
function css() {
  if (document.getElementById('credit-css')) return;
  const s = document.createElement('style'); s.id = 'credit-css';
  s.textContent = `#credit { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; background: rgba(10,20,35,0.6); padding: 16px; }
  #credit .cc { width: min(560px, 100%); max-height: calc(100vh - 32px); overflow: auto; background: var(--panel); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.35); padding: 18px; }
  #credit h2 { margin: 0 0 2px; font-family: var(--head); font-size: 19px; } #credit .cc-sub { color: var(--ink-2); font-size: 13.5px; margin: 0 0 10px; }
  #credit .cc-file { display: flex; flex-direction: column; gap: 8px; min-height: 230px; }
  #credit .cc-line { display: flex; gap: 10px; align-items: flex-start; animation: ccIn .35s ease both; }
  #credit .cc-av { flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 13px; }
  #credit .cc-line b { display: block; font-size: 12.5px; color: var(--ink-2); } #credit .cc-line p { margin: 1px 0 0; font-size: 14px; }
  #credit .cc-line.warn p { color: var(--bad); } #credit .cc-line.good p { color: var(--good); }
  #credit .cc-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; } #credit .cc-opts button { text-align: left; display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; }
  #credit .cc-opts button span { font-size: 12px; font-weight: 600; opacity: 0.8; } #credit .cc-msg { margin-top: 10px; font-weight: 700; min-height: 20px; }
  @keyframes ccIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  @media (max-width: 480px) { #credit .cc-opts { grid-template-columns: 1fr; } }`;
  document.head.appendChild(s);
}
const CAST = [['Risk officer', '#c0392b'], ['Relationship manager', '#2f6fb0'], ['Head of lending', '#2e8b57']];
// the file, read out by the committee: facts first, then what each member makes of them
function script(c, a, d) {
  const L = [], say = (who, t, k = '') => L.push({ who, t, k });
  say(1, `${d.name}${d.bot ? `, ${d.title}` : ''} asks for ${M(d.amt)} at ${pct(d.rate)}: ${pts(d.margin)} points over the market rate.`);
  say(0, d.use > 0.85 ? `That takes them to ${Math.round(d.use * 100)}% of their credit limit. Very little room left.` : d.use > 0.6 ? `That uses ${Math.round(d.use * 100)}% of their credit limit.` : `Plenty of room: ${Math.round(d.use * 100)}% of their credit limit after this loan.`, d.use > 0.85 ? 'warn' : d.use < 0.5 ? 'good' : '');
  say(2, d.income < 0 ? `Their companies lose ${M(-d.income)} a year after costs.` : d.income < 0.05 ? `Their companies earn next to nothing yet. Net worth ${M(d.nw)}.` : `Their companies make ${M(d.income)} a year after costs. Net worth ${M(d.nw)}.`, d.income < 0 ? 'warn' : d.income < 0.05 ? '' : 'good');
  say(0, d.bad ? 'They defaulted on a loan this past year.' : d.def ? `There is an old default on file (${d.def}).` : d.paid ? `They paid back ${d.paid} loan${d.paid === 1 ? '' : 's'} in full. Clean record.` : 'No record with any bank yet.', d.bad ? 'warn' : d.paid ? 'good' : '');
  if (d.bot && d.traits.length) { const t = d.traits.join(', ').toLowerCase(); say(1, `People say about them: ${t}.`, /risk|bluff|bet/.test(t) ? 'warn' : /patient|careful|honest|loyal/.test(t) ? 'good' : ''); }
  say(2, d.pledge ? `They pledge ${d.pledge.name}, worth ${M(d.pledge.value)}. If they default, it is ours.` : 'No security offered. In a default we collect only part of it.', d.pledge ? 'good' : '');
  if (d.econ === 'Recession' || d.econ === 'Crisis') say(0, `The economy is in ${d.econ.toLowerCase()}. More loans go bad now.`, 'warn');
  if (d.rel != null) say(1, d.rel >= 40 ? 'They count you as a friend. A yes will be remembered.' : d.rel <= -15 ? 'Things between you are cool. They may hold a no against you.' : 'You know each other, nothing more.');
  say(0, `Our model gives them ${Math.round(d.score * 100)} out of 100. The loan officers approve at ${Math.round(B.auto * 100)}.`, d.score >= B.auto ? 'good' : 'warn');
  return L;
}
function render(tickOnly) {
  const el = document.getElementById('credit') || Object.assign(document.createElement('div'), { id: 'credit' });
  const t = Math.min(1, (Date.now() - CC.start) / (SECS * 1000)), n = CC.done ? CC.lines.length : Math.min(CC.lines.length, Math.floor(t * (CC.lines.length + 0.5)) + 1);
  const decide = t >= 1 || CC.done, key = `${n}:${decide}:${CC.msg || ''}`;
  if (tickOnly && key === CC.key && el.parentNode) { const bar = el.querySelector('.bar i'), sub = el.querySelector('.cc-sub'); if (bar) bar.style.width = (t * 100).toFixed(1) + '%'; if (sub) sub.textContent = `${CC.d.name} · ${M(CC.d.amt)} · ${Math.ceil(SECS * (1 - t))} s`; return; }
  CC.key = key;
  const lines = CC.lines.slice(0, n).map((x) => `<div class="cc-line ${x.k}"><span class="cc-av" style="background:${CAST[x.who][1]}">${CAST[x.who][0][0]}</span><div><b>${CAST[x.who][0]}</b><p>${esc(x.t)}</p></div></div>`).join('');
  const d = CC.d, canPledge = !d.pledge && E.ownedBy(city(), 'p', CC.pid).some((l) => !E.BLD.unbuilt(l));
  el.innerHTML = `<div class="cc" role="dialog" aria-label="Credit committee"><h2>Credit committee · ${esc(CC.bank)}</h2><p class="cc-sub">${esc(d.name)} · ${M(d.amt)} · ${decide ? 'your call' : `${Math.ceil(SECS * (1 - t))} s`}</p>
    ${decide ? '' : `<div class="bar"><i style="width:${(t * 100).toFixed(1)}%"></i></div>`}
    <div class="cc-file" aria-live="polite">${lines}</div>
    ${CC.msg ? `<div class="cc-msg">${esc(CC.msg)}</div><div class="btns" style="justify-content:flex-end"><button class="btn gold" data-cc="close">Close</button></div>`
    : decide ? `<div class="cc-opts"><button class="btn gold" data-cc="ok"><b>Approve</b><span>${M(d.amt)} at ${pct(d.rate)}</span></button><button class="btn" data-cc="rate"><b>Counter: +${B.counter} points</b><span>${pct(d.rate + B.counter)}, they may walk away</span></button>
      ${canPledge ? `<button class="btn" data-cc="pledge"><b>Ask for a pledge</b><span>their best company as security</span></button>` : ''}<button class="btn" data-cc="no"><b>Decline</b><span>no loan</span></button></div>`
    : `<div class="btns" style="justify-content:flex-end;margin-top:10px"><button class="btn sm" data-cc="close">Leave it to the loan officers</button></div>`}</div>`;
  if (!el.parentNode) { document.body.appendChild(el); el.addEventListener('click', onClick); }
}
async function onClick(e) {
  const b = e.target.closest('[data-cc]'); if (!b || !CC) return;
  const v = b.dataset.cc; if (v === 'close') { closeCredit(); return; }
  if (CC.busy) return; CC.busy = true;
  const r = await CC.act('bkDecide', { app: CC.app, v });
  if (!CC) return; CC.busy = false; CC.done = true; CC.msg = r && r.msg ? r.msg : 'Done.'; render();
}
export function closeCredit() { if (CC) clearInterval(CC.timer); CC = null; const el = document.getElementById('credit'); if (el) el.remove(); }
export function openCredit(appId, act) {
  const c = city(), a = c.bk && c.bk.apps.find((x) => x.id === appId && x.status === 'open'); if (!a) return false;
  const d = BK.dossier(c, a, E.kx(c)); if (!d) return false;
  closeCredit(); css();
  CC = { app: a.id, pid: a.pid, act, d, bank: BK.name(E.listing(c, a.lid)), lines: script(c, a, d), start: Date.now(), done: false };
  render(); CC.timer = setInterval(() => { if (!CC) return; if (!CC.done && Date.now() - CC.start <= SECS * 1000 + 600) render(true); }, 250);
  return true;
}
