-- Palpites extras: categoria Faltas (por seleção) — manual, mesmo padrão
-- das demais estatísticas que a football-data.org não fornece.

begin;

alter table public.match_extra_results
  add column if not exists fouls_home integer check (fouls_home is null or fouls_home >= 0),
  add column if not exists fouls_away integer check (fouls_away is null or fouls_away >= 0);

alter table public.extra_predictions
  add column if not exists fouls_home integer,
  add column if not exists fouls_away integer;

commit;
