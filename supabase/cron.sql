-- Run this once in the Supabase SQL editor AFTER deploying the "game" function.
-- It wakes the city every 15 minutes, so World Cards, bots and autopilot decisions happen even when nobody is online.
--
-- The project URL and the cron secret are read from Supabase Vault, so no secret lives in this file or in git.
-- Store them first (run separately in the SQL editor, do NOT commit the real values):
--   select vault.create_secret('https://<PROJECT-REF>.supabase.co', 'aurex_project_url');
--   select vault.create_secret('<CRON-SECRET>', 'aurex_cron_secret');   -- same value as: supabase secrets set CRON_SECRET=...

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('aurex-bay-tick') where exists (select 1 from cron.job where jobname = 'aurex-bay-tick');

select cron.schedule(
  'aurex-bay-tick',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'aurex_project_url') || '/functions/v1/game',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'aurex_cron_secret')),
    body    := '{"action":"tick","city":"aurex-bay"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
