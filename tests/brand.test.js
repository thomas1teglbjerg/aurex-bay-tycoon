// Parent companies: avatar names, founding solo or co-owned, buy-ins and logos.
import * as E from '../supabase/functions/_shared/engine.js';
const BR = E.BR;
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok ', m); };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });

assert(!BR.checkAvatarName('Thomas', '').ok, 'last name required');
assert(!BR.checkAvatarName('Th0mas', 'Berg').ok, 'no digits in names');
const av = BR.checkAvatarName('thomas', 'teglbjærg');
assert(av.ok && av.name === 'Thomas Teglbjærg', 'names are capitalised: ' + av.name);

E.addPlayer(city, 'u1', null, now, { first: 'Thomas', last: 'Teglbjærg' });
const p = city.players.u1;
assert(p.name === 'Thomas Teglbjærg' && p.first === 'Thomas', 'player gets the avatar name');
assert(BR.needsParent(city, 'u1'), 'a new player has to found a parent company');
assert(!BR.needsParent(city, 'bot-lars') && BR.brandOf(city, 'bot-lars').name.startsWith('Hansen'), 'bots get an automatic brand');

const base = { color: 'navy', font: 'classic', sym: 'anchor' };
for (const bad of ['ab', 'www.money.com', 'Xxxxxx Group', 'Qwrtpz Holding', 'Supercalifragilistic Group']) {
  assert(!E.apply(city, 'u1', 'coFound', { ...base, name: bad }, now).ok, 'rejects name: ' + bad);
}
assert(!E.apply(city, 'u1', 'coFound', { ...base, sym: 'unicorn', name: 'Halvorsen Group' }, now).ok, 'symbol must be one of the 15');
assert(BR.BRAND_SYMBOLS.length === 15, '15 symbols');
let r = E.apply(city, 'u1', 'coFound', { ...base, name: 'halvorsen group' }, now);
assert(r.ok && p.co.name === 'Halvorsen Group' && !p.co.hid, 'solo parent founded: ' + r.msg);
assert(!E.apply(city, 'u1', 'coFound', { ...base, name: 'Other Group' }, now).ok, 'only one parent company');
r = E.apply(city, 'u1', 'coBrand', { sym: 'crown', color: 'burgundy' }, now);
assert(r.ok && BR.brandOf(city, 'u1').sym === 'crown', 'logo can be changed');

// co-owned parent company with a buy-in
E.addPlayer(city, 'u2', null, now, { first: 'Mia', last: 'Holm' });
E.addPlayer(city, 'u3', null, now, { first: 'Jens', last: 'Lund' });
E.addPlayer(city, 'u4', null, now, { first: 'Ida', last: 'Berg' });
assert(!E.apply(city, 'u2', 'coFound', { ...base, name: 'Halvorsen Group', mode: 'coop', amt: 10 }, now).ok, 'names are unique in the city');
r = E.apply(city, 'u2', 'coFound', { ...base, name: 'Northgate Capital', mode: 'coop', amt: 10, buyIn: 8, open: true }, now);
assert(r.ok, 'co-owned parent founded: ' + r.msg);
const h = Object.values(city.holdings).find((x) => x.name === 'Northgate Capital');
assert(h.parent && h.buyIn === 8 && BR.brandOf(city, 'u2').hid === h.id, 'the founder runs under the co-owned parent');
assert(BR.openParents(city, 'u3').some((x) => x.id === h.id), 'open parents are listed for new players');
assert(!E.apply(city, 'u3', 'coJoin', { hid: h.id, amt: 5 }, now).ok, 'buy-in below the minimum is refused');
const cash = city.players.u3.cash;
r = E.apply(city, 'u3', 'coJoin', { hid: h.id }, now);
assert(r.ok && city.players.u3.cash === cash - 8 && h.members.u3 > 0, 'buying in at the asking price: ' + r.msg);
assert(BR.brandOf(city, 'u3').name === 'Northgate Capital', 'the co-owner shows the shared logo');
assert(!E.apply(city, 'u3', 'coBrand', { sym: 'star' }, now).ok, 'only the founder edits a shared logo');
E.apply(city, 'u2', 'holdingBuyIn', { hid: h.id, open: false }, now);
assert(!E.apply(city, 'u4', 'coJoin', { hid: h.id }, now).ok, 'a closed parent needs an invitation');
E.apply(city, 'u2', 'holdingInvite', { hid: h.id, pid: 'u4' }, now);
assert(E.apply(city, 'u4', 'coJoin', { hid: h.id, amt: 9 }, now).ok, 'invited players can always be added with a buy-in');
r = E.apply(city, 'u4', 'holdingLeave', { hid: h.id }, now);
assert(r.ok && BR.needsParent(city, 'u4'), 'leaving the parent means founding or joining a new one: ' + r.msg);
console.log('ALL OK');
