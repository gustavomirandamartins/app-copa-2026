import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { matches as staticMatches } from '@/data/matches';
import { JogosClient } from '@/components/jogos/JogosClient';
import type { Match, MatchStatus } from '@/lib/types';

export const revalidate = 0;

export default async function JogosPage() {
  const enriched: Match[] = [...staticMatches];

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data } = await admin
      .from('matches')
      .select('id, status, home_score, away_score, home_penalties, away_penalties, home_team_id, away_team_id');

    if (data && data.length > 0) {
      const liveById = new Map(
        data.map((r) => {
          const liveData: any = {
            status: r.status as MatchStatus,
            homeGoals: r.home_score as number | null,
            awayGoals: r.away_score as number | null,
            homePenalties: r.home_penalties as number | null,
            awayPenalties: r.away_penalties as number | null,
          };
          if (r.home_team_id) liveData.homeTeamId = r.home_team_id;
          if (r.away_team_id) liveData.awayTeamId = r.away_team_id;
          return [r.id, liveData];
        }),
      );
      for (let i = 0; i < enriched.length; i++) {
        const live = liveById.get(enriched[i].id);
        if (live) enriched[i] = { ...enriched[i], ...live };
      }
    }
  }

  return <JogosClient matches={enriched} />;
}
