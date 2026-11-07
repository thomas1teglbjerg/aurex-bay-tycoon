// Holdings with divisions (rules in supabase/functions/_shared/holding.js): the holding card on the Network tab
// and the annual report page (Empire › Annual report, UI.company = 'report:h:<id>' or 'report:p:<id>', ':<n>' = an older year).
import * as E from '../supabase/functions/_shared/engine.js';
import { HOLDING, SALARIES, TYPES } from '../supabase/functions/_shared/content.js';
import { city, me, esc, M, dateLabel, shortDate } from './util.js';
import { logoMark } from './brand.js';

const HD = E.HD;
const pct = (v) => `${Math.round(v * 100)}%`;
const name = (c, id) => (c.players[id] || {}).name || '?';

function voteRows(c, p, h, only) {
  const tot = E.holdingShares(h);
  return h.proposals.filter((x) => x.status === 'open' && (!only || only(x))).map((pr) => {
    let yes = 0, no = 0; Object.entries(pr.votes).forEach(([pid, v]) => { const s = h.members[pid] || 0; if (v) yes += s; else no += s; });
    const mine = p.id in pr.votes;
    return `<div class="prop"><b>${esc(E.proposalLabel(c, pr))}</b><span class="muted" style="font-size:13px">${pr.ga ? 'Annual meeting' : `Proposed by ${esc(name(c, pr.by))}`} · yes ${Math.round(yes / tot * 100)}% · no ${Math.round(no / tot * 100)}%${HD.unanimous(pr) ? ' · needs every owner' : ''} · closes in <span data-live="until:${pr.dueM}">…</span></span>
      ${mine ? `<span class="chip">You voted ${pr.votes[p.id] ? 'yes' : 'no'}</span>` : `<div class="btns"><button class="btn sm gold" data-a="vote" data-hid="${h.id}" data-prid="${pr.id}" data-v="1">Vote yes</button><button class="btn sm" data-a="vote" data-hid="${h.id}" data-prid="${pr.id}" data-v="0">Vote no</button></div>`}</div>`;
  }).join('');
}

