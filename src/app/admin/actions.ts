'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runFootballSync } from '@/lib/football-data/sync';
import { applyScoring } from '@/lib/bolao/scoring-sync';
import { EXTRA_BET_MATCH_IDS } from '@/lib/bolao/extra-bets';
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
  const payload = rows
    // Linha do template deixada em branco pelo admin (todas as colunas
    // zeradas) — pula em vez de sobrescrever uma probabilidade real já
    // salva para essa seleção com zero.
    .filter((r) => r.roundOf32 || r.roundOf16 || r.quarterFinal || r.semiFinal || r.final || r.champion)
    .map((r) => ({
      team_id: r.teamId,
      round_of_32: r.roundOf32,
      round_of_16: r.roundOf16,
      quarter_final: r.quarterFinal,
      semi_final: r.semiFinal,
      final: r.final,
      champion: r.champion,
      updated_at: now,
    }));
  if (!payload.length) return { ok: false, error: 'Nenhuma linha com probabilidades preenchidas.' };

  const { error } = await admin
    .from('team_probabilities')
    .upsert(payload, { onConflict: 'team_id' });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/');
  return { ok: true, count: payload.length };
}

/** Linha de probabilidade de jogo já normalizada (vinda do parse da planilha). */
export interface MatchProbUploadRow {
  matchNumber: number;
  homeWin: number;
  draw: number;
  awayWin: number;
}

/**
 * Substitui as probabilidades por jogo na tabela `match_probabilities`, a
 * partir das linhas já parseadas da planilha (Jogo · Mandante · Visitante ·
 * % Mandante · % Empate · % Visitante). Só admin.
 */
export async function uploadMatchProbabilities(
  rows: MatchProbUploadRow[],
): Promise<AdminActionResult & { count?: number }> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };
  if (!rows.length) return { ok: false, error: 'Nenhuma linha válida na planilha.' };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const payload = rows
    // Linha do template deixada em branco pelo admin — pula em vez de
    // sobrescrever uma probabilidade real já salva para esse jogo com zero.
    .filter((r) => r.homeWin || r.draw || r.awayWin)
    .map((r) => ({
      match_number: r.matchNumber,
      home_win: r.homeWin,
      draw: r.draw,
      away_win: r.awayWin,
      updated_at: now,
    }));
  if (!payload.length) return { ok: false, error: 'Nenhuma linha com probabilidades preenchidas.' };

  const { error } = await admin
    .from('match_probabilities')
    .upsert(payload, { onConflict: 'match_number' });
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
    revalidatePath('/eliminatorias');
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
 * Registra os resultados manuais dos palpites extras (cartões por time e
 * quem fez o 1º gol) — a football-data grátis não fornece eventos, então
 * esses dois entram à mão depois do jogo. Só toca as colunas manuais de
 * match_extra_results (as de placar são do sync) e roda applyScoring na
 * sequência: após o apito final o live poll silencia, então sem isso os
 * pontos digitados aqui nunca seriam apurados.
 */
