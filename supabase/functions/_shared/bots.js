// Rival tycoons with a personality (BOT from engine.js; who they are and what they say: BOT_PERS / BOT_TALK / BOT_REL in content.js).
// Every bot keeps a relation with every human tycoon (city.rel[bot][player] = { v: −100…100, mem, w, l, rival, … }) that moves with
// what the player does to them, and remembers the three biggest things. Friends send tips, offer goods and step in when others attack;
// rivals hunt the same companies and specialists, start price wars, take unanswered orders, write about you in the Gazette and, as
// enemies, bid for weak companies (never without your yes). city.bots[bot] holds their mood, plans and stories (wars, loans, dream bids).
// Bots follow the same rules as players: they pay for everything and get no hidden bonus. A player can always win a fight with them.
import { BOT_PERS, BOT_REL as R, BOT_TALK, BOT_SUBJ, BOT_CHAT, TYPES, GOODS, RECIPES, WORLD, STOCKS } from './content.js';
import * as MAIL from './mail.js';
import * as OPS from './ops.js';
import * as DEAL from './deals.js';

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ok = (msg) => ({ ok: true, msg }), err = (msg) => ({ ok: false, msg });
const WEEK = 1 / 48;
const co = (l) => (l ? l.title || TYPES[l.type].name : 'company');
const first = (p) => (p ? p.first || String(p.name).split(' ')[0] : '');
const ownerIs = (l, k, id) => !!(l && l.owner && l.owner.k === k && l.owner.id === id);

export const PERS = BOT_PERS;
export const pers = (id) => BOT_PERS[id] || null;
export function ensure(city) {
  city.rel = city.rel || {}; city.bots = city.bots || {};
  Object.values(city.players).forEach((b) => { if (!b.bot) return; city.rel[b.id] = city.rel[b.id] || {}; city.bots[b.id] = city.bots[b.id] || { mood: 60 }; });
  return city.bots;
}
export const st = (city, bid) => { ensure(city); return city.bots[bid] || (city.bots[bid] = { mood: 60 }); };
export function rel(city, bid, pid) { ensure(city); const t = city.rel[bid] || (city.rel[bid] = {}); return t[pid] || (t[pid] = { v: 0, mem: [], w: 0, l: 0 }); }
export const relV = (city, bid, pid) => (city.rel && city.rel[bid] && city.rel[bid][pid] ? city.rel[bid][pid].v : 0);
export function level(v) { const i = R.levels.findIndex(([max]) => v < max); return { i, name: R.levels[Math.max(0, i)][1] }; }
export const isRival = (city, bid, pid) => { const r = city.rel && city.rel[bid] && city.rel[bid][pid]; return !!r && (r.rival || r.v <= -40); };
export const isFriend = (city, bid, pid) => relV(city, bid, pid) >= 40;
export const isAlly = (city, bid, pid) => relV(city, bid, pid) >= 75;
export const bots = (city) => Object.values(city.players).filter((p) => p.bot);
// the tycoons bots care about: real players (not the administrator, not coops)
export const humans = (city) => Object.values(city.players).filter((p) => !p.bot && !p.admin && !p.coop);
const isHuman = (p) => !!p && !p.bot && !p.admin && !p.coop;
// new tycoons are left in peace for their first months
export const fresh = (city, p) => city.m - (p.joinedM ?? 0) < R.newbieMonths;
const fill = (s, x) => String(s).replace(/\{(\w+)\}/g, (_, k) => (x[k] != null ? x[k] : ''));

// ---------------------------------------------------------------- memory and relation
function remember(r, e) {
  r.mem = (r.mem || []).concat([e]).sort((a, b) => Math.abs(b.w) - Math.abs(a.w) || b.m - a.m).slice(0, 3);
}
// something happened between a bot and a player: move the relation, remember it, keep score of the rivalry
export function event(city, bid, pid, kind, x = {}, ctx = {}) {
  const b = city.players[bid], p = city.players[pid]; if (!b || !b.bot || !isHuman(p)) return 0;
  const per = pers(bid) || {}, r = rel(city, bid, pid);
  let d = x.d != null ? x.d : R.ev[kind] != null ? R.ev[kind] : 0;
  if (d < 0) d *= (per.grudge || 1) * ((per.hates || []).includes(kind) ? 2 : 1);
  else if (d > 0) d *= (per.warm || 1) * ((per.likes || []).includes(kind) ? 1.5 : 1);
  d = Math.round(d);
  const wasRival = isRival(city, bid, pid);
  r.v = clamp(r1(r.v + d), -100, 100); r.lastM = city.m;
  if (R.mem[kind] && (d || x.t)) remember(r, { m: city.m, t: fill(x.t || R.mem[kind], { x: x.x || '' }), w: d || (R.loss.includes(kind) ? 1 : 0) });
  if (R.win.includes(kind)) won(city, b, p, r, wasRival, x, ctx);
  if (R.loss.includes(kind)) lost(city, b, p, r, x);
  return d;
}
// the player beat the bot
function won(city, b, p, r, wasRival, x, ctx) {
  r.w = (r.w || 0) + 1; const m = city.m;
  if (wasRival && m - (r.infM ?? -99) >= R.inf) { r.infM = m; p.inf = (p.inf || 0) + 1; if (ctx.feed) ctx.feed(p, `You got the better of ${b.name}`, '+1 Influence for beating a rival.', 'good'); if (ctx.news) ctx.news(`${p.name} gets the better of ${b.name} again`, `The rivalry between the two goes on. ${x.x ? `This time: ${x.x}.` : ''}`, 'info'); }
  if (!r.rival && r.w - (r.wPeace || 0) >= R.rivalWins && !fresh(city, p)) {
    r.rival = true; r.wR = r.w; r.v = Math.min(r.v, -40);
    say(city, b, p, 'rival', {}, { kind: 'bad' });
    if (ctx.news) ctx.news(`${b.name} names ${p.name} a rival`, `"${first(p)} has crossed me three times," says ${first(b)}. Aurex Bay has a new rivalry.`, 'info');
    return;
  }
  if (r.rival && r.w - (r.wR || 0) >= R.peaceWins && r.peaceM == null) {
    r.peaceM = m;
    say(city, b, p, 'peace', {}, { opts: [{ l: 'Make peace', d: 'The rivalry ends and you start as friends', bot: { k: 'peaceYes', bid: b.id } }, { l: 'Keep fighting', d: 'The rivalry goes on', safe: true, bot: { k: 'peaceNo', bid: b.id } }] });
    return;
  }
  if (!r.noted || Math.random() < 0.3) { r.noted = 1; if (x.x) say(city, b, p, 'sore', { x: x.x }); }
}
// the bot beat the player: a short message, at most every two months
function lost(city, b, p, r, x) {
  r.l = (r.l || 0) + 1;
  if (x.quiet || city.m - (r.tauntM ?? -9) < 2) return;
  r.tauntM = city.m; if (x.sit !== 'none') say(city, b, p, x.sit || 'taunt', { x: x.x || '', co: x.co || '' });
}

