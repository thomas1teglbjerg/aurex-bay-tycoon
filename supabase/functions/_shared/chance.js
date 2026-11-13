// Chance cards (CH from engine.js; cards, texts and numbers in CHANCE in content.js).
// Like the board game's chance cards: a choice that costs something to win something else. There is no deck:
// each card has a trigger (find) that looks at the economy, your companies and the rival tycoons, and a heat 0–1
// (how well it fits right now). Every 3–5 game months a tycoon gets a chance for a card (p.chance.next, planned in the
// weekly agenda); the engine draws one of the cards that fit, weighted by heat, or looks again a month later.
// A card is a mail with `ch` (and opts with `ch` or `bot`), open for a game month; the autopilot always passes.
// Timed effects: p.cx (fire: free layoffs until g, hire: { x, until } hiring fee, move: free worker moves until g)
// and l.cx (shield: the next bad happening is settled, dbl: the next bad happening hits twice).
import { CHANCE as C, BOT_REL, TYPES, SIZES, TALENT, RECIPES, GOODS, STOCKS, WORLD, BANKS, SETS } from './content.js';
import * as MAIL from './mail.js';
import * as OPS from './ops.js';
import * as TAL from './talent.js';
import * as BOT from './bots.js';
import * as LIFE from './life.js';
import * as AUTO from './cars.js';

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const r5 = (v) => Math.round(v * 1e5) / 1e5;
const ok = (msg) => ({ ok: true, msg }), err = (msg) => ({ ok: false, msg });
const MO = 1 / 12;
const co = (l) => l.title || TYPES[l.type].name;
const s = (l) => SIZES[l.size].mult;
export const CARDS = C.cards;

// ---------------------------------------------------------------- state and timing
export function ensure(city, p, rnd = Math.random) {
  if (!p.chance) {
    // a tycoon who joins later waits C.newbie months; everyone already playing gets a first chance soon
    const fresh = city.m - (p.joinedM ?? 0) < C.newbie, f = C.first;
    p.chance = { next: r5(fresh ? ((p.joinedM ?? 0) + C.newbie) / 12 : city.g + (f[0] + rnd() * (f[1] - f[0])) * MO), last: {}, log: [] };
  }
  return p.chance;
}
const gap = (rnd) => (C.every[0] + rnd() * (C.every[1] - C.every[0])) * MO;
export const eligible = (p) => !!p && !p.bot && !p.admin && !p.coop;
// the weekly plan: a tycoon whose chance falls in this week gets an agenda event at that moment
export function plan(city, wk, add, rnd = Math.random) {
  Object.values(city.players).forEach((p) => {
    if (!eligible(p)) return; const c = ensure(city, p, rnd);
    if (c.next >= (wk + 1) / 48 || (city.agenda || []).some((e) => e.k === 'chance' && e.pid === p.id)) return;
    add(Math.max(c.next, (wk + 0.05 + rnd() * 0.5) / 48), p.id);
  });
}
// the moment has come: draw a card that fits, or look again a month later
export function draw(city, p, ctx, rnd = Math.random) {
  if (!eligible(p)) return null; const c = ensure(city, p, rnd);
  const again = (t) => { c.next = r5(city.g + t); return null; };
  if (ctx.inactive(p) || (p.mail || []).some((x) => x.ch && MAIL.isOpen(x))) return again(C.retry * MO);
  const hits = fits(city, p, ctx); if (!hits.length) return again(C.retry * MO);
  let r = rnd() * hits.reduce((a, h) => a + h.heat, 0), hit = hits[hits.length - 1];
  for (const h of hits) { r -= h.heat; if (r <= 0) { hit = h; break; } }
  const mail = deal(city, p, hit, ctx); if (!mail) return again(C.retry * MO);
  again(gap(rnd)); return mail;
}
// every card that fits this tycoon right now (one entry per company or rival it fits), with its heat
export function fits(city, p, ctx) {
  const c = ensure(city, p), hits = [];
  Object.keys(CARDS).forEach((id) => { if (city.m - (c.last[id] ?? -99) < C.once) return; (FIND[id](city, p, ctx) || []).forEach((h) => { if (h.heat > 0) hits.push({ id, ...h, heat: Math.min(1, h.heat) }); }); });
  return hits;
}
// hand out one card: its mail, open for a game month
export function deal(city, p, hit, ctx) {
  const c = ensure(city, p), mail = SEND[hit.id](city, p, hit, ctx); if (!mail) return null;
  mail.ch = { id: hit.id, why: hit.why }; mail.due = r5(city.g + C.open * MO);
  c.last[hit.id] = city.m; c.log = [{ id: hit.id, m: city.m, mid: mail.id }, ...(c.log || [])].slice(0, 20);
  return mail;
}

// ---------------------------------------------------------------- what each card looks for
const workers = (l) => Object.values(l.ops.depts).reduce((a, d) => a + (d.w || 0), 0);
// money a company made per month (revenue minus every cost in its accounts)
const profit = (h) => (h.b2c || 0) + (h.goods || 0) + (h.ypi || 0) - (h.sup || 0) - (h.fr || 0) - (h.sal || 0) - (h.bud || 0) - (h.heads || 0) - (h.maint || 0);
const revenue = (h) => (h.b2c || 0) + (h.goods || 0) + (h.ypi || 0);
const sum = (a, f) => a.reduce((x, h) => x + f(h), 0);
// a tycoon's company is flying: a fat margin over the last 3 months, or clearly more profit than the 3 months before
export function flying(l) {
  const h = (l.ops && l.ops.hist) || []; if (h.length < 3) return 0;
  const k = C.cards.flip, last = h.slice(-3), p3 = sum(last, profit), rev = sum(last, revenue); if (p3 <= 0 || rev <= 0) return 0;
  const margin = p3 / rev, prev = h.length >= 6 ? sum(h.slice(-6, -3), profit) : null;
  const grow = prev != null && prev > 0 ? p3 / prev - 1 : 0;
  if (margin < k.margin && grow < k.growth) return 0;
  return Math.max(margin, grow) * 2;
}
const free = (city, p) => (city.talent ? TALENT.filter((t) => !t.starter && city.talent[t.id] && !city.talent[t.id].owner && !(p.team && p.team[t.kind])) : []);
const crisisBot = (city, b) => { const st = BOT.st(city, b.id); return b.cash < 2 || st.mood < 25; };

