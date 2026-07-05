'use client';

import { useState, useEffect, ViewTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Calendar, BarChart3 } from 'lucide-react';
import { teams, getTeamById } from '@/data/teams';
import { matches } from '@/data/matches';
import { getStadiumById } from '@/data/stadiums';
import { getKeyPlayer } from '@/data/key-players';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { SquadDropdown } from '@/components/selecoes/SquadDropdown';
import { formatKickoffTime } from '@/lib/datetime';
import { formatPct } from '@/lib/format';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { MatchStatus, UfmgProbability } from '@/lib/types';

interface LiveResult {
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
}

const STORAGE_URL = 'https://sdyilmgixyynnmczsnhc.supabase.co/storage/v1/object/public/backgrounds';
const JERSEYS_URL = 'https://sdyilmgixyynnmczsnhc.supabase.co/storage/v1/object/public/jerseys';

// Bucket file names that differ from the team's id.
const JERSEY_ID_MAP: Record<string, string> = { jpn: 'jap' };

function ClientTime({ dateUTC }: { dateUTC: string }) {
  const [time, setTime] = useState('--:--');
  useEffect(() => {
    setTime(formatKickoffTime(dateUTC));
  }, [dateUTC]);
  return <>{time}</>;
}

interface Props {
  teamId: string;
  prob: UfmgProbability | undefined;
}

export function SelecaoDetailClient({ teamId, prob }: Props) {
  // Resultados ao vivo / encerrados das partidas (atualizam conforme acontecem).
  const [liveResults, setLiveResults] = useState<Record<string, LiveResult>>({});
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let active = true;
    const supabase = createBrowserSupabaseClient();
    const load = async () => {
      const { data } = await supabase
        .from('matches')
        .select('id, status, home_score, away_score');
      if (!active || !data) return;
      const map: Record<string, LiveResult> = {};
      for (const m of data) {
        map[m.id] = {
          status: m.status as MatchStatus,
          homeScore: m.home_score as number | null,
          awayScore: m.away_score as number | null,
        };
      }
      setLiveResults(map);
    };
    load();
    // Re-busca a cada 60 s para refletir jogos em andamento.
    const id = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;

    // Crossfade: captura o background atual num overlay de alta z-index,
    // troca o html.style.backgroundImage por baixo, depois fade-out do overlay.
    // Isso funciona independente do stacking context do conteúdo da página.
    const makeCover = (bgImage: string) => {
      const el = document.createElement('div');
      Object.assign(el.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '9990',
        backgroundImage: bgImage,
        backgroundSize: 'cover',
        backgroundPosition: window.getComputedStyle(html).backgroundPosition,
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        opacity: '1',
        transition: 'opacity 0.75s ease',
        pointerEvents: 'none',
      });
      document.body.appendChild(el);
      return el;
    };

    // Captura bg atual (antes da troca).
    const prevBgImage = window.getComputedStyle(html).backgroundImage;

    // Troca o background do html para o time.
    html.style.backgroundImage = `url('${STORAGE_URL}/bg-${teamId}.avif')`;
    html.style.backgroundPositionY = '0%';
    // Sinaliza que há fundo de seleção ativo: esconde a camada .app-bg
    // (fundo global do mobile) para o fundo do time aparecer.
    html.dataset.teamBg = '1';

    // Overlay mostra o bg antigo; fade-out revela o novo bg abaixo.
    const cover = makeCover(prevBgImage);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      cover.style.opacity = '0';
    }));
    cover.addEventListener('transitionend', () => cover.remove(), { once: true });

    return () => {
      // Saída: overlay com bg do time fade-out enquanto o global volta.
      const teamBgImage = window.getComputedStyle(html).backgroundImage;
      const exitCover = makeCover(teamBgImage);
      html.style.backgroundImage = '';
      delete html.dataset.teamBg;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        exitCover.style.opacity = '0';
      }));
      exitCover.addEventListener('transitionend', () => exitCover.remove(), { once: true });
    };
  }, [teamId]);
  const team = getTeamById(teamId);

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
        color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-lg)',
        textDecoration: 'none',
        background: 'rgba(6,5,16,0.60)',
        backdropFilter: 'blur(12px)',
        padding: '6px 14px 6px 10px',
        borderRadius: '999px',
        border: '1px solid rgba(255,255,255,0.12)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap', position: 'relative' }}>
          {/* Morph compartilhado com o card da lista (/selecoes). SÓ o hero
              leva a name — a bandeira do próprio time repete nas linhas de
              jogos abaixo, e names duplicadas abortam a view transition. */}
          <ViewTransition name={`team-flag-${team.id}`} share="morph">
            <TeamFlag name={team.name} flagEmoji={team.flag} size={72} style={{ borderRadius: 6 }} />
          </ViewTransition>
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
          {/* Uniforme — ao lado, antes da chance de título */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${JERSEYS_URL}/uniforme-${JERSEY_ID_MAP[teamId] ?? teamId}.avif`}
            alt={`Uniforme da seleção ${team.name}`}
            style={{
              height: 96, width: 'auto',
              objectFit: 'contain',
              flexShrink: 0,
              filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.45))',
            }}
          />
          {prob && (
            <div style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{
                fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)',
                background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {formatPct(prob.champion)}%
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
                {keyPlayer ?? `Elenco da ${team.name}`}
              </div>
            </div>
          </div>

          <SquadDropdown teamId={team.id} accentColor={team.secondaryColor} />
        </div>

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
                    {formatPct(s.value)}%
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
                    {(() => {
                      const live = liveResults[match.id];
                      const status = live?.status ?? match.status;
                      if (status === 'finished' || status === 'live') {
                        const isLive = status === 'live';
                        return (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            fontWeight: 800, fontFamily: 'var(--font-heading)',
                            color: isLive ? 'var(--copa-green)' : '#fff',
                            whiteSpace: 'nowrap',
                          }}>
                            {isLive && <span style={{
                              width: 7, height: 7, borderRadius: '50%',
                              background: 'var(--copa-green)', display: 'inline-block',
                            }} />}
                            {live?.homeScore ?? 0} <span style={{ color: 'var(--text-tertiary)' }}>×</span> {live?.awayScore ?? 0}
                          </span>
                        );
                      }
                      return (
                        <span style={{ color: 'var(--gold)', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                          <ClientTime dateUTC={match.dateUTC} />
                        </span>
                      );
                    })()}
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
