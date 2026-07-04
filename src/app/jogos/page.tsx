import { getEnrichedMatches } from '@/lib/bolao/matches';
import { loadTeamProbabilities, loadMatchProbabilities } from '@/lib/bolao/probabilities';
import { JogosClient } from '@/components/jogos/JogosClient';
import '../dashboard.css';

export const revalidate = 0;

export default async function JogosPage() {
  const enriched = await getEnrichedMatches();
  const probabilities = await loadTeamProbabilities();
  const matchProbabilities = await loadMatchProbabilities();
  return (
    <JogosClient
      matches={enriched}
      probabilities={probabilities}
      matchProbabilities={matchProbabilities}
    />
  );
}
