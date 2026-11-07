// Aurex Bay Tycoon — holdings with divisions (co-owned parent companies).
// When a tycoon belongs to a co-owned parent company (p.co.hid → a holding with h.div), their whole empire is one
// division of it and they are its CEO. They run it from the Empire tab exactly as before: the companies stay theirs
// (owner k:'p'), and p.cash is the division's balance inside the holding's one account. The central account is
// h.treasury; the holding's own companies (owner k:'h') are the joint division, run by h.ceo.
// The holding's value (NAV) adds up the central account, the joint division and every division, so an owner's net
// worth is their stake of the whole holding plus their private side (Life). Money leaves the holding only as CEO
// salary (p.life.salary, paid from the central account), bonus, dividend or shares sold back.
// Every game year the books close: an annual report per holding (and a simple one for solo tycoons) and an annual
// meeting (votes on dividend, salaries and the rest). Numbers live in HOLDING in content.js.
import { HOLDING as H, SALARIES, TYPES } from './content.js';

const r2 = (v) => Math.round(v * 100) / 100;
const r4 = (v) => Math.round(v * 10000) / 10000;
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
export const KINDS = ['dividend', 'salary', 'bidrag', 'ceo', 'autoEq', 'equalize', 'exit', 'divBuy', 'divSell'];
const UNANIMOUS = ['equalize', 'autoEq'];

export const isDiv = (h) => !!(h && h.div);
export function divOf(city, p) { const h = p && p.co && p.co.hid && city.holdings && city.holdings[p.co.hid]; return h && h.div && h.members[p.id] != null ? h : null; }
// the owners who run a division: human members whose parent company is this holding
export function divs(city, h) { return Object.keys(h.members).map((id) => city.players[id]).filter((p) => p && !p.bot && p.co && p.co.hid === h.id); }
export const shares = (h) => sum(Object.values(h.members));
export const stake = (h, pid) => { const t = shares(h); return t ? (h.members[pid] || 0) / t : 0; };
// the CEO of the joint division (the holding's own companies)
export function ceo(city, h) { const id = h.ceo && h.members[h.ceo] != null && city.players[h.ceo] ? h.ceo : divs(city, h).map((p) => p.id)[0] || h.founder; return id; }

// one tycoon's empire, valued the way it counts inside a holding
export function empire(city, p, X) {
  const comps = sum(X.ownedBy('p', p.id).map((l) => X.listingValue(l)));
  const stocks = X.stockValue(p), wh = X.whValue(p.id), debt = X.debt(p);
  const h = divOf(city, p), iloan = h ? (h.iloans || {})[p.id] || 0 : 0;
  return { cash: r2(p.cash), stocks: r2(stocks), comps: r2(comps), wh: r2(wh), debt: r2(debt), iloan: r2(iloan), value: r2(p.cash + stocks + comps + wh - debt - iloan) };
}
// the holding's value: central account + joint division + every division (internal loans cancel out)
export function nav(city, h, X) {
  if (!h.div) return r2(h.treasury + sum(X.ownedBy('h', h.id).map((l) => X.listingValue(l))));
  const own = sum(X.ownedBy('h', h.id).map((l) => X.listingValue(l)));
  const dv = sum(divs(city, h).map((p) => empire(city, p, X).value));
  const il = sum(Object.values(h.iloans || {})), ol = sum(Object.values(h.oloans || {})), owe = sum(Object.values(h.owe || {}));
  return r2(h.treasury + own + dv + il - ol - owe);
}
export const price = (city, h, X) => { const t = shares(h), n = nav(city, h, X); return t > 0 && n > 0 ? n / t : 1; };
// money the holding owes a tycoon personally (owner loans): part of their net worth
export function lentBy(city, pid) { return sum(Object.values(city.holdings || {}).map((h) => (h.oloans || {})[pid] || 0)); }