// ---------------------------------------------------------------- mail in their own voice
export function say(city, b, p, sit, x = {}, extra = {}) {
  if (!isHuman(p)) return null;
  const lines = (BOT_TALK[b.id] || {})[sit] || BOT_TALK._[sit]; if (!lines) return null;
  const vars = { p: first(p), me: first(b), ...x }, line = fill(lines[Math.floor(Math.random() * lines.length)], vars);
  const body = [line, x.body].filter(Boolean).join('\n');
  const per = pers(b.id);
  const mail = { g: city.g, m: city.m, from: { n: b.name, r: per ? per.title : 'Tycoon', k: 'bot', pid: b.id, c: b.color }, subj: fill(extra.subj || BOT_SUBJ[sit] || 'A note', vars), body, kind: extra.kind || 'info', bot: b.id };
  if (extra.opts) { mail.opts = extra.opts; mail.due = r4(city.g + (extra.wait || 2) * WEEK); }
  ['lid', 'deal', 'web'].forEach((k) => { if (extra[k]) mail[k] = extra[k]; });
  const t = body.replace(/\n/g, ' '); rel(city, b.id, p.id).said = { m: city.m, t: t.length > 180 ? t.slice(0, 177).replace(/\s+\S*$/, '') + '…' : t };
  return MAIL.send(p, mail);
}

// ---------------------------------------------------------------- answers to their mails (opts[].bot)
export function answer(city, p, x, o, ctx) {
  const a = o.bot, b = city.players[a.bid]; if (!b) return ok('They have left the city.');
  const s = st(city, b.id), r = rel(city, b.id, p.id), m = city.m;
  switch (a.k) {
    case 'ride': return ok('You ride it out.');
    case 'truce': {
      if (!s.war || s.war.pid !== p.id) return ok('The price war is already over.');
      if (r.v > -60 || Math.random() < 0.25) { endWar(city, b, 'truce', ctx); event(city, b.id, p.id, 'truce', {}, ctx); return ok(`${b.name} agreed to a truce. Prices are back to normal.`); }
      return ok(`${b.name} refused. The price war goes on.`);
    }
    case 'hit': {
      if (!s.war || s.war.pid !== p.id) return ok('The price war is already over.');
      const cost = r2(a.cost); if (p.cash < cost) return err(`Hitting back costs ${cost} M.`);
      p.cash = r4(p.cash - cost); b.cash = r4(b.cash - cost * 1.5);
      const l = ctx.listing(s.war.lid); if (l && l.ops) l.ops.customers = Math.min(400, l.ops.customers * 1.06);
      endWar(city, b, 'hit', ctx); event(city, b.id, p.id, 'hit', { x: `the price war over ${co(l)}` }, ctx);
      return ok(`You matched their prices and outspent them. ${b.name} gave up. Customers +6%.`);
    }
    case 'pressBack': {
      const l = ctx.listing(a.lid); if (!l || !l.ops || !ctx.canRun(p.id, l)) return ok('The company is no longer yours.');
      const fee = ctx.pressFee(); if (p.cash < fee) return err(`A press release costs ${fee} M.`);
      p.cash = r4(p.cash - fee); ctx.payPaper(fee);
      l.ops.rep = clamp(l.ops.rep + R.press.back.rep, 0, 100); l.ops.customers = Math.min(400, l.ops.customers * (1 + R.press.back.cust));
      ctx.news(`${co(l)} answers ${b.name}`, `"We let our customers judge," says ${p.name}. Bookings are up again.`, 'good', { press: true, lid: l.id });
      event(city, b.id, p.id, 'press', { x: `the Gazette story about ${co(l)}` }, ctx);
      return ok(`Your answer is in the Gazette. Reputation +${R.press.back.rep}, customers +${Math.round(R.press.back.cust * 100)}%.`);
    }
    case 'ignore': return ok('Noted.');
    case 'crisisBuy': case 'crisisLow': {
      const l = ctx.listing(a.lid); if (!l || !ownerIs(l, 'p', b.id)) return ok(`${b.name} no longer owns it.`);
      const low = a.k === 'crisisLow', price = low ? a.low : a.a;
      if (low && s.mood >= 25) { event(city, b.id, p.id, 'lowball', { x: co(l) }, ctx); return ok(`${b.name} turned your ${price} M down.`); }
      if (p.cash < price) return err(`You need ${price} M.`);
      p.cash = r4(p.cash - price); b.cash = r4(b.cash + price); ctx.sell(l, p);
      event(city, b.id, p.id, low ? 'exploit' : 'help', { t: low ? `Squeezed me for ${co(l)} when I was down` : `Bought ${co(l)} when I needed cash` }, ctx);
      ctx.news(`${p.name} buys ${co(l)} from ${b.name}`, `${b.name} needed cash. Price: ${price} M.`, 'info');
      return ok(`${co(l)} is yours for ${price} M.`);
    }
    case 'lend': {
      const amt = a.a; if (p.cash < amt) return err(`You need ${amt} M.`);
      p.cash = r4(p.cash - amt); b.cash = r4(b.cash + amt);
      (s.owe = s.owe || []).push({ pid: p.id, amt, due: m + 12 });
      event(city, b.id, p.id, 'help', { t: 'Lent me money when I needed it' }, ctx);
      return ok(`You lent ${b.name} ${amt} M. You get it back in a year with ${Math.round(R.lendRate * 100)}% interest.`);
    }
    case 'pass': event(city, b.id, p.id, 'refuse', {}, ctx); return ok('You said no.');
    case 'peaceYes': {
      r.rival = false; r.wPeace = r.w; r.peaceM = null; r.v = Math.max(r.v, 0); event(city, b.id, p.id, 'peace', {}, ctx);
      ctx.news(`${p.name} and ${b.name} make peace`, 'The rivalry is over. The city breathes again.', 'good');
      return ok(`Peace with ${b.name}.`);
    }
    case 'peaceNo': return ok('The rivalry goes on.');
    case 'offer': {
      const of = (city.offers || []).find((y) => y.id === a.oid && y.status === 'open'); if (!of) return ok('The offer is closed.');
      const l = ctx.listing(of.lid);
      if (a.yes) { ctx.offerAccept(of); if (of.status === 'accepted') { event(city, b.id, p.id, 'sold', { x: co(l) }, ctx); return ok(`Sold to ${b.name} for ${of.amount} M.`); } return ok('The sale fell through.'); }
      of.status = 'declined'; if (pers(b.id) && pers(b.id).dream === of.lid) event(city, b.id, p.id, 'keep', { x: co(l) }, ctx);
      return ok('You keep it.');
    }
    default: return ok('Noted.');
  }
}

