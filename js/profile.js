// Profile (Empire › Profile): your own card as a tycoon, your career levels, the departments you lead yourself
// and your statistics. Players in your network can open your profile too (right-click their icon, or the Network tab).
// The rules live in _shared/career.js; this file only draws them.
import * as E from '../supabase/functions/_shared/engine.js';
import { CAREER, PORTRAITS, TYPES } from '../supabase/functions/_shared/content.js';
import { city, me, meId, esc, M, N, lname, coImg, dateLabel, lineChart } from './util.js';
import { logoMark } from './brand.js';

const C = E.CAR;
const PORTRAIT_V = 1;
// a personal portrait belongs to the first player in the city with that avatar name
export function portraitUrl(c, p) {
  if (!p || p.bot || !PORTRAITS[p.name]) return null;
  const first = Object.values(c.players).filter((x) => !x.bot && x.name === p.name).sort((a, b) => (a.joinedM ?? 0) - (b.joinedM ?? 0) || String(a.id).localeCompare(String(b.id)))[0];
  return first && first.id === p.id ? `img/${PORTRAITS[p.name]}.jpg?v=${PORTRAIT_V}` : null;
}
// who may look: you, and the players in your network
export const canView = (c, viewer, pid) => !!(viewer && (viewer.id === pid || (viewer.net || []).includes(pid)));
const ini = (n) => String(n).split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const pct = (xp) => { const lv = C.level(xp), lo = CAREER.levels[lv - 1], hi = CAREER.levels[lv]; return hi == null ? 100 : Math.round(((xp - lo) / (hi - lo)) * 100); };
const yearsIn = (c, p) => Math.max(0, Math.floor((c.m - (p.joinedM ?? 0)) / 12));
function bestYear(p) {
  const by = {}; (p.hist || []).forEach(([m, v]) => { const y = Math.floor(m / 12); if (!by[y]) by[y] = { a: v, b: v }; by[y].b = v; });
  let best = null; Object.entries(by).forEach(([y, r], i, arr) => { const prev = i > 0 ? by[arr[i - 1][0]].b : r.a, d = r.b - prev; if (!best || d > best.d) best = { y: +y, d }; });
  return best;
}

// a small card for Empire: who you are, your title and how far to the next level
export function profileBoxHTML() {
  const c = city(), p = me(); if (!p || !p.career) return '';
  const t = C.title(p), tl = C.tycoon(p), next = CAREER.titles.find((x) => x.min > tl), pic = portraitUrl(c, p), seats = p.career.seats.length, allowed = C.seatsAllowed(p);
  return `<div class="box profbox"><h2>Your profile<small>TYCOON ${tl}</small></h2><div class="in">
    <button class="row" style="width:100%;text-align:left" data-a="profile" data-pid="${p.id}"><span class="thumb pf-face" style="${pic ? `background-image:url(${pic})` : `background:${p.color}`}">${pic ? '' : esc(ini(p.name))}</span>
      <div class="grow"><b>${esc(p.name)} · ${esc(t.name)}</b><span>${next ? `${next.min - tl} level${next.min - tl > 1 ? 's' : ''} to ${esc(next.name)}` : 'The highest title in Aurex Bay'} · leading ${seats} of ${allowed} department${allowed > 1 ? 's' : ''}</span></div></button>
    <p class="empty" style="font-size:13px">Lead a department yourself from any company page. Experience comes slowly: from leading, to-dos, orders, stock profit, prestige and crises.</p></div></div>`;
}

