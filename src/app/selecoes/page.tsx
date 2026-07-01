import { loadTeamProbabilities } from '@/lib/bolao/probabilities';
import { SelecoesClient } from '@/components/selecoes/SelecoesClient';

export const revalidate = 0;

export default async function SelecoesPage() {
  const probabilities = await loadTeamProbabilities();
  return <SelecoesClient probabilities={probabilities} />;
}
