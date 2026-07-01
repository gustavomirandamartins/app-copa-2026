import { getEnrichedMatches } from '@/lib/bolao/matches';
import { JogosClient } from '@/components/jogos/JogosClient';

export const revalidate = 0;

export default async function JogosPage() {
  const enriched = await getEnrichedMatches();
  return <JogosClient matches={enriched} />;
}
