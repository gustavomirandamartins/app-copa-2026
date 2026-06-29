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

  const rows = predictions.map((p) => ({
    user_id: user.id,
    match_id: p.match_id,
    home_score_guess: p.home_score_guess,
    away_score_guess: p.away_score_guess,
    penalty_winner_id: p.penalty_winner_id ?? null,
    is_autofilled: p.is_autofilled,
  }));

  // Usa admin client para o upsert: o client autenticado tem column-level
  // grants restritos e pode ignorar silenciosamente colunas novas como
  // penalty_winner_id. A validação de auth e regras já foi feita acima.
  const admin = createAdminClient();
  const { error } = await admin
    .from('predictions')
    .upsert(rows, { onConflict: 'user_id,match_id' });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/bolao');
  return { ok: true };
}
