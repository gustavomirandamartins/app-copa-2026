'use client';

import { useMemo, useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Crown, Info, Save, Loader2 } from 'lucide-react';
import { matches as allMatches } from '@/data/matches';
import { getTeamById } from '@/data/teams';
import { simulateScore } from '@/lib/bolao/autofill';
import { savePredictions } from '@/app/bolao/actions';
import type { Profile, PredictionInput } from '@/lib/bolao/types';
import { PredictionGrid, type PredictionValue } from './PredictionGrid';
import { RankingConsentModal } from './RankingConsentModal';
import './bolao.css';

interface Props {
  configured: boolean;
  authenticated: boolean;
  profile: Profile | null;
  existingPredictions: PredictionInput[];
}

function seedValues(existing: PredictionInput[]): Map<string, PredictionValue> {
  const map = new Map<string, PredictionValue>();
  for (const p of existing) {
    map.set(p.match_id, {
      home: p.home_score_guess,
      away: p.away_score_guess,
      autofilled: p.is_autofilled,
    });
  }
  return map;
}

export function BolaoClient({
  configured,
  authenticated,
  profile,
  existingPredictions,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [values, setValues] = useState<Map<string, PredictionValue>>(() =>
    seedValues(existingPredictions),
  );
  const [agreed, setAgreed] = useState(profile?.agreed_to_ranking ?? false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // Modo demonstração: sem Supabase, deixamos a UI editável só para visualização.
  const isDemo = !configured;
  const isPremium = isDemo || profile?.is_premium === true;
  const canEdit = isDemo || (isPremium && agreed);

  // Stripe redirects to /bolao?checkout=success immediately — before the
  // webhook fires. If the user isn't premium yet, wait 3 s and reload so
  // the server re-reads the profile after the webhook has had time to run.
  const checkoutSuccess = searchParams.get('checkout') === 'success';
  const checkoutCancelled = searchParams.get('checkout') === 'cancel';
  const [waitingWebhook, setWaitingWebhook] = useState(
    checkoutSuccess && !isPremium,
  );

  useEffect(() => {
    if (!waitingWebhook) return;
    const t = setTimeout(() => {
      // Hard reload forces the Server Component to re-fetch the profile.
      router.replace('/bolao');
      router.refresh();
    }, 3500);
    return () => clearTimeout(t);
  }, [waitingWebhook, router]);

  function setScore(matchId: string, side: 'home' | 'away', value: number | null) {
    setValues((prev) => {
      const next = new Map(prev);
      const current = next.get(matchId) ?? { home: null, away: null, autofilled: false };
      next.set(matchId, { ...current, [side]: value, autofilled: false });
      return next;
    });
  }

  function autofillAll() {
    setValues((prev) => {
      const next = new Map(prev);
      for (const match of allMatches) {
        if (!match.homeTeamId || !match.awayTeamId) continue;
        if (match.status !== 'scheduled') continue;
        if (new Date(match.dateUTC).getTime() <= Date.now()) continue;
        const home = getTeamById(match.homeTeamId);
        const away = getTeamById(match.awayTeamId);
        if (!home || !away) continue;
        const score = simulateScore(home.fifaRanking, away.fifaRanking);
        next.set(match.id, { home: score.home, away: score.away, autofilled: true });
      }
      return next;
    });
  }

  const payload = useMemo<PredictionInput[]>(() => {
    const out: PredictionInput[] = [];
    for (const [matchId, v] of values) {
      if (v.home === null || v.away === null) continue;
      out.push({
        match_id: matchId,
        home_score_guess: v.home,
        away_score_guess: v.away,
        is_autofilled: v.autofilled,
      });
    }
    return out;
  }, [values]);

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const res = await savePredictions(payload);
      setMessage(
        res.ok ? 'Palpites salvos com sucesso!' : res.error ?? 'Erro ao salvar.',
      );
    });
  }

  async function handleCheckout() {
    const res = await fetch('/api/checkout', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  // ── Estados de acesso ──────────────────────────────────────────

  if (waitingWebhook) {
    return (
      <div className="glass-card-static bolao-notice" style={{ flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-2xl)', textAlign: 'center' }}>
        <Loader2 size={32} style={{ color: 'var(--gold)', animation: 'spin 1s linear infinite' }} />
        <p style={{ margin: 0, fontWeight: 600 }}>Pagamento confirmado! Ativando seu acesso Premium…</p>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Isso leva apenas alguns segundos.</p>
      </div>
    );
  }

  if (checkoutCancelled) {
    // Just fall through — page renders normally so the user can try again.
  }

  if (configured && !authenticated) {
    return (
      <div className="glass-card-static bolao-notice" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Info size={20} style={{ color: 'var(--blue)', flexShrink: 0 }} />
          <p style={{ margin: 0 }}>Faça login para dar seus palpites no Bolão Premium.</p>
        </div>
        <Link href="/login" className="btn btn-primary btn-sm">
          Entrar / Criar conta
        </Link>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="glass-card-static bolao-paywall">
        <Crown size={40} style={{ color: 'var(--gold)' }} />
        <h2>Bolão Premium</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Participe do nosso Bolão e concorra a diversos produtos exclusivos da MinduBier!
        </p>
        <ul style={{
          textAlign: 'left',
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
          lineHeight: 1.7,
          margin: 'var(--space-md) 0',
          paddingLeft: 'var(--space-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          <li>Você faz o palpite antes do início de cada partida.</li>
          <li>Se você acertar apenas o vencedor, ganhará <strong>1 ponto</strong>.</li>
          <li>Se você acertar o vencedor e a diferença de placar, ganhará <strong>3 pontos</strong>.</li>
          <li>Se você acertar o vencedor e o placar exato, ganhará <strong>5 pontos!</strong></li>
          <li>Ao final do campeonato, quem fizer o maior número de pontos vence!</li>
          <li>Haverá prêmios exclusivos da MinduBier para os três primeiros colocados.</li>
          <li>Você pode acompanhar sua posição no ranking a qualquer momento!</li>
        </ul>
        <div className="bolao-price">R$ 39,90</div>
        <button className="btn btn-gold" onClick={handleCheckout}>
          Quero participar
        </button>
      </div>
    );
  }

  return (
    <>
      {isDemo && (
        <div className="glass-card-static bolao-notice" style={{ marginBottom: 'var(--space-lg)' }}>
          <Info size={18} style={{ color: 'var(--gold)' }} />
          <p>
            <strong>Modo demonstração.</strong> Configure o Supabase para
            autenticar, salvar palpites e habilitar o ranking.
          </p>
        </div>
      )}

      {isPremium && !agreed && !isDemo && (
        <RankingConsentModal onAccepted={() => setAgreed(true)} />
      )}

      <PredictionGrid
        values={values}
        canEdit={canEdit}
        onScore={setScore}
        onAutofill={autofillAll}
      />

      <div className="bolao-savebar">
        {message && <span className="bolao-message">{message}</span>}
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={pending || isDemo || payload.length === 0}
          title={isDemo ? 'Indisponível no modo demonstração' : undefined}
        >
          <Save size={16} /> {pending ? 'Salvando…' : `Salvar palpites (${payload.length})`}
        </button>
      </div>
    </>
  );
}
