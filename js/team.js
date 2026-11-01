// Your team of specialists: contracts, salaries, stress, boredom, satisfaction, scouting and transfers.
import * as E from '../supabase/functions/_shared/engine.js';
import { STAFF, TALENT, TALENT_RULES as R, TYPES } from '../supabase/functions/_shared/content.js';
import { city, me, meId, esc, M, dur, msUntilMonth } from './util.js';

const T = E.TAL;
const KIND_COL = { marco: '#8a6a3a', michael: '#2f6fb0', anika: '#16a085', sofia: '#c0392b', robert: '#6b4f2a', emily: '#8e44ad', carlos: '#d35400', jason: '#1b2b44' };
export const stars = (n) => '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i>';
export function portrait(tid, cls = '') {
  const t = T.PERSON[tid], ini = t.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  return t.img ? `<span class="tp ${cls}" style="background-image:url(img/s-${tid}.jpg?v=2)"></span>` : `<span class="tp ${cls} ini" style="--kc:${KIND_COL[t.kind]}">${esc(ini)}</span>`;
}
const yrs = (months) => (months >= 12 ? `${Math.floor(months / 12)} yr${months % 12 ? ` ${months % 12} mo` : ''}` : `${Math.max(0, months)} mo`);
function meter(label, v, bad) { const lvl = bad ? (v > 75 ? 'bad' : v > 55 ? 'warn' : 'ok') : (v < 35 ? 'bad' : v < 55 ? 'warn' : 'ok'); return `<div class="tm ${lvl}"><span>${label}</span><div class="bar"><i style="width:${Math.round(v)}%"></i></div><b>${Math.round(v)}</b></div>`; }
const moodChip = (s) => { const m = T.mood(s); const cls = /notice|Burned|burnout|Unhappy/.test(m) ? 'bad' : /Bored/.test(m) ? 'warn' : /Thriving/.test(m) ? 'good' : ''; return `<span class="chip ${cls}">${esc(m)}</span>`; };

// ---------------------------------------------------------------- Empire: your team
export function teamBoxHTML() {
  const c = city(), p = me(); if (!c.talent) return '';
  const rows = STAFF.map((role) => {
    const tid = p.team && p.team[role.id], s = tid && c.talent[tid];
    if (!tid || !s || s.owner !== p.id) return `<button class="trow empty" data-a="web" data-u="apextalent.ab/role/${role.id}"><span class="tp ini empty">+</span><div class="grow"><b>${esc(role.role.replace(/^(Junior|Senior) /, ''))}</b><span>Open role · leads ${esc(E.OPS.DEPT[E.OPS.DEPTS_BY_HEAD[role.id]].name)}</span></div><span class="chip">Find ›</span></button>`;
    const a = p.assign && p.assign[role.id], al = a ? E.listing(c, a.lid) : null, left = s.until - c.m;
    return `<button class="trow" data-a="staff" data-id="${tid}">${portrait(tid)}<div class="grow"><b>${esc(T.PERSON[tid].name)} <em class="stars">${stars(s.rating)}</em></b><span>${esc(T.title(c, tid))} · ${al ? `heads ${esc(TYPES[al.type].name)}` : 'not assigned'}</span>
      <div class="tmini">${meter('Stress', s.stress, true)}${meter('Bored', s.boredom, true)}${meter('Happy', s.sat)}</div></div>
      <div class="right"><b>${M(s.salary)}/yr</b><span class="${left <= 6 ? 'down' : ''}">${yrs(left)} left</span>${moodChip(s)}</div></button>`;
  }).join('');
  const offers = (c.tOffers || []).filter((o) => o.status === 'open' && o.to === p.id);
  return `<div class="box"><h2>Your team<small>${T.teamOf(c, p).length} OF ${STAFF.length} ROLES</small></h2><div class="in">
    ${offers.map((o) => `<div class="task urgent"><div class="grow"><b>${esc(c.players[o.from].name)} bids ${M(o.fee)} for ${esc(T.PERSON[o.tid].name)}</b><span>Offering them ${M(o.salary)}/yr for ${o.years} yr. Answer within ${dur(msUntilMonth(o.m + R.offerMonths))}.</span></div><div class="btns"><button class="btn sm gold" data-a="tOfferAccept" data-oid="${o.id}">Sell</button><button class="btn sm" data-a="tOfferDecline" data-oid="${o.id}">Keep</button></div></div>`).join('')}
    <p class="empty" style="font-size:13.5px">Specialists head one department each. Pay them right, keep their workload in check and give them new challenges, or they burn out, get bored and leave. Contracts run for a fixed number of years.</p>
    <div class="rows">${rows}</div><button class="btn navy" data-a="web" data-u="apextalent.ab">Scout specialists on Apex Talent</button></div></div>`;
}