// ---------------------------------------------------------------- what players do to them
// a tycoon bought a company: the bot that dreamed of it, had its eye on it, or hunts in that sector notices
export function onBuy(city, p, l, ctx) {
  if (!isHuman(p)) return;
  bots(city).forEach((b) => {
    const per = pers(b.id); if (!per) return; const s = st(city, b.id);
    if (per.dream === l.id) event(city, b.id, p.id, 'dream', { x: co(l) }, ctx);
    else if (s.eye === l.id) { s.eye = null; event(city, b.id, p.id, 'eye', { x: co(l) }, ctx); }
    else if (per.types.includes(l.type) && ctx.ownedBy('p', b.id).some((x) => per.types.includes(x.type))) event(city, b.id, p.id, 'beat', { x: co(l) }, ctx);
  });
}
// chances for answers bots give to players
export const netChance = (city, bid, pid) => clamp(0.7 + relV(city, bid, pid) / 150, 0.05, 0.98);
export const contractChance = (city, bid, pid) => clamp(0.8 + relV(city, bid, pid) / 200, 0.1, 0.98);
// how much more than its value a bot wants before it sells a company to a player
export function sellNeed(city, bid, pid, l) {
  const per = pers(bid), v = relV(city, bid, pid);
  if (per && per.dream === l.id) return 3;
  return 1.2 + Math.random() * 0.3 + (v <= -40 ? 0.3 : 0) - (v >= 40 ? 0.15 : 0);
}
// a specialist moved between a bot and a player
export function onPoach(city, bot, p, tid, name, ctx) { event(city, bot.id, p.id, 'poach', { x: name }, ctx); }

// ---------------------------------------------------------------- buying: dream company, eye, sector, rivals
export function chooseBuy(city, b, free, ctx) {
  const per = pers(b.id); if (!per || !free.length) return null;
  const s = st(city, b.id), rnd = Math.random;
  const dream = free.find((l) => l.id === per.dream); if (dream && rnd() < 0.85) return dream;
  const eye = free.find((l) => l.id === s.eye); if (eye && rnd() < 0.7) return eye;
  // rivals go after the sectors their rival is in
  const rivals = humans(city).filter((p) => isRival(city, b.id, p.id));
  if (rivals.length && rnd() < 0.35) { const t = new Set(rivals.flatMap((p) => ctx.ownedBy('p', p.id).map((l) => l.type))); const hit = free.filter((l) => t.has(l.type)); if (hit.length) return hit[Math.floor(rnd() * hit.length)]; }
  const mine = free.filter((l) => per.types.includes(l.type)); if (mine.length && rnd() < 0.75) return mine.sort((a, c) => ctx.price(c) - ctx.price(a))[0];
  return null;
}
// a bot with a rival builds faster
export const upgradeBoost = (city, b) => (humans(city).some((p) => isRival(city, b.id, p.id)) ? 1.5 : 1);

// ---------------------------------------------------------------- the auction house (life.js asks)
// which bot raises the bid this week, and how far it will go; friends of a bidding player stay out
export function auctionBidder(city, lot, cands, val) {
  const humansIn = Object.keys(lot.bids || {}).filter((pid) => isHuman(city.players[pid]));
  const pool = cands.filter((b) => !humansIn.some((pid) => isFriend(city, b.id, pid))); if (!pool.length) return null;
  const w = pool.map((b) => { const a = (pers(b.id) || {}).auction || {}; return 1 + (a.lust || 0.5) + (humansIn.some((pid) => isRival(city, b.id, pid)) ? 1.5 : 0); });
  let t = w.reduce((x, y) => x + y, 0) * Math.random(), i = 0; for (; i < pool.length - 1; i++) { t -= w[i]; if (t <= 0) break; }
  const b = pool[i], a = (pers(b.id) || {}).auction || {}, rival = humansIn.some((pid) => isRival(city, b.id, pid));
  const cap = val * ((a.cap || 1.15) + (rival ? 0.05 : 0)) * (a.bluff && Math.random() < 0.5 ? 0.85 : 1) * (0.95 + Math.random() * 0.1);
  return { b, cap };
}
// a lot was sold: bots that lost it to a player remember; a bot that beat a player says so
export function auctionDone(city, name, winner, humanIds, botIds, ctx) {
  const w = city.players[winner]; if (!w) return;
  if (isHuman(w)) botIds.forEach((bid) => event(city, bid, w.id, 'outbid', { x: name }, ctx));
  else if (w.bot) humanIds.filter((pid) => pid !== winner).forEach((pid) => event(city, w.id, pid, 'lose', { x: name }, ctx));
}

