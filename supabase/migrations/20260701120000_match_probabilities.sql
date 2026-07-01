-- Probabilidades por jogo (atualizadas pelo admin via upload de planilha).
-- 3 colunas de percentual: vitória do mandante, empate, vitória do visitante.
-- Chave = match_number (o "Jogo #N" já usado no chaveamento/calendário estático).
-- Leitura pública; escrita apenas via service role (sem policies de write).

create table if not exists public.match_probabilities (
  match_number integer primary key,
  home_win numeric not null default 0,
  draw numeric not null default 0,
  away_win numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.match_probabilities enable row level security;

drop policy if exists "match_probabilities_public_read" on public.match_probabilities;
create policy "match_probabilities_public_read"
  on public.match_probabilities for select
  using (true);

grant select on public.match_probabilities to anon, authenticated;