// ---------------------------------------------------------------- the specialist card
export function talentModal(st) {
  const c = city(), p = me(), tid = st.id, t = T.PERSON[tid], s = c.talent[tid]; if (!t) return '';
  const role = T.ROLE[t.kind], mine = s.owner === p.id, owner = s.owner ? c.players[s.owner] : null, seen = T.scouted(c, p, tid), ask = T.ask(c, tid);
  const sal = st.salary ?? (mine ? s.salary : Math.round(ask * (owner ? 1.15 : 1) * 100) / 100), years = st.years ?? 2, fee = st.fee ?? Math.round(T.value(c, tid) * 100) / 100;
  const ovr = 40 + 9 * s.rating + Math.min(9, Math.floor(s.xp / 6)), known = seen || !owner || mine;
  const head = `<div class="dz-hero tall ${t.img ? '' : 'noimg'}" ${t.img ? `style="background-image:url(img/s-${tid}.jpg?v=2)"` : `style="--kc:${KIND_COL[t.kind]}"`} role="img" aria-label="${esc(t.name)}">${t.img ? '' : `<span class="dz-ini">${esc(t.name.split(' ').map((w) => w[0]).join('').slice(0, 2))}</span>`}<span class="dz-ovr" title="Overall rating">${ovr}</span>${s.listed != null ? `<span class="dz-coord">Transfer listed · ${M(s.listed)}</span>` : ''}</div>
    <div class="dz-body"><div class="dz-title"><div><span class="dz-k">${esc(T.title(c, tid))}</span><h2>${esc(t.name)}</h2><span class="dz-sub">${owner ? (mine ? 'On your team' : `Works for ${esc(owner.name)}`) : 'Free agent'}${s.owner ? ` · ${yrs(s.until - c.m)} left` : ''} · <em class="stars">${stars(s.rating)}</em></span></div>
      <div class="dz-price"><span>${s.owner ? 'Salary' : 'Asks'}</span><b>${s.owner ? (known ? M(s.salary) : '?') : M(ask)}<small>/yr</small></b></div></div>
    ${t.bio ? `<p class="dz-bio">${esc(t.bio)}</p>` : ''}<p class="dz-pass"><b>${esc((t.passive || role.passive)[0])}.</b> ${esc((t.passive || role.passive)[1])}</p>${t.passive ? `<p class="dz-pass dim">Role: ${esc(role.passive[1])}</p>` : ''}`;
  const bar = (label, v, bad) => { const col = bad ? (v > 75 ? 'var(--bad)' : v > 55 ? '#e8b25f' : '#8fa3b8') : (v < 35 ? 'var(--bad)' : v < 55 ? '#e8b25f' : 'var(--good)'); return `<div class="dz-m"><div><span>${label}</span><b>${Math.round(v)}</b></div><i><u style="width:${Math.round(v)}%;background:${col}"></u></i></div>`; };
  const stats = known ? `<div class="dz-meters">${bar('Satisfaction', s.sat)}${bar('Stress', s.stress, true)}${bar('Boredom', s.boredom, true)}<div class="dz-m mood"><div><span>Mood</span></div>${moodChip(s)}</div></div>` : `<div class="tlock">Scout ${esc(t.name.split(' ')[0])} to see stress, boredom and satisfaction. <button class="btn sm" data-a="tScout" data-tid="${tid}">Scout · ${M(R.scoutFee)}</button></div>`;
  const facts = `<div class="dz-tiles">${s.owner ? `<div><span>Transfer value</span><b>${M(T.value(c, tid))}</b></div>` : `<div><span>Signing fee</span><b>${M(T.signFee(c, p, tid))}</b></div>`}<div><span>Asks</span><b>${M(ask)}</b></div><div><span>Head bonus</span><b>+${Math.round(T.headBonus(s.rating) * 100)}%</b></div><div><span>Experience</span><b>${s.xp} mo</b></div></div>
    <div class="dz-band">As department head</div><p class="dz-pass">${esc(role.hq)} <b>Leadership: +${M(T.headYpi(s.rating))} YPI a year</b> in the company they lead (Small ×0.6, Large ×1.5).</p>`;
  const step = (k, v, a) => `<div class="stepper"><button data-a="tStep" data-k="${k}" data-v="-1" aria-label="Less">−</button><output>${v}</output><button data-a="tStep" data-k="${k}" data-v="1" aria-label="More">+</button></div>`;
  const yearsSeg = `<div class="seg">${[1, 2, 3, 4].map((y) => `<button data-a="tYears" data-v="${y}" aria-pressed="${years === y}">${y} yr</button>`).join('')}</div>`;
  let actions = '';
  if (mine) {
    const a = p.assign && p.assign[t.kind], al = a ? E.listing(c, a.lid) : null, left = s.until - c.m;
    actions = `<div class="tact"><p class="empty">${al ? `Heads ${esc(E.OPS.DEPT[a.dept].name)} at ${esc(TYPES[al.type].name)}, ${esc(al.district)}.` : 'Not leading a department. Open a company and make them head of their department.'}${s.leave != null ? ' On leave right now.' : ''}${s.notice != null ? ` <b class="down">Leaves in ${dur(msUntilMonth(s.notice))} unless things improve.</b>` : ''}</p>
      <div class="set"><span class="cap">Salary per year (asks ${M(ask)})</span><div class="btns">${step('salary', M(sal))}<button class="btn sm gold" data-a="tSalary" data-tid="${tid}" data-v="${sal}" ${Math.abs(sal - s.salary) < 0.005 ? 'disabled' : ''}>${sal >= s.salary ? 'Give raise' : 'Cut salary'}</button></div></div>
      <div class="btns"><button class="btn" data-a="tVacation" data-tid="${tid}" ${c.m - s.vac < R.vacationCooldown || s.leave != null ? 'disabled' : ''}>Vacation · stress −45</button><button class="btn" data-a="tChallenge" data-tid="${tid}" ${c.m - s.chal < R.challengeCooldown ? 'disabled' : ''}>New challenge · ${M(s.salary * 0.2)}</button><button class="btn" data-a="tBonus" data-tid="${tid}">Bonus · ${M(s.salary * 0.25)}</button></div>
      ${left <= 12 ? `<div class="tnote"><b>Contract ends in ${yrs(left)}.</b> ${esc(t.name.split(' ')[0])} asks ${M(T.renewAsk(c, tid))}/yr to stay.<div class="btns">${yearsSeg}<button class="btn gold" data-a="tRenew" data-tid="${tid}" data-v="${sal}" data-y="${years}">Renew at ${M(sal)}/yr</button></div></div>` : ''}
      <div class="btns">${s.listed != null ? `<button class="btn" data-a="tList" data-tid="${tid}" data-v="0">Take off transfer list</button>` : `<button class="btn" data-a="tList" data-tid="${tid}" data-v="${T.value(c, tid)}">Transfer list at ${M(T.value(c, tid))}</button>`}<button class="btn danger" data-a="fire" data-tid="${tid}">Release · severance ${M(s.salary * Math.min(1, T.yearsLeft(c, tid)) * 0.5)}</button></div></div>`;
  } else if (!owner) {
    actions = `<div class="tact"><div class="set"><span class="cap">Offer salary per year</span>${step('salary', M(sal))}</div><div class="set"><span class="cap">Contract length</span>${yearsSeg}</div>
      <button class="btn gold" data-a="hire" data-tid="${tid}" data-v="${sal}" data-y="${years}" ${p.team[t.kind] ? 'disabled' : ''}>Sign · fee ${M(T.signFee(c, p, tid))}</button>${p.team[t.kind] ? `<p class="empty">You already have a ${esc(role.role.replace(/^(Junior|Senior) /, ''))}. Release or sell them first.</p>` : ''}</div>`;
  } else {
    const open = (c.tOffers || []).find((o) => o.tid === tid && o.from === p.id && o.status === 'open');
    actions = `<div class="tact">${open ? `<div class="tnote">Your offer of ${M(open.fee)} is waiting for ${esc(owner.name)}.</div>` : `<div class="set"><span class="cap">Transfer fee to ${esc(owner.name)}</span>${step('fee', M(fee))}</div><div class="set"><span class="cap">Salary you offer per year</span>${step('salary', M(sal))}</div><div class="set"><span class="cap">Contract length</span>${yearsSeg}</div>
      <button class="btn gold" data-a="tOffer" data-tid="${tid}" data-f="${fee}" data-v="${sal}" data-y="${years}" ${p.team[t.kind] ? 'disabled' : ''}>Make offer</button>${p.team[t.kind] ? `<p class="empty">You already have someone in this role.</p>` : `<p class="empty">${owner.bot ? 'Rivals answer right away.' : `${esc(owner.name)} has two months to answer. If they are away and ${esc(t.name.split(' ')[0])} is unhappy, the specialist can leave anyway.`} Happy specialists want a higher salary to move.</p>`}`}</div>`;
  }
  return `<article class="sheet talent dz dzt">${head}${stats}${facts}${actions}</div></article>`;
}
export function talentStep(st, k, dir) {
  const c = city(), s = c.talent[st.id], ask = T.ask(c, st.id);
  if (k === 'salary') { const cur = st.salary ?? (s.owner === meId() ? s.salary : ask * (s.owner ? 1.15 : 1)); st.salary = Math.max(0.05, Math.round((cur + dir * Math.max(0.01, ask * 0.05)) * 100) / 100); }
  if (k === 'fee') { const v = T.value(c, st.id) || 1, cur = st.fee ?? v; st.fee = Math.max(0, Math.round((cur + dir * Math.max(0.05, v * 0.1)) * 100) / 100); }
}

