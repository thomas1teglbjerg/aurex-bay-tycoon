// The crane task at the end of each building phase (build.js): the trolley runs along the jib and the load swings
// under it. Drop each load when it hangs over its slot. Six loads in about 20 seconds; each one scores by how close it
// lands. The score (0–1) goes to the game as siteTask: it makes the builder's stars and can save a week.
import * as E from '../supabase/functions/_shared/engine.js';
import { city, esc } from './util.js';

const LOADS = 6, PER = 4000;           // loads, ms before a load drops by itself
const SKIN = { found: ['Concrete bucket', '#8b9198', 'formwork'], frame: ['Steel girder', '#d9822b', 'column'], close: ['Wall element', '#cdb48a', 'slot'], fit: ['Plant unit', '#4a7fb5', 'roof pad'] };
let CR = null;

function css() {
  if (document.getElementById('crane-css')) return;
  const s = document.createElement('style'); s.id = 'crane-css';
  s.textContent = `#crane { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; background: rgba(10,20,35,0.6); padding: 16px; }
  #crane .cr { width: min(560px, 100%); background: var(--panel); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.35); padding: 18px 18px 14px; }
  #crane h2 { margin: 0 0 2px; font-family: var(--head); font-size: 19px; }
  #crane .cr-sub { color: var(--ink-2); font-size: 13.5px; margin: 0 0 10px; }
  #crane .cr-top { display: flex; justify-content: space-between; font-weight: 700; font-size: 14px; margin-bottom: 6px; font-variant-numeric: tabular-nums; }
  #crane .cr-yard { position: relative; height: 230px; border-radius: 12px; overflow: hidden; background: linear-gradient(180deg, #bcd6ea 0%, #e6eef3 70%, #9a8f7d 70%, #8a7f6c 100%); touch-action: manipulation; cursor: pointer; user-select: none; }
  #crane .cr-jib { position: absolute; left: 0; right: 0; top: 18px; height: 10px; background: repeating-linear-gradient(90deg, #e3a81b 0 10px, #2b2b2b 10px 14px); }
  #crane .cr-trol { position: absolute; top: 14px; width: 26px; height: 16px; margin-left: -13px; background: #2b2b2b; border-radius: 3px; }
  #crane .cr-rope { position: absolute; top: 30px; width: 2px; margin-left: -1px; background: #333; transform-origin: top center; }
  #crane .cr-load { position: absolute; width: 58px; height: 22px; margin-left: -29px; border-radius: 4px; border: 2px solid rgba(0,0,0,.35); box-shadow: 0 3px 6px rgba(0,0,0,.25); display: grid; place-items: center; font-size: 10px; font-weight: 800; color: rgba(0,0,0,.6); }
  #crane .cr-slot { position: absolute; bottom: 30%; height: 14px; margin-bottom: -7px; border: 2px dashed #1f9d63; border-radius: 4px; background: rgba(31,157,99,.18); }
  #crane .cr-set { position: absolute; bottom: 30%; height: 22px; margin-bottom: -4px; border-radius: 4px; opacity: .85; border: 2px solid rgba(0,0,0,.3); }
  #crane .cr-msg { min-height: 20px; font-size: 14px; font-weight: 700; margin: 8px 0 10px; }
  #crane .cr-msg.good { color: var(--good); } #crane .cr-msg.bad { color: var(--bad); }
  #crane .cr-btns { display: flex; gap: 8px; justify-content: flex-end; }
  #crane .cr-drop { min-width: 140px; }`;
  document.head.appendChild(s);
}
const skin = () => SKIN[CR.phase] || SKIN.frame;
function newLoad() {
  CR.i++; CR.t0 = performance.now(); CR.dropAt = null;
  // each load starts at one end of the jib, so it sweeps over its slot at least once before it drops by itself
  CR.slot = 0.15 + Math.random() * 0.7; CR.speed = 0.45 + CR.i * 0.06; CR.phase0 = (Math.random() < 0.5 ? 0.5 : 1.5) * Math.PI;
}
// where the load hangs now: the trolley runs back and forth, the load swings a little behind it
function pos(t) { const a = (t - CR.t0) / 1000 * CR.speed * 2 + CR.phase0; return { trol: 0.5 + 0.42 * Math.sin(a), load: 0.5 + 0.42 * Math.sin(a - 0.35) }; }
function render() {
  const el = document.getElementById('crane') || Object.assign(document.createElement('div'), { id: 'crane' });
  const [name, col, where] = skin();
  el.innerHTML = `<div class="cr" role="dialog" aria-label="Crane task"><h2>${esc(CR.title)}</h2><p class="cr-sub">${esc(CR.verb)}. Tap the yard, press Space or the button when the ${esc(name.toLowerCase())} hangs over the green ${esc(where)}.</p>
    <div class="cr-top"><span id="cr-n"></span><span id="cr-s"></span></div>
    <div class="cr-yard" id="cr-yard"><div class="cr-jib"></div><div class="cr-trol" id="cr-trol"></div><div class="cr-rope" id="cr-rope"></div><div class="cr-slot" id="cr-slot"></div><div id="cr-done"></div><div class="cr-load" id="cr-load" style="background:${col}">${esc(name.split(' ')[0].toUpperCase())}</div></div>
    <div class="cr-msg" id="cr-msg"></div><div class="cr-btns" id="cr-btns"><button class="btn" data-cra="quit">Leave it to the crew</button><button class="btn gold cr-drop" data-cra="drop">Drop</button></div></div>`;
  if (!el.parentNode) document.body.appendChild(el);
  el.addEventListener('click', onClick);
  document.getElementById('cr-yard').addEventListener('pointerdown', (e) => { e.preventDefault(); drop(); });
}
function paint(t) {
  const yard = document.getElementById('cr-yard'); if (!yard) return;
  const W = yard.clientWidth, H = yard.clientHeight, p = pos(t), ground = H * 0.7;
  let ly = 60; if (CR.dropAt) ly = Math.min(ground - 11, 60 + (t - CR.dropAt) * 0.6);
  const lx = CR.dropAt ? CR.dropX : p.load;
  document.getElementById('cr-trol').style.left = (CR.dropAt ? CR.dropTrol : p.trol) * W + 'px';
  const rope = document.getElementById('cr-rope'), tx = (CR.dropAt ? CR.dropTrol : p.trol) * W, lxx = lx * W;
  rope.style.left = tx + 'px'; const dy = (CR.dropAt ? 60 : ly) - 30, dx = lxx - tx; rope.style.height = Math.hypot(dx, dy) + 'px'; rope.style.transform = `rotate(${-Math.atan2(dx, dy)}rad)`;
  const ld = document.getElementById('cr-load'); ld.style.left = lxx + 'px'; ld.style.top = ly + 'px';
  const sl = document.getElementById('cr-slot'), sw = CR.tol * 2 * W + 58; sl.style.left = CR.slot * W - sw / 2 + 'px'; sl.style.width = sw + 'px';
  document.getElementById('cr-n').textContent = `Load ${Math.min(CR.i, LOADS)} of ${LOADS}`;
  document.getElementById('cr-s').textContent = CR.scores.length ? `${Math.round(CR.scores.reduce((a, x) => a + x, 0) / CR.scores.length * 100)}% so far` : '';
}
function drop() {
  if (!CR || CR.done || CR.dropAt) return;
  const t = performance.now(), p = pos(t); CR.dropAt = t; CR.dropX = p.load; CR.dropTrol = p.trol;
  const off = Math.abs(p.load - CR.slot), sc = Math.max(0, 1 - off / (CR.tol * 2.2));
  CR.scores.push(sc);
  const msg = document.getElementById('cr-msg'); msg.textContent = sc >= 0.85 ? 'Spot on.' : sc >= 0.5 ? 'Close enough: the crew nudges it in.' : 'Missed: the crew has to re-rig it.'; msg.className = 'cr-msg ' + (sc >= 0.5 ? 'good' : 'bad');
  const yard = document.getElementById('cr-yard'), W = yard.clientWidth, [, col] = skin();
  setTimeout(() => { if (!CR || CR.done) return; const d = document.getElementById('cr-done'); if (d) d.insertAdjacentHTML('beforeend', `<div class="cr-set" style="left:${CR.dropX * W - 29}px;width:58px;background:${col}"></div>`); if (CR.i >= LOADS) finish(); else newLoad(); }, 550);
}
function tick() {
  if (!CR || CR.done) return;
  const t = performance.now();
  if (!CR.dropAt && t - CR.t0 > PER) drop();
  paint(t); CR.raf = requestAnimationFrame(tick);
}
async function finish() {
  CR.done = true; cancelAnimationFrame(CR.raf);
  const score = CR.scores.length ? CR.scores.reduce((a, x) => a + x, 0) / CR.scores.length : 0;
  const msg = document.getElementById('cr-msg'), btns = document.getElementById('cr-btns');
  msg.textContent = `${Math.round(score * 100)}%: sending it to the site office…`; msg.className = 'cr-msg'; btns.innerHTML = '';
  const r = await CR.act('siteTask', { lid: CR.lid, score: Math.round(score * 1000) / 1000 });
  if (!document.getElementById('crane')) return;
  msg.textContent = r && r.msg ? r.msg : 'Done.'; msg.className = 'cr-msg ' + (r && r.ok ? 'good' : 'bad');
  btns.innerHTML = '<button class="btn gold" data-cra="close">Close</button>';
}
function onClick(e) {
  const b = e.target.closest('[data-cra]'); if (!b) return;
  if (b.dataset.cra === 'drop') drop();
  if (b.dataset.cra === 'quit' || b.dataset.cra === 'close') closeCrane();
}
function onKey(e) { if (CR && !CR.done && (e.code === 'Space' || e.key === ' ')) { e.preventDefault(); drop(); } }
export function closeCrane() { if (CR) cancelAnimationFrame(CR.raf); CR = null; document.removeEventListener('keydown', onKey); const el = document.getElementById('crane'); if (el) el.remove(); }

export function openCrane(lid, act) {
  const l = E.listing(city(), lid), s = l && l.site; if (!s || s.st !== 'task') return false;
  closeCrane(); css();
  const ph = E.BLD.phase(s);
  CR = { lid, act, phase: ph.id, title: ph.task, verb: ph.verb, i: 0, scores: [], tol: 0.06, done: false };
  render(); newLoad(); document.addEventListener('keydown', onKey); CR.raf = requestAnimationFrame(tick);
  return true;
}
