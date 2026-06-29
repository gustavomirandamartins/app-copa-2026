'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { getTeamById } from '@/data/teams';
import { getStadiumById } from '@/data/stadiums';
import { TeamFlag } from '@/components/ui/TeamFlag';
import type { Match, MatchStage } from '@/lib/types';
import { formatKickoffTime, formatKickoffDate } from '@/lib/datetime';
import { Bracket } from './Bracket';

const stageTabs: { key: MatchStage | 'all' | 'bracket'; label: string }[] = [
  { key: 'group', label: 'Fase de Grupos' },
  { key: 'round-of-32', label: '16 Avos' },
  { key: 'round-of-16', label: 'Oitavas' },
  { key: 'quarter-final', label: 'Quartas' },
  { key: 'semi-final', label: 'Semifinais' },
  { key: 'final', label: 'Final' },
  { key: 'bracket', label: 'Chaveamento' },
];

function MatchTimeChip({ dateUTC }: { dateUTC: string }) {
  const [time, setTime] = useState('--:--');
  useEffect(() => {
    setTime(formatKickoffTime(dateUTC));
  }, [dateUTC]);
  return <span className="match-card-time-chip">{time}</span>;
}

export function JogosClient({ matches }: { matches: Match[] }) {
  const [activeStage, setActiveStage] = useState<MatchStage | 'all' | 'bracket'>('round-of-32');

  const filteredMatches = useMemo(() => {
    if (activeStage === 'bracket') return []; // Bracket handles its own filtering
    const list = activeStage === 'all' ? matches : matches.filter((m) => m.stage === activeStage);
    // Ordena por horário de início (a ordem do array pode não ser cronológica).
    return [...list].sort(
      (a, b) => new Date(a.dateUTC).getTime() - new Date(b.dateUTC).getTime(),
    );
  }, [activeStage, matches]);

  const [groupedByDate, setGroupedByDate] = useState<Map<string, Match[]>>(new Map());
  useEffect(() => {
    const groups = new Map<string, Match[]>();
    filteredMatches.forEach((m) => {
      const key = formatKickoffDate(m.dateUTC);
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

      <div className="tabs animate-fade-in" style={{ marginBottom: 'var(--space-xl)' }}>
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

      {activeStage === 'bracket' ? (
        <Bracket matches={matches} />
      ) : (
        <>
          {Array.from(groupedByDate.entries()).map(([dateLabel, dayMatches]) => (
        <section key={dateLabel} className="animate-slide-up" style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{
            fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'capitalize', marginBottom: 'var(--space-md)',
            paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--glass-border)',
          }}>
            {dateLabel}
          </h3>
          <div className="grid-2">
            {dayMatches.map((match) => {
              const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null;
              const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null;
              const stadium = getStadiumById(match.stadiumId);
              return (
                <div key={match.id} className="glass-card match-card">
                  <div className="match-card-header">
                    {match.group && <span className="badge badge-group">Grupo {match.group}</span>}
                    <span>
                      Jogo #{match.matchNumber}
                      {match.status === 'live' && (
                        <span className="match-live-dot"> ● AO VIVO</span>
                      )}
                    </span>
                    <MatchTimeChip dateUTC={match.dateUTC} />
                  </div>
                  <div className="match-card-teams">
                    <div className="match-card-team">
                      {home ? (
                        <Link href={`/selecoes/${match.homeTeamId}`} style={{ display: 'contents', textDecoration: 'none', color: 'inherit' }}>
                          <TeamFlag name={home.name} flagEmoji={home.flag} size={40} />
                          <span className="name">{home.name}</span>
                        </Link>
                      ) : (
                        <>
                          <span className="flag">🏳️</span>
                          <span className="name">{match.homeTeamPlaceholder || 'A definir'}</span>
                        </>
                      )}
                    </div>
                    {match.status === 'finished' ? (
                      <div className="match-card-score">
                        <span>{match.homeGoals}</span>
                        <span className="separator">×</span>
                        <span>{match.awayGoals}</span>
                      </div>
                    ) : match.status === 'live' ? (
                      <div className="match-card-score" style={{ color: 'var(--copa-green)' }}>
                        <span>{match.homeGoals ?? 0}</span>
                        <span className="separator">×</span>
                        <span>{match.awayGoals ?? 0}</span>
                      </div>
                    ) : (
                      <div className="match-card-score match-card-score-vs">
                        <span className="separator">×</span>
                      </div>
                    )}
                    <div className="match-card-team">
                      {away ? (
                        <Link href={`/selecoes/${match.awayTeamId}`} style={{ display: 'contents', textDecoration: 'none', color: 'inherit' }}>
                          <TeamFlag name={away.name} flagEmoji={away.flag} size={40} />
                          <span className="name">{away.name}</span>
                        </Link>
                      ) : (
                        <>
                          <span className="flag">🏳️</span>
                          <span className="name">{match.awayTeamPlaceholder || 'A definir'}</span>
                        </>
                      )}
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
        </>
      )}
    </div>
  );
}
