// Chance cards: triggered by the economy, your companies and the rivals; one choice with a price, effects for a game month
import './standing.js';
import * as E from '../supabase/functions/_shared/engine.js';
import { CHANCE, HAPPENINGS, BOT_PERS, WORKER, SIZES, GOODS } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
const CH = E.CH;
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
E.addPlayer(city, 'u', 'Thomas Player', now);
const p = city.players.u; p.cash = 500; p.joinedM = -12;
const act = (a, x) => E.apply(city, 'u', a, x, now);
const ctx = () => E.chx(city);
const take = (type) => { const l = city.listings.find((x) => x.type === type && !x.owner) || city.listings.find((x) => x.type === type); if (l.owner) { l.owner = null; l.ops = null; } assert(act('buy', { lid: l.id }).ok, `buy ${type}`); return l; };
const steel = take('metal'), hotel = take('hotel');
const fits = () => CH.fits(city, p, ctx());
const only = (id) => fits().filter((h) => h.id === id);
const clearMail = () => { p.mail = []; };
const answer = (mail, i) => act('mailAnswer', { id: mail.id, opt: i });

// timing: a first chance soon for players already in the city, then every 3–5 months
const c = CH.ensure(city, p);
assert(c.next > city.g && c.next <= city.g + CHANCE.first[1] / 12 + 1e-6, 'first chance within the first window');
E.addPlayer(city, 'n', 'Nina Newcomer', now);
assert(CH.ensure(city, city.players.n).next >= (city.players.n.joinedM + CHANCE.newbie) / 12 - 1e-6, 'a newcomer waits three months');
assert(!CH.eligible(city.players['bot-victor']), 'bots get no cards');

// Lean Week: only in a recession or crisis, for a company with enough people
steel.ops.depts.ops.w = 13; steel.ops.depts.sales = steel.ops.depts.sales || { w: 0, set: {}, head: null }; steel.ops.depts.sales.w = 6; city.econ = 'Stable';
assert(!only('leanweek').length, 'no Lean Week in a stable economy');
city.econ = 'Recession';
let h = only('leanweek')[0]; assert(h && h.lid === steel.id && /recession/.test(h.why), 'Lean Week fits a big company in a recession: ' + (h && h.why));
let mail = CH.deal(city, p, h, ctx());
assert(mail && mail.ch.id === 'leanweek' && mail.opts.length === 2 && mail.opts[1].safe, 'Lean Week arrives as a card with a safe pass');
assert(Math.abs(mail.due - (city.g + 1 / 12)) < 1e-4, 'open for a game month');
const rep0 = steel.ops.rep, cash0 = p.cash, mor0 = steel.ops.morale;
assert(answer(mail, 0).ok, 'take the Lean Week');
assert(CH.freeFire(city, p) && CH.hireX(city, p) === 2, 'free layoffs and double hiring fee are on');
assert(steel.ops.rep === Math.max(0, rep0 + CHANCE.cards.leanweek.rep), 'the company loses reputation');
let r = act('workers', { lid: steel.id, dept: 'ops', delta: -5 });
assert(r.ok && steel.ops.depts.ops.w === 8 && p.cash === cash0 && steel.ops.morale === mor0, 'layoffs cost nothing and keep morale: ' + r.msg);
const c1 = p.cash; r = act('workers', { lid: steel.id, dept: 'ops', delta: 1 }); assert(r.ok, 'hire one: ' + r.msg);
assert(Math.abs(c1 - p.cash - 2 * WORKER.hireFee) < 1e-9, `hiring costs double: ${c1 - p.cash}`);
assert(!only('leanweek').length, 'no second Lean Week while one runs');
assert(CH.effects(city, p, steel).some((x) => /Lean Week/.test(x.t)), 'the dashboard shows the effect');
p.cx.fire = city.g - 0.01; const c2 = p.cash; act('workers', { lid: steel.id, dept: 'ops', delta: -1 });
assert(p.cash < c2, 'after the month, severance is back');
p.cx = {}; clearMail();

