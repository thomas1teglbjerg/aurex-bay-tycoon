-- Aurex Bay Tycoon — database
-- One row per city. The Edge Function "game" is the only writer (service role);
-- browsers read the row and receive live updates through Supabase Realtime.

create table if not exists public.cities (
  id          text primary key,
  state       jsonb not null,
  version     integer not null default 0,
  updated_at  timestamptz not null default now()
);

-- Who has played in which city (for analytics and future per-player queries)
create table if not exists public.city_players (
  city_id     text not null references public.cities(id) on delete cascade,
  user_id     uuid not null,
  name        text not null,
  joined_at   timestamptz not null default now(),
  primary key (city_id, user_id)
);

alter table public.cities enable row level security;
alter table public.city_players enable row level security;

-- Anyone signed in (anonymous sign-in counts) may read; nobody writes from the browser.
drop policy if exists "cities are readable" on public.cities;
create policy "cities are readable" on public.cities for select to anon, authenticated using (true);

drop policy if exists "players see their own rows" on public.city_players;
create policy "players see their own rows" on public.city_players for select to authenticated using (auth.uid() = user_id);

grant select on public.cities to anon, authenticated;
grant select on public.city_players to authenticated;
revoke insert, update, delete on public.cities from anon, authenticated;
revoke insert, update, delete on public.city_players from anon, authenticated;

-- Optimistic concurrency: the Edge Function only writes if nobody else wrote in between.
create or replace function public.save_city(p_id text, p_state jsonb, p_version integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare new_version integer;
begin
  update public.cities
     set state = p_state, version = version + 1, updated_at = now()
   where id = p_id and version = p_version
  returning version into new_version;
  return new_version; -- null means someone else saved first: reload and retry
end;
$$;
revoke all on function public.save_city(text, jsonb, integer) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.save_city(text, jsonb, integer) to service_role;
  end if;
end $$;

-- Live updates to every open browser
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.cities;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
