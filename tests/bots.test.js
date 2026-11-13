// Rival tycoons with a personality: relation, memory, rivalry, price wars, Gazette stories, consent bids, deals, crisis, dream bids, alliances, chat
import './open-doors.js';
import './standing.js';
import * as E from '../supabase/functions/_shared/engine.js';
import { BOT_PERS, BOT_REL as R, GOODS, LISTINGS } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
const B = E.BOT;
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
E.addPlayer(city, 'u', 'Thomas Player', now);
const p = city.players.u; p.cash = 500; p.joinedM = -12; // not a newcomer
const ids = Object.keys(BOT_PERS);
assert(ids.every((id) => city.players[id] && city.players[id].bot), 'every bot has a personality');
assert(ids.every((id) => LISTINGS.some((l) => l.id === BOT_PERS[id].dream)), 'every dream company exists');
const month = (n = 1) => { now += E.realMsPerMonth(city) * n; E.advance(city, now); };
const act = (a, x) => E.apply(city, 'u', a, x, now);
const ev = (bid, pid, kind, x = {}) => B.event(city, bid, pid, kind, x, E.botCtx(city));

// relation and memory
const V = 'bot-victor', vic = city.players[V];
assert(B.relV(city, V, 'u') === 0 && B.level(0).name === 'Neutral', 'everyone starts neutral');
ev(V, 'u', 'poach', { x: 'Robert Hayes' });
assert(B.relV(city, V, 'u') === -30, `Victor hates poaching (×1.5 grudge ×2 hates): ${B.relV(city, V, 'u')}`);
assert(B.rel(city, V, 'u').mem[0].t === 'Took Robert Hayes from my team', 'he remembers it');
ev(V, 'u', 'snub'); ev(V, 'u', 'deal', { t: 'Sold me steel' }); ev(V, 'u', 'beat', { x: 'a mill' });
assert(B.rel(city, V, 'u').mem.length === 3 && B.rel(city, V, 'u').mem[0].w === -30, 'keeps the three biggest things');
const L = 'bot-lars'; ev(L, 'u', 'welcome');
assert(B.relV(city, L, 'u') === 10, `Lars is warm and likes a handshake: ${B.relV(city, L, 'u')}`);
assert(B.level(-80).name === 'Enemy' && B.level(50).name === 'Friend' && B.level(80).name === 'Ally', 'relation words');

// rivalry: three wins make a rival (with a mail), a rival beaten pays Influence, six more wins bring a peace offer
const H = 'bot-hana', hana = city.players[H];
['Vase', 'Clock', 'Painting'].forEach((x) => ev(H, 'u', 'outbid', { x }));
const r = B.rel(city, H, 'u');
assert(r.rival && r.v <= -40 && B.isRival(city, H, 'u'), `after three wins Hana names you her rival (${r.v})`);
assert(p.mail.some((x) => x.from.pid === H && x.subj === 'We are rivals now'), 'she writes to say so');
assert(city.news.some((n) => n.title === 'Hana Kim names Thomas Player a rival'), 'the Gazette reports the rivalry');
const inf0 = p.inf; ev(H, 'u', 'outbid', { x: 'Ring' }); assert(p.inf === inf0 + 1, 'beating a rival is worth Influence');
for (let i = 0; i < 5; i++) ev(H, 'u', 'outbid', { x: 'Lot ' + i });
const peace = p.mail.find((x) => x.from.pid === H && x.subj === 'Shall we make peace?');
assert(peace && peace.opts.length === 2, 'six wins later she offers peace');
let res = act('mailAnswer', { id: peace.id, opt: 0 });
assert(res.ok && !r.rival && r.v >= 0, `peace: ${res.msg}`);

// the auction house: friends stay out of your lots, rivals go after them
B.rel(city, L, 'u').v = 60;
const lot = { bids: { u: 1 } };
let fb = 0; for (let i = 0; i < 30; i++) if (B.auctionBidder(city, lot, [city.players[L]], 1)) fb++;
assert(fb === 0, 'a friend never bids against you');
const w2 = B.auctionBidder(city, lot, [vic], 1); assert(w2 && w2.cap <= 1.3, `a rival bids, but never beyond what a player can beat (cap ${w2 && w2.cap})`);

