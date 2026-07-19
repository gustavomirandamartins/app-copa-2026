
import { redirect } from 'next/navigation';
import { Trophy } from 'lucide-react';
import '@/components/bolao/bolao.css';
// Estilos da barra V-E-V (nx-wdw) e da comparação de seleções, compartilhados
// com /jogos — os cards do bolão agora têm o mesmo conteúdo expandido.
import '@/app/dashboard.css';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { isProfileComplete } from '@/lib/bolao/profile';
import type { Profile, PredictionInput } from '@/lib/bolao/types';
import { loadTeamProbabilities, loadMatchProbabilities } from '@/lib/bolao/probabilities';
import { BolaoClient, type MatchResult, type ExistingExtraPrediction } from '@/components/bolao/BolaoClient';

import { AuthPanel } from '@/components/auth/AuthPanel';


/**
 * Página do Bolão Premium (Server Component).
 * Estados:
 *  - sem Supabase           → modo demonstração (UI editável só pra ver)
 *  - configurado, deslogado → cards de Entrar/Criar conta + oferta
 *  - logado, não premium    → redireciona ao onboarding (/completar-cadastro)
 *                             (exceto no retorno do Stripe com ?checkout=success)
 *  - logado, premium        → grade de palpites
 */
export default async function BolaoPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { checkout } = await searchParams;

  let profile: Profile | null = null;
  let authenticated = false;
  let existingPredictions: PredictionInput[] = [];
  let existingExtraPredictions: ExistingExtraPrediction[] = [];

  const multipliers: Record<string, number> = {};
  const results: Record<string, MatchResult> = {};
  const pointsByMatch: Record<string, number> = {};

  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Multiplicadores dos jogos turbinados (leitura pública).
    const { data: settings } = await supabase
      .from('match_settings')
      .select('match_id, score_multiplier')
      .gt('score_multiplier', 1);
    for (const s of settings ?? []) {
      multipliers[s.match_id] = s.score_multiplier as number;
    }

    if (user) {
      authenticated = true;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      profile = (data as Profile) ?? null;

      const { data: preds } = await supabase
        .from('predictions')
        .select('match_id, home_score_guess, away_score_guess, penalty_winner_id, is_autofilled, points_earned')
        .eq('user_id', user.id);
      existingPredictions = (preds as PredictionInput[]) ?? [];

      // Pontos conquistados por jogo (preenchido pelo sync após cada partida).
      for (const p of (preds as Array<PredictionInput & { points_earned: number | null }>) ?? []) {
        if (p.points_earned != null) pointsByMatch[p.match_id] = p.points_earned;
      }

      // Palpites extras (semis = teste; 3º lugar e final = valendo).
      // RLS: o usuário lê só os próprios.
      const { data: extras } = await supabase
        .from('extra_predictions')
        .select('match_id, ht_home, ht_away, h2_home, h2_away, et_home, et_away, pen_home, pen_away, yellow_home, yellow_away, red_home, red_away, first_goal, shots_home, shots_away, offside_home, offside_away, corner_home, corner_away, fouls_home, fouls_away, points_earned')
        .eq('user_id', user.id);
      existingExtraPredictions = (extras as ExistingExtraPrediction[]) ?? [];
    }

    // Resultados reais (status + placar) — fonte da verdade para travar/exibir.
    const { data: live } = await supabase
      .from('matches')
      .select('id, status, home_score, away_score, home_penalties, away_penalties, home_team_id, away_team_id');
    for (const m of live ?? []) {
      results[m.id] = {
        status: m.status as MatchResult['status'],
        homeScore: m.home_score as number | null,
        awayScore: m.away_score as number | null,
        homePenalties: m.home_penalties as number | null,
        awayPenalties: m.away_penalties as number | null,
        homeTeamId: m.home_team_id as string | null,
        awayTeamId: m.away_team_id as string | null,
      };
    }
  }

  // Logado mas ainda não premium → completar cadastro / pagar.
  // Exceção: retorno do Stripe (?checkout=success), em que o webhook ainda
  // pode estar processando — deixamos o BolaoClient exibir o spinner.
  if (
    configured &&
    authenticated &&
    !profile?.is_premium &&
    checkout !== 'success'
  ) {
    // Cadastro incompleto → onboarding; completo mas sem pagar → pagamento.
    redirect(isProfileComplete(profile) ? '/pagamento' : '/completar-cadastro');
  }

  return (
    <div className="container">
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="animate-fade-in" style={{ marginBottom: 'var(--space-sm)' }}>
          <Trophy
            size={28}
            style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }}
          />
          Seus palpites
        </h1>
        <p
          className="animate-fade-in"
          style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}
        >
          Registre os placares antes de cada partida começar.
        </p>

      </section>





      {configured && !authenticated ? (
        <AuthPanel />
      ) : (
        <BolaoClient
          configured={configured}
          authenticated={authenticated}
          profile={profile}
          existingPredictions={existingPredictions}
          existingExtraPredictions={existingExtraPredictions}
          multipliers={multipliers}
          results={results}
          pointsByMatch={pointsByMatch}
          probabilities={await loadTeamProbabilities()}
          matchProbabilities={await loadMatchProbabilities()}
        />
      )}
    </div>
  );
}
