import { Network } from 'lucide-react';
import { getEnrichedMatches } from '@/lib/bolao/matches';
import { Bracket } from '@/components/jogos/Bracket';

export const revalidate = 0;

export default async function EliminatoriasPage() {
  const matches = await getEnrichedMatches();

  return (
    <div className="container">
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="animate-fade-in" style={{ marginBottom: 'var(--space-sm)' }}>
          <Network size={28} style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }} />
          Eliminatórias
        </h1>
        <p className="animate-fade-in" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          16 Avos, Oitavas, Quartas, Semifinais, Final e Decisão do 3º lugar.
        </p>
      </section>

      <Bracket matches={matches} />
    </div>
  );
}