// price war: start, weekly customers lost, hit back ends it
const take = (type, pid) => { const l = city.listings.find((x) => x.type === type && !x.owner) || city.listings.find((x) => x.type === type && !(x.owner && x.owner.k === 'p' && x.owner.id === 'u')); if (l.owner) { l.owner = null; l.ops = null; } if (pid === 'u') { assert(act('buy', { lid: l.id }).ok, `buy ${type}`); } else { l.owner = { k: 'p', id: pid }; l.ops = E.OPS.newOps(l, true); } return l; };
const mine = take('metal', 'u'), his = take('metal', V);
B.rel(city, V, 'u').v = -50;
const s = B.st(city, V); s.war = { pid: 'u', lid: mine.id, blid: his.id, from: city.g, until: city.g + 6 / 48 };
const c0 = mine.ops.customers, vc = vic.cash;
const X = () => E.botCtx(city);
B.weekStep(city, X());
assert(mine.ops.customers < c0 && vic.cash < vc, `a week of price war costs you customers and him money (${Math.round(c0)} → ${Math.round(mine.ops.customers)})`);
s.war = null; city.bots._heat = {};
// a real move: war is one of his options against a rival with the same kind of company
let tries = 0; while (!s.war && tries++ < 200) { city.bots._heat = {}; B.weekStep(city, X()); }
assert(s.war && s.war.pid === 'u', 'a rival with the same kind of company starts a price war');
const wm = p.mail.find((x) => x.from.pid === V && x.subj === 'Price war' && !x.done);
assert(wm && wm.opts.some((o) => o.bot && o.bot.k === 'hit'), 'the war arrives as a mail: hit back, truce or ride it out');
const cash0 = p.cash, w0 = B.rel(city, V, 'u').w || 0;
res = act('mailAnswer', { id: wm.id, opt: 0 });
assert(res.ok && !s.war && p.cash < cash0 && B.rel(city, V, 'u').w === w0 + 1, `hit back ends the war and counts as a win: ${res.msg}`);

// Gazette story and your answer
B.rel(city, V, 'u').v = -50; city.bots._heat = {}; vic.cash = 300;
const rep0 = mine.ops.rep; tries = 0;
while (!p.mail.some((x) => /^The Gazette:/.test(x.subj)) && tries++ < 300) { city.bots._heat = {}; B.st(city, V).war = null; B.weekStep(city, X()); }
const gm = p.mail.find((x) => /^The Gazette:/.test(x.subj));
assert(gm && city.news.some((n) => n.press && n.kind === 'bad'), 'a rival pays for a story about you in the Gazette');
res = act('mailAnswer', { id: gm.id, opt: 0 }); assert(res.ok && /Reputation/.test(res.msg), `answer it with a press release: ${res.msg}`);
B.st(city, V).war = null;

// an enemy bids for a weak company: it never goes through without your yes
B.rel(city, V, 'u').v = -90; vic.cash = 400;
const o = E.botCtx(city).placeHostile(mine, vic, 30, true);
assert(o && o.consent && o.hostile, 'consent bid placed');
month(3);
assert(o.status === 'expired' && mine.owner.id === 'u', 'unanswered, it expires: the company stays yours');

// an ally steps in when another bot bids
B.rel(city, L, 'u').v = 90;
const o2 = E.botCtx(city).placeHostile(mine, vic, 30, true);
assert(o2 === null, 'an ally talks the bidder out of it');
assert(p.mail.some((x) => x.from.pid === L && x.subj === 'I stepped in'), 'and tells you');

// selling goods to a bot in your network
const chem = take('chemical', V); const ch2 = take('metal', 'u'); ch2.ops.inv.steel = 50;
p.net.push('bot-jonas'); city.players['bot-jonas'].net.push('u');
const jon = city.players['bot-jonas']; jon.cash = 200;
const jl = take('construction', 'bot-jonas');
const jv0 = B.relV(city, 'bot-jonas', 'u');
res = act('dealOffer', { lid: ch2.id, g: 'steel', qty: 10, price: GOODS.steel.base, to: 'bot-jonas' });
assert(res.ok, `offer steel to a bot in your network: ${res.msg}`);
const d = city.deals[city.deals.length - 1]; d.at -= 1 / 48;
B.weekStep(city, X());
assert(d.status === 'shipped', `a fair price is accepted: ${d.status}`);
assert(B.relV(city, 'bot-jonas', 'u') > jv0, 'and he likes you better');

