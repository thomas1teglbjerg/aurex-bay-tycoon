// Profile (Empire › Profile): your own card as a tycoon, your career levels, the departments you lead yourself
// and your statistics. Players in your network can open your profile too (right-click their icon, or the Network tab).
// The rules live in _shared/career.js; this file only draws them.
import * as E from '../supabase/functions/_shared/engine.js';
import { CAREER, PORTRAITS, TYPES, CHANCE } from '../supabase/functions/_shared/content.js';
import { city, me, meId, esc, M, N, lname, coImg, dateLabel, lineChart } from './util.js';
import { logoMark } from './brand.js';
import { cardHTML, homeBg, ricon, money } from './life.js';

const C = E.CAR;
const PORTRAIT_V = 1;
// avatar names match loosely: case, accents and extra spaces do not matter ("thomas  debenhams" = "Thomas Debenhams")
const norm = (n) => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const PORTRAIT_BY = Object.fromEntries(Object.entries(PORTRAITS).map(([n, f]) => [norm(n), f]));
// a personal portrait belongs to the first real player in the city with that avatar name (the test player never takes it)
export function portraitUrl(c, p) {
  const f = p && !p.bot && PORTRAIT_BY[norm(p.name)]; if (!f) return null;
  const first = Object.values(c.players).filter((x) => !x.bot && !x.test && norm(x.name) === norm(p.name)).sort((a, b) => (a.joinedM ?? 0) - (b.joinedM ?? 0) || String(a.id).localeCompare(String(b.id)))[0];
  return first && first.id === p.id ? `img/${f}.jpg?v=${PORTRAIT_V}` : null;
}
// players without a personal portrait get a drawn silhouette on their own colour instead of bare initials
const SILHOUETTE = (col) => `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 180'><defs><radialGradient id='g' cx='50%' cy='38%' r='75%'><stop offset='0' stop-color='${col}'/><stop offset='1' stop-color='#0d1014'/></radialGradient></defs><rect width='200' height='180' fill='url(#g)'/><g fill='rgba(255,255,255,0.22)'><circle cx='100' cy='70' r='32'/><path d='M38 180c4-44 30-66 62-66s58 22 62 66z'/></g></svg>`).replace(/'/g, '%27')}')`;
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

// Your own profile lives under Personal › Profile (pid = your id, no back button); other players' profiles open from Network.
export function profilePageHTML(UI, ownPid) {
  const c = city(), viewer = me(), pid = ownPid || (String(UI.company).startsWith('profile:') ? String(UI.company).slice(8) : meId()), p = c.players[pid];
  const back = ownPid ? '' : '<button class="btn sm" data-a="back">← Back</button>';
  if (p && p.bot) return botProfileHTML(c, viewer, p, back);
  if (!p) return `${back}<p class="empty">This tycoon has no profile.</p>`;
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
    <div class="pf-hero${pic ? '' : ' noimg'}" style="background-image:${pic ? `url(${pic})` : SILHOUETTE(p.color || '#4a5560')}">
      ${brand ? `<div class="pf-logo">${logoMark(brand, 18)}${esc(brand.name)}</div>` : ''}<div class="pf-ovr"><div>${tl}<small>TYCOON</small></div></div></div>
    <div class="pf-body">
      <div><div class="pf-k">${esc(t.name)} · ${esc(CAREER.sectors[bs].name)}</div><h2>${esc(p.name)}</h2><div class="pf-sub">${prest ? `${esc(prest.name)} · ` : ''}${yearsIn(c, p)} year${yearsIn(c, p) === 1 ? '' : 's'} in Aurex Bay${spec ? ` · ${esc(spec.name)}` : ''}</div></div>
      <div class="pf-band">Leads</div>${seatRows || `<p class="pf-none">${own ? 'You lead no department yourself yet.' : 'Leads no department personally.'}</p>`}${own ? locked : ''}
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
      ${ownsHTML(c, p, own)}
      ${chanceHTML(p, own)}
      ${own ? `<div class="pf-box"><h3>How you grow</h3><p class="pf-note">Leading a department: +${CAREER.xp.lead} field XP a month (more in large companies, half in a month with a loss, +25% with a top specialist beside you). To-dos +${CAREER.xp.task} (max ${CAREER.caps.task} a month), orders delivered +${CAREER.xp.order} Sales (max ${CAREER.caps.order}), stock profit +${CAREER.xp.stock} Finance per M (max ${CAREER.caps.stockYear} a year), a new prestige tier +${CAREER.xp.tier} in every field, a crisis with every company in profit +${CAREER.xp.crisis} per sector. Running companies trains their sector. Fields you leave alone for two years slowly rust, but you never lose a level.${next ? ` ${next.min - tl} more level${next.min - tl > 1 ? 's' : ''} to ${esc(next.name)}.` : ''}</p></div>` : ''}
    </div></div></div>`;
}

