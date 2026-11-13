// Cars in the personal life (AUTO from engine.js; numbers and texts in CARS in content.js).
// A car item ({ uid, cid, ... } in p.life.items) can carry:
//   cond (0–100, LIFE.carCond; value × LIFE.condMult), drove (last month it was driven),
//   shop (id of a workshop job in city.cars.jobs), loan ({ to: 'film'|'ad'|'dealer', back, lid } with lent = true: away for a month),
//   award ([{ y, place }] from the Concours; each win adds value), resto (the workshop that restored it).
// p.life.daily = the uid of the car you drive every day; p.life.meetM = the month you last went to Cars & Coffee.
// city.cars = { jobs: [...], cc: { y, judge, entries: { pid: uid }, res? } }.
import { CARS as K, TYPES, GOODS, COLLECTIBLES, SIZES } from './content.js';
import * as LIFE from './life.js';
import * as MAIL from './mail.js';
import * as BOT from './bots.js';

const r2 = (v) => Math.round(v * 100) / 100;
const r4 = (v) => Math.round(v * 10000) / 10000;
const r5 = (v) => Math.round(v * 1e5) / 1e5;
const ok = (msg, x) => ({ ok: true, msg, ...(x || {}) }), err = (msg) => ({ ok: false, msg });
const WEEK = 1 / 48;
const uid = (k) => k + Math.random().toString(36).slice(2, 9);
const co = (l) => l.title || TYPES[l.type].name;
const ITEM = LIFE.ITEM;

export function ensure(city) { if (!city.cars) city.cars = { jobs: [], cc: null }; city.cars.jobs = city.cars.jobs || []; return city.cars; }
export const isCar = (it) => !!(it && ITEM[it.cid] && ITEM[it.cid].cat === 'car');
export const cars = (p) => ((p && p.life && p.life.items) || []).filter(isCar);
export const cond = LIFE.carCond;
export const condLabel = (c) => (c >= 95 ? 'Concours' : c >= 80 ? 'Excellent' : c >= 60 ? 'Good' : c >= 40 ? 'Tired' : c >= 20 ? 'Poor' : 'Wreck');
const at100 = (city, p, it) => LIFE.instValue(city, p, it) / LIFE.condMult(cond(it)); // its value in good condition (Concours wins count)
const wear = (it, d) => { it.cond = r2(Math.max(0, Math.min(100, cond(it) - d))); };
// the car you drive every day (null if none, or it is at the workshop)
export function dailyItem(p) { const L = p && p.life; if (!L || !L.daily) return null; const it = L.items.find((i) => i.uid === L.daily); return it && isCar(it) ? it : null; }
export function daily(p) { const it = dailyItem(p); return it && !it.shop && !it.loan && !it.lent ? it : null; }
export function where(it) { if (it.shop) return 'At the workshop'; if (it.loan) return { film: 'On a film set', ad: 'At a photo shoot', dealer: 'In the showroom' }[it.loan.to] || 'Lent out'; if (it.lent) return 'At the museum'; if (it.lot) return 'At auction'; return ''; }

