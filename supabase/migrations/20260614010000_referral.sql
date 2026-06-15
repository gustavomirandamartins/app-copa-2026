-- ════════════════════════════════════════════════════════════════════
-- Sistema de indicação (cupons)
--   • Cada perfil ganha um referral_code único (cupom para compartilhar).
--   • Ao se cadastrar/pagar, o novo usuário informa o cupom de quem o
--     indicou (referred_by). Quando ELE vira premium, o dono do cupom
--     recebe +5 pontos de bônus (cumulativo).
--   • A trava de idempotência é a tabela `referrals` (PK = indicado),
--     então retries do webhook do Stripe não creditam em dobro.
-- Idempotente: pode rodar de novo sem quebrar.
-- ════════════════════════════════════════════════════════════════════

begin;

-- ── Colunas em profiles ─────────────────────────────────────────────
alter table public.profiles add column if not exists referral_code  text;
alter table public.profiles add column if not exists referred_by    text;
alter table public.profiles add column if not exists referral_bonus integer not null default 0;

-- ── Gerador de código único (6 chars, sem caracteres ambíguos) ──────
create or replace function public.gen_referral_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- sem I, L, O, 0, 1
  code text;
  i int;
  taken boolean;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    select exists(select 1 from public.profiles where referral_code = code) into taken;
    exit when not taken;
  end loop;
  return code;
end;
$$;

-- Backfill: gera código para perfis que ainda não têm.
update public.profiles
set referral_code = public.gen_referral_code()
where referral_code is null;

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code);

-- Trigger: gera o código no insert se vier vazio (novos cadastros).
create or replace function public.tg_set_referral_code()
returns trigger
language plpgsql
as $$
begin
  if new.referral_code is null then
    new.referral_code := public.gen_referral_code();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_referral_code on public.profiles;
create trigger profiles_set_referral_code before insert on public.profiles
  for each row execute function public.tg_set_referral_code();

-- ── Tabela de indicações (trava de idempotência + auditoria) ────────
create table if not exists public.referrals (
  referred_user_id uuid primary key references public.profiles(id) on delete cascade,
  referrer_id      uuid not null      references public.profiles(id) on delete cascade,
  code             text not null,
  points           integer not null default 5,
  created_at       timestamptz not null default now()
);
alter table public.referrals enable row level security;
-- Sem policies: apenas o service_role (que ignora RLS) lê/escreve.

-- ── Crédito atômico do bônus de indicação ───────────────────────────
-- Chamada quando o usuário `referred` vira premium. Faz tudo numa
-- transação: insere em referrals (trava por PK) e credita o indicador.
-- Se já existir linha em referrals para esse indicado, não faz nada.
create or replace function public.credit_referral(referred uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code     text;
  v_referrer uuid;
begin
  select nullif(btrim(referred_by), '') into v_code
  from public.profiles where id = referred;
  if v_code is null then
    return; -- não usou cupom
  end if;

  select id into v_referrer
  from public.profiles
  where upper(referral_code) = upper(v_code) and id <> referred
  limit 1;
  if v_referrer is null then
    return; -- cupom inexistente ou auto-indicação
  end if;

  insert into public.referrals (referred_user_id, referrer_id, code, points)
  values (referred, v_referrer, upper(v_code), 5)
  on conflict (referred_user_id) do nothing;
  if not found then
    return; -- já creditado antes (idempotente)
  end if;

  update public.profiles
  set referral_bonus = coalesce(referral_bonus, 0) + 5,
      total_score    = coalesce(total_score, 0) + 5
  where id = v_referrer;
end;
$$;

-- ── Column-grant: o usuário pode gravar o próprio referred_by ───────
-- (referral_code, referral_bonus continuam só service_role.)
grant update (referred_by) on public.profiles to authenticated;

commit;
