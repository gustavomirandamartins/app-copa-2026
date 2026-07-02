'use client';

import { useMemo, useState, useTransition } from 'react';
import { Zap } from 'lucide-react';
import { matches as allMatches } from '@/data/matches';
import { getTeamById } from '@/data/teams';
import { formatKickoffDate, formatKickoffTime } from '@/lib/datetime';
import { setMatchMultiplier } from '@/app/admin/actions';
import type { MatchStage } from '@/lib/types';
import './admin.css';

const stageTabs: { key: MatchStage; label: string }[] = [
  { key: 'group', label: 'Fase de Grupos' },
  { key: 'round-of-32', label: '16 Avos' },
  { key: 'round-of-16', label: 'Oitavas' },
  { key: 'quarter-final', label: 'Quartas' },
  { key: 'semi-final', label: 'Semifinais' },
  { key: 'third-place', label: '3º lugar' },
  { key: 'final', label: 'Final' },
];

const MULTIPLIER_OPTIONS = [1, 2, 3, 4, 5];

function teamName(teamId: string | null, placeholder?: string): string {
  if (teamId) return getTeamById(teamId)?.name ?? 'A definir';
  return placeholder ?? 'A definir';
}

function MatchRow({
  match,
  multiplier,
  onChange,
}: {
  match: (typeof allMatches)[number];
  multiplier: number;
  onChange: (value: number) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const boosted = multiplier > 1;

  function handleSelect(value: number) {
    setError(null);
    startTransition(async () => {
      const res = await setMatchMultiplier(match.id, value);
      if (res.ok) {
        onChange(value);
      } else {
        setError(res.error ?? 'Erro ao salvar.');
      }
    });
  }

  return (
    <div className={`admin-match-row glass-card-static ${boosted ? 'boosted' : ''}`}>
      <div className="admin-match-info">
        <div className="admin-match-teams">
          {boosted && (
            <span className="admin-boost-badge">
              <Zap size={12} /> x{multiplier}
            </span>
          )}
          <strong>{teamName(match.homeTeamId, match.homeTeamPlaceholder)}</strong>
          <span className="admin-match-x">×</span>
          <strong>{teamName(match.awayTeamId, match.awayTeamPlaceholder)}</strong>
        </div>
        <span className="admin-match-date">
          {formatKickoffDate(match.dateUTC, { day: 'numeric', month: 'short' })} ·{' '}
          {formatKickoffTime(match.dateUTC)}
        </span>
        {error && <span className="admin-match-error">{error}</span>}
      </div>

      <label className="admin-mult-select">
        Multiplicador
        <select
          value={multiplier}
          disabled={pending}
          onChange={(e) => handleSelect(Number(e.target.value))}
        >
          {MULTIPLIER_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m === 1 ? 'Normal (x1)' : `Turbinado x${m}`}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function AdminMatchList({
  initialMultipliers,
}: {
  initialMultipliers: Record<string, number>;
}) {
  const [activeStage, setActiveStage] = useState<MatchStage>('group');
  const [multipliers, setMultipliers] =
    useState<Record<string, number>>(initialMultipliers);

  const stageMatches = useMemo(
    () => allMatches.filter((m) => m.stage === activeStage),
    [activeStage],
  );

  const boostedCount = Object.values(multipliers).filter((m) => m > 1).length;

  return (
    <div>
      <p className="admin-empty" style={{ padding: 0, marginBottom: 'var(--space-md)' }}>
        {boostedCount > 0
          ? `${boostedCount} jogo(s) turbinado(s). `
          : 'Nenhum jogo turbinado ainda. '}
        Os pontos dos jogos turbinados são multiplicados quando o resultado é
        apurado, e aparecem em destaque na tela de palpites.
      </p>

      <div className="tabs" style={{ marginBottom: 'var(--space-md)' }}>
        {stageTabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab ${activeStage === tab.key ? 'active' : ''}`}
            onClick={() => setActiveStage(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-match-grid">
        {stageMatches.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            multiplier={multipliers[match.id] ?? 1}
            onChange={(value) =>
              setMultipliers((prev) => ({ ...prev, [match.id]: value }))
            }
          />
        ))}
      </div>
    </div>
  );
}
