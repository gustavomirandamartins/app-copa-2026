import { loadTeamProbabilities } from '@/lib/bolao/probabilities';
import { computeEliminatedTeamIds } from '@/lib/bolao/eliminated';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { SelecoesClient } from '@/components/selecoes/SelecoesClient';

export const revalidate = 0;

export default async function SelecoesPage() {
  const probabilities = await loadTeamProbabilities();

  let eliminatedTeamIds: string[] = [];
  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data: matchRows } = await admin
      .from('matches')
      .select('id, status, home_score, away_score, home_penalties, away_penalties, home_team_id, away_team_id');
    eliminatedTeamIds = Array.from(computeEliminatedTeamIds(matchRows ?? []));
  }

  return <SelecoesClient probabilities={probabilities} eliminatedTeamIds={eliminatedTeamIds} />;
}
