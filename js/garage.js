// Cars in the personal life: the car panel in a car's card (condition, workshop, loans, daily car, Concours),
// the garage boxes and the Cars & Coffee scene. Rules in supabase/functions/_shared/cars.js (E.AUTO).
import * as E from '../supabase/functions/_shared/engine.js';
import { CARS as K, LIFE as LC } from '../supabase/functions/_shared/content.js';
import { city, me, meId, esc, lname } from './util.js';

const L = E.LIFE, AU = E.AUTO;
const money = (v, sign) => { const a = Math.abs(v); if (a >= 1) return (v < 0 ? '−' : sign && v > 0 ? '+' : '') + '$' + a.toFixed(a >= 10 ? 1 : 2) + ' M'; if (a < 0.0005) return '$0'; return (v < -0.0004 ? '−' : sign && v > 0.0004 ? '+' : '') + '$' + Math.round(a * 1000).toLocaleString('en-US') + 'k'; };
const condCol = (c) => (c >= 80 ? '#8fe0b0' : c >= 50 ? '#f5cf83' : '#ffab9c');
export const condBar = (it, wide) => { const c = AU.cond(it); return `<span class="ccond${wide ? ' wide' : ''}" title="Condition ${Math.round(c)} of 100"><i style="width:${c.toFixed(0)}%;background:${condCol(c)}"></i></span>`; };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const jobOf = (c, it) => (c.cars && c.cars.jobs || []).find((j) => j.id === it.shop);
const ago = (c, g) => Math.max(0, Math.ceil((g - c.g) * 48));
// a tag on a car's card in the garage
export function carTag(p, it) { const w = AU.where(it); return w || (p.life.daily === it.uid ? 'Daily car' : ''); }

