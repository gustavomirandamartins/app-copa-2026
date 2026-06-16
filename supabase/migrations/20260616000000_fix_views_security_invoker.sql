-- ════════════════════════════════════════════════════════════════════
-- Corrige SECURITY DEFINER nas views públicas → SECURITY INVOKER
-- Alertas Supabase: public.public_ranking e public.public_round_scores
-- rodavam como superuser, bypassando RLS. Corrigido aqui.
-- ════════════════════════════════════════════════════════════════════

begin;

-- ── public_ranking ─────────────────────────────────────────────────
-- Com SECURITY INVOKER, a view executa como o role que faz a query
-- (anon/authenticated). Garantimos que esses roles possam ler as
-- colunas relevantes de profiles com a RLS ativa.

-- 1) Permite que anon leia apenas full_name, total_score e agreed_to_ranking
grant select (full_name, total_score, agreed_to_ranking) on public.profiles to anon;

-- 2) Política RLS: anon pode ver perfis que optaram pelo ranking público.
drop policy if exists "profiles: leitura ranking público" on public.profiles;
create policy "profiles: leitura ranking público"
  on public.profiles for select to anon
  using (agreed_to_ranking = true);

-- 3) Converte a view para SECURITY INVOKER.
alter view public.public_ranking set (security_invoker = true);

-- ── public_round_scores ────────────────────────────────────────────
-- Mesma lógica: SECURITY INVOKER exige que anon/authenticated tenham
-- acesso direto às tabelas subjacentes (round_scores + profiles).

-- 4) Reabilita leitura de round_scores para anon/authenticated.
--    A escrita continua restrita a service_role (ausência de políticas
--    de INSERT/UPDATE/DELETE para anon/authenticated).
grant select on public.round_scores to anon, authenticated;

-- 5) Política RLS: todos os round_scores são dados públicos de competição.
drop policy if exists "round_scores: leitura pública" on public.round_scores;
create policy "round_scores: leitura pública"
  on public.round_scores for select to anon, authenticated
  using (true);

-- 6) Converte a view para SECURITY INVOKER.
alter view public.public_round_scores set (security_invoker = true);

commit;
