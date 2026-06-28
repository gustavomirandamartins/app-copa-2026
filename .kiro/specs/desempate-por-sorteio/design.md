# Design Document

**Feature:** Desempate por Sorteio (Bolão)

## Overview

Esta funcionalidade adiciona um mecanismo de desempate por sorteio para o ranking do Bolão. Ela detecta empates absolutos (todos os critérios anteriores ao sorteio idênticos) nas **5 primeiras posições** da Classificação Geral e de cada Classificação por Rodada encerrada, destaca os empatados, permite ao admin registrar a ordem do sorteio ao vivo na Central de Controle, persiste esse resultado e o aplica na classificação com a tag "Definido por sorteio".

Princípios de design, alinhados ao que já existe no projeto:

- **A pontuação não muda.** O sorteio é uma camada de ordenação aplicada *depois* dos critérios existentes; não altera `total_score`, `round_scores` nem o `applyScoring`.
- **Detecção é derivada (stateless).** Os grupos de empate são calculados a cada render a partir dos mesmos dados já lidos pela página de ranking. Nada de empate é persistido — só o *resultado do sorteio*.
- **O sorteio é persistido e validado por assinatura.** Um sorteio só é aplicado enquanto o conjunto de empatados e o nível do empate corresponderem à assinatura registrada (Requisito 7).
- **Leitura server-side via admin client.** A página de ranking já usa `createAdminClient`, então lê a nova tabela diretamente; a tabela fica protegida por RLS (escrita só pelo service_role).

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │  src/lib/bolao/tiebreak.ts  (lógica pura)     │
                    │  - assinatura de empate                        │
                    │  - detecção de grupos de empate (top 5)        │
                    │  - aplicação da ordem do sorteio               │
                    └─────────────────────────────────────────────┘
                          ▲                         ▲
          (detecção+aplicação)               (detecção p/ listar pendentes
                          │                         e validar ordem submetida)
                          │                         │
   ┌──────────────────────┴───────┐     ┌───────────┴───────────────────────┐
   │  src/app/ranking/page.tsx     │     │  src/app/admin/actions.ts          │
   │  - lê tiebreak_draws (admin)  │     │  - recordTiebreakDraw(scope,order) │
   │  - marca pending / decided    │     │  - clearTiebreakDraw(scope,sig)    │
   │  - passa flags p/ componentes │     └───────────┬───────────────────────┘
   └──────────────┬────────────────┘                 │
                  │                                   │
   ┌──────────────▼───────────────┐     ┌─────────────▼──────────────────────┐
   │ RankingList / RoundClassif.   │     │ src/app/admin/page.tsx              │
   │ - destaque dos empatados      │     │ + <AdminTiebreakDraws/>             │
   │ - tag "Definido por sorteio"  │     │   (lista pendentes + define ordem)  │
   └───────────────────────────────┘     └─────────────────────────────────────┘

   Persistência:  public.tiebreak_draws  (nova migração SQL, RLS service_role)
```

## Data Models

### Nova tabela: `public.tiebreak_draws`

Migração nova em `supabase/migrations/` (timestamp seguindo o padrão `YYYYMMDDHHMMSS_tiebreak_draws.sql`), idempotente.

| Coluna       | Tipo          | Descrição |
|--------------|---------------|-----------|
| `id`         | uuid PK       | `default gen_random_uuid()` |
| `scope`      | text          | `'general'` ou a `round_key` (ex.: `'group-1'`, `'round-of-16'`) |
| `signature`  | text          | Assinatura determinística do grupo de empate (ver abaixo) |
| `ordering`   | uuid[]        | user_ids na ordem sorteada (1º → último) |
| `created_by` | uuid          | admin que registrou (`references profiles(id)`) |
| `created_at` | timestamptz   | `default now()` |

- **Chave única:** `unique (scope, signature)` — registrar de novo o mesmo empate substitui (upsert) a ordem.
- **RLS:** `enable row level security`; `revoke all from anon, authenticated`. Só o `service_role` escreve/lê via server. A página de ranking lê com `createAdminClient` (service_role), então não é necessária view pública.
- **Índice:** o `unique (scope, signature)` já cobre a busca por escopo.

### Assinatura do empate (`signature`)

String determinística que identifica univocamente o grupo de empate e o nível em que ele ocorre. Construída por:

```
scope + "|" + nivelDoEmpate + "|" + user_ids_ordenados_alfabeticamente.join(",")
```

- `nivelDoEmpate` para a Geral = `total_score:prediction_pts:exact_pts:diff_pts:final_pts:semi_pts:quarters_pts:ro16_pts` (os valores idênticos do grupo).
- `nivelDoEmpate` para a Rodada = `points:exact_pts:diff_pts`.

Assim, se qualquer critério mudar (desfazendo ou alterando o empate) ou se a composição do grupo mudar, a assinatura muda e o sorteio salvo deixa de casar — atendendo aos Requisitos 7.1 e 7.2. O registro antigo permanece na tabela (histórico), mas não é aplicado (Requisito 7.4).

## Components and Interfaces

### Lógica de detecção e aplicação — `src/lib/bolao/tiebreak.ts`

Módulo puro (sem I/O), testável isoladamente.

### Tipos

```ts
export type TieScope = 'general' | RoundKey;

