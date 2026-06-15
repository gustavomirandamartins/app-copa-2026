'use client';

import { useEffect, useMemo, useState } from 'react';
import { Lock, Dices, Zap, Sparkles, Trophy } from 'lucide-react';
import { matches as allMatches } from '@/data/matches';
import { getTeamById } from '@/data/teams';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { formatKickoffTime, formatKickoffDate } from '@/lib/datetime';
import type { MatchResult } from './BolaoClient';
import type { Match, MatchStage, MatchStatus } from '@/lib/types';

const BRAZIL_ID = 'bra';
const UPCOMING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 h

// Tipo interno de aba — grupos divididos por rodada (matchday).
type TabKey =
  | 'group-1'
  | 'group-2'
  | 'group-3'
  | 'round-of-32'
  | 'round-of-16'
  | 'quarter-final'
  | 'semi-final'
  | 'final';

const stageTabs: { key: TabKey; label: string }[] = [
  { key: 'group-1', label: 'Fase de Grupos - 1ª Rodada' },
  { key: 'group-2', label: 'Fase de Grupos - 2ª Rodada' },
  { key: 'group-3', label: 'Fase de Grupos - 3ª Rodada' },
  { key: 'round-of-32', label: '16 Avos' },
  { key: 'round-of-16', label: 'Oitavas' },
  { key: 'quarter-final', label: 'Quartas' },
  { key: 'semi-final', label: 'Semifinais' },
  { key: 'final', label: 'Final' },
];

function matchesForTab(tab: TabKey): Match[] {
  if (tab === 'group-1') return allMatches.filter((m) => m.stage === 'group' && m.matchday === 1);
  if (tab === 'group-2') return allMatches.filter((m) => m.stage === 'group' && m.matchday === 2);
  if (tab === 'group-3') return allMatches.filter((m) => m.stage === 'group' && m.matchday === 3);
  return allMatches.filter((m) => m.stage === (tab as MatchStage));
}

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
  multipliers?: Record<string, number>;
  results?: Record<string, MatchResult>;
  pointsByMatch?: Record<string, number>;
}

/** "Pontos em dobro!", "Pontos em triplo!"… conforme o multiplicador. */
function boostLabel(m: number): string {
  const names: Record<number, string> = {
    2: 'Pontos em dobro!',
    3: 'Pontos em triplo!',
    4: 'Pontos em quádruplo!',
    5: 'Pontos em quíntuplo!',
  };
  return names[m] ?? `Pontos × ${m}!`;
}

/** Locked = teams not set, already started/finished, or kickoff passed. */
function isLocked(match: Match, status: MatchStatus, now: number | null): boolean {
  if (!match.homeTeamId || !match.awayTeamId) return true;
  if (status !== 'scheduled') return true;
  if (now !== null && new Date(match.dateUTC).getTime() <= now) return true;
  return false;
}

/** Match starts within the next 24 h and hasn't started yet. */
function isUpcoming(match: Match, status: MatchStatus, now: number | null): boolean {
  if (!now || status !== 'scheduled') return false;
  if (!match.homeTeamId || !match.awayTeamId) return false;
  const t = new Date(match.dateUTC).getTime();
  return t > now && t - now <= UPCOMING_WINDOW_MS;
}

/** Contagem regressiva auto-atualizável (próprio intervalo, 1 s). */
function Countdown({ targetUTC }: { targetUTC: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setRemaining(new Date(targetUTC).getTime() - Date.now());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetUTC]);

  if (remaining === null || remaining <= 0) return null;
  const totalSec = Math.floor(remaining / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  let label: string;
  if (d > 0) label = `${d}d ${h}h`;
  else if (h > 0) label = `${h}h ${String(m).padStart(2, '0')}min`;
  else label = `${m}:${String(s).padStart(2, '0')}`;

  return <span className="bolao-countdown">Começa em {label}</span>;
}

function TeamCell({ teamId, align }: { teamId: string | null; align: 'left' | 'right' }) {
  const team = teamId ? getTeamById(teamId) : undefined;
  return (
    <span className={`bolao-team ${align === 'right' ? 'is-right' : ''}`}>
      {align === 'left' &&
        (team ? (
          <TeamFlag name={team.name} flagEmoji={team.flag} size={24} style={{ borderRadius: 3 }} />
        ) : (
          <span className="bolao-flag">⏳</span>
        ))}
      <span className="bolao-team-name">{team?.name ?? 'A definir'}</span>
      {align === 'right' &&
        (team ? (
          <TeamFlag name={team.name} flagEmoji={team.flag} size={24} style={{ borderRadius: 3 }} />
        ) : (
          <span className="bolao-flag">⏳</span>
        ))}
    </span>
  );
}

