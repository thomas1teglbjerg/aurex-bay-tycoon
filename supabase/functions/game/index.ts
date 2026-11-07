// Aurex Bay Tycoon — the game server.
// Every action from a browser comes here. The function loads the city, lets time catch up
// (income, World Cards, bots, autopilot decisions), applies the action with the same engine
// the demo uses, and saves with optimistic concurrency. A cron job calls it with
// { action: "tick" } every hour so the city keeps moving even when nobody is online.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import * as Engine from '../_shared/engine.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const SPEED = Number(Deno.env.get('GAME_SPEED') ?? '1'); // 1 = one game year per real week
// Admin accounts (time speed for everyone, test tools). The ADMIN_EMAILS secret (comma-separated) overrides this list.
const ADMIN_LIST = ['thomas@teglbjerg.com', 'mikkel@teglbjerg.com'];
const ADMINS = (Deno.env.get('ADMIN_EMAILS') ?? ADMIN_LIST.join(',')).split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body: { action?: string; args?: Record<string, unknown>; city?: string; as?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const action = String(body.action ?? 'sync');
  const cityId = String(body.city ?? 'aurex-bay').slice(0, 40);
  const args = body.args ?? {};

  // Who is calling? Cron uses a shared secret; players use their Supabase session (e-mail + password; older anonymous players keep playing).
  let userId: string | null = null;
  let user: { id: string; email?: string; is_anonymous?: boolean; user_metadata?: Record<string, unknown> } | null = null;
  if (action === 'tick') {
    if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return json({ error: 'Forbidden' }, 403);
  } else {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return json({ error: 'Sign in first' }, 401);
    userId = data.user.id; user = data.user;
  }
  const isAdmin = !!user && !user.is_anonymous && ADMINS.includes(String(user.email ?? '').toLowerCase());
  if (action === 'adminSpeed' && !isAdmin) return json({ result: { ok: false, msg: 'Only an admin can change the game speed.' } });
  if (action === 'adminMove' && !isAdmin) return json({ result: { ok: false, msg: 'Only an admin can move companies on the map.' } });
  if (action === 'adminHouseAd' && !isAdmin) return json({ result: { ok: false, msg: 'Only an admin can change the house ad.' } });
  if (action === 'adminMailAll' && !isAdmin) return json({ result: { ok: false, msg: 'Only an admin can write to every player.' } });
  if (action === 'adminYearEnd' && !isAdmin) return json({ result: { ok: false, msg: 'Only an admin can close the books.' } });
  // The administrator (unlimited money) and the test player: only admin accounts may create them or act as them.
  const asId = Engine.AS_IDS.includes(String(body.as)) ? String(body.as) : null;
  const asAdmin = asId === Engine.ADMIN_ID;
  if ((asId || action === 'adminPlay') && !isAdmin) return json({ result: { ok: false, msg: 'Only an admin can switch to that player.' }, admin: false });
  if (asId && action === 'join') return json({ result: { ok: false, msg: 'Switch back to your own tycoon first.' }, admin: true });
  const out = (body: Record<string, unknown>) => json({ ...body, admin: isAdmin });
  if (action === 'adminChat') return out({ result: await adminChat(cityId, args, isAdmin) });

  for (let attempt = 0; attempt < 6; attempt++) {
    const now = Date.now();
    const { data: row, error } = await admin.from('cities').select('state, version').eq('id', cityId).maybeSingle();
    if (error) return json({ error: error.message }, 500);

    if (!row) { // first visit ever: create the city
      const fresh = Engine.createCity(now, { id: cityId, speed: SPEED });
      const { error: insErr } = await admin.from('cities').insert({ id: cityId, state: fresh, version: 0 });
      if (insErr && !String(insErr.message).includes('duplicate')) return json({ error: insErr.message }, 500);
      continue;
    }

    const city = row.state;
    const weekBefore = city.wk, agendaBefore = (city.agenda ?? []).length;
    Engine.advance(city, now);

    let result: unknown = { ok: true };
    let changed = city.wk !== weekBefore || (city.agenda ?? []).length !== agendaBefore; // weekly steps, or something on the agenda fired mid-week
    if (action === 'join') {
      if (!city.players[userId!]) {
        // New tycoons sign up with e-mail and password; the avatar name (first + last) comes with the account.
        if (user?.is_anonymous) return out({ result: { ok: false, msg: 'Create an account with e-mail and password first.' }, city });
        const meta = user?.user_metadata ?? {};
        const av = Engine.BR.checkAvatarName(String(args.first ?? meta.first ?? ''), String(args.last ?? meta.last ?? ''));
        if (!av.ok) return out({ result: av, city });
        Engine.addPlayer(city, userId!, av.name, now, { first: av.first, last: av.last });
        await admin.from('city_players').upsert({ city_id: cityId, user_id: userId, name: av.name });
        changed = true;
      }
    } else if (action === 'adminPlay') {
      const who = Engine.AS_IDS.includes(String(args.who)) ? String(args.who) : Engine.ADMIN_ID;
      const had = !!city.players[who];
      Engine.ensureAs(city, who, now);
      if (!had) { console.log(JSON.stringify({ city: cityId, admin: user?.email, created: who })); changed = true; }
    } else if (action === 'adminSpeed') {
      // The whole city changes pace: time so far is kept, only the rate from now on changes.
      const speed = Number(args.speed);
      if (!Engine.validSpeed(speed)) return out({ result: { ok: false, msg: 'Pick a speed between 0.25 and 2016.' }, city });
      if (speed === city.clock.speed) return out({ result: { ok: true }, city });
      Engine.setSpeed(city, speed, now);
      console.log(JSON.stringify({ city: cityId, admin: user?.email, speed }));
      changed = true;
    } else if (action === 'adminMove') {
      // A company's pin moves for every player, and stays put through later map updates (city.pins).
      result = Engine.moveListing(city, String(args.lid ?? ''), args.p as number[]);
      if (!(result as { ok: boolean }).ok) return out({ result, city });
      console.log(JSON.stringify({ city: cityId, admin: user?.email, moved: args.lid, p: args.p }));
      changed = true;
    } else if (action === 'adminHouseAd') {
      // the one ad the administrator runs on The Aurex Gazette and its box on the Market tab
      result = Engine.setHouseAd(city, args);
      if (!(result as { ok: boolean }).ok) return out({ result, city });
      console.log(JSON.stringify({ city: cityId, admin: user?.email, houseAd: args }));
      changed = true;
    } else if (action === 'adminMailAll') {
      // one mail from the city to every human tycoon (changelogs, announcements)
      result = Engine.mailAll(city, args);
      if (!(result as { ok: boolean }).ok) return out({ result, city });
      console.log(JSON.stringify({ city: cityId, admin: user?.email, mailAll: args.subj, to: (result as { n: number }).n }));
      changed = true;
    } else if (action === 'adminYearEnd') {
      // test: close the books now for every holding and solo tycoon (annual reports + annual meetings)
      result = Engine.closeBooks(city);
      console.log(JSON.stringify({ city: cityId, admin: user?.email, closeBooks: city.m }));
      changed = true;
    } else if (action !== 'sync' && action !== 'tick') {
      if (asId) Engine.ensureAs(city, asId, now);
      result = Engine.apply(city, asId ?? userId!, action, args, now);
      changed = true;
    }

    if (!changed) return out({ result, city });
    // Realtime sends the whole row to every browser; keep an eye on its size (limit is ~1 MB per message).
    const bytes = JSON.stringify(city).length;
    console.log(JSON.stringify({ city: cityId, action, wk: city.wk, bytes, ms: Date.now() - now }));
    if (bytes > 600_000) console.warn(`city ${cityId} state is ${Math.round(bytes / 1024)} KB: switch Realtime to a {id, version} broadcast + sync`);
    const { data: saved, error: saveErr } = await admin.rpc('save_city', { p_id: cityId, p_state: city, p_version: row.version });
    if (saveErr) return json({ error: saveErr.message }, 500);
    if (saved !== null) return out({ result, city });
    // someone else saved in between: loop and apply the action again on fresh state
  }
  return json({ result: { ok: false, msg: 'The city is busy. Try again.' } }, 409);
});

