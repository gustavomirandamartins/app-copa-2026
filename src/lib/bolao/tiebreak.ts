/**
 * Lógica pura de desempate por sorteio (Bolão).
 *
 * - Detecta grupos de empate absoluto nas 5 primeiras posições
 *   da Classificação Geral e de cada Classificação por Rodada.
 * - Gera assinaturas determinísticas para identificar e validar sorteios.
 * - Aplica a ordem do sorteio ou sinaliza pendência.
 *
 * Sem I/O — testável de forma isolada.
 */

import type { RoundKey } from './rounds';

// ═══════════════════════════════════════════════════════════
// Tipos públicos
// ═══════════════════════════════════════════════════════════

export type TieScope = 'general' | RoundKey;

/** Critérios de desempate da Classificação Geral. */
export interface GeneralTiebreakers {
  total_score: number;
  prediction_pts: number;
  exact_pts: number;
  diff_pts: number;
  final_pts: number;
  semi_pts: number;
  quarters_pts: number;
  ro16_pts: number;
}

/** Critérios de desempate da Classificação por Rodada. */
export interface RoundTiebreakers {
  points: number;
  exact_pts: number;
  diff_pts: number;
}

/** Linha mínima necessária para detecção (Geral). */
export interface GeneralRow {
  id: string;
  is_admin: boolean;
  tb: GeneralTiebreakers;
}

/** Linha mínima necessária para detecção (Rodada). */
export interface RoundRow {
  user_id: string;
  is_admin: boolean;
  points: number;
  exact_pts: number;
  diff_pts: number;
}

/** Grupo de empate detectado. */
export interface TieGroup {
  scope: TieScope;
  signature: string;
  /** user_ids dos empatados, em ordem estável (por id). */
  memberIds: string[];
  /** Posição 1-based mais alta que o grupo ocupa. */
  topPosition: number;
}

/** Registro de sorteio lido do banco. */
export interface DrawRecord {
  scope: TieScope;
  signature: string;
  /** user_ids na ordem sorteada (1º → último). */
  ordering: string[];
}

/** Resultado de aplicar (ou não) um sorteio sobre um grupo. */
export interface DrawResult {
  /** user_ids reordenados conforme o sorteio (ou ordem estável original). */
  orderedIds: string[];
  /** ids cujas posições foram definidas pelo sorteio. */
  decidedIds: Set<string>;
  /** true quando o grupo não tem sorteio válido salvo. */
  pending: boolean;
}

// ═══════════════════════════════════════════════════════════
// Igualdade de critérios
// ═══════════════════════════════════════════════════════════

/** Todos os critérios de desempate da Geral são idênticos? */
export function equalGeneral(a: GeneralTiebreakers, b: GeneralTiebreakers): boolean {
  return (
    a.total_score    === b.total_score    &&
    a.prediction_pts === b.prediction_pts &&
    a.exact_pts      === b.exact_pts      &&
    a.diff_pts       === b.diff_pts       &&
    a.final_pts      === b.final_pts      &&
    a.semi_pts       === b.semi_pts       &&
    a.quarters_pts   === b.quarters_pts   &&
    a.ro16_pts       === b.ro16_pts
  );
}

/** Todos os critérios de desempate da Rodada são idênticos? */
export function equalRound(a: RoundTiebreakers, b: RoundTiebreakers): boolean {
  return (
    a.points    === b.points    &&
    a.exact_pts === b.exact_pts &&
    a.diff_pts  === b.diff_pts
  );
}

// ═══════════════════════════════════════════════════════════
// Assinatura do grupo de empate
// ═══════════════════════════════════════════════════════════

/**
 * Gera uma string determinística que identifica o grupo de empate.
 * Se qualquer critério ou participante mudar, a assinatura muda.
 * Os memberIds são ordenados alfabeticamente para que a ordem de entrada
 * não altere o resultado (Property 5).
 */
export function tieSignature(
  scope: TieScope,
  level: string,
  memberIds: string[],
): string {
  const ids = [...memberIds].sort().join(',');
  return `${scope}|${level}|${ids}`;
}

/** Nível de empate para a Classificação Geral. */
export function generalLevel(tb: GeneralTiebreakers): string {
  return [
    tb.total_score,
    tb.prediction_pts,
    tb.exact_pts,
    tb.diff_pts,
    tb.final_pts,
    tb.semi_pts,
    tb.quarters_pts,
    tb.ro16_pts,
  ].join(':');
}

/** Nível de empate para a Classificação por Rodada. */
export function roundLevel(tb: RoundTiebreakers): string {
  return `${tb.points}:${tb.exact_pts}:${tb.diff_pts}`;
}

// ═══════════════════════════════════════════════════════════
// Detecção de grupos de empate
// ═══════════════════════════════════════════════════════════

const TOP_N = 5; // faixa com consequência (prêmio/bônus)