export function PredictionGrid({
  values,
  canEdit,
  onScore,
  onAutofill,
  multipliers = {},
  results = {},
  pointsByMatch = {},
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('group-1');
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

  const stageMatches = useMemo(() => matchesForTab(activeTab), [activeTab]);

  // Agrupa por dia (BRT, determinístico — sem mismatch de hidratação).
  const dayGroups = useMemo(() => {
    const groups = new Map<string, Match[]>();
    for (const m of stageMatches) {
      const key = formatKickoffDate(m.dateUTC, { weekday: 'long', day: 'numeric', month: 'long' });
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }
    return groups;
  }, [stageMatches]);

  return (
    <div>
      <div className="bolao-actionbar">
        <div className="tabs" style={{ marginBottom: 0, flex: 1 }}>
          {stageTabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          className="btn btn-gold btn-sm"
          onClick={onAutofill}
          disabled={!canEdit}
          title="Preenche todos os jogos editáveis com placares simulados"
        >
          <Dices size={16} /> Gerar resultados aleatórios
        </button>
      </div>

      <div className="bolao-days">
        {Array.from(dayGroups.entries()).map(([day, dayMatches]) => (
          <section key={day} className="bolao-day">
            <h3 className="bolao-day-title">{day}</h3>

            <div className="bolao-day-matches">
              {dayMatches.map((match) => {
                const result = results[match.id];
                const status: MatchStatus = result?.status ?? match.status;
                const locked = isLocked(match, status, now) || !canEdit;
                const upcoming = isUpcoming(match, status, now);
                const finished = status === 'finished';
                const live = status === 'live';
                const value = values.get(match.id);
                const multiplier = multipliers[match.id] ?? 1;
                const boosted = multiplier > 1;
                const isBrazil =
                  match.homeTeamId === BRAZIL_ID || match.awayTeamId === BRAZIL_ID;
                const points = pointsByMatch[match.id];
                const hasGuess = value?.home != null && value?.away != null;

                return (
                  <div
                    key={match.id}
                    className={[
                      'bolao-card',
                      'glass-card-static',
                      isBrazil ? 'brazil' : '',
                      locked ? 'locked' : '',
                      upcoming ? 'upcoming' : '',
                      boosted ? 'boosted' : '',
                      finished ? 'finished' : '',
                      live ? 'live' : '',
                    ].join(' ').trim()}
                  >
                    {/* Tags no topo */}
                    <div className="bolao-card-tags">
                      {boosted && (
                        <span className="bolao-tag bolao-tag-boost">
                          <Zap size={12} /> {boostLabel(multiplier)}
                        </span>
                      )}
                      {upcoming && (
                        <span className="bolao-tag bolao-tag-soon">
                          <Sparkles size={12} /> Em breve
                        </span>
                      )}
                      {live && <span className="bolao-tag bolao-tag-live">● Ao vivo</span>}
                    </div>

                    {/* Confronto */}
                    <div className="bolao-card-match">
                      <TeamCell teamId={match.homeTeamId} align="left" />

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

                      <TeamCell teamId={match.awayTeamId} align="right" />
                    </div>

                    {/* Linha de status (full width, sob o confronto) */}
                    <div className="bolao-card-status">
                      {upcoming ? (
                        <Countdown targetUTC={match.dateUTC} />
                      ) : finished || live ? (
                        <span className="bolao-card-result">
                          {live ? 'Parcial' : 'Resultado'}: {result?.homeScore ?? 0} × {result?.awayScore ?? 0}
                        </span>
                      ) : (
                        <span className="bolao-match-time">
                          {mounted ? formatKickoffTime(match.dateUTC) : '--:--'}
                        </span>
                      )}
                    </div>

                    {/* Pontos conquistados (após o fim) */}
                    {finished && hasGuess && (
                      <div className={`bolao-card-points ${points ? 'scored' : 'zero'}`}>
                        <Trophy size={13} />
                        {points ? `+${points} ${points === 1 ? 'ponto' : 'pontos'}` : '0 pontos'}
                      </div>
                    )}

                    {locked && !finished && !live && (
                      <Lock size={13} className="bolao-lock" aria-label="Bloqueado" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