// ---------------------------------------------------------------- world cards: each bot reacts in character
export function onWorld(city, card, ctx) {
  bots(city).forEach((b) => {
    const per = pers(b.id); if (!per || !per.world) return;
    const how = per.world[card.fx] || per.world[card.econ]; if (!how || Math.random() > 0.7) return;
    const s = st(city, b.id); let t = null;
    if (how === 'buyDip' && b.cash > 8) { const ids = STOCKS.slice().sort(() => Math.random() - 0.5).slice(0, 2).map((x) => x.id); ids.forEach((id) => ctx.trade(b, id, 3 + Math.floor(Math.random() * 4))); t = `${b.name} buys the dip`; }
    if (how === 'sellStocks') { const ks = Object.keys(b.shares || {}); if (ks.length) { ks.forEach((k) => ctx.trade(b, k, -b.shares[k])); t = `${b.name} sells off the whole stock portfolio`; } }
    if (how === 'buyStocks' && b.cash > 10) { const top = Object.entries(card.shock || {}).sort((x, y) => y[1] - x[1])[0]; if (top && top[1] > 0) { ctx.trade(b, top[0], 3 + Math.floor(Math.random() * 4)); t = `${b.name} bets on ${STOCKS.find((x) => x.id === top[0]).name}`; } }
    if (how === 'power') { const l = city.listings.find((x) => !x.owner && x.type === 'power' && !ctx.reserved(x) && ctx.price(x) <= b.cash - 2); if (l) { b.cash -= ctx.price(l); ctx.assign(l, b); t = `${b.name} buys ${co(l)} as energy runs short`; } }
    if (t) { s.react = { m: city.m, t }; if (Math.random() < 0.6) ctx.news(t, `"${card.title}? I saw it coming," says ${first(b)}.`, 'info', { who: b.id }); }
  });
}

// ---------------------------------------------------------------- price wars
const warOn = (city, pid) => bots(city).some((b) => { const w = st(city, b.id).war; return w && w.pid === pid; });
function endWar(city, b, how, ctx) {
  const s = st(city, b.id), w = s.war; if (!w) return; s.war = null; s.lastWar = { pid: w.pid, how, m: city.m };
  const p = city.players[w.pid]; if (how === 'outlast' || how === 'broke') { say(city, b, p, 'warEnd', {}, { kind: 'good' }); event(city, b.id, w.pid, 'outlast', { x: 'the price war' }, ctx); }
}
function warTick(city, b, ctx) {
  const s = st(city, b.id), w = s.war; if (!w) return;
  const l = ctx.listing(w.lid), bl = ctx.listing(w.blid);
  if (!l || !l.ops || !ownerIs(l, 'p', w.pid) || !bl || !bl.ops || !ownerIs(bl, 'p', b.id)) { s.war = null; return; }
  if (city.g >= w.until - 1e-9) { endWar(city, b, 'outlast', ctx); return; }
  l.ops.customers = Math.max(20, l.ops.customers * (1 - R.war.bite));
  b.cash = r4(b.cash - R.war.cost * OPS.scale(bl));
  // on the supplies market their offers go just under yours
  Object.keys(RECIPES[bl.type].out).forEach((g) => {
    const yours = (city.book || []).filter((o) => o.g === g && o.lid === l.id), theirs = (city.book || []).filter((o) => o.g === g && o.lid === bl.id);
    if (yours.length && theirs.length) { const low = Math.min(...yours.map((o) => o.price)); theirs.forEach((o) => { o.price = r4(Math.min(o.price, low * R.war.under)); }); }
  });
  if (b.cash < R.war.giveUp) endWar(city, b, 'broke', ctx);
}

