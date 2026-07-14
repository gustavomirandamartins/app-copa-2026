-- Palpites extras (semis = teste sem pontos; 3º lugar e final = valendo).
-- Duas tabelas novas + coluna profiles.extra_points.
--
-- match_extra_results: resultados detalhados de um jogo. As colunas de API
-- (ht/rt/et/pen/duration) são gravadas pelo sync da football-data; as
-- manuais (cartões e 1º gol) pelo admin — a API grátis não fornece eventos.
-- O upsert do sync NUNCA inclui as colunas manuais, então não as sobrescreve.
--
-- extra_predictions: um palpite extra por (usuário, jogo), formato largo
-- espelhando `predictions`. points_earned é recalculado do zero a cada sync
-- (idempotente) e NUNCA entra em base_points/round_scores — extras somam em
-- profiles.total_score como parcela própria (profiles.extra_points).

begin;

create table if not exists public.match_extra_results (
  match_id   text primary key references public.matches(id) on delete cascade,
  -- Sincronizado da football-data (nunca escrito pelo admin):
  ht_home    integer,
  ht_away    integer,
  rt_home    integer,
  rt_away    integer,
  et_home    integer,
  et_away    integer,
  pen_home   integer,
  pen_away   integer,
  duration   text check (duration is null or duration in ('REGULAR', 'EXTRA_TIME', 'PENALTY_SHOOTOUT')),
  -- Entrada manual do admin:
  yellow_home integer check (yellow_home is null or yellow_home >= 0),
  yellow_away integer check (yellow_away is null or yellow_away >= 0),
  red_home    integer check (red_home is null or red_home >= 0),
  red_away    integer check (red_away is null or red_away >= 0),
  first_goal  text check (first_goal is null or first_goal in ('home', 'away', 'none')),
  updated_at  timestamptz not null default now()
);

create table if not exists public.extra_predictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  match_id    text not null references public.matches(id) on delete cascade,
  ht_home     integer,
  ht_away     integer,
  h2_home     integer,
  h2_away     integer,
  et_home     integer,
  et_away     integer,
  pen_home    integer,
  pen_away    integer,
  yellow_home integer,
  yellow_away integer,
  red_home    integer,
  red_away    integer,
  first_goal  text check (first_goal is null or first_goal in ('home', 'away', 'none')),
  points_earned integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, match_id)
);

create index if not exists extra_predictions_match_idx on public.extra_predictions (match_id);
create index if not exists extra_predictions_user_idx  on public.extra_predictions (user_id);

alter table public.profiles add column if not exists extra_points integer not null default 0;

drop trigger if exists match_extra_results_updated_at on public.match_extra_results;
create trigger match_extra_results_updated_at
  before update on public.match_extra_results
  for each row execute function public.tg_set_updated_at();

drop trigger if exists extra_predictions_updated_at on public.extra_predictions;
create trigger extra_predictions_updated_at
  before update on public.extra_predictions
  for each row execute function public.tg_set_updated_at();

-- RLS: escrita SÓ via service_role (server actions e sync — mesmo padrão de
-- `predictions`, cujo upsert usa o admin client). Leitura: resultados são
-- públicos; palpites extras cada um lê só os próprios.
alter table public.match_extra_results enable row level security;
alter table public.extra_predictions   enable row level security;

revoke all on public.match_extra_results from anon, authenticated;
grant select on public.match_extra_results to anon, authenticated;
drop policy if exists "match_extra_results: leitura publica" on public.match_extra_results;
create policy "match_extra_results: leitura publica"
  on public.match_extra_results for select
  to anon, authenticated
  using (true);

revoke all on public.extra_predictions from anon, authenticated;
grant select on public.extra_predictions to authenticated;
drop policy if exists "extra_predictions: ler proprios" on public.extra_predictions;
create policy "extra_predictions: ler proprios"
  on public.extra_predictions for select
  to authenticated
  using ((select auth.uid()) = user_id);

commit;