// the chance cards a tycoon has drawn and what they picked (newest first)
function chanceHTML(p, own) {
  const log = ((p.chance && p.chance.log) || []).filter((x) => CHANCE.cards[x.id]); if (!log.length) return '';
  return `<div class="pf-box"><h3>Chance cards<small>${log.length}</small></h3><div class="chlog">${log.map((x) => `<div class="row"><b>${esc(CHANCE.cards[x.id].title)}</b><span class="muted">${esc(x.pick || (own ? 'Waiting for you' : 'Open'))} · ${esc(dateLabel(x.m))}</span></div>`).join('')}</div></div>`;
}
// homes and collection at a glance, so the network can see what a tycoon owns (the wallet stays private)
const CATS = [['art', 'Art'], ['wine', 'Wine'], ['watch', 'Watches'], ['car', 'Cars']];
function ownsHTML(c, p, own) {
  const L = E.LIFE; if (!c.life || !p.life) return '';
  const homes = p.life.homes || [], items = p.life.items || [], sets = L.completeSets(p);
  const hv = homes.reduce((a, h) => a + L.homeValue(c, h), 0), cv = L.collectionValue(c, p);
  // the home they live in (or the most valuable one) gets a big cover picture, the rest are rows below it
  const main = homes.find((h) => h.uid === p.life.res && L.HOME[h.hid]) || homes.filter((h) => L.HOME[h.hid]).sort((a, b) => L.homeValue(c, b) - L.homeValue(c, a))[0];
  const cover = main ? `<div class="pf-cover" style="${homeBg(main.hid, 'ext')}"><div><b>${esc(L.HOME[main.hid].name)}</b><span>${esc(L.HOME[main.hid].district)} · ${main.uid === p.life.res ? 'Lives here' : main.rented ? 'Rented out' : 'Second home'} · ${money(L.homeValue(c, main))}</span></div></div>` : '';
  const homeRows = cover + homes.filter((h) => h !== main).map((h) => { const def = L.HOME[h.hid]; if (!def) return '';
    return `<div class="pf-home"><span class="pf-hth" style="${homeBg(h.hid, 'ext')}"></span><div><b>${esc(def.name)}</b><span>${esc(def.district)} · ${h.uid === p.life.res ? 'Lives here' : h.rented ? 'Rented out' : 'Second home'}</span></div><em>${money(L.homeValue(c, h))}</em></div>`; }).join('');
  const cats = CATS.map(([k, n]) => { const its = items.filter((i) => L.ITEM[i.cid] && L.ITEM[i.cid].cat === k); return its.length ? `<div class="pf-cat">${ricon(k, 16)}<span>${n}</span><b>${its.length}</b><em>${money(L.collectionValue(c, p, k))}</em></div>` : ''; }).join('');
  const top = items.filter((i) => L.ITEM[i.cid]).map((i) => ({ i, v: L.instValue(c, p, i, sets) })).sort((a, b) => b.v - a.v).slice(0, 6);
  const cards = top.map(({ i, v }) => cardHTML(i.cid, { value: v, noDelta: true, cls: 'sm', tag: i.lent ? 'Museum' : '' })).join('');
  const who = own ? 'You own' : 'Owns';
  return `<div class="pf-row"><div class="pf-box"><h3>Property<small>${homes.length ? money(hv) : ''}</small></h3>${homeRows || `<p class="pf-note">${who} no homes yet.</p>`}${own ? '<button class="linkbtn" data-a="lifeView" data-v="property">Manage property ›</button>' : ''}</div>
    <div class="pf-box"><h3>Collection<small>${items.length ? `${items.length} piece${items.length > 1 ? 's' : ''} · ${money(cv)}` : ''}</small></h3>${cats ? `<div class="pf-cats">${cats}</div>` : `<p class="pf-note">${own ? 'Nothing collected yet.' : 'No collection yet.'}</p>`}${sets.length ? `<p class="pf-note">${sets.length} complete set${sets.length > 1 ? 's' : ''}.</p>` : ''}${own && items.length ? '<button class="linkbtn" data-a="lifeView" data-v="collection">Open the collection ›</button>' : ''}</div></div>
    ${cards ? `<div class="pf-box lifep pf-best"><h3>Finest pieces</h3><div class="cstrip">${cards}</div></div>` : ''}`;
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

// ---------------------------------------------------------------- rival tycoons (bots.js): who they are and where you stand with them
// Anyone can open a rival's card. Portraits come later: for now the card shows their initials on their colour.
const REL_LINE = {
  Enemy: 'They want to hurt you: price wars, Gazette stories, and bids for your weakest companies (only with your yes).',
  Rival: 'They go after the same companies, specialists, clients and auction lots as you. Beat them and you earn Influence.',
  Cool: 'They keep their distance. A good deal or a supply contract warms them up.',
  Neutral: 'No history yet. What you do next decides where this goes.',
  Friendly: 'They answer your requests kindly and may offer you goods under the market price.',
  Friend: 'They send tips, sell to you cheaply, stay out of your auctions and warn you about attacks.',
  Ally: 'They tell you what is coming each quarter and stop other tycoons who bid for your companies.'
};
const MOOD = (v) => (v < 25 ? 'Desperate' : v < 45 ? 'Worried' : v < 65 ? 'Steady' : v < 80 ? 'Confident' : 'On a high');
export function botProfileHTML(c, viewer, b, back) {
  const k = E.BOT.card(c, b.id, viewer.id), per = k.per || { title: 'Tycoon', tag: '', bio: '', types: [], traits: [] };
  const lv = k.lv.name, tone = k.v <= -40 ? 'bad' : k.v >= 40 ? 'good' : 'mid', pos = Math.round((k.v + 100) / 2);
  const mine = E.ownedBy(c, 'p', b.id), dream = k.dream, dreamOwner = dream && dream.owner ? (dream.owner.k === 'p' ? (dream.owner.id === viewer.id ? 'You own it' : dream.owner.id === b.id ? 'They own it' : `Owned by ${c.players[dream.owner.id] ? c.players[dream.owner.id].name : 'someone'}`) : 'Owned by a coop') : 'For sale';
  const sectors = [...new Set(per.types.map((t) => TYPES[t] ? TYPES[t].name : t))];
  const mem = k.mem.map((x) => `<div class="pf-mem ${x.w < 0 ? 'neg' : x.w > 0 ? 'pos' : ''}"><span>${esc(dateLabel(x.m))}</span><b>${esc(x.t)}</b><em>${x.w > 0 ? '+' : ''}${x.w}</em></div>`).join('');
  const notes = [k.war ? `<p class="pf-alert">Price war: their ${esc(lname(E.listing(c, k.war.blid)))} is cutting prices against your ${esc(lname(E.listing(c, k.war.lid)))}.</p>` : '', k.alliance && k.alliance.vs === viewer.id ? `<p class="pf-alert">Member of ${esc(k.alliance.name)}, an alliance against you.</p>` : '', k.eye ? `<p class="pf-note">Has an eye on ${esc(lname(k.eye))} in ${esc(k.eye.district)}.</p>` : ''].join('');
  const card = `<article class="pf-card bot">
    <div class="pf-hero noimg" style="--kc:${esc(b.color)}"><span class="pf-ini">${esc(ini(b.name))}</span><div class="pf-ovr rel ${tone}"><div>${k.v > 0 ? '+' : ''}${k.v}<small>${esc(lv.toUpperCase())}</small></div></div></div>
    <div class="pf-body">
      <div><div class="pf-k">${esc(per.title)}${per.tag ? ` · ${esc(per.tag)}` : ''}</div><h2>${esc(b.name)}</h2><div class="pf-sub">${k.alliance ? `${esc(k.alliance.name)} · ` : ''}${mine.length} compan${mine.length === 1 ? 'y' : 'ies'} · ${M(E.netWorth(c, b.id))}</div></div>
      <p class="pf-bio">${esc(per.bio)}</p>
      <div class="pf-band">You and ${esc(b.name.split(' ')[0])}</div>
      <div class="pf-rel"><i><u class="${tone}" style="left:${pos}%"></u></i><div><span>Enemy</span><span>Neutral</span><span>Ally</span></div></div>
      <p class="pf-none"><b>${esc(lv)}${k.rival && lv !== 'Rival' && lv !== 'Enemy' ? ' · still a rival' : ''}.</b> ${esc(REL_LINE[lv] || '')}</p>
      ${notes}
      <div class="pf-band">Character</div><div class="pf-chips">${(per.traits || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
      <div class="pf-band">Hunts in</div><p class="pf-none">${esc(sectors.join(', ') || '—')}</p>
      ${dream ? `<div class="pf-seat"><div><b>Dream company: ${esc(lname(dream))}</b><span>${esc(dream.district)} · ${esc(dreamOwner)}</span></div></div>` : ''}
      <div class="btns"><button class="btn sm gold" data-a="chat" data-id="${esc(b.id)}">Chat</button>${(viewer.net || []).includes(b.id) ? '<span class="pf-tag">In your network</span>' : `<button class="btn sm navy" data-a="netRequest" data-pid="${esc(b.id)}">Add to network</button>`}</div>
    </div></article>`;
  const tiles = [
    ['Net worth', M(E.netWorth(c, b.id))],
    ['Companies', N(mine.length)],
    ['Mood', MOOD(k.mood)],
    ['You beat them', N(k.w)],
    ['They beat you', N(k.l)],
    ['Cash', M(b.cash)],
    ['Influence', N(b.inf || 0)],
    ['Last move', k.react ? esc(k.react.t.replace(b.name + ' ', '')) : '—']
  ].map(([a, x]) => `<div><span>${a}</span><b>${x}</b></div>`).join('');
  const cos = mine.map((l) => `<button class="pf-home" data-a="open" data-lid="${l.id}"><span class="pf-hth" style="background-image:url(${coImg(l)});background-size:cover;background-position:center"></span><div><b>${esc(lname(l))}</b><span>${esc(l.district)} · Level ${l.level}</span></div><em>${M(E.listingValue(l))}</em></button>`).join('');
  return `<div class="prof">${back}
    <div class="pf-grid">${card}
    <div class="pf-panel">
      <div class="pf-tiles">${tiles}</div>
      <div class="pf-row"><div class="pf-box"><h3>What ${esc(b.name.split(' ')[0])} remembers about you</h3>${mem || '<p class="pf-note">Nothing yet. Every auction, deal, purchase and answer is noticed.</p>'}<p class="pf-note">They keep the three biggest things. The relation slowly drifts back towards neutral.</p></div>
        <div class="pf-box"><h3>Said to you lately</h3>${k.said ? `<blockquote class="pf-quote">“${esc(k.said.t)}”<span>${esc(dateLabel(k.said.m))}</span></blockquote>` : '<p class="pf-note">Nothing yet.</p>'}<p class="pf-note">Rivals write when they win or lose against you. Their mails are in Empire › Mail, under Tycoons.</p></div></div>
      <div class="pf-box"><h3>Companies<small>${mine.length ? M(mine.reduce((a, l) => a + E.listingValue(l), 0)) : ''}</small></h3>${cos || '<p class="pf-note">No companies right now.</p>'}</div>
    </div></div></div>`;
}
