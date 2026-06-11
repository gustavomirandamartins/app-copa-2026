-- ════════════════════════════════════════════════════════════════════
-- Ferramentas de pontuação do admin:
--   1) profiles.score_adjustment — correção manual de pontos (+/-) que o
--      admin aplica a um usuário. Somada ao total calculado, sobrevive ao
--      recálculo do sync.
--   2) match_settings.score_multiplier — multiplicador de pontos por jogo
--      ("jogo turbinado": x2, x3, x4...). Aplicado no cálculo da pontuação.
--
-- Idempotente: pode rodar de novo sem quebrar.
-- ════════════════════════════════════════════════════════════════════

begin;

-- ── profiles.score_adjustment ───────────────────────────────────────
alter table public.profiles
  add column if not exists score_adjustment integer not null default 0;

-- ── match_settings (config por jogo, mantida pelo admin) ─────────────
create table if not exists public.match_settings (
  match_id         text primary key,   -- id estático do jogo (ex.: 'gs-001')
  score_multiplier integer not null default 1 check (score_multiplier >= 1),
  updated_at       timestamptz not null default now()
);

drop trigger if exists match_settings_updated_at on public.match_settings;
create trigger match_settings_updated_at before update on public.match_settings
  for each row execute function public.tg_set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────
-- Leitura pública (a tela de palpites destaca os jogos turbinados).
-- Escrita só via service_role (server actions do admin), que ignora RLS.
alter table public.match_settings enable row level security;

revoke all on public.match_settings from anon, authenticated;
grant select on public.match_settings to anon, authenticated;

drop policy if exists "match_settings: leitura pública" on public.match_settings;
create policy "match_settings: leitura pública"
  on public.match_settings for select to anon, authenticated using (true);

commit;
