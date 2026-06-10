import { NextResponse, type NextRequest } from 'next/server';
import {
  getWorldCupMatches,
  getWorldCupStandings,
  isFootballDataConfigured,
} from '@/lib/football-data/client';
import { resolveTeamId, mapStatus } from '@/lib/football-data/mappers';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyScoring } from '@/lib/bolao/scoring-sync';

/**
 * GET /api/sync/football
 * Sincroniza placares/status e classificação da Copa a partir da
 * football-data.org para o Supabase (fonte da verdade do app).
 *
 * Disparo: Vercel Cron (GET, ver vercel.json) — mas é agnóstico de
 * agendador: qualquer scheduler autenticado pode chamar este endpoint.
 * Segurança: header Authorization: Bearer <CRON_SECRET>.
 *
 * Custo de cota: 2 requisições por execução (matches + standings).
 */
export async function GET(req: NextRequest) {
  // 1) Autorização (Vercel injeta este header quando CRON_SECRET existe).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
  }

  // 2) Pré-condições (inerte até configurar token + Supabase).
  if (!isFootballDataConfigured() || !isSupabaseConfigured()) {
    return NextResponse.json(
      { skipped: true, reason: 'FOOTBALL_DATA_TOKEN ou Supabase ausente.' },
      { status: 200 },
    );
  }

  try {
    const admin = createAdminClient();
    const [{ matches }, { standings }] = await Promise.all([
      getWorldCupMatches(),
      getWorldCupStandings(),
    ]);

    // 3) Upsert de jogos (placar, status e — no mata-mata — times resolvidos).
    const matchRows = matches.map((m) => ({
      external_id: m.id,
      match_time_utc: m.utcDate,
      status: mapStatus(m.status),
      home_team_id: resolveTeamId(m.homeTeam),
      away_team_id: resolveTeamId(m.awayTeam),
      home_score: m.score.fullTime.home,
      away_score: m.score.fullTime.away,
    }));

    const { error: matchErr } = await admin
      .from('matches')
      .upsert(matchRows, { onConflict: 'external_id' });
    if (matchErr) throw new Error(`upsert matches: ${matchErr.message}`);

    // 4) Upsert da classificação (apenas a tabela geral de cada grupo).
    const standingRows = standings
      .filter((s) => s.type === 'TOTAL')
      .flatMap((s) =>
        s.table
          .map((row) => {
            const teamId = resolveTeamId(row.team);
            if (!teamId) return null;
            return {
              group_letter: (s.group ?? '').replace('GROUP_', ''),
              team_id: teamId,
              position: row.position,
              played: row.playedGames,
              won: row.won,
              draw: row.draw,
              lost: row.lost,
              goals_for: row.goalsFor,
              goals_against: row.goalsAgainst,
              goal_difference: row.goalDifference,
              points: row.points,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null),
      );

    if (standingRows.length > 0) {
      const { error: stdErr } = await admin
        .from('standings')
        .upsert(standingRows, { onConflict: 'group_letter,team_id' });
      if (stdErr) throw new Error(`upsert standings: ${stdErr.message}`);
    }

    // 5) Pontuação: calcula pontos dos palpites de jogos finalizados e
    //    atualiza profiles.total_score (idempotente).
    const { updatedPredictions } = await applyScoring(admin);

    return NextResponse.json({
      ok: true,
      matches: matchRows.length,
      standings: standingRows.length,
      scoredPredictions: updatedPredictions,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    // Defensivo: nunca derruba o app; o app segue com o último estado salvo.
    const message = err instanceof Error ? err.message : 'erro desconhecido';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