// ---------------------------------------------------------------- setting up
function fields(city, h) {
  h.div = 1; h.ceo = h.ceo || h.founder; h.bidrag = h.bidrag ?? H.bidrag; h.iloans = h.iloans || {}; h.oloans = h.oloans || {}; h.owe = h.owe || {};
  h.reports = h.reports || []; h.autoEq = !!h.autoEq; h.payout = 0; h.ga = h.ga ?? -1;
}
// a new co-owned parent company: the founder's whole empire comes in at a share price of 1 M
export function init(city, h, p, X) {
  fields(city, h);
  if (p) h.members[p.id] = r4(h.treasury + Math.max(0, empire(city, p, X).value));
  h.yr = newYear(city, h, X);
}
// older co-owned parent companies become holdings with divisions: every owner's empire moves in at today's share price
export function migrate(city, X) {
  Object.values(city.holdings || {}).forEach((h) => {
    if (h.div || !h.parent || h.bot) return;
    const t = shares(h), n0 = nav(city, h, X), px = t > 0 && n0 > 0 ? n0 / t : 1;
    const ds = divs(city, h).filter((p) => !p.admin);
    fields(city, h);
    ds.forEach((p) => { const v = empire(city, p, X).value; if (v > 0) h.members[p.id] = r4((h.members[p.id] || 0) + v / px); });
    h.yr = newYear(city, h, X);
    ds.forEach((p) => X.mail(p, { kind: 'info', from: { n: h.name, r: 'Board', k: 'coop' }, subj: `${h.name} is now one holding`,
      body: [`Your whole empire is now your own division of ${h.name}, and you are its CEO. You run it from the Empire tab as before.`,
        `All divisions share one account and one set of books. Your stake is now ${Math.round(stake(h, p.id) * 100)}% of the whole holding (${r2(nav(city, h, X))} M), and your net worth follows it.`,
        `${Math.round(h.bidrag * 100)}% of each division's monthly profit goes to the central account. It pays CEO salaries, and the owners decide on dividends at the annual meeting.`,
        'The books close at New Year with an annual report. See Network › your holding.'].join('\n'), go: 'network' }));
  });
}
function newYear(city, h, X) {
  const v0 = {}; divs(city, h).forEach((p) => { v0[p.id] = empire(city, p, X).value; });
  return { m0: city.m, nav0: nav(city, h, X), sh0: { ...h.members }, v0, f: {} };
}
export function flow(h, pid, k, v) { if (!h.yr || !v) return; const f = (h.yr.f[pid] = h.yr.f[pid] || {}); f[k] = r4((f[k] || 0) + v); }

// ---------------------------------------------------------------- joining and leaving
// a new tycoon buys into a holding: the buy-in goes to the central account, the rest of their empire is their division
export function join(city, h, p, amt, X) {
  const px = price(city, h, X), v = Math.max(0, empire(city, p, X).value);
  p.cash -= amt; h.treasury += amt; h.members[p.id] = r4((h.members[p.id] || 0) + v / px);
  if (h.yr) { h.yr.v0[p.id] = empire(city, p, X).value; h.yr.sh0[p.id] = h.yr.sh0[p.id] || 0; flow(h, p.id, 'dep', amt); }
}
// a tycoon who already runs their own parent company brings their empire into a holding
export function merge(city, p, h, X) {
  if (!h.div) return { ok: false, msg: 'That holding does not take empires.' };
  if (divOf(city, p)) return { ok: false, msg: 'Your empire is already part of a holding.' };
  if (!h.open && !h.invites.some((i) => i.pid === p.id)) return { ok: false, msg: `${h.name} only takes invited owners.` };
  const v = empire(city, p, X).value; if (v <= 0) return { ok: false, msg: 'Your empire owes more than it owns. Pay down your loans first.' };
  const px = price(city, h, X); h.members[p.id] = r4((h.members[p.id] || 0) + v / px); h.invites = h.invites.filter((i) => i.pid !== p.id);
  p.co = { hid: h.id, m: city.m };
  if (h.yr) { h.yr.v0[p.id] = v; h.yr.sh0[p.id] = h.yr.sh0[p.id] || 0; }
  divs(city, h).filter((x) => x.id !== p.id).forEach((x) => X.feed(x, `${p.name} brought their empire into ${h.name}`, `Worth ${r2(v)} M. Their stake: ${Math.round(stake(h, p.id) * 100)}%.`, 'good'));
  return { ok: true, msg: `Your empire is now a division of ${h.name}. Your stake: ${Math.round(stake(h, p.id) * 100)}%.` };
}
// the owners voted to let one of them go with their division: the difference between stake and division is settled
function exit(city, h, pid, X) {
  const p = city.players[pid]; if (!p || h.members[pid] == null) return 'They are no longer an owner.';
  const il = (h.iloans || {})[pid] || 0; if (il) { p.cash -= il; h.treasury += il; delete h.iloans[pid]; }
  const ol = (h.oloans || {})[pid] || 0; if (ol) { delete h.oloans[pid]; h.owe[pid] = r2((h.owe[pid] || 0) + ol); }
  const mine = stake(h, pid) * nav(city, h, X), ev = empire(city, p, X).value, diff = r2(mine - ev);
  let text;
  if (diff > 0) { const due = r2(diff * (1 - H.exitFee)), now = r2(Math.max(0, Math.min(h.treasury, due))); h.treasury -= now; p.cash += now; if (due > now) h.owe[pid] = r2((h.owe[pid] || 0) + due - now); text = `${p.name} left with their division and ${due} M settlement${due > now ? ` (${r2(due - now)} M paid as the central account allows)` : ''}.`; }
  else { p.cash += diff; h.treasury -= diff; text = `${p.name} left with their division and paid ${r2(-diff)} M to the central account (it was worth more than their stake).`; }
  delete h.members[pid]; if (p.co && p.co.hid === h.id) p.co = null;
  if (h.ceo === pid) h.ceo = ceo(city, h);
  return text;
}
// the last owner leaves: the holding's companies and money become their own empire, the logo stays with them
export function dissolve(city, h, p, X) {
  X.ownedBy('h', h.id).forEach((l) => { l.owner = { k: 'p', id: p.id }; });
  Object.entries(h.owe || {}).forEach(([pid, v]) => { const x = city.players[pid]; if (x) { x.cash += v; p.cash -= v; } });
  p.cash += h.treasury;
  Object.entries(h.oloans || {}).forEach(([pid, v]) => { const x = city.players[pid]; if (x && x.life) { x.life.wallet += v; p.cash -= v; } });
  const b = h.brand || {}; p.co = { name: h.name, color: b.color, font: b.font, sym: b.sym, hid: null, m: city.m };
  delete city.holdings[h.id];
  return { ok: true, msg: `${h.name} is now your own parent company with all its companies.` };
}