// ---------------------------------------------------------------- Apex Talent (in-game website)
export function apexSite(u, go) {
  const c = city(), p = me(), page = u.path[0] || '';
  const nav = `<div class="ap-head"><div class="ap-logo">APEX<span>talent</span></div><nav>${go('apextalent.ab', 'Free agents', page === '' ? 'on' : '')}${go('apextalent.ab/market', 'Transfer market', page === 'market' || page === 'role' ? 'on' : '')}${go('apextalent.ab/expiring', 'Expiring', page === 'expiring' ? 'on' : '')}${go('apextalent.ab/offers', 'My offers', page === 'offers' ? 'on' : '')}</nav></div>`;
  const card = (tid) => { const t = T.PERSON[tid], s = c.talent[tid], owner = s.owner ? c.players[s.owner] : null, seen = T.scouted(c, p, tid);
    return `<button class="ap-card" data-a="staff" data-id="${tid}">${portrait(tid, 'lg')}<div class="grow"><b>${esc(t.name)}</b><span class="stars">${stars(s.rating)}</span><span>${esc(T.title(c, tid))}</span><span>${owner ? (owner.id === p.id ? 'Your team' : esc(owner.name)) : 'Free agent'}${s.owner ? ` · ${yrs(s.until - c.m)} left` : ''}</span>${seen || !owner ? moodChip(s) : ''}</div><div class="right"><b>${owner ? M(T.value(c, tid)) : M(T.signFee(c, p, tid))}</b><span>${owner ? 'value' : 'fee'}</span><span>${M(T.ask(c, tid))}/yr</span>${s.listed != null ? '<span class="chip warn">Listed</span>' : ''}</div></button>`; };
  const byRating = (a, b) => c.talent[b].rating - c.talent[a].rating;
  let body = '';
  if (page === '') { const free = TALENT.filter((t) => !c.talent[t.id].owner).map((t) => t.id).sort(byRating);
    body = `<div class="ap-hero"><h1>The best people in Aurex Bay</h1><p>${free.length} specialists are free to sign right now. No transfer fee, just a signing fee and a contract.</p></div><div class="ap-list">${free.map(card).join('') || '<p>Nobody is free right now. Check the transfer market.</p>'}</div>`; }
  else if (page === 'market' || page === 'role') { const role = page === 'role' ? u.path[1] : null;
    const groups = STAFF.filter((r) => !role || r.id === role).map((r) => `<h3>${esc(r.role.replace(/^(Junior|Senior) /, ''))}</h3><div class="ap-list">${TALENT.filter((t) => t.kind === r.id).map((t) => t.id).sort(byRating).map(card).join('')}</div>`).join('');
    body = `<div class="ap-body">${role ? `<p>${go('apextalent.ab/market', '‹ All roles')}</p>` : ''}${groups}</div>`; }
  else if (page === 'expiring') { const ex = TALENT.filter((t) => { const s = c.talent[t.id]; return s.owner && s.owner !== p.id && s.until - c.m <= 12; }).map((t) => t.id).sort((a, b) => c.talent[a].until - c.talent[b].until);
    body = `<div class="ap-body"><h3>Contracts ending within a year</h3><p class="ap-small">Cheaper to buy now, or wait and sign them for free if their club does not renew.</p><div class="ap-list">${ex.map(card).join('') || '<p>No contracts end soon.</p>'}</div></div>`; }
  else { const mineOut = (c.tOffers || []).filter((o) => o.from === p.id).slice(-12).reverse(), mineIn = (c.tOffers || []).filter((o) => o.to === p.id).slice(-12).reverse();
    const row = (o, out) => `<div class="ap-off"><b>${esc(T.PERSON[o.tid].name)}</b><span>${out ? `to ${esc(c.players[o.to].name)}` : `from ${esc(c.players[o.from].name)}`} · fee ${M(o.fee)} · ${M(o.salary)}/yr · ${o.years} yr</span><em class="${o.status === 'accepted' || o.status === 'forced' ? 'up' : o.status === 'open' ? '' : 'down'}">${o.status}</em></div>`;
    body = `<div class="ap-body"><h3>Offers you made</h3>${mineOut.map((o) => row(o, true)).join('') || '<p class="ap-small">None yet.</p>'}<h3>Offers for your people</h3>${mineIn.map((o) => row(o, false)).join('') || '<p class="ap-small">None yet.</p>'}</div>`; }
  return nav + body;
}
