// Two interchangeable backends with the same surface:
//   LocalBackend   — the whole city runs in this browser (demo, no login, bots as rivals)
//   OnlineBackend  — the city lives in Supabase; the Edge Function runs the same engine server-side.
//                    Players sign in with e-mail + password, so their city follows them to any device.
import * as E from '../supabase/functions/_shared/engine.js';

const CITY_KEY = 'aurex-city-v2', ME_KEY = 'aurex-me-v2', ACT_KEY = 'aurex-lastact-', AS_KEY = 'aurex-as';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: demo still runs for this visit */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
};

export function createLocalBackend(opts = {}) {
  const subs = new Set();
  let city = null, me = store.get(ME_KEY);
  try { const raw = opts.city || JSON.parse(store.get(CITY_KEY) || 'null'); if (raw && raw.v === 2) city = raw; } catch (e) { city = null; }
  if (!city) { city = E.createCity(Date.now(), { speed: 2016 }); me = null; }
  if (opts.me) me = opts.me;
  if (me && !city.players[me]) me = null;
  let dirty = true, lastSave = 0;
  const save = (force) => { const t = Date.now(); if (force || t - lastSave > 4000) { store.set(CITY_KEY, JSON.stringify(city)); lastSave = t; } };
  const emit = () => subs.forEach((f) => f());
  let lastAct = Number(store.get(ACT_KEY + me)) || Date.now();
  const localPres = new Set();
  // ?admin=1 in the demo tries out the administrator player on this device
  const adminDemo = /[?&]admin=1\b/.test(location.search);
  let as = adminDemo && E.AS_IDS.includes(store.get(AS_KEY)) && city.players[store.get(AS_KEY)] ? store.get(AS_KEY) : null;
  const acting = () => (as && me && city.players[as] ? as : me);
  return {
    mode: 'local', canSetSpeed: true, admin: adminDemo,
    get self() { return me; },
    // who is online: in the demo only you are; bots are not players at a screen
    get online() { return me ? [{ id: me, lastAct }] : []; },
    onPresence(f) { localPres.add(f); },
    // any action (or click/key in the game) marks you active again
    touch() { if (!me) return; const t = Date.now(); if (t - lastAct < 1000) return; lastAct = t; store.set(ACT_KEY + me, String(t)); localPres.forEach((f) => f()); },
    // chat: kept in this browser in the demo; as the administrator you answer the administrator's inbox
    ...localChat(acting),
    get chatMe() { return acting(); },
    // admins: unread messages waiting for the administrator and the test player, { admin: n, tester: n }
    async chatInboxes() { const n = {}; if (!adminDemo) return n; for (const id of E.AS_IDS) n[id] = Object.values(await localChat(() => id).chatUnread()).reduce((a, b) => a + b, 0); return n; },
    get city() { return city; }, get me() { return acting(); },
    async playAs(who) {
      if (E.AS_IDS.includes(who)) { if (!adminDemo) return { ok: false, msg: 'Only an admin can switch to that player.' }; E.ensureAs(city, who, Date.now()); as = who; } else as = null;
      store.set(AS_KEY, as || ''); save(true); emit(); return { ok: true };
    },
    async join({ first, last } = {}) { const av = E.BR.checkAvatarName(first, last); if (!av.ok) return av; me = 'local-' + Math.random().toString(36).slice(2, 9); store.set(ME_KEY, me); lastAct = Date.now(); E.addPlayer(city, me, av.name, Date.now(), av); save(true); emit(); return { ok: true }; },
    async act(action, args) { this.touch(); const r = E.apply(city, acting(), action, args, Date.now()); save(true); emit(); return r; },
    tick() { const w = city.wk, over = city.over; E.advance(city, Date.now()); save(); if (city.wk !== w || city.over !== over) emit(); },
    async setSpeed(s) { E.setSpeed(city, s, Date.now()); save(true); emit(); },
    async reset() { store.del(CITY_KEY); store.del(ME_KEY); city = E.createCity(Date.now(), { speed: city.clock.speed }); me = null; save(true); emit(); },
    subscribe(f) { subs.add(f); },
    snapshot() { return { city, me }; }
  };
}

