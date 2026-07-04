-- Habilita pg_cron + pg_net e agenda o polling ao vivo (/api/sync/football/live)
-- a cada 2 minutos. Vercel Hobby só permite Cron 1x/dia, por isso o
-- agendador roda no próprio Supabase.
--
-- O CRON_SECRET fica no Vault (vault.decrypted_secrets), não em texto puro
-- na definição do job (cron.job.command).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'football-live-poll',
  '*/2 * * * *',
  $$
  select net.http_get(
    url := 'https://bolao.mindubier.com/api/sync/football/live',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret_football_live')
    )
  );
  $$
);
