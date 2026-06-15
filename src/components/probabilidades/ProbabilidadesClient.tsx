'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, ExternalLink, RefreshCw, Loader2, Check, AlertCircle } from 'lucide-react';
import { getTeamById } from '@/data/teams';
import type { UfmgProbability } from '@/lib/types';
import type { ProbStage } from '@/data/ufmg-probabilities';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { refreshProbabilities } from '@/app/admin/actions';

type Stage = ProbStage;

const stageTabs: { key: Stage; label: string }[] = [
  { key: 'champion', label: 'Campeão' },
  { key: 'final', label: 'Final' },
  { key: 'semifinal', label: 'Semifinal' },
  { key: 'quarterFinal', label: 'Quartas' },
  { key: 'roundOf16', label: 'Oitavas' },
  { key: 'roundOf32', label: '16 Avos' },
];

interface Props {
  probabilities: UfmgProbability[];
  isAdmin: boolean;
  lastUpdated: string | null;
}

function AnimatedBar({ value, maxValue, delay = 0 }: { value: number; maxValue: number; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth((value / maxValue) * 100), delay + 100);
    return () => clearTimeout(t);
  }, [value, maxValue, delay]);

  return (
    <div className="probability-bar-track">
      <div
        className="probability-bar-fill"
        style={{ width: `${width}%`, transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <span className="probability-bar-value">{value}%</span>
      </div>
    </div>
  );
}

function formatUpdated(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function ProbabilidadesClient({ probabilities, isAdmin, lastUpdated }: Props) {
  const [stage, setStage] = useState<Stage>('champion');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const byTeamId = useMemo(
    () => new Map(probabilities.map((p) => [p.teamId, p])),
    [probabilities],
  );

  const data = useMemo(
    () =>
      probabilities
        .map((p) => ({ teamId: p.teamId, probability: p[stage] }))
        .sort((a, b) => b.probability - a.probability),
    [probabilities, stage],
  );
  const maxProb = data.length > 0 ? data[0].probability : 1;

  const brasilProb = byTeamId.get('bra');
  const brasilTeam = getTeamById('bra');
  const updatedLabel = formatUpdated(lastUpdated);

  function handleRefresh() {
    setFeedback(null);
    startTransition(async () => {
      const res = await refreshProbabilities();
      if (res.ok) {
        setFeedback({ ok: true, msg: `Atualizado · ${res.teams} seleções` });
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error ?? 'Falha ao atualizar.' });
      }
    });
  }

  return (
    <div className="container">
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="animate-fade-in">
          <BarChart3 size={28} style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }} />
          Probabilidades — UFMG
        </h1>
        <p className="animate-fade-in" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Modelo matemático do Dept. de Matemática da UFMG ·{' '}
          <a
            href="https://www.mat.ufmg.br/futebol/copa-do-mundo-2026/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--blue)' }}
          >
            mat.ufmg.br <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
          </a>
          {updatedLabel && (
            <span style={{ color: 'var(--text-tertiary)' }}> · atualizado em {updatedLabel}</span>
          )}
        </p>

        {isAdmin && (
          <div
            className="animate-fade-in"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}
          >
            <button
              type="button"
              className="btn btn-gold btn-sm"
              onClick={handleRefresh}
              disabled={pending}
            >
              {pending ? (
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <RefreshCw size={15} />
              )}
              {pending ? 'Atualizando…' : 'Atualizar probabilidades'}
            </button>
            {feedback && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.8rem',
                  color: feedback.ok ? 'var(--copa-green)' : 'var(--danger, #c0392b)',
                }}
              >
                {feedback.ok ? <Check size={14} /> : <AlertCircle size={14} />}
                {feedback.msg}
              </span>
            )}
          </div>
        )}
      </section>

      {/* Brasil Highlight */}
      {brasilTeam && brasilProb && (
        <div className="glass-card-static animate-fade-in" style={{
          padding: 'var(--space-lg)',
          marginBottom: 'var(--space-xl)',
          borderLeft: '3px solid var(--gold)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <TeamFlag name={brasilTeam.name} flagEmoji={brasilTeam.flag} size={40} style={{ borderRadius: 4 }} />
            <h3>{brasilTeam.name}</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 'var(--space-sm)' }}>
            {stageTabs.map(s => {
              const val = brasilProb[s.key];
              return (
                <div key={s.key} style={{
                  textAlign: 'center',
                  padding: 'var(--space-sm)',
                  background: s.key === 'champion' ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <div style={{
                    fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-heading)',
                    color: s.key === 'champion' ? 'var(--gold)' : 'var(--text-primary)',
                  }}>
                    {val}%
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs animate-fade-in" style={{ marginBottom: 'var(--space-xl)' }}>
        {stageTabs.map(tab => (
          <button
            key={tab.key}
            className={`tab ${stage === tab.key ? 'active' : ''}`}
            onClick={() => setStage(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Probability List */}
      <div className="glass-card-static animate-fade-in" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
        {data.map((item, i) => {
          const team = getTeamById(item.teamId);
          if (!team) return null;
          return (
            <div key={item.teamId} className="probability-bar-container">
              <div className="probability-bar-info">
                <span style={{
                  width: 24, textAlign: 'right', fontSize: '0.75rem', fontWeight: 700,
                  color: i < 3 ? 'var(--gold)' : 'var(--text-tertiary)',
                  fontFamily: 'var(--font-heading)',
                }}>
                  {i + 1}
                </span>
                <TeamFlag name={team.name} flagEmoji={team.flag} size={24} />
                <Link href={`/selecoes/${team.id}`} style={{ textDecoration: 'none' }}>
                  <span className="name" style={{ color: 'var(--text-primary)' }}>{team.name}</span>
                </Link>
              </div>
              <AnimatedBar value={item.probability} maxValue={maxProb} delay={i * 40} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