// Legal Settlement: no Legal department and trouble lately
assert(!only('legal').length, 'no Legal Settlement without recent trouble');
p.mail.push({ id: 'x1', g: city.g - 0.02, m: city.m, lid: hotel.id, kind: 'bad', subj: 'A machine broke down', from: { n: 'x', r: 'y' } });
h = only('legal')[0]; assert(h && h.lid === hotel.id, 'Legal Settlement fits after a bad event: ' + (h && h.why));
mail = CH.deal(city, p, h, ctx()); const c3 = p.cash;
assert(answer(mail, 0).ok && p.cash < c3 && hotel.cx.shield, 'settling costs money and protects the company');
const n0 = p.mail.length; E._happening(city, hotel, HAPPENINGS.find((x) => x.id === 'inspection'));
assert(p.mail[0].kind === 'good' && /settlement/.test(p.mail[0].body) && !hotel.cx.shield, 'the next bad event is settled, once');
clearMail(); p.mail.push({ id: 'x2', g: city.g - 0.02, m: city.m, lid: hotel.id, kind: 'bad', subj: 'x', from: { n: 'x', r: 'y' } });
city.m += 13; h = only('legal')[0]; mail = CH.deal(city, p, h, ctx());
assert(answer(mail, 1).ok && hotel.cx.dbl, 'letting it run leaves an open claim');
clearMail(); E._happening(city, hotel, HAPPENINGS.find((x) => x.id === 'inspection'));
const fine = p.mail[0].opts.find((o) => o.safe).fx.cash, base = -0.1 * SIZES[hotel.size].mult;
assert(Math.abs(fine - 2 * base) < 1e-6 && !hotel.cx.dbl, `the next bad event costs twice as much: ${fine} vs ${base}`);
clearMail();

// Executive Headhunt: reputation 80+ and a free agent: no fee, locked two years
hotel.ops.rep = 92; E.TAL.ensure(city);
h = only('headhunt')[0]; assert(h && h.tid, 'Headhunt fits a company with a great reputation: ' + (h && h.why));
mail = CH.deal(city, p, h, ctx()); const c4 = p.cash;
r = answer(mail, 0); assert(r.ok && city.talent[h.tid].owner === 'u' && p.cash === c4, 'signed without a fee: ' + r.msg);
assert(E.TAL.locked(city, h.tid), 'the contract is locked');
assert(!act('fire', { tid: h.tid }).ok && !act('tList', { tid: h.tid, price: 3 }).ok, 'cannot release or sell them');
E.addPlayer(city, 'v', 'Vera Rival', now); city.players.v.cash = 500;
assert(!E.apply(city, 'v', 'tOffer', { tid: h.tid, fee: 5, salary: 9 }, now).ok, 'nobody can bid for them');
clearMail();

// Boardroom Vote: too many people in one company, too few in another
const flat = (l) => Object.values(l.ops.depts).forEach((d) => { d.w = E.OPS.needWorkers(l, Object.keys(l.ops.depts).find((k) => l.ops.depts[k] === d)); });
flat(steel); flat(hotel); assert(!only('boardroom').length, 'no Boardroom Vote when every company is staffed right');
steel.ops.depts.ops.w += 6; hotel.ops.depts.ops.w = Math.max(0, hotel.ops.depts.ops.w - 4);
h = only('boardroom')[0]; assert(h && h.lid === steel.id, 'Boardroom Vote fits: ' + (h && h.why));
assert(!act('workersMove', { from: steel.id, fd: 'ops', to: hotel.id, td: 'ops', n: 2 }).ok, 'no free moves without the card');
mail = CH.deal(city, p, h, ctx()); assert(answer(mail, 0).ok && CH.moving(city, p), 'take the Boardroom Vote');
const sw = steel.ops.depts.ops.w, hw = hotel.ops.depts.ops.w, sm = steel.ops.morale, c5 = p.cash;
r = act('workersMove', { from: steel.id, fd: 'ops', to: hotel.id, td: 'ops', n: 2 });
assert(r.ok && steel.ops.depts.ops.w === sw - 2 && hotel.ops.depts.ops.w === hw + 2 && p.cash === c5, 'workers move for free: ' + r.msg);
assert(steel.ops.morale === Math.max(0, sm + CHANCE.cards.boardroom.morale), 'morale drops in the company they left');
act('workersMove', { from: steel.id, fd: 'ops', to: hotel.id, td: 'ops', n: 1 });
assert(steel.ops.morale === Math.max(0, sm + CHANCE.cards.boardroom.morale), '...only once');
assert(CH.moveTargets(city, p, steel, 'ops', ctx()).some((t) => t.lid === hotel.id), 'move targets list the other company');
p.cx = {}; clearMail();

