import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Zap, BarChart3, DatabaseBackup, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { Profile, PaymentRequest } from '@/lib/bolao/types';
import { AdminPendingPayments, AdminPaymentHistory } from '@/components/admin/AdminPaymentList';
import { AdminUserList, type AdminUser } from '@/components/admin/AdminUserList';
import { AdminExtraRanking, type ExtraRankingRow } from '@/components/admin/AdminExtraRanking';
import {
  AdminPredictionsMatrix,
  type MatrixUser,
  type MatrixColumn,
  type MatrixCell,
} from '@/components/admin/AdminPredictionsMatrix';
import { AdminTiebreakDrawsPending, AdminTiebreakDrawsResolved, type TiebreakEntry } from '@/components/admin/AdminTiebreakDraws';
import { AdminProbabilitiesUpload } from '@/components/admin/AdminProbabilitiesUpload';
import { AdminMatchProbabilitiesUpload } from '@/components/admin/AdminMatchProbabilitiesUpload';
import { AdminBackup } from '@/components/admin/AdminBackup';
import { matches } from '@/data/matches';
import { teams } from '@/data/teams';
import { ROUND_ORDER, ROUND_LABELS } from '@/lib/bolao/rounds';
import type { RoundKey } from '@/lib/bolao/rounds';
import type { MatchStage } from '@/lib/types';
import {
  detectGeneralTieGroups,
  detectRoundTieGroups,
  type GeneralRow,
  type DrawRecord,
} from '@/lib/bolao/tiebreak';

export const revalidate = 0;

const teamCode = new Map(teams.map((t) => [t.id, t.code.toUpperCase()]));

function roundShort(stage: MatchStage, matchday?: number): string {
  switch (stage) {
    case 'group':
      return `R${matchday ?? '?'} Grupos`;
    case 'round-of-32':
      return '16-avos';
    case 'round-of-16':
      return 'Oitavas';
    case 'quarter-final':
      return 'Quartas';
    case 'semi-final':
      return 'Semis';
    case 'third-place':
      return '3º lugar';
    case 'final':
      return 'Final';
  }
}

/**
 * Central de controle (somente admin). Lista as solicitações de pagamento
 * manual via Pix e permite liberar/rejeitar o acesso Premium.
 */