// ---------------------------------------------------------------- the panel in a car's card
export function carPanel(st, i) {
  const c = city(), p = me(), it = L.ITEM[i.cid], cd = AU.cond(i), job = jobOf(c, i), cc = AU.concours(c), entered = cc && cc.entries && cc.entries[meId()] === i.uid;
  const awards = (i.award || []).map((a) => `<span class="chip ${a.place === 1 ? 'warn' : ''}">${a.place === 1 ? 'Best in Show' : a.place === 2 ? '2nd' : '3rd'} · Concours Y${a.y + 1}</span>`).join('');
  const head = `<div class="carc"><div class="grow"><b>Condition ${Math.round(cd)} · ${AU.condLabel(cd)}</b>${condBar(i, true)}<span class="muted small">${cd >= 80 ? 'Worth full value or more.' : cd >= K.service.min ? 'A service brings it back to 100.' : 'Needs a restoration before it is worth much.'} Value × ${L.condMult(cd).toFixed(2)}.</span></div></div>
    ${awards || i.resto ? `<div class="chips">${awards}${i.resto ? `<span class="chip good">Restored by ${esc(i.resto)}</span>` : ''}</div>` : ''}`;
  if (job) {
    const t = job.st === 'ask' ? `Waiting for ${esc(job.name)} to say yes.` : `At ${esc(job.name)}: ${job.kind === 'resto' ? 'restoration' : 'service'}, ready in ${ago(c, job.ready)} week${ago(c, job.ready) === 1 ? '' : 's'}.`;
    return `${head}<div class="lnote">${ricon()}<div class="grow"><b>${job.kind === 'resto' ? 'Being restored' : 'In for a service'}</b><span>${t} ${money(job.price)} paid.</span></div>${job.st === 'ask' ? `<button class="btn sm" data-a="carCancel" data-id="${job.id}">Cancel</button>` : ''}</div>`;
  }
  if (i.loan) return `${head}<div class="lnote">${ricon()}<div class="grow"><b>${esc(AU.where(i))}</b><span>Back in your garage at the start of ${MONTHS[i.loan.back % 12]}.${i.loan.fee ? ` Fee ${money(i.loan.fee)}.` : ''}</span></div></div>`;
  if (i.lent || i.lot) return head;
  if (st.shop) return head + shopPicker(i);
  if (st.lend) return head + lendPicker(i);
  const daily = p.life.daily === i.uid, kind = AU.kindFor(i);
  return `${head}<div class="acts">
    <button class="btn ${daily ? '' : 'gold'}" data-a="carDaily" data-uid="${daily ? '' : i.uid}">${daily ? 'Stop driving it every day' : 'Drive it every day'}</button>
    ${cd < 99.5 ? `<button class="btn" data-a="carShop" data-uid="${i.uid}">${kind === 'resto' ? 'Restore it at a workshop' : 'Book a service'}</button>` : ''}
    <button class="btn" data-a="meetOpen" data-uid="${i.uid}" ${p.life.meetM === c.m ? 'disabled' : ''}>${p.life.meetM === c.m ? 'Cars & Coffee: done this month' : 'Take it to Cars & Coffee'}</button>
    <button class="btn" data-a="carLendOpen">Lend it out for a month</button>
    ${AU.ccOpen(c) ? `<button class="btn ${entered ? '' : 'gold'}" data-a="carEnter" data-uid="${entered ? '' : i.uid}">${entered ? 'Withdraw from the Concours' : `Enter the Concours · judging in ${MONTHS[cc.judge % 12]}`}</button>` : ''}
  </div>${daily ? `<p class="muted small">Your daily car shows on the city map and your profile. ${Math.round((K.daily.prest - 1) * 100)}% more prestige from it, ${K.wear.daily} condition a month off.</p>` : ''}`;
}
const ricon = () => '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 16v-3l2-5h12l2 5v3z"/><path d="M4 13h16"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/></svg>';
function shopPicker(i) {
  const c = city(), p = me(), ctx = shopCtx(c), opts = AU.shops(c, ctx).map((l) => ({ lid: l.id, l, q: AU.quote(c, p, i, l.id, ctx) })).filter((x) => x.q).concat([{ lid: 'city', l: null, q: AU.quote(c, p, i, 'city', ctx) }]);
  const own = (l) => l && l.owner && ((l.owner.k === 'p' && l.owner.id === meId()) || E.canRun(c, meId(), l));
  const rows = opts.map(({ lid, l, q }) => {
    const who = !l ? 'Run by the city' : own(l) ? 'Your workshop' : l.owner.k === 'p' && c.players[l.owner.id] ? `${esc(c.players[l.owner.id].name)}${c.players[l.owner.id].bot ? '' : ' · asks the owner first'}` : 'A coop';
    return `<div class="row"><div class="grow"><b>${esc(q.name)}</b><span>${who} · ${q.weeks} week${q.weeks > 1 ? 's' : ''}${q.partsV ? ` · parts ${money(q.partsV * (l ? 1 : K.city.price))}` : ''}</span></div><button class="btn sm gold" data-a="carService" data-uid="${i.uid}" data-lid="${lid}" ${p.life.wallet < q.price ? 'disabled' : ''}>${money(q.price)}</button></div>`;
  }).join('');
  const k = AU.kindFor(i);
  return `<section class="box"><h2>${k === 'resto' ? 'Restoration' : 'Service'} <small>Paid from your personal account</small></h2><div class="in"><p class="muted small">${k === 'resto' ? 'A full restoration: body, engine and interior. The car comes back at condition 92 to 99, and the workshop is named on it.' : 'Fluids, brakes, a full check and a polish. The car comes back at condition 100.'}</p><div class="rows">${rows}</div><button class="btn sm" data-a="carBack">Back</button></div></section>`;
}
const shopCtx = (c) => ({ standing: (l) => !!l.ops && !E.BLD.unbuilt(l) && !E.BLD.idle(l), listing: (id) => E.listing(c, id) });
function lendPicker(i) {
  const c = city(), p = me(), v = L.instValue(c, p, i), dl = c.listings.filter((l) => l.type === 'dealer' && l.owner && E.canRun(c, meId(), l) && l.ops);
  const row = (to, x, price, extra = '', dis = false) => `<div class="row"><div class="grow"><b>${esc(x.label)}</b><span>${esc(x.note)}</span></div><button class="btn sm gold" data-a="carLend" data-uid="${i.uid}" data-v="${to}" ${extra} ${dis ? 'disabled' : ''}>${price}</button></div>`;
  return `<section class="box"><h2>Lend it out <small>For one month</small></h2><div class="in"><div class="rows">
    ${row('film', K.lend.film, money(v * K.lend.film.fee))}${row('ad', K.lend.ad, money(v * K.lend.ad.fee))}
    ${dl.length ? dl.map((l) => row('dealer', { label: `The window at ${lname(l)}`, note: K.lend.dealer.note }, 'Put it in', `data-lid="${l.id}"`, !!(l.cx && l.cx.ypi))).join('') : row('dealer', K.lend.dealer, 'No dealership', '', true)}
    <div class="row"><div class="grow"><b>The Aurex Bay Museum car hall</b><span>As long as you like. A yearly fee, extra prestige, no risk.</span></div><button class="btn sm" data-a="itemLend" data-uid="${i.uid}">${money(v * LC.lendFee)}/yr</button></div>
  </div><button class="btn sm" data-a="carBack">Back</button></div></section>`;
}

