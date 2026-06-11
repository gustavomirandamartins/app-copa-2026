'use client';

import { useEffect, useMemo, useState } from 'react';
import { Lock, Dices, Clock } from 'lucide-react';
import { matches as allMatches } from '@/data/matches';
import { getTeamById } from '@/data/teams';
import { formatKickoffTime, formatKickoffDate } from '@/lib/datetime';
import type { Match, MatchStage } from '@/lib/types';

const BRAZIL_ID = 'bra';
const UPCOMING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 h

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

/** Locked = teams not set, already started, or not scheduled. */
function isLocked(match: Match, now: number | null): boolean {
  if (!match.homeTeamId || !match.awayTeamId) return true;
  if (match.status !== 'scheduled') return true;
  if (now !== null && new Date(match.dateUTC).getTime() <= now) return true;
  return false;
}

/** Match starts within the next 24 h and hasn't started yet. */
function isUpcoming(match: Match, now: number | null): boolean {
  if (!now || !match.homeTeamId || !match.awayTeamId) return false;
  const t = new Date(match.dateUTC).getTime();
  return t > now && t - now <= UPCOMING_WINDOW_MS;
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

function MatchTime({ dateUTC, mounted }: { dateUTC: string; mounted: boolean }) {
  if (!mounted) return <span className="bolao-match-time">--:--</span>;
  return (
    <span className="bolao-match-time">
      <Clock size={11} style={{ opacity: 0.6 }} />
      {formatKickoffDate(dateUTC, { weekday: 'short', day: 'numeric', month: 'short' })}
      {' · '}
      {formatKickoffTime(dateUTC)}
    </span>
  );
}

export function PredictionGrid({ values, canEdit, onScore, onAutofill }: Props) {
  const [activeStage, setActiveStage] = useState<MatchStage>('group');
  const [now, setNow] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    setMounted(true);
    // Re-evaluate locks every 30 s so a match auto-locks when it starts.
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

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
          const upcoming = isUpcoming(match, now);
          const value = values.get(match.id);
          const isBrazil =
            match.homeTeamId === BRAZIL_ID || match.awayTeamId === BRAZIL_ID;

          return (
            <div
              key={match.id}
              className={`bolao-row glass-card-static ${isBrazil ? 'brazil' : ''} ${
                locked ? 'locked' : ''
              } ${upcoming ? 'upcoming' : ''}`}
            >
              {upcoming && (
                <span className="bolao-upcoming-badge">Em breve</span>
              )}

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
                <div className="bolao-scores-center">
                  <span className="bolao-x">×</span>
                  <MatchTime dateUTC={match.dateUTC} mounted={mounted} />
                </div>
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
