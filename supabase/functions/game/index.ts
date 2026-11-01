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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body: { action?: string; args?: Record<string, unknown>; city?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const action = String(body.action ?? 'sync');
  const cityId = String(body.city ?? 'aurex-bay').slice(0, 40);
  const args = body.args ?? {};

  // Who is calling? Cron uses a shared secret; players use their (anonymous) Supabase session.
  let userId: string | null = null;
  if (action === 'tick') {
    if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return json({ error: 'Forbidden' }, 403);
  } else {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return json({ error: 'Sign in first' }, 401);
    userId = data.user.id;
  }

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
    const weekBefore = city.wk;
    Engine.advance(city, now);

    let result: unknown = { ok: true };
    let changed = city.wk !== weekBefore; // the engine moves in weekly steps
    if (action === 'join') {
      if (!city.players[userId!]) {
        Engine.addPlayer(city, userId!, String(args.name ?? 'Tycoon').slice(0, 24), now);
        await admin.from('city_players').upsert({ city_id: cityId, user_id: userId, name: String(args.name ?? 'Tycoon').slice(0, 24) });
        changed = true;
      }
    } else if (action !== 'sync' && action !== 'tick') {
      result = Engine.apply(city, userId!, action, args, now);
      changed = true;
    }

    if (!changed) return json({ result, city });
    // Realtime sends the whole row to every browser; keep an eye on its size (limit is ~1 MB per message).
    const bytes = JSON.stringify(city).length;
    console.log(JSON.stringify({ city: cityId, action, wk: city.wk, bytes, ms: Date.now() - now }));
    if (bytes > 600_000) console.warn(`city ${cityId} state is ${Math.round(bytes / 1024)} KB: switch Realtime to a {id, version} broadcast + sync`);
    const { data: saved, error: saveErr } = await admin.rpc('save_city', { p_id: cityId, p_state: city, p_version: row.version });
    if (saveErr) return json({ error: saveErr.message }, 500);
    if (saved !== null) return json({ result, city });
    // someone else saved in between: loop and apply the action again on fresh state
  }
  return json({ result: { ok: false, msg: 'The city is busy. Try again.' } }, 409);
});
