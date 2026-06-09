'use client';

import { useState, useMemo, useCallback } from 'react';
import { Cpu, Dices, RotateCcw, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { matches } from '@/data/matches';
import { teams, getTeamById } from '@/data/teams';
import { calculateGroupStandings, rankThirdPlaceTeams, getBestThirdPlaceTeams } from '@/lib/simulator';
import type { GroupId, Match } from '@/lib/types';

const allGroups: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L'];

interface ScoreEntry {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="score-input-wrapper">
      <button className="score-input-btn" onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <span className="score-input-value">{value}</span>
      <button className="score-input-btn" onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

export default function SimuladorPage() {
  const groupMatches = useMemo(() => matches.filter(m => m.stage === 'group'), []);

  const [scores, setScores] = useState<Map<string, ScoreEntry>>(() => {
    const map = new Map<string, ScoreEntry>();
    groupMatches.forEach(m => map.set(m.id, { matchId: m.id, homeGoals: 0, awayGoals: 0 }));
    return map;
  });

  const [expandedGroup, setExpandedGroup] = useState<GroupId>('C');

  const updateScore = useCallback((matchId: string, field: 'homeGoals' | 'awayGoals', value: number) => {
    setScores(prev => {
      const next = new Map(prev);
      const entry = next.get(matchId)!;
      next.set(matchId, { ...entry, [field]: value });
      return next;
    });
  }, []);

  // Build simulated matches
  const simulatedMatches = useMemo((): Match[] => {
    return groupMatches.map(m => {
      const s = scores.get(m.id)!;
      return { ...m, homeGoals: s.homeGoals, awayGoals: s.awayGoals, status: 'finished' as const };
    });
  }, [groupMatches, scores]);

  // Calculate standings
  const standings = useMemo(() => calculateGroupStandings(simulatedMatches), [simulatedMatches]);
  const thirdPlaceRanking = useMemo(() => rankThirdPlaceTeams(standings), [standings]);
  const qualifiedThirds = useMemo(() => getBestThirdPlaceTeams(thirdPlaceRanking), [thirdPlaceRanking]);
  const qualifiedThirdIds = useMemo(() => new Set(qualifiedThirds.map(t => t.teamId)), [qualifiedThirds]);

  // Presets
  const resetAll = () => {
    const map = new Map<string, ScoreEntry>();
    groupMatches.forEach(m => map.set(m.id, { matchId: m.id, homeGoals: 0, awayGoals: 0 }));
    setScores(map);
  };

  const randomize = () => {
    const map = new Map<string, ScoreEntry>();
    groupMatches.forEach(m => {
      map.set(m.id, {
        matchId: m.id,
        homeGoals: Math.floor(Math.random() * 5),
        awayGoals: Math.floor(Math.random() * 5),
      });
    });
    setScores(map);
  };

  const favoritesWin = () => {
    const map = new Map<string, ScoreEntry>();
    groupMatches.forEach(m => {
      const home = m.homeTeamId ? getTeamById(m.homeTeamId) : null;
      const away = m.awayTeamId ? getTeamById(m.awayTeamId) : null;
      if (home && away) {
        const homeStronger = home.fifaRanking <= away.fifaRanking;
        map.set(m.id, {
          matchId: m.id,
          homeGoals: homeStronger ? 2 : 0,
          awayGoals: homeStronger ? 0 : 2,
        });
      } else {
        map.set(m.id, { matchId: m.id, homeGoals: 0, awayGoals: 0 });
      }
    });
    setScores(map);
  };

  return (
    <div className="container">
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="animate-fade-in">
          <Cpu size={28} style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }} />
          Simulador de Classificação
        </h1>
        <p className="animate-fade-in" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Insira placares hipotéticos e veja quem classifica em tempo real
        </p>
      </section>

      {/* Preset Buttons */}
      <div className="animate-fade-in" style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={randomize}>
          <Dices size={14} /> Aleatório
        </button>
        <button className="btn btn-secondary btn-sm" onClick={resetAll}>
          <RotateCcw size={14} /> Limpar
        </button>
        <button className="btn btn-secondary btn-sm" onClick={favoritesWin}>
          <Star size={14} /> Favoritos vencem
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-lg)' }}>
        {/* Group Accordions + Standings */}
        {allGroups.map(groupId => {
          const isExpanded = expandedGroup === groupId;
          const groupMatchList = groupMatches.filter(m => m.group === groupId);
          const groupStandings = standings.get(groupId) || [];

          return (
            <div key={groupId} className="glass-card-static animate-slide-up" style={{
              overflow: 'hidden',
              animationDelay: `${allGroups.indexOf(groupId) * 0.03}s`,
              opacity: 0,
            }}>
              {/* Header */}
              <button
                onClick={() => setExpandedGroup(isExpanded ? null! : groupId)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--space-md) var(--space-lg)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-primary)',
                  borderBottom: '1px solid var(--glass-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <span className="badge badge-group" style={{ padding: '5px 14px' }}>Grupo {groupId}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {teams.filter(t => t.group === groupId).map(t => (
                      <span key={t.id} style={{ fontSize: '1.1rem' }}>{t.flag}</span>
                    ))}
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {/* Standings */}
              <div style={{ overflowX: 'auto' }}>
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Seleção</th>
                      <th>P</th>
                      <th>J</th>
                      <th>V</th>
                      <th>E</th>
                      <th>D</th>
                      <th>GP</th>
                      <th>GC</th>
                      <th>SG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStandings.map((st, pos) => {
                      const team = getTeamById(st.teamId);
                      const isQualified = pos < 2;
                      const isThirdQualified = pos === 2 && qualifiedThirdIds.has(st.teamId);
                      return (
                        <tr key={st.teamId} className={isQualified ? 'qualified' : isThirdQualified ? 'maybe-qualified' : pos > 2 ? 'eliminated' : ''}>
                          <td>
                            <div className="team-cell">
                              <span className="pos">{pos + 1}</span>
                              <span className="flag">{team?.flag}</span>
                              <span className="name">{team?.name}</span>
                            </div>
                          </td>
                          <td className="pts">{st.points}</td>
                          <td>{st.played}</td>
                          <td>{st.won}</td>
                          <td>{st.drawn}</td>
                          <td>{st.lost}</td>
                          <td>{st.goalsFor}</td>
                          <td>{st.goalsAgainst}</td>
                          <td>{st.goalDifference}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Match Inputs (expanded) */}
              {isExpanded && (
                <div style={{
                  padding: 'var(--space-md) var(--space-lg)',
                  borderTop: '1px solid var(--glass-border)',
                  display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)',
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Insira os placares
                  </div>
                  {groupMatchList.map(match => {
                    const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null;
                    const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null;
                    const s = scores.get(match.id)!;
                    return (
                      <div key={match.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 'var(--space-sm)', padding: '8px',
                        background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{ flex: 1, textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minWidth: 100 }}>
                          {home?.name || 'TBD'} <span style={{ fontSize: '1.2rem' }}>{home?.flag}</span>
                        </span>
                        <ScoreInput value={s.homeGoals} onChange={v => updateScore(match.id, 'homeGoals', v)} />
                        <span style={{ color: 'var(--text-tertiary)', fontWeight: 700, fontSize: '0.8rem' }}>×</span>
                        <ScoreInput value={s.awayGoals} onChange={v => updateScore(match.id, 'awayGoals', v)} />
                        <span style={{ flex: 1, textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
                          <span style={{ fontSize: '1.2rem' }}>{away?.flag}</span> {away?.name || 'TBD'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Best 3rd place ranking */}
        <div className="glass-card-static animate-slide-up" style={{ padding: 'var(--space-lg)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem', color: 'var(--gold)' }}>
            🏅 Ranking dos 3ºs Colocados (8 melhores classificam)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
            {thirdPlaceRanking.map((st, i) => {
              const team = getTeamById(st.teamId);
              const qualified = i < 8;
              return (
                <div key={st.teamId} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                  padding: '8px 12px',
                  background: qualified ? 'rgba(0,200,83,0.06)' : 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: qualified ? '3px solid var(--green)' : '3px solid transparent',
                  opacity: qualified ? 1 : 0.5,
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: qualified ? 'var(--green)' : 'var(--text-tertiary)', width: 20, textAlign: 'right' }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: '1.2rem' }}>{team?.flag}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{team?.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {st.points}pts · {st.goalDifference > 0 ? '+' : ''}{st.goalDifference}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
