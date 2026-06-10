'use client';

import { useEffect, useMemo, useState } from 'react';
import { Lock, Dices } from 'lucide-react';
import { matches as allMatches } from '@/data/matches';
import { getTeamById } from '@/data/teams';
import type { Match, MatchStage } from '@/lib/types';

const BRAZIL_ID = 'bra';

const stageTabs: { key: MatchStage; label: string }[] = [
  { key: 'group', label: 'Fase de Grupos' },
  { key: 'round-of-32', label: '16 Avos' },
  { key: 'round-of-16', label: 'Oitavas' },
  { key: 'quarter-final', label: 'Quartas' },
  { key: 'semi-final', label: 'Semifinais' },
  { key: 'final', label: 'Final' },
];

export interface PredictionValue {
  home: number | null;
  away: number | null;
  autofilled: boolean;
}

interface Props {
  values: Map<string, PredictionValue>;
  canEdit: boolean;
  onScore: (matchId: string, side: 'home' | 'away', value: number | null) => void;
  onAutofill: () => void;
}

/** Um jogo está travado se não tem times definidos, já começou ou não está agendado. */
function isLocked(match: Match, now: number | null): boolean {
  if (!match.homeTeamId || !match.awayTeamId) return true;
  if (match.status !== 'scheduled') return true;
  if (now !== null && new Date(match.dateUTC).getTime() <= now) return true;
  return false;
}

function TeamCell({ teamId }: { teamId: string | null }) {
  const team = teamId ? getTeamById(teamId) : undefined;
  return (
    <span className="bolao-team">
      <span className="bolao-flag">{team?.flag ?? '⏳'}</span>
      <span>{team?.name ?? 'A definir'}</span>
    </span>
  );
}

export function PredictionGrid({ values, canEdit, onScore, onAutofill }: Props) {
  const [activeStage, setActiveStage] = useState<MatchStage>('group');

  // Date.now() só após montar, evitando divergência de hidratação.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  const stageMatches = useMemo(
    () => allMatches.filter((m) => m.stage === activeStage),
    [activeStage],
  );

  return (
    <div>
      <div className="bolao-actionbar">
        <div className="tabs" style={{ marginBottom: 0, flex: 1 }}>
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
        <button
          className="btn btn-secondary btn-sm"
          onClick={onAutofill}
          disabled={!canEdit}
          title="Preenche todos os jogos editáveis com placares simulados"
        >
          <Dices size={16} /> Gerar resultado (estatística)
        </button>
      </div>

      <div className="bolao-list">
        {stageMatches.map((match) => {
          const locked = isLocked(match, now) || !canEdit;
          const value = values.get(match.id);
          const isBrazil =
            match.homeTeamId === BRAZIL_ID || match.awayTeamId === BRAZIL_ID;

          return (
            <div
              key={match.id}
              className={`bolao-row glass-card-static ${isBrazil ? 'brazil' : ''} ${
                locked ? 'locked' : ''
              }`}
            >
              <TeamCell teamId={match.homeTeamId} />

              <div className="bolao-scores">
                <input
                  type="number"
                  min={0}
                  max={20}
                  inputMode="numeric"
                  className="bolao-score-input"
                  aria-label="Placar mandante"
                  disabled={locked}
                  value={value?.home ?? ''}
                  onChange={(e) =>
                    onScore(
                      match.id,
                      'home',
                      e.target.value === '' ? null : Number(e.target.value),
                    )
                  }
                />
                <span className="bolao-x">×</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  inputMode="numeric"
                  className="bolao-score-input"
                  aria-label="Placar visitante"
                  disabled={locked}
                  value={value?.away ?? ''}
                  onChange={(e) =>
                    onScore(
                      match.id,
                      'away',
                      e.target.value === '' ? null : Number(e.target.value),
                    )
                  }
                />
              </div>

              <TeamCell teamId={match.awayTeamId} />

              {locked && (
                <Lock size={14} className="bolao-lock" aria-label="Bloqueado" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