const FIND = {
  leanweek: (city, p, ctx) => {
    const k = CARDS.leanweek; if (!k.econ.includes(city.econ) || (p.cx && p.cx.fire > city.g)) return [];
    return ctx.runs(p.id).filter((l) => !ctx.busy(l)).map((l) => ({ l, n: workers(l) })).filter((x) => x.n >= k.minWorkers)
      .map(({ l, n }) => ({ lid: l.id, heat: (n / 60) * (city.econ === 'Crisis' ? 1 : 0.8), why: `The economy is in ${city.econ === 'Crisis' ? 'a crisis' : 'a recession'}, and ${co(l)} has ${n} workers.` }));
  },
  flip: (city, p, ctx) => ctx.own(p.id).filter((l) => !ctx.busy(l) && !(city.offers || []).some((o) => o.status === 'open' && o.lid === l.id)).map((l) => {
    const heat = flying(l); if (!heat) return null;
    const b = bidder(city, p, l, ctx); if (!b) return null;
    return { lid: l.id, bid: b.b.id, amt: b.amt, heat, why: `${co(l)} has had a very good quarter, and ${b.b.name} is hunting for a ${TYPES[l.type].name.toLowerCase()}.` };
  }).filter(Boolean),
  legal: (city, p, ctx) => ctx.runs(p.id).filter((l) => !ctx.busy(l) && !(l.cx && (l.cx.shield || l.cx.dbl)) && !ctx.hasLegal(l)).map((l) => {
    const bad = (p.mail || []).filter((x) => x.lid === l.id && x.kind === 'bad' && !x.ch && x.g != null && x.g > city.g - CARDS.legal.recent * MO).length;
    return bad ? { lid: l.id, heat: 0.4 + 0.3 * bad, why: `${co(l)} has no Legal department, and trouble hit it ${bad > 1 ? `${bad} times` : 'once'} in the last ${CARDS.legal.recent} months.` } : null;
  }).filter(Boolean),
  headhunt: (city, p, ctx) => {
    const t = free(city, p).sort((a, b) => TAL.st(city, b.id).rating - TAL.st(city, a.id).rating)[0]; if (!t) return [];
    return ctx.runs(p.id).filter((l) => l.ops.rep >= CARDS.headhunt.rep).sort((a, b) => b.ops.rep - a.ops.rep).slice(0, 1)
      .map((l) => ({ lid: l.id, tid: t.id, heat: 0.3 + (l.ops.rep - CARDS.headhunt.rep) / 20, why: `${co(l)} has a reputation of ${Math.round(l.ops.rep)}, and ${t.name} is a free agent.` }));
  },
  boardroom: (city, p, ctx) => {
    const k = CARDS.boardroom, ls = ctx.runs(p.id); if (ls.length < 2 || (p.cx && p.cx.move > city.g)) return [];
    const rows = ls.flatMap((l) => Object.entries(l.ops.depts).map(([d, x]) => ({ l, d, gap: (x.w || 0) - OPS.needWorkers(l, d) })));
    const over = rows.filter((x) => x.gap >= k.surplus).sort((a, b) => b.gap - a.gap)[0]; if (!over) return [];
    const short = rows.filter((x) => x.l !== over.l && -x.gap >= k.short).sort((a, b) => a.gap - b.gap)[0]; if (!short) return [];
    const dn = (x) => (OPS.deptFor(x.l, x.d) || OPS.DEPT.ops).name;
    return [{ lid: over.l.id, heat: Math.min(over.gap, -short.gap) / 8, why: `${co(over.l)} has ${over.gap} more people in ${dn(over)} than it needs, while ${co(short.l)} is ${-short.gap} short in ${dn(short)}.` }];
  },
  firesale: (city, p, ctx) => {
    const k = CARDS.firesale; if (!k.econ.includes(city.econ)) return [];
    return BOT.bots(city).filter((b) => crisisBot(city, b) && !ctx.inHolding(b) && city.m - (BOT.st(city, b.id).crisisM ?? -99) >= 4).map((b) => {
      const l = ctx.ownedBy('p', b.id).filter((x) => !ctx.reserved(x)).sort((x, y) => ctx.value(x) - ctx.value(y))[0]; if (!l) return null;
      const price = Math.max(1, Math.round(ctx.value(l) * k.price * 10) / 10); if (p.cash < price) return null;
      return { lid: l.id, bid: b.id, price, heat: city.econ === 'Crisis' ? 0.9 : 0.6, why: `The economy is in ${city.econ === 'Crisis' ? 'a crisis' : 'a recession'}, and ${b.name} is short of cash.` };
    }).filter(Boolean);
  }
};
// who bids for a flying company: a rival tycoon who hunts in that sector (their dream company first), can pay, and is not an enemy.
// The premium follows their style (cautious less, aggressive more); a friend adds a little.
export function bidder(city, p, l, ctx) {
  const k = CARDS.flip, v = ctx.value(l);
  const list = BOT.bots(city).map((b) => {
    const per = BOT.pers(b.id); if (!per || !(per.types || []).includes(l.type) || BOT.relV(city, b.id, p.id) <= -75 || ctx.inHolding(b)) return null;
    const prem = (k.prem[b.style] ?? k.prem.balanced) + (BOT.isFriend(city, b.id, p.id) ? k.friend : 0), amt = r1(v * (1 + prem));
    if (b.cash < amt) return null;
    return { b, amt, dream: per.dream === l.id, v: BOT.relV(city, b.id, p.id) };
  }).filter(Boolean).sort((a, c) => (c.dream - a.dream) || (c.v - a.v));
  return list[0] || null;
}

// ---------------------------------------------------------------- the mails
const ch = (k, x = {}) => ({ ch: { k, ...x } });
const SEND = {
  leanweek: (city, p, h, ctx) => {
    const l = ctx.listing(h.lid), k = CARDS.leanweek;
    return MAIL.send(p, { g: city.g, m: city.m, from: ctx.from(l, 'hr'), lid: l.id, kind: 'info', subj: k.title,
      body: `Times are hard, and the whole city is cutting. If we let people go at ${co(l)} now, nobody will blame us: no severance, and the team understands. But the union will remember it.`,
      opts: [{ l: 'Use the Lean Week', d: `For a month, layoffs in all your companies cost nothing and do not hurt morale. Then hiring costs ${k.hireX}× for ${k.hireMonths} months, and ${co(l)} loses ${-k.rep} reputation.`, ...ch('lean', { lid: l.id }) },
        { l: 'Keep the team', d: 'Nothing happens.', safe: true, ...ch('pass') }] });
  },
  flip: (city, p, h, ctx) => {
    const l = ctx.listing(h.lid), b = city.players[h.bid], v = ctx.value(l), keep = b.style !== 'cautious';
    const o = { id: 'o' + Math.random().toString(36).slice(2, 9), lid: l.id, from: b.id, to: p.id, amount: h.amt, m: city.m, status: 'open', chance: true }; city.offers.push(o);
    const pct = Math.round((h.amt / v - 1) * 100);
    return BOT.say(city, b, p, 'flip', { co: co(l), body: `My offer: ${h.amt} M. That is ${pct}% over its value of ${v} M. It stands for a month.` }, { lid: l.id, wait: 4,
      opts: [{ l: 'Sell', d: `+${h.amt} M now (value ${v} M). ${b.name.split(' ')[0]} will like you for it.`, bot: { k: 'offer', bid: b.id, oid: o.id, yes: true } },
        { l: 'Keep it', d: keep ? `You keep a company on the rise. ${b.name.split(' ')[0]} will remember it.` : 'You keep a company on the rise.', safe: true, bot: { k: 'offer', bid: b.id, oid: o.id, yes: false, keep } }] });
  },
  legal: (city, p, h, ctx) => {
    const l = ctx.listing(h.lid), k = CARDS.legal, c = r2(k.cost * s(l));
    return MAIL.send(p, { g: city.g, m: city.m, from: { n: k.from[0], r: k.from[1], k: 'law' }, lid: l.id, kind: 'info', subj: `${k.title}: ${co(l)}`,
      body: `A former customer is preparing a claim against ${co(l)}. We can settle it quietly now. If we leave it, it will be there the next time something goes wrong at the company, and then it costs twice as much.`,
      opts: [{ l: `Settle for ${c} M`, d: 'The next bad thing that happens to the company is settled before it hurts.', ...ch('settle', { lid: l.id, c }) },
        { l: 'Let it run its course', d: 'The next bad thing that happens to the company hits twice as hard.', safe: true, ...ch('risk', { lid: l.id }) }] });
  },
  headhunt: (city, p, h, ctx) => {
    const l = ctx.listing(h.lid), k = CARDS.headhunt, t = TAL.PERSON[h.tid], fee = TAL.signFee(city, p, h.tid), sal = TAL.ask(city, h.tid);
    return MAIL.send(p, { g: city.g, m: city.m, from: { n: k.from[0], r: k.from[1], k: 'talent' }, lid: l.id, kind: 'good', subj: `${k.title}: ${t.name}`,
      body: `${t.name}, ${TAL.title(city, h.tid).toLowerCase()}, has followed ${co(l)} for a while and wants to work for you. No signing fee. The one condition: a fixed ${k.years}-year contract that neither side can break.`,
      opts: [{ l: `Sign ${t.name}`, d: `No signing fee (saves ${fee} M). ${sal} M a year, locked for ${k.years} years: you cannot release or sell them, and they cannot quit.`, ...ch('sign', { tid: h.tid }) },
        { l: 'Not now', d: 'Nothing happens.', safe: true, ...ch('pass') }] });
  },
  boardroom: (city, p, h, ctx) => {
    const l = ctx.listing(h.lid), k = CARDS.boardroom;
    return MAIL.send(p, { g: city.g, m: city.m, from: { n: 'Your board', r: 'Board of directors' }, lid: l.id, kind: 'info', subj: k.title,
      body: `${h.why} The board backs you if you want to move people between your companies. No layoffs, no hiring fees.`,
      opts: [{ l: 'Move people', d: `For a month you can move workers between your companies for free (Move button in each department). Morale −${-k.morale} in every company they leave.`, ...ch('move') },
        { l: 'Leave things as they are', d: 'Nothing happens.', safe: true, ...ch('pass') }] });
  },
  firesale: (city, p, h, ctx) => {
    const l = ctx.listing(h.lid), b = city.players[h.bid], v = ctx.value(l), R = BOT_REL; BOT.st(city, b.id).crisisM = city.m;
    const opts = [{ l: `Buy ${co(l)} for ${h.price} M`, d: `Value ${v} M. Cash only, no loan.`, bot: { k: 'crisisBuy', bid: b.id, lid: l.id, a: h.price } }];
    if (p.cash >= R.lend) opts.push({ l: `Lend ${R.lend} M instead`, d: `Back in a year with ${Math.round(R.lendRate * 100)}% interest. A friend for life.`, bot: { k: 'lend', bid: b.id, a: R.lend } });
    opts.push({ l: 'Not now', d: 'Nothing happens.', safe: true, ...ch('pass') });
    return BOT.say(city, b, p, 'crisis', { body: `I have to sell my ${co(l)} in ${l.district} fast. ${h.price} M, cash, and it is yours. That is ${Math.round((1 - h.price / v) * 100)}% under its value.` }, { lid: l.id, wait: 4, opts });
  }
};