export function profilePageHTML(UI) {
  const c = city(), viewer = me(), pid = String(UI.company).startsWith('profile:') ? String(UI.company).slice(8) : meId(), p = c.players[pid];
  const back = '<button class="btn sm" data-a="back">← Back</button>';
  if (!p || p.bot) return `${back}<p class="empty">This tycoon has no profile.</p>`;
  if (!canView(c, viewer, pid)) return `${back}<p class="empty">Only players in ${esc(p.name)}'s network can see this profile. Send a network request from the Network tab.</p>`;
  const own = pid === viewer.id, k = p.career || { xp: {}, bx: {}, spec: {}, seats: [], st: {}, log: [] };
  const brand = E.BR.brandOf(c, pid), pic = portraitUrl(c, p), t = C.title(p), tl = C.tycoon(p), allowed = C.seatsAllowed(p);
  const prest = c.life && p.life ? E.LIFE.prestige(c, p) : null, bs = C.best(p), spec = k.spec[bs] ? C.SPEC[k.spec[bs]] : null;
  // ---- the card
  const seatRows = k.seats.map((s) => { const l = E.listing(c, s.lid), d = l && l.ops && l.ops.depts[s.dept]; if (!l || !d) return '';
    return `<div class="pf-seat"><div><b>Head of ${esc(E.OPS.deptFor(l, s.dept).name)}</b><span>${esc(lname(l))} · ${esc(l.district)} · ${C.RATING_NAME[(d.rt || 1) - 1]}</span></div><em>${d.hb > 0 ? `+${Math.round(d.hb * 100)}% automation` : 'away: no effect'}</em>${own ? `<button class="linkbtn" data-a="company" data-lid="${l.id}">Open</button>` : ''}</div>`; }).join('');
  const nextSeat = CAREER.seats[allowed];
  const locked = nextSeat != null ? `<div class="pf-seat lock"><div><b>${allowed > k.seats.length ? 'Free seat' : 'Locked seat'}</b><span>${allowed > k.seats.length ? 'Open a company and choose "Lead it yourself" in a department' : `Opens at Tycoon level ${nextSeat} (${esc(CAREER.titles.filter((x) => x.min <= nextSeat).pop().name)})`}</span></div></div>`
    : allowed > k.seats.length ? '<div class="pf-seat lock"><div><b>Free seat</b><span>Choose "Lead it yourself" in a department</span></div></div>' : '';
  const fields = C.FIELDS.map((f) => { const xp = k.xp[f] || 0, lv = C.level(xp);
    return `<div class="pf-m"><div><span>${esc(C.FIELD_NAME[f])}</span><b>Lv ${lv}</b></div><i><u style="width:${pct(xp)}%"></u></i></div>`; }).join('');
  const specs = Object.entries(k.spec).map(([s, id]) => `<div class="pf-perk">${esc(C.SPEC[id].name)} <small>${esc(CAREER.sectors[s].name)}</small><i>${esc(C.SPEC[id].d)}</i></div>`).join('');
  const card = `<article class="pf-card">
    <div class="pf-hero${pic ? '' : ' noimg'}" style="${pic ? `background-image:url(${pic})` : `--kc:${p.color}`}">${pic ? '' : `<span class="pf-ini">${esc(ini(p.name))}</span>`}
      ${brand ? `<div class="pf-logo">${logoMark(brand, 18)}${esc(brand.name)}</div>` : ''}<div class="pf-ovr"><div>${tl}<small>TYCOON</small></div></div></div>
    <div class="pf-body">
      <div><div class="pf-k">${esc(t.name)} · ${esc(CAREER.sectors[bs].name)}</div><h2>${esc(p.name)}</h2><div class="pf-sub">${prest ? `${esc(prest.name)} · ` : ''}${yearsIn(c, p)} year${yearsIn(c, p) === 1 ? '' : 's'} in Aurex Bay${spec ? ` · ${esc(spec.name)}` : ''}</div></div>
      <div class="pf-band">Leads</div>${seatRows || `<p class="pf-none">${own ? 'You lead no department yourself yet.' : 'Leads no department personally.'}</p>`}${locked}
      <div class="pf-band">Fields</div><div class="pf-meters">${fields}</div>
      ${specs ? `<div class="pf-band">Specialisations</div>${specs}` : ''}
    </div></article>`;
  // ---- statistics
  const st = k.st || {}, mine = E.ownedBy(c, 'p', pid), by = bestYear(p), hist = p.hist || [];
  const tiles = [
    ['Net worth', M(E.netWorth(c, pid))],
    ['Stock profit, all time', `<span class="${(p.realized || 0) >= 0 ? 'up' : 'down'}">${M(p.realized || 0, true)}</span>`],
    ['Companies', `${mine.length} · ${st.sold || 0} sold`],
    ['Orders delivered', N(st.orders || 0)],
    ['Best year', by && hist.length > 13 ? `Year ${by.y + 1} · ${M(by.d, true)}` : '—'],
    ['To-dos done', N(st.tasks || 0)],
    ['Auctions won', N(st.won || 0)],
    ['Prestige', prest ? `${esc(prest.name)} · ${prest.score}` : '—']
  ].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
  const chart = hist.length > 1 ? lineChart([{ v: hist.map((h) => h[1]), c: 'var(--pf-acc)', fill: true }], hist.map((h) => `Y${Math.floor(h[0] / 12) + 1}`), { h: 190, label: 'Net worth over time', fmt: (v) => `${Math.round(v)} M` }) : '<p class="empty">The chart fills in as months pass.</p>';
  const sectors = C.SECTORS.map((s) => { const xp = k.bx[s] || 0, lv = C.level(xp), sp = k.spec[s], can = own && lv >= CAREER.specLevel;
    const pick = can ? `<div class="pf-pick">${CAREER.sectors[s].specs.map((x) => `<button class="btn sm${sp === x.id ? ' gold' : ''}" data-a="meSpec" data-sector="${s}" data-pick="${x.id}" ${sp === x.id ? 'disabled' : ''} title="${esc(x.d)}">${esc(x.name)}</button>`).join('')}${sp ? `<small>Switching costs ${Math.round(CAREER.respec * 100)}% of your ${esc(CAREER.sectors[s].name)} experience.</small>` : '<small>Choose one. It works in every company you own in this sector.</small>'}</div>` : '';
    return `<div class="pf-br"><span>${esc(CAREER.sectors[s].name)}</span><i><u style="width:${Math.min(100, (lv - 1) * 11 + pct(xp) / 10)}%"></u></i><b>${lv}</b>${sp ? `<em>${esc(C.SPEC[sp].name)}</em>` : ''}</div>${pick}`; }).join('');
  const perks = C.perksOf(p);
  const log = (k.log || []).slice(0, 8).map((x) => `<div><span>${esc(dateLabel(x.m))}</span>${esc(x.t)}</div>`).join('');
  const h = brand && brand.hid ? c.holdings[brand.hid] : null;
  const partners = h ? Object.keys(h.members).filter((id) => id !== pid).map((id) => c.players[id]).filter((x) => x && !x.bot) : [];
  const partnerHTML = partners.map((x) => { const u = portraitUrl(c, x), see = canView(c, viewer, x.id);
    return `<${see ? `button data-a="profile" data-pid="${x.id}"` : 'div'} class="pf-mini"><span class="pf-mface" style="${u ? `background-image:url(${u})` : `background:${x.color}`}">${u ? '' : esc(ini(x.name))}</span><div><b>${esc(x.name)}</b><span>${esc(C.title(x).name)} · Tycoon ${C.tycoon(x)}${x.career && x.career.seats[0] ? ` · Head of ${esc(C.FIELD_NAME[x.career.seats[0].dept])}` : ''}</span></div></${see ? 'button' : 'div'}>`; }).join('');
  const next = CAREER.titles.find((x) => x.min > tl);
  return `<div class="prof">${back}
    <div class="pf-grid">${card}
    <div class="pf-panel">
      <div class="pf-tiles">${tiles}</div>
      <div class="pf-row"><div class="pf-box"><h3>Net worth over time</h3>${chart}</div>
        <div class="pf-box"><h3>Sectors</h3>${sectors}<p class="pf-note">Level ${CAREER.specLevel} in a sector unlocks a specialisation.</p></div></div>
      <div class="pf-row"><div class="pf-box"><h3>Milestones</h3><div class="pf-ms">${log || '<p class="pf-note">Milestones show up here as the career grows.</p>'}</div></div>
        <div class="pf-box"><h3>Perks unlocked</h3>${perks.length ? `<div class="pf-perks">${perks.map((x) => `<div><b>${esc(C.FIELD_NAME[x.f])} ${x.lv}</b>${esc(x.t)}</div>`).join('')}</div><p class="pf-note">Perks work in the departments ${own ? 'you lead' : 'they lead'} personally.</p>` : `<p class="pf-note">Level 3 in a field brings the role's own effect when ${own ? 'you lead' : 'they lead'} that department, more at 6 and 9.</p>`}
          ${partnerHTML ? `<h3 style="margin-top:14px">Co-owners</h3>${partnerHTML}` : ''}</div></div>
      ${own ? `<div class="pf-box"><h3>How you grow</h3><p class="pf-note">Leading a department: +${CAREER.xp.lead} field XP a month (more in large companies, half in a month with a loss, +25% with a top specialist beside you). To-dos +${CAREER.xp.task} (max ${CAREER.caps.task} a month), orders delivered +${CAREER.xp.order} Sales (max ${CAREER.caps.order}), stock profit +${CAREER.xp.stock} Finance per M (max ${CAREER.caps.stockYear} a year), a new prestige tier +${CAREER.xp.tier} in every field, a crisis with every company in profit +${CAREER.xp.crisis} per sector. Running companies trains their sector. Fields you leave alone for two years slowly rust, but you never lose a level.${next ? ` ${next.min - tl} more level${next.min - tl > 1 ? 's' : ''} to ${esc(next.name)}.` : ''}</p></div>` : ''}
    </div></div></div>`;
}

// the "Lead it yourself" line inside a department box on a company page
export function selfHeadHTML(l, d, dd) {
  const c = city(), p = me(); if (!p || p.bot || !p.career || (l.ops && l.ops.managed)) return '';
  if (dd.head === 'self') {
    const who = c.players[String(dd.who).slice(2)], mine = who && who.id === p.id, pic = who ? portraitUrl(c, who) : null, lv = dd.lv || 1;
    const nxt = (CAREER.perks[d.id] || []).find((x) => x.lv > lv);
    return `<div class="head self"><span class="thumb pf-face" style="${pic ? `background-image:url(${pic})` : `background:${who ? who.color : '#555'}`}">${pic ? '' : esc(ini(who ? who.name : '?'))}</span><div class="grow"><b>${esc(who ? who.name : 'A co-owner')}${mine ? ' (you)' : ''}</b><span>Head of ${esc(d.name)} · level ${lv} · ${dd.hb > 0 ? `+${Math.round(dd.hb * 100)}% automation` : 'away: no effect'}${lv < 3 ? ' · role effect at level 3' : nxt ? ` · next perk at level ${nxt.lv}` : ''}</span></div>
      ${mine ? `<button class="btn sm" data-a="profile" data-pid="${p.id}">Profile</button><button class="btn sm" data-a="meLeave" data-lid="${l.id}" data-dept="${d.id}">Step down</button>` : ''}</div>`;
  }
  const k = p.career, free = k.seats.length < C.seatsAllowed(p), lv = C.level(k.xp[d.id]);
  return `<div class="btns"><button class="btn sm navy" data-a="meHead" data-lid="${l.id}" data-dept="${d.id}" ${free ? '' : 'disabled'} title="${free ? '' : 'All your seats are taken. Step down somewhere else, or reach a higher Tycoon level.'}">Lead it yourself · level ${lv}${dd.head ? ' (replaces the head)' : ''}</button>${free ? '' : `<span class="muted" style="font-size:12.5px">You lead ${k.seats.length} of ${C.seatsAllowed(p)}</span>`}</div>`;
}
export { TYPES, coImg };
