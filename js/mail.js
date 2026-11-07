// Mail (Empire › Mail): staff, specialists, rivals and the Gazette write to you; many mails ask for an answer.
// The mails live in the city (p.mail, see _shared/mail.js). Which ones you have read is kept in this browser.
import * as E from '../supabase/functions/_shared/engine.js';
import { TALENT } from '../supabase/functions/_shared/content.js';
import { city, me, meId, esc, faceUrl, dateLabel, coImg, lname } from './util.js';
import { adHTML } from './web.js';
import { dealCard } from './deals.js';

const ML = E.MAIL;
const PERSON = Object.fromEntries(TALENT.map((t) => [t.id, t]));
const KEY = () => `ab-mail-read:${meId()}`;
let READ = null;
function readSet() {
  if (READ && READ.k === KEY()) return READ.s;
  let ids = []; try { ids = JSON.parse(localStorage.getItem(KEY()) || '[]'); } catch { /* private mode */ }
  READ = { k: KEY(), s: new Set(ids) }; return READ.s;
}
export function markRead(id) {
  const s = readSet(); if (s.has(id)) return; s.add(id);
  try { localStorage.setItem(KEY(), JSON.stringify([...s].slice(-200))); } catch { /* private mode */ }
}
export const isRead = (x) => readSet().has(x.id) || !!x.done;
export const mails = (p = me()) => (p && p.mail) || [];
export const unread = (p = me()) => mails(p).filter((x) => !isRead(x)).length;
export const toAnswer = (p = me()) => mails(p).filter(ML.isOpen).length;

const FOLDERS = [['all', 'Inbox'], ['open', 'To answer'], ['staff', 'Staff'], ['spec', 'Specialists'], ['news', 'Gazette']];
const inFolder = (x, f) => f === 'open' ? ML.isOpen(x) : f === 'staff' ? !x.from.tid && x.kind !== 'news' && !x.from.k : f === 'spec' ? !!x.from.tid : f === 'news' ? x.kind === 'news' : true;

const COLS = ['#2f6fb0', '#23905a', '#8e44ad', '#c0392b', '#b7950b', '#16a085', '#d35400', '#5d6d7e'];
const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLS[h % COLS.length]; };
const initials = (n) => String(n).split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
function face(x, cls = '') {
  const f = x.from;
  if (f.tid && PERSON[f.tid] && PERSON[f.tid].img) return `<span class="mface ${cls}" style="background-image:url(${faceUrl(f.tid)})"></span>`;
  if (x.kind === 'news' || f.k === 'press') return `<span class="mface gz ${cls}">G</span>`;
  if (f.k === 'city') return `<span class="mface city ${cls}">✦</span>`;
  if (f.k === 'bank') return `<span class="mface bank ${cls}">BA</span>`;
  return `<span class="mface ini ${cls}" style="--mc:${hue(f.n)}">${esc(initials(f.n))}</span>`;
}
const when = (x) => `${dateLabel(x.m)}${x.g != null ? ` · W${(Math.floor(x.g * 48 + 1e-6) % 4) + 1}` : ''}`;
const snippet = (x) => x.kind === 'news' ? (x.news || []).map((n) => n.t).join(' · ') : x.body || '';

function rowHTML(x, sel) {
  const open = ML.isOpen(x), rd = isRead(x);
  return `<button class="mrow ${rd ? '' : 'unread'} ${sel ? 'sel' : ''}" data-a="mailOpen" data-id="${x.id}">${face(x)}<span class="mrow-t"><span class="mrow-h"><b>${esc(x.from.n)}</b><time>${esc(when(x))}</time></span>
    <span class="mrow-s">${open ? '<i class="mtag">Reply needed</i>' : ''}${esc(x.subj)}</span><span class="mrow-x">${esc(snippet(x))}</span></span></button>`;
}

// the box at the top of Empire: the latest mails and a way into the mailbox
export function mailBoxHTML() {
  const list = mails(), n = unread(), a = toAnswer();
  return `<div class="box mailbox"><h2>Mail<small>${a ? `${a} TO ANSWER` : n ? `${n} UNREAD` : 'INBOX'}</small></h2><div class="in">
    ${list.length ? `<div class="mlist">${list.slice(0, 5).map((x) => rowHTML(x)).join('')}</div>` : '<p class="empty">No mail yet. Your staff will write when something happens in your companies.</p>'}
    <button class="btn" data-a="mailOpen" data-id="">Open mailbox${list.length > 5 ? ` · ${list.length}` : ''}</button></div></div>`;
}