// Opportunistic Flip: a flying company draws a bid from a rival who hunts in that sector, premium by style
steel.ops.hist = [1, 2, 3, 4, 5, 6].map((m) => ({ m, b2c: 0, goods: 2, ypi: 0.5, sup: 0.6, sal: 0.2 }));
assert(CH.flying(steel) > 0, 'steel works is flying');
const vic = city.players['bot-victor']; vic.cash = 500;
h = only('flip').find((x) => x.lid === steel.id);
assert(h && BOT_PERS[h.bid].types.includes('metal'), 'a metal hunter bids: ' + (h && h.bid));
const b = city.players[h.bid], v = E.listingValue(steel), prem = CHANCE.cards.flip.prem[b.style];
assert(Math.abs(h.amt - Math.round(v * (1 + prem) * 10) / 10) < 0.11, `premium follows the bot's style (${b.style} ${prem}): ${h.amt} on ${v}`);
mail = CH.deal(city, p, h, ctx());
assert(mail.from.k === 'bot' && mail.ch.id === 'flip' && mail.opts[1].safe, 'the bid comes from the bot as a card');
const c6 = p.cash; r = answer(mail, 0);
assert(r.ok && steel.owner.id === b.id && Math.abs(p.cash - c6 - h.amt) < 1e-6, 'sold above value: ' + r.msg);
assert(E.BOT.relV(city, b.id, 'u') > 0, 'the bot likes you for it');
clearMail();

// Fire Sale: a recession and a rival short of cash
const lars = city.players['bot-lars']; const lars0 = city.listings.find((x) => !x.owner && x.ops === null && x.type === 'dealer') || city.listings.find((x) => x.type === 'dealer');
lars0.owner = { k: 'p', id: lars.id }; if (!lars0.ops) lars0.ops = E.OPS.newOps(lars0, true);
lars.cash = 0.5; city.econ = 'Stable'; assert(!only('firesale').some((x) => x.bid === lars.id), 'no Fire Sale in a stable economy');
city.econ = 'Crisis'; h = only('firesale').find((x) => x.bid === lars.id);
assert(h && h.price < E.listingValue(E.listing(city, h.lid)), 'Fire Sale below value: ' + (h && h.why));
mail = CH.deal(city, p, h, ctx()); const c7 = p.cash; r = answer(mail, 0);
const fl = E.listing(city, h.lid);
assert(r.ok && fl.owner.id === 'u' && Math.abs(c7 - p.cash - h.price) < 1e-6, 'bought the company in the fire sale: ' + r.msg);
clearMail();

