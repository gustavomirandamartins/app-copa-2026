'use client';

import { useRouter } from 'next/navigation';
import { Bracket } from './Bracket';
import type { Match } from '@/lib/types';

export function EliminatoriasClient({ matches }: { matches: Match[] }) {
  const router = useRouter();
  return (
    <Bracket
      matches={matches}
      onMatchClick={(match) => router.push(`/jogos#match-${match.id}`)}
    />
  );
}
