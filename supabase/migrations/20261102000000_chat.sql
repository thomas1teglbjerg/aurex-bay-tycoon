-- Private chat between players (right-click a player's icon in the top bar → "Chat with player").
-- Browsers write their own messages directly; row level security keeps each conversation
-- visible only to its two players. Messages are not game state, so the engine never sees them.
create table if not exists public.chat_messages (
  id          bigint generated always as identity primary key,
  city_id     text not null references public.cities(id) on delete cascade,
  from_id     uuid not null default auth.uid(),
  to_id       uuid not null,
  body        text not null check (char_length(btrim(body)) between 1 and 500),
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  check (from_id <> to_id)
);
create index if not exists chat_messages_pair on public.chat_messages (city_id, from_id, to_id, created_at desc);
create index if not exists chat_messages_unread on public.chat_messages (to_id, city_id) where read_at is null;

alter table public.chat_messages enable row level security;

drop policy if exists "players read their own conversations" on public.chat_messages;
create policy "players read their own conversations" on public.chat_messages for select to authenticated
  using (auth.uid() = from_id or auth.uid() = to_id);

-- Only as yourself, and only between two tycoons of the same city.
drop policy if exists "players send as themselves" on public.chat_messages;
create policy "players send as themselves" on public.chat_messages for insert to authenticated
  with check (
    auth.uid() = from_id
    and exists (select 1 from public.cities c
                 where c.id = city_id
                   and c.state->'players' ? auth.uid()::text
                   and c.state->'players' ? to_id::text)
  );

-- The receiver marks messages as read (only read_at can change).
drop policy if exists "receivers mark read" on public.chat_messages;
create policy "receivers mark read" on public.chat_messages for update to authenticated
  using (auth.uid() = to_id) with check (auth.uid() = to_id);

revoke all on public.chat_messages from anon, authenticated;
grant select on public.chat_messages to authenticated;
grant insert (city_id, to_id, body) on public.chat_messages to authenticated;
grant update (read_at) on public.chat_messages to authenticated;

-- New messages reach the receiver's browser live
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.chat_messages;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