// ---------------- phase 2 and 3
const reset = () => { clearMail(); p.cx = {}; city.listings.forEach((l) => { delete l.cx; }); p.chance.last = {}; };
const card = (id, pick, f = (x) => true) => { const hh = only(id).find(f); assert(hh, `${id} fits: ${hh ? hh.why : 'no'}`); const ml = CH.deal(city, p, hh, ctx()); const rr = answer(ml, pick); assert(rr.ok, `${id} answered: ${rr.msg}`); return { hh, ml, rr }; };
reset(); steel.owner = { k: 'p', id: 'u' }; steel.ops.managed = false; steel.level = 1; steel.upgrade = null;
// Stimulus Contract: a builder in a recession gets steady income and less capacity
const builder = take('construction'); city.econ = 'Recession';
const cap0 = E.OPS.capacity(builder), y0 = E.listingYield(city, builder).ypi;
card('stimulus', 0, (x) => x.lid === builder.id);
assert(E.listingYield(city, builder).ypi > y0 && E.OPS.capacity(builder) < cap0, 'stimulus: more YPI, less capacity');
// Expansion Window: cheaper upgrade in a boom, one month slower
reset(); city.econ = 'Boom'; const uc = E.upgradeCost(steel);
card('expansion', 0, (x) => x.lid === steel.id);
assert(E.upgradeCost(steel) < uc, `expansion: upgrade cheaper ${E.upgradeCost(steel)} < ${uc}`);
r = act('upgrade', { lid: steel.id }); assert(r.ok && steel.upgrade && steel.upgrade.doneM === city.m + 2 && !steel.cx.up, 'expansion: the upgrade runs a month longer and uses the discount: ' + r.msg);
steel.upgrade = null; steel.level = 1;
// Talent War: a star is wanted; keeping them costs a bonus and locks them
reset(); const star = Object.keys(city.talent).find((tid) => city.talent[tid].owner === 'u'); city.talent[star].rating = 5; city.talent[star].notice = null; city.talent[star].leave = null; city.talent[star].lock = null;
Object.values(city.players).filter((x) => x.bot).forEach((x) => { x.cash = Math.max(x.cash, 300); });
let res = card('talentwar', 1, (x) => x.tid === star);
assert(city.talent[star].owner === res.hh.bid, 'talent war: sold to the bot');
// Emergency Credit: 0% for three months, then the emergency rate
reset(); city.econ = 'Crisis'; p.loans = []; const pc = p.cash; p.cash = 1;
card('emergency', 0);
const ln = p.loans.find((x) => x.zero != null); assert(ln && ln.rate === 0 && p.cash === 6, 'emergency: 5 M at 0%');
city.m = ln.zero; CH.monthStep(city, ctx()); assert(ln.rate > 0 && ln.zero == null, 'emergency: after three months the rate goes up ' + ln.rate);
p.loans = []; p.cash = pc;
// Lock the Rate: the bank rate went up and you have floating loans
reset(); city.cb.hist = [[city.m - 3, city.cb.rate - 1.5], [city.m, city.cb.rate]]; p.loans = [{ id: 'f1', amt: 20, rate: 'bank', m: city.m, bank: 'cb' }];
card('lockrate', 0); assert(typeof p.loans[0].rate === 'number' && p.loans[0].lockM, 'lock the rate: the floating loan is fixed');
p.loans = [];
// Strike Threat: low morale; a raise lifts morale and wages
reset(); steel.ops.morale = 20; const sal0 = E.OPS.runningCosts(steel).salaries;
card('strike', 0, (x) => x.lid === steel.id); assert(steel.ops.morale >= 40 && E.OPS.runningCosts(steel).salaries > sal0, 'strike: raise given');
reset(); steel.ops.morale = 20; res = card('strike', 1, (x) => x.lid === steel.id);
assert(/walked out/.test(res.rr.msg) ? E.OPS.capacity(steel) === 0 : true, 'strike: a walkout stops production');
// Bulk Buyer: a full stock sells at once a little under market
reset(); steel.ops.morale = 60; const sg = Object.keys(steel.ops.inv).find((g) => g === 'steel') || 'steel'; steel.ops.inv[sg] = 5000; const pb = p.cash;
card('bulk', 0, (x) => x.lid === steel.id); assert(steel.ops.inv[sg] === 0 && p.cash > pb, 'bulk: sold the whole stock');
// Turnaround Consultant: three losing months
reset(); hotel.ops.hist = [1, 2, 3].map((m) => ({ m, b2c: 0.1, sal: 0.5 }));
card('turnaround', 0, (x) => x.lid === hotel.id);
// Joint Venture: a friendly bot in the same trade
reset(); const jb = city.players['bot-lars']; city.rel[jb.id].u.v = 60; const dl = city.listings.find((x) => x.type === 'hotel' && x !== hotel); dl.owner = { k: 'p', id: jb.id };
const yh = E.listingYield(city, hotel).ypi; card('jv', 0, (x) => x.lid === hotel.id && x.bid === jb.id);
assert(E.listingYield(city, hotel).ypi > yh, 'joint venture: more YPI');
// Peace Offering: pay to end a price war
reset(); const wb = city.players['bot-victor']; E.BOT.st(city, wb.id).war = { pid: 'u', lid: steel.id, blid: steel.id, until: city.g + 1 };
card('peace', 0, (x) => x.bid === wb.id); assert(!E.BOT.st(city, wb.id).war, 'peace: the price war is over');
// Tip-off: a friend sells a tip about the next quarter
reset(); card('tipoff', 0); assert(p.mail.some((x) => x.subj === 'The tip'), 'tip-off: the tip arrives');
// Forward Contract and Supplier Squeeze: high prices
reset();
const gb = { steel: city.market.steel.p }; city.market.steel.p = gb.steel * 2; steel.ops.inv.steel = 0;
card('forward', 0, (x) => x.lid === steel.id && x.g === 'steel'); assert(steel.cx.fwd && steel.cx.fwd.q > 0, 'forward: price fixed');
steel.ops.inv.steel = 1; const pf = p.cash; CH.monthStep(city, ctx()); assert(steel.ops.inv.steel === 0, 'forward: the goods are taken each month');
city.market.steel.p = gb.steel;
reset(); const ig = E.OPS.stocked(builder).map(([g]) => g).find((g) => !GOODS[g].fresh); const ip = city.market[ig].p; city.market[ig].p = ip * 2; builder.ops.inv[ig] = 0;
card('squeeze', 0, (x) => x.lid === builder.id && x.g === ig); CH.monthStep(city, ctx()); assert(builder.ops.inv[ig] > 0, 'squeeze: prepaid supplies arrive');
city.market[ig].p = ip;
// Insider Whisper: a share that jumped
reset(); const sid = Object.keys(city.stocks)[0]; city.stocks[sid].h.push(city.stocks[sid].h[city.stocks[sid].h.length - 1] * 1.2);
res = card('insider', 0); assert(/right|wrong/.test(res.rr.msg), 'insider: the bet is settled');
assert((p.chance.log || []).some((x) => x.pick), 'the card log keeps what you picked');
reset(); city.econ = 'Stable';

