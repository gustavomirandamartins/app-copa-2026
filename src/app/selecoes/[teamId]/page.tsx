'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Calendar, MapPin, BarChart3 } from 'lucide-react';
import { teams, getTeamById } from '@/data/teams';
import { matches } from '@/data/matches';
import { getStadiumById } from '@/data/stadiums';
import { getTeamProbability } from '@/data/ufmg-probabilities';
import { getKeyPlayer } from '@/data/key-players';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { formatKickoffTime } from '@/lib/datetime';

function ClientTime({ dateUTC }: { dateUTC: string }) {
  const [time, setTime] = useState('--:--');
  useEffect(() => {
    setTime(formatKickoffTime(dateUTC));
  }, [dateUTC]);
  return <>{time}</>;
}

export default function SelecaoPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  const team = getTeamById(teamId);
  const prob = getTeamProbability(teamId);

  if (!team) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: 'var(--space-3xl) 0' }}>
        <h2>Seleção não encontrada</h2>
        <Link href="/selecoes" className="btn btn-secondary" style={{ marginTop: 'var(--space-md)' }}>
          <ArrowLeft size={16} /> Voltar
        </Link>
      </div>
    );
  }

  const teamMatches = matches.filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId);
  const groupTeams = teams.filter(t => t.group === team.group);
  const keyPlayer = getKeyPlayer(teamId);

  const probStages = prob ? [
    { label: 'Campeão', value: prob.champion },
    { label: 'Final', value: prob.final },
    { label: 'Semifinal', value: prob.semifinal },
    { label: 'Quartas', value: prob.quarterFinal },
    { label: 'Oitavas', value: prob.roundOf16 },
    { label: '16 Avos', value: prob.roundOf32 },
  ] : [];

  return (
    <div className="container">
      {/* Back */}
      <Link href="/selecoes" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)',
        textDecoration: 'none',
      }}>
        <ArrowLeft size={16} /> Seleções
      </Link>

      {/* Hero */}
      <div className="glass-card-static animate-fade-in" style={{
        padding: 'var(--space-xl)',
        marginBottom: 'var(--space-xl)',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: `4px solid ${team.primaryColor}`,
      }}>
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          opacity: 0.06, lineHeight: 1,
        }}>
          <TeamFlag name={team.name} flagEmoji={team.flag} size={160} style={{ borderRadius: 8 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <TeamFlag name={team.name} flagEmoji={team.flag} size={72} style={{ borderRadius: 6 }} />
          <div style={{ flex: 1 }}>
            <h1 style={{ marginBottom: 4 }}>{team.name}</h1>
            <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge badge-group">Grupo {team.group}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                #{team.fifaRanking} FIFA · {team.confederation}
              </span>
              {team.titles > 0 && (
                <span style={{ fontSize: '0.85rem', color: 'var(--gold)' }}>
                  🏆 ×{team.titles}
                </span>
              )}
            </div>
          </div>
          {prob && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)',
                background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {prob.champion}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Chance de título
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-lg)' }}>
        {/* Fique de olho! */}
        {keyPlayer && (
          <div className="glass-card-static animate-fade-in" style={{
            padding: 'var(--space-lg)',
            position: 'relative',
            overflow: 'hidden',
            borderLeft: `4px solid ${team.secondaryColor}`,
          }}>
            <div style={{
              position: 'absolute', top: '-30px', right: '-10px',
              fontSize: '7rem', opacity: 0.06, lineHeight: 1,
            }}>
              👀
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>👀</span>
              <div>
                <div style={{
                  fontSize: '0.7rem', color: 'var(--copa-green)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800,
                  marginBottom: 2,
                }}>
                  Fique de olho!
                </div>
                <div style={{
                  fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)',
                  color: 'var(--text-primary)', lineHeight: 1.1,
                }}>
                  {keyPlayer}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Histórico */}
        <div className="glass-card-static animate-slide-up stagger-1" style={{ padding: 'var(--space-lg)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem' }}>
            <BarChart3 size={18} style={{ color: 'var(--gold)', marginRight: 8, verticalAlign: 'middle' }} />
            Histórico em Copas
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-md)' }}>
            {[
              { label: 'Participações', value: team.appearances },
              { label: 'Títulos', value: team.titles },
              { label: 'Melhor resultado', value: team.bestResult },
            ].map(item => (
              <div key={item.label} style={{ padding: 'var(--space-sm)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: typeof item.value === 'number' ? '1.25rem' : '0.85rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Probabilidades UFMG */}
        {prob && (
          <div className="glass-card-static animate-slide-up stagger-2" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem' }}>
              <Trophy size={18} style={{ color: 'var(--gold)', marginRight: 8, verticalAlign: 'middle' }} />
              Probabilidades UFMG
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 'var(--space-sm)' }}>
              {probStages.map(s => (
                <div key={s.label} style={{
                  padding: 'var(--space-md)',
                  background: s.label === 'Campeão' ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  border: s.label === 'Campeão' ? '1px solid rgba(212,175,55,0.2)' : 'none',
                }}>
                  <div style={{
                    fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)',
                    color: s.label === 'Campeão' ? 'var(--gold)' : 'var(--text-primary)',
                  }}>
                    {s.value}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grupo */}
        <div className="glass-card-static animate-slide-up stagger-3" style={{ padding: 'var(--space-lg)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem' }}>
            Grupo {team.group}
          </h3>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            {groupTeams.map(t => (
              <Link key={t.id} href={`/selecoes/${t.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px',
                background: t.id === team.id ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                fontWeight: t.id === team.id ? 700 : 400,
                fontSize: '0.9rem',
              }}>
                <TeamFlag name={t.name} flagEmoji={t.flag} size={24} style={{ borderRadius: 3 }} /> {t.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Jogos */}
        <div className="glass-card-static animate-slide-up stagger-4" style={{ padding: 'var(--space-lg)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem' }}>
            <Calendar size={18} style={{ color: 'var(--gold)', marginRight: 8, verticalAlign: 'middle' }} />
            Jogos no Torneio
          </h3>
          {teamMatches.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Jogos ainda não definidos.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {teamMatches.map(match => {
                const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null;
                const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null;
                const stadium = getStadiumById(match.stadiumId);
                const d = new Date(match.dateUTC);
                return (
                  <div key={match.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 'var(--radius-sm)',
                    gap: 'var(--space-md)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      {home && <TeamFlag name={home.name} flagEmoji={home.flag} size={20} style={{ borderRadius: 2 }} />}
                      <span style={{ fontWeight: match.homeTeamId === teamId ? 700 : 400, fontSize: '0.85rem' }}>
                        {home?.name || 'TBD'}
                      </span>
                    </div>
                    <span style={{ color: 'var(--gold)', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                      <ClientTime dateUTC={match.dateUTC} />
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
                      <span style={{ fontWeight: match.awayTeamId === teamId ? 700 : 400, fontSize: '0.85rem' }}>
                        {away?.name || 'TBD'}
                      </span>
                      {away && <TeamFlag name={away.name} flagEmoji={away.flag} size={20} style={{ borderRadius: 2 }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
