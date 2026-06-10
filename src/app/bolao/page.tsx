import Link from 'next/link';
import { Trophy, Medal } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { Profile, PredictionInput } from '@/lib/bolao/types';
import { BolaoClient } from '@/components/bolao/BolaoClient';
import { logout } from '@/app/login/actions';

/**
 * Página do Bolão Premium (Server Component).
 * Lê o usuário/perfil quando o Supabase está configurado; caso contrário
 * entrega a UI em "modo demonstração" para visualização imediata.
 */
export default async function BolaoPage() {
  const configured = isSupabaseConfigured();

  let profile: Profile | null = null;
  let authenticated = false;
  let existingPredictions: PredictionInput[] = [];

  let userEmail: string | null = null;

  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      authenticated = true;
      userEmail = user.email ?? null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      profile = (data as Profile) ?? null;

      const { data: preds } = await supabase
        .from('predictions')
        .select('match_id, home_score_guess, away_score_guess, is_autofilled')
        .eq('user_id', user.id);
      existingPredictions = (preds as PredictionInput[]) ?? [];
    }
  }

  return (
    <div className="container">
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="animate-fade-in" style={{ marginBottom: 'var(--space-sm)' }}>
          <Trophy
            size={28}
            style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }}
          />
          Bolão Premium
        </h1>
        <p
          className="animate-fade-in"
          style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}
        >
          Dê seus palpites, dispute o ranking e concorra aos prêmios MinduBier.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <Link href="/ranking" className="btn btn-gold btn-sm">
            <Medal size={16} /> Ver ranking e prêmios
          </Link>
          {authenticated && userEmail && (
            <form action={logout}>
              <button
                type="submit"
                className="btn btn-gold btn-sm"
                style={{ fontSize: '0.78rem' }}
              >
                Sair ({userEmail})
              </button>
            </form>
          )}
        </div>
      </section>

      <BolaoClient
        configured={configured}
        authenticated={authenticated}
        profile={profile}
        existingPredictions={existingPredictions}
      />
    </div>
  );
}