// ---------------------------------------------------------------- answers
export function answer(city, p, x, o, ctx, rnd = Math.random) {
  const a = o.ch, l = a.lid ? ctx.listing(a.lid) : null; p.cx = p.cx || {};
  const f = ANSWER[a.k], r = f ? f(city, p, a, l, ctx, rnd) : ok('Noted.');
  if (r.ok !== false && x.ch) { const e = ((p.chance && p.chance.log) || []).find((y) => y.mid === x.id); if (e) e.pick = o.l; }
  return r;
}
const ANSWER = {
  pass: () => ok('Nothing happens.'),
  lean: (city, p, a, l) => {
    const k = CARDS.leanweek, g = city.g; p.cx.fire = r5(g + C.len * MO); p.cx.hire = { x: k.hireX, until: r5(g + k.hireMonths * MO) };
    if (l && l.ops) l.ops.rep = Math.max(0, l.ops.rep + k.rep);
    return ok(`Layoffs are free for a month. Hiring costs ${k.hireX}× for ${k.hireMonths} months.`);
  },
  settle: (city, p, a, l, ctx) => {
    if (!l || !l.ops || !ctx.canRun(p.id, l)) return ok('The company is no longer yours.');
    if (ctx.cashOf(l.owner) < a.c) return err(`You need ${a.c} M.`);
    ctx.credit(l.owner, -a.c); l.cx = { ...(l.cx || {}), shield: true }; delete l.cx.dbl;
    return ok(`Settled for ${a.c} M. The next bad thing at ${co(l)} is taken care of.`);
  },
  risk: (city, p, a, l) => { if (l && l.ops) l.cx = { ...(l.cx || {}), dbl: r5(city.g + 1) }; return ok('The claim stays open.'); },
  sign: (city, p, a, l, ctx) => {
    const t = TAL.PERSON[a.tid], st = t && city.talent && city.talent[a.tid];
    if (!st || st.owner) return ok('Too late: someone else signed them.');
    if (p.team && p.team[t.kind]) return ok(`You already have a ${TAL.ROLE[t.kind].role}.`);
    return TAL.signLocked(city, p, a.tid, CARDS.headhunt.years, ctx.tctx);
  },
  move: (city, p) => { p.cx.move = r5(city.g + C.len * MO); p.cx.moved = []; return ok('For a month you can move workers between your companies for free.'); }
};

// ---------------------------------------------------------------- timed effects
export const freeFire = (city, p) => !!(p && p.cx && p.cx.fire > city.g);
export const hireX = (city, p) => (p && p.cx && p.cx.hire && p.cx.hire.until > city.g ? p.cx.hire.x : 1);
export const moving = (city, p) => !!(p && p.cx && p.cx.move > city.g);
// what a bad happening becomes: settled (shield), twice as hard (dbl) or as it is
export function onBad(city, l) {
  const c = l.cx; if (!c) return null;
  if (c.shield) { delete c.shield; return 'shield'; }
  if (c.dbl) { const live = c.dbl > city.g; delete c.dbl; return live ? 'dbl' : null; }
  return null;
}
// twice the harm: lost money, points and stock (gains stay as they are)
export function twice(fx) {
  if (!fx) return fx; const o = { ...fx };
  ['cash', 'rep', 'cust', 'morale', 'rp'].forEach((k) => { if (o[k] < 0) o[k] = r2(o[k] * 2); });
  if (o.stock) o.stock = Math.min(0.5, o.stock * 2);
  if (o.gamble) o.gamble = [o.gamble[0], o.gamble[1], twice(o.gamble[2])];
  return o;
}
// what the company dashboard shows
export function effects(city, p, l) {
  const out = [], g = city.g;
  if (freeFire(city, p)) out.push({ t: 'Lean Week: free layoffs', until: p.cx.fire });
  if (hireX(city, p) > 1) out.push({ t: `Hiring costs ${p.cx.hire.x}×`, until: p.cx.hire.until, bad: true });
  if (moving(city, p)) out.push({ t: 'Boardroom Vote: free moves', until: p.cx.move });
  if (l && l.cx && l.cx.shield) out.push({ t: 'Protected against the next bad event' });
  if (l && l.cx && l.cx.dbl > g) out.push({ t: 'Open claim: the next bad event hits twice', bad: true });
  return out;
}
// Boardroom Vote: move workers between two departments of companies you run, free (morale drops once in each company they leave)
export function moveWorkers(city, p, a, ctx) {
  if (!moving(city, p)) return err('Only during a Boardroom Vote.');
  const from = ctx.listing(a.from), to = ctx.listing(a.to);
  if (!from || !to || !ctx.canRun(p.id, from) || !ctx.canRun(p.id, to)) return err('You do not run both companies.');
  if (from === to && a.fd === a.td) return err('Pick another department.');
  if (!from.ops || !to.ops || from.ops.managed || to.ops.managed) return err('Not in a company on autopilot.');
  const fd = from.ops.depts[a.fd], td = to.ops.depts[a.td]; if (!fd || !td) return err('Open the department first.');
  const n = Math.max(1, Math.trunc(Number(a.n) || 1)), max = OPS.needWorkers(to, a.td) * 3;
  if (fd.w < n) return err('Not that many workers there.');
  if (td.w + n > max) return err(`That department has room for ${max} workers.`);
  fd.w -= n; td.w += n;
  const moved = (p.cx.moved = p.cx.moved || []);
  if (from !== to && !moved.includes(from.id)) { moved.push(from.id); from.ops.morale = Math.max(0, from.ops.morale + CARDS.boardroom.morale); }
  return ok(`${n} worker${n > 1 ? 's' : ''} moved to ${co(to)}.`);
}
// where a department's workers can go during a Boardroom Vote
export function moveTargets(city, p, l, dept, ctx) {
  return ctx.runs(p.id).flatMap((x) => Object.keys(x.ops.depts).filter((d) => !(x === l && d === dept)).map((d) => ({ lid: x.id, d, name: co(x), dn: (OPS.deptFor(x, d) || OPS.DEPT.ops).name, w: x.ops.depts[d].w, need: OPS.needWorkers(x, d) })));
}

// ---------------------------------------------------------------- phase 2 and 3: the economy, your companies, the rivals, the markets
const K = CARDS;
const send = (city, p, x) => MAIL.send(p, { g: city.g, m: city.m, kind: 'info', ...x });
const owned = (city, p, l) => !!(l && l.owner && l.owner.k === 'p' && l.owner.id === p.id);
const outs = (l) => Object.keys((RECIPES[l.type] || {}).out || {}).filter((g) => GOODS[g] && !GOODS[g].fresh && !GOODS[g].mains);
const ins = (l) => OPS.stocked(l).map(([g]) => g).filter((g) => GOODS[g] && !GOODS[g].fresh);
const norm = (city, g) => GOODS[g].base * ((city.cb && city.cb.px) || 1);
const mkt = (city, g) => (city.market && city.market[g] ? city.market[g].p : GOODS[g].base);
const losses = (l) => { const h = (l.ops && l.ops.hist) || []; return h.length >= 3 && h.slice(-3).every((x) => profit(x) < 0); };
const earning = (l) => { const h = (l.ops && l.ops.hist) || []; return h.length >= 3 && sum(h.slice(-3), profit) > 0; };
const floating = (city, p) => ({ loans: (p.loans || []).filter((x) => x.rate === 'bank'), homes: ((p.life && p.life.homes) || []).filter((h) => h.bal > 0 && typeof h.rate !== 'number') });
const warOf = (city, p) => BOT.bots(city).map((b) => ({ b, w: BOT.st(city, b.id).war })).find((x) => x.w && x.w.pid === p.id);
const timed = (until) => r5(until);

