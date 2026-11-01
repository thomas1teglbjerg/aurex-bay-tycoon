// Aurex Bay Tycoon — specialists as a living market.
// Each specialist is one person who works for one tycoon at a time, on a contract with a salary and an end date.
// They get stressed when they carry too much, bored without new challenges, and unhappy when underpaid.
// Unhappy specialists hand in their notice. Rivals can scout them and bid for them, like athletes.
import { STAFF, TALENT, TALENT_TITLE, TALENT_RULES as R, SIZES, DEPTS } from './content.js';

const r2 = (v) => Math.round(v * 100) / 100;
const r4 = (v) => Math.round(v * 10000) / 10000;
const rand = Math.random;
const pick = (a) => a[Math.floor(rand() * a.length)];
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const ok = (msg, x) => ({ ok: true, msg, ...(x || {}) });
const err = (msg) => ({ ok: false, msg });
let seq = 0; const uid = (p) => p + Date.now().toString(36).slice(-4) + (seq++).toString(36) + rand().toString(36).slice(2, 5);
export const PERSON = Object.fromEntries(TALENT.map((t) => [t.id, t]));
export const ROLE = Object.fromEntries(STAFF.map((s) => [s.id, s]));
const DEPT_OF = Object.fromEntries(DEPTS.filter((d) => d.head).map((d) => [d.head, d.id]));

// ---------------------------------------------------------------- state
export function ensure(city) {
  if (!city.talent) {
    city.talent = {};
    TALENT.forEach((t) => { city.talent[t.id] = fresh(t, city.m || 0); });
    city.tOffers = [];
    // existing tycoons keep the roles they had: give each the best free person in that role
    Object.values(city.players).forEach((p) => {
      const kinds = (p.staff || []).slice(); p.staff = []; p.team = {};
      kinds.forEach((k) => { const t = TALENT.filter((x) => x.kind === k && !city.talent[x.id].owner).sort((a, b) => (b.id === k) - (a.id === k))[0]; if (t) sign(city, p, t.id, ask(city, t.id), 2, city.m || 0, true); });
    });
  }
  TALENT.forEach((t) => { if (!city.talent[t.id]) city.talent[t.id] = fresh(t, city.m || 0); });
  city.tOffers = city.tOffers || [];
  Object.values(city.players).forEach((p) => { if (!p.team) p.team = {}; });
  return city.talent;
}
function fresh(t, m) { return { owner: null, salary: 0, since: null, until: null, stress: 15, boredom: 10, sat: 70, chal: m, vac: -99, leave: null, notice: null, xp: 0, rating: t.rating, scout: {}, listed: null, bonus: 0 }; }
export function seedBots(city) {
  ensure(city);
  Object.values(city.players).filter((p) => p.bot).forEach((p) => {
    const n = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) { const free = TALENT.filter((t) => !t.starter && !city.talent[t.id].owner && !p.team[t.kind]); if (!free.length) break; const t = pick(free); sign(city, p, t.id, ask(city, t.id) * (0.95 + rand() * 0.2), 1 + Math.floor(rand() * 3), 0, true); }
  });
}