export default async function AdminPage() {
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

  // service_role: lê todas as solicitações (ignora RLS).
  const admin = createAdminClient();
  const { data } = await admin
    .from('payment_requests')
    .select('*')
    .order('created_at', { ascending: false });

  const all = (data as PaymentRequest[]) ?? [];
  const pending = all.filter((r) => r.status === 'pending');
  const reviewed = all.filter((r) => r.status !== 'pending').slice(0, 50);

  // Todos os usuários cadastrados (profiles) + e-mails (auth.users).
  const { data: profilesData } = await admin
    .from('profiles')
    .select('id, full_name, phone, is_premium, is_admin, total_score, round_bonus, score_adjustment, referral_bonus, created_at')
    .order('created_at', { ascending: false });
  const profiles = (profilesData as Array<
    Pick<
      Profile,
      'id' | 'full_name' | 'phone' | 'is_premium' | 'is_admin' | 'total_score' | 'round_bonus' | 'score_adjustment' | 'referral_bonus'
    > & {
      created_at: string | null;
    }
  >) ?? [];

  // Mapa id → e-mail vindo do Auth (profiles não guarda e-mail).
  const emailById = new Map<string, string | null>();
  const { data: authList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  for (const u of authList?.users ?? []) {
    emailById.set(u.id, u.email ?? null);
  }

  const users: AdminUser[] = profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: emailById.get(p.id) ?? null,
    phone: p.phone,
    is_premium: p.is_premium,
    is_admin: p.is_admin,
    total_score: p.total_score ?? 0,
    created_at: p.created_at,
  }));

  // ── Matriz de palpites × partidas ──────────────────────────────────
  // Status + placar de cada jogo + todos os palpites.
  const { data: matchRows } = await admin
    .from('matches')
    .select('id, status, home_score, away_score, home_team_id, away_team_id');
  const finishedSet = new Set(
    (matchRows ?? []).filter((m) => m.status === 'finished').map((m) => m.id),
  );
  const scoreById = new Map(
    (matchRows ?? []).map((m) => [m.id, { home: m.home_score as number | null, away: m.away_score as number | null }]),
  );
  const teamIdsById = new Map(
    (matchRows ?? []).map((m) => [
      m.id,
      { home: m.home_team_id as string | null, away: m.away_team_id as string | null },
    ]),
  );

  // Paginado: o PostgREST corta em 1000 linhas e a tabela de palpites já
  // passa disso — sem paginar, alguns palpites somem da matriz (o usuário
  // aparece sem palpite mesmo tendo pontuado).
  type PredRow = {
    user_id: string; match_id: string;
    home_score_guess: number | null; away_score_guess: number | null;
    points_earned: number | null;
  };
  const predRows: PredRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from('predictions')
      .select('user_id, match_id, home_score_guess, away_score_guess, points_earned')
      .order('id', { ascending: true })
      .range(from, from + 999);
    const rows = (data ?? []) as PredRow[];
    predRows.push(...rows);
    if (rows.length < 1000) break;
  }

  const matrixColumns: MatrixColumn[] = [...matches]
    .sort((a, b) => a.matchNumber - b.matchNumber)
    .map((m) => {
      const ids = teamIdsById.get(m.id);
      const homeTeamId = ids?.home ?? m.homeTeamId;
      const awayTeamId = ids?.away ?? m.awayTeamId;
      const homeCode = homeTeamId ? teamCode.get(homeTeamId) ?? '?' : '?';
      const awayCode = awayTeamId ? teamCode.get(awayTeamId) ?? '?' : '?';
      const sc = scoreById.get(m.id);
      return {
        matchId: m.id,
        number: m.matchNumber,
        label: `${homeCode} × ${awayCode}`,
        round: roundShort(m.stage, m.matchday),
        finished: finishedSet.has(m.id),
        homeCode,
        awayCode,
        homeScore: sc?.home ?? null,
        awayScore: sc?.away ?? null,
      };
    });

  const cells: Record<string, Record<string, MatrixCell>> = {};
  for (const p of predRows ?? []) {
    (cells[p.user_id] ??= {})[p.match_id] = {
      guess: `${p.home_score_guess}×${p.away_score_guess}`,
      points: p.points_earned ?? 0,
    };
  }

  // Ordena por total (desc) para leitura; mantém o admin visível na matriz.
  const matrixUsers: MatrixUser[] = profiles
    .map((p) => ({
      id: p.id,
      name: p.full_name ?? 'Sem nome',
      bonus: p.round_bonus ?? 0,
      adjustment: p.score_adjustment ?? 0,
      referral: p.referral_bonus ?? 0,
      total: p.total_score ?? 0,
      isAdmin: p.is_admin,
    }))
    .sort((a, b) => b.total - a.total);

  // ── Sorteios de desempate ─────────────────────────────────────────────────
  // Lê palpites agrupados por usuário para montar os tiebreakers (igual ao
  // ranking/page.tsx, mas de forma simplificada — só o necessário para detecção).
  type TbMap = Map<string, { prediction_pts: number; exact_pts: number; diff_pts: number; final_pts: number; semi_pts: number; quarters_pts: number; ro16_pts: number }>;
  const { matches: staticMatches } = await import('@/data/matches');
  const finalIds    = new Set(staticMatches.filter(m => m.stage === 'final').map(m => m.id));
  const semiIds     = new Set(staticMatches.filter(m => m.stage === 'semi-final').map(m => m.id));
  const quartersIds = new Set(staticMatches.filter(m => m.stage === 'quarter-final').map(m => m.id));
  const ro16Ids     = new Set(staticMatches.filter(m => m.stage === 'round-of-16').map(m => m.id));

  const tbMap: TbMap = new Map();
  const tbPreds: Array<{ user_id: string; match_id: string; points_earned: number; base_points: number | null }> = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from('predictions')
      .select('user_id, match_id, points_earned, base_points')
      .not('points_earned', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + 999);
    const rows = (data ?? []) as typeof tbPreds;
    tbPreds.push(...rows);
    if (rows.length < 1000) break;
  }
  for (const p of tbPreds) {
    const t = tbMap.get(p.user_id) ?? { prediction_pts: 0, exact_pts: 0, diff_pts: 0, final_pts: 0, semi_pts: 0, quarters_pts: 0, ro16_pts: 0 };
    const pts = p.points_earned;
    const base = p.base_points ?? 0;
    t.prediction_pts += pts;
    // base_points inclui o bônus de +1 por pênaltis certos num mata-mata
    // empatado (5→6, 3→4) — checar só "=== 5"/"=== 3" perdia esses acertos.
    if (base === 5 || base === 6) t.exact_pts += pts;
    if (base === 3 || base === 4) t.diff_pts  += pts;
    if (finalIds.has(p.match_id))    t.final_pts    += pts;
    if (semiIds.has(p.match_id))     t.semi_pts     += pts;
    if (quartersIds.has(p.match_id)) t.quarters_pts += pts;
    if (ro16Ids.has(p.match_id))     t.ro16_pts     += pts;
    tbMap.set(p.user_id, t);
  }

  // Classificação geral ordenada (igual ao ranking/page)
  const generalRanking = profiles
    .map(p => ({
      id: p.id,
      is_admin: p.is_admin ?? false,
      tb: {
        total_score: p.total_score ?? 0,
        ...tbMap.get(p.id) ?? { prediction_pts: 0, exact_pts: 0, diff_pts: 0, final_pts: 0, semi_pts: 0, quarters_pts: 0, ro16_pts: 0 },
      },
    }))
    .sort((a, b) => {
      if (b.tb.total_score !== a.tb.total_score) return b.tb.total_score - a.tb.total_score;
      if (b.tb.prediction_pts !== a.tb.prediction_pts) return b.tb.prediction_pts - a.tb.prediction_pts;
      if (b.tb.exact_pts !== a.tb.exact_pts) return b.tb.exact_pts - a.tb.exact_pts;
      if (b.tb.diff_pts !== a.tb.diff_pts) return b.tb.diff_pts - a.tb.diff_pts;
      if (b.tb.final_pts !== a.tb.final_pts) return b.tb.final_pts - a.tb.final_pts;
      if (b.tb.semi_pts !== a.tb.semi_pts) return b.tb.semi_pts - a.tb.semi_pts;
      if (b.tb.quarters_pts !== a.tb.quarters_pts) return b.tb.quarters_pts - a.tb.quarters_pts;
      if (b.tb.ro16_pts !== a.tb.ro16_pts) return b.tb.ro16_pts - a.tb.ro16_pts;
      return 0;
    }) satisfies GeneralRow[];

  const generalTieGroups = detectGeneralTieGroups(generalRanking);

  // Round_scores já calculados pelo sync
  const { data: roundScoresData } = await admin
    .from('round_scores')
    .select('user_id, round_key, points, exact_pts, diff_pts, complete, is_winner');
  const rScores = (roundScoresData ?? []) as { user_id: string; round_key: string; points: number; exact_pts: number; diff_pts: number; complete: boolean; is_winner: boolean }[];

  const roundTieGroups: Array<{ roundKey: RoundKey; groups: ReturnType<typeof detectRoundTieGroups> }> = [];
  for (const rk of ROUND_ORDER) {
    const rows = rScores.filter(r => r.round_key === rk);
    if (!rows.length || !rows[0]?.complete) continue;
    const isAdminById = new Map(profiles.map(p => [p.id, p.is_admin ?? false]));
    const sorted = rows
      .map(r => ({ user_id: r.user_id, is_admin: isAdminById.get(r.user_id) ?? false, points: r.points, exact_pts: r.exact_pts, diff_pts: r.diff_pts }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.exact_pts !== a.exact_pts) return b.exact_pts - a.exact_pts;
        if (b.diff_pts !== a.diff_pts) return b.diff_pts - a.diff_pts;
        return a.user_id < b.user_id ? -1 : 1;
      });
    const groups = detectRoundTieGroups(sorted, rk);
    if (groups.length) roundTieGroups.push({ roundKey: rk, groups });
  }

  // Lê sorteios já registrados
  const { data: drawsData } = await admin.from('tiebreak_draws').select('scope, signature, ordering');
  const drawsByKey = new Map<string, DrawRecord>();
  for (const d of (drawsData ?? []) as Array<{ scope: string; signature: string; ordering: string[] }>) {
    drawsByKey.set(`${d.scope}|${d.signature}`, { scope: d.scope as DrawRecord['scope'], signature: d.signature, ordering: d.ordering });
  }

  const nameById = new Map(profiles.map(p => [p.id, p.full_name]));

  // Palpites extras: pontos apurados por (usuário, jogo) — inclusive as
  // semifinais de teste, que não somam no total mas aparecem no ranking de
  // verificação abaixo.
  const { data: extraPredsData } = await admin
    .from('extra_predictions')
    .select('user_id, match_id, points_earned');
  const extraRowsByUser = new Map<string, ExtraRankingRow>();
  for (const ep of (extraPredsData ?? []) as Array<{ user_id: string; match_id: string; points_earned: number }>) {
    let row = extraRowsByUser.get(ep.user_id);
    if (!row) {
      row = {
        userId: ep.user_id,
        name: nameById.get(ep.user_id) ?? 'Participante',
        pointsByMatch: {},
      };
      extraRowsByUser.set(ep.user_id, row);
    }
    row.pointsByMatch[ep.match_id] = ep.points_earned ?? 0;
  }
  const extraRankingRows = Array.from(extraRowsByUser.values());

  const tiebreakEntries: TiebreakEntry[] = [
    ...generalTieGroups.map(g => ({
      group: g,
      memberNames: g.memberIds.map(id => nameById.get(id) ?? null),
      draw: drawsByKey.get(`${g.scope}|${g.signature}`),
      scopeLabel: 'Classificação Geral',
    })),
    ...roundTieGroups.flatMap(({ roundKey, groups }) =>
      groups.map(g => ({
        group: g,
        memberNames: g.memberIds.map(id => nameById.get(id) ?? null),
        draw: drawsByKey.get(`${g.scope}|${g.signature}`),
        scopeLabel: ROUND_LABELS[roundKey],
      }))
    ),
  ];

  return (
    <div className="container">
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 style={{ marginBottom: 'var(--space-sm)' }}>
          <ShieldCheck
            size={28}
            style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }}
          />
          Central de controle
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Confira o comprovante recebido por e-mail e aprove para liberar o
          acesso Premium do participante.
        </p>
        <div style={{ marginTop: 'var(--space-sm)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/admin/jogos" className="btn btn-gold btn-sm">
            <Zap size={16} /> Jogos turbinados
          </Link>
          <Link href="/admin/jogos#resultados-extras" className="btn btn-secondary btn-sm">
            <Sparkles size={16} /> Cartões e 1º gol (palpites extras)
          </Link>
        </div>
      </section>

      <AdminPendingPayments pending={pending}>
        <AdminTiebreakDrawsPending entries={tiebreakEntries} />
      </AdminPendingPayments>

      <div style={{ marginTop: 'var(--space-2xl)' }}>
        <AdminPredictionsMatrix
          users={matrixUsers}
          columns={matrixColumns}
          cells={cells}
        />
      </div>

      <div style={{ marginTop: 'var(--space-2xl)' }}>
        <AdminExtraRanking rows={extraRankingRows} />
      </div>

      <div style={{ marginTop: 'var(--space-2xl)' }}>
        <AdminPaymentHistory
          reviewed={reviewed}
          extraCount={tiebreakEntries.filter((e) => e.draw).length}
        >
          <AdminTiebreakDrawsResolved entries={tiebreakEntries} />
        </AdminPaymentHistory>
      </div>

      <div style={{ marginTop: 'var(--space-2xl)' }}>
        <AdminUserList users={users} />
      </div>

      <section className="glass-card-static" style={{ marginTop: 'var(--space-2xl)', padding: 'var(--space-lg)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}>
          <DatabaseBackup size={20} style={{ color: 'var(--gold)' }} /> Backup do banco
        </h2>
        <AdminBackup />
      </section>

      <section className="glass-card-static" style={{ marginTop: 'var(--space-2xl)', padding: 'var(--space-lg)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}>
          <BarChart3 size={20} style={{ color: 'var(--gold)' }} /> Probabilidades das seleções
        </h2>
        <AdminProbabilitiesUpload />
      </section>

      <section className="glass-card-static" style={{ marginTop: 'var(--space-2xl)', padding: 'var(--space-lg)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}>
          <BarChart3 size={20} style={{ color: 'var(--gold)' }} /> Probabilidades dos próximos jogos
        </h2>
        <AdminMatchProbabilitiesUpload />
      </section>
    </div>
  );
}
