'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Crown, Info, Save } from 'lucide-react';
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
        <div className="bolao-price">R$ 39,90</div>
        <button className="btn btn-primary" onClick={handleCheckout}>
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