// ---------------------------------------------------------------- numbers
export const st = (city, tid) => city.talent[tid];
export const title = (city, tid) => { const t = PERSON[tid], r = st(city, tid).rating; return `${TALENT_TITLE[r - 1] ? TALENT_TITLE[r - 1] + ' ' : ''}${(t.role || ROLE[t.kind].role).replace(/^(Junior|Senior) /, '')}`; };
export function ask(city, tid) { const t = PERSON[tid], s = st(city, tid); return r2(R.base[t.kind] * (t.pay || 1) * R.mult[s.rating - 1] * (1 + Math.min(0.3, s.xp / 200))); }
export function signFee(city, p, tid) { const t = PERSON[tid]; return r2(Math.max(0.2, ROLE[t.kind].cost * 0.6 * (t.pay || 1) * R.feeMult[st(city, tid).rating - 1] - (p && hasKind(p, 'emily') ? 0.5 : 0))); }
export const yearsLeft = (city, tid) => { const s = st(city, tid); return s.until == null ? 0 : Math.max(0, (s.until - city.m) / 12); };
// what a club would want to let them go: more for long contracts and stars, less when the specialist is unhappy
export function value(city, tid) { const s = st(city, tid); if (!s.owner) return 0; return r2(ask(city, tid) * (1.2 + yearsLeft(city, tid) * 1.1) * (s.sat < 40 ? 0.65 : s.sat < 60 ? 0.85 : 1)); }
export const headBonus = (rating) => r2(0.25 + 0.085 * rating); // automation a head adds to their department
export const headYpi = (rating) => r2(0.3 + 0.3 * rating); // extra YPI (× company size) in the company a specialist leads
export const hasKind = (p, kind) => (p.staff || []).includes(kind);
export const teamOf = (city, p) => Object.values(p.team || {}).filter((tid) => st(city, tid) && st(city, tid).owner === p.id);
export const salaries = (city, p) => teamOf(city, p).reduce((a, tid) => a + st(city, tid).salary, 0);
export function mood(s) { return s.notice != null ? 'Handed in notice' : s.leave != null ? 'Burned out, on leave' : s.stress > 75 ? 'Close to burnout' : s.boredom > 70 ? 'Bored' : s.sat < 40 ? 'Unhappy' : s.sat > 75 ? 'Thriving' : 'Content'; }
export const scouted = (city, p, tid) => { const s = st(city, tid); return s.owner === p.id || (s.scout[p.id] != null && s.scout[p.id] >= city.m); };
// will the specialist accept this salary? Happy people want a premium to move, unhappy ones jump at a fair offer.
export function willAccept(city, tid, salary, moving) { const s = st(city, tid), a = ask(city, tid); const need = moving ? a * (s.sat > 70 ? 1.2 : s.sat > 45 ? 1.05 : 0.9) : a * 0.9; return salary >= need - 1e-9 ? { ok: true } : { ok: false, need: r2(need) }; }

// ---------------------------------------------------------------- moves
function sign(city, p, tid, salary, years, m, quiet) {
  const t = PERSON[tid], s = st(city, tid);
  Object.assign(s, { owner: p.id, salary: r2(salary), since: m, until: m + Math.round(years * 12), stress: Math.min(s.stress, 30), boredom: 10, chal: m, leave: null, notice: null, listed: null, sat: clamp(60 + (salary / ask(city, tid) - 1) * 80) });
  p.team = p.team || {}; p.team[t.kind] = tid; if (!p.staff.includes(t.kind)) p.staff.push(t.kind);
  city.tOffers = (city.tOffers || []).filter((o) => o.tid !== tid || o.status !== 'open');
}
function release(city, tid, ctx, why) {
  const t = PERSON[tid], s = st(city, tid), p = city.players[s.owner];
  if (p) { ctx.unassign(city, p, t.kind); if (p.team[t.kind] === tid) delete p.team[t.kind]; p.staff = p.staff.filter((k) => k !== t.kind); }
  Object.assign(s, { owner: null, salary: 0, since: null, until: null, leave: null, notice: null, listed: null, stress: Math.max(10, s.stress - 30), boredom: 20 });
  city.tOffers = (city.tOffers || []).filter((o) => o.tid !== tid || o.status !== 'open');
  if (p && why && !p.bot) ctx.feed(p, city.m, `${t.name} has left`, why, 'bad');
}
function transfer(city, tid, buyer, fee, salary, years, ctx) {
  const t = PERSON[tid], s = st(city, tid), seller = city.players[s.owner];
  if (buyer.team[t.kind] && buyer.team[t.kind] !== tid) return err(`You already have a ${ROLE[t.kind].role}. Release them first.`);
  if (buyer.cash < fee) return err(`${buyer.name} cannot pay the ${fee} M transfer fee.`);
  buyer.cash -= fee; if (seller) seller.cash += fee;
  release(city, tid, ctx, null); sign(city, buyer, tid, salary, years, city.m);
  if (seller && !seller.bot) ctx.feed(seller, city.m, `${t.name} moves to ${buyer.name}`, `You receive a transfer fee of ${r2(fee)} M.`, 'info');
  ctx.news(city, city.m, `${buyer.name} signs ${t.name}${seller ? ` from ${seller.name}` : ''}`, `${title(city, tid)} · ${r2(salary)} M a year for ${years} year${years > 1 ? 's' : ''}${fee ? ` · fee ${r2(fee)} M` : ''}.`, 'info');
  return ok(`${t.name} joins your team.`);
}

