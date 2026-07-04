import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { teams } from '@/data/teams';
import {
  allGroups,
  computeStandings,
  computeQualifiedThirds,
  groupStageMatchIds,
  type StandingRow,
} from '@/lib/bolao/standings';

import { TeamFlag } from '@/components/ui/TeamFlag';
import type { GroupId } from '@/lib/types';

export const revalidate = 0;

export default async function GruposPage() {
  let standingsByGroup = new Map<GroupId, StandingRow[]>();

  if (isSupabaseConfigured()) {
    const admin = createAdminClient();

    // Tenta ler da tabela standings (populada pelo sync via football-data API).
    const { data: dbStandings } = await admin
      .from('standings')
      .select('group_letter, team_id, position, played, won, draw, lost, goals_for, goals_against, goal_difference, points')
      .order('group_letter')
      .order('position');

    if (dbStandings && dbStandings.length > 0) {
      // Tabela standings tem dados → usa diretamente
      for (const row of dbStandings) {
        // Normaliza "Group A" → "A" e "GROUP_A" → "A"
        const g = row.group_letter.replace(/^group[_ ]?/i, '').trim() as GroupId;
        if (!standingsByGroup.has(g)) standingsByGroup.set(g, []);
        standingsByGroup.get(g)!.push(row as StandingRow);
      }
    } else {
      // Fallback: calcula a partir dos jogos finalizados da fase de grupos
      const { data: finishedMatches } = await admin
        .from('matches')
        .select('id, home_team_id, away_team_id, home_score, away_score')
        .eq('status', 'finished')
        .not('home_score', 'is', null)
        .not('away_score', 'is', null);

      // Filtra apenas jogos de fase de grupos pelo id (times dos dois lados
      // sempre pertencem ao conjunto dos 48 — isso não distingue mata-mata).
      const groupMatches = (finishedMatches ?? []).filter((m) => groupStageMatchIds.has(m.id));

      standingsByGroup = computeStandings(groupMatches);
    }
  }

  // Calcula os melhores terceiros ANTES de renderizar as tabelas de cada
  // grupo, para poder destacar a linha do 3º colocado já nessa tabela (e não
  // só na tabela consolidada do rodapé).
  const thirds = computeQualifiedThirds(standingsByGroup);
  const qualifiedThirdTeamIds = new Set(thirds.map((r) => r.team_id));

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
              style={{ padding: 0, overflow: 'hidden', animationDelay: `${gi * 0.04}s` }}
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
                    {orderedTeams.map(({ standing, team }) => {
                      const isTop2 = standing.position <= 2 && standing.played >= 3;
                      const isQualifiedThird = standing.position === 3 && qualifiedThirdTeamIds.has(team.id);
                      const qualified = isTop2 || isQualifiedThird;
                      // O badge de texto só aparece quando os 12 grupos já têm 3º
                      // colocado decidido — antes disso, o top-8 ainda pode mudar.
                      const showBadge = isTop2 || (isQualifiedThird && thirds.length === 12);
                      return (
                      <tr key={team.id} className={qualified ? 'qualified' : ''}>
                        <td>
                          <div className="team-cell">
                            <span className="pos">{standing.position}</span>
                            <TeamFlag name={team.name} flagEmoji={team.flag} size={20} />
                            <Link href={`/selecoes/${team.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600 }}>
                              {team.name}
                            </Link>
                            {showBadge && (
                              <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 999, background: 'rgba(0,200,83,0.15)', color: 'var(--copa-green)', fontWeight: 700, marginLeft: 4 }}>
                                Classificado
                              </span>
                            )}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Melhores terceiros colocados ───────────────────────────────── */}
      {thirds.length > 0 && (
        <section style={{ marginTop: 'var(--space-2xl)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-xs)' }}>
            Melhores terceiros colocados
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            Os 8 melhores 3ºs colocados avançam para os 16 avos de final. Critérios: pontos → saldo de gols → gols pró → fair play.
            {thirds.length < 12 && ` (${12 - thirds.length} grupo${12 - thirds.length > 1 ? 's' : ''} ainda sem 3º colocado)`}
          </p>
          <div className="glass-card-static" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="standings-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>#</th>
                    <th style={{ textAlign: 'left' }}>Seleção</th>
                    <th>Grp</th>
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
                  {thirds.map((row, i) => {
                    const team = teams.find((t) => t.id === row.team_id);
                    if (!team) return null;
                    const isQualified = qualifiedThirdTeamIds.has(row.team_id);
                    return (
                      <tr key={row.team_id} className={isQualified ? 'qualified' : ''}>
                        <td style={{ fontWeight: 700, paddingRight: 4 }}>{i + 1}</td>
                        <td>
                          <div className="team-cell">
                            <TeamFlag name={team.name} flagEmoji={team.flag} size={20} />
                            <Link href={`/selecoes/${team.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600 }}>
                              {team.name}
                            </Link>
                            {isQualified && thirds.length === 12 && (
                              <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 999, background: 'rgba(0,200,83,0.15)', color: 'var(--copa-green)', fontWeight: 700, marginLeft: 4 }}>
                                Classificado
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{row.groupId}</td>
                        <td className="pts">{row.points}</td>
                        <td>{row.played}</td>
                        <td>{row.won}</td>
                        <td>{row.draw}</td>
                        <td>{row.lost}</td>
                        <td>{row.goals_for}</td>
                        <td>{row.goals_against}</td>
                        <td>{row.goal_difference}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
