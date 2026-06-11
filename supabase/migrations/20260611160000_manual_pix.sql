-- ════════════════════════════════════════════════════════════════════
-- Pagamento manual via Pix + central de controle (admin)
--
-- Como o Pix-on-Link do Stripe não está disponível para a conta (negócio
-- US), oferecemos um fluxo alternativo: o usuário paga o Pix manualmente,
-- envia o comprovante por e-mail e um admin libera o acesso Premium pela
-- central de controle (/admin).
--
-- Idempotente: pode rodar de novo sem quebrar.
-- ════════════════════════════════════════════════════════════════════

begin;

-- ── profiles.is_admin ───────────────────────────────────────────────
-- Marca quem pode acessar a central de controle e aprovar pagamentos.
-- Só é definido manualmente no banco (nunca exposto a anon/authenticated
-- para escrita). Defina o primeiro admin com:
--   update public.profiles set is_admin = true where id = '<uuid-do-user>';
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ── payment_requests (solicitações de pagamento manual via Pix) ──────
create table if not exists public.payment_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- Snapshot de contato no momento da solicitação (facilita a conferência
  -- na central sem precisar cruzar com auth.users).
  contact_email text,
  contact_name  text,
  contact_phone text,
  amount_cents  integer not null,
  -- Mensagem/observação opcional do usuário (ex.: "paguei às 14h").
  note          text,
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  reviewed_by   uuid references auth.users(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists payment_requests_user_idx
  on public.payment_requests(user_id);
create index if not exists payment_requests_status_idx
  on public.payment_requests(status);

-- No máximo UMA solicitação pendente por usuário (evita spam/duplicidade).
create unique index if not exists payment_requests_one_pending
  on public.payment_requests(user_id) where status = 'pending';

drop trigger if exists payment_requests_updated_at on public.payment_requests;
create trigger payment_requests_updated_at before update on public.payment_requests
  for each row execute function public.tg_set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.payment_requests enable row level security;

-- Grants por coluna: o usuário só cria a própria solicitação e lê as
-- próprias. status/reviewed_* e a liberação do Premium são exclusivos do
-- service_role (server actions da central, que ignoram RLS).
revoke all on public.payment_requests from anon, authenticated;
grant select on public.payment_requests to authenticated;
grant insert (user_id, contact_email, contact_name, contact_phone, amount_cents, note)
  on public.payment_requests to authenticated;

drop policy if exists "payment_requests: ler próprias" on public.payment_requests;
create policy "payment_requests: ler próprias"
  on public.payment_requests for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "payment_requests: criar própria" on public.payment_requests;
create policy "payment_requests: criar própria"
  on public.payment_requests for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Observação: não há policy de UPDATE/DELETE para authenticated. A revisão
-- (aprovar/rejeitar) e a concessão do Premium acontecem só via service_role.

commit;
