'use client';

import { useEffect, useMemo, useState } from 'react';
import { Lock, Dices, Zap, Trophy, MapPin, ChevronDown } from 'lucide-react';
import { matches as allMatches } from '@/data/matches';
import { getTeamById } from '@/data/teams';
import { getStadiumById } from '@/data/stadiums';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { MatchWinBar } from '@/components/ui/MatchWinBar';
import { SelecaoCompare } from '@/components/home/SelecaoCompare';
import { formatKickoffTime, formatKickoffDate } from '@/lib/datetime';
import type { MatchResult } from './BolaoClient';
import type { Match, MatchStage, MatchStatus, UfmgProbability } from '@/lib/types';
import type { MatchWinProbability } from '@/lib/bolao/probabilities';

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
  let list: Match[];
  if (tab === 'group-1') list = allMatches.filter((m) => m.stage === 'group' && m.matchday === 1);
  else if (tab === 'group-2') list = allMatches.filter((m) => m.stage === 'group' && m.matchday === 2);
  else if (tab === 'group-3') list = allMatches.filter((m) => m.stage === 'group' && m.matchday === 3);
  else list = allMatches.filter((m) => m.stage === (tab as MatchStage));
  // Ordena por horário (a ordem do array pode não ser cronológica).
  return [...list].sort(
    (a, b) => new Date(a.dateUTC).getTime() - new Date(b.dateUTC).getTime(),
  );
}

/**
 * Aba inicial = rodada vigente. Como a fase de grupos já se encerrou, a varredura
 * começa nos 16 avos e avança para a primeira fase ainda não concluída.
 * Determinístico (sem Date.now) — seguro p/ hidratar.
 */
function vigenteTab(results: Record<string, MatchResult>): TabKey {
  const knockoutStart = stageTabs.findIndex((t) => t.key === 'round-of-32');
  for (const tab of stageTabs.slice(knockoutStart)) {
    const ms = matchesForTab(tab.key);
    if (ms.length === 0) continue;
    const allFinished = ms.every((m) => (results[m.id]?.status ?? m.status) === 'finished');
    if (!allFinished) return tab.key;
  }
  return 'final';
}

export interface PredictionValue {
  home: number | null;
  away: number | null;
  penaltyWinnerId?: string | null;
  autofilled: boolean;
}

interface Props {
  values: Map<string, PredictionValue>;
  canEdit: boolean;
  onScore: (matchId: string, side: 'home' | 'away' | 'penaltyWinner', value: number | string | null) => void;
  onAutofill: () => void;
  multipliers?: Record<string, number>;
  results?: Record<string, MatchResult>;
  pointsByMatch?: Record<string, number>;
  probabilities?: Record<string, UfmgProbability>;
  matchProbabilities?: Record<number, MatchWinProbability>;
}

