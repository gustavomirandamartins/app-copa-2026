-- ════════════════════════════════════════════════════════════════════
-- Premiação por rodada em CAMADAS + critérios de desempate corretos.
--
-- Antes: o vencedor da rodada ganhava +50; em caso de empate, TODOS os
-- líderes ganhavam +50 (bug: 3 usuários com 50 pontos). Agora a rodada é
-- classificada com desempate e a premiação é escalonada:
--   1º +50 · 2º +30 · 3º +20 · 4º +10 · 5º +5  (um por colocação).
--
-- Para isso guardamos por rodada os critérios de desempate e a colocação:
--   round_scores.exact_pts — pontos em acertos de placar exato (base 5)
--   round_scores.diff_pts  — pontos em acertos de saldo (base 3)
--   round_scores.place     — colocação (1..N) entre não-admins; null se admin/rodada aberta
--   round_scores.bonus     — bônus escalonado conquistado (0 se fora do top 5)
--
-- E em predictions guardamos o ponto-base (antes do multiplicador) para os
-- desempates por placar exato/saldo funcionarem mesmo em jogos turbinados.
--
-- Idempotente.
-- ════════════════════════════════════════════════════════════════════

begin;

-- ── round_scores: desempate + colocação + bônus escalonado ──────────
alter table public.round_scores
  add column if not exists exact_pts integer not null default 0,
  add column if not exists diff_pts  integer not null default 0,
  add column if not exists place     integer,
  add column if not exists bonus     integer not null default 0;

-- ── predictions: ponto-base (antes do multiplicador) ────────────────
-- Permite contar acertos de placar exato (5) e saldo (3) nos desempates
-- mesmo quando o jogo é turbinado (points_earned = base × multiplicador).
-- Só o service_role (sync) escreve; authenticated apenas lê.
alter table public.predictions
  add column if not exists base_points integer;

grant select (base_points) on public.predictions to authenticated;

-- ── view pública: inclui colocação e bônus da rodada ────────────────
-- (drop antes de recriar: a ordem das colunas mudou)
drop view if exists public.public_round_scores;
create view public.public_round_scores as
  select rs.round_key,
         p.full_name,
         rs.points,
         rs.exact_pts,
         rs.diff_pts,
         rs.place,
         rs.bonus,
         rs.complete,
         rs.is_winner
    from public.round_scores rs
    join public.profiles p on p.id = rs.user_id
   where p.agreed_to_ranking;

alter view public.public_round_scores set (security_invoker = true);
grant select on public.public_round_scores to anon, authenticated;

commit;