Object.assign(FIND, {
  stimulus: (city, p, ctx) => !K.stimulus.econ.includes(city.econ) ? [] : ctx.runs(p.id).filter((l) => K.stimulus.types.includes(l.type) && !ctx.busy(l) && !(l.cx && l.cx.ypi))
    .map((l) => ({ lid: l.id, heat: 0.7, why: `The economy is in a recession, and ${co(l)} builds for the city.` })),
  expansion: (city, p, ctx) => !K.expansion.econ.includes(city.econ) ? [] : ctx.own(p.id).filter((l) => l.level < 5 && !l.upgrade && !l.site && earning(l) && !ctx.busy(l) && !(l.cx && l.cx.up))
    .map((l) => ({ lid: l.id, heat: 0.4 + Math.min(0.5, flying(l) / 2), why: `The economy is booming, and ${co(l)} has made money three months running.` })),
  talentwar: (city, p, ctx) => {
    if (!K.talentwar.econ.includes(city.econ) || !city.talent) return [];
    return TAL.teamOf(city, p).filter((tid) => { const s = TAL.st(city, tid); return s.rating >= K.talentwar.rating && s.leave == null && s.notice == null && !TAL.locked(city, tid) && !(city.tOffers || []).some((o) => o.tid === tid && o.status === 'open'); }).map((tid) => {
      const t = TAL.PERSON[tid], fee = r2(Math.max(TAL.value(city, tid), TAL.signFee(city, p, tid)) * K.talentwar.fee);
      const b = BOT.bots(city).filter((x) => !(x.team && x.team[t.kind]) && x.cash > fee + 5).sort((a, c) => c.cash - a.cash)[0]; if (!b) return null;
      return { tid, bid: b.id, fee, heat: 0.4 + 0.15 * (TAL.st(city, tid).rating - 3), why: `The economy is booming, and ${t.name} is one of the best in the city.` };
    }).filter(Boolean);
  },
  emergency: (city, p, ctx) => !K.emergency.econ.includes(city.econ) || (p.loans || []).some((x) => x.zero != null) || !(p.cash < 2 || (p.loans || []).length) ? []
    : [{ heat: p.cash < 0 ? 1 : 0.6, why: `The economy is in a crisis, and ${p.cash < 2 ? 'your cash is running low' : 'you carry bank loans'}.` }],
  lockrate: (city, p, ctx) => {
    const k = K.lockrate, cb = city.cb; if (!cb || !cb.hist || !cb.hist.length) return [];
    const old = cb.hist.find((x) => x[0] >= city.m - k.over) || cb.hist[0], rise = cb.rate - old[1]; if (rise < k.rise) return [];
    const f = floating(city, p), amt = sum(f.loans, (x) => x.amt) + sum(f.homes, (h) => h.bal); if (amt < 1) return [];
    return [{ amt: r2(amt), heat: Math.min(1, rise / 2), why: `The bank rate has gone up ${r2(rise)} points in ${k.over} months, and you have ${r2(amt)} M at a floating rate.` }];
  },
  strike: (city, p, ctx) => ctx.runs(p.id).filter((l) => l.ops.morale < K.strike.morale && !ctx.busy(l) && !(l.cx && (l.cx.wage || l.cx.strike)))
    .map((l) => ({ lid: l.id, heat: (K.strike.morale - l.ops.morale) / 20 + 0.3, why: `Morale at ${co(l)} is down to ${Math.round(l.ops.morale)}.` })),
  bulk: (city, p, ctx) => ctx.runs(p.id).filter((l) => !ctx.busy(l)).flatMap((l) => outs(l).map((g) => {
    const q = Math.floor(l.ops.inv[g] || 0), v = q * mkt(city, g), cap = OPS.yardCap ? OPS.yardCap(l, g) : Infinity;
    if (v < K.bulk.min * s(l) || !(q >= cap * 0.8 || v >= 3 * K.bulk.min * s(l))) return null;
    return { lid: l.id, g, q, heat: Math.min(1, v / (6 * s(l))), why: `${co(l)} has ${q} ${GOODS[g].unit} of ${GOODS[g].name.toLowerCase()} in stock.` };
  })).filter(Boolean),
  turnaround: (city, p, ctx) => ctx.runs(p.id).filter((l) => losses(l) && !ctx.busy(l) && !(l.cx && l.cx.cap))
    .map((l) => ({ lid: l.id, heat: 0.7, why: `${co(l)} has lost money three months in a row.` })),
  jv: (city, p, ctx) => ctx.own(p.id).filter((l) => !ctx.busy(l) && !(l.cx && l.cx.ypi)).flatMap((l) => BOT.bots(city).filter((b) => BOT.isFriend(city, b.id, p.id) && ctx.ownedBy('p', b.id).some((x) => x.type === l.type))
    .map((b) => ({ lid: l.id, bid: b.id, heat: 0.3 + BOT.relV(city, b.id, p.id) / 200, why: `${b.name} is a friend of yours and also runs a ${TYPES[l.type].name.toLowerCase()}.` }))).slice(0, 2),
  peace: (city, p, ctx) => { const x = warOf(city, p); const l = x && ctx.listing(x.w.lid); return l ? [{ lid: l.id, bid: x.b.id, heat: 0.8, why: `${x.b.name} is in a price war with your ${co(l)}.` }] : []; },
  tipoff: (city, p, ctx) => !city.deck || !city.deck[0] ? [] : BOT.bots(city).filter((b) => BOT.isFriend(city, b.id, p.id)).slice(0, 1)
    .map((b) => ({ bid: b.id, heat: 0.3 + BOT.relV(city, b.id, p.id) / 250, why: `${b.name} is a friend of yours, and a new quarter is coming.` })),
  forward: (city, p, ctx) => ctx.runs(p.id).filter((l) => !ctx.busy(l) && !(l.cx && l.cx.fwd)).flatMap((l) => outs(l).map((g) => {
    const pr = mkt(city, g), over = pr / norm(city, g) - 1, q = Math.round(OPS.capacity(l) * RECIPES[l.type].out[g]);
    return over >= K.forward.over && q >= 1 ? { lid: l.id, g, q, pr: r5(pr), heat: Math.min(1, over * 2), why: `${GOODS[g].name} sells ${Math.round(over * 100)}% above normal, and ${co(l)} makes it.` } : null;
  })).filter(Boolean),
  squeeze: (city, p, ctx) => ctx.runs(p.id).filter((l) => !ctx.busy(l) && !(l.cx && l.cx.sup)).flatMap((l) => ins(l).map((g) => {
    const pr = mkt(city, g), over = pr / norm(city, g) - 1, q = Math.round(OPS.needsPerMonth(l)[g] || 0);
    return over >= K.squeeze.over && q >= 1 ? { lid: l.id, g, q, heat: Math.min(1, over * 1.5), why: `${GOODS[g].name} costs ${Math.round(over * 100)}% more than normal, and ${co(l)} needs it every month.` } : null;
  })).filter(Boolean),
  insider: (city, p, ctx) => p.cash < K.insider.cash ? [] : Object.entries(city.stocks || {}).map(([id, st]) => {
    const h = st.h || []; if (h.length < 2) return null; const mv = h[h.length - 1] / h[h.length - 2] - 1;
    return Math.abs(mv) >= K.insider.move ? { sid: id, mv: r2(mv), heat: Math.min(1, Math.abs(mv) * 4), why: `${(STOCKS.find((x) => x.id === id) || { name: id }).name} shares moved ${Math.round(mv * 100)}% in one week.` } : null;
  }).filter(Boolean).slice(0, 1)
});

