'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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