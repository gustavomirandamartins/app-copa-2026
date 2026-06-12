import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { teams } from '@/data/teams';
import { getTeamProbability } from '@/data/ufmg-probabilities';
import { TeamFlag } from '@/components/ui/TeamFlag';
import type { GroupId } from '@/lib/types';

export const revalidate = 0;

const allGroups: GroupId[] = ['A','B','C','D','E','F','G','H','I','J','K','L'];

type StandingRow = {
  team_id: string;
  position: number;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};

export default async function GruposPage() {
  // Standings por grupo vindas do Supabase (preenchidas após cada sync).
  const standingsByGroup = new Map<GroupId, StandingRow[]>();

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();
    const { data } = await admin
      .from('standings')
      .select('group_letter, team_id, position, played, won, draw, lost, goals_for, goals_against, goal_difference, points')
      .order('group_letter')
      .order('position');

    for (const row of data ?? []) {
      const g = row.group_letter as GroupId;
      if (!standingsByGroup.has(g)) standingsByGroup.set(g, []);
      standingsByGroup.get(g)!.push(row as StandingRow);
    }
  }

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
          const groupTeams = teams.filter((t) => t.group === groupId);
          const liveStandings = standingsByGroup.get(groupId);

          // Ordena os times pela posição real do Supabase; caso não haja dados
          // ainda, usa a ordem original do arquivo de times.
          const orderedTeams = liveStandings
            ? liveStandings
                .map((s) => ({ standing: s, team: groupTeams.find((t) => t.id === s.team_id) }))
                .filter((r): r is { standing: StandingRow; team: NonNullable<typeof r.team> } => r.team !== undefined)
            : groupTeams.map((team, pos) => ({
                standing: { team_id: team.id, position: pos + 1, played: 0, won: 0, draw: 0, lost: 0, goals_for: 0, goals_against: 0, goal_difference: 0, points: 0 },
                team,
              }));

          return (
            <div
              key={groupId}
              className="glass-card-static animate-slide-up"
              style={{ padding: 0, overflow: 'hidden', animationDelay: `${gi * 0.04}s`, opacity: 0 }}
            >
              <div style={{
                padding: 'var(--space-md) var(--space-lg)',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span className="badge badge-group" style={{ fontSize: '0.85rem', padding: '5px 14px' }}>
                  Grupo {groupId}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {groupTeams.map((t) => (
                    <TeamFlag key={t.id} name={t.name} flagEmoji={t.flag} size={20} style={{ borderRadius: 2 }} />
                  ))}
                </div>
              </div>

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
                    {orderedTeams.map(({ standing, team }, pos) => (
                      <tr key={team.id}>
                        <td>
                          <div className="team-cell">
                            <span className="pos">{standing.position || pos + 1}</span>
                            <TeamFlag name={team.name} flagEmoji={team.flag} size={20} />
                            <Link href={`/selecoes/${team.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600 }}>
                              {team.name}
                            </Link>
                          </div>
                        </td>
                        <td className="pts">{standing.points}</td>
                        <td>{standing.played}</td>
                        <td>{standing.won}</td>
                        <td>{standing.draw}</td>
                        <td>{standing.lost}</td>
                        <td>{standing.goals_for}</td>
                        <td>{standing.goals_against}</td>
                        <td>{standing.goal_difference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{
                padding: 'var(--space-sm) var(--space-lg)',
                borderTop: '1px solid var(--glass-border)',
                display: 'flex', justifyContent: 'space-between',
                fontSize: '0.7rem', color: 'var(--text-tertiary)',
              }}>
                {groupTeams.map((t) => {
                  const p = getTeamProbability(t.id);
                  return (
                    <span key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <TeamFlag name={t.name} flagEmoji={t.flag} size={16} style={{ borderRadius: 2 }} />
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