// ---------------------------------------------------------------- garage boxes (the car room)
export function garageBoxes() {
  const c = city(), p = me(), mine = AU.cars(p), d = AU.daily(p), cc = AU.concours(c), entry = cc && cc.entries && cc.entries[meId()], eit = entry && p.life.items.find((x) => x.uid === entry);
  const jobs = (c.cars && c.cars.jobs || []).filter((j) => j.pid === meId());
  const res = cc && cc.res ? cc.res.slice(0, 3).map((x) => `${x.place}. ${esc(c.players[x.pid] ? c.players[x.pid].name : '?')}: ${esc(L.ITEM[x.cid] ? L.ITEM[x.cid].name : 'a car')}`).join(' · ') : '';
  return `<section class="box"><h2>On the road <small>${d ? esc(L.ITEM[d.cid].name) : esc(K.noCar)}</small></h2><div class="in">
    <div class="rows">
      <div class="row"><div class="grow"><b>Daily car</b><span>${d ? `You drive the ${esc(L.ITEM[d.cid].name)}. It shows on the city map when you are online.` : 'Pick a car and tap "Drive it every day". It shows on the map and your profile, and the bank notices what you arrive in.'}</span></div></div>
      <div class="row"><div class="grow"><b>${esc(K.meet.title)} <small class="muted">once a month · ${esc(K.meet.place)}</small></b><span>Show one car. Collectors make offers, car people become loyal clients, tycoons like you more.</span></div><button class="btn sm gold" data-a="meetOpen" ${p.life.meetM === c.m || !mine.length ? 'disabled' : ''}>${p.life.meetM === c.m ? 'Done this month' : 'Go'}</button></div>
      <div class="ccban" style="background-image:linear-gradient(90deg, rgba(14,10,6,0.85), rgba(14,10,6,0.15)), url(img/x-concours.jpg)"><b>${esc(K.concours.name)}</b><span>Once a year on the waterfront. The judges pick Best in Show.</span></div>
      <div class="row"><div class="grow"><b>${AU.ccOpen(c) ? 'Entries open' : res ? 'Last year\'s podium' : 'Entries'}</b><span>${AU.ccOpen(c) ? (eit ? `You entered the ${esc(L.ITEM[eit.cid].name)}. Judging in ${MONTHS[cc.judge % 12]}.` : `Entries are open until ${MONTHS[cc.judge % 12]}. Open a car to enter it.`) : res ? `Last time: ${res}.` : `Entries open every ${MONTHS[K.concours.open]}. Rarity, condition, sets and restorations count.`}</span></div></div>
      ${jobs.map((j) => `<div class="row"><div class="grow"><b>${esc(L.ITEM[j.cid] ? L.ITEM[j.cid].name : 'Car')} at ${esc(j.name)}</b><span>${j.st === 'ask' ? 'Waiting for the owner to say yes' : `${j.kind === 'resto' ? 'Restoration' : 'Service'}, ready in ${ago(c, j.ready)} week${ago(c, j.ready) === 1 ? '' : 's'}`}</span></div></div>`).join('')}
    </div></div></section>`;
}

