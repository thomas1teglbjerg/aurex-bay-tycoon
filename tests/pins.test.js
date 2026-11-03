// Admin moves a company pin: saved on the city, kept through map migrations, refused when malformed.
import * as E from '../supabase/functions/_shared/engine.js';
import { DISTRICT, placeOn } from '../supabase/functions/_shared/content.js';
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } };
let now = 1_700_000_000_000;
const city = E.createCity(now, { speed: 2016 });
const l = city.listings[0];
let r = E.moveListing(city, l.id, [0.25, 0.75]);
assert(r.ok, 'move ok ' + r.msg);
assert(l.p[0] === 0.25 && l.p[1] === 0.75, 'p set');
const q = placeOn(l.d, [0.25, 0.75]); assert(l.x === q.x && l.y === q.y, 'city x/y follow');
assert(city.pins[l.id].type === l.type, 'pin saved with type');
assert(!E.moveListing(city, 'nope', [0.5, 0.5]).ok, 'unknown listing refused');
assert(!E.moveListing(city, l.id, ['a', 1]).ok, 'bad p refused');
assert(!E.moveListing(city, l.id, [0.5]).ok, 'short p refused');
E.moveListing(city, l.id, [-3, 9]); assert(l.p[0] === 0.01 && l.p[1] === 0.99, 'clamped inside the district');
E.moveListing(city, l.id, [0.4, 0.6]);
// an older save re-runs the map migration: the moved pin stays where the admin put it
const saved = JSON.parse(JSON.stringify(city)); saved.mapV = 3;
E.advance(saved, now + 1000);
const l2 = saved.listings.find((x) => x.id === l.id);
assert(l2.p[0] === 0.4 && l2.p[1] === 0.6, 'pin survives migrateMap');
assert(DISTRICT[l2.d], 'district kept');
console.log('pins ok');
