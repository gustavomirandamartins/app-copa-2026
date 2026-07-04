'use client';

import { useRouter } from 'next/navigation';
import { Bracket } from '@/components/jogos/Bracket';
import type { Match } from '@/lib/types';

/**
 * Wrapper client para embutir o chaveamento (Bracket) num Server Component.
 * Bracket usa hooks mas não declara 'use client' (só era importado pelo
 * JogosClient, já client). Este limite client permite usá-lo no dashboard.
 */
export function BracketCard({ matches }: { matches: Match[] }) {
  const router = useRouter();
  return (
    <div className="nx-card nx-bracket-card">
      <Bracket
        matches={matches}
        onMatchClick={(match) => router.push(`/jogos#match-${match.id}`)}
      />
    </div>
  );
}