// The shared chat inboxes of the administrator and the test player (AS_CHAT in engine.js). Players write to
// them directly under row level security; only admin accounts read and answer them, through here.
// args.as is who the admin writes as; peers are user ids or the other shared player.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLS = 'id,from_id,to_id,body,created_at,read_at';
const chatId = (id: string) => (Engine.AS_CHAT as Record<string, string>)[id] ?? id;
async function adminChat(cityId: string, args: Record<string, unknown>, isAdmin: boolean) {
  if (!isAdmin) return { ok: false, msg: 'Only an admin can answer as that player.' };
  const asId = Engine.AS_IDS.includes(String(args.as)) ? String(args.as) : Engine.ADMIN_ID;
  const A = chatId(asId), op = String(args.op ?? ''), peer = chatId(String(args.peer ?? ''));
  const db = admin.from('chat_messages');
  if (op === 'unread' || op === 'inboxes') { // unread per sender for one inbox, or totals per shared player
    const ids = op === 'unread' ? [A] : Object.values(Engine.AS_CHAT);
    const { data, error } = await db.select('from_id,to_id').eq('city_id', cityId).in('to_id', ids).is('read_at', null).limit(1000);
    if (error) return { ok: false, msg: error.message };
    const n: Record<string, number> = {}; for (const r of data ?? []) { const k = op === 'unread' ? r.from_id : r.to_id; n[k] = (n[k] ?? 0) + 1; }
    return { ok: true, unread: n };
  }
  if (op === 'peers') { // everyone this shared player has a conversation with, newest first
    const { data, error } = await db.select('from_id,to_id,created_at').eq('city_id', cityId).or(`from_id.eq.${A},to_id.eq.${A}`).order('created_at', { ascending: false }).limit(300);
    return error ? { ok: false, msg: error.message } : { ok: true, rows: data ?? [] };
  }
  if (!UUID.test(peer) || peer === A) return { ok: false, msg: 'Pick a player.' };
  if (op === 'load') {
    const { data, error } = await db.select(COLS).eq('city_id', cityId)
      .or(`and(from_id.eq.${A},to_id.eq.${peer}),and(from_id.eq.${peer},to_id.eq.${A})`).order('created_at', { ascending: false }).limit(100);
    return error ? { ok: false, msg: error.message } : { ok: true, rows: (data ?? []).reverse() };
  }
  if (op === 'read') {
    await db.update({ read_at: new Date().toISOString() }).eq('city_id', cityId).eq('to_id', A).eq('from_id', peer).is('read_at', null);
    return { ok: true };
  }
  if (op === 'send') {
    const text = String(args.body ?? '').replace(/\s+/g, ' ').trim();
    if (!text) return { ok: false, msg: 'Write a message first.' };
    if (text.length > 500) return { ok: false, msg: 'Keep it under 500 characters.' };
    const { data: row } = await admin.from('cities').select('state->players').eq('id', cityId).maybeSingle();
    const players = (row as { players?: Record<string, unknown> } | null)?.players ?? {};
    const peerGame = Object.entries(Engine.AS_CHAT).find(([, v]) => v === peer)?.[0] ?? peer;
    if (!players[peerGame]) return { ok: false, msg: 'That player is not in this city.' };
    const { data, error } = await db.insert({ city_id: cityId, from_id: A, to_id: peer, body: text }).select(COLS).single();
    return error ? { ok: false, msg: 'The message was not sent. Try again in a moment.' } : { ok: true, row: data };
  }
  return { ok: false, msg: 'Unknown chat action.' };
}