// ---------------------------------------------------------------- money inside the holding
export function act(city, p, action, a, X) {
  const h = city.holdings[a.hid]; if (!h || h.members[p.id] == null) return { ok: false, msg: 'Not your holding.' };
  if (!h.div) return { ok: false, msg: 'Only holdings with divisions do that.' };
  const amt = r2(Number(a.amt) || 0), mine = divOf(city, p) === h, L = p.life;
  const need = (ok, msg) => (ok ? null : { ok: false, msg });
  if (amt <= 0 && action !== 'holdingGive') return { ok: false, msg: 'Enter an amount.' };
  switch (action) {
    case 'holdingTransfer': { // from your division to another division or the central account
      const e = need(mine, 'Only a CEO moves money from their division.') || need(p.cash >= amt, `Your division has ${r2(p.cash)} M.`); if (e) return e;
      if (a.to === 'h') { p.cash -= amt; h.treasury += amt; flow(h, p.id, 'tout', amt); return { ok: true, msg: `${amt} M moved to the central account.` }; }
      const t = city.players[a.to]; if (!t || divOf(city, t) !== h || t.id === p.id) return { ok: false, msg: 'Pick another division.' };
      p.cash -= amt; t.cash += amt; flow(h, p.id, 'tout', amt); flow(h, t.id, 'tin', amt);
      X.feed(t, `${p.name} sent your division ${amt} M`, `Inside ${h.name}.`, 'good'); return { ok: true, msg: `${amt} M sent to ${t.name}'s division.` };
    }
    case 'holdingBorrow': { // an internal loan from the central account, at the bank rate
      const e = need(mine, 'Only a CEO borrows for their division.') || need(h.treasury >= amt, `The central account has ${r2(h.treasury)} M.`); if (e) return e;
      h.treasury -= amt; p.cash += amt; h.iloans[p.id] = r2((h.iloans[p.id] || 0) + amt); flow(h, p.id, 'tin', amt);
      return { ok: true, msg: `Your division borrowed ${amt} M from the central account at ${X.rate()}%.` };
    }
    case 'holdingRepay': {
      const owed = h.iloans[p.id] || 0, v = Math.min(amt, owed); const e = need(owed > 0, 'Your division owes nothing.') || need(p.cash >= v, `Your division has ${r2(p.cash)} M.`); if (e) return e;
      p.cash -= v; h.treasury += v; h.iloans[p.id] = r2(owed - v); if (h.iloans[p.id] <= 0) delete h.iloans[p.id]; flow(h, p.id, 'tout', v);
      return { ok: true, msg: `Paid back ${r2(v)} M.` };
    }
    case 'holdingDeposit': { // private money in: new shares at today's price
      const e = need(L && L.wallet >= amt, `Your private account has ${r2(L ? L.wallet : 0)} M.`); if (e) return e;
      const px = price(city, h, X); L.wallet -= amt; tx(L, city.m, `Capital into ${h.name}`, -amt); h.treasury += amt; h.members[p.id] = r4(h.members[p.id] + amt / px); flow(h, p.id, 'dep', amt);
      return { ok: true, msg: `You put ${amt} M into ${h.name}. Your stake: ${Math.round(stake(h, p.id) * 100)}%.` };
    }
    case 'holdingCashOut': { // shares sold back to the holding: cheaper during the annual meeting
      const px = price(city, h, X), fee = meetingOpen(city, h) ? H.cashOutMeeting : H.cashOutMid, worth = h.members[p.id] * px;
      const e = need(amt <= worth * 0.999, `Your stake is worth ${r2(worth)} M.`) || need(h.treasury >= amt * (1 - fee), `The central account has ${r2(h.treasury)} M.`) || need(L, 'Open Life first.'); if (e) return e;
      const pay = r2(amt * (1 - fee)); h.members[p.id] = r4(h.members[p.id] - amt / px); h.treasury -= pay; L.wallet += pay; tx(L, city.m, `Shares sold back to ${h.name}`, pay); flow(h, p.id, 'out', pay);
      return { ok: true, msg: `You sold shares for ${amt} M and got ${pay} M after the ${Math.round(fee * 100)}% fee.` };
    }
    case 'holdingLend': { // an owner loan: private money in without new shares, paid interest at the bank rate
      const e = need(L && L.wallet >= amt, `Your private account has ${r2(L ? L.wallet : 0)} M.`); if (e) return e;
      L.wallet -= amt; tx(L, city.m, `Owner loan to ${h.name}`, -amt); h.treasury += amt; h.oloans[p.id] = r2((h.oloans[p.id] || 0) + amt);
      return { ok: true, msg: `You lent ${h.name} ${amt} M at ${X.rate()}%.` };
    }
    case 'holdingRecall': {
      const owed = h.oloans[p.id] || 0, v = Math.min(amt, owed); const e = need(owed > 0, 'The holding owes you nothing.') || need(h.treasury >= v, `The central account has ${r2(h.treasury)} M.`); if (e) return e;
      h.treasury -= v; h.oloans[p.id] = r2(owed - v); if (h.oloans[p.id] <= 0) delete h.oloans[p.id]; L.wallet += v; tx(L, city.m, `Owner loan back from ${h.name}`, v);
      return { ok: true, msg: `${r2(v)} M paid back to you.` };
    }
    case 'holdingGive': { // give part of your stake to another owner (percentage points of the whole)
      const t = city.players[a.to], pts = Number(a.pct) || 0; if (!t || h.members[t.id] == null || t.id === p.id) return { ok: false, msg: 'Pick another owner.' };
      const mv = shares(h) * pts / 100; if (pts <= 0 || mv > h.members[p.id] + 1e-9) return { ok: false, msg: `You hold ${Math.round(stake(h, p.id) * 100)}%.` };
      h.members[p.id] = r4(h.members[p.id] - mv); h.members[t.id] = r4(h.members[t.id] + mv);
      X.feed(t, `${p.name} gave you ${pts}% of ${h.name}`, `Your stake: ${Math.round(stake(h, t.id) * 100)}%.`, 'good');
      return { ok: true, msg: `You gave ${t.name} ${pts}%.` };
    }
  }
  return null;
}
function tx(L, m, text, amt) { if (!L || !amt) return; (L.tx = L.tx || []).unshift({ m, text, amt: r4(amt), bal: r4(L.wallet) }); if (L.tx.length > 40) L.tx.length = 40; }
export const meetingOpen = (city, h) => h.ga != null && h.ga >= city.m;

