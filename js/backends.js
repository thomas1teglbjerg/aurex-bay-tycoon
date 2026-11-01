// Two interchangeable backends with the same surface:
//   LocalBackend   — the whole city runs in this browser (demo, no login, bots as rivals)
//   OnlineBackend  — the city lives in Supabase; the Edge Function runs the same engine server-side
import * as E from '../supabase/functions/_shared/engine.js';

const CITY_KEY = 'aurex-city-v2', ME_KEY = 'aurex-me-v2';
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
  return {
    mode: 'local', canSetSpeed: true,
    get city() { return city; }, get me() { return me; },
    async join(name) { me = 'local-' + Math.random().toString(36).slice(2, 9); store.set(ME_KEY, me); E.addPlayer(city, me, name, Date.now()); save(true); emit(); return { ok: true }; },
    async act(action, args) { const r = E.apply(city, me, action, args, Date.now()); save(true); emit(); return r; },
    tick() { const w = city.wk, over = city.over; E.advance(city, Date.now()); save(); if (city.wk !== w || city.over !== over) emit(); },
    async setSpeed(s) { E.setSpeed(city, s, Date.now()); save(true); emit(); },
    async reset() { store.del(CITY_KEY); store.del(ME_KEY); city = E.createCity(Date.now(), { speed: city.clock.speed }); me = null; save(true); emit(); },
    subscribe(f) { subs.add(f); },
    snapshot() { return { city, me }; }
  };
}

export async function createOnlineBackend(cfg) {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  let { data: { session } } = await sb.auth.getSession();
  if (!session) { const r = await sb.auth.signInAnonymously(); if (r.error) throw r.error; session = r.data.session; }
  const me = session.user.id, subs = new Set(), cityId = cfg.CITY_ID || 'aurex-bay';
  let city = null;
  const emit = () => subs.forEach((f) => f());
  async function call(action, args = {}) {
    const { data, error } = await sb.functions.invoke('game', { body: { action, args, city: cityId } });
    if (error) return { ok: false, msg: 'The server did not answer. Try again in a moment.' };
    if (data && data.city) { city = data.city; emit(); }
    return (data && data.result) || { ok: true };
  }
  await call('sync');
  sb.channel('city-' + cityId).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cities', filter: `id=eq.${cityId}` }, (payload) => { if (payload.new && payload.new.state) { city = payload.new.state; emit(); } }).subscribe();
  setInterval(() => call('sync'), 90 * 1000);
  return {
    mode: 'online', canSetSpeed: false,
    get city() { return city; }, get me() { return city && city.players[me] ? me : null; },
    join: (name) => call('join', { name }), act: (a, args) => call(a, args),
    tick() { /* the server owns time; the client only interpolates live numbers */ },
    async setSpeed() { return { ok: false, msg: 'Speed is set on the server.' }; },
    async reset() { return { ok: false, msg: 'Seasons are reset on the server.' }; },
    subscribe(f) { subs.add(f); }, snapshot() { return null; }
  };
}