/** Mensagem contextual de resultado após a partida. */
function resultMessage(
  points: number | undefined,
  hasGuess: boolean,
  multiplier: number,
): string {
  if (!hasGuess) return 'Essa partida não teve palpite!';
  if (!points || points === 0) return 'Ah não! Você errou o placar! Quem sabe na próxima?';
  const base = points / multiplier;
  if (base >= 5) return multiplier > 1
    ? `Você acertou o placar exato e ganhou ${points} pontos! Parabéns!`
    : 'Você acertou o placar exato e ganhou 5 pontos! Parabéns!';
  if (base >= 3) return multiplier > 1
    ? `Você acertou o vencedor e a diferença, ganhou ${points} pontos!`
    : 'Você chegou quase lá! Acertou o vencedor e a diferença, ganhou 3 pontos!';
  return multiplier > 1
    ? `Você pelo menos acertou o vencedor, ganhou ${points} ponto${points === 1 ? '' : 's'}!`
    : 'Você pelo menos acertou o vencedor, ganhou 1 pontinho!';
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

/**
 * Locked = teams not set, already started/finished, or kickoff passed.
 * Recebe os ids JÁ mesclados com o banco (result?.homeTeamId ?? match.homeTeamId)
 * — nunca os do array estático `matches`, que fica com homeTeamId/awayTeamId
 * null pra todo jogo de mata-mata até o próximo deploy (é o app.advancement()
 * do sync que resolve isso em tempo real na tabela `matches` do Supabase).
 */
function isLocked(homeTeamId: string | null, awayTeamId: string | null, dateUTC: string, status: MatchStatus, now: number | null): boolean {
  if (!homeTeamId || !awayTeamId) return true;
  if (status !== 'scheduled') return true;
  if (now !== null && new Date(dateUTC).getTime() <= now) return true;
  return false;
}

/** Match starts within the next 24 h and hasn't started yet. */
function isUpcoming(homeTeamId: string | null, awayTeamId: string | null, dateUTC: string, status: MatchStatus, now: number | null): boolean {
  if (!now || status !== 'scheduled') return false;
  if (!homeTeamId || !awayTeamId) return false;
  const t = new Date(dateUTC).getTime();
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

function TeamCell({
  teamId,
  align,
  placeholder,
}: {
  teamId: string | null;
  align: 'left' | 'right';
  placeholder?: string;
}) {
  const team = teamId ? getTeamById(teamId) : undefined;
  return (
    <span className={`bolao-team ${align === 'right' ? 'is-right' : ''}`}>
      {align === 'left' &&
        (team ? (
          <TeamFlag name={team.name} flagEmoji={team.flag} size={24} style={{ borderRadius: 3 }} />
        ) : (
          <span className="bolao-flag">⏳</span>
        ))}
      <span className="bolao-team-name">{team?.name ?? placeholder ?? 'A definir'}</span>
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
  probabilities = {},
  matchProbabilities = {},
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>(() => vigenteTab(results));
  const [now, setNow] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        <select
          className="bolao-round-select"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabKey)}
          aria-label="Selecionar fase"
        >
          {stageTabs.map((tab) => (
            <option key={tab.key} value={tab.key}>{tab.label}</option>
          ))}
        </select>
        <button
          className="btn btn-gold btn-sm"
          onClick={onAutofill}
          disabled={!canEdit}
          title="Preenche todos os jogos editáveis com placares simulados"
        >
          <Dices size={16} /> Vou na sorte!
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
                const homeTeamId = result?.homeTeamId ?? match.homeTeamId;
                const awayTeamId = result?.awayTeamId ?? match.awayTeamId;
                const locked = isLocked(homeTeamId, awayTeamId, match.dateUTC, status, now) || !canEdit;
                const upcoming = isUpcoming(homeTeamId, awayTeamId, match.dateUTC, status, now);
                const finished = status === 'finished';
                const live = status === 'live';
                const value = values.get(match.id);
                const multiplier = multipliers[match.id] ?? 1;
                const boosted = multiplier > 1;
                const teamA = homeTeamId ? getTeamById(homeTeamId) : null;
                const teamB = awayTeamId ? getTeamById(awayTeamId) : null;
                const isBrazil = homeTeamId === BRAZIL_ID || awayTeamId === BRAZIL_ID;
                const points = pointsByMatch[match.id];
                const hasGuess = value?.home != null && value?.away != null;
                const stadium = getStadiumById(match.stadiumId);
                const canExpand = Boolean(teamA && teamB);
                const isExpanded = expandedId === match.id;

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
                    {/* Tags no topo — centralizadas */}
                    {(boosted || live) && (
                      <div className="bolao-card-tags">
                        {boosted && (
                          <span className="bolao-tag bolao-tag-boost">
                            <Zap size={12} /> {boostLabel(multiplier)}
                          </span>
                        )}
                        {live && <span className="bolao-tag bolao-tag-live">● Ao vivo</span>}
                      </div>
                    )}

                    {/* Placar real em destaque (partida ao vivo ou encerrada) */}
                    {(finished || live) ? (
                      <>
                        <div className="bolao-card-match">
                          <TeamCell teamId={homeTeamId} align="left" placeholder={match.homeTeamPlaceholder} />
                          <div className="bolao-realscores">
                            <span className="bolao-realscore">{result?.homeScore ?? 0}</span>
                            <span className="bolao-x">×</span>
                            <span className="bolao-realscore">{result?.awayScore ?? 0}</span>
                          </div>
                          <TeamCell teamId={awayTeamId} align="right" placeholder={match.awayTeamPlaceholder} />
                        </div>
                        {result?.homePenalties != null && result?.awayPenalties != null && (
                          <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Pênaltis: {result.homePenalties} × {result.awayPenalties}
                          </div>
                        )}

                        {/* Palpite sempre visível depois que o jogo começa
                            (ao vivo ou encerrado), junto do placar real.
                            Encerrada: mensagem de pontuação.
                            Ao vivo: aviso, sem frase de pontuação. */}
                        <div className="bolao-card-feedback">
                          {hasGuess && (
                            <span className="bolao-card-guess">
                              Palpite: {value!.home} × {value!.away}
                            </span>
                          )}
                          {finished ? (
                            <p className={`bolao-feedback-msg ${points ? 'good' : hasGuess ? 'bad' : 'none'}`}>
                              {resultMessage(points, hasGuess, multiplier)}
                            </p>
                          ) : (
                            <p className="bolao-live-notice">
                              Esta partida já começou. Agora é preciso aguardar o apito final!
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Confronto editável (agendado) */}
                        <div className="bolao-card-match">
                          <TeamCell teamId={homeTeamId} align="left" placeholder={match.homeTeamPlaceholder} />
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
                          <TeamCell teamId={awayTeamId} align="right" placeholder={match.awayTeamPlaceholder} />
                        </div>

                        {/* Pênaltis: Só mostra se for mata-mata e o palpite for empate e válido */}
                        {match.stage !== 'group' && value?.home != null && value?.away != null && value.home === value.away && (
                          <div className="bolao-penalties" style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Vencedor dos pênaltis:</p>
                            <select
                              className="bolao-score-input"
                              style={{ width: 'auto', padding: '4px 8px' }}
                              value={value?.penaltyWinnerId ?? ''}
                              disabled={locked}
                              onChange={(e) =>
                                onScore(
                                  match.id,
                                  'penaltyWinner',
                                  e.target.value === '' ? null : e.target.value,
                                )
                              }
                            >
                              <option value="">Selecione...</option>
                              <option value={homeTeamId ?? 'home'}>{homeTeamId ? getTeamById(homeTeamId)?.name : 'Mandante'}</option>
                              <option value={awayTeamId ?? 'away'}>{awayTeamId ? getTeamById(awayTeamId)?.name : 'Visitante'}</option>
                            </select>
                          </div>
                        )}

                        {/* Status: contagem regressiva ou horário */}
                        <div className="bolao-card-status">
                          {upcoming ? (
                            <Countdown targetUTC={match.dateUTC} />
                          ) : (
                            <span className="bolao-match-time">
                              {mounted ? formatKickoffTime(match.dateUTC) : '--:--'}
                            </span>
                          )}
                        </div>
                      </>
                    )}

                    {/* Mesmo conteúdo adicional dos cards da página Jogos:
                        estádio + probabilidades + comparação das seleções. */}
                    {stadium && (
                      <div className="bolao-card-stadium">
                        <MapPin size={12} />
                        <span>{stadium.name}, {stadium.city}</span>
                      </div>
                    )}

                    {canExpand && (
                      <button
                        type="button"
                        className={`bolao-expand-toggle${isExpanded ? ' is-open' : ''}`}
                        onClick={() => setExpandedId((prev) => (prev === match.id ? null : match.id))}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? 'Ocultar detalhes do confronto' : 'Ver detalhes do confronto'}
                      >
                        <ChevronDown size={15} />
                      </button>
                    )}

                    {isExpanded && teamA && teamB && (
                      <div className="match-card-expanded">
                        <div className="match-card-expanded-section">
                          <h4 className="match-card-expanded-title">Probabilidades</h4>
                          <MatchWinBar
                            home={teamA}
                            away={teamB}
                            matchNumber={match.matchNumber}
                            matchProbabilities={matchProbabilities}
                          />
                        </div>

                        <div className="match-card-expanded-section">
                          <h4 className="match-card-expanded-title">Conheça as seleções</h4>
                          <SelecaoCompare home={teamA} away={teamB} probabilities={probabilities} />
                        </div>
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