// ---------------------------------------------------------------- workshops: service and restoration
// every standing auto repair shop takes private cars; the city garage always does (dearer and slower)
export function shops(city, ctx) { return (city.listings || []).filter((l) => l.type === 'autorepair' && l.owner && ctx.standing(l)); }
export function kindFor(it) { return cond(it) < K.service.min ? 'resto' : 'service'; }
function parts(city, c) { const x = K.resto.partsX[c.rarity] || 1; return Object.entries(K.resto.parts).map(([g, q]) => ({ g, q: r2(q * x), v: r5(q * x * ((city.market && city.market[g] ? city.market[g].p : GOODS[g].base))) })); }
// what a job costs and how long it takes at this workshop (lid = a listing id, or 'city')
export function quote(city, p, it, lid, ctx) {
  const c = ITEM[it.cid], kind = kindFor(it), v = at100(city, p, it), cityG = lid === 'city', l = cityG ? null : (city.listings || []).find((x) => x.id === lid);
  if (!cityG && (!l || l.type !== 'autorepair' || !l.owner || !ctx.standing(l))) return null;
  const x = cityG ? K.city.price : 1, slow = cityG ? K.city.slow : 1;
  if (kind === 'service') { const labour = r4((v * K.service.pct * (100 - cond(it)) + K.service.base) * x); return { kind, labour, parts: [], partsV: 0, price: labour, weeks: Math.max(1, Math.round(K.service.weeks * slow)), name: cityG ? K.city.name : co(l) }; }
  const ps = parts(city, c), partsV = r4(ps.reduce((a, q) => a + q.v, 0)), labour = r4(v * K.resto.labour * x);
  return { kind, labour, parts: ps, partsV, price: r4(labour + partsV * x), weeks: Math.round((K.resto.weeks[c.rarity] || 4) * slow), name: cityG ? K.city.name : co(l) };
}
// who must say yes: a workshop that another active tycoon runs asks them first
const asks = (city, l, p, ctx) => (l ? ctx.owners(l).filter((o) => o.id !== p.id && !ctx.inactive(o)) : []);
export function book(city, p, a, ctx) {
  const L = p.life, it = L.items.find((i) => i.uid === a.uid); if (!isCar(it)) return err('Pick one of your cars.');
  if (!LIFE.free(it) || it.lent) return err(`${ITEM[it.cid].name} is not in your garage right now.`);
  if (cond(it) >= 99.5) return err('It is in perfect condition already.');
  const q = quote(city, p, it, a.lid, ctx); if (!q) return err('That workshop does not take cars right now.');
  if (L.wallet < q.price) return err(`You need ${r2(q.price)} M on your account.`);
  const C = ensure(city), l = a.lid === 'city' ? null : ctx.listing(a.lid), who = asks(city, l, p, ctx);
  L.wallet = r4(L.wallet - q.price); LIFE.tx(L, city.m, `${q.name} · ${q.kind === 'resto' ? 'restoration' : 'service'} of ${ITEM[it.cid].name}`, -q.price);
  const j = { id: uid('cj'), pid: p.id, uid: it.uid, cid: it.cid, lid: a.lid, kind: q.kind, price: q.price, labour: q.labour, partsV: q.partsV, parts: q.parts, weeks: q.weeks, name: q.name, st: who.length ? 'ask' : 'work', g: city.g };
  if (j.st === 'work') j.ready = r5(city.g + q.weeks * WEEK);
  C.jobs.push(j); it.shop = j.id;
  if (who.length) {
    const ref = uid('r');
    who.forEach((o) => MAIL.send(o, { g: city.g, m: city.m, ref, car: true, from: { n: p.name, r: 'Private customer', k: 'person', pid: p.id }, lid: l.id, kind: 'info', subj: `${q.kind === 'resto' ? 'Restoration' : 'Service'}: ${ITEM[it.cid].name}`,
      body: `${p.name} wants ${co(l)} to ${q.kind === 'resto' ? 'restore' : 'service'} their ${ITEM[it.cid].name} (${ITEM[it.cid].rarity}, condition ${Math.round(cond(it))}). The job pays ${r2(q.labour)} M${q.partsV ? ` plus ${r2(q.partsV)} M for parts (more if your yard has steel, chips and textiles in stock)` : ''} and takes ${q.weeks} week${q.weeks > 1 ? 's' : ''}. If you do not answer within a week, the workshop takes it.`,
      due: r5(city.g + K.ask * WEEK), opts: [{ l: 'Take the job', d: `+${r2(q.labour)} M when the car is done.`, safe: true, car: { k: 'job', id: j.id, yes: true } }, { l: 'Turn it down', d: 'The customer gets their money back.', car: { k: 'job', id: j.id, yes: false } }] }));
    return ok(`Booked. ${co(l)} has a week to say yes. ${r2(q.price)} M is held until then.`);
  }
  return ok(`${ITEM[it.cid].name} is at ${q.name}. Ready in ${q.weeks} week${q.weeks > 1 ? 's' : ''}.`);
}
function refund(city, j, why, ctx) {
  const p = city.players[j.pid], it = p && p.life.items.find((i) => i.uid === j.uid); if (it) delete it.shop;
  if (p) { p.life.wallet = r4(p.life.wallet + j.price); LIFE.tx(p.life, city.m, `${j.name} · refund`, j.price); ctx.feed(p, city.m, `${j.name} will not take your ${ITEM[j.cid].name}`, `${why} ${r2(j.price)} M is back on your account.`, 'info'); }
  ensure(city).jobs = city.cars.jobs.filter((x) => x !== j);
}
export function cancel(city, p, a, ctx) {
  const j = ensure(city).jobs.find((x) => x.id === a.id && x.pid === p.id); if (!j) return err('No such job.');
  if (j.st !== 'ask') return err('The work has started. The car comes back when it is done.');
  refund(city, j, 'You cancelled the booking.', ctx); return ok('Booking cancelled. Your money is back.');
}
function start(city, j) { j.st = 'work'; j.ready = r5(city.g + j.weeks * WEEK); }
// a job is done: the car comes home in better shape and the workshop is paid (parts too, if it had them in its yard)
function finish(city, j, ctx) {
  const p = city.players[j.pid], it = p && p.life.items.find((i) => i.uid === j.uid), l = j.lid === 'city' ? null : ctx.listing(j.lid);
  let pay = j.labour;
  if (l && j.kind === 'resto' && l.ops) { const inv = l.ops.inv || {}; if ((j.parts || []).every((q) => (inv[q.g] || 0) >= q.q)) { j.parts.forEach((q) => { inv[q.g] = r2(inv[q.g] - q.q); }); pay = j.price; } }
  if (l && l.owner) { ctx.credit(city, l.owner, pay); ctx.notify(city, l, `${j.kind === 'resto' ? 'Restoration' : 'Service'} done: ${ITEM[j.cid].name}`, `${p ? p.name : 'The customer'} paid ${r2(pay)} M.`, 'good'); }
  if (it) {
    delete it.shop; const was = cond(it);
    it.cond = j.kind === 'resto' ? r2(K.resto.to[0] + Math.random() * (K.resto.to[1] - K.resto.to[0])) : 100;
    if (j.kind === 'resto') it.resto = j.name;
    ctx.feed(p, city.m, `${ITEM[j.cid].name} is ready`, `${j.name} ${j.kind === 'resto' ? 'restored' : 'serviced'} it: condition ${Math.round(was)} → ${Math.round(it.cond)}.`, 'good');
    MAIL.send(p, { g: city.g, m: city.m, from: { n: j.name, r: 'Workshop', k: 'person' }, kind: 'good', subj: `Your ${ITEM[j.cid].name} is ready`,
      body: `${j.kind === 'resto' ? 'The restoration is finished. Every panel is straight, the engine is rebuilt and the interior is new.' : 'Service done: fluids, brakes, a full check and a polish.'} Condition ${Math.round(was)} → ${Math.round(it.cond)}. It is back in your garage.` });
  }
  city.cars.jobs = city.cars.jobs.filter((x) => x !== j);
}
// a mail answer (opts[].car)
export function answer(city, p, x, o, ctx) {
  const a = o.car, C = ensure(city);
  if (a.k === 'job') {
    const j = C.jobs.find((y) => y.id === a.id); if (!j || j.st !== 'ask') return ok('That job is already settled.');
    const l = ctx.listing(j.lid); if (!l || !ctx.canRun(p.id, l)) return ok('The workshop is no longer yours.');
    if (!a.yes) { refund(city, j, `${co(l)} is fully booked.`, ctx); closeRefs(city, x); return ok('You turned the job down.'); }
    start(city, j); closeRefs(city, x); const c = city.players[j.pid];
    if (c) ctx.feed(c, city.m, `${co(l)} took your ${ITEM[j.cid].name}`, `Ready in ${j.weeks} week${j.weeks > 1 ? 's' : ''}.`, 'good');
    return ok(`The car is in the workshop. Ready in ${j.weeks} week${j.weeks > 1 ? 's' : ''}.`);
  }
  if (a.k === 'cc') return enter(city, p, { uid: a.uid }, ctx);
  return ok('Noted.');
}
// co-owners got the same request: once one answers, the others' mails close
function closeRefs(city, x) { if (!x.ref) return; Object.values(city.players).forEach((q) => (q.mail || []).forEach((y) => { if (y !== x && y.ref === x.ref && MAIL.isOpen(y)) { y.ans = -1; y.by = 'A co-owner'; y.out = 'A co-owner answered.'; } })); }

