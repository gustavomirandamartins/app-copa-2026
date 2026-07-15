-- Palpites extras: mais 3 categorias (chutes a gol, impedimentos, escanteios),
-- cada uma com placar por seleção — mesmo padrão de cartões (2 campos
-- independentes por categoria, 1 por time). A football-data.org não fornece
-- estatísticas de jogo (só placar/tempo/duração), então são manuais como
-- cartões e 1º gol.

begin;

alter table public.match_extra_results
  add column if not exists shots_home   integer check (shots_home is null or shots_home >= 0),
  add column if not exists shots_away   integer check (shots_away is null or shots_away >= 0),
  add column if not exists offside_home integer check (offside_home is null or offside_home >= 0),
  add column if not exists offside_away integer check (offside_away is null or offside_away >= 0),
  add column if not exists corner_home  integer check (corner_home is null or corner_home >= 0),
  add column if not exists corner_away  integer check (corner_away is null or corner_away >= 0);

alter table public.extra_predictions
  add column if not exists shots_home   integer,
  add column if not exists shots_away   integer,
  add column if not exists offside_home integer,
  add column if not exists offside_away integer,
  add column if not exists corner_home  integer,
  add column if not exists corner_away  integer;

commit;
