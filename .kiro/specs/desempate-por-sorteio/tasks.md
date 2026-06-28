# Implementation Plan

## Tasks

- [x] 1. Migração SQL — criar tabela `tiebreak_draws`
- [x] 2. Lib `src/lib/bolao/tiebreak.ts` — lógica pura de detecção e aplicação
- [x] 3. Server actions — `recordTiebreakDraw` e `clearTiebreakDraw` em `admin/actions.ts`
- [x] 4. Componente `AdminTiebreakDraws.tsx` — painel na Central de Controle
- [x] 5. Integrar painel na `admin/page.tsx`
- [x] 6. Integrar detecção + aplicação em `ranking/page.tsx`
- [x] 7. Atualizar `RankingList.tsx` — destaque e tag "Definido por sorteio"
- [x] 8. Atualizar `RoundClassification.tsx` — propagar flags de empate
- [x] 9. Estilos em `ranking.css`
