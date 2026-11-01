// Aurex Bay Tycoon — parent companies and their logos.
// Every human player runs their empire under a parent company: either their own (p.co holds the brand)
// or a co-owned one (p.co.hid points at a coop holding that carries h.brand and a buy-in).
// Name + colour + font + symbol make the logo; js/brand.js draws it.

export const BRAND_COLORS = [
  { id: 'navy', name: 'Navy', hex: '#1f3a5f' },
  { id: 'midnight', name: 'Midnight', hex: '#14213d' },
  { id: 'royal', name: 'Royal blue', hex: '#2b4c9b' },
  { id: 'steel', name: 'Steel', hex: '#4a6274' },
  { id: 'teal', name: 'Teal', hex: '#0f6e6e' },
  { id: 'forest', name: 'Forest', hex: '#1e5b3a' },
  { id: 'burgundy', name: 'Burgundy', hex: '#7a1f2b' },
  { id: 'crimson', name: 'Crimson', hex: '#a3222f' },
  { id: 'plum', name: 'Plum', hex: '#5b2a5e' },
  { id: 'copper', name: 'Copper', hex: '#a35a2a' },
  { id: 'gold', name: 'Gold', hex: '#a8832b' },
  { id: 'graphite', name: 'Graphite', hex: '#33383f' }
];
export const BRAND_FONTS = [
  { id: 'modern', name: 'Modern', css: "'Montserrat', 'Helvetica Neue', Arial, sans-serif", w: 800, up: true },
  { id: 'classic', name: 'Classic', css: "'Playfair Display', Georgia, serif", w: 700, up: false },
  { id: 'prestige', name: 'Prestige', css: "'Cinzel', 'Times New Roman', serif", w: 700, up: true },
  { id: 'elegant', name: 'Elegant', css: "'Raleway', 'Helvetica Neue', Arial, sans-serif", w: 700, up: false },
  { id: 'solid', name: 'Solid', css: "'Roboto Slab', Rockwell, Georgia, serif", w: 700, up: false },
  { id: 'bold', name: 'Bold', css: "'Oswald', 'Arial Narrow', Arial, sans-serif", w: 600, up: true },
  { id: 'clean', name: 'Clean', css: "'Source Sans 3', 'Segoe UI', Arial, sans-serif", w: 700, up: false }
];
export const BRAND_SYMBOLS = [
  { id: 'anchor', name: 'Anchor' }, { id: 'crown', name: 'Crown' }, { id: 'tower', name: 'Tower' },
  { id: 'shield', name: 'Shield' }, { id: 'star', name: 'Star' }, { id: 'globe', name: 'Globe' },
  { id: 'diamond', name: 'Diamond' }, { id: 'leaf', name: 'Leaf' }, { id: 'wave', name: 'Wave' },
  { id: 'peak', name: 'Peak' }, { id: 'hex', name: 'Hexagon' }, { id: 'key', name: 'Key' },
  { id: 'compass', name: 'Compass' }, { id: 'pillar', name: 'Pillar' }, { id: 'lighthouse', name: 'Lighthouse' }
];
export const NAME_ENDINGS = ['Holding', 'Group', 'Capital', 'Partners', 'Industries', 'Ventures', 'Enterprises', 'Corporation', '& Co.', 'A/S', 'Ltd.'];
export const MIN_STAKE = 5; // M a founder or new co-owner puts into a co-owned parent company

const COLOR = Object.fromEntries(BRAND_COLORS.map((c) => [c.id, c]));
const FONT = Object.fromEntries(BRAND_FONTS.map((f) => [f.id, f]));
const SYM = Object.fromEntries(BRAND_SYMBOLS.map((s) => [s.id, s]));
export const colorHex = (id) => (COLOR[id] || BRAND_COLORS[0]).hex;
export const fontDef = (id) => FONT[id] || BRAND_FONTS[0];

const hash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const tidy = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const cap1 = (w) => (w ? w[0].toLocaleUpperCase() + w.slice(1) : w);

// ---------------------------------------------------------------- validation
// Avatar name: first and last name, letters only (plus hyphen and apostrophe), each capitalised.
export function checkAvatarName(first, last) {
  const f = tidy(first), l = tidy(last);
  const okPart = (s) => /^[\p{L}][\p{L}'’-]*( [\p{L}][\p{L}'’-]*)*$/u.test(s);
  if (!f || !l) return { ok: false, msg: 'Enter both a first name and a last name.' };
  if (f.length < 2 || l.length < 2) return { ok: false, msg: 'First and last name need at least 2 letters each.' };
  if (f.length > 14 || l.length > 18) return { ok: false, msg: 'Keep the first name under 15 and the last name under 19 letters.' };
  if (!okPart(f) || !okPart(l)) return { ok: false, msg: 'Names can only use letters, hyphens and apostrophes.' };
  const fix = (s) => s.split(' ').map((w) => w.split('-').map((x) => (x === x.toLocaleLowerCase() || x === x.toLocaleUpperCase() ? cap1(x.toLocaleLowerCase()) : x)).join('-')).join(' ');
  const first2 = fix(f), last2 = fix(l);
  return { ok: true, first: first2, last: last2, name: `${first2} ${last2}` };
}

