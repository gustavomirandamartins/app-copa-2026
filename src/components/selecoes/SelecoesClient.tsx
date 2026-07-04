'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Users, Search, Trophy } from 'lucide-react';
import { teams } from '@/data/teams';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { formatPct } from '@/lib/format';
import type { Confederation, UfmgProbability } from '@/lib/types';

const confTabs: { key: Confederation | 'all'; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'UEFA', label: 'UEFA' },
  { key: 'CONMEBOL', label: 'CONMEBOL' },
  { key: 'CONCACAF', label: 'CONCACAF' },
  { key: 'CAF', label: 'CAF' },
  { key: 'AFC', label: 'AFC' },
  { key: 'OFC', label: 'OFC' },
];

interface Props {
  probabilities: Record<string, UfmgProbability>;
  eliminatedTeamIds: string[];
}

export function SelecoesClient({ probabilities, eliminatedTeamIds }: Props) {
  const [search, setSearch] = useState('');
  const [conf, setConf] = useState<Confederation | 'all'>('all');
  const eliminatedSet = useMemo(() => new Set(eliminatedTeamIds), [eliminatedTeamIds]);

  const filtered = useMemo(() => {
    return teams
      .filter(t => {
        const matchSearch = search === '' || t.name.toLowerCase().includes(search.toLowerCase()) || t.nameEn.toLowerCase().includes(search.toLowerCase());
        const matchConf = conf === 'all' || t.confederation === conf;
        return matchSearch && matchConf;
      })
      .sort((a, b) => a.group.localeCompare(b.group));
  }, [search, conf]);

  return (
    <div className="container">
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="animate-fade-in">
          <Users size={28} style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }} />
          Seleções
        </h1>
        <p className="animate-fade-in" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          48 seleções de 6 confederações
        </p>
      </section>

      {/* Search */}
      <div className="search-wrapper animate-fade-in" style={{ marginBottom: 'var(--space-md)' }}>
        <Search size={18} />
        <input
          type="text"
          className="search-input"
          placeholder="Buscar seleção..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Confederation Tabs */}
      <div className="tabs animate-fade-in" style={{ marginBottom: 'var(--space-xl)' }}>
        {confTabs.map(tab => (
          <button
            key={tab.key}
            className={`tab ${conf === tab.key ? 'active' : ''}`}
            onClick={() => setConf(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Teams Grid */}
      <div className="grid-4">
        {filtered.map((team, i) => {
          const prob = probabilities[team.id];
          const eliminated = eliminatedSet.has(team.id);
          return (
            <Link key={team.id} href={`/selecoes/${team.id}`} style={{ textDecoration: 'none' }}>
              <div
                className={`glass-card animate-slide-up${eliminated ? ' team-card-eliminated' : ''}`}
                style={{
                  padding: 'var(--space-lg)',
                  borderLeft: `3px solid ${team.primaryColor}`,
                  height: '100%',
                  animationDelay: `${Math.min(i * 0.03, 0.5)}s`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                  <TeamFlag name={team.name} flagEmoji={team.flag} size={40} style={{ borderRadius: 4 }} />
                  <span className="badge badge-group">Grupo {team.group}</span>
                </div>
                <h4 style={{ fontSize: '1rem', marginBottom: 4 }}>{team.name}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    #{team.fifaRanking} FIFA
                  </span>
                  {team.titles > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--gold)' }}>
                      🏆 ×{team.titles}
                    </span>
                  )}
                </div>
                {prob && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginTop: 'var(--space-sm)',
                    paddingTop: 'var(--space-sm)',
                    borderTop: '1px solid var(--glass-border)',
                  }}>
                    <Trophy size={12} color="var(--gold)" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Chance de título: <strong style={{ color: 'var(--gold)' }}>{formatPct(prob.champion)}%</strong>
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl) 0', color: 'var(--text-tertiary)' }}>
          <Users size={48} style={{ opacity: 0.3, marginBottom: 'var(--space-md)' }} />
          <p>Nenhuma seleção encontrada.</p>
        </div>
      )}
    </div>
  );
}
