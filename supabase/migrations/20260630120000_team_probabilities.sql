-- Probabilidades por seleção (atualizadas pelo admin via upload de planilha).
-- 7 colunas da planilha: Seleção · 16avos · Oitavas · Quartas · Semi · Final · Campeão
-- → mapeadas para round_of_32, round_of_16, quarter_final, semi_final, final, champion.
-- Leitura pública; escrita apenas via service role (sem policies de write).

create table if not exists public.team_probabilities (
  team_id text primary key,
  round_of_32 numeric not null default 0,
  round_of_16 numeric not null default 0,
  quarter_final numeric not null default 0,
  semi_final numeric not null default 0,
  final numeric not null default 0,
  champion numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.team_probabilities enable row level security;

drop policy if exists "team_probabilities_public_read" on public.team_probabilities;
create policy "team_probabilities_public_read"
  on public.team_probabilities for select
  using (true);

grant select on public.team_probabilities to anon, authenticated;