Object.assign(SEND, {
  stimulus: (city, p, h, ctx) => { const l = ctx.listing(h.lid), k = K.stimulus, v = r2(k.ypi * s(l));
    return send(city, p, { from: { n: 'Office of the Mayor', r: 'City Hall, Aurex Bay', k: 'city' }, lid: l.id, subj: `${k.title} for ${co(l)}`,
      body: `City Hall wants to keep the building sites busy through the recession. We offer ${co(l)} a fixed contract for ${k.months} months: safe money, but it takes a good part of your capacity.`,
      opts: [{ l: 'Sign the contract', d: `+${v} M a year in steady income for ${k.months} months. Capacity −${Math.round((1 - k.cap) * 100)}% while it runs.`, ...ch('stim', { lid: l.id }) }, { l: 'No thanks', d: 'Nothing happens.', safe: true, ...ch('pass') }] }); },
  expansion: (city, p, h, ctx) => { const l = ctx.listing(h.lid), k = K.expansion, c = ctx.upgradeCost(l);
    return send(city, p, { from: { n: 'Aurex Builders Guild', r: 'Harbor Row' }, lid: l.id, subj: `${k.title}: ${co(l)}`,
      body: `Our crews have room this month. If you start the next upgrade of ${co(l)} within a month, we do it ${Math.round((1 - k.x) * 100)}% cheaper. We are busy elsewhere too, so it takes a month longer.`,
      opts: [{ l: 'Book the crews', d: `The next upgrade costs ${r2(c * k.x)} M instead of ${c} M if you start it within a month, and takes one month more.`, ...ch('up', { lid: l.id }) }, { l: 'Not now', d: 'Nothing happens.', safe: true, ...ch('pass') }] }); },
  talentwar: (city, p, h, ctx) => { const t = TAL.PERSON[h.tid], b = city.players[h.bid], st = TAL.st(city, h.tid), bonus = r2(st.salary), k = K.talentwar;
    return send(city, p, { from: { n: t.name, r: TAL.title(city, h.tid), tid: h.tid }, subj: `${k.title}: ${b.name} wants me`,
      body: `${b.name} has offered to buy me out of my contract. I like it here, but it is a lot of money, for both of us. What do you want to do?`,
      opts: [{ l: 'Keep them with a bonus', d: `${bonus} M (a year's salary). Satisfaction +10, and they stay locked for 2 years.`, ...ch('keepT', { tid: h.tid, c: bonus }) },
        { l: `Sell to ${b.name}`, d: `+${h.fee} M transfer fee.`, ...ch('sellT', { tid: h.tid, bid: b.id, fee: h.fee }) },
        { l: 'Say nothing', d: `Satisfaction ${k.sat}, and an even chance they hand in their notice.`, safe: true, ...ch('snubT', { tid: h.tid }) }] }); },
  emergency: (city, p, h, ctx) => { const k = K.emergency, after = r2(ctx.loanRate(p) + BANKS.lastResort);
    return send(city, p, { from: { n: 'Bank of Aurex', r: 'Emergency lending window', k: 'bank' }, subj: k.title,
      body: `To keep businesses alive through the crisis, the Bank of Aurex lends ${k.amt} M at 0% for ${k.months} months. After that the loan runs on at the emergency rate unless you have paid it back.`,
      opts: [{ l: `Borrow ${k.amt} M at 0%`, d: `Free for ${k.months} months, then about ${after}% a year until you repay it.`, ...ch('ecred') }, { l: 'No thanks', d: 'Nothing happens.', safe: true, ...ch('pass') }] }); },
  lockrate: (city, p, h, ctx) => { const k = K.lockrate, fee = r2(h.amt * k.fee);
    return send(city, p, { from: { n: 'Your bank', r: 'Loans desk', k: 'bank' }, subj: k.title,
      body: `Rates are going up. We can fix today's rate on the ${h.amt} M you owe at a floating rate for ${k.years} years, for a one-off fee.`,
      opts: [{ l: `Fix the rate for ${fee} M`, d: `Your floating loans and mortgages keep today's rate for ${k.years} years.`, ...ch('lock', { c: fee }) }, { l: 'Stay floating', d: 'Nothing happens.', safe: true, ...ch('pass') }] }); },
  strike: (city, p, h, ctx) => { const l = ctx.listing(h.lid), k = K.strike;
    return send(city, p, { from: ctx.from(l, 'hr'), lid: l.id, subj: `${k.title} at ${co(l)}`,
      body: `The union at ${co(l)} wants higher pay. If we say no, they may walk out.`,
      opts: [{ l: 'Give them the raise', d: `Wages +${Math.round((k.raise - 1) * 100)}% for ${k.months} months, morale +${k.boost} now.`, ...ch('raise', { lid: l.id }) },
        { l: 'Say no', d: `${Math.round(k.odds * 100)}% chance of a strike: no production for a month.`, safe: true, ...ch('noRaise', { lid: l.id }) }] }); },
  bulk: (city, p, h, ctx) => { const l = ctx.listing(h.lid), k = K.bulk, v = r2(h.q * mkt(city, h.g) * k.cut);
    return send(city, p, { from: { n: 'Delmar Wholesale', r: 'Wholesale buyer, Southgate' }, lid: l.id, subj: `${k.title}: ${GOODS[h.g].name.toLowerCase()}`,
      body: `We will take all ${h.q} ${GOODS[h.g].unit} of ${GOODS[h.g].name.toLowerCase()} at ${co(l)} today and pay at once, ${Math.round((1 - k.cut) * 100)}% under the market price.`,
      opts: [{ l: `Sell it all for ${v} M`, d: 'Cash now. The stock is gone, also what you listed on the market.', ...ch('bulk', { lid: l.id, g: h.g }) }, { l: 'Keep it', d: 'Nothing happens.', safe: true, ...ch('pass') }] }); },
  turnaround: (city, p, h, ctx) => { const l = ctx.listing(h.lid), k = K.turnaround, c = r2(k.cost * s(l));
    return send(city, p, { from: { n: 'Marlow Partners', r: 'Turnaround consultants' }, lid: l.id, subj: `${k.title}: ${co(l)}`,
      body: `We have turned around worse than ${co(l)}. Give us a month on the floor and the company will produce more for half a year. We cannot promise it, but we usually manage.`,
      opts: [{ l: `Hire them for ${c} M`, d: `${Math.round(k.odds * 100)}% chance: capacity +${Math.round((k.cap - 1) * 100)}% for ${k.months} months. Otherwise the money is gone.`, ...ch('turn', { lid: l.id, c }) }, { l: 'No thanks', d: 'Nothing happens.', safe: true, ...ch('pass') }] }); },
  jv: (city, p, h, ctx) => { const l = ctx.listing(h.lid), b = city.players[h.bid], k = K.jv, c = r2(k.cost * s(l)), v = r2(k.ypi * s(l));
    return BOT.say(city, b, p, 'tip', { body: `I have an idea, ${p.name.split(' ')[0]}: a joint venture between your ${co(l)} and my company in the same trade. We both put money in and share the customers for a year.` }, { lid: l.id, wait: 4, subj: `${k.title}?`,
      opts: [{ l: `Put in ${c} M`, d: `+${v} M a year for ${k.months} months for ${co(l)}. ${b.name.split(' ')[0]} likes you even more.`, ...ch('jv', { lid: l.id, bid: b.id, c }) }, { l: 'Not now', d: 'Nothing happens.', safe: true, ...ch('pass') }] }); },
  peace: (city, p, h, ctx) => { const l = ctx.listing(h.lid), b = city.players[h.bid], k = K.peace, c = r2(k.cost * s(l));
    return BOT.say(city, b, p, 'peace', { body: `This price war hurts us both. Pay me ${c} M for my lost customers and I stop today.` }, { lid: l.id, wait: 4, subj: `${k.title}`,
      opts: [{ l: `Pay ${c} M`, d: 'The price war ends now.', ...ch('peace', { lid: l.id, bid: b.id, c }) }, { l: 'Fight on', d: 'The price war goes on.', safe: true, ...ch('pass') }] }); },
  tipoff: (city, p, h, ctx) => { const b = city.players[h.bid], k = K.tipoff;
    return BOT.say(city, b, p, 'tip', { body: `My people know a few things about the coming quarter. For ${k.fee} M I will tell you what they see.` }, { wait: 4, subj: k.title,
      opts: [{ l: `Pay ${k.fee} M`, d: 'You get the tip at once.', ...ch('tip', { bid: b.id }) }, { l: 'No thanks', d: 'Nothing happens.', safe: true, ...ch('pass') }] }); },
  forward: (city, p, h, ctx) => { const l = ctx.listing(h.lid), k = K.forward, pr = r5(h.pr * k.cut), g = GOODS[h.g];
    return send(city, p, { from: { n: 'Corvin Trading', r: 'Commodity buyer, Harbor Row' }, lid: l.id, subj: `${k.title}: ${g.name.toLowerCase()}`,
      body: `We buy ${h.q} ${g.unit} of ${g.name.toLowerCase()} a month from ${co(l)} for ${k.months} months at a fixed price close to today's. If you come up short, you buy in the rest at the market price.`,
      opts: [{ l: 'Fix the price', d: `${h.q} ${g.unit} a month at ${r5(pr * 1000)} k per ${g.unit} (${r2(h.q * pr)} M a month) for ${k.months} months.`, ...ch('fwd', { lid: l.id, g: h.g, q: h.q, pr }) }, { l: 'Sell at market prices', d: 'Nothing happens.', safe: true, ...ch('pass') }] }); },
  squeeze: (city, p, h, ctx) => { const l = ctx.listing(h.lid), k = K.squeeze, g = GOODS[h.g], pr = r5(norm(city, h.g) * k.price), c = r2(pr * h.q * k.months);
    return send(city, p, { from: { n: 'Brandt Supply', r: 'Supplier, Ironport' }, lid: l.id, subj: `${k.title}: ${g.name.toLowerCase()}`,
      body: `${g.name} is dear right now. Pay ${k.months} months up front and we deliver ${h.q} ${g.unit} to ${co(l)} every month at a fixed price, whatever the market does.`,
      opts: [{ l: `Pay ${c} M up front`, d: `${h.q} ${g.unit} a month for ${k.months} months. Market price today: ${r5(mkt(city, h.g) * 1000)} k, ours: ${r5(pr * 1000)} k.`, ...ch('sup', { lid: l.id, g: h.g, q: h.q, c }) }, { l: 'Buy at market prices', d: 'Nothing happens.', safe: true, ...ch('pass') }] }); },
  insider: (city, p, h, ctx) => { const k = K.insider, name = (STOCKS.find((x) => x.id === h.sid) || { name: h.sid }).name;
    return send(city, p, { from: { n: 'A voice on the phone', r: 'Did not give a name' }, subj: `${k.title}: ${name}`,
      body: `You saw ${name} move this week. I know why, and I know what comes next. Put ${k.stake} M on it and I will tell you how. Nobody needs to know.`,
      opts: [{ l: `Bet ${k.stake} M on the tip`, d: `${Math.round(k.odds * 100)}% chance of +${r2(k.stake * k.win)} M. Otherwise the money is gone and the Finance Ministry hears of it (Influence ${k.inf}).`, ...ch('insider', { sid: h.sid }) }, { l: 'Hang up', d: 'Nothing happens.', safe: true, ...ch('pass') }] }); }
});

