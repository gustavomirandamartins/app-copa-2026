'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { matches as staticMatches } from '@/data/matches';
import { EXTRA_BET_MATCH_IDS, type ExtraPredictionInput, type FirstGoal } from '@/lib/bolao/extra-bets';
import type { PredictionInput } from '@/lib/bolao/types';

type ActionResult = { ok: boolean; error?: string };

/**
 * Aceita o termo de exibição no ranking público (Task 2).
 * Verifica auth dentro da action, conforme orientação do Next.
 */
export async function acceptRankingConsent(): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase não configurado.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado.' };

  const { error } = await supabase
    .from('profiles')
    .update({ agreed_to_ranking: true })
    .eq('id', user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/bolao');
  return { ok: true };
}

/**
 * Salva (upsert) os palpites do usuário (Task 3).
 * Exige usuário premium e que tenha aceitado o ranking.
 * Requer índice único em predictions(user_id, match_id).
 */
export async function savePredictions(
  predictions: PredictionInput[],
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase não configurado.' };
  }
  if (predictions.length === 0) {
    return { ok: false, error: 'Nenhum palpite para salvar.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado.' };

  // Revalida regra de negócio no servidor (não confiar só na UI).
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium, agreed_to_ranking')
    .eq('id', user.id)
    .single();

  if (!profile?.is_premium) {
    return { ok: false, error: 'Recurso exclusivo para membros Premium.' };
  }
  if (!profile.agreed_to_ranking) {
    return { ok: false, error: 'É preciso aceitar o termo do ranking.' };
  }

  const rows = predictions.map((p) => {
    // Garante que penalty_winner_id é explicitamente null se não vier.
    const penaltyWinner = (typeof p.penalty_winner_id === 'string' && p.penalty_winner_id.length > 0)
      ? p.penalty_winner_id
      : null;

    return {
      user_id: user.id,
      match_id: p.match_id,
      home_score_guess: p.home_score_guess,
      away_score_guess: p.away_score_guess,
      penalty_winner_id: penaltyWinner,
      is_autofilled: p.is_autofilled,
    };
  });

  // Log para diagnóstico — visível no Vercel Function Logs.
  const withPenalty = rows.filter(r => r.penalty_winner_id != null);
  if (withPenalty.length > 0) {
    console.log('[savePredictions] Palpites com pênaltis:', JSON.stringify(withPenalty.map(r => ({
      match_id: r.match_id,
      score: `${r.home_score_guess}x${r.away_score_guess}`,
      penalty_winner_id: r.penalty_winner_id,
    }))));
  }

  // Usa admin client para o upsert: o client autenticado tem column-level
  // grants restritos e pode ignorar silenciosamente colunas novas como
  // penalty_winner_id. A validação de auth e regras já foi feita acima.
  const admin = createAdminClient();
  const { error } = await admin
    .from('predictions')
    .upsert(rows, { onConflict: 'user_id,match_id' });

  if (error) {
    console.error('[savePredictions] Erro no upsert:', error.message);
    return { ok: false, error: error.message };
  }

  // Verificação: ler de volta os palpites com pênaltis para confirmar persistência.
  if (withPenalty.length > 0) {
    const matchIds = withPenalty.map(r => r.match_id);
    const { data: check } = await admin
      .from('predictions')
      .select('match_id, penalty_winner_id')
      .eq('user_id', user.id)
      .in('match_id', matchIds);
    console.log('[savePredictions] Verificação pós-save:', JSON.stringify(check));
  }

  revalidatePath('/bolao');
  return { ok: true };
}

/** Campos numéricos de palpite extra (todos opcionais, 0–20 quando presentes). */
const EXTRA_NUMERIC_FIELDS = [
  'ht_home', 'ht_away', 'h2_home', 'h2_away', 'et_home', 'et_away',
  'pen_home', 'pen_away', 'yellow_home', 'yellow_away', 'red_home', 'red_away',
] as const;

const FIRST_GOAL_VALUES: ReadonlySet<string> = new Set(['home', 'away', 'none']);

/**
 * Salva (upsert) os palpites EXTRAS do usuário (semis = teste; 3º/final = valendo).
 * Mesmas regras de negócio de savePredictions (premium + termo do ranking),
 * mais duas exclusivas:
 *  - só aceita os jogos habilitados (EXTRA_BET_MATCH_IDS);
 *  - trava no SERVIDOR pelo horário estático do jogo — primeiro lock
 *    server-side do app; barato aqui porque os 4 dateUTC são fixos no seed.
 */
export async function saveExtraPredictions(
  inputs: ExtraPredictionInput[],
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase não configurado.' };
  }
  if (inputs.length === 0) {
    return { ok: false, error: 'Nenhum palpite extra para salvar.' };
  }

  const now = Date.now();
  for (const p of inputs) {
    if (!EXTRA_BET_MATCH_IDS.includes(p.match_id)) {
      return { ok: false, error: `Palpites extras não estão habilitados para ${p.match_id}.` };
    }
    const match = staticMatches.find((m) => m.id === p.match_id);
    if (!match || new Date(match.dateUTC).getTime() <= now) {
      return { ok: false, error: 'Esta partida já começou — palpites extras travados.' };
    }
    for (const field of EXTRA_NUMERIC_FIELDS) {
      const v = p[field];
      if (v == null) continue;
      if (!Number.isInteger(v) || v < 0 || v > 20) {
        return { ok: false, error: 'Valores devem ser inteiros entre 0 e 20.' };
      }
    }
    if (p.first_goal != null && !FIRST_GOAL_VALUES.has(p.first_goal)) {
      return { ok: false, error: 'Valor inválido para o palpite de primeiro gol.' };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium, agreed_to_ranking')
    .eq('id', user.id)
    .single();

  if (!profile?.is_premium) {
    return { ok: false, error: 'Recurso exclusivo para membros Premium.' };
  }
  if (!profile.agreed_to_ranking) {
    return { ok: false, error: 'É preciso aceitar o termo do ranking.' };
  }

  const rows = inputs.map((p) => ({
    user_id: user.id,
    match_id: p.match_id,
    ht_home: p.ht_home, ht_away: p.ht_away,
    h2_home: p.h2_home, h2_away: p.h2_away,
    et_home: p.et_home, et_away: p.et_away,
    pen_home: p.pen_home, pen_away: p.pen_away,
    yellow_home: p.yellow_home, yellow_away: p.yellow_away,
    red_home: p.red_home, red_away: p.red_away,
    first_goal: (p.first_goal as FirstGoal | null) ?? null,
  }));

  // Admin client pelo mesmo motivo de savePredictions: escrita em
  // extra_predictions é service_role-only (RLS), validação já feita acima.
  const admin = createAdminClient();
  const { error } = await admin
    .from('extra_predictions')
    .upsert(rows, { onConflict: 'user_id,match_id' });

  if (error) {
    console.error('[saveExtraPredictions] Erro no upsert:', error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath('/bolao');
  return { ok: true };
}