// ---------------------------------------------------------------- Cars & Coffee (once a month)
const impress = (it) => (K.rf[ITEM[it.cid].rarity] || 1) * (0.6 + 0.4 * cond(it) / 100);
const lovers = (city) => { const b = BOT.bots(city), fans = b.filter((x) => ((BOT.pers(x.id) || {}).types || []).some((t) => K.meet.types.includes(t))); return fans.length ? fans : b; };
export function meet(city, p, a, ctx) {
  const L = p.life, m = city.m; if (L.meetM === m) return err('You already went to Cars & Coffee this month.');
  const it = L.items.find((i) => i.uid === a.uid); if (!isCar(it) || !LIFE.free(it) || it.lent) return err('Pick a car from your garage.');
  const g = K.meet.who.find((x) => x.id === a.who); if (!g) return err('Pick who you want to meet.');
  const c = ITEM[it.cid], s = impress(it); L.meetM = m; it.drove = m; wear(it, K.wear.meet); L.legacy = (L.legacy || 0) + K.meet.legacy;
  if (g.id === 'motor') { const n = Math.round(3 * s), k = ctx.clientsBoost(p.id, n, K.meet.types); return ok(k ? `They all wanted to talk about your ${c.name}. ${k} clients of your car companies are ${n} points happier.` : `Everyone wanted a look at your ${c.name}. Own an auto repair shop, a dealership or a car factory and their clients get happier too.`); }
  if (g.id === 'tycoons') {
    const bs = lovers(city).sort(() => Math.random() - 0.5).slice(0, 2), d = Math.max(1, Math.round(1.5 * s));
    bs.forEach((b) => ctx.botEvent(b.id, p.id, 'deal', { d, t: `Admired your ${c.name} at Cars & Coffee` }));
    return ok(bs.length ? `${bs.map((b) => b.name).join(' and ')} came over to see your ${c.name}. They like you a little more.` : `A quiet morning. Your ${c.name} turned heads anyway.`);
  }
  const pool = COLLECTIBLES.filter((x) => x.cat === 'car' && x.rarity !== 'Legendary' && LIFE.available(city, x.id) > 0 && !L.items.some((i) => i.cid === x.id));
  if (!pool.length) return ok(`The collectors loved your ${c.name}, but nobody had a car to sell.`);
  const x = pool[Math.floor(Math.random() * pool.length)], disc = 0.06 + 0.03 * s; L.offer = { cid: x.id, price: r4(LIFE.itemValue(city, x.id) * (1 - disc)), until: m + 2 };
  return ok(`A collector who saw your ${c.name} offers you a ${x.name} at ${Math.round(disc * 100)}% below market. The offer is in your Personal tab for two months.`);
}

