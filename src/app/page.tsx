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
  CheckCircle2,
  PartyPopper,
  Calendar,
  BarChart3,
  Flag,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { computeThermometer, verdictFor } from '@/lib/bolao/thermometer';
import { ROUND_BONUS_POINTS } from '@/lib/bolao/rounds';
import { REFERRAL_BONUS_POINTS } from '@/lib/bolao/referral';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { JoinThermometer } from '@/components/home/JoinThermometer';
import './home.css';

export const revalidate = 0;

const PRICE = 'R$ 39,90';

const STEPS = [
  {
    icon: CheckCircle2,
    title: 'Crie sua conta e ative',
    text: `Cadastro rápido e Bolão Premium por ${PRICE} — pagamento único via Pix ou cartão.`,
  },
  {
    icon: Target,
    title: 'Palpite antes do apito',
    text: 'Para cada jogo, diga o placar que você espera. Vale palpitar até o início da partida.',
  },
  {
    icon: Zap,
    title: 'Some pontos automaticamente',
    text: 'Terminou o jogo, os pontos caem no seu total. Acertou o placar exato? 5 pontos.',
  },
  {
    icon: Trophy,
    title: 'Dispute os prêmios MinduBier',
    text: 'Acompanhe a classificação em tempo real e brigue pelo topo até a final.',
  },
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
    title: `Bônus de rodada +${ROUND_BONUS_POINTS}`,
    text: 'Quem faz mais pontos na rodada leva +50. São 7 rodadas premiadas ao longo da Copa.',
    accent: 'gold',
  },
  {
    icon: Users,
    title: `Indique e ganhe +${REFERRAL_BONUS_POINTS}`,
    text: 'Cada amigo que entra com o seu cupom te dá +5 pontos. Sem limite de indicações.',
    accent: 'green',
  },
];

export default async function HomePage() {
  const configured = isSupabaseConfigured();

  let leaderPoints = 0;
  let isPremium = false;

  if (configured) {
    const supabase = await createClient();

    const [{ data: top }, { data: auth }] = await Promise.all([
      supabase
        .from('public_ranking')
        .select('total_score')
        .order('total_score', { ascending: false })
        .limit(1),
      supabase.auth.getUser(),
    ]);

    leaderPoints = (top?.[0]?.total_score as number | undefined) ?? 0;

    if (auth?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', auth.user.id)
        .single();
      isPremium = !!(profile as { is_premium?: boolean } | null)?.is_premium;
    }
  }

  const thermo = computeThermometer();
  const verdict = verdictFor(thermo.stillAchievable, leaderPoints);

  return (
    <div className="container home">
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="home-hero">
        <div className="home-hero-glow" aria-hidden="true" />

        <span className="home-eyebrow animate-fade-in">
          <Sparkles size={14} /> Bolão da Mindu · Copa do Mundo 2026
        </span>

        {isPremium ? (
          <>
            <h1 className="home-title animate-fade-in">
              Você já está <span className="home-title-accent">no jogo</span>.
            </h1>
            <p className="home-lede animate-fade-in">
              Bora palpitar e subir na classificação? Não esqueça de chamar a
              galera com o seu cupom — cada amigo que entra te dá{' '}
              <strong>+{REFERRAL_BONUS_POINTS} pontos</strong>.
            </p>
            <div className="home-hero-cta animate-fade-in">
              <Link href="/bolao" className="btn btn-gold home-btn-lg">
                <Target size={18} /> Fazer meus palpites
              </Link>
              <Link href="/ranking" className="btn btn-secondary home-btn-lg">
                <Trophy size={18} /> Ver classificação
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="home-title animate-fade-in">
              Palpite, pontue e{' '}
              <span className="home-title-accent">leve prêmios</span> na Copa
              2026.
            </h1>
            <p className="home-lede animate-fade-in">
              O Bolão da Mindu é a sua disputa nos 104 jogos da Copa do Mundo.
              Acerte placares, vença rodadas, indique amigos — e concorra aos
              prêmios exclusivos da MinduBier.
            </p>
            <div className="home-hero-cta animate-fade-in">
              <Link href="/bolao" className="btn btn-gold home-btn-lg">
                <PartyPopper size={18} /> Entrar no Bolão · {PRICE}
              </Link>
              <Link href="/ranking" className="btn btn-secondary home-btn-lg">
                <Trophy size={18} /> Ver prêmios
              </Link>
            </div>
            <p className="home-hero-note animate-fade-in">
              Pagamento único · Pix ou cartão · 48 seleções · 104 jogos
            </p>
          </>
        )}
      </section>

      {/* ── COMO FUNCIONA ──────────────────────────────────── */}
      <ScrollReveal>
        <section className="home-section">
          <div className="home-section-head">
            <h2 className="home-h2">
              <Zap size={20} /> Como funciona
            </h2>
            <p className="home-sub">Quatro passos até o seu primeiro ponto.</p>
          </div>
          <ol className="home-steps">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.title} className="home-step glass-card-static">
                  <span className="home-step-num">{i + 1}</span>
                  <Icon className="home-step-icon" size={22} />
                  <h3 className="home-step-title">{s.title}</h3>
                  <p className="home-step-text">{s.text}</p>
                </li>
              );
            })}
          </ol>
        </section>
      </ScrollReveal>

      {/* ── VANTAGENS ──────────────────────────────────────── */}
      <ScrollReveal>
        <section className="home-section">
          <div className="home-section-head">
            <h2 className="home-h2">
              <Sparkles size={20} /> Por que participar
            </h2>
            <p className="home-sub">
              Mais que um bolão — várias formas de pontuar e ganhar.
            </p>
          </div>
          <div className="home-perks">
            {PERKS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className={`home-perk glass-card-static accent-${p.accent}`}
                >
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

      {/* ── TERMÔMETRO ─────────────────────────────────────── */}
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

      {/* ── CTA FINAL ──────────────────────────────────────── */}
      <ScrollReveal>
        <section className="home-cta-band glass-card-static">
          <div className="home-cta-band-glow" aria-hidden="true" />
          <Trophy size={34} className="home-cta-band-icon" />
          <h2 className="home-cta-band-title">
            {isPremium
              ? 'A taça não espera. Faça seus palpites!'
              : 'Bora pro Bolão? A virada começa agora.'}
          </h2>
          <p className="home-cta-band-text">
            {isPremium
              ? 'Registre os placares dos próximos jogos antes do apito inicial.'
              : `Entre por ${PRICE}, palpite nos próximos jogos e dispute os prêmios MinduBier.`}
          </p>
          <Link href="/bolao" className="btn btn-gold home-btn-lg">
            {isPremium ? 'Ir para meus palpites' : 'Quero participar'}{' '}
            <ArrowRight size={18} />
          </Link>
        </section>
      </ScrollReveal>

      {/* ── EXPLORE TAMBÉM ─────────────────────────────────── */}
      <section className="home-explore">
        <span className="home-explore-label">Explore também</span>
        <div className="home-explore-links">
          <Link href="/jogos" className="home-explore-link">
            <Calendar size={15} /> Jogos
          </Link>
          <Link href="/grupos" className="home-explore-link">
            <BarChart3 size={15} /> Grupos
          </Link>
          <Link href="/selecoes" className="home-explore-link">
            <Flag size={15} /> Seleções
          </Link>
          <Link href="/probabilidades" className="home-explore-link">
            <Trophy size={15} /> Probabilidades
          </Link>
        </div>
      </section>
    </div>
  );
}
