import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { teams } from '@/data/teams';

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

/** Calcula a classificação de cada grupo a partir dos jogos finalizados. */
type FinishedMatch = { home_team_id: string; away_team_id: string; home_score: number; away_score: number };

/**
 * Critérios de desempate oficiais da FIFA (Copa 2026), nesta ordem:
 *  1. Pontos          2. Saldo de gols       3. Gols pró   (todos os jogos do grupo)
 *  4. Pontos no confronto direto entre os times empatados
 *  5. Saldo de gols no confronto direto
 *  6. Gols pró no confronto direto
 *  7. Pontuação de fair play (cartões)        8. Sorteio da FIFA
 *
 * Os critérios 7–8 dependem de dados disciplinares que não estão neste
 * dataset (o sync da football-data.org já os aplica na tabela `standings`,
 * que é a fonte primária). Este cálculo de fallback resolve até o critério 6;
 * persistindo o empate, usa o id do time apenas para manter ordem estável.
 */

/** Mini-tabela de confronto direto restrita ao subconjunto de times empatados. */
function headToHead(teamIds: string[], matches: FinishedMatch[]) {
  const set = new Set(teamIds);
  const h2h = new Map(teamIds.map((id) => [id, { pts: 0, gf: 0, ga: 0 }]));
  for (const m of matches) {
    if (!set.has(m.home_team_id) || !set.has(m.away_team_id)) continue;
    const h = h2h.get(m.home_team_id)!;
    const a = h2h.get(m.away_team_id)!;
    h.gf += m.home_score; h.ga += m.away_score;
    a.gf += m.away_score; a.ga += m.home_score;
    if (m.home_score > m.away_score) h.pts += 3;
    else if (m.home_score < m.away_score) a.pts += 3;
    else { h.pts++; a.pts++; }
  }
  return h2h;
}

/**
 * Ordena as linhas de um grupo pelos critérios FIFA. Aplica pts → SG → GP em
 * todos os jogos; para times ainda empatados nos três, aplica confronto direto
 * (pts → SG → GP entre eles).
 */
function rankByFifaCriteria(rows: StandingRow[], matches: FinishedMatch[]): StandingRow[] {
  const tiedOverall = (a: StandingRow, b: StandingRow) =>
    a.points === b.points &&
    a.goal_difference === b.goal_difference &&
    a.goals_for === b.goals_for;

  // 1ª passada: critérios gerais (pts → SG → GP).
  const sorted = [...rows].sort((a, b) =>
    b.points - a.points ||
    b.goal_difference - a.goal_difference ||
    b.goals_for - a.goals_for ||
    0,
  );

  // 2ª passada: desempata blocos de empate por confronto direto.
  const result: StandingRow[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && tiedOverall(sorted[i], sorted[j])) j++;
    const cluster = sorted.slice(i, j);

    if (cluster.length > 1) {
      const h2h = headToHead(cluster.map((r) => r.team_id), matches);
      cluster.sort((a, b) => {
        const ha = h2h.get(a.team_id)!;
        const hb = h2h.get(b.team_id)!;
        return (
          hb.pts - ha.pts ||
          (hb.gf - hb.ga) - (ha.gf - ha.ga) ||
          hb.gf - ha.gf ||
          a.team_id.localeCompare(b.team_id)
        );
      });
    }
    result.push(...cluster);
    i = j;
  }

  return result;
}

function computeStandings(
  finishedMatches: FinishedMatch[],
): Map<GroupId, StandingRow[]> {
  // Acumula estatísticas por time
  const stats = new Map<string, { played: number; won: number; draw: number; lost: number; gf: number; ga: number; pts: number }>();

  const ensure = (id: string) => {
    if (!stats.has(id)) stats.set(id, { played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, pts: 0 });
    return stats.get(id)!;
  };

  for (const m of finishedMatches) {
    const h = ensure(m.home_team_id);
    const a = ensure(m.away_team_id);
    h.played++; a.played++;
    h.gf += m.home_score; h.ga += m.away_score;
    a.gf += m.away_score; a.ga += m.home_score;
    if (m.home_score > m.away_score) { h.won++; h.pts += 3; a.lost++; }
    else if (m.home_score < m.away_score) { a.won++; a.pts += 3; h.lost++; }
    else { h.draw++; h.pts++; a.draw++; a.pts++; }
  }

  // Agrupa por grupo e ordena pelos critérios oficiais FIFA (com confronto direto)
  const byGroup = new Map<GroupId, StandingRow[]>();
  for (const group of allGroups) {
    const groupTeams = teams.filter((t) => t.group === group);
    const rows: StandingRow[] = groupTeams.map((t, i) => {
      const s = stats.get(t.id) ?? { played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
      return {
        team_id: t.id,
        position: i + 1,
        played: s.played, won: s.won, draw: s.draw, lost: s.lost,
        goals_for: s.gf, goals_against: s.ga, goal_difference: s.gf - s.ga, points: s.pts,
      };
    });

    const ranked = rankByFifaCriteria(rows, finishedMatches);
    ranked.forEach((r, i) => { r.position = i + 1; });
    byGroup.set(group, ranked);
  }

  return byGroup;
}

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
        .select('home_team_id, away_team_id, home_score, away_score')
        .eq('status', 'finished')
        .not('home_score', 'is', null)
        .not('away_score', 'is', null);

      // Filtra apenas jogos de fase de grupos (home_team_id pertence a um grupo)
      const groupTeamIds = new Set(teams.map((t) => t.id));
      const groupMatches = (finishedMatches ?? []).filter(
        (m) => groupTeamIds.has(m.home_team_id) && groupTeamIds.has(m.away_team_id),
      );

      standingsByGroup = computeStandings(groupMatches);
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
                      const qualified = standing.position <= 2 && standing.played >= 3;
                      return (
                      <tr key={team.id} className={qualified ? 'qualified' : ''}>
                        <td>
                          <div className="team-cell">
                            <span className="pos">{standing.position}</span>
                            <TeamFlag name={team.name} flagEmoji={team.flag} size={20} />
                            <Link href={`/selecoes/${team.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600 }}>
                              {team.name}
                            </Link>
                            {qualified && (
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
      {(() => {
        // Coleta o 3º de cada grupo com pelo menos 1 jogo disputado.
        const thirds: Array<StandingRow & { groupId: GroupId }> = [];
        for (const g of allGroups) {
          const rows = standingsByGroup.get(g);
          if (!rows) continue;
          const third = rows.find((r) => r.position === 3);
          if (third && third.played > 0) thirds.push({ ...third, groupId: g });
        }

        if (thirds.length === 0) return null;

        // Ordena pelos critérios FIFA para 3ºs colocados (grupos distintos, sem
        // confronto direto): pontos → saldo → gols pró → vitórias → menos
        // derrotas → fair play → sorteio.
        // Fair play/sorteio não são calculáveis aqui (sem dados de cartões);
        // o id do time mantém a ordem estável em empates remanescentes.
        thirds.sort((a, b) =>
          b.points - a.points ||
          b.goal_difference - a.goal_difference ||
          b.goals_for - a.goals_for ||
          b.won - a.won ||
          a.lost - b.lost ||
          a.team_id.localeCompare(b.team_id),
        );

        const qualified = thirds.slice(0, 8);
        const qualifiedTeamIds = new Set(qualified.map((r) => r.team_id));

        return (
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
                      const isQualified = qualifiedTeamIds.has(row.team_id);
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
        );
      })()}
    </div>
  );
}
