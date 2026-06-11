import type { createAdminClient } from '@/lib/supabase/admin';
import { calculateMatchPoints } from './scoring';

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Aplica a pontuação no banco para todos os jogos finalizados (gancho do sync).
 * Idempotente: recalcula points_earned de cada palpite e o total_score de cada
 * usuário a partir do zero, então rodar de novo não duplica pontos.
 *
 * Requer Supabase configurado (chamado dentro do /api/sync/football).
 */
export async function applyScoring(admin: Admin): Promise<{ updatedPredictions: number }> {
  // Jogos finalizados com placar definido.
  const { data: finished, error } = await admin
    .from('matches')
    .select('id, home_score, away_score')
    .eq('status', 'finished')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null);

  if (error) throw new Error(`scoring: ler matches: ${error.message}`);
  if (!finished || finished.length === 0) return { updatedPredictions: 0 };

  // Multiplicadores por jogo (jogos turbinados). Ausente → x1.
  const { data: settings } = await admin
    .from('match_settings')
    .select('match_id, score_multiplier');
  const multiplierByMatch = new Map<string, number>();
  for (const s of settings ?? []) {
    multiplierByMatch.set(s.match_id, s.score_multiplier ?? 1);
  }

  const affectedUsers = new Set<string>();
  let updatedPredictions = 0;

  for (const match of finished) {
    const multiplier = multiplierByMatch.get(match.id) ?? 1;
    const { data: preds } = await admin
      .from('predictions')
      .select('id, user_id, home_score_guess, away_score_guess')
      .eq('match_id', match.id);

    for (const p of preds ?? []) {
      const base = calculateMatchPoints(
        p.home_score_guess,
        p.away_score_guess,
        match.home_score,
        match.away_score,
      );
      const points = base * multiplier;
      await admin
        .from('predictions')
        .update({ points_earned: points })
        .eq('id', p.id);
      affectedUsers.add(p.user_id);
      updatedPredictions += 1;
    }
  }

  // Recalcula o total de cada usuário afetado: soma dos points_earned +
  // a correção manual (score_adjustment) aplicada pelo admin.
  for (const userId of affectedUsers) {
    const { data: rows } = await admin
      .from('predictions')
      .select('points_earned')
      .eq('user_id', userId);
    const earned = (rows ?? []).reduce(
      (sum, r) => sum + (r.points_earned ?? 0),
      0,
    );
    const { data: prof } = await admin
      .from('profiles')
      .select('score_adjustment')
      .eq('id', userId)
      .single();
    const adjustment = prof?.score_adjustment ?? 0;
    await admin
      .from('profiles')
      .update({ total_score: earned + adjustment })
      .eq('id', userId);
  }

  return { updatedPredictions };
}
