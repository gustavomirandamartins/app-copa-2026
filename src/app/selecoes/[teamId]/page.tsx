import { loadTeamProbabilities } from '@/lib/bolao/probabilities';
import { SelecaoDetailClient } from '@/components/selecoes/SelecaoDetailClient';

export const revalidate = 0;

export default async function SelecaoPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const probabilities = await loadTeamProbabilities();
  return <SelecaoDetailClient teamId={teamId} prob={probabilities[teamId]} />;
}