// A realistic company name: 3–32 characters, words made of letters (digits allowed inside a word),
// a few business punctuation marks, no web addresses, no keyboard mashing. Must be unique in the city.
export function checkCoName(city, raw, self = {}) {
  let name = tidy(raw);
  if (name.length < 3) return { ok: false, msg: 'The company name needs at least 3 characters.' };
  if (name.length > 32) return { ok: false, msg: 'Keep the company name to 32 characters.' };
  if (!/^[\p{L}\d &.,'’/-]+$/u.test(name)) return { ok: false, msg: 'Use letters, numbers, spaces and & . , \' - / only.' };
  if (/(https?:|www\.|\.(com|net|org|dk|io)\b)/i.test(name)) return { ok: false, msg: 'A company name, not a web address.' };
  if (/(.)\1{3,}/iu.test(name)) return { ok: false, msg: 'That does not look like a real company name.' };
  const words = name.split(' ');
  if (!words.some((w) => (w.match(/\p{L}/gu) || []).length >= 2)) return { ok: false, msg: 'The name needs at least one real word.' };
  if (words.some((w) => w.length > 16 && !/[-&]/.test(w))) return { ok: false, msg: 'One of the words is too long for a company name.' };
  if (words.some((w) => /\p{L}/u.test(w) && w.length >= 5 && !/[aeiouyæøåäöüéèáàíóú]/iu.test(w))) return { ok: false, msg: 'That does not look like a real company name.' };
  if (name === name.toLocaleLowerCase()) name = words.map((w) => (w.length <= 2 && w !== words[0] ? w : cap1(w))).join(' ');
  const key = name.toLocaleLowerCase();
  const taken = Object.values(city.players || {}).some((p) => p.co && !p.co.hid && p.id !== self.pid && p.co.name.toLocaleLowerCase() === key)
    || Object.values(city.holdings || {}).some((h) => h.id !== self.hid && h.name.toLocaleLowerCase() === key);
  if (taken) return { ok: false, msg: `${name} already exists in Aurex Bay. Pick another name.` };
  return { ok: true, name };
}
export function checkBrand(a) {
  if (!COLOR[a.color]) return { ok: false, msg: 'Pick a primary colour.' };
  if (!FONT[a.font]) return { ok: false, msg: 'Pick a font.' };
  if (!SYM[a.sym]) return { ok: false, msg: 'Pick a symbol.' };
  return { ok: true, color: a.color, font: a.font, sym: a.sym };
}

// ---------------------------------------------------------------- lookups
// A stable default look for bots and older coops, so every owner in the city has a logo.
function autoBrand(seed) {
  const h = hash(seed);
  return { color: BRAND_COLORS[h % BRAND_COLORS.length].id, font: BRAND_FONTS[(h >>> 5) % BRAND_FONTS.length].id, sym: BRAND_SYMBOLS[(h >>> 9) % BRAND_SYMBOLS.length].id };
}
const ENDS = ['Group', 'Holding', 'Capital', '& Co.', 'Partners'];
export function holdingBrand(h) {
  if (!h) return null;
  const b = h.brand || autoBrand(h.id);
  return { name: h.name, color: b.color, font: b.font, sym: b.sym, hid: h.id, auto: !h.brand };
}
// The parent company a player's empire runs under, or null if they still have to found one.
export function brandOf(city, pid) {
  const p = city.players[pid]; if (!p) return null;
  if (p.co) {
    if (p.co.hid) { const h = city.holdings[p.co.hid]; return h && h.members[pid] ? { ...holdingBrand(h), coop: true } : null; }
    return { name: p.co.name, color: p.co.color, font: p.co.font, sym: p.co.sym, hid: null, coop: false };
  }
  if (!p.bot) return null;
  const last = String(p.name).split(' ').slice(-1)[0];
  return { name: `${last} ${ENDS[hash(p.name + p.id) % ENDS.length]}`, ...autoBrand(p.id), hid: null, coop: false, auto: true };
}
export const needsParent = (city, pid) => { const p = city.players[pid]; return !!p && !p.bot && !brandOf(city, pid); };
// co-owned parent companies a player could buy into right now
export function openParents(city, pid) {
  return Object.values(city.holdings || {}).filter((h) => h.parent && !h.members[pid] && (h.open || h.invites.some((i) => i.pid === pid)));
}
export function suggestName(city) {
  const A = ['Harbor', 'Northgate', 'Bayline', 'Aurex', 'Meridian', 'Halvorsen', 'Kestrel', 'Sterling', 'Westbrook', 'Ashford', 'Calder', 'Nordvik', 'Ironwood', 'Silverton', 'Ravensberg', 'Lindqvist', 'Brightwater', 'Oakmont'];
  for (let i = 0; i < 40; i++) {
    const n = `${A[Math.floor(Math.random() * A.length)]} ${NAME_ENDINGS[Math.floor(Math.random() * 8)]}`;
    if (checkCoName(city, n).ok) return n;
  }
  return 'Aurex Ventures ' + (Math.floor(Math.random() * 90) + 10);
}
