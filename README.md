# Bolão da Mindu — Copa 2026

Bolão premium da **MinduBier** para a **Copa do Mundo FIFA 2026** (EUA, Canadá e México — 48 seleções, 12 grupos, 104 jogos). O participante paga uma única vez **R$ 39,90**, dá palpites nos placares das partidas antes do início e concorre a prêmios MinduBier (kit de cervejas MinduIPA, copos, camisetas, bonés, canecas térmicas etc.) no ranking público.

Produção: [bolao.mindubier.com](https://bolao.mindubier.com)

---

## Sumário

- [Stack](#stack)
- [Funcionalidades](#funcionalidades)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como rodar localmente](#como-rodar-localmente)
- [Banco de dados](#banco-de-dados)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Arquitetura e decisões](#arquitetura-e-decisões)
- [Testes](#testes)
- [Notas sobre o Next.js](#notas-sobre-o-nextjs)

---

## Stack

| Camada        | Tecnologia                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| Framework     | [Next.js 16](https://nextjs.org) (App Router, Turbopack)                    |
| UI            | React 19, TypeScript (strict), [framer-motion](https://www.framer.com/motion/), [lucide-react](https://lucide.dev) |
| Fontes        | `next/font` — Nunito Sans (corpo) e Outfit (título)                        |
| Banco / Auth  | [Supabase](https://supabase.com) — Postgres, Auth, Storage, Row Level Security |
| Pagamentos    | [Stripe](https://stripe.com) (Checkout) + Pix manual via EMV BR Code próprio |
| Dados esportivos | [football-data.org](https://www.football-data.org/) v4 (sync via cron) |
| Probabilidades | Scraper do modelo da UFMG (`mat.ufmg.br/futebol`)                         |
| QR Code       | [`qrcode`](https://www.npmjs.com/package/qrcode)                          |
| Export admin  | [`xlsx`](https://www.npmjs.com/package/xlsx)                              |
| Deploy        | [Vercel](https://vercel.com) (com cron)                                   |

---

## Funcionalidades

- **Autenticação (Supabase Auth)**: login por e-mail/senha, confirmação de cadastro com redirecionamento para onboarding. Sessão renovada via middleware (`src/proxy.ts`).
- **Onboarding**: nome completo, nascimento, telefone, endereço e consentimento LGPD (`/completar-cadastro`).
- **Dois caminhos de pagamento** (`/pagamento`):
  1. **Stripe Checkout** — sessão one-time de R$ 39,90 BRL; webhook em `/api/webhooks/stripe` concede Premium (idempotente).
  2. **Pix manual** — geração de "Pix copia e cola" + QR (`src/lib/bolao/pix.ts`) e aprovação no painel admin.
- **Grade de palpites** (`/bolao`): upsert via índice único `(user_id, match_id)`; jogos travam ao começar/terminar.
- **Motor de pontuação** (`src/lib/bolao/scoring.ts` + `scoring-sync.ts`):
  - Placar exato = 5 pts; vencedor + saldo de gols = 3 pts; só vencedor = 1 pt; erro = 0.
  - **Jogos turbinados**: admin pode multiplicar pontos por partida (x2, x3, ...).
  - Recálculo idempotente e paginado (limite de 1000 linhas do PostgREST).
- **Rodadas e bônus** (`src/lib/bolao/rounds.ts`): 7 rodadas com pontuação extra para o top 5 (50/30/20/10/5).
- **Ranking com 7 critérios de desempate** (`/ranking`): pts palpites → pts exatos → pts saldos → pts finais → semi → quartas → oitavas → sorteio ao vivo.
- **Referral**: cada amigo que paga usando seu cupom dá **+5 pts** (ilimitado). Crédito atômico pela RPC SQL `credit_referral`.
- **Termômetro**: widget "ainda é possível?" comparando pontos alcançáveis vs. líder.
- **Probabilidades UFMG** (`/probabilidades`): scraper server-side com retry/backoff e dados estáticos de fallback.
- **Grupos** (`/grupos`): classificação por grupo + melhores terceiros avançando às oitavas de final.
- **Jogos ao vivo** (`/jogos`): agenda estática enriquecida com status/placar do Supabase.
- **Seleções** (`/selecoes` + `/selecoes/[teamId]`): listagem com filtros por confederação e página por seleção.
- **Painel admin** (`/admin`):
  - Aprovação/rejeição de pagamentos Pix manuais.
  - Lista de usuários (via `auth.admin.listUsers`).
  - Matriz palpites × partidas (paginada).
  - Conceder/revogar Premium, ajustar pontuação, atualizar nome.
  - Configurar multiplicadores por jogo (`/admin/jogos`).
  - Disparar sync football-data.org e refresh de probabilidades.
- **Sincronização diária**: Vercel Cron `0 6 * * *` chama `/api/sync/football` (protegido por `CRON_SECRET`).
- **Polling ao vivo**: `/api/sync/football/live` (mesmo bearer `CRON_SECRET`) chamado via `pg_cron`/`pg_net` do Supabase a cada 1-5min — Vercel Hobby só permite Cron 1x/dia, por isso o agendador é externo. A football-data.org não tem teto diário (só 10 req/min), então só sonda quando há um jogo na janela ao vivo, sem precisar de controle de cota.
- **PWA**: `manifest.ts`, apple-touch-icon, theme color, card de instalação na home.
- **Modo demo**: com Supabase não configurado, várias páginas caem em dados estáticos (`isSupabaseConfigured()` em `src/lib/supabase/config.ts`).

---

## Estrutura do projeto

```
src/
├── proxy.ts                  # Middleware (refresh de sessão Supabase)
├── app/
│   ├── layout.tsx            # Header + BottomNav + ParallaxBackground
│   ├── page.tsx              # Home: funil marketing OU dashboard premium
│   ├── admin/                # Painel admin (protegido por is_admin)
│   ├── auth/callback/        # Exchange de código OAuth/e-mail
│   ├── bolao/                # Palpites (premium) + server actions
│   ├── completar-cadastro/    # Onboarding + LGPD
│   ├── grupos/               # Classificação por grupo
│   ├── jogos/                # Agenda com placar ao vivo
│   ├── login/               # Login/signup
│   ├── pagamento/           # Stripe Checkout + Pix manual
│   ├── probabilidades/       # Tabela UFMG
│   ├── ranking/              # Classificação geral + prêmios + regras
│   ├── selecoes/            # Seleções
│   ├── simulador/           # Aposentado → redireciona para /bolao
│   └── api/
│       ├── checkout/           # POST: cria Stripe Checkout Session
│       ├── sync/football/      # GET: sync diário (bearer CRON_SECRET)
│       │   └── live/           # GET: polling ao vivo (pg_cron/pg_net do Supabase)
│       └── webhooks/stripe/    # POST: concede Premium
├── components/               # 13 pastas de feature (admin, auth, bolao, ...)
├── data/                     # Datasets estáticos (teams, matches, stadiums, ...)
├── lib/
│   ├── types.ts, datetime.ts, stripe.ts
│   ├── supabase/             # client (browser), server (SSR), admin (service-role), config
│   ├── bolao/                # Domínio: scoring, rounds, thermometer, referral, pix, ...
│   ├── football-data/        # Client v4 + mappers + sync
│   └── ufmg/scrape.ts        # Scraper de probabilidades (server-only)
supabase/
├── migrations/               # 11 SQL idempotentes
├── seed.sql                  # 48 seleções + 104 partidas
└── email-templates/
vercel.json                  # Cron diário /api/sync/football
```

---

## Como rodar localmente

```bash
npm install
npm run dev      # http://localhost:3000 (Turbopack)
npm run build
npm run start
npm run lint
```

> Requer Node.js compatível com Next.js 16.

---

## Banco de dados

1. Crie um projeto no [Supabase](https://supabase.com).
2. Aplique as 11 migrations em `supabase/migrations/` **em ordem de timestamp**. Todas são idempotentes (`begin; ... commit;`).
3. Rode `supabase/seed.sql` para popular as 48 seleções e 104 partidas (ids `gs-001..gs-072` fase de grupos, `ko-073..ko-104` mata-mata).
4. Promova o primeiro admin:
   ```sql
   update public.profiles set is_admin = true where id = '<seu-uuid>';
   ```

As migrations incluem:
- Schema completo com **Row Level Security** e grants a nível de coluna.
- Função SQL `is_active_member()` usada como `WITH CHECK` em `predictions` — o banco garante Premium + consentimento de ranking.
- Views públicas `public_ranking` e `public_round_scores` (somente `full_name` + pontuação, `security_invoker = true`).
- Grants `service_role` completos (fix do bug 42501 no webhook/checkout).
- Trigger `handle_new_user` cria `profiles` no signup; `gen_referral_code()` gera cupom único de 6 chars.
- RPC `credit_referral` com `ON CONFLICT DO NOTHING` (idempotente).

---

## Variáveis de ambiente

Não existe `.env.example`; crie um `.env.local` com:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Cron / sync
CRON_SECRET=              # bearer para /api/sync/football e /api/sync/football/live
FOOTBALL_DATA_TOKEN=      # X-Auth-Token football-data.org
NEXT_PUBLIC_SITE_URL=https://bolao.mindubier.com

# Pix manual (opcional)
PIX_KEY=
PIX_MERCHANT_NAME=
PIX_MERCHANT_CITY=
PIX_RECEIPT_EMAIL=
```

---

## Arquitetura e decisões

- **App Router com Server Components por padrão**; interatividade isolada em client components em `src/components/*`.
- **Server Actions** (`'use server'`) para toda mutação; cada uma revalida a rota afetada.
- **3 clientes Supabase** com separação clara: `server.ts` (cookies SSR), `client.ts` (browser), `admin.ts` (service-role, bypass RLS, server-only).
- **Defesa em profundidade**: server actions e route handlers revalidam `is_premium` e `agreed_to_ranking`.
- **Idempotência em todo lugar**: webhook Stripe retorna 500 em falha de DB (força retry); `credit_referral` usa `ON CONFLICT DO NOTHING` em `referrals`; `applyScoring` recalcula do zero a cada sync; `requestManualPix` tem índice único em `(user_id) where status='pending'`.
- **Função de pontuação pura** (`scoring.ts`) — sem efeitos colaterais, testável isoladamente.
- **Paginação do PostgREST** (limite de 1000 linhas): `scoring-sync.ts`, `ranking/page.tsx` e `admin/page.tsx` usam `.range(from, from+999)`.
- **BR Code / Pix EMV implementado do zero** (`pix.ts`) com CRC16-CCITT — sem libs de terceiros.
- **UFMG scraper** usa `node:https` com `rejectUnauthorized: false` (cadeia TLS incompleta na UFMG), restrito ao host, com backoff exponencial.
- **Admin fora da competição**: excluído de rankings, bônus de rodada e desempates.
- **Localização pt-BR** (`<html lang="pt-BR">`, datas/números pt-BR) e comentários em português abundantes.

---

## Testes

**Não há setup de testes.** `package.json` só expõe `lint`. Não há jest, vitest, playwright ou similar. A função de pontuação em `src/lib/bolao/scoring.ts` é pura e pronta para unit tests caso deseje adicionar.

---

## Notas sobre o Next.js

Este projeto roda Next.js 16 (App Router + Turbopack), que traz **breaking changes** em relação a APIs, convenções e estrutura de versões anteriores. Antes de escrever código, consulte os guias em `node_modules/next/dist/docs/` (ver `AGENTS.md`). Config relevante:

- `next.config.ts`: `turbopack.root = import.meta.dirname` (evita scanear o diretório home) e remote pattern para Storage do Supabase.
- `tsconfig.json`: strict, alias `@/*` → `./src/*`.
- `vercel.json`: cron `0 6 * * *`.