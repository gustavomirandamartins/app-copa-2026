'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Trophy, Calendar, BarChart3, Users, ChevronRight, MapPin, Clock } from 'lucide-react';
import { teams, getTeamById } from '@/data/teams';
import { matches } from '@/data/matches';
import { getStadiumById } from '@/data/stadiums';
import { getProbabilitiesByStage, getTeamProbability } from '@/data/ufmg-probabilities';
import { formatKickoffTime, formatKickoffDate } from '@/lib/datetime';

/* ─── Countdown Component ────────────────────────────────── */
function Countdown({ targetDate }: { targetDate: Date }) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    setMounted(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Render a static placeholder during SSR to avoid hydration mismatch
  if (!mounted || !now) {
    return (
      <div className="countdown">
        {['Dias', 'Horas', 'Min', 'Seg'].map((label, i) => (
          <div key={i} className="countdown-item">
            <span className="countdown-value">--</span>
            <span className="countdown-label">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  const diff = targetDate.getTime() - now.getTime();
  const isPast = diff <= 0;

  if (isPast) {
    return (
      <div style={{ textAlign: 'center' }}>
        <span className="countdown-value" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
          🏆 A Copa começou!
        </span>
      </div>
    );
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const items = [
    { value: days, label: 'Dias' },
    { value: hours, label: 'Horas' },
    { value: minutes, label: 'Min' },
    { value: seconds, label: 'Seg' },
  ];

  return (
    <div className="countdown">
      {items.map((item, i) => (
        <div key={i} className="countdown-item">
          <span className="countdown-value">{String(item.value).padStart(2, '0')}</span>
          <span className="countdown-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Client-safe date formatting hook ───────────────────── */
function useFormattedDate(dateUTC: string) {
  const [formatted, setFormatted] = useState({ time: '', date: '' });
  useEffect(() => {
    setFormatted({
      time: formatKickoffTime(dateUTC),
      date: formatKickoffDate(dateUTC, { weekday: 'short', day: 'numeric', month: 'short' }),
    });
  }, [dateUTC]);
  return formatted;
}

/* ─── Match Card Component ───────────────────────────────── */
function MatchCard({ match }: { match: typeof matches[0] }) {
  const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null;
  const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null;
  const stadium = getStadiumById(match.stadiumId);
  const { time: timeStr, date: dateStr } = useFormattedDate(match.dateUTC);

  return (
    <Link href={`/jogos`} style={{ textDecoration: 'none' }}>
      <div className="glass-card match-card">
        <div className="match-card-header">
          {match.group && <span className="badge badge-group">Grupo {match.group}</span>}
          <span>{dateStr}</span>
          {match.status === 'live' && <span className="badge badge-live">● AO VIVO</span>}
          {match.status === 'finished' && <span className="badge badge-finished">ENCERRADO</span>}
        </div>
        <div className="match-card-teams">
          <div className="match-card-team">
            <span className="flag">{home?.flag || '🏳️'}</span>
            <span className="name">{home?.name || match.homeTeamPlaceholder || 'TBD'}</span>
          </div>
          {match.status === 'finished' || match.status === 'live' ? (
            <div className="match-card-score">
              <span>{match.homeGoals ?? 0}</span>
              <span className="separator">×</span>
              <span>{match.awayGoals ?? 0}</span>
            </div>
          ) : (
            <div className="match-card-time">{timeStr || '--:--'}</div>
          )}
          <div className="match-card-team">
            <span className="flag">{away?.flag || '🏳️'}</span>
            <span className="name">{away?.name || match.awayTeamPlaceholder || 'TBD'}</span>
          </div>
        </div>
        {stadium && (
          <div className="match-card-footer">
            <MapPin size={12} />
            <span>{stadium.name}, {stadium.city}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

/* ─── Probability Bar ────────────────────────────────────── */
function ProbBar({ flag, name, value, maxValue, delay = 0 }: {
  flag: string; name: string; value: number; maxValue: number; delay?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const width = mounted ? (value / maxValue) * 100 : 0;

  return (
    <div className="probability-bar-container">
      <div className="probability-bar-info">
        <span className="flag">{flag}</span>
        <span className="name">{name}</span>
      </div>
      <div className="probability-bar-track">
        <div className="probability-bar-fill" style={{ width: `${width}%` }}>
          <span className="probability-bar-value">{value}%</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function HomePage() {
  const openingDate = new Date('2026-06-11T18:00:00Z');

  const upcomingMatches = useMemo(() => {
    const now = new Date();
    return matches
      .filter(m => m.homeTeamId && m.awayTeamId)
      .filter(m => new Date(m.dateUTC) >= now || m.status === 'live')
      .sort((a, b) => new Date(a.dateUTC).getTime() - new Date(b.dateUTC).getTime())
      .slice(0, 4);
  }, []);

  const displayMatches = upcomingMatches.length > 0 ? upcomingMatches : matches.filter(m => m.stage === 'group').slice(0, 4);

  const topFavorites = useMemo(() => {
    return getProbabilitiesByStage('champion').slice(0, 8);
  }, []);

  const maxProb = topFavorites.length > 0 ? topFavorites[0].probability : 5;

  const brasilProb = getTeamProbability('bra');
  const brasilTeam = getTeamById('bra');
  const groupC = teams.filter(t => t.group === 'C');

  const quickLinks = [
    { icon: BarChart3, title: 'Grupos & Classificação', desc: '12 grupos, 48 seleções', href: '/grupos', color: 'var(--green)' },
    { icon: Trophy, title: 'Bolão Premium', desc: 'Dê seus palpites e dispute o ranking', href: '/bolao', color: 'var(--purple)' },
    { icon: Users, title: 'Seleções', desc: 'Todas as 48 seleções', href: '/selecoes', color: 'var(--blue)' },
    { icon: Trophy, title: 'Probabilidades', desc: 'Modelo UFMG', href: '/probabilidades', color: 'var(--gold)' },
  ];

  return (
    <div className="container">
      {/* ── Hero Section ─────────────────────────── */}
      <section className="animate-fade-in" style={{
        textAlign: 'center',
        padding: 'var(--space-2xl) 0 var(--space-xl)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 900,
          marginBottom: 'var(--space-sm)',
          color: '#fff',
          textShadow: '0 2px 24px rgba(0,0,0,0.22), 0 1px 4px rgba(0,0,0,0.18)',
        }}>
          Bolão da Mindu na Copa 2026
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: 'var(--space-xl)', maxWidth: 640, margin: '0 auto var(--space-xl)' }}>
          Seja bem-vindo ao Bolão da Mindu na Copa 2026! Aqui você dará seus palpites para os jogos da Copa!
          Funciona assim: ganha pontos por partida quem acertar o placar, a diferença de gols ou o vencedor.
          Ao final do campeonato, os três primeiros receberão prêmios exclusivos da MinduBier — camisas, bonés,
          kits de cerveja, copos e muito mais! Acompanhe o ranking em tempo real e venha brindar conosco! 🍺
        </p>

        <Countdown targetDate={openingDate} />

        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: 'var(--space-lg)' }}>
          11 de Junho a 19 de Julho · 48 Seleções · 104 Jogos · 16 Estádios · Muita MinduBier!
        </p>

        <div style={{ marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/jogos" className="btn btn-gold">
            <Calendar size={16} /> Ver Jogos
          </Link>
          <Link href="/bolao" className="btn btn-gold">
            <Trophy size={16} /> Entrar no Bolão!
          </Link>
        </div>
      </section>

      {/* ── Jogos ────────────────────────────────── */}
      <section className="animate-slide-up stagger-1" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className="section-header">
          <h2><Calendar size={22} style={{ color: 'var(--gold)' }} /> Próximos Jogos</h2>
          <Link href="/jogos" className="section-link">Ver todos <ChevronRight size={14} /></Link>
        </div>
        <div className="grid-2">
          {displayMatches.map(match => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>

      {/* ── Brasil Tracker ───────────────────────── */}
      {brasilTeam && brasilProb && (
        <section className="animate-slide-up stagger-2" style={{ marginBottom: 'var(--space-2xl)' }}>
          <div className="glass-card-static" style={{
            padding: 'var(--space-lg)',
            borderImage: 'linear-gradient(135deg, var(--gold-dim), var(--gold), var(--gold-dim)) 1',
            borderWidth: '1px',
            borderStyle: 'solid',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '200px',
              height: '200px',
              background: `radial-gradient(circle at top right, ${brasilTeam.primaryColor}15, transparent 70%)`,
              pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <span style={{ fontSize: '3rem' }}>{brasilTeam.flag}</span>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800 }}>{brasilTeam.name}</h3>
                <span className="badge badge-group">Grupo {brasilTeam.group}</span>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: 'var(--gold)' }}>
                  {brasilProb.champion}%
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Chance de título
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              {groupC.map(t => (
                <span key={t.id} style={{
                  padding: '4px 12px',
                  background: t.id === 'bra' ? 'rgba(255, 223, 0, 0.1)' : 'rgba(255,255,255,0.04)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  fontWeight: t.id === 'bra' ? 700 : 400,
                }}>
                  {t.flag} {t.name}
                </span>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
              {[
                { label: '16 Avos', value: brasilProb.roundOf32 },
                { label: 'Oitavas', value: brasilProb.roundOf16 },
                { label: 'Quartas', value: brasilProb.quarterFinal },
              ].map(item => (
                <div key={item.label} style={{
                  padding: '8px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                    {item.value}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Favoritos ────────────────────────────── */}
      <section className="animate-slide-up stagger-3" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className="section-header">
          <h2><Trophy size={22} style={{ color: 'var(--gold)' }} /> Favoritos ao Título</h2>
          <Link href="/probabilidades" className="section-link">Ver todas <ChevronRight size={14} /></Link>
        </div>
        <div className="glass-card-static" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
          {topFavorites.map((item, i) => {
            const team = getTeamById(item.teamId);
            if (!team) return null;
            return (
              <ProbBar
                key={item.teamId}
                flag={team.flag}
                name={team.name}
                value={item.probability}
                maxValue={maxProb}
                delay={i * 80}
              />
            );
          })}
          <div style={{ textAlign: 'right', marginTop: 'var(--space-sm)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
              Fonte: Dept. Matemática — UFMG
            </span>
          </div>
        </div>
      </section>

      {/* ── Quick Links ──────────────────────────── */}
      <section className="animate-slide-up stagger-4" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className="grid-4">
          {quickLinks.map((link, i) => {
            const Icon = link.icon;
            return (
              <Link key={i} href={link.href} style={{ textDecoration: 'none' }}>
                <div className="glass-card" style={{ padding: 'var(--space-lg)', height: '100%' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-md)',
                    background: `${link.color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--space-md)',
                  }}>
                    <Icon size={22} color={link.color} />
                  </div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: 4 }}>{link.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>{link.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
