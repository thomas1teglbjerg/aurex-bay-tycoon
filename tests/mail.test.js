// Mail: staff write about happenings and ask for an answer, specialists write when they are unhappy,
// decisions arrive as mail, the autopilot answers what is left, and the Gazette sends a monthly briefing with an ad
import './open-doors.js';
import * as E from '../supabase/functions/_shared/engine.js';
import { HAPPENINGS, MAIL_HAP, DECISIONS, MAIL_PACE } from '../supabase/functions/_shared/content.js';
const T = E.TAL, ML = E.MAIL;
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 }); E.addPlayer(city, 'u', 'Thomas', now); const p = city.players.u; p.cash = 500;
const A = (a, x) => E.apply(city, 'u', a, x, now);
const l = city.listings.find((x) => !x.owner && E.listingPrice(x) < 60); assert(A('buy', { lid: l.id }).ok, 'buy a company');
const hap = (id) => E._happening(city, l, HAPPENINGS.find((h) => h.id === id));

// an angry post: a mail from Marketing with three answers
hap('complaint');
let x = p.mail[0];
assert(x.subj === 'An angry post about us went viral' && x.opts.length === 3 && x.lid === l.id, 'the angry post arrives as a mail with answers');
assert(/Marketing/.test(x.from.r) && x.from.n.split(' ').length === 2, `it comes from someone in Marketing (${x.from.n}, ${x.from.r})`);
assert(ML.staffer(l, 'social') === x.from.n, 'the same person writes from that department every time');
const rep0 = l.ops.rep, cash0 = p.cash;
const r = A('mailAnswer', { id: x.id, opt: 0 });
assert(r.ok && x.done && x.done.ix === 0 && !x.done.auto, 'answering closes the mail: ' + r.msg);
assert(l.ops.rep === Math.max(0, rep0 - 1) && p.cash < cash0, 'the apology costs a little money and a little reputation');
assert(!A('mailAnswer', { id: x.id, opt: 1 }).ok, 'a mail is answered once');

// the autopilot answers after two weeks, the safe answer for a cautious tycoon
A('policy', { policy: 'cautious' });
hap('breakdown'); x = p.mail[0]; const safe = x.opts.findIndex((o) => o.safe);
assert(ML.isOpen(x) && x.due > city.g, 'a broken machine waits for an answer');
for (let i = 0; i < 3; i++) { now += E.realMsPerMonth(city) / 4; E.advance(city, now); }
assert(x.done && x.done.auto && x.done.ix === safe, 'the autopilot answered it with the safe option');

// a department that is staffed handles a bad happening itself: an informational mail, no answers
l.ops.depts.social = l.ops.depts.social || { w: 0, set: {} }; l.ops.depts.social.head = 'sofia'; l.ops.depts.social.who = 'sofia';
hap('complaint'); x = p.mail[0];
assert(!x.opts && x.kind === 'good' && /turned it around/.test(x.body) && x.from.tid === 'sofia', 'the head of Marketing reports it was handled');
delete l.ops.depts.social.head;

// good news without a choice still changes the company
const c0 = l.ops.customers; hap('press'); x = p.mail[0];
assert(!x.opts && x.fxt && l.ops.customers > c0, 'press coverage brings customers: ' + x.fxt);

// decisions arrive as mail and are answered there
city.agenda = [{ at: city.g, k: 'decision', pid: 'u' }]; E.advance(city, now + 1);
x = p.mail.find((y) => y.dec);
assert(x && p.inbox.some((d) => d.id === x.dec) && x.opts.length === 2, 'a decision arrives as a mail');
assert(A('mailAnswer', { id: x.id, opt: 0 }).ok && !p.inbox.some((d) => d.id === x.dec) && x.done, 'answering the mail settles the decision');

// specialists write when they are unhappy
const tid = Object.keys(city.talent).find((id) => !city.talent[id].owner && T.PERSON[id].kind === 'sofia') || Object.keys(city.talent).find((id) => !city.talent[id].owner);
assert(A('hire', { tid, salary: T.ask(city, tid), years: 2 }).ok, 'sign a specialist');
const s = city.talent[tid]; s.salary = T.ask(city, tid) * 0.3; s.sat = 5;
let notice = null;
for (let i = 0; i < 6 && !notice; i++) { now += E.realMsPerMonth(city); E.advance(city, now); A('ping', {}); notice = p.mail.find((y) => y.from.tid === tid && y.subj === 'My notice'); }
assert(notice && notice.opts.length === 3, `${T.PERSON[tid].name} hands in their notice by mail with three answers`);
const sat0 = s.sat; assert(A('mailAnswer', { id: notice.id, opt: 0 }).ok && s.sat > sat0, 'paying the bonus from the mail makes them happier');