// ---------------------------------------------------------------- monthly life of a specialist
export function monthStep(city, m, ctx) {
  ensure(city);
  TALENT.forEach((t) => {
    const s = st(city, t.id), p = s.owner ? city.players[s.owner] : null;
    if (!p) { s.stress = Math.max(5, s.stress - 10); s.boredom = Math.min(60, s.boredom + 2); s.sat = 70; return; }
    const human = !p.bot, away = human && ctx.inactive(p);
    // back from burnout leave
    if (s.leave != null) { s.stress = Math.max(10, s.stress - 25); if (m >= s.leave) { s.leave = null; if (!p.staff.includes(t.kind)) p.staff.push(t.kind); if (human) ctx.feed(p, m, `${t.name} is back from leave`, 'Rested and ready to work.', 'good'); } return; }
    const a = human ? p.assign && p.assign[t.kind] : { lid: true };
    const l = a && a.lid !== true ? ctx.listing(city, a.lid) : null;
    // workload: heading a department is work; a big company or an understaffed department is more work
    let load = a ? 1 : 0.25;
    if (l) { load *= l.size === 'L' ? 1.35 : l.size === 'S' ? 0.8 : 1; const dept = DEPT_OF[t.kind], d = l.ops && l.ops.depts[dept]; if (d && ctx.automationWithout(l, dept) < 0.5) load += 0.45; }
    if (p.bot) load = 0.7 + rand() * 0.4;
    s.stress = clamp(s.stress + load * (R.stressBase + 4) - 5 + (rand() - 0.5) * 2);
    s.boredom = clamp(s.boredom + (a ? R.boredomHead : R.boredomIdle) + (rand() - 0.5) * 2);
    if (p.bot && rand() < 0.15) { s.boredom = Math.max(0, s.boredom - 35); s.stress = Math.max(0, s.stress - 25); }
    if (a) s.xp += 1;
    if (s.xp >= R.xpPerRating * s.rating && s.rating < 5) { s.rating++; if (human) ctx.feed(p, m, `${t.name} grew into a ${title(city, t.id)}`, `Stronger as a head, but their market value and salary expectations rise too. They now ask ${ask(city, t.id)} M a year.`, 'good'); }
    if (l && l.ops && l.ops.depts[DEPT_OF[t.kind]]) { l.ops.depts[DEPT_OF[t.kind]].hb = headBonus(s.rating); l.ops.depts[DEPT_OF[t.kind]].who = t.id; }
    // satisfaction moves toward pay, workload and challenge — and drops when nobody is there to lead
    const pay = (s.salary / ask(city, t.id) - 1) * 90;
    const target = 66 + clamp(pay, -60, 25) - Math.max(0, s.stress - 55) * 0.9 - Math.max(0, s.boredom - 55) * 0.9 + s.bonus - (away ? 14 : 0);
    s.sat = clamp(s.sat + (target - s.sat) * 0.3); s.bonus = Math.max(0, s.bonus - 3);
    // burnout
    if (s.stress >= R.burnout) {
      s.leave = m + R.leaveMonths; s.stress = 55; s.sat = clamp(s.sat - 10); p.staff = p.staff.filter((k) => k !== t.kind);
      if (human) ctx.feed(p, m, `${t.name} burned out`, `On sick leave for ${R.leaveMonths} months. Their bonus as head is gone until they return. Lighter workloads and vacations prevent this.`, 'bad');
      return;
    }
    if (human && s.stress > 75 && rand() < 0.5) ctx.feed(p, m, `${t.name} is close to burnout`, `Stress ${Math.round(s.stress)}. Give them a vacation or hire more staff in their department.`, 'bad');
    if (human && s.boredom > 75 && rand() < 0.4) ctx.feed(p, m, `${t.name} is bored`, 'Give them a new challenge or a new company to lead.', 'info');
    // notice and quitting
    if (s.notice != null) {
      if (s.sat >= 42) { s.notice = null; if (human) ctx.feed(p, m, `${t.name} withdrew their notice`, 'They are happier now and will stay.', 'good'); }
      else if (m >= s.notice) { release(city, t.id, ctx, 'They served their notice and are now a free agent. Other tycoons can sign them.'); return; }
    } else if (s.sat < R.quitBelow && rand() < (p.bot ? 0.15 : 0.45)) {
      s.notice = m + R.notice; if (human) ctx.feed(p, m, `${t.name} handed in their notice`, `Satisfaction ${Math.round(s.sat)}. They leave in ${R.notice} months unless things improve: raise their pay, cut their workload or give them a challenge.`, 'bad');
    }
    // contracts
    const left = s.until - m;
    if (left <= 0) {
      if (p.bot) { if (s.sat > 35 && p.cash > ask(city, t.id) * 2) { s.salary = r2(Math.max(s.salary, ask(city, t.id))); s.until = m + 12 * (1 + Math.floor(rand() * 3)); } else release(city, t.id, ctx, null); }
      else release(city, t.id, ctx, 'Their contract ran out before you renewed it. They are now a free agent.');
      return;
    }
    if (human && (left === 3 || left === 1)) ctx.feed(p, m, `${t.name}'s contract ends in ${left} month${left > 1 ? 's' : ''}`, `Renew it in your Empire, or they become a free agent. They ask about ${renewAsk(city, t.id)} M a year.`, left === 1 ? 'bad' : 'info');
  });
  // transfer offers to human owners that nobody answered
  (city.tOffers || []).forEach((o) => {
    if (o.status !== 'open' || m - o.m < R.offerMonths) return;
    const s = st(city, o.tid), owner = city.players[o.to], buyer = city.players[o.from], t = PERSON[o.tid];
    if (!owner || s.owner !== owner.id || !buyer) { o.status = 'void'; return; }
    // an absent owner cannot keep an unhappy specialist: they use the release clause
    if (ctx.inactive(owner) && s.sat < 55 && (s.until - m) < 24) {
      o.status = 'forced'; const r = transfer(city, o.tid, buyer, o.fee, o.salary, o.years, ctx);
      if (r.ok && !owner.bot) ctx.feed(owner, m, `${t.name} left while you were away`, `${buyer.name} offered ${o.fee} M and you never answered. Unhappy and with a short contract, they used their release clause.`, 'bad');
    } else { o.status = 'expired'; if (!buyer.bot) ctx.feed(buyer, m, `No answer on ${t.name}`, 'Your transfer offer expired.', 'info'); }
  });
  city.tOffers = (city.tOffers || []).filter((o) => o.status === 'open' || m - o.m < 6);
}
export function renewAsk(city, tid) { const s = st(city, tid); return r2(ask(city, tid) * (s.sat < 50 ? 1.15 : s.sat > 75 ? 0.95 : 1)); }