Object.assign(ANSWER, {
  stim: (city, p, a, l, ctx) => { if (!l || !l.ops) return ok('The company is gone.'); const k = K.stimulus, until = timed(city.g + k.months * MO);
    l.cx = { ...(l.cx || {}), ypi: { v: r2(k.ypi * s(l)), until, note: 'City stimulus contract' }, cap: { x: k.cap, until } }; return ok(`Contract signed for ${k.months} months.`); },
  up: (city, p, a, l) => { if (!l) return ok('The company is gone.'); l.cx = { ...(l.cx || {}), up: { x: K.expansion.x, until: timed(city.g + C.len * MO) } }; return ok('Crews booked. Start the upgrade within a month.'); },
  keepT: (city, p, a, l, ctx) => { const st = city.talent && city.talent[a.tid]; if (!st || st.owner !== p.id) return ok('They are no longer on your team.'); if (p.cash < a.c) return err(`You need ${a.c} M.`);
    p.cash = r5(p.cash - a.c); st.sat = Math.min(100, st.sat + 10); st.lock = city.m + 24; st.until = Math.max(st.until, city.m + 24); return ok(`${TAL.PERSON[a.tid].name} stays, locked for 2 years.`); },
  sellT: (city, p, a, l, ctx) => { const st = city.talent && city.talent[a.tid], b = city.players[a.bid]; if (!st || st.owner !== p.id || !b) return ok('Too late.');
    return TAL.sell(city, a.tid, b, a.fee, Math.max(st.salary, TAL.ask(city, a.tid)), 2, ctx.tctx); },
  snubT: (city, p, a, l, ctx, rnd) => { const st = city.talent && city.talent[a.tid]; if (!st || st.owner !== p.id) return ok('Noted.');
    st.sat = Math.max(0, st.sat + K.talentwar.sat); if (rnd() < K.talentwar.quit && st.notice == null && !TAL.locked(city, a.tid)) { st.notice = city.m + 2; return ok(`${TAL.PERSON[a.tid].name} handed in their notice.`); } return ok(`${TAL.PERSON[a.tid].name} stays, a little hurt.`); },
  ecred: (city, p, a) => { const k = K.emergency; p.loans = p.loans || []; p.loans.push({ id: 'ln' + Math.random().toString(36).slice(2, 9), amt: k.amt, rate: 0, m: city.m, bank: 'cb', zero: city.m + k.months }); p.cash = r5(p.cash + k.amt); return ok(`${k.amt} M borrowed at 0% for ${k.months} months.`); },
  lock: (city, p, a, l, ctx) => { if (p.cash < a.c) return err(`You need ${a.c} M.`); const f = floating(city, p), r = ctx.loanRate(p), until = city.m + K.lockrate.years * 12; p.cash = r5(p.cash - a.c);
    f.loans.forEach((x) => { x.rate = r; x.lockM = until; }); f.homes.forEach((h) => { h.rate = ctx.mortgageRate(); h.lockM = until; }); return ok(`Rates fixed for ${K.lockrate.years} years.`); },
  raise: (city, p, a, l) => { if (!l || !l.ops) return ok('The company is gone.'); const k = K.strike; l.ops.morale = Math.min(100, l.ops.morale + k.boost); l.cx = { ...(l.cx || {}), wage: { x: k.raise, until: timed(city.g + k.months * MO) } }; return ok(`Raise given. Morale +${k.boost}.`); },
  noRaise: (city, p, a, l, ctx, rnd) => { if (!l || !l.ops) return ok('The company is gone.'); if (rnd() < K.strike.odds) { l.cx = { ...(l.cx || {}), strike: { until: timed(city.g + MO) } }; return ok(`They walked out. ${co(l)} produces nothing for a month.`); } l.ops.morale = Math.max(0, l.ops.morale - 5); return ok('The union backed down, grumbling. Morale −5.'); },
  bulk: (city, p, a, l, ctx) => { if (!l || !l.ops || !ctx.canRun(p.id, l)) return ok('The company is no longer yours.'); (city.book || []).filter((o) => o.lid === l.id && o.g === a.g).forEach((o) => OPS.cancelOffer(city, o));
    const q = Math.floor(l.ops.inv[a.g] || 0), v = r2(q * mkt(city, a.g) * K.bulk.cut); if (!q) return ok('Nothing left to sell.'); l.ops.inv[a.g] -= q; ctx.credit(l.owner, v); return ok(`Sold ${q} ${GOODS[a.g].unit} for ${v} M.`); },
  turn: (city, p, a, l, ctx, rnd) => { if (!l || !l.ops || !ctx.canRun(p.id, l)) return ok('The company is no longer yours.'); if (ctx.cashOf(l.owner) < a.c) return err(`You need ${a.c} M.`); ctx.credit(l.owner, -a.c); const k = K.turnaround;
    if (rnd() < k.odds) { l.cx = { ...(l.cx || {}), cap: { x: k.cap, until: timed(city.g + k.months * MO) } }; return ok(`It worked: capacity +${Math.round((k.cap - 1) * 100)}% for ${k.months} months.`); } return ok('They did their best. Nothing changed.'); },
  jv: (city, p, a, l, ctx) => { const b = city.players[a.bid]; if (!l || !owned(city, p, l) || !b) return ok('Too late.'); if (p.cash < a.c) return err(`You need ${a.c} M.`); const k = K.jv;
    p.cash = r5(p.cash - a.c); b.cash = r5(b.cash + a.c); l.cx = { ...(l.cx || {}), ypi: { v: r2(k.ypi * s(l)), until: timed(city.g + k.months * MO), note: `Joint venture with ${b.name}` } };
    BOT.event(city, b.id, p.id, 'deal', { d: k.rel, t: 'Went into a joint venture with me' }, ctx); return ok(`Joint venture with ${b.name} for ${k.months} months.`); },
  peace: (city, p, a, l, ctx) => { const b = city.players[a.bid], st = b && BOT.st(city, b.id); if (!st || !st.war || st.war.pid !== p.id) return ok('The price war is already over.'); if (p.cash < a.c) return err(`You need ${a.c} M.`);
    p.cash = r5(p.cash - a.c); b.cash = r5(b.cash + a.c); st.lastWar = { pid: p.id, how: 'paid', m: city.m }; st.war = null; BOT.event(city, b.id, p.id, 'truce', { d: K.peace.rel, t: 'Paid me to end the price war' }, ctx); return ok('The price war is over.'); },
  tip: (city, p, a, l, ctx) => { const b = city.players[a.bid], card = city.deck && WORLD.find((w) => w.id === city.deck[0]); if (!b || !card) return ok('Too late.'); if (p.cash < K.tipoff.fee) return err(`You need ${K.tipoff.fee} M.`);
    p.cash = r5(p.cash - K.tipoff.fee); b.cash = r5(b.cash + K.tipoff.fee); BOT.event(city, b.id, p.id, 'deal', { d: 2, t: 'Paid me for a tip' }, ctx);
    send(city, p, { from: { n: b.name, r: (BOT.pers(b.id) || {}).title || 'Tycoon', k: 'bot', pid: b.id, c: b.color }, subj: 'The tip', body: MAIL.insightBody(card) }); return ok('The tip is in your mail.'); },
  fwd: (city, p, a, l) => { if (!l || !l.ops) return ok('The company is gone.'); l.cx = { ...(l.cx || {}), fwd: { g: a.g, q: a.q, pr: a.pr, until: timed(city.g + K.forward.months * MO) } }; return ok(`Price fixed for ${K.forward.months} months.`); },
  sup: (city, p, a, l, ctx) => { if (!l || !l.ops || !ctx.canRun(p.id, l)) return ok('The company is no longer yours.'); if (ctx.cashOf(l.owner) < a.c) return err(`You need ${a.c} M.`); ctx.credit(l.owner, -a.c);
    l.cx = { ...(l.cx || {}), sup: { g: a.g, q: a.q, until: timed(city.g + K.squeeze.months * MO) } }; return ok(`Paid. ${a.q} ${GOODS[a.g].unit} arrive every month.`); },
  insider: (city, p, a, l, ctx, rnd) => { const k = K.insider; if (p.cash < k.stake) return err(`You need ${k.stake} M.`); p.cash = r5(p.cash - k.stake);
    if (rnd() < k.odds) { const v = r2(k.stake * (1 + k.win)); p.cash = r5(p.cash + v); return ok(`The tip was right. +${r2(v - k.stake)} M.`); } p.inf = (p.inf || 0) + k.inf; return ok(`The tip was wrong. ${k.stake} M lost, and the Finance Ministry asks questions (Influence ${k.inf}).`); }
});