// ---------------------------------------------------------------- the Concours d'Élégance (once a year)
const yearOf = (m) => Math.floor(m / 12);
export const concours = (city) => (city.cars && city.cars.cc) || null;
export const ccOpen = (city) => { const cc = concours(city); return !!cc && !cc.res && city.m < cc.judge; };
export function enter(city, p, a, ctx) {
  const cc = concours(city); if (!ccOpen(city)) return err('Entries for the Concours are closed.');
  if (!a.uid) { delete cc.entries[p.id]; return ok('You withdrew your entry.'); }
  const it = p.life.items.find((i) => i.uid === a.uid); if (!isCar(it)) return err('Pick one of your cars.');
  cc.entries[p.id] = it.uid; return ok(`${ITEM[it.cid].name} is entered for the ${K.concours.name}. Keep it at home on judging day.`);
}
function score(city, p, it) {
  const c = ITEM[it.cid], sets = LIFE.completeSets(p);
  return (K.concours.base[c.rarity] || 20) + cond(it) * 0.3 + (c.set && sets.includes(c.set) ? 8 : 0) + (it.resto ? 5 : 0) + Math.random() * 15;
}
function openConcours(city, m, ctx) {
  const C = ensure(city), y = yearOf(m); if (C.cc && C.cc.y === y) return;
  C.cc = { y, judge: y * 12 + K.concours.judge, entries: {} };
  Object.values(city.players).forEach((p) => { if (p.bot || p.admin || !cars(p).length) return;
    MAIL.send(p, { g: city.g, m, from: { n: K.concours.name, r: 'Crown Hills, judging in two months', k: 'press' }, kind: 'info', car: true, subj: `Enter a car for the ${K.concours.name}`,
      body: `The lawns of Crown Hills are being mown. Enter one car from your garage before ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][K.concours.judge]}. The judges look at rarity, condition, complete sets and restoration work. Best in Show wins a trophy, the Gazette's front page and lasting value for the car.`,
      opts: cars(p).filter((i) => !i.lot).slice(0, 3).map((i) => ({ l: `Enter ${ITEM[i.cid].name}`, d: `${ITEM[i.cid].rarity} · condition ${Math.round(cond(i))}`, car: { k: 'cc', uid: i.uid } })).concat([{ l: 'Not this year', d: 'You can still enter from your garage.', safe: true, car: { k: 'none' } }]), due: r5(city.g + 1 / 12) }); });
}
function judge(city, m, ctx) {
  const cc = concours(city), field = [];
  Object.entries(cc.entries).forEach(([pid, u]) => { const p = city.players[pid], it = p && p.life.items.find((i) => i.uid === u); if (it && !it.shop && !it.loan && !it.lot && !it.lent) field.push({ p, it }); });
  BOT.bots(city).forEach((b) => { if (Math.random() > K.concours.bots) return; const best = cars(b).filter((i) => !i.lot).sort((x, y) => LIFE.itemValue(city, y.cid) - LIFE.itemValue(city, x.cid))[0]; if (best) field.push({ p: b, it: best }); });
  field.forEach((e) => { e.s = score(city, e.p, e.it); }); field.sort((a, b) => b.s - a.s);
  cc.res = field.slice(0, 5).map((e, i) => ({ pid: e.p.id, cid: e.it.cid, place: i + 1, s: Math.round(e.s) })); cc.n = field.length;
  if (!field.length) return;
  field.slice(0, 3).forEach((e, i) => { e.it.award = [...(e.it.award || []), { y: cc.y, place: i + 1 }]; if (!e.p.bot) e.p.life.legacy = (e.p.life.legacy || 0) + K.concours.legacy[i]; });
  const w = field[0];
  ctx.news(city, m, `${w.p.name}'s ${ITEM[w.it.cid].name} wins Best in Show`, `${field.length} cars on the lawn at the ${K.concours.name}. Second: ${field[1] ? `${field[1].p.name}'s ${ITEM[field[1].it.cid].name}` : 'nobody'}.`, 'good');
  const humans = field.filter((e) => !e.p.bot);
  humans.forEach((e) => {
    const place = field.indexOf(e) + 1;
    field.filter((x) => x.p.bot).forEach((x) => { if (field.indexOf(x) > field.indexOf(e)) ctx.botEvent(x.p.id, e.p.id, 'outbid', { d: -2, x: 'the Concours', t: `Beat my ${ITEM[x.it.cid].name} at the Concours` }); });
    MAIL.send(e.p, { g: city.g, m, from: { n: K.concours.name, r: 'The judges', k: 'press' }, kind: place <= 3 ? 'good' : 'info', subj: place === 1 ? 'Best in Show!' : place <= 3 ? `${place === 2 ? 'Second' : 'Third'} place at the Concours` : `Your ${ITEM[e.it.cid].name} came ${place}${place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}`,
      body: `${field.length} cars on the lawn this year.\n${field.slice(0, 3).map((x, i) => `${i + 1}. ${x.p.name}: ${ITEM[x.it.cid].name}`).join('\n')}\n${place === 1 ? `Your ${ITEM[e.it.cid].name} is now worth ${Math.round(K.concours.bonus * 100)}% more for good, and you get +${K.concours.legacy[0]} prestige.` : place <= 3 ? `+${K.concours.legacy[place - 1]} prestige.` : 'Better luck next year. Condition and restoration work count.'}` });
  });
}

// ---------------------------------------------------------------- lending (a month away) and the daily car
export function lend(city, p, a, ctx) {
  const L = p.life, it = L.items.find((i) => i.uid === a.uid); if (!isCar(it)) return err('Pick one of your cars.');
  if (!LIFE.free(it) || it.lent) return err(`${ITEM[it.cid].name} is not in your garage right now.`);
  const k = K.lend[a.to]; if (!k) return err('Pick who borrows it.');
  let lid = null;
  if (a.to === 'dealer') { const l = ctx.runs(p.id).find((x) => x.type === 'dealer' && (!a.lid || x.id === a.lid)); if (!l) return err('You need a dealership to put it in the window.'); if (l.cx && l.cx.ypi) return err(`${co(l)} already has a special running.`); lid = l.id; }
  const v = LIFE.instValue(city, p, it);
  it.lent = true; it.loan = { to: a.to, back: city.m + 1, lid, fee: r4(v * (k.fee || 0)) }; it.drove = city.m; if (L.daily === it.uid) L.daily = null;
  if (lid) { const l = ctx.listing(lid), s = SIZES[l.size].mult; l.cx = { ...(l.cx || {}), ypi: { v: r2(k.ypi * s * Math.max(1, K.rf[ITEM[it.cid].rarity])), until: r5(city.g + 1 / 12), note: `${ITEM[it.cid].name} in the window` } }; }
  return ok(a.to === 'dealer' ? `${ITEM[it.cid].name} stands in the window at ${co(ctx.listing(lid))} for a month.` : `${ITEM[it.cid].name} goes to ${k.label.toLowerCase()} for a month. ${r2(it.loan.fee)} M when it comes back.`);
}
function back(city, p, it, ctx) {
  const o = it.loan, k = K.lend[o.to], c = ITEM[it.cid]; delete it.loan; it.lent = false;
  let t = `${c.name} is back in your garage.`;
  if (o.fee) { p.life.wallet = r4(p.life.wallet + o.fee); LIFE.tx(p.life, city.m, `${k.label} · loan of ${c.name}`, o.fee); t += ` ${r2(o.fee)} M fee paid.`; }
  if (k.legacy) p.life.legacy = (p.life.legacy || 0) + k.legacy;
  if (k.risk && Math.random() < k.risk) { const d = k.dmg[0] + Math.random() * (k.dmg[1] - k.dmg[0]); wear(it, d); t += ` The chase scene left marks: condition −${Math.round(d)}.`; }
  ctx.feed(p, city.m, `${c.name} is back`, t, o.to === 'film' && /marks/.test(t) ? 'bad' : 'good');
}
export function setDaily(city, p, a) {
  const L = p.life; if (!a.uid) { L.daily = null; return ok('You leave the cars at home and take a taxi.'); }
  const it = L.items.find((i) => i.uid === a.uid); if (!isCar(it)) return err('Pick one of your cars.');
  if (it.lent || it.lot) return err(`${ITEM[it.cid].name} is not in your garage.`);
  L.daily = it.uid; return ok(`You drive the ${ITEM[it.cid].name} every day now. It shows on the map and your profile. More prestige, faster wear.`);
}
// the bank's credit committee notices what you arrive in (banks.js score)
export function bankNudge(p) { const it = daily(p); return it ? (K.daily.bank[ITEM[it.cid].rarity] || 0) : 0; }

// ---------------------------------------------------------------- time
export function weekStep(city, ctx) {
  const C = ensure(city);
  C.jobs.slice().forEach((j) => {
    if (!city.players[j.pid]) { C.jobs = C.jobs.filter((x) => x !== j); return; }
    if (j.st === 'ask' && city.g - j.g > 2 * K.ask * WEEK) start(city, j); // nobody answered: the workshop takes it
    else if (j.st === 'work' && j.ready <= city.g + 1e-9) finish(city, j, ctx);
  });
}
export function monthStep(city, m, ctx) {
  ensure(city);
  Object.values(city.players).forEach((p) => {
    if (p.bot || !p.life) return; const L = p.life;
    if (L.daily && !dailyItem(p)) L.daily = null;
    cars(p).forEach((it) => {
      if (it.loan && m >= it.loan.back) back(city, p, it, ctx);
      if (it.shop || it.loan || it.lent) return;
      if (L.daily === it.uid) { it.drove = m; wear(it, K.wear.daily); } else if (m - (it.drove ?? it.m ?? m) >= K.wear.idleM) wear(it, K.wear.idle); // a classic that never runs gets tired too
    });
    const d = daily(p);
    if (d && m % K.daily.bots === 0) { const r = ITEM[d.cid].rarity, dv = r === 'Legendary' || r === 'Epic' ? 1 : r === 'Common' ? -1 : 0; if (dv) lovers(city).slice(0, 3).forEach((b) => ctx.botEvent(b.id, p.id, 'deal', { d: dv, t: dv > 0 ? `Drives a ${ITEM[d.cid].name}` : `Drives around in a ${ITEM[d.cid].name}` })); }
  });
  const mo = m % 12, cc = concours(city);
  if (mo === K.concours.open) openConcours(city, m, ctx);
  if (cc && !cc.res && m >= cc.judge) judge(city, m, ctx);
}

export function act(city, p, action, a, ctx) {
  if (p.bot) return err('Only tycoons do that.');
  LIFE.ensurePlayer(city, p);
  switch (action) {
    case 'carService': return book(city, p, a, ctx);
    case 'carCancel': return cancel(city, p, a, ctx);
    case 'carMeet': return meet(city, p, a, ctx);
    case 'carEnter': return enter(city, p, a, ctx);
    case 'carLend': return lend(city, p, a, ctx);
    case 'carDaily': return setDaily(city, p, a);
    default: return null;
  }
}

// a forgotten classic from a barn (chance card Barn Find): a one-off car in poor condition, straight into your garage
export function barnCar(city, p, k, rnd = Math.random) {
  const R = Object.keys(k.rar); let t = rnd() * R.reduce((a, r) => a + k.rar[r], 0), rarity = R[0];
  for (const r of R) { t -= k.rar[r]; if (t <= 0) { rarity = r; break; } }
  const pool = k.models.filter((x) => x.rar.includes(rarity)), mo = pool.length ? pool[Math.floor(rnd() * pool.length)] : k.models[0];
  if (!pool.length) rarity = mo.rar[0];
  const id = uid('bf'), def = { id, cat: 'car', name: mo.name, maker: mo.maker, year: mo.year, rarity, v: r4(mo.v[0] + rnd() * (mo.v[1] - mo.v[0])), ed: 1, medium: mo.medium, g0: r4(city.m / 12), lid: 'barn', madeM: city.m };
  city.life.made[id] = def; LIFE.ITEM[id] = def; city.life.items[id] = { f: 1, h: [] }; city.life.items[id].h.push(r4(LIFE.itemValue(city, id)));
  const it = { uid: uid('i'), cid: id, m: city.m, cost: k.fee, lent: false, cond: r2(k.cond[0] + rnd() * (k.cond[1] - k.cond[0])), drove: city.m };
  p.life.items.push(it); return it;
}