export interface TieGroup {
  scope: TieScope;
  signature: string;
  /** user_ids dos empatados, na ordem "natural" (estável) antes do sorteio. */
  memberIds: string[];
  /** Posição (1-based) mais alta ocupada pelo grupo. */
  topPosition: number;
}

export interface DrawRecord {
  scope: TieScope;
  signature: string;
  ordering: string[]; // user_ids
}
```

### Funções

- `equalGeneral(a, b): boolean` — compara `total_score` + os 7 campos de desempate (reaproveita a semântica de `compareTiebreakers`, mas como igualdade).
- `equalRound(a, b): boolean` — compara `points`, `exact_pts`, `diff_pts`.
- `tieSignature(scope, level, memberIds): string` — monta a assinatura.
- `detectTieGroups(rankedRows, opts): TieGroup[]` — recebe as linhas **já ordenadas** e numeradas (excluindo o admin), agrupa vizinhos iguais (pela função de igualdade), e retorna apenas grupos com `length >= 2` cujo intervalo de posições intersecta `1..5` (faixa configurável).
- `applyDraw(group, rows, draw): { ordered, decidedIds }` — quando `draw.signature === group.signature`, reordena os membros conforme `draw.ordering`; senão mantém a ordem natural e marca o grupo como pendente.

### Faixa relevante (top 5)

A detecção só considera grupos que tocam as 5 primeiras posições **entre os participantes (não-admin)**. A numeração de posição segue a regra atual (admin "fora de competição" não ocupa posição). Um grupo cujo `topPosition <= 5` é relevante (mesmo que parte do grupo passe da 5ª posição — ex.: empate triplo nas posições 4-5-6 é relevante e deve ser sorteado por inteiro, pois afeta o 4º e o 5º prêmios).

### Server Actions — `src/app/admin/actions.ts`

### `recordTiebreakDraw(scope, orderedUserIds)`

1. `requireAdmin()`.
2. Recalcula os grupos de empate do escopo informado (Geral ou rodada) a partir dos dados atuais — **não confia apenas no cliente**.
3. Localiza o grupo de empate cujo conjunto de membros é exatamente `orderedUserIds` (como conjunto). Se não existir grupo pendente correspondente → erro (`Empate não encontrado ou já resolvido.`).
4. Valida que `orderedUserIds` é uma permutação exata dos membros (sem faltas/repetições) (Requisito 4.3).
5. `upsert` em `tiebreak_draws` por `(scope, signature)` com a `ordering` e `created_by`/`created_at`.
6. `revalidatePath('/ranking')` e `revalidatePath('/admin')`.

### `clearTiebreakDraw(scope, signature)` (opcional, refazer sorteio)

1. `requireAdmin()`. 2. `delete` por `(scope, signature)`. 3. revalida.

Ambas reutilizam a verificação `requireAdmin` já existente (Requisito 4.4).

### Integração na página de Ranking — `src/app/ranking/page.tsx`

1. Após montar `ranking` (Geral, já ordenado) e os `roundRows` por rodada, **ler** `tiebreak_draws` via admin client para um mapa `(scope) → DrawRecord[]`.
2. **Geral**: numerar os não-admin, rodar `detectTieGroups` (faixa top 5). Para cada grupo:
   - Se houver `draw` com assinatura igual → aplicar a ordem e marcar cada membro com `decidedByDraw = true`.
   - Senão → marcar membros com `pendingDraw = true` e atribuir-lhes a mesma posição exibida (a `topPosition` do grupo) (Requisito 3.3).
3. **Por rodada**: o mesmo, usando `equalRound`, dentro de `sortRound`/`roundOptions`, somente para rodadas `complete`.
4. Passar dois novos sinais por linha aos componentes: `pendingDraw?: boolean` e `decidedByDraw?: boolean` (em `RankedUserRow`).

> Observação: a ordenação base e a numeração permanecem como hoje para quem não está em empate (Requisito 8.2). A renumeração contínua é preservada porque a aplicação do sorteio apenas reordena *dentro* do grupo, sem alterar a contagem total.

### Componentes de UI

### `RankingList.tsx` (Geral) e `RoundClassification`/lista de rodada

- Adicionar à interface `RankedUserRow`: `pendingDraw?: boolean`, `decidedByDraw?: boolean`.
- **Pendente de sorteio**: aplicar classe de destaque na linha (ex.: `ranking-row--tie`) e, quando `pendingDraw`, exibir a mesma posição para todos do grupo + uma tag/《texto》 "Empate — aguardando sorteio". (Requisitos 3.1, 3.2, 3.3)
- **Resolvido por sorteio**: exibir a tag "Definido por sorteio" ao lado do nome (Requisito 6.2). Estilo análogo às tags existentes (`ranking-tag`).
- Estilos novos em `ranking.css` (ex.: `.ranking-row--tie`, `.tag-draw`).

### `AdminTiebreakDraws.tsx` (novo, client component) em `/admin`

- Recebe a lista de grupos de empate pendentes e resolvidos (calculados no server component `admin/page.tsx`), cada um com `scope`, `signature`, label do escopo (ex.: "Classificação Geral", "Rodada 2 · Grupos") e os participantes (id + nome).
- Para cada grupo **pendente**: um controle para definir a ordem — uma sequência de seletores "1º lugar: [participante]", "2º lugar: [participante]", … garantindo permutação; ou lista reordenável. Botão "Registrar sorteio" chama `recordTiebreakDraw`.
- Para cada grupo **resolvido**: mostra a ordem registrada e um botão "Refazer" (`clearTiebreakDraw`).
- Renderizada em `admin/page.tsx`, que passa a calcular os grupos de empate (reusando `tiebreak.ts`) e a ler `tiebreak_draws`.

## Fluxo (Sequence)

```
Sync atualiza pontos ──► ranking/page detecta empate absoluto no top 5
   │                         │
   │                         ├─ sem sorteio salvo → destaca empatados + "aguardando sorteio"
   │                         └─ admin/page lista o grupo em "Sorteios pendentes"
   │
