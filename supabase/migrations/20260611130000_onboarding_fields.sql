-- ════════════════════════════════════════════════════════════════════
-- Onboarding do Bolão — dados pessoais, endereço de entrega e LGPD
-- Idempotente: pode rodar de novo sem quebrar.
-- ════════════════════════════════════════════════════════════════════

begin;

-- ── Novas colunas em profiles ───────────────────────────────────────
alter table public.profiles add column if not exists birth_date         date;
alter table public.profiles add column if not exists phone              text;
alter table public.profiles add column if not exists postal_code        text;   -- CEP
alter table public.profiles add column if not exists address_street     text;   -- logradouro
alter table public.profiles add column if not exists address_number     text;
alter table public.profiles add column if not exists address_complement text;
alter table public.profiles add column if not exists address_district   text;   -- bairro
alter table public.profiles add column if not exists address_city       text;
alter table public.profiles add column if not exists address_state      text;   -- UF
alter table public.profiles add column if not exists agreed_to_lgpd     boolean not null default false;
alter table public.profiles add column if not exists lgpd_agreed_at     timestamptz;

-- ── Column-grants: usuário pode atualizar os próprios dados ──────────
-- (lgpd_agreed_at NÃO é concedido: é carimbado pelo trigger abaixo.
--  is_premium, total_score, stripe_customer_id continuam só service_role.)
grant update (
  full_name,
  agreed_to_ranking,
  birth_date,
  phone,
  postal_code,
  address_street,
  address_number,
  address_complement,
  address_district,
  address_city,
  address_state,
  agreed_to_lgpd
) on public.profiles to authenticated;

-- ── Trigger: carimba lgpd_agreed_at quando o consentimento vira true ─
create or replace function public.tg_stamp_lgpd_agreed_at()
returns trigger
language plpgsql
as $$
begin
  if new.agreed_to_lgpd and not coalesce(old.agreed_to_lgpd, false) then
    new.lgpd_agreed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_stamp_lgpd on public.profiles;
create trigger profiles_stamp_lgpd before update on public.profiles
  for each row execute function public.tg_stamp_lgpd_agreed_at();

commit;
