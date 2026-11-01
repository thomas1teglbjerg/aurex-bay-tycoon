// The game's own right-click menu (instead of the browser's) and private chat between players.
// Right-click a player's icon in the top bar → "Chat with player". Messages are stored by the backend
// (Supabase table chat_messages online, localStorage in the demo) and arrive live.
import * as E from '../supabase/functions/_shared/engine.js';
import { city, $, esc } from './util.js';
import { symbolIcon } from './brand.js';

let H = null; // hooks from main.js: { B, toast, renderWho, navBack, setTab, initials }
const CH = { peer: null, msgs: [], unread: {}, poll: 0 };
export const unreadFrom = () => CH.unread;

// ---------------------------------------------------------------- context menu
let items = [];
const native = (e) => e.shiftKey || !!(e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]'));
function menuFor(e) {
  const c = city(), out = [], self = H.B.self || H.B.me;
  const chip = e.target.closest && e.target.closest('.who-c');
  if (chip && chip.dataset.pid && c && c.players[chip.dataset.pid]) {
    const id = chip.dataset.pid, p = c.players[id], b = E.BR.brandOf(c, id);
    out.push({ head: `${p.name}${b ? ' · ' + b.name : ''}` });
    if (id === self) out.push({ label: 'This is you', off: true });
    else out.push({ label: 'Chat with player', icon: 'chat', run: () => openChat(id) });
    if (chip.dataset.a === 'playAs') out.push({ label: 'Play as yourself', icon: 'back', run: () => chip.click() });
  } else if (chip && chip.classList.contains('adm')) {
    out.push({ head: 'Administrator' });
    out.push({ label: chip.dataset.id ? 'Play as the administrator' : 'Play as yourself', icon: 'back', run: () => chip.click() });
  }
  const sel = String(window.getSelection ? window.getSelection() : '').trim();
  if (sel) out.push({ label: 'Copy', icon: 'copy', run: () => navigator.clipboard && navigator.clipboard.writeText(sel).then(() => H.toast('Copied.', 'good'), () => {}) });
  if (out.length) out.push({ sep: true });
  out.push({ label: 'Back', icon: 'back', run: () => H.navBack() });
  out.push({ label: 'City map', icon: 'map', run: () => H.setTab('map') });
  out.push({ label: 'Reload', icon: 'reload', run: () => location.reload() });
  return out;
}
const ICONS = {
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  back: '<path d="M10 6 4 12l6 6M4 12h16"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  reload: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'
};
const ico = (k) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ''}</svg>`;
function showCtx(e) {
  if (native(e)) return;
  e.preventDefault();
  if (!H.B.city) return;
  items = menuFor(e);
  // a long press on a phone only opens the menu where it has something special (a player's icon), not while panning the map
  if (e.pointerType === 'touch' && !items.some((x) => x.head)) return;
  const m = $('ctx');
  m.innerHTML = items.map((x, i) => x.sep ? '<hr>' : x.head ? `<div class="ctx-h">${esc(x.head)}</div>`
    : `<button role="menuitem" data-i="${i}"${x.off ? ' disabled' : ''}>${ico(x.icon)}<span>${esc(x.label)}</span></button>`).join('');
  m.hidden = false;
  const r = m.getBoundingClientRect(), W = innerWidth, Hh = innerHeight;
  m.style.left = Math.max(6, Math.min(e.clientX, W - r.width - 6)) + 'px';
  m.style.top = Math.max(6, Math.min(e.clientY, Hh - r.height - 6)) + 'px';
  const first = m.querySelector('button:not([disabled])'); if (first) first.focus({ preventScroll: true });
}
function hideCtx() { const m = $('ctx'); if (m && !m.hidden) m.hidden = true; }
function ctxKeys(e) {
  const m = $('ctx'); if (m.hidden) return false;
  if (e.key === 'Escape') { hideCtx(); return true; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const bs = [...m.querySelectorAll('button:not([disabled])')]; if (!bs.length) return true;
    const i = bs.indexOf(document.activeElement), n = e.key === 'ArrowDown' ? (i + 1) % bs.length : (i - 1 + bs.length) % bs.length;
    bs[n].focus(); e.preventDefault(); return true;
  }
  return false;
}

// ---------------------------------------------------------------- chat window
const hm = (t) => { const d = new Date(t), now = new Date(), tm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); return d.toDateString() === now.toDateString() ? tm : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + tm; };
function headHTML() {
  const c = city(), id = CH.peer, p = c && c.players[id]; if (!p) return '';
  const b = E.BR.brandOf(c, id), col = b ? E.BR.colorHex(b.color) : '#55657d';
  const on = (H.B.online || []).find((o) => o.id === id), state = !on ? 'offline' : Date.now() - on.lastAct < 10 * 60 * 1000 ? 'active now' : 'online, inactive';
  return `<span class="who-c${on ? '' : ' idle'}" style="--c:${col}" aria-hidden="true">${b ? symbolIcon(b.sym, 22, 'rgba(255,255,255,0.32)') : ''}<b>${esc(H.initials(p).toUpperCase())}</b></span>
    <div><b>${esc(p.name)}</b><small>${b ? esc(b.name) + ' · ' : ''}${state}</small></div>
    <button type="button" class="chat-x" data-chat="close" aria-label="Close chat" title="Close">×</button>`;
}
function logHTML() {
  if (!CH.msgs.length) return `<p class="chat-empty">No messages yet. Say hello.${H.B.mode === 'local' ? ' In the offline demo, messages stay in this browser.' : ''}</p>`;
  const me = H.B.self || H.B.me;
  return CH.msgs.map((m) => `<div class="cm ${m.from === me ? 'mine' : 'theirs'}"><p>${esc(m.body)}</p><time>${hm(m.at)}</time></div>`).join('');
}
function renderChat(scroll) {
  const box = $('chat'); if (!box || !CH.peer) return;
  box.querySelector('.chat-hd').innerHTML = headHTML();
  const log = box.querySelector('.chat-log'), atEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  log.innerHTML = logHTML();
  if (scroll || atEnd) log.scrollTop = log.scrollHeight;
}
export async function openChat(peer) {
  const c = city(); if (!c || !c.players[peer]) return;
  hideCtx();
  const box = $('chat');
  if (CH.peer !== peer) { CH.peer = peer; CH.msgs = []; }
  box.hidden = false; renderChat(true);
  const inp = box.querySelector('input'); inp.focus({ preventScroll: true });
  CH.msgs = await H.B.chatLoad(peer); if (CH.peer !== peer) return;
  renderChat(true); markRead();
  clearInterval(CH.poll); CH.poll = setInterval(refresh, 20 * 1000); // live updates come by Realtime; this is a safety net
}
function closeChat() { $('chat').hidden = true; CH.peer = null; CH.msgs = []; clearInterval(CH.poll); }
async function refresh() {
  const peer = CH.peer; if (!peer || $('chat').hidden) return;
  const list = await H.B.chatLoad(peer); if (CH.peer !== peer) return;
  if (list.length !== CH.msgs.length || (list.length && list[list.length - 1].id !== CH.msgs[CH.msgs.length - 1].id)) { CH.msgs = list; renderChat(); }
  markRead();
}
function markRead() {
  const peer = CH.peer; if (!peer || document.hidden || !CH.unread[peer]) return;
  delete CH.unread[peer]; H.renderWho(); H.B.chatRead(peer);
}
async function send(form) {
  const inp = form.querySelector('input'), text = inp.value.trim(), peer = CH.peer; if (!text || !peer) return;
  const btn = form.querySelector('button'); btn.disabled = true;
  const r = await H.B.chatSend(peer, text); btn.disabled = false;
  if (!r || r.ok === false) { H.toast((r && r.msg) || 'The message was not sent.', 'bad'); return; }
  inp.value = '';
  if (CH.peer === peer && !CH.msgs.some((m) => m.id === r.m.id)) { CH.msgs.push(r.m); renderChat(true); }
  inp.focus({ preventScroll: true });
}
function incoming(m) {
  if (CH.peer === m.from && !$('chat').hidden) {
    if (!CH.msgs.some((x) => x.id === m.id)) { CH.msgs.push(m); renderChat(); }
    CH.unread[m.from] = (CH.unread[m.from] || 0) + 1; markRead(); return;
  }
  CH.unread[m.from] = (CH.unread[m.from] || 0) + 1; H.renderWho();
  const p = city() && city().players[m.from];
  if ($('chat').hidden) openChat(m.from); // nobody else is open: show the new conversation right away
  else H.toast(`New message from ${p ? p.name : 'a player'}. Click their icon to read it.`, 'good');
}

// ---------------------------------------------------------------- setup
export function initChat(hooks) {
  H = hooks;
  const app = $('app');
  const m = document.createElement('div'); m.id = 'ctx'; m.className = 'ctx'; m.setAttribute('role', 'menu'); m.hidden = true; app.appendChild(m);
  const box = document.createElement('section'); box.id = 'chat'; box.className = 'chat'; box.hidden = true; box.setAttribute('aria-label', 'Chat');
  box.innerHTML = `<header class="chat-hd"></header><div class="chat-log" role="log" aria-live="polite"></div>
    <form class="chat-f" autocomplete="off"><input maxlength="500" placeholder="Write a message…" aria-label="Message"><button type="submit">Send</button></form>`;
  app.appendChild(box);
  document.addEventListener('contextmenu', showCtx);
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#ctx')) hideCtx(); }, true);
  window.addEventListener('blur', hideCtx); window.addEventListener('resize', hideCtx);
  document.addEventListener('wheel', hideCtx, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (ctxKeys(e)) { e.stopPropagation(); return; }
    if (e.key === 'Escape' && !box.hidden && box.contains(document.activeElement)) closeChat();
  }, true);
  m.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; const it = items[+b.dataset.i]; hideCtx(); if (it && it.run) it.run(); });
  box.addEventListener('click', (e) => { if (e.target.closest('[data-chat="close"]')) closeChat(); });
  box.addEventListener('submit', (e) => { e.preventDefault(); e.stopPropagation(); send(e.target); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) markRead(); });
  if (H.B.onChat) H.B.onChat(incoming);
  let who = H.B.self; loadUnread();
  H.B.subscribe(() => { if (H.B.self !== who) { who = H.B.self; closeChat(); loadUnread(); } }); // signed in (or out) after the page opened
}
// unread messages waiting since the last visit: their senders show in the top bar with a badge
export async function loadUnread() {
  if (!H.B.chatUnread) return;
  const n = await H.B.chatUnread(); CH.unread = { ...n }; H.renderWho();
}