// Private chat between two players. Same surface in both backends:
//   chatLoad(peer) → [{ id, from, to, body, at, read }] oldest first
//   chatSend(peer, body), chatRead(peer), chatUnread() → { [from]: n }, onChat(f) (f gets each new incoming message)
const CHAT_KEY = 'aurex-chat-v1', CHAT_MAX = 500;
const cleanMsg = (b) => String(b || '').replace(/\s+/g, ' ').trim();
function localChat(who) {
  const subs = new Set();
  const all = () => { try { return JSON.parse(store.get(CHAT_KEY) || '[]'); } catch (e) { return []; } };
  const pair = (m, a, b) => (m.from === a && m.to === b) || (m.from === b && m.to === a);
  return {
    async chatLoad(peer) { const m = who(); return all().filter((x) => pair(x, m, peer)).slice(-100); },
    async chatSend(peer, body) {
      const m = who(), text = cleanMsg(body);
      if (!m) return { ok: false, msg: 'Join the city first.' };
      if (!text) return { ok: false, msg: 'Write a message first.' };
      if (text.length > CHAT_MAX) return { ok: false, msg: `Keep it under ${CHAT_MAX} characters.` };
      if (peer === m) return { ok: false, msg: 'You cannot chat with yourself.' };
      const msg = { id: Date.now() + Math.random(), from: m, to: peer, body: text, at: Date.now(), read: false };
      store.set(CHAT_KEY, JSON.stringify(all().concat(msg).slice(-1000))); return { ok: true, m: msg };
    },
    async chatRead(peer) { const m = who(); store.set(CHAT_KEY, JSON.stringify(all().map((x) => (x.to === m && x.from === peer ? { ...x, read: true } : x)))); },
    async chatUnread() { const m = who(), n = {}; for (const x of all()) if (x.to === m && !x.read) n[x.from] = (n[x.from] || 0) + 1; return n; },
    onChat(f) { subs.add(f); }
  };
}

// Supabase sign-in messages, said the game's way
function authMsg(e) {
  const m = String((e && e.message) || e || '');
  if (/invalid login credentials/i.test(m)) return 'Wrong e-mail or password.';
  if (/already (registered|been registered)|already exists/i.test(m)) return 'That e-mail already has an account. Log in instead.';
  if (/password should be at least|weak password/i.test(m)) return 'Choose a password with at least 8 characters.';
  if (/rate limit|too many/i.test(m)) return 'Too many attempts. Wait a few minutes and try again.';
  if (/email not confirmed/i.test(m)) return 'Confirm your e-mail first: open the link we sent you.';
  if (/invalid.*email|email.*invalid/i.test(m)) return 'That e-mail address does not look right.';
  return m || 'Something went wrong. Try again.';
}
const back = () => location.origin + location.pathname;