function answerHTML(x) {
  if (x.done) {
    const o = x.opts[x.done.ix];
    const who = x.done.auto ? 'Autopilot answered' : x.done.by && x.done.by !== me().name ? `${esc(x.done.by)} answered` : 'You answered';
    return `<div class="mdone"><span class="cap">${o ? who : 'Closed'}</span>${o ? `<b>${esc(o.l)}</b>` : ''}${x.done.out ? `<p>${esc(x.done.out)}</p>` : ''}</div>`;
  }
  const due = x.dueM != null ? x.dueM : x.due != null ? x.due * 12 : null;
  return `<div class="mopts">${due != null ? `<span class="cap">Autopilot answers in <span data-live="until:${due}">…</span></span>` : '<span class="cap">Your answer</span>'}
    ${x.opts.map((o, i) => `<button class="opt" data-a="mailAnswer" data-id="${x.id}" data-opt="${i}"><b>${esc(o.l)}</b>${o.d ? `<span>${esc(o.d)}</span>` : ''}</button>`).join('')}</div>`;
}
function newsHTML(x) {
  const c = city(), ad = x.ad && E.listing(c, x.ad.lid) ? adHTML(x.ad) : '';
  return `<div class="mnews"><div class="mnews-mast"><b>The Aurex Bay Gazette</b><span>Business briefing · ${esc(dateLabel(Math.max(0, x.m - 1)))}</span></div>
    ${(x.news || []).map((n, i) => `<div class="mnews-item ${i === 0 ? 'lead' : ''}"><b>${esc(n.t)}</b>${n.x ? `<p>${esc(n.x)}</p>` : ''}</div>${i === 1 && ad ? `<div class="mnews-ad">${ad}</div>` : ''}`).join('')}
    ${ad && (x.news || []).length < 2 ? `<div class="mnews-ad">${ad}</div>` : ''}
    <p class="mnews-foot">You get this briefing every month. <button class="lnk" data-a="web" data-u="aurexgazette.ab">Read the Gazette ›</button></p></div>`;
}
function readerHTML(x) {
  const c = city(), p = me(), l = x.lid ? E.listing(c, x.lid) : null, mine = l && E.canSeeCompany(c, p.id, l);
  const first = String(p.name || '').split(' ')[0], sign = x.from.k ? x.from.n : String(x.from.n).split(' ')[0];
  const body = x.kind === 'news' ? newsHTML(x)
    : `<div class="mbody"><p>Hi ${esc(first)},</p>${String(x.body || '').split('\n').map((t) => `<p>${esc(t)}</p>`).join('')}${x.fxt ? `<p class="mfx">${esc(x.fxt.charAt(0).toUpperCase() + x.fxt.slice(1))}.</p>` : ''}<p class="msign">${x.from.k === 'city' ? 'Kind regards,' : 'Best,'}<br>${esc(sign)}</p></div>`;
  return `<article class="mread"><header>${face(x, 'lg')}<div><h3>${esc(x.subj)}</h3><span><b>${esc(x.from.n)}</b> · ${esc(x.from.r)}</span><time>${esc(when(x))}</time></div></header>
    ${body}${x.opts ? answerHTML(x) : ''}${x.deal ? (() => { const d = (c.deals || []).find((y) => y.id === x.deal); return d ? `<div class="mdeal">${dealCard(d)}</div>` : ''; })() : ''}${x.web ? `<p><button class="btn sm" data-a="web" data-u="${esc(x.web)}">Open ${esc(x.web.split('/')[0])} ›</button></p>` : ''}${x.go ? `<p><button class="btn sm" ${x.go.startsWith('report:') ? `data-a="report" data-v="${esc(x.go.slice(7))}:0"` : `data-a="tab" data-v="${esc(x.go)}"`}>${x.go.startsWith('report:') ? 'Open the annual report' : 'Open'} ›</button></p>` : ''}
    ${mine ? `<button class="row mco" data-a="company" data-lid="${l.id}"><span class="thumb" style="background-image:url(${coImg(l)})"></span><div class="grow"><b>Open ${esc(lname(l))}</b><span>${esc(l.district)} · company dashboard</span></div><span aria-hidden="true">›</span></button>` : ''}</article>`;
}
// the mailbox page (Empire › Mail). ui.company is 'mail' or 'mail:<id>', ui.mailF the folder
// admins: one mail from the city to every player (changelogs, announcements)
function sendAllHTML() {
  const n = Object.values(city().players).filter((p) => !p.bot && !p.admin).length;
  return `<div class="box"><form data-form="mailAll" class="msend"><p class="muted">Goes to every player's inbox (${n}) from <b>Aurex Bay City · What's new</b>. Each line is one paragraph; "Hi &lt;first name&gt;," and the sign-off are added.</p>
    <label>Subject<input name="subj" maxlength="80" required placeholder="What's new in Aurex Bay"></label>
    <label>Message<textarea name="body" maxlength="4000" required></textarea></label>
    <div><button class="btn" type="submit">Send to all players</button></div></form></div>`;
}
export function mailPageHTML(ui, admin = false) {
  const id = String(ui.company).split(':')[1] || '', f = ui.mailF === 'send' && !admin ? 'all' : ui.mailF || 'all', all = mails();
  const list = all.filter((x) => inFolder(x, f)), x = id && all.find((y) => y.id === id);
  if (x) markRead(x.id);
  const count = (k) => all.filter((y) => inFolder(y, k) && (k === 'open' || !isRead(y))).length;
  return `<div class="crumbs"><button class="btn sm" data-a="${x ? 'mailOpen' : 'back'}" data-id="">‹ ${x ? 'Mailbox' : 'Empire'}</button><span class="muted">${all.length} mail${all.length === 1 ? '' : 's'} · ${toAnswer()} waiting for an answer</span></div>
    <h2 class="ph1">Mail</h2>
    <div class="mfold" role="group">${[...FOLDERS, ...(admin ? [['send', 'Admin: write to all']] : [])].map(([k, t]) => { const n = k === 'send' ? 0 : count(k); return `<button data-a="mailFolder" data-v="${k}" aria-pressed="${f === k}">${t}${n ? `<u>${n}</u>` : ''}</button>`; }).join('')}</div>
    ${f === 'send' ? sendAllHTML() : `<div class="mailgrid ${x ? 'reading' : ''}"><div class="box mlistbox"><div class="mlist">${list.length ? list.map((y) => rowHTML(y, x && y.id === x.id)).join('') : '<p class="empty" style="padding:14px">Nothing here.</p>'}</div></div>
      <div class="box mreadbox">${x ? readerHTML(x) : '<p class="empty" style="padding:18px">Pick a mail to read it.</p>'}</div></div>`}`;
}
