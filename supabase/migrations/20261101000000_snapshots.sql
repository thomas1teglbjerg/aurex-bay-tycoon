-- Daily backup of every city. Keeps the latest 14 snapshots per city.
create table if not exists public.city_snapshots (
  id        text not null,
  state     jsonb not null,
  version   integer not null,
  taken_at  timestamptz not null default now(),
  primary key (id, taken_at)
);
alter table public.city_snapshots enable row level security; -- no policies: only service role / SQL editor can read

create extension if not exists pg_cron;

create or replace function public.snapshot_cities()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.city_snapshots (id, state, version) select id, state, version from public.cities;
  delete from public.city_snapshots s
   where s.taken_at < (select min(t.taken_at) from (
           select taken_at from public.city_snapshots x where x.id = s.id order by taken_at desc limit 14) t);
$$;
revoke all on function public.snapshot_cities() from public, anon, authenticated;

select cron.unschedule('aurex-city-snapshot') where exists (select 1 from cron.job where jobname = 'aurex-city-snapshot');
select cron.schedule('aurex-city-snapshot', '30 3 * * *', $$ select public.snapshot_cities(); $$);
