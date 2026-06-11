import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { Profile, MatchSetting } from '@/lib/bolao/types';
import { AdminMatchList } from '@/components/admin/AdminMatchList';

/**
 * Página (admin-only) para configurar os multiplicadores de pontos por jogo
 * ("jogos turbinados": x2, x3, x4...).
 */
export default async function AdminJogosPage() {
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

  const admin = createAdminClient();
  const { data } = await admin
    .from('match_settings')
    .select('match_id, score_multiplier');

  const initialMultipliers: Record<string, number> = {};
  for (const s of (data as Pick<MatchSetting, 'match_id' | 'score_multiplier'>[]) ?? []) {
    initialMultipliers[s.match_id] = s.score_multiplier ?? 1;
  }

  return (
    <div className="container">
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <Link
          href="/admin"
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: 'var(--space-sm)' }}
        >
          <ArrowLeft size={15} /> Voltar à central
        </Link>
        <h1 style={{ marginBottom: 'var(--space-sm)' }}>
          <Zap
            size={28}
            style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }}
          />
          Jogos turbinados
        </h1>
      </section>

      <AdminMatchList initialMultipliers={initialMultipliers} />
    </div>
  );
}
