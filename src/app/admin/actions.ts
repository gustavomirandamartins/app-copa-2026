'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runFootballSync } from '@/lib/football-data/sync';
import { creditReferralOnPremium } from '@/lib/bolao/referral';
import { validateDrawOrder } from '@/lib/bolao/tiebreak';
import type { TieGroup } from '@/lib/bolao/tiebreak';
import type { Profile } from '@/lib/bolao/types';

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Confirma que o usuário logado é admin. Lê o próprio profile pela sessão
 * (RLS garante que só vê a própria linha); retorna o user id se for admin.
 */
async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado.' };

  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!(data as Pick<Profile, 'is_admin'> | null)?.is_admin) {
    return { error: 'Acesso restrito a administradores.' };
  }
  return { userId: user.id };
}

/** Linha de probabilidade já normalizada (vinda do parse da planilha). */
export interface ProbUploadRow {
  teamId: string;
  roundOf32: number;
  roundOf16: number;
  quarterFinal: number;
  semiFinal: number;
  final: number;
  champion: number;
}

/**
 * Substitui as probabilidades por seleção na tabela `team_probabilities`,
 * a partir das linhas já parseadas da planilha (Seleção · 16avos · Oitavas ·
 * Quartas · Semi · Final · Campeão). Só admin.
 */
export async function uploadTeamProbabilities(
  rows: ProbUploadRow[],
): Promise<AdminActionResult & { count?: number }> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };
  if (!rows.length) return { ok: false, error: 'Nenhuma linha válida na planilha.' };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const payload = rows.map((r) => ({
    team_id: r.teamId,
    round_of_32: r.roundOf32,
    round_of_16: r.roundOf16,
    quarter_final: r.quarterFinal,
    semi_final: r.semiFinal,
    final: r.final,
    champion: r.champion,
    updated_at: now,
  }));

  const { error } = await admin
    .from('team_probabilities')
    .upsert(payload, { onConflict: 'team_id' });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/');
  return { ok: true, count: payload.length };
}

export interface SyncActionResult {
  ok: boolean;
  matches?: number;
  advanced?: number;
  standings?: number;
  scoredPredictions?: number;
  syncedAt?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

/**
 * Dispara o sync de placares/classificação da Copa manualmente.
 * Mesma lógica do cron GET /api/sync/football, sem passar pelo HTTP.
 */
export async function triggerSync(): Promise<SyncActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };

  try {
    const result = await runFootballSync();
    revalidatePath('/bolao');
    revalidatePath('/jogos');
    revalidatePath('/grupos');
    revalidatePath('/ranking');
    revalidatePath('/admin');
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido';
    console.error('[admin] triggerSync falhou:', message);
    return { ok: false, error: message };
  }
}



/** Aprova uma solicitação de Pix: libera o Premium e marca como aprovada. */
export async function approvePayment(requestId: string): Promise<AdminActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };

  const admin = createAdminClient();

  // Lê a solicitação (ignora se já foi revisada).
  const { data: reqRow, error: readErr } = await admin
    .from('payment_requests')
    .select('id, user_id, status')
    .eq('id', requestId)
    .single();

  if (readErr || !reqRow) {
    return { ok: false, error: 'Solicitação não encontrada.' };
  }
  if (reqRow.status !== 'pending') {
    return { ok: false, error: 'Esta solicitação já foi revisada.' };
  }

  // 1) Concede o Premium.
  const { error: grantErr } = await admin
    .from('profiles')
    .update({ is_premium: true })
    .eq('id', reqRow.user_id);
  if (grantErr) {
    console.error('[admin] falha ao conceder Premium:', grantErr);
    return { ok: false, error: 'Falha ao liberar o acesso. Tente novamente.' };
  }

  // Premium concedido → credita quem indicou (idempotente).
  await creditReferralOnPremium(admin, reqRow.user_id);

  // 2) Marca a solicitação como aprovada.
  const { error: updErr } = await admin
    .from('payment_requests')
    .update({
      status: 'approved',
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);
  if (updErr) {
    console.error('[admin] Premium liberado mas falhou ao marcar a solicitação:', updErr);
    // Premium já foi concedido — não é crítico bloquear, mas avisamos.
    return { ok: false, error: 'Acesso liberado, mas houve erro ao atualizar o status.' };
  }

  revalidatePath('/admin');
  return { ok: true };
}

/** Rejeita uma solicitação de Pix (não altera o Premium). */
export async function rejectPayment(requestId: string): Promise<AdminActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from('payment_requests')
    .update({
      status: 'rejected',
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) {
    console.error('[admin] falha ao rejeitar solicitação:', error);
    return { ok: false, error: 'Não foi possível rejeitar a solicitação.' };
  }

  revalidatePath('/admin');
  return { ok: true };
}

/**
 * Edita o nome de exibição do usuário (profiles.full_name) — é o nome que
 * aparece na classificação pública. Admin-only.
 */
