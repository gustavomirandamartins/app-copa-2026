-- ════════════════════════════════════════════════════════════════════
-- Bolão Premium — schema, RLS, policies, triggers
-- Idempotente: pode rodar de novo sem quebrar.
-- ════════════════════════════════════════════════════════════════════

begin;

-- ── Função utilitária: updated_at automático ────────────────────────
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- TABELAS
-- ════════════════════════════════════════════════════════════════════

-- profiles (1:1 com auth.users) ──────────────────────────────────────
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text,
  is_premium         boolean not null default false,
  agreed_to_ranking  boolean not null default false,
  stripe_customer_id text,
  total_score        integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- teams (semente a partir dos dados estáticos) ───────────────────────
create table if not exists public.teams (
  id           text primary key,           -- ex.: 'bra'
  name         text not null,
  code         text not null,              -- sigla FIFA, ex.: 'BRA'
  flag         text,                       -- emoji
  group_letter text not null               -- 'A'..'L'
);

-- matches ────────────────────────────────────────────────────────────
create table if not exists public.matches (
  id             text primary key,         -- ex.: 'gs-001'
  external_id    bigint unique,            -- id do fixture na football-data
  phase          text not null,            -- 'group','round-of-32',...
  group_letter   text,                     -- null no mata-mata
  home_team_id   text references public.teams(id),
  away_team_id   text references public.teams(id),
  match_time_utc timestamptz not null,
  stadium_id     text,
  status         text not null default 'scheduled'
                   check (status in ('scheduled','live','finished','postponed')),
  home_score     integer,
  away_score     integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- predictions (palpites) ─────────────────────────────────────────────
create table if not exists public.predictions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  match_id         text not null references public.matches(id) on delete cascade,
  home_score_guess integer not null,
  away_score_guess integer not null,
  points_earned    integer not null default 0,
  is_autofilled    boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, match_id)
);

-- standings (classificação sincronizada da football-data) ────────────
create table if not exists public.standings (
  group_letter    text not null,
  team_id         text not null references public.teams(id),
  position        integer not null default 0,
  played          integer not null default 0,
  won             integer not null default 0,
  draw            integer not null default 0,
  lost            integer not null default 0,
  goals_for       integer not null default 0,
  goals_against   integer not null default 0,
  goal_difference integer not null default 0,
  points          integer not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (group_letter, team_id)
);

-- ════════════════════════════════════════════════════════════════════
-- ÍNDICES (FKs + colunas usadas em RLS/filtros/ordenação)
-- ════════════════════════════════════════════════════════════════════
create index if not exists predictions_user_id_idx   on public.predictions(user_id);
create index if not exists predictions_match_id_idx  on public.predictions(match_id);
create index if not exists matches_status_idx        on public.matches(status);
create index if not exists matches_home_team_idx     on public.matches(home_team_id);
create index if not exists matches_away_team_idx     on public.matches(away_team_id);
create index if not exists standings_team_id_idx     on public.standings(team_id);
-- ranking: ordena por total_score entre quem aceitou o ranking
create index if not exists profiles_ranking_idx
  on public.profiles(total_score desc) where agreed_to_ranking;

-- ════════════════════════════════════════════════════════════════════
-- TRIGGERS updated_at
-- ════════════════════════════════════════════════════════════════════
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

drop trigger if exists matches_updated_at on public.matches;
create trigger matches_updated_at before update on public.matches
  for each row execute function public.tg_set_updated_at();

drop trigger if exists predictions_updated_at on public.predictions;
create trigger predictions_updated_at before update on public.predictions
  for each row execute function public.tg_set_updated_at();

-- ════════════════════════════════════════════════════════════════════
-- Cria o profile automaticamente quando um usuário se cadastra
-- ════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════
-- Backstop de RLS: só membro premium que aceitou o ranking pode palpitar
-- ════════════════════════════════════════════════════════════════════
create or replace function public.is_active_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and is_premium
      and agreed_to_ranking
  );
$$;
revoke execute on function public.is_active_member() from public;
grant execute on function public.is_active_member() to authenticated;

-- ════════════════════════════════════════════════════════════════════
-- VIEW de ranking público (não expõe colunas sensíveis do profile)
-- ════════════════════════════════════════════════════════════════════
create or replace view public.public_ranking as
  select full_name, total_score
  from public.profiles
  where agreed_to_ranking
  order by total_score desc;

grant select on public.public_ranking to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════════════
alter table public.profiles    enable row level security;
alter table public.teams       enable row level security;
alter table public.matches     enable row level security;
alter table public.predictions enable row level security;
alter table public.standings   enable row level security;

-- ── Grants por coluna ───────────────────────────────────────────────
-- profiles: usuário só altera full_name e agreed_to_ranking.
-- (is_premium, total_score, stripe_customer_id → só service_role.)
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;            -- RLS limita à própria linha
grant update (full_name, agreed_to_ranking) on public.profiles to authenticated;

-- predictions: usuário escreve só os campos do palpite (não points_earned).
revoke all on public.predictions from anon, authenticated;
grant select on public.predictions to authenticated;
grant insert (user_id, match_id, home_score_guess, away_score_guess, is_autofilled)
  on public.predictions to authenticated;
-- user_id/match_id entram no SET do upsert (supabase-js); a RLS with_check
-- garante que user_id continue sendo o do próprio usuário.
grant update (user_id, match_id, home_score_guess, away_score_guess, is_autofilled)
  on public.predictions to authenticated;

-- leitura pública (dados do torneio)
grant select on public.teams     to anon, authenticated;
grant select on public.matches   to anon, authenticated;
grant select on public.standings to anon, authenticated;

-- ── Policies: profiles ──────────────────────────────────────────────
drop policy if exists "profiles: ler própria linha" on public.profiles;
create policy "profiles: ler própria linha"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles: atualizar própria linha" on public.profiles;
create policy "profiles: atualizar própria linha"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ── Policies: teams / matches / standings (leitura pública) ─────────
drop policy if exists "teams: leitura pública" on public.teams;
create policy "teams: leitura pública"
  on public.teams for select to anon, authenticated using (true);

drop policy if exists "matches: leitura pública" on public.matches;
create policy "matches: leitura pública"
  on public.matches for select to anon, authenticated using (true);

drop policy if exists "standings: leitura pública" on public.standings;
create policy "standings: leitura pública"
  on public.standings for select to anon, authenticated using (true);

-- ── Policies: predictions (dono + membro ativo) ─────────────────────
drop policy if exists "predictions: ler próprios" on public.predictions;
create policy "predictions: ler próprios"
  on public.predictions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "predictions: inserir próprios" on public.predictions;
create policy "predictions: inserir próprios"
  on public.predictions for insert to authenticated
  with check ((select auth.uid()) = user_id and public.is_active_member());

drop policy if exists "predictions: atualizar próprios" on public.predictions;
create policy "predictions: atualizar próprios"
  on public.predictions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.is_active_member());

-- Observação: teams/matches/standings/profiles NÃO têm policy de escrita
-- para anon/authenticated — gravação só via service_role (webhook Stripe,
-- sync football-data), que ignora RLS por padrão.

commit;
