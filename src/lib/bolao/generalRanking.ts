import type { createAdminClient } from '@/lib/supabase/admin';
import { matches as staticMatches } from '@/data/matches';

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Critérios de desempate oficiais da Classificação Geral, na ordem em que
 * `compareGeneral` os aplica (após empate em total_score):
 *   1) prediction_pts — pontos de palpites, sem bônus de rodada/indicação
 *   2) exact_pts       — pontos OBTIDOS em acertos de placar exato (com turbo)
 *   3) diff_pts        — pontos OBTIDOS em acertos de vencedor+saldo (com turbo)
 *   4) final_pts · 5) semi_pts · 6) quarters_pts · 7) ro16_pts
 * Os critérios 2 e 3 valem pelos pontos realmente ganhos na categoria, não
 * pela quantidade de acertos — um acerto turbinado pesa mais que vários
 * acertos normais. Mesma regra aplicada na Classificação por Rodada
 * (ver scoring-sync.ts).
 */
export interface GeneralTiebreak {
  prediction_pts: number;
  exact_pts: number;
  diff_pts: number;
  final_pts: number;
  semi_pts: number;
  quarters_pts: number;
  ro16_pts: number;
}

/** Só para exibição (contagem de acertos por categoria) — não entra no desempate. */
export interface GeneralBreakdown {
  winner_pts: number;
  exact_count: number;
  diff_count: number;
  winner_count: number;
  exact_turbo_count: number;
  diff_turbo_count: number;
  winner_turbo_count: number;
}

export interface GeneralRankedUser {
  id: string;
  full_name: string | null;
  total_score: number;
  is_admin: boolean;
  referral_bonus: number;
  score_adjustment: number;
  tb: GeneralTiebreak;
  breakdown: GeneralBreakdown;
}

const EMPTY_TB: GeneralTiebreak = {
  prediction_pts: 0, exact_pts: 0, diff_pts: 0,
  final_pts: 0, semi_pts: 0, quarters_pts: 0, ro16_pts: 0,
};

const EMPTY_BREAKDOWN: GeneralBreakdown = {
  winner_pts: 0,
  exact_count: 0, diff_count: 0, winner_count: 0,
  exact_turbo_count: 0, diff_turbo_count: 0, winner_turbo_count: 0,
};

function compareGeneral(a: GeneralTiebreak, b: GeneralTiebreak): number {
  if (b.prediction_pts !== a.prediction_pts) return b.prediction_pts - a.prediction_pts;
  if (b.exact_pts      !== a.exact_pts)      return b.exact_pts      - a.exact_pts;
  if (b.diff_pts       !== a.diff_pts)       return b.diff_pts       - a.diff_pts;
  if (b.final_pts      !== a.final_pts)      return b.final_pts      - a.final_pts;
  if (b.semi_pts       !== a.semi_pts)       return b.semi_pts       - a.semi_pts;
  if (b.quarters_pts   !== a.quarters_pts)   return b.quarters_pts   - a.quarters_pts;
  if (b.ro16_pts       !== a.ro16_pts)       return b.ro16_pts       - a.ro16_pts;
  return 0;
}

export type PredRow = { user_id: string; match_id: string; points_earned: number; base_points: number | null };

/**
 * Lê TODOS os palpites já pontuados, paginando de 1000 em 1000 (o PostgREST
 * corta em 1000 linhas; sem paginar, os desempates ficam errados quando há
 * mais de 1000 palpites).
 */
async function fetchAllScoredPredictions(admin: Admin): Promise<PredRow[]> {
  const pageSize = 1000;
  const all: PredRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data } = await admin
      .from('predictions')
      .select('user_id, match_id, points_earned, base_points')
      .not('points_earned', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    const rows = (data ?? []) as PredRow[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

export interface ProfileRow {
  id: string; full_name: string | null; total_score: number; is_admin: boolean;
  referral_bonus: number; score_adjustment: number;
}

/**
 * Núcleo puro (sem I/O) do cálculo da Classificação Geral — usado tanto por
 * `computeGeneralRanking` quanto por chamadores que já têm `profiles`/`preds`
 * em mãos (evita buscar predictions duas vezes na mesma página).
 */
export function buildGeneralRanking(profiles: ProfileRow[], preds: PredRow[]): GeneralRankedUser[] {
  const finalIds    = new Set(staticMatches.filter((m) => m.stage === 'final').map((m) => m.id));
  const semiIds     = new Set(staticMatches.filter((m) => m.stage === 'semi-final').map((m) => m.id));
  const quartersIds = new Set(staticMatches.filter((m) => m.stage === 'quarter-final').map((m) => m.id));
  const ro16Ids     = new Set(staticMatches.filter((m) => m.stage === 'round-of-16').map((m) => m.id));

  const tbMap = new Map<string, GeneralTiebreak>();
  const bdMap = new Map<string, GeneralBreakdown>();
  for (const p of preds) {
    const t  = tbMap.get(p.user_id) ?? { ...EMPTY_TB };
    const bd = bdMap.get(p.user_id) ?? { ...EMPTY_BREAKDOWN };
    const pts  = p.points_earned;
    const base = p.base_points ?? 0;
    t.prediction_pts += pts;
    // base_points grava o total já com o bônus de +1 por acertar o vencedor
    // dos pênaltis num mata-mata empatado: um placar exato "puro" vale 5,
    // mas com o bônus vale 6 (idem 3→4 para saldo certo). Checar só "=== 5"
    // ou "=== 3" perdia esses acertos inteiros do desempate.
    if (base === 5 || base === 6) {
      t.exact_pts += pts;
      bd.exact_count += 1; if (pts > base) bd.exact_turbo_count += 1;
    }
    if (base === 3 || base === 4) {
      t.diff_pts += pts;
      bd.diff_count += 1; if (pts > base) bd.diff_turbo_count += 1;
    }
    if (base === 1) {
      bd.winner_pts += pts; bd.winner_count += 1; if (pts > base) bd.winner_turbo_count += 1;
    }
    if (finalIds.has(p.match_id))    t.final_pts    += pts;
    if (semiIds.has(p.match_id))     t.semi_pts     += pts;
    if (quartersIds.has(p.match_id)) t.quarters_pts += pts;
    if (ro16Ids.has(p.match_id))     t.ro16_pts     += pts;
    tbMap.set(p.user_id, t);
    bdMap.set(p.user_id, bd);
  }

  return profiles
    .map((pr) => ({
      id: pr.id,
      full_name: pr.full_name,
      total_score: pr.total_score ?? 0,
      is_admin: pr.is_admin ?? false,
      referral_bonus: pr.referral_bonus ?? 0,
      score_adjustment: pr.score_adjustment ?? 0,
      tb: tbMap.get(pr.id) ?? { ...EMPTY_TB },
      breakdown: bdMap.get(pr.id) ?? { ...EMPTY_BREAKDOWN },
    }))
    .sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      return compareGeneral(a.tb, b.tb);
    });
}

/**
 * Classificação Geral já ordenada pelos critérios de desempate oficiais.
 * Fonte única — usada tanto pela página /ranking quanto pelo card de
 * Classificação da home, para as duas nunca divergirem entre si.
 */
export async function computeGeneralRanking(admin: Admin): Promise<GeneralRankedUser[]> {
  const [{ data: profilesData }, preds] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, total_score, is_admin, referral_bonus, score_adjustment')
      .eq('agreed_to_ranking', true),
    fetchAllScoredPredictions(admin),
  ]);

  const profiles = (profilesData ?? []) as ProfileRow[];
  return buildGeneralRanking(profiles, preds);
}
