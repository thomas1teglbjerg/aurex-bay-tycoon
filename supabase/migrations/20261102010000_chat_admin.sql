-- Players can chat with the administrator. The administrator's inbox is the fixed id
-- 00000000-0000-0000-0000-000000000ad1 (ADMIN_CHAT in engine.js). Players write to it directly;
-- admins read and answer it through the game function (action adminChat), which checks the account.
drop policy if exists "players send as themselves" on public.chat_messages;
create policy "players send as themselves" on public.chat_messages for insert to authenticated
  with check (
    auth.uid() = from_id
    and exists (select 1 from public.cities c
                 where c.id = city_id
                   and c.state->'players' ? auth.uid()::text
                   and (to_id = '00000000-0000-0000-0000-000000000ad1'::uuid or c.state->'players' ? to_id::text))
  );
