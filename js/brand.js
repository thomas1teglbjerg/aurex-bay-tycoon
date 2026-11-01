// Parent company logos: colour + font + symbol + name, drawn as inline SVG/HTML.
import { BRAND_SYMBOLS, colorHex, fontDef } from '../supabase/functions/_shared/brand.js';
import { esc } from './util.js';

export const SYMBOL_SVG = {
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13M8 11h8M4.5 13.5a7.5 7.5 0 0 0 15 0"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z"/><path d="M5 21h14"/>',
  tower: '<path d="M3 21h18M5 21V10h4v11M10 21V3h4v18M15 21v-8h4v8"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 10.5l3.5 3 3.5-3"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z"/>',
  diamond: '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4L8 9l4 11 4-11-1-5"/>',
  leaf: '<path d="M5 19C5 10 10 4 20 4c0 10-6 15-15 15z"/><path d="M5 19l9-9"/>',
  wave: '<path d="M2 8.5c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 13c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 17.5c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/>',
  peak: '<path d="M2 20l7-12 4 6 3-4 6 10z"/><path d="M7 11.5l2 1.5 2-1.5"/>',
  hex: '<path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z"/><path d="M12 7.5l3.9 2.25v4.5L12 16.5l-3.9-2.25v-4.5z"/>',
  key: '<circle cx="7.5" cy="12" r="4"/><path d="M11.5 12H21M17.5 12v3.5M21 12v3"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>',
  pillar: '<path d="M3 8l9-5 9 5zM5.5 8v10M10 8v10M14 8v10M18.5 8v10M4 18h16M3 21h18"/>',
  lighthouse: '<path d="M9 21l1.5-12h3L15 21zM10 9h4l-.8-3h-2.4zM12 3v3"/><path d="M6 5.5L3.5 4.5M18 5.5l2.5-1M4 21h16M9.7 15h4.6"/>'
};

const symPaths = (id) => SYMBOL_SVG[id] || SYMBOL_SVG[BRAND_SYMBOLS[0].id];
export const symbolIcon = (id, size = 24, color = 'currentColor') =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symPaths(id)}</svg>`;

// The square mark: white symbol on the primary colour.
export function logoMark(b, size = 28) {
  if (!b) return '';
  const hex = colorHex(b.color);
  return `<span class="lgm" style="width:${size}px;height:${size}px;background:${hex}" title="${esc(b.name)}" aria-hidden="true">${symbolIcon(b.sym, Math.round(size * 0.66), '#fff')}</span>`;
}
// Mark + wordmark in the chosen font. on: 'light' (name in the brand colour) or 'dark' (white name).
export function logoFull(b, o = {}) {
  if (!b) return '';
  const size = o.size || 34, f = fontDef(b.font), hex = colorHex(b.color);
  const col = o.on === 'dark' ? '#fff' : hex;
  return `<span class="lgf${o.cls ? ' ' + o.cls : ''}" role="img" aria-label="${esc(b.name)} logo">${logoMark(b, size)}<span class="lgn" style="font-family:${f.css};font-weight:${f.w};color:${col};font-size:${Math.round(size * (f.up ? 0.5 : 0.58))}px;${f.up ? 'text-transform:uppercase;letter-spacing:0.06em;' : 'letter-spacing:0.01em;'}">${esc(b.name)}</span></span>`;
}