// ---------------------------------------------------------------- moves against a rival (one at a time, with a pause in between)
function moves(city, b, p, ctx) {
  const out = [], mine = ctx.ownedBy('p', b.id).filter((l) => l.ops), theirs = ctx.ownedBy('p', p.id).filter((l) => l.ops && !l.ops.managed);
  const same = []; theirs.forEach((l) => mine.forEach((bl) => { if (bl.type === l.type) same.push([l, bl]); }));
  if (same.length && !st(city, b.id).war && !warOn(city, p.id)) out.push('war');
  if (same.some(([l]) => (l.ops.orders || []).some((od) => od.status === 'new' && od.m < city.m))) out.push('steal');
  if (theirs.length && b.cash > ctx.pressFee() + 5) out.push('press');
  if (ctx.talentTargets(b, p).length) out.push('talent');
  if (relV(city, b.id, p.id) <= -75 && theirs.some((l) => weak(city, l, p, ctx) && ctx.takeoverPrice(l) * R.hostile.prem[1] + 3 < b.cash)) out.push('hostile');
  return { out, same, theirs };
}
const weak = (city, l, p, ctx) => !ctx.hasLegal(l, p) && !ctx.staffed(l) && !(city.offers || []).some((o) => o.status === 'open' && o.lid === l.id && o.hostile);
function move(city, b, p, ctx) {
  const { out, same, theirs } = moves(city, b, p, ctx); if (!out.length) return false;
  const k = out[Math.floor(Math.random() * out.length)];
  if (k === 'war') {
    const [l, bl] = same[Math.floor(Math.random() * same.length)];
    st(city, b.id).war = { pid: p.id, lid: l.id, blid: bl.id, from: city.g, until: r4(city.g + R.war.weeks * WEEK) };
    const cost = r2(R.war.hit * OPS.scale(l));
    say(city, b, p, 'war', { co: co(bl), body: `While it lasts, your ${co(l)} loses about ${Math.round(R.war.bite * 100)}% of its customers a week, and on the supplies market my offers sit just under yours. It runs for up to ${R.war.weeks} weeks.` }, { kind: 'bad', lid: l.id,
      opts: [{ l: 'Hit back', d: `−${cost} M: match their prices and outspend them. The war ends now`, bot: { k: 'hit', bid: b.id, cost } }, { l: 'Offer a truce', d: 'Works unless they really hate you', bot: { k: 'truce', bid: b.id } }, { l: 'Ride it out', d: `It ends within ${R.war.weeks} weeks`, safe: true, bot: { k: 'ride', bid: b.id } }] });
    ctx.news(`${b.name} starts a price war with ${p.name}`, `${co(bl)} cuts prices to win customers from ${co(l)}.`, 'info', { who: b.id });
    return true;
  }
  if (k === 'steal') {
    for (const [l, bl] of same.sort(() => Math.random() - 0.5)) {
      const od = (l.ops.orders || []).filter((x) => x.status === 'new' && x.m < city.m).sort((a, c) => c.value - a.value)[0]; if (!od) continue;
      const c = (l.ops.clients || []).find((x) => x.id === od.cid);
      od.status = 'cancelled'; od.reason = `${b.name}'s ${co(bl)} offered a lower price while the order waited for an answer.`; if (c) c.mood = Math.max(0, c.mood - 4);
      b.cash = r4(b.cash + (od.value || 0) * 0.25);
      ctx.notify(l, `${b.name} took an order from your ${co(l)}`, `${c ? c.name : 'A client'} waited too long for an answer. ${r2(od.value)} M went to ${co(bl)}. Answer new orders quickly.`, 'bad');
      event(city, b.id, p.id, 'stole', { x: `an order from ${c ? c.name : 'your client'}`, sit: 'stole' }, ctx);
      return true;
    }
    return false;
  }
  if (k === 'press') {
    const l = theirs.sort((a, c) => c.ops.customers - a.ops.customers)[0], fee = ctx.pressFee();
    b.cash = r4(b.cash - fee); ctx.payPaper(fee);
    l.ops.rep = clamp(l.ops.rep - R.press.rep, 0, 100); l.ops.customers = Math.max(20, l.ops.customers * (1 - R.press.cust));
    const heads = [`Is ${co(l)} overrated?`, `Questions about the service at ${co(l)}`, `${co(l)}: all show, no substance?`], h = heads[Math.floor(Math.random() * heads.length)];
    ctx.news(h, `${b.name} paid for a story in The Aurex Gazette about ${p.name}'s ${TYPES[l.type].name.toLowerCase()} in ${l.district}.`, 'bad', { press: true, lid: l.id });
    const fee2 = ctx.pressFee();
    MAIL.send(p, { g: city.g, m: city.m, from: { n: 'Press office', r: co(l) }, subj: `The Gazette: "${h}"`, body: `${b.name} paid for a story about us in today's Aurex Gazette. Reputation −${R.press.rep}, and we lose some customers. We can answer with our own press release: it wins them back and more.`, kind: 'bad', lid: l.id, bot: b.id, due: r4(city.g + 2 * WEEK),
      opts: [{ l: 'Answer in the Gazette', d: `−${fee2} M: reputation +${R.press.back.rep}, customers +${Math.round(R.press.back.cust * 100)}%`, bot: { k: 'pressBack', bid: b.id, lid: l.id } }, { l: 'Ignore it', d: 'It blows over', safe: true, bot: { k: 'ignore', bid: b.id } }] });
    rel(city, b.id, p.id).said = { m: city.m, t: `Paid for the Gazette story "${h}"` };
    return true;
  }
  if (k === 'talent') {
    const t = ctx.talentTargets(b, p)[0]; const r = ctx.talentBid(b, t.tid, t.fee, t.salary);
    if (r && r.ok) { rel(city, b.id, p.id).said = { m: city.m, t: `Made an offer for ${t.name}` }; return true; }
    return false;
  }
  if (k === 'hostile') {
    const l = theirs.filter((x) => weak(city, x, p, ctx)).sort((a, c) => ctx.value(c) - ctx.value(a))[0]; if (!l) return false;
    const amt = Math.round(ctx.takeoverPrice(l) * (R.hostile.prem[0] + Math.random() * (R.hostile.prem[1] - R.hostile.prem[0]))); if (b.cash < amt + 3) return false;
    const o = ctx.placeHostile(l, b, amt, true); if (!o) return false;
    say(city, b, p, 'hostile', { a: `${amt} M`, co: co(l), body: `Your ${co(l)} has no Legal head and is not fully staffed, so I can bid. It only goes through if you say yes. The offer stands for 2 months.` }, { kind: 'bad', lid: l.id, wait: 8,
      opts: [{ l: 'Sell', d: `+${amt} M (value ${ctx.value(l)} M)`, bot: { k: 'offer', bid: b.id, oid: o.id, yes: true } }, { l: 'Reject', d: 'You keep it', safe: true, bot: { k: 'offer', bid: b.id, oid: o.id, yes: false } }] });
    return true;
  }
  return false;
}

