// The game's own right-click menu (instead of the browser's) and private chat between players.
// Right-click a player's icon in the top bar → "Chat with player". Messages are stored by the backend
// (Supabase table chat_messages online, localStorage in the demo) and arrive live.
import * as E from '../supabase/functions/_shared/engine.js';
import { city, $, esc } from './util.js';
import { symbolIcon } from './brand.js';
import { helpAt, showHelp, hideHelp, initHelp } from './help.js';
import { canView } from './profile.js';

let H = null; // hooks from main.js: { B, toast, renderWho, navBack, setTab, initials, where }
const CH = { peer: null, msgs: [], unread: {}, poll: 0, inbox: {}, peers: [] };
export const unreadFrom = () => CH.unread;
// admins: unread messages waiting for the administrator / the test player while you play as someone else
export const inboxOf = (id) => (chatMe() === id ? 0 : CH.inbox[id] || 0);
const chatMe = () => !H ? null : H.B.chatMe || H.B.self || H.B.me; // who you write as: yourself, the administrator or the test player
const ADMIN_NAME = 'Administrator';
// rival tycoons (bots) answer in the browser with fixed replies (E.BOT.reply); the talk is kept in this browser only
const isBot = (id) => { const c = city(); return !!(c && c.players[id] && c.players[id].bot); };
const BKEY = (id) => `botchat:${chatMe()}:${id}`;
function botLoad(id) { try { return JSON.parse(localStorage.getItem(BKEY(id)) || '[]'); } catch { return []; } }
function botSave(id, msgs) { try { localStorage.setItem(BKEY(id), JSON.stringify(msgs.slice(-60))); } catch { /* private mode */ } }