// ---------------------------------------------------------------- bots in the market
export function botStep(city, p, m, ctx) {
  ensure(city);
  // sign a free agent for a missing role
  if (rand() < 0.06) {
    const free = TALENT.filter((t) => !t.starter && !st(city, t.id).owner && !p.team[t.kind] && p.cash > signFee(city, p, t.id) + 6);
    if (free.length) { const t = pick(free); p.cash -= signFee(city, p, t.id); sign(city, p, t.id, ask(city, t.id) * (1 + rand() * 0.15), 1 + Math.floor(rand() * 3), m); ctx.news(city, m, `${p.name} signs ${t.name}`, `${title(city, t.id)}, a free agent.`, 'info'); }
  }
  // buy specialists listed for transfer
  if (rand() < 0.2) TALENT.forEach((t) => { const s = st(city, t.id); if (s.listed != null && s.owner !== p.id && !p.team[t.kind] && s.listed <= value(city, t.id) * 1.15 && p.cash > s.listed + 5 && rand() < 0.4) transfer(city, t.id, p, s.listed, Math.max(ask(city, t.id), s.salary), 2, ctx); });
  // poach: bid for a human's specialist when it is unhappy or the owner is away
  if (rand() < 0.05) {
    const targets = TALENT.filter((t) => { const s = st(city, t.id), o = s.owner && city.players[s.owner]; return o && !o.bot && !p.team[t.kind] && (s.sat < 50 || ctx.inactive(o)) && !city.tOffers.some((x) => x.tid === t.id && x.status === 'open'); });
    if (targets.length) { const t = pick(targets), fee = r2(value(city, t.id) * (0.85 + rand() * 0.3)), salary = r2(ask(city, t.id) * 1.1); if (p.cash > fee + 5) offer(city, p, t.id, fee, salary, 2, ctx); }
  }
}

