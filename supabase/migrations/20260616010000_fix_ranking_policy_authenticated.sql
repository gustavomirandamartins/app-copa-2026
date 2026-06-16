-- ════════════════════════════════════════════════════════════════════
-- Corrige regressão: com SECURITY INVOKER, a view public_ranking roda
-- como o usuário logado. A policy de leitura do ranking público só existia
-- para 'anon', então usuários autenticados viam apenas a própria linha
-- (a classificação aparecia só com o próprio nome). Estende a policy para
-- 'authenticated' também.
-- ════════════════════════════════════════════════════════════════════

begin;

drop policy if exists "profiles: leitura ranking público" on public.profiles;
create policy "profiles: leitura ranking público"
  on public.profiles for select to anon, authenticated
  using (agreed_to_ranking = true);

commit;