// the Gazette's monthly briefing carries last month's headlines and an ad from a live campaign
city.ads = [{ id: 'adx', lid: l.id, by: 'u', kind: 'co', tone: 'wink', head: 'Hello', line: 'World', weeks: 4, from: city.g, until: city.g + 1, cost: 0, views: 0 }];
['Harbor Row gets a new pier', 'Rival buys a hotel', 'Gold jumps 5% this week'].forEach((t, i) => city.news.unshift({ m: city.m, title: t, text: 'x', kind: 'info', ...(i === 2 ? { stock: 'gold' } : {}) }));
const n0 = p.mail.filter((y) => y.kind === 'news').length;
for (let i = 0; i < 4; i++) { now += E.realMsPerMonth(city) / 4; E.advance(city, now); }
const nl = p.mail.find((y) => y.kind === 'news');
assert(p.mail.filter((y) => y.kind === 'news').length > n0 && nl.news.length > 0 && nl.news.length <= 5, `a newsletter with ${nl.news.length} headlines: ${nl.news.map((n) => n.t).join(' / ')}`);
assert(nl.ad && nl.ad.head === 'Hello', 'the newsletter carries an advertisement');

// the mailbox stays small
for (let i = 0; i < 80; i++) hap('press');
assert(p.mail.length <= ML.MAX, `the mailbox keeps at most ${ML.MAX} mails`);
const json = JSON.stringify(p.mail); assert(json.length < 40000, `mail stays light in the save (${Math.round(json.length / 1024)} KB)`);

// admins write one mail to every human tycoon (a changelog); bots and the administrator get none
E.addPlayer(city, 'v', 'Mikkel', now);
const bot = Object.values(city.players).find((q) => q.bot), botN = bot ? (bot.mail || []).length : 0;
assert(!E.mailAll(city, { subj: '', body: 'x' }).ok, 'a changelog needs a subject');
const ma = E.mailAll(city, { subj: "What's new in Aurex Bay", body: 'Line one.\n\n  Line two.  \n' });
assert(ma.ok && ma.n === 2, 'the changelog goes to both humans: ' + ma.msg);
x = city.players.v.mail[0];
assert(x.subj === "What's new in Aurex Bay" && x.body === 'Line one.\nLine two.' && x.from.k === 'city' && !x.opts, 'it is a plain city mail, blank lines dropped');
assert(p.mail[0].subj === x.subj && p.mail[0].id !== x.id, 'each player gets their own copy');
assert(!bot || (bot.mail || []).length === botN, 'bots get no changelog');
assert(!x.hAd, 'no house ad unless asked');
E.mailAll(city, { subj: 'With ad', body: 'Hello.', house: true });
x = city.players.v.mail[0];
assert(x.hAd && x.hAd.head === E.GZ.houseAd(city).head && x.hAd.img, 'the house ad rides at the bottom of the changelog');
// the same happening can be written in several ways, and every happening has a mail
assert(HAPPENINGS.every((h) => MAIL_HAP[h.id]), 'every happening has its mail text');
E._happening(city, l, HAPPENINGS.find((h) => h.id === 'complaint'), 1); x = p.mail[0];
assert(x.subj === MAIL_HAP.complaint.alt[0].subj && x.opts.length === 3, 'a happening can arrive in another wording with the same answers');
assert(HAPPENINGS.length >= 20 && DECISIONS.length >= 20, `plenty of happenings (${HAPPENINGS.length}) and decisions (${DECISIONS.length})`);

// pace: a tycoon gets at most one company mail every week and a half, a company does not repeat itself, decisions are spaced too
{ let t = 1_700_000_000_000; const c = E.createCity(t, { speed: 2016 }); E.addPlayer(c, 'w', 'Pace', t); const q = c.players.w; q.cash = 500;
  c.listings.filter((y) => !y.owner && !y.site).slice(0, 6).forEach((y) => E.apply(c, 'w', 'buy', { lid: y.id }, t));
  const wk = E.realMsPerMonth(c) / 4, got = [], seen = new Set();
  for (let i = 0; i < 96; i++) { t += wk; E.advance(c, t); E.apply(c, 'w', 'ping', {}, t);
    (q.mail || []).forEach((y) => { if (seen.has(y.id)) return; seen.add(y.id); if ((y.lid && HAPPENINGS.some((h) => { const mh = MAIL_HAP[h.id]; return [mh, ...(mh.alt || [])].some((a) => a.subj === y.subj); })) || y.dec) got.push(y); }); }
  const gs = got.map((y) => y.g).sort((a, b) => a - b), close = gs.filter((g, i) => i && g - gs[i - 1] < MAIL_PACE.gap - 1e-6).length;
  assert(close === 0, `company mails and decisions are spaced (${got.length} in two years with six companies)`);
  assert(got.length < 70, 'far fewer than one a week per company');
  assert(new Set(got.map((y) => y.subj)).size >= Math.min(got.length, 15), `they vary (${new Set(got.map((y) => y.subj)).size} different subjects)`); }
console.log('ALL OK');