// the holding card on the Network tab (holdings with divisions)
export function holdingCardHTML(c, p, h, ui) {
  const X = E.hx(c), nav = E.holdingNav(c, h), stake = E.holdingStake(c, h, p.id), ds = HD.divs(c, h), mine = HD.divOf(c, p) === h;
  const own = E.ownedBy(c, 'h', h.id), ceo = HD.ceo(c, h), tot = E.holdingShares(h), owners = Object.keys(h.members);
  const meet = HD.meetingOpen(c, h), fee = meet ? HOLDING.cashOutMeeting : HOLDING.cashOutMid, L = p.life || { wallet: 0 };
  const divRow = (x) => { const e = HD.empire(c, x, X); return `<tr><td><b>${esc(x.id === p.id ? 'You' : x.name)}</b>${x.id === p.id ? '' : ''}</td><td class="num">${E.ownedBy(c, 'p', x.id).length}</td><td class="num">${M(e.cash)}</td><td class="num">${M(e.value)}</td><td class="num">${x.life && x.life.salary ? M(x.life.salary) : '–'}</td></tr>`; };
  const opts = (xs) => xs.map(([v, t, sel]) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const others = ds.filter((x) => x.id !== p.id);
  const eqStake = HD.eqTargets(c, h, 'stake', X), eqNw = HD.eqTargets(c, h, 'nw', X);
  const preview = (tg) => owners.map((id) => `${id === p.id ? 'you' : name(c, id)} ${Math.round(tg[id] / tot * 100)}%`).join(', ');
  const freeAff = c.listings.filter((l) => !l.owner && E.listingPrice(l) <= h.treasury).sort((a, b) => E.listingPrice(b) - E.listingPrice(a));
  const invitable = Object.values(c.players).filter((x) => !x.admin && !x.bot && h.members[x.id] == null && !h.invites.some((i) => i.pid === x.id));
  const last = h.reports && h.reports[0];
  return `<div class="coopcard"><header>${logoMark(E.BR.holdingBrand(h), 40)}<div style="flex:1"><b>${esc(h.name)}</b><div style="font-size:13px;opacity:.85">Holding · ${ds.length} division${ds.length === 1 ? '' : 's'} · founded ${esc(dateLabel(h.createdM))} · buy-in ${M(h.buyIn || E.BR.MIN_STAKE)} · ${h.open ? 'open to all' : 'invited only'}</div></div><span class="chip" style="background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.3)">Your stake ${pct(stake)}</span></header><div class="in">
    ${meet ? `<p class="note"><b>Annual meeting is open</b> · closes in <span data-live="until:${h.ga}">…</span>. Vote below. Selling shares back costs ${pct(HOLDING.cashOutMeeting)} now instead of ${pct(HOLDING.cashOutMid)}.</p>` : ''}
    <div class="stats"><div class="stat"><small>Holding value</small><b class="num">${M(nav)}</b></div><div class="stat"><small>Your stake</small><b class="num">${M(nav * stake)}</b></div><div class="stat"><small>Central account</small><b class="num" data-live="treasury:${h.id}">…</b></div><div class="stat"><small>To central account</small><b class="num">${pct(h.bidrag)} of profit</b></div></div>
    <div class="btns"><button class="btn sm gold" data-a="report" data-v="h:${h.id}${last ? ':0' : ''}">${last ? `Annual report Y${last.y}` : 'Annual report'}</button><button class="btn sm" data-a="report" data-v="h:${h.id}:ytd">Year to date</button></div>
    <div><div class="cap" style="margin-bottom:4px">Divisions</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th style="text-align:left">CEO</th><th class="num">Companies</th><th class="num">Balance</th><th class="num">Value</th><th class="num">Salary / yr</th></tr></thead><tbody>
      ${ds.map(divRow).join('')}
      <tr><td><b>Joint division</b> <span class="muted">· ${esc(ceo === p.id ? 'you' : name(c, ceo))}</span></td><td class="num">${own.length}</td><td class="num">${M(h.treasury)}</td><td class="num">${M(h.treasury + own.reduce((a, l) => a + E.listingValue(l), 0))}</td><td class="num">–</td></tr>
    </tbody></table></div></div>
    <div><div class="cap" style="margin-bottom:5px">Owners</div><div class="stake">${owners.map((id) => `<i style="width:${h.members[id] / tot * 100}%;background:${id === p.id ? 'var(--good)' : (c.players[id] || {}).color}" title="${esc(name(c, id))}"></i>`).join('')}</div>
      <div class="chips" style="margin-top:6px">${owners.map((id) => `<span class="chip">${esc(id === p.id ? 'You' : name(c, id))} ${pct(h.members[id] / tot)} · ${M(h.members[id] / tot * nav)}</span>`).join('')}${h.invites.map((i) => `<span class="chip muted">${esc(name(c, i.pid))} invited</span>`).join('')}</div></div>
    ${own.length ? `<div><div class="cap" style="margin-bottom:4px">Joint division companies</div><div class="rows">${own.map((l) => `<button class="row" style="width:100%;text-align:left" data-a="open" data-lid="${l.id}"><div class="grow"><b>${esc(l.title || TYPES[l.type].name)}</b><span>${esc(l.district)} · Level ${l.level}${l.upgrade ? ' → ' + l.upgrade.to : ''}</span></div><b class="num up">${M(E.listingYield(c, l, l.owner).total, true)}</b></button>`).join('')}</div>
      <div class="field" style="margin-top:8px"><label for="sell-${h.id}">Propose a sale</label><div class="btns" style="flex-wrap:nowrap"><select id="sell-${h.id}">${own.map((l) => `<option value="${l.id}">${esc(TYPES[l.type].name)} · ${esc(l.district)} · ${M(E.listingValue(l) * 0.8)}</option>`).join('')}</select><button class="btn danger" data-a="hsell" data-hid="${h.id}">Propose sale</button></div></div>` : ''}
    ${voteRows(c, p, h) ? `<div class="cap">Open votes</div>${voteRows(c, p, h)}` : ''}

    <div class="cap" style="margin-top:6px">Money</div>
    <p class="muted" style="font-size:13px;margin:0">${mine ? `Your division: ${M(p.cash)}${(h.iloans || {})[p.id] ? ` · owes the central account ${M(h.iloans[p.id])}` : ''} · ` : ''}Your private account: ${M(L.wallet)}${(h.oloans || {})[p.id] ? ` · you lent the holding ${M(h.oloans[p.id])}` : ''}</p>
    <div class="field"><label for="hamt-${h.id}">Amount (M)</label><input id="hamt-${h.id}" type="number" min="0.1" step="0.5" value="${esc(String((ui.hAmt && ui.hAmt[h.id]) || 5))}" inputmode="decimal"></div>
    ${mine ? `<div class="btns" style="flex-wrap:nowrap"><select id="hto-${h.id}">${opts([['h', 'Central account'], ...others.map((x) => [x.id, `${x.name}'s division`])])}</select><button class="btn" data-a="hMoney" data-k="holdingTransfer" data-hid="${h.id}">Send from my division</button></div>
    <div class="btns"><button class="btn sm" data-a="hMoney" data-k="holdingBorrow" data-hid="${h.id}">Borrow from central (${E.CB.rate(c)}%)</button>${(h.iloans || {})[p.id] ? `<button class="btn sm" data-a="hMoney" data-k="holdingRepay" data-hid="${h.id}">Pay back</button>` : ''}</div>` : ''}
    <div class="btns"><button class="btn sm coop" data-a="hMoney" data-k="holdingDeposit" data-hid="${h.id}">Put in private money (new shares)</button><button class="btn sm" data-a="hMoney" data-k="holdingCashOut" data-hid="${h.id}">Sell shares back (−${pct(fee)})</button></div>
    <div class="btns"><button class="btn sm" data-a="hMoney" data-k="holdingLend" data-hid="${h.id}">Lend to the holding</button>${(h.oloans || {})[p.id] ? `<button class="btn sm" data-a="hMoney" data-k="holdingRecall" data-hid="${h.id}">Take my loan back</button>` : ''}<button class="btn sm" data-a="hProp" data-k="dividend" data-hid="${h.id}">Propose this as dividend</button></div>

    <div class="cap" style="margin-top:6px">Decisions</div>
    <div class="field"><label for="hsal-${h.id}">CEO salary</label><div class="btns" style="flex-wrap:nowrap"><select id="hsalp-${h.id}">${opts(ds.map((x) => [x.id, x.id === p.id ? 'You' : x.name]))}</select><select id="hsal-${h.id}">${opts(SALARIES.map((v) => [v, v ? `${M(v)} / yr` : 'No salary', v === (p.life && p.life.salary)]))}</select><select id="hbon-${h.id}">${opts([0, 0.05, 0.1, 0.2].map((v) => [v, v ? `+${pct(v)} bonus` : 'No bonus']))}</select><button class="btn" data-a="hProp" data-k="salary" data-hid="${h.id}">Propose</button></div>
      <span class="muted" style="font-size:12px">Paid monthly from the central account into the CEO's private account. Above ${pct(HOLDING.salaryNav)} of the holding's value (${M(HOLDING.salaryNav * nav)}) a year needs every owner. Bonus = share of the division's profit, paid at New Year.</span></div>
    <div class="field"><label for="hbid-${h.id}">Share of each division's profit to the central account</label><div class="btns" style="flex-wrap:nowrap"><select id="hbid-${h.id}">${opts([0, 0.05, 0.1, 0.15, 0.2, 0.3].map((v) => [v, pct(v), Math.abs(v - h.bidrag) < 0.001]))}</select><button class="btn" data-a="hProp" data-k="bidrag" data-hid="${h.id}">Propose</button></div></div>
    <div class="field"><label for="hceo-${h.id}">CEO of the joint division</label><div class="btns" style="flex-wrap:nowrap"><select id="hceo-${h.id}">${opts(owners.filter((id) => c.players[id] && !c.players[id].bot).map((id) => [id, id === p.id ? 'You' : name(c, id), id === ceo]))}</select><button class="btn" data-a="hProp" data-k="ceo" data-hid="${h.id}">Propose</button></div></div>
    ${owners.length > 1 ? `<div class="field"><label>Equalise net worth</label>
      <div class="btns"><button class="btn sm gold" data-a="hProp" data-k="equalize" data-v="stake" data-hid="${h.id}" title="${esc(preview(eqStake))}">Equal stakes</button><button class="btn sm gold" data-a="hProp" data-k="equalize" data-v="nw" data-hid="${h.id}" title="${esc(preview(eqNw))}">Equal net worth</button><button class="btn sm" data-a="hProp" data-k="autoEq" data-v="${h.autoEq ? '0' : '1'}" data-hid="${h.id}">${h.autoEq ? 'Stop equalising every year' : 'Equalise every year'}</button></div>
      <span class="muted" style="font-size:12px">Equal stakes: ${esc(preview(eqStake))}. Equal net worth (stake + private side): ${esc(preview(eqNw))}. Moves stakes only, needs every owner's yes.</span>
      <div class="btns" style="flex-wrap:nowrap;margin-top:6px"><select id="hgto-${h.id}">${opts(owners.filter((id) => id !== p.id).map((id) => [id, name(c, id)]))}</select><input id="hgpct-${h.id}" type="number" min="1" max="100" step="1" value="5" style="width:70px" aria-label="Percentage points"><button class="btn sm" data-a="hGive" data-hid="${h.id}">Give % of my stake</button></div></div>` : ''}
    ${freeAff.length ? `<div class="field"><label for="buy-${h.id}">Buy for the joint division (central account)</label><div class="btns" style="flex-wrap:nowrap"><select id="buy-${h.id}">${freeAff.map((l) => `<option value="${l.id}">${esc(TYPES[l.type].name)} · ${esc(l.district)} · ${M(E.listingPrice(l))}</option>`).join('')}</select><button class="btn coop" data-a="hpropose" data-hid="${h.id}">Propose</button></div></div>` : ''}
    <div class="field"><label>Buy-in for new owners</label><div class="btns" style="align-items:center"><div class="stepper"><button data-a="hbuyin" data-hid="${h.id}" data-v="-5" aria-label="Lower">−</button><output class="num">${M(h.buyIn || E.BR.MIN_STAKE)}</output><button data-a="hbuyin" data-hid="${h.id}" data-v="5" aria-label="Raise">+</button></div><div class="seg" role="group"><button data-a="hopen" data-hid="${h.id}" data-v="1" aria-pressed="${!!h.open}">Open to all</button><button data-a="hopen" data-hid="${h.id}" data-v="0" aria-pressed="${!h.open}">Invited only</button></div></div></div>
    ${invitable.length ? `<div class="field"><label for="inv-${h.id}">Invite a co-owner</label><div class="btns" style="flex-wrap:nowrap"><select id="inv-${h.id}">${invitable.map((x) => `<option value="${x.id}">${esc(x.name)}${p.net.includes(x.id) ? ' (network)' : ''}</option>`).join('')}</select><button class="btn" data-a="hinvite" data-hid="${h.id}">Invite</button></div></div>` : ''}
    <div class="btns"><button class="btn danger" data-a="hleave" data-hid="${h.id}">${owners.length === 1 ? 'Close the holding (keep everything)' : 'Propose to leave with my division'}</button></div>
  </div></div>`;
}

// ---------------------------------------------------------------- annual report
const LINES = [['Customer sales', 'b2c'], ['Supply sales', 'goods'], ['Contract income (YPI)', 'ypi']];
const COSTS = [['Supplies', 'sup'], ['Freight', 'fr'], ['Wages', 'sal'], ['Department budgets', 'bud'], ['Specialists', 'heads'], ['Maintenance', 'maint']];
function statement(rep) {
  const cols = rep.kind === 'h' ? [...rep.divs.map((d) => [d.name.split(' ')[0], d.acct]), ...(rep.joint && rep.joint.n ? [['Joint', rep.joint.acct]] : [])] : [];
  const head = `<tr><th style="text-align:left">Income statement</th>${cols.length > 1 ? cols.map(([n]) => `<th class="num">${esc(n)}</th>`).join('') : ''}<th class="num">Total</th></tr>`;
  const row = (label, k, cls = '') => `<tr class="${cls}"><td>${label}</td>${cols.length > 1 ? cols.map(([, a]) => `<td class="num">${M(a[k] || 0)}</td>`).join('') : ''}<td class="num">${M(rep.total[k] || 0)}</td></tr>`;
  return `<div class="tbl-wrap"><table class="tbl ac"><thead>${head}</thead><tbody>
    <tr class="ac-h"><td colspan="9">Revenue</td></tr>${LINES.map(([l, k]) => row(l, k)).join('')}${row('Total revenue', 'rev', 'ac-tot')}
    <tr class="ac-h"><td colspan="9">Costs</td></tr>${COSTS.map(([l, k]) => row(l, k)).join('')}${row('Total costs', 'cost', 'ac-tot')}
    ${row('Operating profit', 'profit', `ac-tot ${rep.total.profit >= 0 ? 'pos' : 'neg'}`)}</tbody></table></div>`;
}
export function reportHTML(c, rep, ytd) {
  const per = `${shortDate(rep.m0)} – ${shortDate(rep.m)}`, k = rep.kpi, b = rep.balance;
  const kp = `<div class="kpis sm"><div class="stat"><small>Revenue</small><b class="num">${M(rep.total.rev)}</b></div><div class="stat"><small>Profit</small><b class="num ${rep.total.profit >= 0 ? 'up' : 'down'}">${M(rep.total.profit)}</b></div><div class="stat"><small>Margin</small><b class="num">${k.margin}%</b></div><div class="stat"><small>${rep.kind === 'h' ? 'Holding value' : 'Empire value'}</small><b class="num">${M(rep.nav)}</b></div><div class="stat"><small>Growth</small><b class="num ${k.growth >= 0 ? 'up' : 'down'}">${k.growth >= 0 ? '+' : ''}${k.growth}%</b></div></div>`;
  const divs = rep.kind === 'h' ? `<div class="box"><h2>Management report</h2><div class="in">${rep.divs.map((d) => `<p><b>${esc(d.name)}</b> ran ${d.n} compan${d.n === 1 ? 'y' : 'ies'}: revenue ${M(d.acct.rev)}, profit ${M(d.acct.profit)}. The division went from ${M(d.value0)} to ${M(d.value)}${d.best ? `; best company ${esc(d.best.name)} (${M(d.best.profit)})` : ''}. It paid ${M(d.bid)} to the central account${d.sal ? ` and its CEO earned ${M(d.sal)}` : ''}${d.bonus ? ` plus a ${M(d.bonus)} bonus` : ''}.</p>`).join('')}
    ${rep.joint && rep.joint.n ? `<p><b>Joint division</b> (${esc(name(c, rep.joint.ceo))}): ${rep.joint.n} compan${rep.joint.n === 1 ? 'y' : 'ies'}, profit ${M(rep.joint.acct.profit)}.</p>` : ''}</div></div>` : `<div class="box"><h2>Management report</h2><div class="in"><p>${rep.divs[0].n} compan${rep.divs[0].n === 1 ? 'y' : 'ies'}. The empire went from ${M(rep.nav0)} to ${M(rep.nav)}${rep.divs[0].best ? `; best company ${esc(rep.divs[0].best.name)} (${M(rep.divs[0].best.profit)})` : ''}.${rep.sal ? ` You paid yourself ${M(rep.sal)} a year.` : ''}</p></div></div>`;
  const bal = `<div class="box"><h2>Balance sheet<small>${ytd ? 'today' : 'at year end'}</small></h2><div class="in"><div class="tbl-wrap"><table class="tbl"><tbody>
    <tr><td>Companies</td><td class="num">${M(b.comps)}</td></tr><tr><td>${rep.kind === 'h' ? 'Cash in the divisions' : 'Cash'}</td><td class="num">${M(b.cash)}</td></tr>${rep.kind === 'h' ? `<tr><td>Central account</td><td class="num">${M(b.central)}</td></tr>` : ''}
    <tr><td>Shares on the exchange</td><td class="num">${M(b.stocks)}</td></tr><tr><td>Warehouses and stock</td><td class="num">${M(b.wh)}</td></tr><tr><td>Debt${rep.kind === 'h' ? ' (bank, owner loans)' : ''}</td><td class="num down">−${M(b.debt)}</td></tr>
    <tr class="ac-tot"><td>Equity</td><td class="num">${M(b.nav)}</td></tr></tbody></table></div></div></div>`;
  const own = rep.kind === 'h' ? `<div class="box"><h2>Owners</h2><div class="in"><div class="tbl-wrap"><table class="tbl"><thead><tr><th style="text-align:left">Owner</th><th class="num">Stake at start</th><th class="num">Stake now</th><th class="num">Worth</th></tr></thead><tbody>${rep.owners.map((o) => `<tr><td>${esc(o.name)}</td><td class="num">${pct(o.s0)}</td><td class="num">${pct(o.s1)}</td><td class="num">${M(o.value)}</td></tr>`).join('')}</tbody></table></div>
    <p class="muted" style="font-size:13px">Paid to the central account ${M(rep.flows.bid)} · CEO salaries ${M(rep.flows.sal)} · capital in ${M(rep.flows.dep)} · dividends ${M(rep.flows.div)} · shares sold back ${M(rep.flows.out)}</p></div></div>` : '';
  return `<div class="box"><h2>${esc(rep.name)} · ${ytd ? 'year to date' : `annual report year ${rep.y}`}<small>${esc(per)}</small></h2><div class="in">${kp}${statement(rep)}<p class="muted" style="font-size:13px"><b>Auditor:</b> ${esc(rep.auditor)}</p></div></div>${divs}${bal}${own}`;
}
export function reportPageHTML(ui) {
  const c = city(), p = me(), [, kind, id, which] = String(ui.company).split(':');
  const h = kind === 'h' ? c.holdings[id] : null;
  if (kind === 'h' && (!h || h.members[p.id] == null)) return '<div class="box"><div class="in"><p class="empty">Only the owners read this report.</p></div></div>';
  if (kind === 'p' && id !== p.id) return '<div class="box"><div class="in"><p class="empty">Not your report.</p></div></div>';
  const list = (h ? h.reports : p.reports) || [], ytd = which === 'ytd' || which == null && !list.length, rep = ytd ? E.annualReport(c, kind, id) : list[Number(which) || 0];
  const tabs = `<div class="seg" role="group" style="margin-bottom:10px"><button data-a="report" data-v="${kind}:${id}:ytd" aria-pressed="${ytd}">Year to date</button>${list.map((r, i) => `<button data-a="report" data-v="${kind}:${id}:${i}" aria-pressed="${!ytd && (Number(which) || 0) === i}">Year ${r.y}</button>`).join('')}</div>`;
  const meet = h && HD.meetingOpen(c, h) ? `<div class="box"><h2>Annual meeting<small>closes in <span data-live="until:${h.ga}">…</span></small></h2><div class="in">${voteRows(c, p, h) || '<p class="empty">Nothing on the agenda. Propose a dividend, salaries or other changes under Network.</p>'}<button class="btn sm coop" data-a="tab" data-v="network">Open ${esc(h.name)}</button></div></div>` : '';
  return `<button class="linkbtn" data-a="report" data-v="">‹ Empire</button><h2 class="ph1">Annual report</h2>${tabs}${meet}${rep ? reportHTML(c, rep, ytd) : '<p class="empty">No report yet.</p>'}`;
}
