'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runFootballSync } from '@/lib/football-data/sync';
import { creditReferralOnPremium } from '@/lib/bolao/referral';
import { scrapeUfmgProbabilities } from '@/lib/ufmg/scrape';
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

export interface SyncActionResult {
  ok: boolean;
  matches?: number;
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

export interface RefreshProbabilitiesResult {
  ok: boolean;
  teams?: number;
  updatedAt?: string;
  error?: string;
}

/**
 * Atualiza as probabilidades (modelo UFMG): faz o scraping das 6 fases e
 * grava na tabela `team_probabilities`. Admin-only.
 */
export async function refreshProbabilities(): Promise<RefreshProbabilitiesResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };

  let scraped;
  try {
    scraped = await scrapeUfmgProbabilities();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido';
    console.error('[admin] scraping UFMG falhou:', message);
    return { ok: false, error: `Não foi possível ler a UFMG: ${message}` };
  }

  const updatedAt = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin.from('team_probabilities').upsert(
    scraped.map((p) => ({
      team_id: p.teamId,
      champion: p.champion,
      final: p.final,
      semifinal: p.semifinal,
      quarter_final: p.quarterFinal,
      round_of_16: p.roundOf16,
      round_of_32: p.roundOf32,
      updated_at: updatedAt,
    })),
    { onConflict: 'team_id' },
  );

  if (error) {
    console.error('[admin] falha ao gravar probabilidades:', error);
    return { ok: false, error: 'Falha ao salvar as probabilidades no banco.' };
  }

  revalidatePath('/probabilidades');
  return { ok: true, teams: scraped.length, updatedAt };
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