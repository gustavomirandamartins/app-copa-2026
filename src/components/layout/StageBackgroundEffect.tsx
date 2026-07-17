'use client';

import { useStageBackground, type StageBgKey } from '@/hooks/useStageBackground';

/** Wrapper client para acionar useStageBackground a partir de páginas Server Component. */
export function StageBackgroundEffect({ stage }: { stage: StageBgKey }) {
  useStageBackground(stage);
  return null;
}
