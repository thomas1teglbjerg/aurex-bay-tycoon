// Sign-up / log-in, avatar name and founding the parent company (the first thing a new tycoon does).
import * as E from '../supabase/functions/_shared/engine.js';
import { BRAND_COLORS, BRAND_FONTS, BRAND_SYMBOLS, NAME_ENDINGS, MIN_STAKE } from '../supabase/functions/_shared/brand.js';
import { esc, M } from './util.js';
import { logoFull, logoMark, symbolIcon } from './brand.js';

const BR = E.BR;
const intro = (c) => c ? `<p>Aurex Bay never sleeps. The city has been running for ${c.m} months, and ${Object.values(c.players).length} tycoons compete for its companies.</p>` : '<p>Aurex Bay never sleeps. Your companies earn money in real time, also while you are away.</p>';
const err = (st) => (st.err ? `<p class="ob-err" role="alert">${esc(st.err)}</p>` : st.note ? `<p class="ob-note" role="status">${esc(st.note)}</p>` : '');
const nameFields = (st) => `<div class="ob-two"><div class="field"><label for="ob-first">First name</label><input id="ob-first" maxlength="14" autocomplete="given-name" value="${esc(st.first || '')}"></div>
  <div class="field"><label for="ob-last">Last name</label><input id="ob-last" maxlength="18" autocomplete="family-name" value="${esc(st.last || '')}"></div></div>`;

// ---------------------------------------------------------------- account
export function authHTML(st, c) {
  const up = st.view === 'signup', reset = st.view === 'reset';
  return `<div class="sheet ob"><span class="cap">Live city</span><h2>Aurex Bay Tycoon</h2>${intro(c)}
    <div class="seg ob-seg" role="tablist"><button data-a="obView" data-v="signup" aria-pressed="${up}">Create account</button><button data-a="obView" data-v="login" aria-pressed="${!up && !reset}">Log in</button></div>
    <form class="ob-form" data-form="auth">
      ${up ? `${nameFields(st)}<p class="ob-hint">Your avatar name. Other tycoons see it in the city.</p>` : ''}
      <div class="field"><label for="ob-email">E-mail</label><input id="ob-email" type="email" autocomplete="email" required value="${esc(st.email || '')}"></div>
      ${reset ? '' : `<div class="field"><label for="ob-pw">Password</label><input id="ob-pw" type="password" minlength="8" autocomplete="${up ? 'new-password' : 'current-password'}" required>${up ? '<p class="ob-hint">At least 8 characters.</p>' : ''}</div>`}
      ${err(st)}
      <button class="btn gold ob-go" type="submit" ${st.busy ? 'disabled' : ''}>${st.busy ? 'One moment…' : up ? 'Create account' : reset ? 'Send reset link' : 'Log in'}</button>
    </form>
    ${up ? '<p class="ob-hint">Everything you build is saved to your account, so you can carry on from any device.</p>' : reset ? '<button class="linkbtn" data-a="obView" data-v="login">Back to log in</button>' : '<button class="linkbtn" data-a="obView" data-v="reset">Forgot your password?</button>'}
    <p class="ob-hint"><a href="?demo=1">Try the offline demo</a> without an account.</p></div>`;
}
// signed in but no tycoon in this city yet (or an older player without first + last name)
export function avatarHTML(st) {
  return `<div class="sheet ob"><span class="cap">Step 1 of 2</span><h2>Your avatar</h2><p>Choose the first and last name other tycoons will know you by.</p>
    <form class="ob-form" data-form="avatar">${nameFields(st)}${err(st)}<button class="btn gold ob-go" type="submit" ${st.busy ? 'disabled' : ''}>${st.busy ? 'One moment…' : 'Continue'}</button></form></div>`;
}
export function passwordHTML(st, title) {
  return `<div class="sheet ob"><span class="cap">Your account</span><h2>${esc(title)}</h2>
    <form class="ob-form" data-form="password"><div class="field"><label for="ob-pw">New password</label><input id="ob-pw" type="password" minlength="8" autocomplete="new-password" required><p class="ob-hint">At least 8 characters.</p></div>${err(st)}
    <button class="btn gold ob-go" type="submit" ${st.busy ? 'disabled' : ''}>Save password</button></form></div>`;
}
// an older guest player: keep the tycoon, add e-mail + password
export function secureHTML(st, p) {
  return `<div class="sheet ob"><span class="cap">Save your city</span><h2>Add e-mail and password</h2><p>${esc(p.name)}, you play as a guest. Your empire is tied to this browser only. Add an e-mail and a password to keep it safe and play from any device.</p>
    <form class="ob-form" data-form="secure"><div class="field"><label for="ob-email">E-mail</label><input id="ob-email" type="email" autocomplete="email" required value="${esc(st.email || '')}"></div>
    <div class="field"><label for="ob-pw">Password</label><input id="ob-pw" type="password" minlength="8" autocomplete="new-password" required><p class="ob-hint">At least 8 characters.</p></div>${err(st)}
    <button class="btn gold ob-go" type="submit" ${st.busy ? 'disabled' : ''}>${st.busy ? 'One moment…' : 'Save my city'}</button></form>
    <button class="linkbtn" data-a="obLater">Later</button></div>`;
}

