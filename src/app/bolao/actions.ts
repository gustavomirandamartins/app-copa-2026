'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
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
