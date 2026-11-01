// Interactive 20-second tasks (sales calls, team meetings…) run inline in the box that started them.
// They live in SCENES, keep running while you navigate, and wait for your decision when they finish.
import * as E from '../supabase/functions/_shared/engine.js';
import { INTERACTIONS, COLLEAGUES } from '../supabase/functions/_shared/content.js';
import { city, esc, lname, deptIcon } from './util.js';
import { DEPT_TINT } from './company.js';

export const SCENES = {};
export const sceneKey = (lid, task) => `${lid}:${task}`;
export const sceneFor = (lid, task) => SCENES[sceneKey(lid, task)];

function levelFor(l, task) {
  const o = l.ops, last = o.hist[o.hist.length - 1];
  const v = { teamMeeting: o.morale, overtime: o.morale, findCustomers: o.rep, postCampaign: o.rep, reviewBooks: last && last.b2c + last.goods - last.sup > 0 ? 70 : 30, runExperiment: 40 + o.tech * 10 + (o.rp % 100) / 5, reviewContracts: o.legalUntil >= city().m ? 70 : 45 }[task] ?? 55;
  return v >= 65 ? 'high' : v < 40 ? 'low' : 'mid';
}
export function startScene(lid, task, from) {
  const l = E.listing(city(), lid), pool = COLLEAGUES.slice().sort(() => Math.random() - 0.5);
  const colors = ['#2f6fb0', '#c0392b', '#2e8b57', '#8e44ad', '#d35400', '#16a085'];
  const st = { key: sceneKey(lid, task), lid, task, from: from || 'todo', level: levelFor(l, task), start: Date.now(), phase: 'run', speakers: pool.slice(0, 4).map((name, i) => ({ name, color: colors[i % colors.length] })) };
  SCENES[st.key] = st; return st;
}
export function endScene(key) { delete SCENES[key]; }

export function sceneInline(st, showCompany) {
  const l = E.listing(city(), st.lid), it = INTERACTIONS[st.task]; if (!l || !it) return '';
  const t = Math.min(1, (Date.now() - st.start) / (it.seconds * 1000)), lines = it.lines[st.level];
  const shown = Math.min(st.speakers.length, Math.floor(t * (st.speakers.length + 1))), first = Math.max(0, shown - 2);
  const bubbles = st.speakers.slice(first, shown).map((sp, j) => { const i = first + j; return `<div class="bub ${i % 2 ? 'r' : ''}"><span class="av" style="background:${sp.color};--avc:${sp.color}">${esc(sp.name[0])}</span><div><b>${esc(sp.name)}</b><p>${esc(lines[i % lines.length])}</p></div></div>`; }).join('');
  const tint = DEPT_TINT[it.dept];
  const body = st.phase === 'decide' ? `<div class="is-ask"><b>${esc(it.ask)}</b><div class="is-opts">${it.options.map((op) => `<button class="opt" data-a="interChoose" data-k="${st.key}" data-v="${op.id}"><b>${esc(op.label)}</b><span>${esc(op.note)}</span></button>`).join('')}</div></div>`
    : st.phase === 'done' ? `<div class="is-done"><b>${esc(st.result || 'Done.')}</b><button class="btn sm" data-a="sceneClose" data-k="${st.key}">OK</button></div>`
    : `<div class="bubs" aria-live="polite">${bubbles || '<p class="muted">Getting started…</p>'}</div>`;
  const status = st.phase === 'run' ? `${Math.ceil(it.seconds * (1 - t))} s` : st.phase === 'decide' ? 'Your call' : 'Done';
  return `<div class="iscene ${st.phase}" data-scene="${st.key}" data-co="${showCompany ? 1 : 0}" style="--tint:${tint}">
    <div class="is-head"><span class="is-ic">${deptIcon(it.dept, 18)}</span><div class="grow"><b>${esc(it.title)}</b><span>${showCompany ? esc(lname(l)) + ' · ' : ''}${esc(it.scene)}</span></div><span class="chip ${st.phase === 'decide' ? 'warn' : st.phase === 'done' ? 'good' : ''}">${status}</span></div>
    ${st.phase === 'run' ? `<div class="bar is-bar"><i style="width:${(t * 100).toFixed(1)}%"></i></div>` : ''}
    ${body}</div>`;
}
// all scenes for a company (or every company) that belong in a given box
export function scenesHTML(filter, showCompany) {
  return Object.values(SCENES).filter(filter).map((st) => sceneInline(st, showCompany)).join('');
}
// called by the clock: moves finished scenes to the decision and refreshes running ones in place
let last = 0;
export function tickScenes(onPhase) {
  const now = Date.now(); let changed = null;
  Object.values(SCENES).forEach((st) => { const it = INTERACTIONS[st.task]; if (st.phase === 'run' && it && now - st.start >= it.seconds * 1000) { st.phase = 'decide'; changed = st; } });
  if (changed) { onPhase(changed); return; }
  if (now - last < 450) return; last = now;
  Object.values(SCENES).forEach((st) => { if (st.phase !== 'run') return; document.querySelectorAll(`[data-scene="${st.key}"]`).forEach((el) => { el.outerHTML = sceneInline(st, el.dataset.co === '1'); }); });
}
export const sceneTitle = (st) => `${INTERACTIONS[st.task].title} · ${lname(E.listing(city(), st.lid))}`;