Admin faz sorteio ao vivo ──► define a ordem em <AdminTiebreakDraws/>
   │                         └─ recordTiebreakDraw valida (server) + upsert tiebreak_draws
   │
revalidate /ranking ───────► aplica ordem + tag "Definido por sorteio"
   │
Novo sync muda pontos ─────► assinatura muda → sorteio antigo ignorado → volta a "aguardando"
```

## Edge Cases

- **Admin no meio do empate**: o admin nunca entra no grupo (filtrado antes da detecção). (Req. 1.3)
- **Empate que toca a 5ª posição mas se estende além** (ex.: 3 empatados em 4º-5º-6º): grupo inteiro é sorteado, pois afeta posições premiadas. (decisão de faixa)
- **Empate fora do top 5**: ignorado (sem destaque, sem sorteio). (Decisão confirmada 1)
- **Ordem submetida não corresponde ao grupo atual**: ação rejeita (set diferente / empate sumiu). (Req. 4.3, 7)
- **Múltiplos grupos de empate distintos**: tratados independentemente por assinatura. (Req. 8.3)
- **Sorteio salvo, empate desfeito por novos pontos**: assinatura não casa → não aplica, não exibe tag, volta a ordenar normalmente. (Req. 7.1, 7.3)
- **Rodada ainda aberta**: nenhuma detecção/sorteio para ela. (Req. 2.3)

## Correctness Properties

### Property 1: Não-alteração de pontos
Aplicar/registrar/limpar um sorteio nunca muda `total_score`, `round_scores` nem `points_earned`. O sorteio só reordena dentro do grupo de empate.
**Validates: Requirements 6.1, 6.3, 8.2**

### Property 2: Permutação
A `ordering` registrada é sempre uma permutação exata dos `memberIds` do grupo (sem faltas/repetições).
**Validates: Requirements 4.3, 4.2**

### Property 3: Validade por assinatura
Um sorteio só é aplicado quando `draw.signature == group.signature`; caso contrário, a ordenação natural prevalece e nenhuma tag é exibida.
**Validates: Requirements 7.1, 7.2, 7.3, 6.1**

### Property 4: Idempotência da numeração
Com ou sem sorteio aplicado, a numeração de posições dos participantes é contínua (1..N sem buracos), respeitando o admin "fora de competição".
**Validates: Requirements 8.1, 8.2, 1.3**

### Property 5: Estabilidade da assinatura
`tieSignature` independe da ordem de entrada dos `memberIds` (ids ordenados internamente).
**Validates: Requirements 5.3**

### Property 6: Faixa relevante
Apenas grupos com `topPosition <= 5` produzem destaque/sorteio.
**Validates: Requirements 1.2, 2.2**

### Property 7: Determinismo de detecção
Rodar a detecção duas vezes sobre os mesmos dados produz os mesmos grupos e assinaturas (seguro para SSR/render repetido).
**Validates: Requirements 1.1, 2.1, 8.3**

## Error Handling

- **Acesso negado:** `recordTiebreakDraw`/`clearTiebreakDraw` retornam `{ ok: false, error }` para não-admin (via `requireAdmin`), sem efeito no banco.
- **Permutação inválida:** se `orderedUserIds` não for permutação exata do grupo, a ação rejeita com mensagem clara e não grava nada.
- **Grupo inexistente/desatualizado:** se não houver grupo de empate pendente correspondente (empate sumiu ou composição mudou), a ação rejeita; o cliente deve recarregar para ver o estado atual.
- **Falha de banco:** erros de `upsert`/`delete` são logados (`console.error`) e retornam `{ ok: false, error }` genérico ao admin; a UI mantém o estado anterior.
- **Leitura na página de ranking:** se a leitura de `tiebreak_draws` falhar, a página degrada para o comportamento atual (ordenação por critérios, empatados exibidos como pendentes) sem quebrar a renderização.

## Testing Strategy

- **Unit (lib/tiebreak.ts):**
  - `detectTieGroups`: sem empate; empate 2-way no top 5; empate 3-way cruzando a 5ª posição; empate fora do top 5 (ignorado); empate envolvendo admin (admin filtrado).
  - `tieSignature`: estabilidade (ordem dos ids não muda a assinatura) e mudança quando um critério muda.
  - `applyDraw`: assinatura casando (reordena) e não casando (mantém + pendente).
- **Server action (recordTiebreakDraw):** rejeita não-admin; rejeita permutação inválida; rejeita grupo inexistente; upsert correto.
- **Integração (ranking/page):** com sorteio salvo aplica ordem + tag; sem sorteio destaca pendentes; após mudança de pontos, sorteio é ignorado.
- **Build/lint:** `npx tsc --noEmit` e verificação dos componentes alterados.

## Arquivos afetados

- **Novo:** `supabase/migrations/<timestamp>_tiebreak_draws.sql`
- **Novo:** `src/lib/bolao/tiebreak.ts`
- **Novo:** `src/components/admin/AdminTiebreakDraws.tsx`
- **Alterado:** `src/app/admin/actions.ts` (ações `recordTiebreakDraw`, `clearTiebreakDraw`)
- **Alterado:** `src/app/admin/page.tsx` (calcular grupos + renderizar painel)
- **Alterado:** `src/app/ranking/page.tsx` (ler sorteios, detectar, aplicar, passar flags)
- **Alterado:** `src/components/ranking/RankingList.tsx` (flags `pendingDraw`/`decidedByDraw` + UI)
- **Alterado:** `src/components/ranking/RoundClassification.tsx` (propagar flags)
- **Alterado:** `src/app/ranking/ranking.css` (estilos de destaque e tag)