// ---------------------------------------------------------------- Cars & Coffee: a 20-second morning on the promenade
export function newMeet(uid) { return { t: 'meet', phase: 'setup', who: null, uid: uid || null }; }
export function startMeet(st) {
  const names = K.meet.names.slice().sort(() => Math.random() - 0.5), lines = K.meet.lines.slice().sort(() => Math.random() - 0.5), colors = ['#b5651d', '#2f6fb0', '#2e8b57', '#c0392b', '#7d3c98'];
  st.phase = 'run'; st.start = Date.now(); st.speakers = names.slice(0, 5).map((name, i) => ({ name, line: lines[i], color: colors[i] }));
}
export function meetHTML(st, cardHTML) {
  const p = me(), it = st.uid && p.life.items.find((x) => x.uid === st.uid);
  const head = `<header class="meetcov" style="background-image:linear-gradient(180deg, rgba(10,16,26,0) 45%, rgba(10,16,26,0.92)), url(img/x-carsandcoffee.jpg)"><span class="dh-ic">${ricon()}</span><div><span class="cap" style="color:#fff;opacity:.8">${esc(K.meet.place)}</span><h3>${esc(K.meet.title)}</h3><p>${esc(K.meet.scene)}</p></div><div class="pulse" aria-hidden="true"><i></i><i></i><i></i></div></header>`;
  if (st.phase === 'setup') {
    const cars = AU.cars(p).filter((i) => L.free(i) && !i.lent);
    return `<article class="scene lifep">${head}<div class="scene-in"><div class="ask"><b>Who do you want to meet?</b>${K.meet.who.map((g) => `<button class="opt ${st.who === g.id ? 'sel' : ''}" data-a="meetWho" data-v="${g.id}"><b>${esc(g.label)}</b><span>${esc(g.note)}</span></button>`).join('')}</div>
      <div class="ask"><b>Which car do you bring?</b>${cars.length ? `<div class="cstrip">${cars.map((i) => cardHTML(i.cid, { a: 'meetCar', attrs: `data-uid="${i.uid}"`, cls: 'sm' + (st.uid === i.uid ? ' picked' : ''), noDelta: true, value: L.instValue(city(), p, i) })).join('')}</div><span class="muted small">Rarer cars in better condition make a stronger impression.</span>` : '<p class="empty">Every car is away. Bring one home first.</p>'}</div>
      <button class="btn gold" data-a="meetStart" ${st.who && st.uid ? '' : 'disabled'}>Drive down to the promenade</button></div></article>`;
  }
  const t = Math.min(1, (Date.now() - st.start) / (K.meet.seconds * 1000)), shown = Math.min(st.speakers.length, Math.floor(t * (st.speakers.length + 1)));
  const bubbles = st.speakers.slice(0, shown).map((sp, i) => `<div class="bub ${i % 2 ? 'r' : ''}"><span class="av" style="background:${sp.color};--avc:${sp.color}">${esc(sp.name[0])}</span><div><b>${esc(sp.name)}</b><p>${esc(sp.line)}</p></div></div>`).join('');
  const foot = st.phase === 'done' ? `<div class="ask"><b>${esc(st.result || 'A good morning.')}</b><button class="btn gold" data-a="close">Drive home</button></div>` : `<div class="scene-prog"><div class="bar"><i style="width:${(t * 100).toFixed(1)}%"></i></div><span class="cap">${Math.ceil(K.meet.seconds * (1 - t))} s</span></div>`;
  return `<article class="scene lifep">${head}<div class="scene-in">${it ? `<p class="muted small">You park the ${esc(L.ITEM[it.cid].name)} at the end of the row.</p>` : ''}<div class="bubs" aria-live="polite">${bubbles || '<p class="muted">The first cars roll in…</p>'}</div>${foot}</div></article>`;
}

// ---------------------------------------------------------------- the daily car on a profile and on the map
export function dailyLine(c, pid) {
  const p = c.players[pid], it = p && AU.daily(p);
  if (!it) return { name: K.noCar, rar: '', pic: null };
  const d = L.ITEM[it.cid]; return { name: d.name, rar: d.rarity, pic: d.pic ? `img/${d.pic}.jpg` : d.img ? `img/x-${d.id}.jpg` : null, cond: AU.cond(it), year: d.year };
}
