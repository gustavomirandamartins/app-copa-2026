'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { teams } from '@/data/teams';
import { getTeamProbability } from '@/data/ufmg-probabilities';
import type { GroupId } from '@/lib/types';

const allGroups: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L'];

export default function GruposPage() {
  const groupedTeams = useMemo(() => {
    const map = new Map<GroupId, typeof teams>();
    allGroups.forEach(g => map.set(g, teams.filter(t => t.group === g)));
    return map;
  }, []);

  return (
    <div className="container">
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="animate-fade-in">
          <BarChart3 size={28} style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }} />
          Grupos
        </h1>
        <p className="animate-fade-in" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          12 grupos · 48 seleções · Top 2 + 8 melhores 3ºs classificam
        </p>
      </section>

      <div className="grid-2" style={{ gap: 'var(--space-lg)' }}>
        {allGroups.map((groupId, gi) => {
          const groupTeams = groupedTeams.get(groupId) || [];
          return (
            <div
              key={groupId}
              className="glass-card-static animate-slide-up"
              style={{
                padding: 0,
                overflow: 'hidden',
                animationDelay: `${gi * 0.04}s`,
                opacity: 0,
              }}
            >
              {/* Group Header */}
              <div style={{
                padding: 'var(--space-md) var(--space-lg)',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span className="badge badge-group" style={{ fontSize: '0.85rem', padding: '5px 14px' }}>
                  Grupo {groupId}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {groupTeams.map(t => (
                    <span key={t.id} style={{ fontSize: '1.2rem' }} title={t.name}>{t.flag}</span>
                  ))}
                </div>
              </div>

              {/* Standings Table */}
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
                    {groupTeams.map((team, pos) => {
                      const prob = getTeamProbability(team.id);
                      return (
                        <tr key={team.id}>
                          <td>
                            <div className="team-cell">
                              <span className="pos">{pos + 1}</span>
                              <span className="flag">{team.flag}</span>
                              <Link href={`/selecoes/${team.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600 }}>
                                {team.name}
                              </Link>
                            </div>
                          </td>
                          <td className="pts">0</td>
                          <td>0</td>
                          <td>0</td>
                          <td>0</td>
                          <td>0</td>
                          <td>0</td>
                          <td>0</td>
                          <td>0</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mini Probability */}
              <div style={{
                padding: 'var(--space-sm) var(--space-lg)',
                borderTop: '1px solid var(--glass-border)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.7rem',
                color: 'var(--text-tertiary)',
              }}>
                {groupTeams.map(t => {
                  const p = getTeamProbability(t.id);
                  return (
                    <span key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {t.flag}
                      <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                        {p?.roundOf32.toFixed(0)}%
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
