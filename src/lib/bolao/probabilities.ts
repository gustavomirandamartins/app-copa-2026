import { createAdminClient } from '@/lib/supabase/admin';
import { ufmgProbabilities } from '@/data/ufmg-probabilities';
import type { UfmgProbability } from '@/lib/types';

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