// ---------------------------------------------------------------- transfer offers
function offer(city, p, tid, fee, salary, years, ctx) {
  const t = PERSON[tid], s = st(city, tid), owner = city.players[s.owner];
  if (!owner) return err('This specialist is a free agent. Sign them directly.');
  if (owner.id === p.id) return err('They already work for you.');
  if (p.team[t.kind]) return err(`You already have a ${ROLE[t.kind].role}. Release or sell them first.`);
  const wa = willAccept(city, tid, salary, true); if (!wa.ok) return err(`${t.name} wants at least ${wa.need} M a year to move.`);
  if (p.cash < fee) return err(`You need ${fee} M in cash for the fee.`);
  if (owner.bot) {
    const v = value(city, tid);
    if (fee >= v * (0.9 + rand() * 0.25)) return transfer(city, tid, p, fee, salary, years, ctx);
    return err(`${owner.name} turns it down. They value ${t.name} at about ${r2(v)} M.`);
  }
  if (city.tOffers.some((o) => o.tid === tid && o.from === p.id && o.status === 'open')) return err('You already have an offer on the table.');
  city.tOffers.push({ id: uid('to'), tid, from: p.id, to: owner.id, fee: r2(fee), salary: r2(salary), years, m: city.m, status: 'open' });
  ctx.feed(owner, city.m, `${p.name} bids ${r2(fee)} M for ${t.name}`, 'Answer in your Empire inbox within two months.', 'info');
  return ok(`Offer sent to ${owner.name}. They have two months to answer.`);
}

