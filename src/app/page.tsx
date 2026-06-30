import Link from 'next/link';
import {
  Trophy,
  Medal,
  Crown,
  Users,
  Target,
  Zap,
  Sparkles,
  ArrowRight,
  PartyPopper,
  Calendar,
  BarChart3,
  Flag,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { isProfileComplete } from '@/lib/bolao/profile';
import { computeThermometer, verdictFor } from '@/lib/bolao/thermometer';
import { ROUND_BONUS_POINTS, ROUND_ORDER, ROUND_LABELS, type RoundKey } from '@/lib/bolao/rounds';
import { REFERRAL_BONUS_POINTS } from '@/lib/bolao/referral';
import type { Profile, PredictionInput } from '@/lib/bolao/types';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { JoinThermometer } from '@/components/home/JoinThermometer';
import { RankingSnapshot } from '@/components/home/RankingSnapshot';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { ReferralCard } from '@/components/bolao/ReferralCard';
import { type MatchResult } from '@/components/bolao/BolaoClient';
import { DashboardClient } from '@/components/home/DashboardClient';
import { BracketCard } from '@/components/home/BracketCard';
import { matches as staticMatches } from '@/data/matches';
import type { Match } from '@/lib/types';
import './home.css';
import './dashboard.css';

export const revalidate = 0;

const PRICE = 'R$ 39,90';

const MINI_STEPS = [
  { icon: Target, text: 'Palpite o placar antes do apito' },
  { icon: Zap, text: 'Acertou? Pontos no seu total' },
  { icon: Trophy, text: 'Dispute os prêmios MinduBier' },
];

const PERKS = [
  {
    icon: Medal,
    title: 'Prêmios de verdade',
    text: 'Camisas, bonés, copos e kits de cerveja MinduBier para os 5 primeiros colocados.',
    accent: 'gold',
  },
  {
    icon: Target,
    title: 'Várias formas de pontuar',
    text: 'Vencedor (1), saldo de gols (3) ou placar exato (5). Jogos turbinados multiplicam tudo.',
    accent: 'green',
  },
  {
    icon: Crown,
    title: 'Bônus de rodada',
    text: 'Os cinco que acertarem mais em cada rodada levam pontos extras para a classificação final!',
    accent: 'gold',
  },
  {
    icon: Users,
    title: 'Indique e ganhe',
    text: 'Cada amigo que entra com o seu cupom te dá +5 pontos. Sem limite de indicações.',
    accent: 'green',
  },
];

interface RankRow {
  full_name: string | null;
  total_score: number;
}

export default async function HomePage() {
  const configured = isSupabaseConfigured();

  let leaderPoints = 0;
  let authenticated = false;
  let profile: Profile | null = null;
  let userId: string | null = null;
  let rankRows: RankRow[] = [];
  let existingPredictions: PredictionInput[] = [];
  const multipliers: Record<string, number> = {};
  const results: Record<string, MatchResult> = {};
  const pointsByMatch: Record<string, number> = {};

  if (configured) {
    const supabase = await createClient();

    const [{ data: user }, { data: top }, { data: settings }, { data: live }] =
      await Promise.all([
        supabase.auth.getUser().then((r) => ({ data: r.data.user })),
        supabase
          .from('public_ranking')
          .select('full_name, total_score')
          .order('total_score', { ascending: false }),
        supabase.from('match_settings').select('match_id, score_multiplier').gt('score_multiplier', 1),
        supabase.from('matches').select('id, status, home_score, away_score, home_penalties, away_penalties'),
      ]);

    rankRows = (top as RankRow[]) ?? [];
    leaderPoints = rankRows[0]?.total_score ?? 0;

    for (const s of settings ?? []) multipliers[s.match_id] = s.score_multiplier as number;
    for (const m of live ?? []) {
      results[m.id] = {
        status: m.status as MatchResult['status'],
        homeScore: m.home_score as number | null,
        awayScore: m.away_score as number | null,
        homePenalties: m.home_penalties as number | null,
        awayPenalties: m.away_penalties as number | null,
      };
    }

    if (user) {
      authenticated = true;
      userId = user.id;
      const [{ data: prof }, { data: preds }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('predictions')
          .select('match_id, home_score_guess, away_score_guess, penalty_winner_id, is_autofilled, points_earned')
          .eq('user_id', user.id),
      ]);
      profile = (prof as Profile) ?? null;
      existingPredictions = (preds as PredictionInput[]) ?? [];
      for (const p of (preds as Array<PredictionInput & { points_earned: number | null }>) ?? []) {
        if (p.points_earned != null) pointsByMatch[p.match_id] = p.points_earned;
      }
    }
  }

  const isPremium = !!profile?.is_premium;

  // ════════════════════════════════════════════════════════════════
  // PARTICIPANTE (premium) — dashboard com classificação + palpites
  // ════════════════════════════════════════════════════════════════
  if (isPremium && profile) {
    const firstName = (profile.full_name ?? '').trim().split(/\s+/)[0] || 'craque';

    // Dados da rodada atual para o card de classificação
    type RoundSnapRow = { full_name: string | null; points: number };
    let roundSnapshotRows: RoundSnapRow[] = [];
    let currentRoundLabel: string | undefined;
    let meRoundPoints = 0;

    if (configured) {
      const adminForRound = createAdminClient();
      const [{ data: rScores }, { data: profileNames }] = await Promise.all([
        adminForRound.from('round_scores').select('user_id, round_key, points, exact_pts, diff_pts, complete'),
        adminForRound.from('profiles').select('id, full_name').eq('agreed_to_ranking', true),
      ]);

      type RS = {
        user_id: string; round_key: string; points: number;
        exact_pts: number; diff_pts: number; complete: boolean;
      };
      const nameMap = new Map<string, string | null>(
        ((profileNames ?? []) as { id: string; full_name: string | null }[]).map((p) => [p.id, p.full_name])
      );

      const byRound = new Map<string, RS[]>();
      const completeKeys = new Set<string>();
      for (const r of (rScores ?? []) as RS[]) {
        const list = byRound.get(r.round_key) ?? [];
        list.push(r);
        byRound.set(r.round_key, list);
        if (r.complete) completeKeys.add(r.round_key);
      }

      // Rodada vigente = primeira rodada que ainda NÃO encerrou.
      const vigenteKey: RoundKey =
        ROUND_ORDER.find((key) => !completeKeys.has(key)) ?? ROUND_ORDER[ROUND_ORDER.length - 1];

      currentRoundLabel = ROUND_LABELS[vigenteKey];
      const myRow = (byRound.get(vigenteKey) ?? []).find((r) => r.user_id === userId);
      meRoundPoints = myRow?.points ?? 0;

      // Desempate da rodada: pontos → placar exato → saldo (valores já gravados).
      roundSnapshotRows = (byRound.get(vigenteKey) ?? [])
        .filter((r) => nameMap.has(r.user_id))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.exact_pts !== a.exact_pts) return b.exact_pts - a.exact_pts;
          return b.diff_pts - a.diff_pts;
        })
        .map((r) => ({ full_name: nameMap.get(r.user_id) ?? null, points: r.points }));
    }

    // Bracket precisa dos times já classificados (mesma fonte da página Jogos).
    const enrichedMatches: Match[] = [...staticMatches];
    if (configured) {
      const adminM = createAdminClient();
      const { data: mData } = await adminM
        .from('matches')
        .select('id, status, home_score, away_score, home_penalties, away_penalties, home_team_id, away_team_id');
      if (mData && mData.length > 0) {
        const byId = new Map(
          mData.map((r) => {
            const live: any = {
              status: r.status as MatchResult['status'],
              homeGoals: r.home_score as number | null,
              awayGoals: r.away_score as number | null,
              homePenalties: r.home_penalties as number | null,
              awayPenalties: r.away_penalties as number | null,
            };
            if (r.home_team_id) live.homeTeamId = r.home_team_id;
            if (r.away_team_id) live.awayTeamId = r.away_team_id;
            return [r.id, live] as const;
          }),
        );
        for (let i = 0; i < enrichedMatches.length; i++) {
          const live = byId.get(enrichedMatches[i].id);
          if (live) enrichedMatches[i] = { ...enrichedMatches[i], ...live };
        }
      }
    }

    return (
      <div className="container home nx-dash">
        {/* ── Olá, usuário ───────────────────────────────────── */}
        <section className="nx-hello">
          <span className="home-eyebrow">
            <Sparkles size={14} /> Bolão da Mindu · Copa 2026
          </span>
          <h1 className="nx-hello-title">
            Olá, <span className="home-title-accent">{firstName}</span>!
          </h1>
        </section>

        {/* ── Card principal + seleções + próximos jogos ─────── */}
        <DashboardClient
          profile={profile}
          existingPredictions={existingPredictions}
          multipliers={multipliers}
          results={results}
        />

        {/* ── Chaveamento das eliminatórias ──────────────────── */}
        <section className="nx-section">
          <h2 className="nx-h2"><Trophy size={18} /> Chaveamento das Eliminatórias</h2>
          <BracketCard matches={enrichedMatches} />
        </section>

        {/* ── Classificação ──────────────────────────────────── */}
        <section className="nx-section">
          <h2 className="nx-h2"><Crown size={18} /> Classificação</h2>
          <RankingSnapshot
            rows={rankRows}
            meName={profile.full_name}
            mePoints={profile.total_score ?? 0}
            roundRows={roundSnapshotRows}
            currentRoundLabel={currentRoundLabel}
            meRoundPoints={meRoundPoints}
          />
        </section>

        {/* ── Indique e ganhe pontos ─────────────────────────── */}
        {profile.referral_code && (
          <section className="nx-section">
            <h2 className="nx-h2"><Users size={18} /> Indique e ganhe pontos</h2>
            <ReferralCard code={profile.referral_code} bonus={profile.referral_bonus ?? 0} />
          </section>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // NOVO USUÁRIO (ou logado sem Premium) — funil de conversão
  // ════════════════════════════════════════════════════════════════
  const thermo = computeThermometer();
  const verdict = verdictFor(thermo.stillAchievable, leaderPoints);
  const continueHref = isProfileComplete(profile) ? '/pagamento' : '/completar-cadastro';

  return (
    <div className="container home">
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="home-hero">
        <div className="home-hero-glow" aria-hidden="true" />

        <span className="home-eyebrow animate-fade-in">
          <Sparkles size={14} /> Bolão da Mindu · Copa do Mundo 2026
        </span>

        <h1 className="home-title home-title-xl animate-fade-in">
          Dá tempo de<br /><span className="home-title-accent">virar o jogo!</span>
        </h1>
        <p className="home-lede animate-fade-in">
          Acerte os placares, lidere o ranking, indique amigos e conquiste
          prêmios exclusivos da MinduBier! Tudo isso por {PRICE}!
        </p>

        <div className="home-hero-cta animate-fade-in">
          <Link href="/bolao" className="btn btn-gold home-btn-lg">
            <PartyPopper size={18} /> Entrar no Bolão · {PRICE}
          </Link>
          <a href="#entrar" className="btn btn-secondary home-btn-lg">
            <Trophy size={18} /> Já tenho conta
          </a>
        </div>

        {/* Como funciona — mini-strip condensada */}
        <ul className="home-mini-steps animate-fade-in">
          {MINI_STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.text} className="home-mini-step">
                <span className="home-mini-num">{i + 1}</span>
                <Icon size={16} />
                <span>{s.text}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Logado sem Premium → falta concluir cadastro/pagamento */}
      {authenticated && !isPremium && (
        <ScrollReveal>
          <div className="home-resume glass-card-static">
            <CheckCircle2 size={22} />
            <div className="home-resume-text">
              <strong>Falta pouco para você entrar!</strong>
              <span>Conclua seu cadastro e a ativação do Bolão Premium.</span>
            </div>
            <Link href={continueHref} className="btn btn-gold btn-sm">
              Continuar <ArrowRight size={15} />
            </Link>
          </div>
        </ScrollReveal>
      )}

      {/* ── POR QUE PARTICIPAR (ênfase) ────────────────────── */}
      <ScrollReveal>
        <section className="home-section">
          <div className="home-section-head">
            <h2 className="home-h2">
              <Sparkles size={20} /> Por que participar
            </h2>
            <p className="home-sub">
              Um pequeno resumo do que está em jogo.
            </p>
          </div>
          <div className="home-perks">
            {PERKS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className={`home-perk glass-card-static accent-${p.accent}`}>
                  <div className="home-perk-icon">
                    <Icon size={22} />
                  </div>
                  <h3 className="home-perk-title">{p.title}</h3>
                  <p className="home-perk-text">{p.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      </ScrollReveal>

      {/* ── TERMÔMETRO (ênfase) ────────────────────────────── */}
      <ScrollReveal>
        <section className="home-section">
          <JoinThermometer
            pct={thermo.pct}
            stillAchievable={thermo.stillAchievable}
            leaderPoints={leaderPoints}
            remainingMatches={thermo.remainingMatches}
            remainingRounds={thermo.remainingRounds}
            verdict={verdict}
          />
        </section>
      </ScrollReveal>

      {/* ── CTA + LOGIN ────────────────────────────────────── */}
      <ScrollReveal>
        <section className="home-cta-band glass-card-static">
          <div className="home-cta-band-glow" aria-hidden="true" />
          <Trophy size={34} className="home-cta-band-icon" />
          <h2 className="home-cta-band-title">A virada começa agora.</h2>
          <p className="home-cta-band-text">
            Entre por {PRICE}, palpite nos próximos jogos e dispute os prêmios MinduBier.
          </p>
          <Link href="/bolao" className="btn btn-gold home-btn-lg">
            Quero participar <ArrowRight size={18} />
          </Link>
        </section>
      </ScrollReveal>

      {/* Card de login/criar conta logo abaixo (só para deslogados) */}
      {!authenticated && (
        <ScrollReveal>
          <section id="entrar" className="home-auth">
            <div className="home-section-head">
              <h2 className="home-h2">
                <Trophy size={20} /> Entrar ou criar conta
              </h2>
              <p className="home-sub">Comece agora! leva menos de um minuto.</p>
            </div>
            <AuthPanel />
          </section>
        </ScrollReveal>
      )}

      {/* ── EXPLORE TAMBÉM ─────────────────────────────────── */}
      <section className="home-explore">
        <span className="home-explore-label">Explore também</span>
        <div className="home-explore-links">
          <Link href="/jogos" className="home-explore-link"><Calendar size={15} /> Jogos</Link>
          <Link href="/grupos" className="home-explore-link"><BarChart3 size={15} /> Grupos</Link>
          <Link href="/selecoes" className="home-explore-link"><Flag size={15} /> Seleções</Link>
        </div>
      </section>
    </div>
  );
}