// ---------------------------------------------------------------- every week
export function weekStep(city, ctx) {
  ensure(city); const heat = city.bots._heat || (city.bots._heat = {});
  bots(city).forEach((b) => warTick(city, b, ctx));
  // rivals make a move now and then: never more than one in a few weeks against the same tycoon
  humans(city).forEach((p) => {
    if (fresh(city, p) || ctx.inactive(p) || city.g - (heat[p.id] ?? -9) < R.cooldown * WEEK - 1e-9) return;
    const rs = bots(city).filter((b) => isRival(city, b.id, p.id)).sort(() => Math.random() - 0.5);
    for (const b of rs) { const per = pers(b.id) || {}; if (Math.random() < R.move * (per.aggro || 1) && move(city, b, p, ctx)) { heat[p.id] = city.g; break; } }
  });
  // offers of goods to bots: they answer after a few days
  const dc = ctx.dctx;
  (city.deals || []).filter((d) => d.status === 'open' && city.players[d.to] && city.players[d.to].bot && city.g - d.at >= 0.5 * WEEK).forEach((d) => {
    const b = city.players[d.to], v = relV(city, b.id, d.from), base = GOODS[d.g].base;
    const max = base * (1.05 + (v >= 40 ? 0.1 : 0) - (v <= -40 ? 0.1 : 0));
    const comps = DEAL.buyerCompanies(city, dc, b.id, d.g);
    if (comps.length && d.price <= max + 1e-9 && b.cash > DEAL.total(d) + 2) {
      const r = DEAL.accept(city, b, { id: d.id, blid: comps[0].id, how: 'ridge' }, dc);
      if (r.ok) { event(city, b.id, d.from, 'deal', { t: `Sold me ${d.qty} ${GOODS[d.g].unit} of ${GOODS[d.g].name.toLowerCase()} at a fair price` }, ctx); return; }
    }
    DEAL.decline(city, b, { id: d.id }, dc);
    if (d.price > base * 1.5) event(city, b.id, d.from, 'lowball', { t: `Tried to sell me ${GOODS[d.g].name.toLowerCase()} at a silly price`, d: -2 }, ctx);
  });
}