// ---------------------------------------------------------------- player actions
export function act(city, p, action, a, ctx) {
  ensure(city); const m = city.m, tid = a.tid, t = PERSON[tid], s = t && st(city, tid);
  if (!t) return err('Unknown specialist.');
  const mine = s.owner === p.id;
  const years = Math.max(1, Math.min(R.maxYears, Math.round(Number(a.years) || 2)));
  const salary = r2(Number(a.salary) || ask(city, tid));
  switch (action) {
    case 'hire': {
      if (s.owner) return err('They are under contract with someone else. Make a transfer offer instead.');
      if (p.team[t.kind]) return err(`You already have a ${ROLE[t.kind].role}. Release them first.`);
      const wa = willAccept(city, tid, salary, false); if (!wa.ok) return err(`${t.name} wants at least ${wa.need} M a year.`);
      const fee = signFee(city, p, tid); if (p.cash < fee) return err(`The signing fee is ${fee} M.`);
      p.cash -= fee; sign(city, p, tid, salary, years, m);
      ctx.news(city, m, `${p.name} signs ${t.name}`, `${title(city, tid)} · ${years} year${years > 1 ? 's' : ''}.`, 'info');
      return ok(`${t.name} signed for ${years} year${years > 1 ? 's' : ''} at ${salary} M a year.`);
    }
    case 'fire': {
      if (!mine) return err('Not on your team.');
      const sev = r2(s.salary * Math.min(1, yearsLeft(city, tid)) * 0.5); p.cash -= sev; release(city, tid, ctx, null);
      return ok(`${t.name} released. Severance ${sev} M.`);
    }
    case 'tSalary': {
      if (!mine) return err('Not on your team.'); const old = s.salary; if (salary <= 0) return err('Pick a salary.');
      s.salary = salary; if (salary < old) { s.sat = clamp(s.sat - 8 - (old - salary) / old * 60); return ok(`Salary cut to ${salary} M. ${t.name} is not happy about it.`); }
      s.sat = clamp(s.sat + (salary - old) / old * 40); return ok(`Raise to ${salary} M a year.`);
    }
    case 'tVacation': {
      if (!mine) return err('Not on your team.'); if (s.leave != null) return err('Already away.'); if (m - s.vac < R.vacationCooldown) return err(`Next vacation possible in ${R.vacationCooldown - (m - s.vac)} months.`);
      s.vac = m; s.stress = Math.max(0, s.stress - 45); s.sat = clamp(s.sat + 6); s.leave = m + 1; p.staff = p.staff.filter((k) => k !== t.kind);
      return ok(`${t.name} is on vacation this month. Stress −45. Back next month.`);
    }
    case 'tChallenge': {
      if (!mine) return err('Not on your team.'); if (m - s.chal < R.challengeCooldown) return err(`They are still busy with the last project (${R.challengeCooldown - (m - s.chal)} months left).`);
      const cost = r2(s.salary * 0.2); if (p.cash < cost) return err(`The project costs ${cost} M.`);
      p.cash -= cost; s.chal = m; s.boredom = Math.max(0, s.boredom - 45); s.xp += 4; s.stress = clamp(s.stress + 6);
      return ok(`${t.name} leads a new strategic project (${cost} M). Boredom −45, more experience.`);
    }
    case 'tBonus': {
      if (!mine) return err('Not on your team.'); const cost = r2(s.salary * 0.25); if (p.cash < cost) return err(`A bonus costs ${cost} M.`);
      p.cash -= cost; s.bonus = Math.min(30, s.bonus + 12); s.sat = clamp(s.sat + 10); return ok(`Bonus paid (${cost} M). ${t.name} feels valued.`);
    }
    case 'tRenew': {
      if (!mine) return err('Not on your team.'); if (s.until - m > 12) return err('Contracts can be renewed in their final year.');
      const need = renewAsk(city, tid) * (s.sat > 60 ? 0.92 : 1); if (salary < need - 1e-9) return err(`${t.name} wants at least ${r2(need)} M a year to stay.`);
      if (s.sat < 25) return err(`${t.name} is too unhappy to talk about a new contract. Improve their situation first.`);
      s.salary = salary; s.until = m + years * 12; s.notice = null; s.sat = clamp(s.sat + 8);
      return ok(`${t.name} renewed for ${years} year${years > 1 ? 's' : ''} at ${salary} M a year.`);
    }
    case 'tList': { if (!mine) return err('Not on your team.'); const price = r2(Number(a.price) || 0); s.listed = price > 0 ? price : null; return ok(s.listed ? `${t.name} is on the transfer list at ${price} M.` : 'Taken off the transfer list.'); }
    case 'tScout': {
      if (mine) return err('They work for you.'); if (scouted(city, p, tid)) return err('You already have a fresh report.');
      if (p.cash < R.scoutFee) return err('Scouting costs ' + R.scoutFee + ' M.'); p.cash -= R.scoutFee; s.scout[p.id] = m + R.scoutMonths;
      return ok(`Scouting report on ${t.name} ready: ${mood(s).toLowerCase()}, satisfaction ${Math.round(s.sat)}.`);
    }
    case 'tOffer': return offer(city, p, tid, r2(Number(a.fee) || 0), salary, years, ctx);
    case 'tOfferAccept': case 'tOfferDecline': {
      const o = city.tOffers.find((x) => x.id === a.oid && x.to === p.id && x.status === 'open'); if (!o) return err('This offer is no longer open.');
      const buyer = city.players[o.from];
      if (action === 'tOfferDecline') { o.status = 'declined'; s.sat = clamp(s.sat - (o.salary > s.salary * 1.15 ? 8 : 2)); if (!buyer.bot) ctx.feed(buyer, m, `${p.name} kept ${t.name}`, 'Your transfer offer was declined.', 'info'); return ok(`You keep ${t.name}.${o.salary > s.salary * 1.15 ? ' They are disappointed: the offer paid much better.' : ''}`); }
      o.status = 'accepted'; return transfer(city, tid, buyer, o.fee, o.salary, o.years, ctx);
    }
  }
  return null;
}