export async function updateDisplayName(
  userId: string,
  name: string,
): Promise<AdminActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: 'O nome deve ter ao menos 2 caracteres.' };
  }
  if (trimmed.length > 80) {
    return { ok: false, error: 'O nome deve ter no máximo 80 caracteres.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ full_name: trimmed })
    .eq('id', userId);

  if (error) {
    console.error('[admin] falha ao atualizar nome de exibição:', error);
    return { ok: false, error: 'Não foi possível atualizar o nome.' };
  }

  revalidatePath('/admin');
  return { ok: true };
}

/**
 * Corrige a pontuação de um usuário: adiciona (delta > 0) ou subtrai
 * (delta < 0) pontos. Guarda a correção em score_adjustment (para sobreviver
 * ao recálculo do sync) e ajusta o total_score na hora. Admin-only.
 */
export async function adjustScore(
  userId: string,
  delta: number,
): Promise<AdminActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };

  if (!Number.isInteger(delta) || delta === 0) {
    return { ok: false, error: 'Informe um número inteiro diferente de zero.' };
  }

  const admin = createAdminClient();
  const { data: prof, error: readErr } = await admin
    .from('profiles')
    .select('total_score, score_adjustment')
    .eq('id', userId)
    .single();

  if (readErr || !prof) {
    return { ok: false, error: 'Usuário não encontrado.' };
  }

  const { error } = await admin
    .from('profiles')
    .update({
      score_adjustment: (prof.score_adjustment ?? 0) + delta,
      total_score: (prof.total_score ?? 0) + delta,
    })
    .eq('id', userId);

  if (error) {
    console.error('[admin] falha ao corrigir pontuação:', error);
    return { ok: false, error: 'Não foi possível corrigir a pontuação.' };
  }

  revalidatePath('/admin');
  return { ok: true };
}

/**
 * Define o multiplicador de pontos de um jogo ("jogo turbinado").
 * multiplier = 1 → normal; 2, 3, 4... → pontos multiplicados. Admin-only.
 */
export async function setMatchMultiplier(
  matchId: string,
  multiplier: number,
): Promise<AdminActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };

  if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 10) {
    return { ok: false, error: 'Multiplicador inválido (use de 1 a 10).' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from('match_settings').upsert(
    { match_id: matchId, score_multiplier: multiplier, updated_at: new Date().toISOString() },
    { onConflict: 'match_id' },
  );

  if (error) {
    console.error('[admin] falha ao definir multiplicador:', error);
    return { ok: false, error: 'Não foi possível salvar o multiplicador.' };
  }

  revalidatePath('/admin/jogos');
  revalidatePath('/bolao');
  return { ok: true };
}

/**
 * Habilita ou desabilita manualmente o acesso Premium de um usuário,
 * independentemente de pagamento. Usado para liberar quem o organizador
 * quiser (cortesias, convidados, etc.).
 */
export async function setPremium(
  userId: string,
  value: boolean,
): Promise<AdminActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };

  // Não deixa o admin remover o próprio Premium por engano.
  if (!value && userId === auth.userId) {
    return { ok: false, error: 'Você não pode remover o próprio acesso.' };
  }

  const admin = createAdminClient();
  // Ao desabilitar o acesso, também removemos o consentimento de ranking
  // para que o nome do usuário saia da classificação pública. (Ao reabilitar,
  // não reativamos o consentimento — ele é dado pelo próprio usuário.)
  const updates = value
    ? { is_premium: true }
    : { is_premium: false, agreed_to_ranking: false };

  const { error } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error('[admin] falha ao atualizar Premium:', error);
    return { ok: false, error: 'Não foi possível atualizar o acesso.' };
  }

  revalidatePath('/admin');
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Desempate por sorteio
// ─────────────────────────────────────────────────────────────────────────────

export interface TiebreakDrawActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Registra (ou substitui) o resultado de um sorteio ao vivo.
 *
 * @param group   Grupo de empate detectado no momento da submissão (calculado
 *                no client e re-validado aqui no servidor antes de gravar).
 * @param orderedUserIds  user_ids na ordem sorteada (1º → último).
 */
export async function recordTiebreakDraw(
  group: TieGroup,
  orderedUserIds: string[],
): Promise<TiebreakDrawActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };

  // Valida que a ordering é uma permutação exata dos membros do grupo.
  const validationError = validateDrawOrder(group, orderedUserIds);
  if (validationError) return { ok: false, error: validationError };

  const admin = createAdminClient();

  const { error } = await admin.from('tiebreak_draws').upsert(
    {
      scope: group.scope,
      signature: group.signature,
      ordering: orderedUserIds,
      created_by: auth.userId,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'scope,signature' },
  );

  if (error) {
    console.error('[admin] recordTiebreakDraw falhou:', error);
    return { ok: false, error: 'Não foi possível salvar o sorteio.' };
  }

  revalidatePath('/ranking');
  revalidatePath('/admin');
  return { ok: true };
}

/**
 * Remove um sorteio registrado (para refazê-lo).
 */
export async function clearTiebreakDraw(
  scope: string,
  signature: string,
): Promise<TiebreakDrawActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };

  const admin = createAdminClient();

  const { error } = await admin
    .from('tiebreak_draws')
    .delete()
    .eq('scope', scope)
    .eq('signature', signature);

  if (error) {
    console.error('[admin] clearTiebreakDraw falhou:', error);
    return { ok: false, error: 'Não foi possível remover o sorteio.' };
  }

  revalidatePath('/ranking');
  revalidatePath('/admin');
  return { ok: true };
}