// ---------------------------------------------------------------- context menu
let items = [];
const native = (e) => e.shiftKey || !!(e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]'));
function menuFor(e) {
  const c = city(), out = [], self = H.B.self || H.B.me, as = chatMe();
  const chip = e.target.closest && e.target.closest('.who-c');
  const id = chip && chip.dataset.pid, p = id && c && (c.players[id] || (id === E.ADMIN_ID ? { name: ADMIN_NAME } : null));
  if (p) {
    const b = c.players[id] ? E.BR.brandOf(c, id) : null, adm = id === E.ADMIN_ID;
    out.push({ head: `${p.name}${b && !adm ? ' · ' + b.name : ''}` });
    if (id === as || id === self) out.push({ label: 'Open chat', icon: 'chat', run: () => openChat() }); // your own icon: all your conversations
    const viewer = c.players[self]; if (c.players[id] && !c.players[id].bot && viewer && canView(c, viewer, id)) out.push({ label: id === self ? 'My profile' : 'View profile', icon: 'help', run: () => H.openProfile && H.openProfile(id) });
    if (id !== as) out.push({ label: adm ? 'Chat with administrator' : 'Chat with player', icon: 'chat', run: () => openChat(id) });
    if (chip.dataset.a === 'playAs') {
      const n = inboxOf(id);
      out.push({ label: chip.dataset.id ? `Play as ${adm ? 'the administrator' : 'the test player'}${n ? ` (${n} unread)` : ''}` : 'Play as yourself', icon: 'back', run: () => chip.click() });
    }
  }
  // Help: what the right-clicked thing is and what it does
  const hp = helpAt(e.target, H.where ? H.where() : {});
  if (hp && hp.d) { const x = e.clientX, y = e.clientY; out.push({ label: `Help: ${hp.t}`, icon: 'help', help: !hp.gen, run: () => showHelp(hp, x, y) }); }
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
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'
};
const ico = (k) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ''}</svg>`;
function showCtx(e) {
  if (native(e)) return;
  e.preventDefault();
  if (!H.B.city) return;
  // phones and tablets: a long press opens the menu (our own timer below, or the browser's contextmenu on Android), once
  if (e.long || e.pointerType === 'touch' || e.pointerType === 'pen') { if (Date.now() - LP.shown < 900) return; LP.shown = Date.now(); }
  items = menuFor(e);
  // a long press on a phone only opens the menu where it has something special (a player's icon), not while panning the map
  hideHelp();
  const m = $('ctx');
  m.innerHTML = items.map((x, i) => x.sep ? '<hr>' : x.head ? `<div class="ctx-h">${esc(x.head)}</div>`
    : `<button role="menuitem" data-i="${i}"${x.off ? ' disabled' : ''}>${ico(x.icon)}<span>${esc(x.label)}</span></button>`).join('');
  m.hidden = false;
  const r = m.getBoundingClientRect(), W = innerWidth, Hh = innerHeight;
  m.style.left = Math.max(6, Math.min(e.clientX, W - r.width - 6)) + 'px';
  m.style.top = Math.max(6, Math.min(e.clientY, Hh - r.height - 6)) + 'px';
  const first = m.querySelector('button:not([disabled])'); if (first) first.focus({ preventScroll: true });
}
// long press on touch screens (iOS Safari never fires contextmenu): hold still for LP.ms to open the menu
const LP = { ms: 520, timer: 0, x: 0, y: 0, id: null, fired: 0, shown: 0 };
function lpStart(e) {
  if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
  lpCancel();
  if (!e.isPrimary || e.target.closest('#ctx, #helpcard') || native(e)) return;
  LP.x = e.clientX; LP.y = e.clientY; LP.id = e.pointerId;
  const target = e.target;
  LP.timer = setTimeout(() => {
    LP.timer = 0; LP.fired = Date.now();
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (_) {}
    showCtx({ long: true, target, clientX: LP.x, clientY: LP.y, shiftKey: false, preventDefault() {} });
  }, LP.ms);
}
function lpMove(e) { if (LP.timer && e.pointerId === LP.id && Math.hypot(e.clientX - LP.x, e.clientY - LP.y) > 10) lpCancel(); }
function lpCancel() { clearTimeout(LP.timer); LP.timer = 0; }
// the finger lifting after a long press must not also tap what is under it
function lpSwallow(e) { if (Date.now() - LP.fired < 700 && !e.target.closest('#ctx, #helpcard')) { e.preventDefault(); e.stopPropagation(); } }
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
  const c = city(), id = CH.peer, adm = id === E.ADMIN_ID, p = c && (c.players[id] || (adm ? { name: ADMIN_NAME } : null)); if (!p) return '';
  const b = c.players[id] ? E.BR.brandOf(c, id) : null, col = b ? E.BR.colorHex(b.color) : adm ? '#33383f' : '#55657d';
  const shared = E.AS_IDS.includes(id), on = (H.B.online || []).find((o) => o.id === id);
  const state = isBot(id) ? 'rival tycoon · answers right away' : shared ? 'answers when an admin is on' : !on ? 'offline' : Date.now() - on.lastAct < 10 * 60 * 1000 ? 'active now' : 'online, inactive';
  const mine = chatMe() === E.ADMIN_ID ? ' · you write as the administrator' : chatMe() === E.TEST_ID ? ' · you write as the test player' : '';
  return `<span class="who-c${on || shared ? '' : ' idle'}${adm ? ' adm' : ''}" style="--c:${col}" aria-hidden="true">${b || adm ? symbolIcon(b ? b.sym : 'key', 22, 'rgba(255,255,255,0.32)') : ''}<b>${adm ? 'A' : esc(H.initials(p).toUpperCase())}</b></span>
    <div><b>${esc(p.name)}</b><small>${b && !adm ? esc(b.name) + ' · ' : ''}${state}${mine}</small></div>
    <button type="button" class="chat-x" data-chat="close" aria-label="Close chat" title="Close">×</button>`;
}
// one tab per conversation, newest first
const known = (id) => { const c = city(); return !!c && (!!c.players[id] || id === E.ADMIN_ID); };
function tabsHTML() {
  const c = city(), ids = CH.peers.filter(known);
  if (!ids.length) return '';
  return ids.map((id) => {
    const p = c.players[id] || { name: ADMIN_NAME }, adm = id === E.ADMIN_ID, b = c.players[id] ? E.BR.brandOf(c, id) : null;
    const col = b ? E.BR.colorHex(b.color) : adm ? '#33383f' : '#55657d', n = CH.unread[id] || 0;
    const short = adm ? 'Admin' : id === E.TEST_ID ? 'Test player' : p.first || String(p.name).split(' ')[0];
    return `<button type="button" role="tab" class="ct${id === CH.peer ? ' on' : ''}" data-tab-peer="${esc(id)}" aria-selected="${id === CH.peer}" title="${esc(p.name)}"><span style="--c:${col}">${adm ? 'A' : esc(H.initials(p).toUpperCase())}</span>${esc(short)}${n ? `<u>${n > 9 ? '9+' : n}</u>` : ''}</button>`;
  }).join('');
}
function logHTML() {
  if (!CH.msgs.length) return `<p class="chat-empty">No messages yet. Say hello.${H.B.mode === 'local' ? ' In the offline demo, messages stay in this browser.' : ''}</p>`;
  const me = chatMe();
  return CH.msgs.map((m) => `<div class="cm ${m.from === me ? 'mine' : 'theirs'}"><p>${esc(m.body)}</p><time>${hm(m.at)}</time></div>`).join('');
}
function renderChat(scroll) {
  const box = $('chat'); if (!box) return;
  const tabs = box.querySelector('.chat-tabs'), th = tabsHTML(); tabs.hidden = !th; if (tabs.dataset.h !== th) { tabs.dataset.h = th; tabs.innerHTML = th; const on = tabs.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  box.querySelector('.chat-f').hidden = !CH.peer;
  if (!CH.peer) { // opened from your own icon with no conversations yet
    box.querySelector('.chat-hd').innerHTML = `<div><b>Chat</b><small>${chatMe() === E.ADMIN_ID ? 'as the administrator' : chatMe() === E.TEST_ID ? 'as the test player' : 'your conversations'}</small></div><button type="button" class="chat-x" data-chat="close" aria-label="Close chat" title="Close">×</button>`;
    box.querySelector('.chat-log').innerHTML = '<p class="chat-empty">No conversations yet. Right-click a player\'s icon and pick "Chat with player".</p>'; return;
  }
  box.querySelector('.chat-hd').innerHTML = headHTML();
  const log = box.querySelector('.chat-log'), atEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  log.innerHTML = logHTML();
  if (scroll || atEnd) log.scrollTop = log.scrollHeight;
}
// openChat() with no player opens your conversations at the latest one
export async function openChat(peer) {
  hideCtx();
  const box = $('chat'), me = chatMe();
  if (!peer) {
    if (!box.hidden && CH.peer) return;
    CH.peers = (await H.B.chatPeers()).filter(known);
    peer = CH.peers.find((id) => CH.unread[id]) || CH.peers[0];
    if (!peer) { CH.peer = null; CH.msgs = []; box.hidden = false; renderChat(true); return; }
  }
  if (!known(peer) || chatMe() !== me) return;
  if (isBot(peer)) { // a rival tycoon: no server, fixed answers
    if (!CH.peers.includes(peer)) CH.peers.unshift(peer);
    CH.peer = peer; CH.msgs = botLoad(peer); box.hidden = false; clearInterval(CH.poll); renderChat(true);
    box.querySelector('input').focus({ preventScroll: true }); return;
  }
  if (!CH.peers.includes(peer)) CH.peers.unshift(peer);
  if (CH.peer !== peer) { CH.peer = peer; CH.msgs = []; }
  box.hidden = false; renderChat(true);
  H.B.chatPeers().then((ps) => { if (chatMe() !== me) return; const keep = CH.peers.filter((id) => !ps.includes(id)); CH.peers = keep.concat(ps).filter(known); renderChat(); });
  const inp = box.querySelector('input'); inp.focus({ preventScroll: true });
  CH.msgs = await H.B.chatLoad(peer); if (CH.peer !== peer) return;
  renderChat(true); markRead();
  clearInterval(CH.poll); CH.poll = setInterval(refresh, 20 * 1000); // live updates come by Realtime; this is a safety net
}
function closeChat() { $('chat').hidden = true; CH.peer = null; CH.msgs = []; CH.peers = []; clearInterval(CH.poll); }
const toFront = (id) => { CH.peers = [id].concat(CH.peers.filter((x) => x !== id)); };
async function refresh() {
  const peer = CH.peer; if (!peer || $('chat').hidden || isBot(peer)) return;
  const list = await H.B.chatLoad(peer); if (CH.peer !== peer) return;
  if (list.length !== CH.msgs.length || (list.length && list[list.length - 1].id !== CH.msgs[CH.msgs.length - 1].id)) { CH.msgs = list; renderChat(); }
  markRead();
}
function markRead() {
  const peer = CH.peer; if (!peer || document.hidden || !CH.unread[peer]) return;
  delete CH.unread[peer]; H.renderWho(); renderChat(); H.B.chatRead(peer);
}
async function send(form) {
  const inp = form.querySelector('input'), text = inp.value.trim(), peer = CH.peer; if (!text || !peer) return;
  if (isBot(peer)) {
    const me = chatMe(), add = (from, body) => { const list = botLoad(peer); list.push({ id: 'b' + Date.now() + Math.random().toString(36).slice(2, 5), from, body, at: Date.now() }); botSave(peer, list); if (CH.peer === peer) { CH.msgs = list; renderChat(true); } };
    add(me, text.slice(0, 500)); inp.value = ''; toFront(peer);
    setTimeout(() => { const c = city(); if (c && c.players[peer]) add(peer, E.BOT.reply(c, peer, me, text)); }, 700 + Math.random() * 900);
    return;
  }
  const btn = form.querySelector('button'); btn.disabled = true;
  const r = await H.B.chatSend(peer, text); btn.disabled = false;
  if (!r || r.ok === false) { H.toast((r && r.msg) || 'The message was not sent.', 'bad'); return; }
  inp.value = '';
  toFront(peer);
  if (CH.peer === peer && !CH.msgs.some((m) => m.id === r.m.id)) CH.msgs.push(r.m);
  renderChat(true);
  if (E.AS_IDS.includes(peer)) loadUnread(); // admins see the shared player's badge at once
  inp.focus({ preventScroll: true });
}
function incoming(m) {
  if (CH.peer === m.from && !$('chat').hidden) {
    if (!CH.msgs.some((x) => x.id === m.id)) { CH.msgs.push(m); renderChat(); }
    CH.unread[m.from] = (CH.unread[m.from] || 0) + 1; markRead(); return;
  }
  CH.unread[m.from] = (CH.unread[m.from] || 0) + 1; H.renderWho();
  const p = city() && city().players[m.from];
  if ($('chat').hidden) { openChat(m.from); return; } // nobody else is open: show the new conversation right away
  toFront(m.from); renderChat();
  H.toast(`New message from ${m.from === E.ADMIN_ID ? ADMIN_NAME : p ? p.name : 'a player'}. Open their tab to read it.`, 'good');
}

// ---------------------------------------------------------------- setup
export function initChat(hooks) {
  H = hooks;
  const app = $('app');
  const m = document.createElement('div'); m.id = 'ctx'; m.className = 'ctx'; m.setAttribute('role', 'menu'); m.hidden = true; app.appendChild(m);
  const box = document.createElement('section'); box.id = 'chat'; box.className = 'chat'; box.hidden = true; box.setAttribute('aria-label', 'Chat');
  box.innerHTML = `<header class="chat-hd"></header><nav class="chat-tabs" role="tablist" aria-label="Conversations" hidden></nav><div class="chat-log" role="log" aria-live="polite"></div>
    <form class="chat-f" autocomplete="off"><input maxlength="500" placeholder="Write a message…" aria-label="Message"><button type="submit">Send</button></form>`;
  app.appendChild(box);
  initHelp();
  document.addEventListener('contextmenu', showCtx);
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#ctx')) hideCtx(); }, true);
  document.addEventListener('pointerdown', lpStart, true);
  document.addEventListener('pointermove', lpMove, true);
  ['pointerup', 'pointercancel', 'scroll'].forEach((k) => document.addEventListener(k, lpCancel, true));
  document.addEventListener('click', lpSwallow, true);
  window.addEventListener('blur', hideCtx); window.addEventListener('resize', hideCtx);
  document.addEventListener('wheel', hideCtx, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (ctxKeys(e)) { e.stopPropagation(); return; }
    if (e.key === 'Escape' && !box.hidden && box.contains(document.activeElement)) closeChat();
  }, true);
  m.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; const it = items[+b.dataset.i]; hideCtx(); if (it && it.run) it.run(); });
  box.addEventListener('click', (e) => {
    if (e.target.closest('[data-chat="close"]')) { closeChat(); return; }
    const t = e.target.closest('[data-tab-peer]'); if (t && t.dataset.tabPeer !== CH.peer) openChat(t.dataset.tabPeer);
  });
  box.addEventListener('submit', (e) => { e.preventDefault(); e.stopPropagation(); send(e.target); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) markRead(); });
  if (H.B.onChat) H.B.onChat(incoming);
  let who = chatMe(); loadUnread();
  H.B.subscribe(() => { if (chatMe() !== who) { who = chatMe(); closeChat(); loadUnread(); } }); // signed in, or switched to/from the administrator
  setInterval(() => { if (!document.hidden) loadUnread(); }, 45 * 1000); // the administrator's inbox has no live feed
}
// unread messages waiting since the last visit: their senders show in the top bar with a badge
export async function loadUnread() {
  if (!H.B.chatUnread) return;
  const n = await H.B.chatUnread(); CH.unread = { ...n };
  if (CH.peer && CH.unread[CH.peer] && !$('chat').hidden) refresh();
  CH.inbox = H.B.chatInboxes ? await H.B.chatInboxes() : {};
  if (!$('chat').hidden) renderChat();
  H.renderWho();
}
