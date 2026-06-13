-- ════════════════════════════════════════════════════════════════════
-- Premiação por rodada (50 pontos de bônus ao vencedor de cada rodada).
--
-- Rodadas: fase de grupos (3 rodadas) + 16-avos, oitavas, quartas e semis.
-- Ao final de cada rodada, o usuário com mais pontos NAS PARTIDAS DAQUELA
-- RODADA ganha 50 pontos de bônus. O admin fica fora de competição (não
-- recebe bônus). Empate → todos os líderes recebem.
--
-- 1) profiles.round_bonus — soma dos bônus por rodada já conquistados.
--    Escrito apenas pelo sync (service_role). Somado ao total_score.
-- 2) round_scores — pontos de cada usuário em cada rodada (recalculado a
--    cada sync). Alimenta a tela de classificação (campeões + tabela da
--    rodada). complete = rodada encerrada; is_winner = venceu a rodada.
-- 3) public_round_scores — view pública (respeita agreed_to_ranking),
--    espelhando public_ranking.
--
-- Idempotente.
-- ════════════════════════════════════════════════════════════════════

begin;

-- ── profiles.round_bonus ────────────────────────────────────────────
alter table public.profiles
  add column if not exists round_bonus integer not null default 0;

-- ── round_scores ────────────────────────────────────────────────────
create table if not exists public.round_scores (
  round_key text not null,            -- ex.: 'group-1', 'round-of-16'
  user_id   uuid not null references public.profiles(id) on delete cascade,
  points    integer not null default 0,
  complete  boolean not null default false,  -- rodada encerrada (todos os jogos finalizados)
  is_winner boolean not null default false,  -- venceu a rodada (só quando complete)
  primary key (round_key, user_id)
);

-- Escrita só via service_role (sync). Leitura pública apenas pela view.
alter table public.round_scores enable row level security;
revoke all on public.round_scores from anon, authenticated;

-- ── public_round_scores (view pública) ──────────────────────────────
create or replace view public.public_round_scores as
  select rs.round_key,
         p.full_name,
         rs.points,
         rs.complete,
         rs.is_winner
    from public.round_scores rs
    join public.profiles p on p.id = rs.user_id
   where p.agreed_to_ranking;

grant select on public.public_round_scores to anon, authenticated;

commit;