// ---------------------------------------------------------------- decisions
// how stakes would look after equalising: 'stake' = equal shares, 'nw' = equal net worth (stake + everything outside)
export function eqTargets(city, h, mode, X) {
  const ids = Object.keys(h.members), t = shares(h), n = nav(city, h, X);
  if (mode !== 'nw' || n <= 0) return Object.fromEntries(ids.map((id) => [id, r4(t / ids.length)]));
  const out = Object.fromEntries(ids.map((id) => [id, X.netWorth(id) - stake(h, id) * n]));
  const T = (n + sum(Object.values(out))) / ids.length;
  let s = ids.map((id) => Math.max(0, (T - out[id]) / n)); const tot = sum(s) || 1; s = s.map((x) => x / tot);
  return Object.fromEntries(ids.map((id, i) => [id, r4(s[i] * t)]));
}
// check a proposal of one of the holding's own kinds; returns the extra fields it carries
export function check(city, h, p, a, X) {
  const no = (msg) => ({ ok: false, msg });
  if (!h.div) return no('Only holdings with divisions vote on that.');
  switch (a.kind) {
    case 'dividend': { const v = r2(Number(a.amt) || 0); if (v <= 0) return no('Enter an amount.'); if (v > h.treasury) return no(`The central account has ${r2(h.treasury)} M.`); return { ok: true, pr: { amt: v } }; }
    case 'salary': {
      const t = city.players[a.pid]; if (!t || divOf(city, t) !== h) return no('Pick a CEO.');
      const v = Number(a.amt), b = Math.max(0, Math.min(H.bonusMax, Number(a.bonus) || 0)); if (!SALARIES.includes(v)) return no('Pick one of the salary levels.');
      return { ok: true, pr: { pid: t.id, amt: v, bonus: r2(b), unan: overCap(city, h, t.id, v, X) } };
    }
    case 'bidrag': { const v = Number(a.pct); if (!(v >= 0 && v <= H.bidragMax)) return no(`Between 0 and ${H.bidragMax * 100}%.`); return { ok: true, pr: { pct: r2(v) } }; }
    case 'ceo': { const t = city.players[a.pid]; if (!t || h.members[t.id] == null || t.bot) return no('Pick an owner.'); return { ok: true, pr: { pid: t.id } }; }
    case 'autoEq': return { ok: true, pr: { on: !!a.on, unan: true } };
    case 'equalize': { const mode = a.mode === 'nw' ? 'nw' : 'stake'; return { ok: true, pr: { mode, unan: true } }; }
    case 'exit': { if (Object.keys(h.members).length < 2) return no('You are the only owner.'); return { ok: true, pr: { pid: p.id } }; }
    case 'divBuy': { const l = X.listing(a.lid); if (!l || l.owner) return no('That company is not for sale.'); if (divOf(city, p) !== h) return no('Only a CEO buys for their division.'); return { ok: true, pr: { lid: l.id, pid: p.id } }; }
    case 'divSell': { const l = X.listing(a.lid); if (!l || !l.owner || l.owner.k !== 'p' || l.owner.id !== p.id) return no('Not your company.'); return { ok: true, pr: { lid: l.id, pid: p.id } }; }
  }
  return no('Unknown proposal.');
}
export function overCap(city, h, pid, v, X) {
  if (v > H.salaryNav * nav(city, h, X)) return true;
  const last = (h.reports || [])[0], all = sum(divs(city, h).map((p) => (p.id === pid ? v : (p.life ? p.life.salary : 0))));
  return !!(last && last.total && last.total.profit > 0 && all > H.salaryProfit * last.total.profit);
}
export const unanimous = (pr) => UNANIMOUS.includes(pr.kind) || !!pr.unan;
// run a passed proposal of the holding's own kinds; returns the text for the owners
export function exec(city, h, pr, X) {
  switch (pr.kind) {
    case 'dividend': {
      const v = Math.min(pr.amt, Math.max(0, h.treasury)), t = shares(h); if (v <= 0) return 'The central account was empty.';
      h.treasury -= v; Object.entries(h.members).forEach(([pid, sh]) => { const p = city.players[pid]; if (!p) return; const x = v * sh / t;
        if (p.life && !p.bot) { p.life.wallet += x; tx(p.life, city.m, `Dividend from ${h.name}`, x); } else p.cash += x; flow(h, pid, 'div', x); });
      return `${r2(v)} M paid out to the owners by stake, into their private accounts.`;
    }
    case 'salary': { const p = city.players[pr.pid]; if (!p || !p.life) return 'They are no longer a CEO.'; p.life.salary = pr.amt; (h.bonus = h.bonus || {})[p.id] = pr.bonus || 0; return `${p.name}'s CEO salary is now ${pr.amt} M a year${pr.bonus ? ` plus a ${Math.round(pr.bonus * 100)}% bonus on their division's profit` : ''}.`; }
    case 'bidrag': h.bidrag = pr.pct; return `Each division now pays ${Math.round(pr.pct * 100)}% of its monthly profit to the central account.`;
    case 'ceo': h.ceo = pr.pid; return `${city.players[pr.pid].name} now runs the joint division.`;
    case 'autoEq': h.autoEq = pr.on; return pr.on ? 'Stakes are equalised at every annual meeting from now on.' : 'Stakes are no longer equalised every year.';
    case 'equalize': { const tg = eqTargets(city, h, pr.mode, X); Object.assign(h.members, tg); return pr.mode === 'nw' ? 'Stakes moved so every owner has the same net worth.' : 'Every owner now holds the same stake.'; }
    case 'exit': return exit(city, h, pr.pid, X);
    case 'divBuy': { const l = X.listing(pr.lid), p = city.players[pr.pid]; const px = l ? X.listingPrice(l) : 0; if (!l || l.owner || !p || p.cash < px) return 'Could not complete: the company is gone or the division is short.'; p.cash -= px; X.assignOwner(l, { k: 'p', id: p.id }); return `${p.name}'s division bought ${l.title || TYPES[l.type].name} for ${px} M.`; }
    case 'divSell': { const l = X.listing(pr.lid), p = city.players[pr.pid]; if (!l || !l.owner || l.owner.k !== 'p' || l.owner.id !== pr.pid) return 'The company is no longer theirs.'; const v = r2(X.listingValue(l) * 0.8); p.cash += v; X.release(l); return `Sold ${l.title || TYPES[l.type].name} for ${v} M.`; }
  }
  return null;
}
export function label(city, pr, X) {
  const n = (id) => (city.players[id] || {}).name || 'an owner', l = pr.lid ? X.listing(pr.lid) : null, ln = l ? `${l.title || TYPES[l.type].name} in ${l.district}` : 'a company';
  switch (pr.kind) {
    case 'dividend': return `Pay a dividend of ${pr.amt} M`;
    case 'salary': return `CEO salary for ${n(pr.pid)}: ${pr.amt} M a year${pr.bonus ? ` + ${Math.round(pr.bonus * 100)}% bonus` : ''}${pr.unan ? ' (above the limit: needs every owner)' : ''}`;
    case 'bidrag': return `Divisions pay ${Math.round(pr.pct * 100)}% of their profit to the central account`;
    case 'ceo': return `${n(pr.pid)} runs the joint division`;
    case 'autoEq': return pr.on ? 'Equalise stakes at every annual meeting' : 'Stop equalising stakes every year';
    case 'equalize': return pr.mode === 'nw' ? 'Equalise net worth between the owners (moves stakes)' : 'Give every owner the same stake';
    case 'exit': return `${n(pr.pid)} leaves with their division`;
    case 'divBuy': return `${n(pr.pid)}'s division buys ${ln}${l ? ` (${X.listingPrice(l)} M)` : ''}`;
    case 'divSell': return `${n(pr.pid)}'s division sells ${ln}${l && l.owner ? ` (${r2(X.listingValue(l) * 0.8)} M)` : ''}`;
  }
  return pr.kind;
}
// a CEO buying or selling alone stays within the mandate; above it the owners vote
export function mandate(city, p, kind, v, X) {
  const h = divOf(city, p); if (!h || divs(city, h).length < 2) return null;
  const cap = (kind === 'buy' ? H.buyPct : H.sellPct) * nav(city, h, X);
  return v > cap ? { ok: false, vote: true, msg: `That is more than ${Math.round((kind === 'buy' ? H.buyPct : H.sellPct) * 100)}% of ${h.name}'s value (${r2(cap)} M). Propose it to your co-owners.` } : null;
}

// ---------------------------------------------------------------- every month
export function monthly(city, m, X) {
  Object.values(city.holdings || {}).forEach((h) => {
    if (!h.div) return;
    const rate = X.rate() / 100 / 12;
    divs(city, h).forEach((p) => {
      const est = X.annualEstimate(p.id) / 12;
      if (est > 0 && h.bidrag > 0) { const v = r2(Math.min(est * h.bidrag, Math.max(0, p.cash))); if (v > 0) { p.cash -= v; h.treasury += v; flow(h, p.id, 'bid', v); } }
      const il = (h.iloans || {})[p.id] || 0; if (il > 0) { const v = r4(il * rate); p.cash -= v; h.treasury += v; flow(h, p.id, 'int', v); }
      if (p.life && p.life.salary) flow(h, p.id, 'sal', p.life.salary / 12);
    });
    Object.entries(h.oloans || {}).forEach(([pid, v]) => { const p = city.players[pid]; if (!p || !p.life) return; const i = r4(v * rate); h.treasury -= i; p.life.wallet += i; tx(p.life, m, `Interest on your loan to ${h.name}`, i); });
    Object.entries(h.owe || {}).forEach(([pid, v]) => { const p = city.players[pid], pay = r2(Math.min(v, Math.max(0, h.treasury))); if (!p) { delete h.owe[pid]; return; } if (pay > 0) { h.treasury -= pay; p.cash += pay; h.owe[pid] = r2(v - pay); if (h.owe[pid] <= 0) delete h.owe[pid]; } });
    // annual meeting: an owner who has not voted when it closes goes with the board's proposal
    h.proposals.filter((pr) => pr.status === 'open' && pr.ga && pr.dueM <= m).forEach((pr) => divs(city, h).forEach((p) => { if (!(p.id in pr.votes)) pr.votes[p.id] = true; }));
  });
}

// ---------------------------------------------------------------- the books
// one company's months in (m0, m1], the way its Accounts box counts them
function acct(ls, m0, m1) {
  const t = { b2c: 0, goods: 0, ypi: 0, sup: 0, fr: 0, sal: 0, bud: 0, heads: 0, maint: 0 };
  ls.forEach((l) => ((l.ops && l.ops.hist) || []).forEach((x) => { if (x.m <= m0 || x.m > m1) return;
    t.b2c += x.b2c || 0; t.goods += x.goods || 0; t.ypi += x.ypi || 0; t.sup += x.sup || 0; t.fr += x.fr || 0; t.sal += x.sal ?? x.run ?? 0; t.bud += x.sal == null ? 0 : (x.bud || 0); t.heads += x.heads || 0; t.maint += x.maint || 0; }));
  Object.keys(t).forEach((k) => { t[k] = r2(t[k]); });
  t.rev = r2(t.b2c + t.goods + t.ypi); t.cost = r2(t.sup + t.fr + t.sal + t.bud + t.heads + t.maint); t.profit = r2(t.rev - t.cost); return t;
}
const addAcct = (xs) => { const t = {}; xs.forEach((x) => Object.keys(x).forEach((k) => { t[k] = r2((t[k] || 0) + x[k]); })); return t; };
function best(ls, m0, m1) { let b = null; ls.forEach((l) => { const a = acct([l], m0, m1); if (!b || a.profit > b.profit) b = { lid: l.id, name: `${l.title || TYPES[l.type].name} in ${l.district}`, profit: a.profit }; }); return b; }
function divisionPart(city, h, p, m0, m1, X, yr) {
  const ls = X.ownedBy('p', p.id), a = acct(ls, m0, m1), e = empire(city, p, X), f = (yr && yr.f[p.id]) || {};
  return { pid: p.id, name: p.name, n: ls.length, acct: a, value0: r2((yr && yr.v0[p.id]) ?? e.value), value: e.value, cash: e.cash, debt: r2(e.debt + e.iloan),
    bid: r2(f.bid || 0), sal: r2(f.sal || 0), tin: r2(f.tin || 0), tout: r2(f.tout || 0), best: best(ls, m0, m1) };
}
function auditor(rep) {
  const notes = [];
  if (rep.balance.debtRatio > 0.5) notes.push('Debt is more than half of the assets. The auditor recommends paying down loans.');
  if (rep.total.profit < 0) notes.push('The year ended with a loss.');
  if (rep.flows && rep.total.profit > 0 && rep.flows.sal > rep.total.profit * H.salaryProfit) notes.push('Salaries took more than half of the profit.');
  if (rep.balance.central < 0) notes.push('The central account is overdrawn.');
  return notes.length ? notes.join(' ') : 'The accounts give a true and fair view of the year.';
}
// the annual report (also used for "year to date" in the browser): kind 'h' = a holding, 'p' = a solo tycoon
export function report(city, kind, id, m, X) {
  if (kind === 'h') {
    const h = city.holdings[id]; if (!h) return null; const yr = h.yr || { m0: m - 12, v0: {}, sh0: { ...h.members }, f: {}, nav0: nav(city, h, X) }, m0 = yr.m0;
    const ds = divs(city, h).map((p) => divisionPart(city, h, p, m0, m, X, yr)), own = X.ownedBy('h', h.id), joint = acct(own, m0, m);
    const total = addAcct([joint, ...ds.map((d) => d.acct)]), n1 = nav(city, h, X), t = shares(h), t0 = sum(Object.values(yr.sh0)) || t;
    const comps = r2(sum(own.map((l) => X.listingValue(l))) + sum(ds.map((d) => empire(city, city.players[d.pid], X).comps)));
    const ex = ds.map((d) => empire(city, city.players[d.pid], X)), debt = r2(sum(ex.map((e) => e.debt)) + sum(Object.values(h.oloans || {})) + sum(Object.values(h.owe || {})));
    const assets = r2(n1 + debt);
    const ff = Object.values(yr.f), fl = (k) => r2(sum(ff.map((f) => f[k] || 0)));
    const rep = { kind, id, name: h.name, y: Math.max(1, Math.floor((m - 1) / 12) + 1), m0, m, nav0: r2(yr.nav0), nav: n1, total, joint: { n: own.length, acct: joint, ceo: ceo(city, h) }, divs: ds,
      balance: { comps, cash: r2(sum(ex.map((e) => e.cash))), central: r2(h.treasury), stocks: r2(sum(ex.map((e) => e.stocks))), wh: r2(sum(ex.map((e) => e.wh))), debt, debtRatio: assets > 0 ? r2(debt / assets) : 0, nav: n1 },
      owners: Object.keys(h.members).map((pid) => ({ pid, name: (city.players[pid] || {}).name || '?', s0: r4((yr.sh0[pid] || 0) / t0), s1: r4(h.members[pid] / t), value: r2(h.members[pid] / t * n1) })),
      flows: { bid: fl('bid'), sal: fl('sal'), dep: fl('dep'), div: fl('div'), out: fl('out'), int: fl('int') }, bidrag: h.bidrag };
    rep.kpi = { growth: rep.nav0 > 0 ? r2((n1 - rep.nav0) / rep.nav0 * 100) : 0, margin: total.rev > 0 ? r2(total.profit / total.rev * 100) : 0 };
    rep.auditor = auditor(rep); return rep;
  }
  const p = city.players[id]; if (!p) return null; const yr = p.yr || { m0: Math.max(0, m - 12), v0: null }, ls = X.ownedBy('p', p.id), a = acct(ls, yr.m0, m), e = empire(city, p, X);
  const rep = { kind, id, name: (p.co && p.co.name) || p.name, y: Math.max(1, Math.floor((m - 1) / 12) + 1), m0: yr.m0, m, total: a, divs: [{ pid: p.id, name: p.name, n: ls.length, acct: a, value0: r2(yr.v0 ?? e.value), value: e.value, cash: e.cash, debt: e.debt, best: best(ls, yr.m0, m) }],
    balance: { comps: e.comps, cash: e.cash, central: 0, stocks: e.stocks, wh: e.wh, debt: e.debt, debtRatio: e.value + e.debt > 0 ? r2(e.debt / (e.value + e.debt)) : 0, nav: e.value }, nav0: r2(yr.v0 ?? e.value), nav: e.value, sal: p.life ? p.life.salary : 0 };
  rep.kpi = { growth: rep.nav0 > 0 ? r2((e.value - rep.nav0) / rep.nav0 * 100) : 0, margin: a.rev > 0 ? r2(a.profit / a.rev * 100) : 0 };
  rep.auditor = auditor(rep); return rep;
}
// New Year: close the books, write the reports, pay bonuses, open the annual meeting
export function yearEnd(city, m, X) {
  Object.values(city.holdings || {}).forEach((h) => {
    if (!h.div) return;
    const rep = report(city, 'h', h.id, m, X); if (!rep) return;
    // CEO bonuses on the division's profit for the year
    rep.divs.forEach((d) => { const b = (h.bonus || {})[d.pid] || 0, p = city.players[d.pid]; if (!b || !p || !p.life || d.acct.profit <= 0) return; const v = r2(Math.min(Math.max(0, h.treasury), d.acct.profit * b)); if (v > 0) { h.treasury -= v; p.life.wallet += v; tx(p.life, m, `CEO bonus from ${h.name}`, v); d.bonus = v; } });
    h.reports.unshift(rep); if (h.reports.length > H.reports) h.reports.length = H.reports;
    h.ga = m + H.meetingMonths;
    const by = ceo(city, h), sug = r2(Math.floor(Math.max(0, h.treasury) * 0.5 * 10) / 10);
    if (sug >= 0.5 && city.players[by]) h.proposals.push({ id: X.uid('p'), by, kind: 'dividend', amt: sug, ga: true, votes: {}, m, dueM: m + H.meetingMonths, status: 'open' });
    if (h.autoEq && Object.keys(h.members).length > 1) Object.assign(h.members, eqTargets(city, h, 'stake', X));
    h.yr = newYear(city, h, X);
    divs(city, h).forEach((p) => X.mail(p, { kind: 'info', from: { n: h.name, r: 'Annual report', k: 'coop' }, subj: `${h.name}: annual report for year ${rep.y}`,
      body: [`The books for year ${rep.y} are closed. Revenue ${rep.total.rev} M, profit ${rep.total.profit} M. The holding is worth ${rep.nav} M (${rep.kpi.growth >= 0 ? '+' : ''}${rep.kpi.growth}%).`,
        `Your stake: ${Math.round(stake(h, p.id) * 100)}%, worth ${r2(stake(h, p.id) * rep.nav)} M.`,
        `The annual meeting is open for one game month: dividend, salaries and the rest are voted on in Network › ${h.name}. Selling shares back costs ${Math.round(H.cashOutMeeting * 100)}% now instead of ${Math.round(H.cashOutMid * 100)}%.`,
        `Auditor: ${rep.auditor}`].join('\n'), go: `report:h:${h.id}` }));
  });
  Object.values(city.players).forEach((p) => {
    if (p.bot || p.admin || divOf(city, p) || !p.co) return;
    const rep = report(city, 'p', p.id, m, X); if (!rep) return;
    p.reports = p.reports || []; p.reports.unshift(rep); if (p.reports.length > H.soloReports) p.reports.length = H.soloReports;
    p.yr = { m0: m, v0: rep.nav };
    X.mail(p, { kind: 'info', from: { n: rep.name, r: 'Annual report', k: 'coop' }, subj: `Annual report for year ${rep.y}`,
      body: [`The books for year ${rep.y} are closed. Revenue ${rep.total.rev} M, profit ${rep.total.profit} M.`, `Your empire is worth ${rep.nav} M (${rep.kpi.growth >= 0 ? '+' : ''}${rep.kpi.growth}%).`, `Auditor: ${rep.auditor}`].join('\n'), go: `report:p:${p.id}` });
  });
}
