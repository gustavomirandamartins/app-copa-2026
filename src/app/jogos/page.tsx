import { getEnrichedMatches } from '@/lib/bolao/matches';
import { loadTeamProbabilities, loadMatchProbabilities } from '@/lib/bolao/probabilities';
import { JogosClient } from '@/components/jogos/JogosClient';

export const revalidate = 0;

export default async function JogosPage() {
  const enriched = await getEnrichedMatches();
  const [teamProbs, matchProbs] = await Promise.all([
    loadTeamProbabilities(),
    loadMatchProbabilities(),
  ]);
  return (
    <JogosClient
      matches={enriched}
      teamProbabilities={teamProbs}
      matchProbabilities={matchProbs}
    />
  );
}