export async function createOnlineBackend(cfg) {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  let { data: { session } } = await sb.auth.getSession();
  const subs = new Set(), cityId = cfg.CITY_ID || 'aurex-bay';
  let city = null, live = false, admin = false, recovery = /type=recovery/.test(location.hash);
  const emit = () => subs.forEach((f) => f());
  const uid = () => (session ? session.user.id : null);
  // An admin can play the shared administrator tycoon; the server checks the account on every action.
  let as = E.AS_IDS.includes(store.get(AS_KEY)) ? store.get(AS_KEY) : null; // the administrator or the test player
  const self = () => (city && uid() && city.players[uid()] ? uid() : null);
  const acting = () => (as && admin && self() && city && city.players[as] ? as : self());
  const OWN = ['sync', 'join', 'adminPlay', 'adminSpeed']; // these never run as the administrator
  const meta = () => (session && session.user.user_metadata) || {};
  async function call(action, args = {}) {
    if (!session) return { ok: false, msg: 'Log in first.' };
    const asId = as && !OWN.includes(action) ? as : undefined;
    const { data, error } = await sb.functions.invoke('game', { body: { action, args, city: cityId, as: asId } });
    if (error) return { ok: false, msg: 'The server did not answer. Try again in a moment.' };
    if (data && 'admin' in data) admin = !!data.admin; // the server decides who is admin; this only shows the controls
    if (!admin && as) { as = null; store.set(AS_KEY, ''); }
    if (data && data.city) { city = data.city; emit(); }
    return (data && data.result) || { ok: true };
  }
  // Signed out you still see the living city behind the login screen (the row is public to read).
  async function peek() { const { data } = await sb.from('cities').select('state').eq('id', cityId).maybeSingle(); if (data && data.state) city = data.state; }
  async function goLive() { if (live) return; live = true; await call('sync'); setInterval(() => call('sync'), 90 * 1000); }
  async function enter() { // after any sign-in: load the city and move in if this account has no tycoon yet
    await goLive();
    if (city && !city.players[uid()] && meta().first && meta().last) await call('join', { first: meta().first, last: meta().last });
    return { ok: true };
  }
  sb.auth.onAuthStateChange((ev, s) => { session = s; if (ev === 'PASSWORD_RECOVERY') { recovery = true; emit(); } });
  if (session) await goLive(); else await peek();
  // Who is online: Realtime Presence. Each signed-in tycoon tracks { id, lastAct } (ms of their last game action);
  // the top bar dims players whose last action is older than 10 minutes.
  const presSubs = new Set(); let online = [], tracked = '';
  const room = sb.channel('online-' + cityId);
  room.on('presence', { event: 'sync' }, () => {
    const by = {};
    for (const metas of Object.values(room.presenceState())) for (const x of metas) if (x && x.id && (!by[x.id] || x.lastAct > by[x.id].lastAct)) by[x.id] = { id: x.id, lastAct: Number(x.lastAct) || 0 };
    online = Object.values(by); presSubs.forEach((f) => f());
  });
  let joined = false, lastAct = 0;
  const actKey = () => ACT_KEY + uid();
  let sentAct = 0; // lastAct the other browsers have; resent at most every 20 s
  async function track(force) {
    const id = city && uid() && city.players[uid()] ? uid() : null;
    if (!id || !joined) return;
    if (!lastAct) lastAct = Number(store.get(actKey())) || Date.now();
    const k = id + ':' + lastAct; if (!force && k === tracked) return;
    if (!force && lastAct - sentAct < 20000) return;
    tracked = k; const was = sentAct; sentAct = lastAct;
    let r = 'error'; try { r = await room.track({ id, lastAct }); } catch (e) { /* retried on the next action */ }
    if (r !== 'ok') { tracked = ''; sentAct = was; }
  }
  // mark yourself active: shown at once in your own bar, then shared through Presence
  function touch() {
    const id = uid(); if (!id) return;
    const t = Date.now(); if (t - lastAct < 1000) return;
    lastAct = t; store.set(actKey(), String(t));
    const mine = online.find((o) => o.id === id);
    if (mine) { mine.lastAct = t; presSubs.forEach((f) => f()); }
    track();
  }
  room.subscribe((st) => { if (st === 'SUBSCRIBED') { joined = true; track(true); } });
  subs.add(() => track());
  // Chat: rows in public.chat_messages; row level security shows each conversation only to its two players.
  const chatSubs = new Set(), UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // the administrator's inbox has a fixed id in the table; in the game it is the player 'admin'
  const DB_AS = Object.fromEntries(Object.entries(E.AS_CHAT).map(([k, v]) => [v, k]));
  const toDb = (id) => E.AS_CHAT[id] || id, fromDb = (id) => DB_AS[id] || id;
  const row = (r) => ({ id: r.id, from: fromDb(r.from_id), to: fromDb(r.to_id), body: r.body, at: Date.parse(r.created_at), read: !!r.read_at });
  const asAdm = () => E.AS_IDS.includes(acting()); // writing as the administrator or the test player goes through the game function, which checks the account
  async function admChat(op, more = {}) {
    const { data, error } = await sb.functions.invoke('game', { body: { action: 'adminChat', args: { op, as: acting(), ...more }, city: cityId } });
    if (error) return { ok: false, msg: 'The server did not answer. Try again in a moment.' };
    return (data && data.result) || { ok: false, msg: 'The server did not answer.' };
  }
  let chatOn = null;
  function chatLive() { // incoming messages arrive live once signed in
    const id = uid(); if (!id || chatOn === id) return; chatOn = id;
    sb.channel('chat-' + id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `to_id=eq.${id}` },
      (p) => { if (p.new && p.new.city_id === cityId && !asAdm()) chatSubs.forEach((f) => f(row(p.new))); }).subscribe();
  }
  subs.add(chatLive); chatLive();
  sb.channel('city-' + cityId).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cities', filter: `id=eq.${cityId}` }, (payload) => { if (payload.new && payload.new.state) { city = payload.new.state; emit(); } }).subscribe();
  return {
    mode: 'online', get canSetSpeed() { return admin; }, get admin() { return admin; },
    get city() { return city; }, get me() { return acting(); }, get self() { return self(); },
    async playAs(who) {
      if (E.AS_IDS.includes(who)) {
        if (!admin) return { ok: false, msg: 'Only an admin can switch to that player.' };
        const r = await call('adminPlay', { who }); if (r && r.ok === false) return r;
        if (!city || !city.players[who]) return { ok: false, msg: 'That player is not ready. Try again.' };
        as = who;
      } else as = null;
      store.set(AS_KEY, as || ''); emit(); return { ok: true };
    },
    // who is signed in: null when signed out; anon = an old guest session that still needs e-mail + password
    get account() { return session ? { email: session.user.email || '', anon: !!session.user.is_anonymous, first: meta().first || '', last: meta().last || '', needsPassword: !!meta().needs_password } : null; },
    get recovery() { return recovery; },
    async signUp({ email, password, first, last }) {
      const av = E.BR.checkAvatarName(first, last); if (!av.ok) return av;
      if (String(password || '').length < 8) return { ok: false, msg: 'Choose a password with at least 8 characters.' };
      const r = await sb.auth.signUp({ email: String(email || '').trim(), password, options: { data: { first: av.first, last: av.last }, emailRedirectTo: back() } });
      if (r.error) return { ok: false, msg: authMsg(r.error) };
      if (!r.data.session) return { ok: true, confirm: true, msg: 'Check your inbox and open the link to finish your account.' };
      session = r.data.session; return enter();
    },
    async signIn({ email, password }) {
      const r = await sb.auth.signInWithPassword({ email: String(email || '').trim(), password });
      if (r.error) return { ok: false, msg: authMsg(r.error) };
      session = r.data.session; return enter();
    },
    // an old guest (anonymous) player keeps their tycoon and adds e-mail + password to the same account
    async secure({ email, password }) {
      if (String(password || '').length < 8) return { ok: false, msg: 'Choose a password with at least 8 characters.' };
      const r1 = await sb.auth.updateUser({ email: String(email || '').trim(), data: { needs_password: true } }, { emailRedirectTo: back() });
      if (r1.error) return { ok: false, msg: authMsg(r1.error) };
      if (!r1.data.user.email) return { ok: true, confirm: true, msg: 'Check your inbox and open the link. Then choose your password.' };
      const r2 = await sb.auth.updateUser({ password, data: { needs_password: false } });
      if (r2.error) return { ok: false, msg: authMsg(r2.error) };
      session = (await sb.auth.getSession()).data.session; return { ok: true };
    },
    async setPassword(password) {
      if (String(password || '').length < 8) return { ok: false, msg: 'Choose a password with at least 8 characters.' };
      const r = await sb.auth.updateUser({ password, data: { needs_password: false } });
      if (r.error) return { ok: false, msg: authMsg(r.error) };
      session = (await sb.auth.getSession()).data.session; recovery = false; history.replaceState(null, '', back() + location.search); return enter();
    },
    async resetPassword(email) {
      const r = await sb.auth.resetPasswordForEmail(String(email || '').trim(), { redirectTo: back() });
      return r.error ? { ok: false, msg: authMsg(r.error) } : { ok: true, msg: 'If the e-mail has an account, a reset link is on its way.' };
    },
    async signOut() { await sb.auth.signOut(); location.reload(); },
    join: (o) => call('join', o),
    act(a, args) { touch(); return call(a, args); },
    touch,
    get online() { return online; },
    onPresence(f) { presSubs.add(f); },
    get chatMe() { return asAdm() ? acting() : self(); },
    async chatInboxes() {
      if (!admin) return {};
      const r = await admChat('inboxes'), n = {}; if (r.ok) for (const [k, v] of Object.entries(r.unread || {})) n[fromDb(k)] = v; return n;
    },
    async chatLoad(peer) {
      if (asAdm()) { const r = await admChat('load', { peer }); return r.ok ? r.rows.map(row) : []; }
      const m = uid(); peer = toDb(peer); if (!m || !UUID.test(peer)) return [];
      const { data, error } = await sb.from('chat_messages').select('id,from_id,to_id,body,created_at,read_at').eq('city_id', cityId)
        .or(`and(from_id.eq.${m},to_id.eq.${peer}),and(from_id.eq.${peer},to_id.eq.${m})`).order('created_at', { ascending: false }).limit(100);
      return error || !data ? [] : data.reverse().map(row);
    },
    async chatSend(peer, body) {
      const m = uid(), text = cleanMsg(body);
      if (!m || !self()) return { ok: false, msg: 'Join the city first.' };
      if (!text) return { ok: false, msg: 'Write a message first.' };
      if (text.length > CHAT_MAX) return { ok: false, msg: `Keep it under ${CHAT_MAX} characters.` };
      if (asAdm()) { const r = await admChat('send', { peer, body: text }); return r.ok ? { ok: true, m: row(r.row) } : r; }
      peer = toDb(peer);
      if (!UUID.test(peer) || peer === m) return { ok: false, msg: 'You can only chat with other players.' };
      const { data, error } = await sb.from('chat_messages').insert({ city_id: cityId, to_id: peer, body: text }).select('id,from_id,to_id,body,created_at,read_at').single();
      return error ? { ok: false, msg: 'The message was not sent. Try again in a moment.' } : { ok: true, m: row(data) };
    },
    async chatRead(peer) { if (asAdm()) { await admChat('read', { peer }); return; } const m = uid(); peer = toDb(peer); if (m && UUID.test(peer)) await sb.from('chat_messages').update({ read_at: new Date().toISOString() }).eq('city_id', cityId).eq('to_id', m).eq('from_id', peer).is('read_at', null); },
    async chatUnread() {
      if (asAdm()) { const r = await admChat('unread'), n = {}; if (r.ok) for (const [k, v] of Object.entries(r.unread || {})) n[fromDb(k)] = v; return n; }
      const m = uid(); if (!m) return {};
      const { data } = await sb.from('chat_messages').select('from_id').eq('city_id', cityId).eq('to_id', m).is('read_at', null).limit(500);
      const n = {}; for (const r of data || []) { const f = fromDb(r.from_id); n[f] = (n[f] || 0) + 1; } return n;
    },
    onChat(f) { chatSubs.add(f); },
    tick() { /* the server owns time; the client only interpolates live numbers */ },
    async setSpeed(speed) { return admin ? call('adminSpeed', { speed }) : { ok: false, msg: 'Only an admin can change the game speed.' }; },
    async reset() { return { ok: false, msg: 'Seasons are reset on the server.' }; },
    subscribe(f) { subs.add(f); }, snapshot() { return null; }
  };
}