// crisis: a bot short of money asks the friendliest tycoon for help
const di = city.players['bot-diego']; di.cash = 0.5; B.st(city, 'bot-diego').mood = 10; B.rel(city, 'bot-diego', 'u').v = 30;
const dl = take('hotel', 'bot-diego');
let cm; tries = 0; while (!(cm = p.mail.find((x) => x.from.pid === 'bot-diego' && x.subj === 'Can you help me?')) && tries++ < 50) { B.st(city, 'bot-diego').crisisM = -99; di.cash = 0.5; B.monthStep(city, city.m, X()); }
assert(cm && cm.opts.length === 4, 'Diego asks for help: buy, lowball, lend or no');
const owe0 = p.cash; res = act('mailAnswer', { id: cm.id, opt: 2 });
assert(res.ok && p.cash < owe0 && B.st(city, 'bot-diego').owe.length === 1, `lend him money: ${res.msg}`);
assert(B.relV(city, 'bot-diego', 'u') > 45, 'a friend for life');

// the dream company: they ask every half year, higher each time
const dream = city.listings.find((l) => l.id === BOT_PERS['bot-priya'].dream); if (dream.owner) { dream.owner = null; dream.ops = null; }
assert(act('buy', { lid: dream.id }).ok, 'buy Priya\'s dream company');
assert(B.relV(city, 'bot-priya', 'u') < 0, 'she takes it badly');
const pr = city.players['bot-priya']; pr.cash = 500;
tries = 0; while (!city.offers.some((x) => x.from === 'bot-priya' && x.status === 'open') && tries++ < 40) { B.st(city, 'bot-priya').dreamM = -99; B.monthStep(city, city.m, X()); }
const dm = p.mail.find((x) => x.from.pid === 'bot-priya' && /An offer for/.test(x.subj));
assert(dm && city.offers.some((x) => x.from === 'bot-priya' && x.amount > E.listingValue(dream)), 'she offers more than it is worth');
res = act('mailAnswer', { id: dm.id, opt: 1 }); assert(res.ok && dream.owner.id === 'u', 'you keep it');

// the autopilot never sells for you
const mail2 = B.say(city, pr, p, 'dream', { co: 'x', a: '1 M' }, { opts: [{ l: 'Sell', bot: { k: 'ignore', bid: 'bot-priya' } }, { l: 'Keep', safe: true, bot: { k: 'ignore', bid: 'bot-priya' } }] });
month(1); assert(mail2.done && mail2.done.ix === 1, 'unanswered rival mails get the safe answer');

// alliance: two rivals join forces against you
['bot-ellen', 'bot-amara'].forEach((id) => { B.rel(city, id, 'u').v = -60; city.players[id].cash = 100; Object.values(city.holdings).forEach((h) => { delete h.members[id]; }); });
tries = 0; while (!Object.values(city.holdings).some((h) => h.vs === 'u') && tries++ < 60) { ['bot-ellen', 'bot-amara'].forEach((id) => { B.rel(city, id, 'u').v = -60; }); B.monthStep(city, city.m, X()); }
const al = Object.values(city.holdings).find((h) => h.vs === 'u');
assert(al && al.bot, `rivals found ${al && al.name} against you`);
B.rel(city, 'bot-ellen', 'u').v = 20; B.rel(city, 'bot-amara', 'u').v = 20; B.monthStep(city, city.m, X());
assert(!al.vs, 'when one of them warms to you, the alliance falls apart');

// newcomers are left alone
E.addPlayer(city, 'n', 'New Comer', now); const nc = city.players.n; nc.joinedM = city.m;
['Vase', 'Clock', 'Painting', 'Ring'].forEach((x) => ev(H, 'n', 'outbid', { x }));
assert(!B.rel(city, H, 'n').rival, 'no rivalry in your first months');

// chat answers and the profile card
const hi = B.reply(city, V, 'u', 'hello there'); assert(typeof hi === 'string' && hi.length > 2, `chat: "${hi}"`);
const card = B.card(city, V, 'u'); assert(card.per.title === 'Industrialist' && card.lv.name && card.dream, 'profile card data');

// a long run stays healthy
for (let i = 0; i < 24; i++) month(1);
assert(Object.values(city.players).every((x) => Number.isFinite(x.cash)), 'two years later every account is a number');
assert(JSON.stringify(city.rel).length < 60000, 'relations stay small');
console.log('bots ok');
