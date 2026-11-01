-- Players can also chat with the test player (TEST_CHAT in engine.js, 00000000-0000-0000-0000-000000000ad2).
-- Admins read and answer both shared inboxes through the game function (action adminChat).
drop policy if exists "players send as themselves" on public.chat_messages;
create policy "players send as themselves" on public.chat_messages for insert to authenticated
  with check (
    auth.uid() = from_id
    and exists (select 1 from public.cities c
                 where c.id = city_id
                   and c.state->'players' ? auth.uid()::text
                   and (to_id in ('00000000-0000-0000-0000-000000000ad1'::uuid, '00000000-0000-0000-0000-000000000ad2'::uuid)
                        or c.state->'players' ? to_id::text))
  );
