import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { Profile, MatchSetting } from '@/lib/bolao/types';
import { AdminMatchList } from '@/components/admin/AdminMatchList';
import {
  AdminExtraResults,
  type InitialExtraActuals,
  type SyncedExtraDataByMatch,
} from '@/components/admin/AdminExtraResults';
import { EXTRA_BET_MATCH_IDS, type FirstGoal } from '@/lib/bolao/extra-bets';

/**
 * Página (admin-only) para configurar os multiplicadores de pontos por jogo
 * ("jogos turbinados": x2, x3, x4...).
 */
export default async function AdminJogosPage() {
  if (!isSupabaseConfigured()) redirect('/bolao');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/bolao');

  const { data: me } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!(me as Pick<Profile, 'is_admin'> | null)?.is_admin) {
    redirect('/bolao');
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from('match_settings')
    .select('match_id, score_multiplier');

  const initialMultipliers: Record<string, number> = {};
  for (const s of (data as Pick<MatchSetting, 'match_id' | 'score_multiplier'>[]) ?? []) {
    initialMultipliers[s.match_id] = s.score_multiplier ?? 1;
  }

  // Times reais do mata-mata: o calendário estático (src/data/matches.ts)
  // sempre tem home/away_team_id nulos para essas fases — só sabe "Vencedor
  // do Jogo N" — quem resolve os times de verdade é o applyKnockoutAdvancement
  // do sync, gravado na tabela matches. Sem isso, os nomes das seleções
  // nunca aparecem aqui mesmo depois de decididos.
  const { data: liveMatches } = await admin
    .from('matches')
    .select('id, home_team_id, away_team_id');
  const liveTeamsByMatch: Record<string, { homeTeamId: string | null; awayTeamId: string | null }> = {};
  for (const m of liveMatches ?? []) {
    liveTeamsByMatch[m.id as string] = {
      homeTeamId: m.home_team_id as string | null,
      awayTeamId: m.away_team_id as string | null,
    };
  }

  // Resultados extras: colunas manuais (edição) + colunas de API (só leitura,
  // pra conferência — ver AdminExtraResults/SyncedDataStrip).
  const { data: extraRows } = await admin
    .from('match_extra_results')
    .select('match_id, yellow_home, yellow_away, red_home, red_away, first_goal, shots_home, shots_away, offside_home, offside_away, corner_home, corner_away, fouls_home, fouls_away, ht_home, ht_away, rt_home, rt_away, et_home, et_away, pen_home, pen_away, duration, updated_at')
    .in('match_id', [...EXTRA_BET_MATCH_IDS]);

  const initialExtraActuals: InitialExtraActuals = {};
  const syncedByMatch: SyncedExtraDataByMatch = {};
  for (const r of extraRows ?? []) {
    const id = r.match_id as string;
    initialExtraActuals[id] = {
      yellowHome: r.yellow_home as number | null,
      yellowAway: r.yellow_away as number | null,
      redHome: r.red_home as number | null,
      redAway: r.red_away as number | null,
      firstGoal: r.first_goal as FirstGoal | null,
      shotsHome: r.shots_home as number | null,
      shotsAway: r.shots_away as number | null,
      offsideHome: r.offside_home as number | null,
      offsideAway: r.offside_away as number | null,
      cornerHome: r.corner_home as number | null,
      cornerAway: r.corner_away as number | null,
      foulsHome: r.fouls_home as number | null,
      foulsAway: r.fouls_away as number | null,
    };
    syncedByMatch[id] = {
      ht_home: r.ht_home as number | null,
      ht_away: r.ht_away as number | null,
      rt_home: r.rt_home as number | null,
      rt_away: r.rt_away as number | null,
      et_home: r.et_home as number | null,
      et_away: r.et_away as number | null,
      pen_home: r.pen_home as number | null,
      pen_away: r.pen_away as number | null,
      duration: r.duration as SyncedExtraDataByMatch[string]['duration'],
      updated_at: r.updated_at as string | null,
    };
  }

  return (
    <div className="container">
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <Link
          href="/admin"
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: 'var(--space-sm)' }}
        >
          <ArrowLeft size={15} /> Voltar à central
        </Link>
        <h1 style={{ marginBottom: 'var(--space-sm)' }}>
          <Zap
            size={28}
            style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }}
          />
          Jogos turbinados, cartões e 1º gol
        </h1>
      </section>

      <AdminMatchList initialMultipliers={initialMultipliers} liveTeamsByMatch={liveTeamsByMatch} />

      {/* scroll-margin-top: o header fixo (64px) não pode cobrir o título
          ao chegar aqui direto pelo link com âncora #resultados-extras. */}
      <div id="resultados-extras" style={{ scrollMarginTop: 'calc(var(--header-height) + var(--space-lg))' }}>
        <AdminExtraResults
          initial={initialExtraActuals}
          liveTeamsByMatch={liveTeamsByMatch}
          syncedByMatch={syncedByMatch}
        />
      </div>
    </div>
  );
}