// the draw: nothing fits → look again in a month; a card → next chance in 3–5 months; the autopilot passes
city.econ = 'Stable'; Object.keys(CHANCE.cards).forEach((id) => { p.chance.last[id] = city.m; });
assert(!CH.draw(city, p, ctx()) && Math.abs(p.chance.next - (city.g + 1 / 12)) < 1e-4, 'nothing fits: look again a month later');
p.chance.last = {}; city.econ = 'Recession'; steel.owner = { k: 'p', id: 'u' }; steel.ops.depts.ops.w = 40; steel.ops.managed = false;
const g0 = city.g; mail = CH.draw(city, p, ctx(), () => 0.01);
assert(mail && mail.ch, 'a card is drawn: ' + (mail && mail.ch.id));
assert(p.chance.next >= g0 + 3 / 12 - 1e-6 && p.chance.next <= g0 + 5 / 12 + 1e-6, 'next chance in 3–5 months');
assert(!CH.draw(city, p, ctx()), 'one open card at a time');
now += E.realMsPerMonth(city) * 1.3; E.advance(city, now);
const done = p.mail.find((x) => x.id === mail.id);
assert(done.done && done.done.auto && done.opts[done.done.ix].safe, 'the autopilot passes after a month');

// the weekly agenda plans the chance
p.chance.next = city.g + 0.5 / 48; p.mail = [];
now += E.realMsPerMonth(city) * 0.5; E.advance(city, now);
assert(p.chance.next > city.g, 'the planned chance fired and the next one is set');
console.log('chance tests passed');