// ---------------------------------------------------------------- parent company
export function newFound() {
  return { mode: 'solo', base: '', end: 'Holding', color: 'navy', font: 'modern', sym: 'anchor', amt: 10, buyIn: 10, open: true, edit: false };
}
export const foundName = (f) => [f.base.trim(), f.end].filter(Boolean).join(' ');
export const foundBrand = (f) => ({ name: foundName(f) || 'Your Company', color: f.color, font: f.font, sym: f.sym });

export function foundHTML(f, c, p) {
  const edit = f.edit, parents = edit ? [] : BR.openParents(c, p.id);
  const head = edit ? `<span class="cap">Parent company</span><h2>Edit your logo</h2>` : `<span class="cap">Step 2 of 2 · before anything else</span><h2>Found your parent company</h2><p>Your empire runs under it: every company you buy, every deal you sign. Name, colour, font and symbol make your logo, and the whole city sees it.</p>`;
  const modes = edit ? '' : `<div class="ob-modes" role="radiogroup" aria-label="Ownership">
      <button role="radio" data-a="obMode" data-v="solo" aria-checked="${f.mode === 'solo'}"><b>On my own</b><span>You own 100% and decide alone.</span></button>
      <button role="radio" data-a="obMode" data-v="coop" aria-checked="${f.mode === 'coop'}"><b>With other players</b><span>Co-owned. Others join with a buy-in, now or later.</span></button>
      ${parents.length ? `<button role="radio" data-a="obMode" data-v="join" aria-checked="${f.mode === 'join'}"><b>Buy into one</b><span>${parents.length} co-owned parent ${parents.length === 1 ? 'company takes' : 'companies take'} new owners.</span></button>` : ''}</div>`;
  if (f.mode === 'join' && !edit) {
    return `<div class="sheet ob">${head}${modes}<div class="rows">${parents.map((h) => { const b = BR.holdingBrand(h), owners = Object.keys(h.members).map((id) => c.players[id]?.name).filter(Boolean);
      const buy = h.buyIn || MIN_STAKE;
      return `<div class="row ob-par">${logoMark(b, 40)}<div class="grow"><b>${esc(h.name)}</b><span>${esc(owners.join(', '))} · value ${M(E.holdingNav(c, h))}</span><span>Buy-in ${M(buy)}${h.invites.some((i) => i.pid === p.id) ? ' · you are invited' : ''}</span></div><button class="btn sm coop" data-a="obJoin" data-hid="${h.id}" ${p.cash < buy ? 'disabled' : ''}>Buy in</button></div>`; }).join('')}</div>
      ${err(f)}<p class="ob-hint">You have ${M(p.cash)}. Your stake grows with what you put in, and dividends follow your stake.</p></div>`;
  }
  const b = foundBrand(f);
  return `<div class="sheet ob">${head}${modes}
    <div class="ob-preview" id="ob-preview">${logoFull(b, { size: 46 })}</div>
    <div class="field"><label for="ob-base">Company name</label><div class="ob-name"><input id="ob-base" maxlength="24" autocomplete="off" placeholder="e.g. Halvorsen" value="${esc(f.base)}">
      <select id="ob-end" aria-label="Ending"><option value="">No ending</option>${NAME_ENDINGS.map((e) => `<option ${e === f.end ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select></div>
      <div class="ob-row"><p class="ob-hint">A name that could be on a stock exchange: a family name, a place or a word, plus an ending.</p><button class="linkbtn" data-a="obSuggest">Suggest</button></div></div>
    <div class="field"><label>Primary colour</label><div class="ob-colors" role="radiogroup" aria-label="Primary colour">${BRAND_COLORS.map((x) => `<button role="radio" data-a="obColor" data-v="${x.id}" aria-checked="${f.color === x.id}" style="background:${x.hex}" title="${esc(x.name)}" aria-label="${esc(x.name)}"></button>`).join('')}</div></div>
    <div class="field"><label>Font</label><div class="ob-fonts" role="radiogroup" aria-label="Font">${BRAND_FONTS.map((x) => `<button role="radio" data-a="obFont" data-v="${x.id}" aria-checked="${f.font === x.id}"><span style="font-family:${x.css};font-weight:${x.w};${x.up ? 'text-transform:uppercase;letter-spacing:.05em;' : ''}">${esc(foundName(f) || 'Aurex Bay')}</span><small>${esc(x.name)}</small></button>`).join('')}</div></div>
    <div class="field"><label>Symbol</label><div class="ob-syms" role="radiogroup" aria-label="Symbol">${BRAND_SYMBOLS.map((x) => `<button role="radio" data-a="obSym" data-v="${x.id}" aria-checked="${f.sym === x.id}" title="${esc(x.name)}" aria-label="${esc(x.name)}">${symbolIcon(x.id, 26)}</button>`).join('')}</div></div>
    ${f.mode === 'coop' && !edit ? `<div class="ob-two"><div class="field"><label>You put in</label><div class="stepper"><button data-a="obAmt" data-k="amt" data-v="-5" aria-label="Less">−</button><output class="num">${M(f.amt)}</output><button data-a="obAmt" data-k="amt" data-v="5" aria-label="More">+</button></div></div>
      <div class="field"><label>Buy-in for new owners</label><div class="stepper"><button data-a="obAmt" data-k="buyIn" data-v="-5" aria-label="Less">−</button><output class="num">${M(f.buyIn)}</output><button data-a="obAmt" data-k="buyIn" data-v="5" aria-label="More">+</button></div></div></div>
      <label class="ob-check"><input type="checkbox" id="ob-open" ${f.open ? 'checked' : ''}> Anyone can buy in. Untick to take invited players only.</label>
      <p class="ob-hint">The money goes into the shared treasury. You have ${M(p.cash)}; what is left stays yours.</p>` : ''}
    ${err(f)}
    <button class="btn gold ob-go" data-a="obFound" ${f.busy ? 'disabled' : ''}>${f.busy ? 'One moment…' : edit ? 'Save logo' : `Found ${esc(foundName(f) || 'my company')}`}</button>
    ${edit ? '<button class="linkbtn" data-a="close">Cancel</button>' : ''}</div>`;
}
// light refresh while typing, so the input keeps focus
export function foundPreview(f) {
  const el = document.getElementById('ob-preview'); if (el) el.innerHTML = logoFull(foundBrand(f), { size: 46 });
  document.querySelectorAll('.ob-fonts button span').forEach((s) => { s.textContent = foundName(f) || 'Aurex Bay'; });
  const go = document.querySelector('.ob-go[data-a="obFound"]'); if (go && !f.edit) go.textContent = `Found ${foundName(f) || 'my company'}`;
}
