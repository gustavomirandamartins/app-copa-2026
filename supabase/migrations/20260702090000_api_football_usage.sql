-- Contador diário de requisições à API-Football, pra respeitar o teto do
-- plano gratuito (100/dia) no polling ao vivo. Só escrita via service role.

create table if not exists public.api_football_usage (
  day            date primary key,
  request_count  integer not null default 0
);

alter table public.api_football_usage enable row level security;
-- Sem policies: só o service_role (admin client) lê/escreve essa tabela.
