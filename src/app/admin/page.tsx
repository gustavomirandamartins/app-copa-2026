import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { Profile, PaymentRequest } from '@/lib/bolao/types';
import { AdminPaymentList } from '@/components/admin/AdminPaymentList';
import { AdminUserList, type AdminUser } from '@/components/admin/AdminUserList';
import {
  AdminPredictionsMatrix,
  type MatrixUser,
  type MatrixColumn,
  type MatrixCell,
} from '@/components/admin/AdminPredictionsMatrix';
import { matches } from '@/data/matches';
import { teams } from '@/data/teams';
import type { MatchStage } from '@/lib/types';

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
    .select('id, status, home_score, away_score');
  const finishedSet = new Set(
    (matchRows ?? []).filter((m) => m.status === 'finished').map((m) => m.id),
  );
  const scoreById = new Map(
    (matchRows ?? []).map((m) => [m.id, { home: m.home_score as number | null, away: m.away_score as number | null }]),
  );

  const { data: predRows } = await admin
    .from('predictions')
    .select('user_id, match_id, home_score_guess, away_score_guess, points_earned');

  const matrixColumns: MatrixColumn[] = [...matches]
    .sort((a, b) => a.matchNumber - b.matchNumber)
    .map((m) => {
      const homeCode = m.homeTeamId ? teamCode.get(m.homeTeamId) ?? '?' : '?';
      const awayCode = m.awayTeamId ? teamCode.get(m.awayTeamId) ?? '?' : '?';
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
        <div style={{ marginTop: 'var(--space-sm)' }}>
          <Link href="/admin/jogos" className="btn btn-gold btn-sm">
            <Zap size={16} /> Jogos turbinados (multiplicadores)
          </Link>
        </div>
      </section>

      <AdminPaymentList pending={pending} reviewed={reviewed} />

      <AdminPredictionsMatrix
        users={matrixUsers}
        columns={matrixColumns}
        cells={cells}
      />

      <div style={{ marginTop: 'var(--space-2xl)' }}>
        <AdminUserList users={users} />
      </div>
    </div>
  );
}