// once a month, after production: forward contracts take their goods, prepaid supplies arrive, 0% loans and fixed rates run out
export function monthStep(city, ctx) {
  city.listings.forEach((l) => {
    const c = l.cx; if (!c || !l.ops) return;
    if (c.fwd && c.fwd.until >= city.g) { const f = c.fwd, have = Math.floor(l.ops.inv[f.g] || 0), q = Math.min(have, f.q), short = f.q - q;
      l.ops.inv[f.g] = have - q; ctx.credit(l.owner, r2(f.q * f.pr - short * mkt(city, f.g))); }
    if (c.sup && c.sup.until >= city.g) { const room = OPS.yardRoom(city, null, l, c.sup.g); l.ops.inv[c.sup.g] = (l.ops.inv[c.sup.g] || 0) + Math.min(c.sup.q, room); }
  });
  Object.values(city.players).forEach((p) => {
    (p.loans || []).forEach((x) => { if (x.zero != null && city.m >= x.zero) { delete x.zero; x.rate = r2(ctx.loanRate(p) + BANKS.lastResort); } if (x.lockM != null && city.m >= x.lockM) { delete x.lockM; x.rate = 'bank'; } });
    ((p.life && p.life.homes) || []).forEach((h) => { if (h.lockM != null && city.m >= h.lockM) { delete h.lockM; delete h.rate; } });
  });
}
// every week: timed effects that ran out are gone
export function weekStep(city) {
  city.listings.forEach((l) => { const c = l.cx; if (!c) return; ['ypi', 'cap', 'up', 'wage', 'strike', 'fwd', 'sup'].forEach((k) => { if (c[k] && c[k].until <= city.g + 1e-9) delete c[k]; }); if (c.dbl && c.dbl <= city.g) delete c.dbl; if (!Object.keys(c).length) delete l.cx; });
}
// what a company's yield, capacity and wages get from a card
export const ypiOf = (l) => (l.cx && l.cx.ypi ? l.cx.ypi : null);

