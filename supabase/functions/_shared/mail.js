// Mail (Empire › Mail): staff, specialists, rivals and the Gazette write to a tycoon. Many mails ask for an answer;
// a mail that waits too long is answered by the autopilot (cautious picks the safe answer, bold the other one).
// Mails live on the player (p.mail, newest first). Read/unread is kept in the browser, not in the city.
import { TYPES, MAIL_NAMES, GAZETTE } from './content.js';

export const MAX = 40;            // mails kept per player (open ones are kept first)
export const WAIT = 2 / 48;       // two game weeks before the autopilot answers a staff mail
const uid = () => 'ml' + Math.random().toString(36).slice(2, 9);
const r2 = (v) => Math.round(v * 100) / 100;
const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

export const box = (p) => (p.mail = p.mail || []);
export const isOpen = (x) => !!(x.opts && x.opts.length && !x.done);
export const waiting = (p) => (p.mail || []).filter(isOpen);
export const find = (p, id) => (p.mail || []).find((x) => x.id === id);

export function send(p, mail) {
  if (!p || p.bot || p.coop) return null;
  const x = { id: uid(), ...mail }; box(p).unshift(x); prune(p); return x;
}
function prune(p) {
  const b = p.mail; if (b.length <= MAX) return;
  for (let i = b.length - 1; i >= 0 && b.length > MAX; i--) if (!isOpen(b[i])) b.splice(i, 1);
  if (b.length > MAX) b.length = MAX;
}

// someone in a company's department: the same name every time for that company and department
export function staffer(l, dept) {
  const h = hash(`${l.id}:${dept}`), F = MAIL_NAMES.first, L = MAIL_NAMES.last;
  return `${F[h % F.length]} ${L[Math.floor(h / F.length) % L.length]}`;
}
export const coName = (l) => `${l.title || TYPES[l.type].name} in ${l.district}`;

// the answer the autopilot gives
export function autoPick(mail, policy, rnd = Math.random) {
  const safe = Math.max(0, mail.opts.findIndex((o) => o.safe));
  if (policy === 'cautious') return safe;
  if (policy === 'bold') { const i = mail.opts.findIndex((o, k) => k !== safe); return i < 0 ? safe : i; }
  return Math.floor(rnd() * mail.opts.length);
}

// effects in words: "−20 k, reputation +3, customers +5%"
export function fxText(fx) {
  if (!fx) return '';
  const b = [];
  if (fx.cash) b.push(`${fx.cash > 0 ? '+' : '−'}${r2(Math.abs(fx.cash))} M`);
  if (fx.rep) b.push(`reputation ${fx.rep > 0 ? '+' : '−'}${Math.abs(fx.rep)}`);
  if (fx.cust) b.push(`customers ${fx.cust > 0 ? '+' : '−'}${Math.round(Math.abs(fx.cust) * 100)}%`);
  if (fx.morale) b.push(`morale ${fx.morale > 0 ? '+' : '−'}${Math.abs(fx.morale)}`);
  if (fx.rp) b.push(`+${fx.rp} research points`);
  if (fx.stock) b.push(`lose ${Math.round(fx.stock * 100)}% of one supply`);
  return b.join(', ') || 'Nothing else changes';
}
// money in a happening is per size unit: scale it to this company once, when the mail is written
export function scaleFx(fx, s) {
  if (!fx) return fx; const o = { ...fx };
  if (o.cash) o.cash = r2(o.cash * s);
  if (o.gamble) o.gamble = [o.gamble[0], scaleFx(o.gamble[1], s), scaleFx(o.gamble[2], s)];
  return o;
}

// the Gazette's monthly briefing: last month's headlines and one advertisement from a live campaign
export function newsletter(city, m, liveAds) {
  const last = (city.news || []).filter((n) => n.m === m - 1);
  if (!last.length) return null;
  // the world card leads, then what tycoons did, then at most two market moves
  const world = last.filter((n) => n.world), deals = last.filter((n) => !n.world && !n.stock), market = last.filter((n) => n.stock).slice(0, 2);
  const items = [...world, ...deals.slice(0, GAZETTE.items - world.length - Math.min(1, market.length)), ...market].slice(0, GAZETTE.items).map((n) => ({ t: n.title, x: n.text, k: n.kind }));
  if (items.length < 2) return null;
  const ads = (liveAds || []).slice().sort((a, b) => (a.bot ? 1 : 0) - (b.bot ? 1 : 0));
  const ad = ads.length ? ads[m % ads.length] : null;
  return { items, ad: ad ? { id: ad.id, lid: ad.lid, kind: ad.kind, cid: ad.cid, tone: ad.tone, head: ad.head, line: ad.line } : null };
}