export async function setMatchExtraActuals(
  matchId: string,
  actuals: {
    yellowHome: number | null;
    yellowAway: number | null;
    redHome: number | null;
    redAway: number | null;
    firstGoal: 'home' | 'away' | 'none' | null;
    shotsHome: number | null;
    shotsAway: number | null;
    offsideHome: number | null;
    offsideAway: number | null;
    cornerHome: number | null;
    cornerAway: number | null;
  },
): Promise<AdminActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };

  if (!EXTRA_BET_MATCH_IDS.includes(matchId)) {
    return { ok: false, error: 'Jogo sem palpites extras habilitados.' };
  }
  const counters = [
    actuals.yellowHome, actuals.yellowAway, actuals.redHome, actuals.redAway,
    actuals.shotsHome, actuals.shotsAway, actuals.offsideHome, actuals.offsideAway,
    actuals.cornerHome, actuals.cornerAway,
  ];
  for (const v of counters) {
    if (v != null && (!Number.isInteger(v) || v < 0 || v > 30)) {
      return { ok: false, error: 'Valores devem ser inteiros entre 0 e 30.' };
    }
  }
  if (actuals.firstGoal != null && !['home', 'away', 'none'].includes(actuals.firstGoal)) {
    return { ok: false, error: 'Valor inválido para o 1º gol.' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from('match_extra_results').upsert(
    {
      match_id: matchId,
      yellow_home: actuals.yellowHome,
      yellow_away: actuals.yellowAway,
      red_home: actuals.redHome,
      red_away: actuals.redAway,
      first_goal: actuals.firstGoal,
      shots_home: actuals.shotsHome,
      shots_away: actuals.shotsAway,
      offside_home: actuals.offsideHome,
      offside_away: actuals.offsideAway,
      corner_home: actuals.cornerHome,
      corner_away: actuals.cornerAway,
    },
    { onConflict: 'match_id' },
  );

  if (error) {
    console.error('[admin] falha ao salvar resultados extras:', error);
    return { ok: false, error: 'Não foi possível salvar os resultados extras.' };
  }

  try {
    await applyScoring(admin);
  } catch (err) {
    console.error('[admin] applyScoring após resultados extras falhou:', err);
    return { ok: false, error: 'Resultados salvos, mas a apuração falhou — rode o sync manual.' };
  }

  revalidatePath('/admin/jogos');
  revalidatePath('/admin'); // ranking de verificação dos extras
  revalidatePath('/bolao');
  revalidatePath('/ranking');
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

// ─────────────────────────────────────────────────────────────────────────────
// Backup do banco (Central de controle → baixar/carregar backup)
// ─────────────────────────────────────────────────────────────────────────────

/** Todas as tabelas de negócio do app (schema public), na ordem de dependência
 *  pai → filho — importante pro restore, que faz upsert nessa mesma ordem. */
const BACKUP_TABLES = [
  'teams',
  'profiles',
  'matches',
  'match_extra_results',
  'standings',
  'match_settings',
  'round_scores',
  'team_probabilities',
  'match_probabilities',
  'tiebreak_draws',
  'payment_requests',
  'referrals',
  'predictions',
  'extra_predictions',
] as const;

type BackupTable = (typeof BACKUP_TABLES)[number];

/** Coluna(s) de conflito pro upsert de restore, casando as constraints reais do banco. */
const BACKUP_CONFLICT_KEYS: Record<BackupTable, string> = {
  teams: 'id',
  profiles: 'id',
  matches: 'id',
  match_extra_results: 'match_id',
  standings: 'group_letter,team_id',
  match_settings: 'match_id',
  round_scores: 'round_key,user_id',
  team_probabilities: 'team_id',
  match_probabilities: 'match_number',
  tiebreak_draws: 'scope,signature',
  payment_requests: 'id',
  referrals: 'referred_user_id',
  predictions: 'user_id,match_id',
  extra_predictions: 'user_id,match_id',
};

export interface BackupData {
  exportedAt: string;
  tables: Partial<Record<BackupTable, Record<string, unknown>[]>>;
}

/**
 * Exporta todas as tabelas do banco (schema public) como JSON — backup
 * completo pra download. Pagina em blocos de 1000 (limite do PostgREST).
 */
export async function exportBackup(): Promise<AdminActionResult & { data?: BackupData }> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  const tables: BackupData['tables'] = {};

  for (const table of BACKUP_TABLES) {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from(table).select('*').range(from, from + 999);
      if (error) return { ok: false, error: `Falha ao ler ${table}: ${error.message}` };
      rows.push(...((data as Record<string, unknown>[]) ?? []));
      if (!data || data.length < 1000) break;
    }
    tables[table] = rows;
  }

  return { ok: true, data: { exportedAt: new Date().toISOString(), tables } };
}

/**
 * Restaura um backup gerado por exportBackup(): faz upsert tabela por tabela,
 * na ordem pai → filho, casando pela constraint real de cada uma. NÃO apaga
 * linhas que não estejam no backup (upsert, não replace) — restaurar um
 * backup antigo não remove dados criados depois dele.
 */
export async function restoreBackup(
  backup: BackupData,
): Promise<AdminActionResult & { restored?: Partial<Record<BackupTable, number>> }> {
  const auth = await requireAdmin();
  if ('error' in auth) return { ok: false, error: auth.error };

  if (!backup || typeof backup !== 'object' || !backup.tables) {
    return { ok: false, error: 'Arquivo de backup inválido.' };
  }

  const admin = createAdminClient();
  const restored: Partial<Record<BackupTable, number>> = {};

  for (const table of BACKUP_TABLES) {
    const rows = backup.tables[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await admin
        .from(table)
        .upsert(chunk, { onConflict: BACKUP_CONFLICT_KEYS[table] });
      if (error) {
        return {
          ok: false,
          error: `Falha ao restaurar ${table} (linha ${i}): ${error.message}`,
          restored,
        };
      }
    }
    restored[table] = rows.length;
  }

  revalidatePath('/', 'layout');
  return { ok: true, restored };
}
