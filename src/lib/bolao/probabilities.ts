import { createAdminClient } from '@/lib/supabase/admin';
import { ufmgProbabilities } from '@/data/ufmg-probabilities';
import type { UfmgProbability } from '@/lib/types';

export interface MatchWinProbability {
  /** Vitória do mandante, em % (0-100). */
  home: number;
  /** Empate, em % (0-100). */
  draw: number;
  /** Vitória do visitante, em % (0-100). */
  away: number;
}

/**
 * Probabilidades por seleção, lidas da tabela `team_probabilities` (atualizada
 * pelo admin via upload de planilha) com fallback para os dados estáticos
 * (UFMG). Use SOMENTE no servidor — cria o admin client (service role).
 *
 * Planilha do admin tem 7 colunas: Seleção · 16avos · Oitavas · Quartas ·
 * Semi · Final · Campeão → mapeadas para roundOf32..champion.
 */
export async function loadTeamProbabilities(): Promise<Record<string, UfmgProbability>> {
  const map: Record<string, UfmgProbability> = {};
  for (const p of ufmgProbabilities) map[p.teamId] = p;

  try {
    const admin = createAdminClient();
    const { data } = await admin.from('team_probabilities').select('*');
    for (const r of (data ?? []) as Record<string, unknown>[]) {
      const id = String(r.team_id);
      // 0% em todas as fases é um valor real e válido (seleção eliminada) —
      // ao contrário de match_probabilities, aqui NÃO tratamos zero como
      // "linha em branco". A blindagem contra upload parcial fica só no
      // lado da escrita (uploadTeamProbabilities só grava linhas preenchidas).
      map[id] = {
        teamId: id,
        champion: Number(r.champion),
        final: Number(r.final),
        semifinal: Number(r.semi_final),
        quarterFinal: Number(r.quarter_final),
        roundOf16: Number(r.round_of_16),
        roundOf32: Number(r.round_of_32),
      };
    }
  } catch {
    // Sem banco/credenciais → mantém o fallback estático.
  }
  return map;
}

/**
 * Probabilidades V-E-D por jogo, lidas da tabela `match_probabilities`
 * (atualizada pelo admin via upload de planilha). Sem fallback estático —
 * jogos ainda não preenchidos simplesmente não aparecem no mapa, e quem
 * consome isso cai de volta na estimativa por ranking FIFA.
 */
export async function loadMatchProbabilities(): Promise<Record<number, MatchWinProbability>> {
  const map: Record<number, MatchWinProbability> = {};
  try {
    const admin = createAdminClient();
    const { data } = await admin.from('match_probabilities').select('*');
    for (const r of (data ?? []) as Record<string, unknown>[]) {
      const home = Number(r.home_win);
      const draw = Number(r.draw);
      const away = Number(r.away_win);
      // Linha do template ainda não preenchida pelo admin (upload em branco
      // vira 0/0/0) — ignora para não sobrepor a estimativa por ranking com zeros.
      if (home === 0 && draw === 0 && away === 0) continue;
      map[Number(r.match_number)] = { home, draw, away };
    }
  } catch {
    // Sem banco/credenciais → mapa vazio.
  }
  return map;
}