// ---------------------------------------------------------------- every month
export function monthStep(city, m, ctx) {
  ensure(city);
  const hs = humans(city);
  bots(city).forEach((b) => {
    const per = pers(b.id) || {}, s = st(city, b.id);
    // mood follows their own fortunes
    const h = b.hist || [], now = ctx.netWorth(b.id), old = h.length >= 3 ? h[h.length - 3][1] : now;
    s.mood = clamp(Math.round(s.mood + ((now - old) / Math.max(5, Math.abs(old))) * 150 + (60 - s.mood) * 0.1 - (b.cash < 0 ? 8 : 0)), 0, 100);
    // relations drift back towards neutral; supply contracts keep them warm
    hs.forEach((p) => { const r = city.rel[b.id][p.id]; if (r) r.v = r1(r.v - r.v * R.decay * (per.decay ?? 1)); });
    (city.contracts || []).filter((c) => c.status === 'active' && (c.from === b.id || c.to === b.id)).forEach((c) => event(city, b.id, c.from === b.id ? c.to : c.from, 'contract', {}, ctx));
    // competing in the same sector wears on the ambitious ones; warm ones grow fond of the tycoons in their network
    const myTypes = new Set(ctx.ownedBy('p', b.id).map((l) => l.type).filter((t) => per.types && per.types.includes(t)));
    hs.forEach((p) => {
      if (fresh(city, p) || ctx.inactive(p)) return;
      const clash = myTypes.size ? ctx.ownedBy('p', p.id).filter((l) => myTypes.has(l.type)).length : 0;
      if (clash && (per.aggro || 1) >= 1) event(city, b.id, p.id, 'compete', { d: -Math.min(3, clash) * (per.aggro || 1) }, ctx);
      else if ((p.net || []).includes(b.id) && (per.warm || 1) >= 1.1) event(city, b.id, p.id, 'compete', { d: 1 }, ctx);
    });
    // the company they would buy next
    const free = city.listings.filter((l) => !l.owner && per.types && per.types.includes(l.type) && !TYPES[l.type].starter && !ctx.reserved(l) && ctx.price(l) <= b.cash + 15);
    s.eye = (free.find((l) => l.id === per.dream) || free.sort((a, c) => ctx.price(c) - ctx.price(a))[0] || {}).id || null;
    repay(city, b, s, m, ctx);
    friendly(city, b, m, ctx);
    crisis(city, b, s, m, ctx);
    dreamBid(city, b, s, m, ctx);
  });
  alliances(city, m, ctx);
}
function repay(city, b, s, m, ctx) {
  (s.owe || []).filter((x) => x.due <= m).forEach((x) => {
    const p = city.players[x.pid], amt = r2(x.amt * (1 + R.lendRate));
    if (b.cash < amt) { x.due = m + 3; return; }
    b.cash = r4(b.cash - amt); if (p) { p.cash = r4(p.cash + amt); say(city, b, p, 'repay', { body: `${amt} M is on your account.` }, { kind: 'good' }); event(city, b.id, p.id, 'deal', { d: 5, t: 'Got the loan back with interest' }, ctx); }
    x.done = true;
  });
  s.owe = (s.owe || []).filter((x) => !x.done);
}
// friends: tips, cheap goods, and a word about the next world card
function friendly(city, b, m, ctx) {
  humans(city).forEach((p) => {
    const v = relV(city, b.id, p.id), r = rel(city, b.id, p.id); if (ctx.inactive(p)) return;
    if (v >= 40 && Math.random() < R.tips) { const t = tip(city, b, p, ctx); if (t) say(city, b, p, 'tip', { body: t }, { kind: 'good' }); }
    if (v >= 75) { const key = `${city.lastCard ? city.lastCard.m : -1}:${city.deck && city.deck[0]}`, card = WORLD.find((w) => w.id === (city.deck || [])[0]);
      if (card && r.intel !== key && Math.random() < 0.5) { r.intel = key; say(city, b, p, 'ally', { body: MAIL.insightBody(card) }, { kind: 'good' }); } }
    if (v >= 15 && (p.net || []).includes(b.id) && Math.random() < R.deals) offerGoods(city, b, p, v, ctx);
  });
}
function tip(city, b, p, ctx) {
  const mine = ctx.ownedBy('p', p.id), out = [];
  const uses = new Set(mine.filter((l) => l.ops).flatMap((l) => OPS.stocked(l).map(([g]) => g)));
  uses.forEach((g) => { const mk = city.market && city.market[g]; if (!mk) return; const d = Math.round((mk.p / (GOODS[g].base * ctx.px()) - 1) * 100);
    if (d <= -6) out.push(`${GOODS[g].name} is ${-d}% under its normal price right now. Stock up while it lasts.`);
    if (d >= 10) out.push(`${GOODS[g].name} is ${d}% above normal. Buy through a warehouse, or wait a month.`); });
  const types = new Set(mine.map((l) => l.type));
  city.listings.filter((l) => !l.owner && types.has(l.type) && !ctx.reserved(l)).slice(0, 2).forEach((l) => out.push(`${co(l)} in ${l.district} is for sale for ${ctx.price(l)} M. It would sit well next to yours.`));
  ctx.talentListed().slice(0, 2).forEach((t) => out.push(`${t.name} is on the transfer list for ${t.fee} M. Good people do not stay there long.`));
  (city.offers || []).filter((o) => o.status === 'open' && o.to === p.id && o.hostile).forEach(() => out.push('Someone has a hostile bid on one of your companies. Put a Legal head in charge.'));
  return out.length ? out[Math.floor(Math.random() * out.length)] : null;
}
// a friendly bot offers goods its companies make to a player's company that uses them, under the market price
function offerGoods(city, b, p, v, ctx) {
  const dc = ctx.dctx;
  for (const bl of ctx.ownedBy('p', b.id).filter((l) => l.ops && RECIPES[l.type])) {
    for (const g of Object.keys(RECIPES[bl.type].out)) {
      const buyers = DEAL.buyerCompanies(city, dc, p.id, g); if (!buyers.length) continue;
      (city.book || []).filter((o) => o.lid === bl.id && o.g === g).forEach((o) => OPS.cancelOffer(city, o));
      const need = Math.round(OPS.needsPerMonth(buyers[0])[g] || 0), qty = Math.min(Math.floor(bl.ops.inv[g] || 0), Math.max(1, need));
      if (qty < 1) continue;
      const price = r4(GOODS[g].base * (v >= 40 ? 0.88 : 0.95));
      const r = DEAL.offer(city, b, { lid: bl.id, g, qty, price, to: p.id }, dc);
      if (r.ok) { rel(city, b.id, p.id).said = { m: city.m, t: `Offered you ${GOODS[g].name.toLowerCase()} under the market price` }; return; }
    }
  }
}
// a bot short of cash asks the tycoon who likes it most for help
function crisis(city, b, s, m, ctx) {
  if (m - (s.crisisM ?? -99) < 8) return; // at most one plea every eight months
  if (!(b.cash < 2 || s.mood < 25) || Math.random() > R.crisis) return;
  const p = humans(city).filter((x) => !ctx.inactive(x) && !fresh(city, x) && relV(city, b.id, x.id) >= -15).sort((x, y) => relV(city, b.id, y.id) - relV(city, b.id, x.id))[0]; if (!p) return;
  const l = ctx.ownedBy('p', b.id).filter((x) => !ctx.reserved(x)).sort((x, y) => ctx.value(x) - ctx.value(y))[0];
  const opts = [];
  if (l) { const a = Math.max(1, Math.round(ctx.value(l) * R.crisisPrice)), low = Math.max(1, Math.round(ctx.value(l) * R.lowPrice));
    opts.push({ l: `Buy ${co(l)} for ${a} M`, d: `Value ${ctx.value(l)} M · a friend for life`, bot: { k: 'crisisBuy', bid: b.id, lid: l.id, a } });
    opts.push({ l: `Offer ${low} M`, d: 'A bargain, if they are desperate enough. They will remember', bot: { k: 'crisisLow', bid: b.id, lid: l.id, low } }); }
  opts.push({ l: `Lend ${R.lend} M`, d: `Back in a year with ${Math.round(R.lendRate * 100)}% interest`, bot: { k: 'lend', bid: b.id, a: R.lend } });
  opts.push({ l: 'Not now', d: 'They will be a little hurt', safe: true, bot: { k: 'pass', bid: b.id } });
  s.crisisM = m;
  say(city, b, p, 'crisis', { body: l ? `I could sell you my ${co(l)} in ${l.district} below its value, or you could lend me ${R.lend} M for a year.` : `Could you lend me ${R.lend} M for a year? I will pay it back with interest.` }, { opts, wait: 3 });
}
// the dream company: if a player owns it, the bot asks every half year, a little higher each time
function dreamBid(city, b, s, m, ctx) {
  const per = pers(b.id); if (!per) return; const l = ctx.listing(per.dream); if (!l || !l.owner || l.owner.k !== 'p') return;
  const p = city.players[l.owner.id]; if (!isHuman(p) || fresh(city, p) || m - (s.dreamM ?? -99) < R.dreamEvery || Math.random() > 0.5) return;
  if ((city.offers || []).some((o) => o.status === 'open' && o.lid === l.id)) return;
  const n = s.dreamN || 0, amt = Math.round(ctx.value(l) * (1.2 + n * R.dreamStep)); if (b.cash < amt) return;
  s.dreamM = m; s.dreamN = n + 1;
  const o = { id: 'o' + Math.random().toString(36).slice(2, 9), lid: l.id, from: b.id, to: p.id, amount: amt, m, status: 'open' }; city.offers.push(o);
  say(city, b, p, 'dream', { co: co(l), a: `${amt} M`, body: n ? `That is my ${n + 1}. offer. Each one is higher than the last.` : '' }, { lid: l.id, wait: 8,
    opts: [{ l: 'Sell', d: `+${amt} M (value ${ctx.value(l)} M)`, bot: { k: 'offer', bid: b.id, oid: o.id, yes: true } }, { l: 'Keep it', d: 'They will ask again in half a year', safe: true, bot: { k: 'offer', bid: b.id, oid: o.id, yes: false } }] });
}
// two bots with the same rival join forces; the alliance breaks when one of them stops hating you
function alliances(city, m, ctx) {
  Object.values(city.holdings || {}).filter((h) => h.bot && h.vs).forEach((h) => {
    const p = city.players[h.vs]; if (!p) { h.vs = null; return; }
    const soft = Object.keys(h.members).find((bid) => relV(city, bid, p.id) >= 0);
    if (soft) { h.vs = null; const b = city.players[soft]; say(city, b, p, 'allianceEnd', {}, { kind: 'good' }); ctx.news(`${h.name} falls apart`, `${b.name} no longer wants to fight ${p.name}.`, 'info'); }
  });
  if (Object.values(city.holdings || {}).filter((h) => h.bot && h.vs).length >= 2) return;
  humans(city).forEach((p) => {
    if (fresh(city, p) || ctx.inactive(p) || Object.values(city.holdings || {}).some((h) => h.vs === p.id) || Math.random() > R.alliance) return;
    const two = bots(city).filter((b) => isRival(city, b.id, p.id) && !ctx.inHolding(b) && b.cash >= 10).sort((a, c) => relV(city, a.id, p.id) - relV(city, c.id, p.id)).slice(0, 2);
    if (two.length < 2) return;
    const h = ctx.ally(two[0], two[1], p); if (!h) return;
    say(city, two[0], p, 'alliance', { body: `${two[1].name} and I have founded ${h.name}. We will be buying in your sectors.` }, { kind: 'bad' });
  });
}
// a bot coop with a target buys in that tycoon's sectors
export function allianceBuy(city, h, free, ctx) {
  if (!h.vs) return null; const t = new Set(ctx.ownedBy('p', h.vs).map((l) => l.type)); const hit = free.filter((l) => t.has(l.type));
  return hit.length ? hit[Math.floor(Math.random() * hit.length)] : null;
}
// coop owners vote in character: more yes to companies in their own sectors
export const voteBias = (bid, l) => { const per = pers(bid); return per && l && per.types.includes(l.type) ? 0.15 : 0; };

