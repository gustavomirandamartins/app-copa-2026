import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { ufmgProbabilities, UFMG_LAST_UPDATED } from '@/data/ufmg-probabilities';
import type { UfmgProbability } from '@/lib/types';
import { ProbabilidadesClient } from '@/components/probabilidades/ProbabilidadesClient';

export const revalidate = 0;

interface ProbRow {
  team_id: string;
  champion: number;
  final: number;
  semifinal: number;
  quarter_final: number;
  round_of_16: number;
  round_of_32: number;
  updated_at: string;
}

export default async function ProbabilidadesPage() {
  let probabilities: UfmgProbability[] = ufmgProbabilities;
  let lastUpdated: string | null = UFMG_LAST_UPDATED;
  let isAdmin = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const [{ data: rows }, { data: auth }] = await Promise.all([
      supabase
        .from('team_probabilities')
        .select('team_id, champion, final, semifinal, quarter_final, round_of_16, round_of_32, updated_at'),
      supabase.auth.getUser(),
    ]);

    const probRows = (rows as ProbRow[] | null) ?? [];
    if (probRows.length > 0) {
      probabilities = probRows
        .map((r) => ({
          teamId: r.team_id,
          champion: Number(r.champion),
          final: Number(r.final),
          semifinal: Number(r.semifinal),
          quarterFinal: Number(r.quarter_final),
          roundOf16: Number(r.round_of_16),
          roundOf32: Number(r.round_of_32),
        }))
        .sort((a, b) => b.champion - a.champion);
      lastUpdated = probRows.reduce<string>(
        (max, r) => (r.updated_at > max ? r.updated_at : max),
        probRows[0].updated_at,
      );
    }

    if (auth?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', auth.user.id)
        .single();
      isAdmin = !!(profile as { is_admin?: boolean } | null)?.is_admin;
    }
  }

  return (
    <ProbabilidadesClient
      probabilities={probabilities}
      isAdmin={isAdmin}
      lastUpdated={lastUpdated}
    />
  );
}
