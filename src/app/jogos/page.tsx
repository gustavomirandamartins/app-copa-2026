'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Filter } from 'lucide-react';
import { matches } from '@/data/matches';
import { getTeamById } from '@/data/teams';
import { getStadiumById } from '@/data/stadiums';
import type { MatchStage } from '@/lib/types';

const stageTabs: { key: MatchStage | 'all'; label: string }[] = [
  { key: 'group', label: 'Fase de Grupos' },
  { key: 'round-of-32', label: '16 Avos' },
  { key: 'round-of-16', label: 'Oitavas' },
  { key: 'quarter-final', label: 'Quartas' },
  { key: 'semi-final', label: 'Semifinais' },
  { key: 'final', label: 'Final' },
];

function MatchTime({ dateUTC }: { dateUTC: string }) {
  const [time, setTime] = useState('--:--');
  useEffect(() => {
    setTime(new Date(dateUTC).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  }, [dateUTC]);
  return <div className="match-card-time">{time}</div>;
}

export default function JogosPage() {
  const [activeStage, setActiveStage] = useState<MatchStage | 'all'>('group');

  const filteredMatches = useMemo(() => {
    if (activeStage === 'all') return matches;
    return matches.filter(m => m.stage === activeStage);
  }, [activeStage]);

  // Group by date — deferred to client to avoid hydration mismatch from toLocaleDateString
  const [groupedByDate, setGroupedByDate] = useState<Map<string, typeof matches>>(new Map());
  useEffect(() => {
    const groups = new Map<string, typeof matches>();
    filteredMatches.forEach(m => {
      const d = new Date(m.dateUTC);
      const key = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    });
    setGroupedByDate(groups);
  }, [filteredMatches]);

  return (
    <div className="container">
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="animate-fade-in" style={{ marginBottom: 'var(--space-sm)' }}>
          <Calendar size={28} style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }} />
          Jogos
        </h1>
        <p className="animate-fade-in" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          104 jogos · 11 de Junho a 19 de Julho de 2026
        </p>
      </section>

      {/* Tabs */}
      <div className="tabs animate-fade-in" style={{ marginBottom: 'var(--space-xl)' }}>
        {stageTabs.map(tab => (
          <button
            key={tab.key}
            className={`tab ${activeStage === tab.key ? 'active' : ''}`}
            onClick={() => setActiveStage(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Matches by date */}
      {Array.from(groupedByDate.entries()).map(([dateLabel, dayMatches]) => (
        <section key={dateLabel} className="animate-slide-up" style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'capitalize',
            marginBottom: 'var(--space-md)',
            paddingBottom: 'var(--space-sm)',
            borderBottom: '1px solid var(--glass-border)',
          }}>
            {dateLabel}
          </h3>
          <div className="grid-2">
            {dayMatches.map(match => {
              const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null;
              const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null;
              const stadium = getStadiumById(match.stadiumId);
              const time = '';
              // Time will be formatted client-side in the JSX below

              return (
                <div key={match.id} className="glass-card match-card">
                  <div className="match-card-header">
                    {match.group && <span className="badge badge-group">Grupo {match.group}</span>}
                    <span>Jogo #{match.matchNumber}</span>
                  </div>
                  <div className="match-card-teams">
                    <div className="match-card-team">
                      <span className="flag">{home?.flag || '🏳️'}</span>
                      <span className="name">{home?.name || match.homeTeamPlaceholder || 'A definir'}</span>
                    </div>
                    {match.status === 'finished' ? (
                      <div className="match-card-score">
                        <span>{match.homeGoals}</span>
                        <span className="separator">×</span>
                        <span>{match.awayGoals}</span>
                      </div>
                    ) : (
                      <MatchTime dateUTC={match.dateUTC} />
                    )}
                    <div className="match-card-team">
                      <span className="flag">{away?.flag || '🏳️'}</span>
                      <span className="name">{away?.name || match.awayTeamPlaceholder || 'A definir'}</span>
                    </div>
                  </div>
                  {stadium && (
                    <div className="match-card-footer">
                      <MapPin size={12} />
                      <span>{stadium.name}, {stadium.city}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {filteredMatches.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl) 0', color: 'var(--text-tertiary)' }}>
          <Calendar size={48} style={{ opacity: 0.3, marginBottom: 'var(--space-md)' }} />
          <p>Nenhum jogo nesta fase ainda.</p>
        </div>
      )}
    </div>
  );
}