/**
 * Detecta grupos de empate absoluto na Classificação Geral.
 *
 * @param rows Participantes já ordenados pelos critérios normais (sem admin).
 *             A posição implícita é rows[i].position = i + 1.
 */
export function detectGeneralTieGroups(rows: GeneralRow[]): TieGroup[] {
  const nonAdmin = rows.filter((r) => !r.is_admin);
  const groups: TieGroup[] = [];
  let i = 0;

  while (i < nonAdmin.length) {
    const pos1 = i + 1; // posição 1-based do primeiro do cluster
    // Cluster de linhas com critérios idênticos ao rows[i]
    let j = i + 1;
    while (j < nonAdmin.length && equalGeneral(nonAdmin[i].tb, nonAdmin[j].tb)) j++;

    const cluster = nonAdmin.slice(i, j);
    const topPosition = pos1;
    const bottomPosition = j; // posição 1-based do último (= j porque 1-indexed)

    // Relevante se o cluster toca o top N e tem ao menos 2 membros
    if (cluster.length >= 2 && topPosition <= TOP_N) {
      const memberIds = cluster.map((r) => r.id);
      const level = generalLevel(nonAdmin[i].tb);
      const sig = tieSignature('general', level, memberIds);
      groups.push({ scope: 'general', signature: sig, memberIds, topPosition });
    }

    i = j;
  }

  return groups;
}

/**
 * Detecta grupos de empate absoluto numa Classificação por Rodada.
 *
 * @param rows Participantes já ordenados pelos critérios normais da rodada.
 * @param roundKey Chave da rodada.
 */
export function detectRoundTieGroups(rows: RoundRow[], roundKey: RoundKey): TieGroup[] {
  const nonAdmin = rows.filter((r) => !r.is_admin);
  const groups: TieGroup[] = [];
  let i = 0;

  while (i < nonAdmin.length) {
    const pos1 = i + 1;
    let j = i + 1;
    const cur = nonAdmin[i];
    while (
      j < nonAdmin.length &&
      equalRound(
        { points: cur.points, exact_pts: cur.exact_pts, diff_pts: cur.diff_pts },
        { points: nonAdmin[j].points, exact_pts: nonAdmin[j].exact_pts, diff_pts: nonAdmin[j].diff_pts },
      )
    ) j++;

    const cluster = nonAdmin.slice(i, j);
    const topPosition = pos1;

    if (cluster.length >= 2 && topPosition <= TOP_N) {
      const memberIds = cluster.map((r) => r.user_id);
      const level = roundLevel({ points: cur.points, exact_pts: cur.exact_pts, diff_pts: cur.diff_pts });
      const sig = tieSignature(roundKey, level, memberIds);
      groups.push({ scope: roundKey, signature: sig, memberIds, topPosition });
    }

    i = j;
  }

  return groups;
}

// ═══════════════════════════════════════════════════════════
// Aplicação do sorteio
// ═══════════════════════════════════════════════════════════

/**
 * Aplica (ou não) um sorteio a um grupo de empate.
 *
 * - Se `draw` existe e a assinatura casa → reordena os membros conforme
 *   a ordem sorteada e marca todos como `decidedByDraw`.
 * - Caso contrário → mantém a ordem estável (memberIds já ordenados por id)
 *   e marca como `pending`.
 */
export function applyDraw(group: TieGroup, draw: DrawRecord | undefined): DrawResult {
  if (draw && draw.signature === group.signature) {
    // Valida que a ordering é uma permutação exata dos membros
    const memberSet = new Set(group.memberIds);
    const orderSet = new Set(draw.ordering);
    const valid =
      draw.ordering.length === group.memberIds.length &&
      draw.ordering.every((id) => memberSet.has(id)) &&
      group.memberIds.every((id) => orderSet.has(id));

    if (valid) {
      return {
        orderedIds: draw.ordering,
        decidedIds: new Set(draw.ordering),
        pending: false,
      };
    }
  }

  // Sem sorteio válido — ordem estável (ids alfabéticos)
  const stable = [...group.memberIds].sort();
  return {
    orderedIds: stable,
    decidedIds: new Set(),
    pending: true,
  };
}

// ═══════════════════════════════════════════════════════════
// Validação da ordem submetida pelo admin
// ═══════════════════════════════════════════════════════════

/**
 * Valida que `orderedIds` é uma permutação exata de `group.memberIds`.
 * Retorna null se válida, ou uma mensagem de erro legível.
 */
export function validateDrawOrder(group: TieGroup, orderedIds: string[]): string | null {
  if (orderedIds.length !== group.memberIds.length) {
    return `A ordem deve conter exatamente ${group.memberIds.length} participantes.`;
  }
  const memberSet = new Set(group.memberIds);
  const seen = new Set<string>();
  for (const id of orderedIds) {
    if (!memberSet.has(id)) return 'Participante inválido na ordem submetida.';
    if (seen.has(id)) return 'Participante duplicado na ordem submetida.';
    seen.add(id);
  }
  return null;
}
