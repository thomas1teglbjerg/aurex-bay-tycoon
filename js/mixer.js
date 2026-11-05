// The concrete mixer: a slider game while a hand-mixed batch runs (1 s per tonne, OPS.MIX in ops.js).
// The raw materials drift; three sliders set the feed of cement, sand and gravel. Keep each share inside its
// green band. Out of the band the mix quality drains; at 0 the batch is ruined. When the time is up the batch
// is poured as soon as the mixture is right.
import * as E from '../supabase/functions/_shared/engine.js';
import { RECIPES, GOODS } from '../supabase/functions/_shared/content.js';
import { city, now, esc, N } from './util.js';

const PARTS = ['cement', 'sand', 'gravel', 'water'];
const TOL = 0.06;           // ± share that still counts as right (fairly easy); small parts (water) get a band
const tol = (g) => Math.min(TOL, MX.target[g] * 0.45); // in proportion to their share
const DRAIN = 9, HEAL = 5;  // quality points per second out of / inside the band
let MX = null;

function targets(l) { const r = RECIPES[l.type].in, sum = PARTS.reduce((a, g) => a + (r[g] || 0), 0); return Object.fromEntries(PARTS.map((g) => [g, (r[g] || 0) / sum])); }
function shares() { const v = PARTS.map((g) => MX.feed[g] * MX.drift[g]), sum = v.reduce((a, x) => a + x, 0) || 1; return Object.fromEntries(PARTS.map((g, i) => [g, v[i] / sum])); }
const inBand = (sh) => PARTS.every((g) => Math.abs(sh[g] - MX.target[g]) <= tol(g));

function css() {
  if (document.getElementById('mixer-css')) return;
  const s = document.createElement('style'); s.id = 'mixer-css';
  s.textContent = `#mixer { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; background: rgba(10,20,35,0.55); padding: 16px; }
  #mixer .mx { width: min(520px, 100%); background: var(--panel); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.35); padding: 18px 18px 14px; }
  #mixer h2 { margin: 0 0 2px; font-family: var(--head); font-size: 19px; }
  #mixer .mx-sub { color: var(--ink-2); font-size: 13.5px; margin: 0 0 12px; }
  #mixer .mx-top { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
  #mixer .mx-time { font-family: var(--head); font-size: 26px; font-variant-numeric: tabular-nums; min-width: 92px; }
  #mixer .mx-q { flex: 1; }
  #mixer .mx-q small, #mixer .mx-row small { display: block; color: var(--ink-2); font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
  #mixer .mx-bar { height: 10px; border-radius: 6px; background: var(--panel-2); border: 1px solid var(--line); overflow: hidden; margin-top: 4px; }
  #mixer .mx-bar i { display: block; height: 100%; background: var(--good); transition: width .1s linear; }
  #mixer .mx-row { padding: 9px 0; border-top: 1px solid var(--line); }
  #mixer .mx-head { display: flex; justify-content: space-between; align-items: baseline; }
  #mixer .mx-head b { font-size: 15px; }
  #mixer .mx-head span { font-variant-numeric: tabular-nums; font-weight: 700; }
  #mixer .mx-gauge { position: relative; height: 14px; border-radius: 7px; background: var(--panel-2); border: 1px solid var(--line); margin: 6px 0; }
  #mixer .mx-band { position: absolute; top: 0; bottom: 0; background: rgba(35,144,90,0.22); border-left: 2px solid var(--good); border-right: 2px solid var(--good); }
  #mixer .mx-dot { position: absolute; top: -3px; width: 4px; height: 18px; margin-left: -2px; border-radius: 2px; background: var(--ink); }
  #mixer .mx-row.off .mx-dot { background: var(--bad); }
  #mixer .mx-row.off .mx-head span { color: var(--bad); }
  #mixer input[type=range] { width: 100%; accent-color: var(--band); }
  #mixer .mx-msg { min-height: 20px; font-size: 14px; font-weight: 700; margin: 8px 0 10px; }
  #mixer .mx-msg.bad { color: var(--bad); } #mixer .mx-msg.good { color: var(--good); }
  #mixer .mx-btns { display: flex; gap: 8px; justify-content: flex-end; }`;
  document.head.appendChild(s);
}