// ---------------------------------------------------------------- when another tycoon bids for your company: friends warn you, allies step in
export function onHostile(city, o, ctx) {
  const p = city.players[o.to], buyer = city.players[o.from], l = ctx.listing(o.lid); if (!isHuman(p) || !buyer || !l) return;
  const friends = bots(city).filter((b) => b.id !== buyer.id && relV(city, b.id, p.id) >= 40).sort((a, c) => relV(city, c.id, p.id) - relV(city, a.id, p.id));
  const ally = friends.find((b) => relV(city, b.id, p.id) >= 75);
  if (ally && buyer.bot) { o.status = 'failed'; say(city, ally, p, 'blocked', { x: buyer.name, co: co(l) }, { kind: 'good' }); if (isHuman(p)) event(city, buyer.id, p.id, 'refuse', { d: -2, t: `Had a friend block my bid for ${co(l)}` }, ctx); return; }
  if (friends[0]) say(city, friends[0], p, 'warn', { x: buyer.name, co: co(l) }, { kind: 'bad' });
}

// ---------------------------------------------------------------- chat: fixed answers by relation and what they remember
export function reply(city, bid, pid, text) {
  const b = city.players[bid]; if (!b) return '';
  const v = relV(city, bid, pid), tier = v <= -15 ? 'bad' : v >= 15 ? 'good' : 'mid', t = String(text || '').toLowerCase();
  const k = /(advice|tip|help|hjælp|råd)/.test(t) ? 'advice' : /(deal|buy|sell|trade|price|offer|køb|sælg|handel|pris)/.test(t) ? 'deal' : /(sorry|peace|truce|friend|undskyld|fred|venner)/.test(t) ? 'peace' : /(crush|destroy|beat you|war|ruin|knuse|krig|smadre)/.test(t) ? 'threat' : /\b(hi|hello|hey|hej|halløj|goddag|morning)\b/.test(t) ? 'hello' : 'other';
  const lines = BOT_CHAT[k][tier]; let out = fill(lines[Math.floor(Math.random() * lines.length)], { p: first(city.players[pid]), me: first(b) });
  const r = city.rel && city.rel[bid] && city.rel[bid][pid];
  if (r && r.mem && r.mem.length && Math.random() < 0.3) { const x = r.mem[0]; out += x.w < 0 ? ` And I have not forgotten this: ${x.t.charAt(0).toLowerCase() + x.t.slice(1)}.` : ` I still remember: ${x.t.charAt(0).toLowerCase() + x.t.slice(1)}.`; }
  return out;
}

// ---------------------------------------------------------------- what the profile card shows
export function card(city, bid, pid) {
  const b = city.players[bid], per = pers(bid); if (!b) return null;
  const r = (city.rel && city.rel[bid] && city.rel[bid][pid]) || { v: 0, mem: [], w: 0, l: 0 }, s = (city.bots && city.bots[bid]) || { mood: 60 };
  const dream = per && city.listings.find((l) => l.id === per.dream);
  return { b, per, v: Math.round(r.v), lv: level(r.v), rival: isRival(city, bid, pid), mem: r.mem || [], said: r.said || null, w: r.w || 0, l: r.l || 0, mood: s.mood, react: s.react || null,
    war: s.war && s.war.pid === pid ? s.war : null, dream, eye: s.eye ? city.listings.find((l) => l.id === s.eye) : null,
    alliance: Object.values(city.holdings || {}).find((h) => h.bot && h.members[bid]) || null };
}