// ---------------------------------------------------------------- cars (cars.js)
const ITEM = LIFE.ITEM;
const carName = (it) => ITEM[it.cid].name;
const homeCars = (p) => AUTO.cars(p).filter((it) => LIFE.free(it) && !it.lent);
const carFans = (city) => { const b = BOT.bots(city), f = b.filter((x) => ((BOT.pers(x.id) || {}).types || []).some((t) => ['car', 'dealer', 'autorepair'].includes(t))); return f.length ? f : b; };
const wal = (city, p, v, text) => { p.life.wallet = r5(p.life.wallet + v); LIFE.tx(p.life, city.m, text, v); };
Object.assign(FIND, {
  barnfind: (city, p) => !p.life || LIFE.roomFree(p, 'car') < 1 || p.life.wallet < K.barnfind.fee ? [] : [{ heat: 0.45, why: 'You have a free bay in your garage.' }],
  carbid: (city, p) => homeCars(p).map((it) => {
    const v = LIFE.instValue(city, p, it); if (v < K.carbid.min) return null;
    const pr = K.carbid.prem, amt = r2(v * (1 + pr[0] + Math.random() * (pr[1] - pr[0])));
    const b = carFans(city).filter((x) => x.cash > amt + 2 && BOT.relV(city, x.id, p.id) > -75).sort(() => Math.random() - 0.5)[0]; if (!b) return null;
    return { uid: it.uid, bid: b.id, amt, heat: 0.3 + Math.min(0.4, v / 10), why: `${b.name} loves cars, and your ${carName(it)} is worth ${r2(v)} M.` };
  }).filter(Boolean).slice(0, 2),
  speeding: (city, p) => { const it = AUTO.daily(p); if (!it) return []; const r = ITEM[it.cid].rarity; return [{ uid: it.uid, heat: r === 'Epic' || r === 'Legendary' ? 0.55 : 0.35, why: `You drive the ${carName(it)} every day.` }]; },
  theft: (city, p) => { if (p.life && p.life.guard > city.m) return []; const cs = homeCars(p), v = cs.reduce((a, it) => a + LIFE.instValue(city, p, it), 0); return cs.length && v >= K.theft.min ? [{ heat: 0.3 + (['Recession', 'Crisis'].includes(city.econ) ? 0.2 : 0), why: `You keep ${cs.length} car${cs.length > 1 ? 's' : ''} worth ${r2(v)} M at home.` }] : []; },
  setchase: (city, p) => {
    if (!p.life) return []; const have = new Set(p.life.items.map((i) => i.cid)), out = [];
    Object.keys(SETS).forEach((sid) => {
      const all = Object.values(ITEM).filter((c) => c.set === sid), miss = all.filter((c) => !have.has(c.id)); if (all.length < 2 || miss.length !== 1) return;
      const c = miss[0]; if (LIFE.roomFree(p, c.cat) < 1) return; const price = r2(LIFE.itemValue(city, c.id) * (1 + K.setchase.prem));
      if (p.life.wallet < price) return;
      if (LIFE.available(city, c.id) > 0) { out.push({ cid: c.id, price, heat: 0.6, why: `You own every piece but one of the ${SETS[sid].name}.` }); return; }
      const b = BOT.bots(city).find((x) => x.life && x.life.items.some((i) => i.cid === c.id && !i.lot)); if (b) out.push({ cid: c.id, bid: b.id, price, heat: 0.6, why: `You own all but one piece of the set, and ${b.name} has it.` });
    });
    return out;
  }
});
Object.assign(SEND, {
  barnfind: (city, p) => { const k = K.barnfind;
    return send(city, p, { from: { n: k.from[0], r: k.from[1] }, subj: `${k.title}: an old barn in Old Grid`,
      body: `My late husband kept cars in the barn for forty years. I never looked under the tarps, and I am moving to my daughter's. Pay me ${r2(k.fee * 1000)} k for the lot and take whatever is there.`,
      opts: [{ l: `Pay ${r2(k.fee * 1000)} k and look`, d: `${Math.round(k.odds * 100)}% chance of a forgotten classic in poor condition. A workshop can restore it.`, ...ch('barn') }, { l: 'Not for me', d: 'Nothing happens.', safe: true, ...ch('pass') }] }); },
  carbid: (city, p, h) => { const it = p.life.items.find((i) => i.uid === h.uid), b = city.players[h.bid], v = LIFE.instValue(city, p, it), pct = Math.round((h.amt / v - 1) * 100);
    return BOT.say(city, b, p, 'car', { x: carName(it), body: `My offer: ${h.amt} M for it. That is ${pct}% over its value of ${r2(v)} M. It stands for a month.` }, { wait: 4,
      opts: [{ l: 'Sell it', d: `+${h.amt} M to your personal account. ${b.name.split(' ')[0]} will like you for it.`, ...ch('carSell', { uid: h.uid, bid: b.id, amt: h.amt }) },
        { l: 'Keep it', d: `${b.name.split(' ')[0]} will be a little sore.`, safe: true, ...ch('carKeep', { bid: b.id, uid: h.uid }) }] }); },
  speeding: (city, p, h) => { const it = p.life.items.find((i) => i.uid === h.uid), k = K.speeding;
    return send(city, p, { from: { n: 'Aurex Bay Police', r: 'Traffic unit' }, subj: `${k.title}: ${carName(it)}`,
      body: `A camera on the coast road caught your ${carName(it)} at 162 km/h on Tuesday night. The fine is ${r2(k.fine * 1000)} k. A reporter from the Gazette has already called us about it.`,
      opts: [{ l: `Pay ${r2(k.fine * 1000)} k quietly`, d: 'Nothing else happens.', safe: true, ...ch('fine') },
        { l: 'Give the Gazette a quote', d: `${Math.round(k.odds * 100)}%: the city loves it (+${k.legacy} prestige, your car companies sell more for ${k.months} months). Otherwise −${k.legacy} prestige and a double fine.`, ...ch('story') }] }); },
  theft: (city, p) => { const k = K.theft, n = homeCars(p).length, fee = r2(k.fee * n);
    return send(city, p, { from: { n: 'Bayguard Security', r: 'Alarms and trackers, Midtown' }, subj: k.title,
      body: `Three collector cars were taken in Crown Hills and Sunset Strand last month. The police think the same gang is behind it. A tracker in each of your ${n} car${n > 1 ? 's' : ''} keeps you safe for a year.`,
      opts: [{ l: `Fit trackers for ${r2(fee * 1000)} k`, d: 'None of your cars can be stolen for a year.', safe: true, ...ch('guard', { fee }) },
        { l: 'Take the risk', d: `${Math.round(k.odds * 100)}% chance one car is stolen. Insurance pays ${Math.round(k.cover * 100)}% of its value.`, ...ch('steal') }] }); },
  setchase: (city, p, h) => { const c = ITEM[h.cid], b = h.bid ? city.players[h.bid] : null, sname = SETS[c.set] ? SETS[c.set].name : 'set';
    const body = `${b ? `${b.name} is ready to part with ${c.name}.` : `One of our clients is ready to part with ${c.name}.`} It is the one piece missing from your ${sname}. The price is ${h.price} M, ${Math.round(K.setchase.prem * 100)}% over market, and the offer stands for a month.`;
    return send(city, p, { from: { n: 'Aurex & Co.', r: 'Private sales' }, subj: `${K.setchase.title}: ${c.name}`, body,
      opts: [{ l: `Buy it for ${h.price} M`, d: `Completes the ${sname}: more value and prestige for the whole set.`, ...ch('setBuy', { cid: h.cid, bid: h.bid || null, price: h.price }) }, { l: 'Not now', d: 'Nothing happens.', safe: true, ...ch('pass') }] }); }
});
Object.assign(ANSWER, {
  barn: (city, p, a, l, ctx, rnd) => { const k = K.barnfind; if (p.life.wallet < k.fee) return err(`You need ${r2(k.fee * 1000)} k on your account.`); if (LIFE.roomFree(p, 'car') < 1) return err('Your garage is full.');
    wal(city, p, -k.fee, `${k.from[0]} · the old barn`);
    if (rnd() >= k.odds) return ok('Under the tarps: a lawnmower, a rusty bicycle and a lot of dust. The money is gone.');
    const it = AUTO.barnCar(city, p, k, rnd), c = ITEM[it.cid];
    return ok(`Under the last tarp: a ${c.year} ${c.name} (${c.rarity}), condition ${Math.round(it.cond)}. It is in your garage now. A workshop can restore it.`); },
  carSell: (city, p, a, l, ctx) => { const it = p.life.items.find((i) => i.uid === a.uid), b = city.players[a.bid];
    if (!it || !LIFE.free(it) || it.lent) return ok('The car is no longer in your garage.'); if (!b || b.cash < a.amt) return ok(`${b ? b.name : 'They'} can no longer pay.`);
    p.life.items = p.life.items.filter((x) => x !== it); if (p.life.daily === it.uid) p.life.daily = null; b.cash = r5(b.cash - a.amt);
    LIFE.ensurePlayer(city, b).items.push({ ...it, m: city.m, cost: a.amt }); wal(city, p, a.amt, `Sold to ${b.name} · ${carName(it)}`);
    BOT.event(city, b.id, p.id, 'sold', { d: K.carbid.rel, x: carName(it) }, ctx); return ok(`Sold to ${b.name} for ${a.amt} M.`); },
  carKeep: (city, p, a, l, ctx) => { const it = p.life.items.find((i) => i.uid === a.uid); if (city.players[a.bid]) BOT.event(city, a.bid, p.id, 'keep', { d: K.carbid.keep, x: it ? carName(it) : 'my car' }, ctx); return ok('You keep it.'); },
  fine: (city, p) => { wal(city, p, -K.speeding.fine, 'Aurex Bay Police · speeding fine'); return ok('Fine paid. Nobody heard about it.'); },
  story: (city, p, a, l, ctx, rnd) => { const k = K.speeding;
    if (rnd() < k.odds) { p.life.legacy = (p.life.legacy || 0) + k.legacy; const until = r5(city.g + k.months * MO); let n = 0;
      ctx.runs(p.id).filter((x) => ['dealer', 'autorepair', 'car'].includes(x.type) && !(x.cx && x.cx.ypi)).forEach((x) => { x.cx = { ...(x.cx || {}), ypi: { v: r2(k.ypi * s(x)), until, note: 'Everyone wants to drive like you' } }; n++; });
      wal(city, p, -k.fine, 'Aurex Bay Police · speeding fine'); return ok(`"I was testing the brakes," you told the Gazette. The city loved it: +${k.legacy} prestige${n ? `, and your car companies sell more for ${k.months} months` : ''}.`); }
    p.life.legacy = (p.life.legacy || 0) - k.legacy; wal(city, p, -k.fine * 2, 'Aurex Bay Police · speeding fine, doubled'); return ok(`The Gazette was not amused. −${k.legacy} prestige and a double fine.`); },
  guard: (city, p, a) => { wal(city, p, -a.fee, 'Bayguard Security · trackers'); p.life.guard = city.m + 12; return ok('Trackers fitted. Your cars are safe for a year.'); },
  steal: (city, p, a, l, ctx, rnd) => { const k = K.theft; if (rnd() >= k.odds) return ok('Nothing happened. This time.');
    const it = homeCars(p).sort((x, y) => LIFE.instValue(city, p, y) - LIFE.instValue(city, p, x))[0]; if (!it) return ok('Nothing happened. This time.');
    const v = r4(LIFE.instValue(city, p, it) * k.cover); p.life.items = p.life.items.filter((x) => x !== it); if (p.life.daily === it.uid) p.life.daily = null;
    wal(city, p, v, `Insurance · stolen ${carName(it)}`); return ok(`Your ${carName(it)} was stolen from the garage that night. The insurance pays ${r2(v)} M.`); },
  setBuy: (city, p, a) => { const c = ITEM[a.cid]; if (!c) return ok('Too late.'); if (LIFE.roomFree(p, c.cat) < 1) return err('You have no room for it.'); if (p.life.wallet < a.price) return err(`You need ${a.price} M on your account.`);
    let it = null;
    if (a.bid) { const b = city.players[a.bid], x = b && b.life && b.life.items.find((i) => i.cid === a.cid && !i.lot); if (!x) return ok('Someone else bought it first.'); b.life.items = b.life.items.filter((i) => i !== x); b.cash = r5(b.cash + a.price); it = { ...x }; delete it.loan; delete it.shop; it.lent = false; }
    else { if (LIFE.available(city, a.cid) < 1) return ok('Someone else bought it first.'); it = { uid: 'i' + Math.random().toString(36).slice(2, 9), cid: a.cid, lent: false }; }
    it.m = city.m; it.cost = a.price; p.life.items.push(it); wal(city, p, -a.price, `Aurex & Co. private sale · ${c.name}`); return ok(`${c.name} is yours. The set is complete.`); }
});
