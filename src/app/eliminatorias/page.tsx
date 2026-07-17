import { Network } from 'lucide-react';
import { getEnrichedMatches } from '@/lib/bolao/matches';
import { EliminatoriasClient } from '@/components/jogos/EliminatoriasClient';
import { StageBackgroundEffect } from '@/components/layout/StageBackgroundEffect';

export const revalidate = 0;

export default async function EliminatoriasPage() {
  const matches = await getEnrichedMatches();
  // Mesmo tema da Início: bronze (3º lugar) até a disputa terminar, daí final.
  const thirdPlaceFinished = matches.find((m) => m.id === 'ko-103')?.status === 'finished';

  return (
    <div className="container">
      <StageBackgroundEffect stage={thirdPlaceFinished ? 'final' : 'bronze'} />
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="animate-fade-in" style={{ marginBottom: 'var(--space-sm)' }}>
          <Network size={28} style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }} />
          Eliminatórias
        </h1>
        <p className="animate-fade-in" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          16 Avos, Oitavas, Quartas, Semifinais, Final e Decisão do 3º lugar.
        </p>
      </section>

      <EliminatoriasClient matches={matches} />
    </div>
  );
}