function render() {
  const l = E.listing(city(), MX.lid), out = Object.keys(RECIPES[l.type].out)[0];
  const el = document.getElementById('mixer') || Object.assign(document.createElement('div'), { id: 'mixer' });
  el.innerHTML = `<div class="mx" role="dialog" aria-label="Concrete mixer"><h2>Mixing ${N(MX.qty)} t of ${esc(GOODS[out].name.toLowerCase())}</h2>
    <p class="mx-sub">The cement, sand, gravel and water drift as the drum turns. Move the sliders to keep every line in its green band.</p>
    <div class="mx-top"><div class="mx-time" id="mx-time"></div><div class="mx-q"><small>Mix quality</small><div class="mx-bar"><i id="mx-q"></i></div></div></div>
    ${PARTS.map((g) => `<div class="mx-row" id="mx-r-${g}"><div class="mx-head"><b>${esc(GOODS[g].name)}</b><span id="mx-v-${g}"></span></div>
      <div class="mx-gauge"><div class="mx-band" style="left:${(MX.target[g] - tol(g)) * 100}%;width:${tol(g) * 200}%"></div><div class="mx-dot" id="mx-d-${g}"></div></div>
      <small>Feed</small><input type="range" min="1" max="100" step="1" value="${Math.round(MX.feed[g])}" data-mx="${g}" aria-label="${esc(GOODS[g].name)} feed"></div>`).join('')}
    <div class="mx-msg" id="mx-msg"></div>
    <div class="mx-btns" id="mx-btns"><button class="btn" data-mxa="quit">Stop and throw out</button></div></div>`;
  if (!el.parentNode) document.body.appendChild(el);
  el.querySelectorAll('input[data-mx]').forEach((inp) => inp.addEventListener('input', () => { MX.feed[inp.dataset.mx] = Number(inp.value); }));
  el.addEventListener('click', onClick);
  paint();
}
function paint() {
  const sh = shares(), left = Math.max(0, MX.end - now());
  const secs = Math.ceil(left / 1000); document.getElementById('mx-time').textContent = left > 0 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : 'Done';
  const q = document.getElementById('mx-q'); q.style.width = MX.q + '%'; q.style.background = MX.q < 30 ? 'var(--bad)' : MX.q < 60 ? 'var(--gold)' : 'var(--good)';
  PARTS.forEach((g) => { const off = Math.abs(sh[g] - MX.target[g]) > tol(g);
    document.getElementById('mx-r-' + g).classList.toggle('off', off);
    document.getElementById('mx-v-' + g).textContent = `${Math.round(sh[g] * 100)}% · aim ${Math.round(MX.target[g] * 100)}%`;
    document.getElementById('mx-d-' + g).style.left = Math.min(100, sh[g] * 100) + '%'; });
  const msg = document.getElementById('mx-msg');
  if (MX.done) return;
  if (left <= 0) { msg.textContent = 'Time is up. Bring every line into its band to pour the batch.'; msg.className = 'mx-msg'; }
  else if (!inBand(sh)) { msg.textContent = 'The mix is off. Correct the red line.'; msg.className = 'mx-msg bad'; }
  else { msg.textContent = 'The mix is right.'; msg.className = 'mx-msg good'; }
}
function tick() {
  if (!MX || MX.done) return;
  const t = now(), dt = Math.min(0.5, (t - MX.last) / 1000); MX.last = t;
  // each material wanders slowly, pulled back toward normal so the game stays fair
  PARTS.forEach((g) => { MX.vel[g] += (Math.random() - 0.5) * 0.35 * dt - (MX.drift[g] - 1) * 0.12 * dt; MX.vel[g] *= 0.97; MX.drift[g] = Math.max(0.55, Math.min(1.6, MX.drift[g] + MX.vel[g] * dt)); });
  const ok = inBand(shares());
  MX.q = Math.max(0, Math.min(100, MX.q + (ok ? HEAL : -DRAIN) * dt));
  if (MX.q <= 0) return finish(false);
  if (t >= MX.end && ok) return finish(true);
  paint();
}
async function finish(good) {
  MX.done = true; clearInterval(MX.timer);
  const msg = document.getElementById('mx-msg'), btns = document.getElementById('mx-btns');
  msg.textContent = good ? 'Pouring the batch…' : 'The mix failed.'; msg.className = 'mx-msg ' + (good ? 'good' : 'bad');
  btns.innerHTML = '';
  const r = await MX.act('mixEnd', { lid: MX.lid, ok: good });
  if (!document.getElementById('mixer')) return;
  msg.textContent = r && r.msg ? r.msg : good ? 'Done.' : 'The batch was thrown out.';
  msg.className = 'mx-msg ' + (good && r && r.ok && !r.ruined ? 'good' : 'bad');
  btns.innerHTML = '<button class="btn gold" data-mxa="close">Close</button>';
}
function onClick(e) {
  const b = e.target.closest('[data-mxa]'); if (!b) return;
  if (b.dataset.mxa === 'quit' && MX && !MX.done) { if (b.dataset.sure) finish(false); else { b.dataset.sure = '1'; b.textContent = 'Sure? The batch is lost'; b.classList.add('danger'); } return; }
  if (b.dataset.mxa === 'close') close();
}
export function closeMixer() { if (MX) clearInterval(MX.timer); MX = null; const el = document.getElementById('mixer'); if (el) el.remove(); }
const close = closeMixer;
export const mixerOpen = (lid) => !!MX && MX.lid === lid;

// open the mixer for the batch in this company's drum (also after a reload: the clock runs from the server's start)
export function openMixer(lid, act) {
  const l = E.listing(city(), lid), b = l && l.ops && l.ops.batch; if (!b) return false;
  if (MX && MX.lid === lid) return true;
  closeMixer(); css();
  const target = targets(l);
  MX = { lid, act, qty: b.qty, target, end: Math.max(now() + 1000, E.OPS.mixDue(b)), q: 100, last: now(), done: false,
    feed: Object.fromEntries(PARTS.map((g) => [g, Math.round(target[g] * 100)])), drift: Object.fromEntries(PARTS.map((g) => [g, 1])), vel: Object.fromEntries(PARTS.map((g) => [g, 0])) };
  render(); MX.timer = setInterval(tick, 100);
  return true;
}
