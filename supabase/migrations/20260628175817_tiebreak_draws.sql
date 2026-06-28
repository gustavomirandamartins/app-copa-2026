-- ════════════════════════════════════════════════════════════════════
-- Desempate por sorteio (Bolão).
--
-- Quando todos os critérios de desempate são idênticos entre dois ou mais
-- participantes nas 5 primeiras posições (Geral ou Rodada), o organizador
-- realiza um sorteio ao vivo e registra o resultado aqui.
--
-- scope     : 'general' | round_key (ex.: 'group-1', 'round-of-16')
-- signature : hash determinístico do grupo de empate (participantes + nível)
-- ordering  : user_ids na ordem sorteada (1º → último)
--
-- Um sorteio só é aplicado na classificação quando signature ainda
-- corresponde ao grupo atual; se os pontos mudarem, é ignorado
-- automaticamente (a signature muda junto com os dados).
--
-- Idempotente.
-- ════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.tiebreak_draws (
  id          uuid        primary key default gen_random_uuid(),
  scope       text        not null,                        -- 'general' | round_key
  signature   text        not null,                        -- assinatura do empate
  ordering    uuid[]      not null,                        -- user_ids ordenados (1º primeiro)
  created_by  uuid        references public.profiles(id),  -- admin que registrou
  created_at  timestamptz not null default now()
);

-- Apenas um sorteio por (escopo, assinatura) — upsert substitui.
alter table public.tiebreak_draws
  drop constraint if exists tiebreak_draws_scope_signature_key;
alter table public.tiebreak_draws
  add constraint tiebreak_draws_scope_signature_key unique (scope, signature);

-- Proteção: só o service_role (admin client / sync) lê e escreve.
alter table public.tiebreak_draws enable row level security;
revoke all on public.tiebreak_draws from anon, authenticated;

commit;
