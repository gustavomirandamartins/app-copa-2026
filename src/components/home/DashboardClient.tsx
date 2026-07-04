'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Beer, Save, Loader2, Lock, CalendarClock, Sparkles } from 'lucide-react';
import { matches as allMatches } from '@/data/matches';
import { getTeamById } from '@/data/teams';
import { getStadiumById } from '@/data/stadiums';
import { savePredictions } from '@/app/bolao/actions';
import { formatKickoffDate, formatKickoffTime } from '@/lib/datetime';
import { winDrawWin, toPercentParts } from '@/lib/bolao/winProbability';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { SelecaoCompare } from '@/components/home/SelecaoCompare';
import { RankingConsentModal } from '@/components/bolao/RankingConsentModal';
import type { Match, UfmgProbability } from '@/lib/types';
import type { Profile, PredictionInput } from '@/lib/bolao/types';
import type { MatchResult } from '@/components/bolao/BolaoClient';
import type { MatchWinProbability } from '@/lib/bolao/probabilities';

/** WhatsApp da MinduBier — harmonização / pedido de chopp. */
const WHATSAPP_URL =
  'https://wa.me/5571985120466?text=' +
  encodeURIComponent(
    'Estou entrando através do site da Mindu! O que tem de cervejas da MinduBier?',
  );

type Value = { home: number | null; away: number | null; penaltyWinnerId: string | null; autofilled: boolean };

interface Props {
  profile: Profile;
  existingPredictions: PredictionInput[];
  multipliers: Record<string, number>;
  results: Record<string, MatchResult>;
  /** Probabilidades por seleção (tabela + fallback estático). */
  probabilities: Record<string, UfmgProbability>;
  /** Probabilidades V-E-D por jogo (tabela match_probabilities), quando o admin já preencheu. */
  matchProbabilities?: Record<number, MatchWinProbability>;
  /** Quantos jogos mostrar na lista "Próximos jogos" (fora o destaque). */
  upcomingCount?: number;
}

function seed(existing: PredictionInput[]): Map<string, Value> {
  const m = new Map<string, Value>();
  for (const p of existing) {
    m.set(p.match_id, {
      home: p.home_score_guess,
      away: p.away_score_guess,
      penaltyWinnerId: p.penalty_winner_id ?? null,
      autofilled: p.is_autofilled,
    });
  }
  return m;
}

/** Contagem regressiva viva no formato HH:MM:SS (ou Nd HH:MM:SS). */
function useCountdown(targetUTC: string): string | null {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(new Date(targetUTC).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetUTC]);
  if (ms === null) return null;
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return d > 0 ? `${d}d ${hms}` : hms;
}

export function DashboardClient({
  profile,
  existingPredictions,
  multipliers,
  results,
  probabilities,
  matchProbabilities,
  upcomingCount = 6,
}: Props) {
  const [values, setValues] = useState<Map<string, Value>>(() => seed(existingPredictions));
  const [agreed, setAgreed] = useState(profile.agreed_to_ranking ?? false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const canEdit = profile.is_premium === true && agreed;

  // Jogos ainda abertos (não começaram nem encerraram), em ordem cronológica.
  // homeTeamId/awayTeamId vêm mesclados com o banco: o array estático
  // `matches` tem null pra todo jogo de mata-mata até o próximo deploy —
  // quem resolve isso em tempo real é o applyKnockoutAdvancement() do sync,
  // gravado direto na tabela `matches` do Supabase (results aqui).
  const openMatches = useMemo(() => {
    const now = Date.now();
    return allMatches
      .map((mt) => ({
        ...mt,
        homeTeamId: results[mt.id]?.homeTeamId ?? mt.homeTeamId,
        awayTeamId: results[mt.id]?.awayTeamId ?? mt.awayTeamId,
      }))
      .filter((mt) => {
        if (!mt.homeTeamId || !mt.awayTeamId) return false;
        const status = results[mt.id]?.status ?? mt.status;
        if (status !== 'scheduled') return false;
        return new Date(mt.dateUTC).getTime() > now;
      })
      .sort((a, b) => new Date(a.dateUTC).getTime() - new Date(b.dateUTC).getTime());
  }, [results]);

  const featured = openMatches[0];
  const upcoming = openMatches.slice(1, 1 + upcomingCount);

  function setScore(matchId: string, side: 'home' | 'away' | 'pen', raw: number | string | null) {
    setValues((prev) => {
      const next = new Map(prev);
      const cur = next.get(matchId) ?? { home: null, away: null, penaltyWinnerId: null, autofilled: false };
      const v: Value = { ...cur, autofilled: false };
      if (side === 'pen') v.penaltyWinnerId = (raw as string) || null;
      else v[side] = raw === '' || raw === null ? null : Number(raw);
      if (side !== 'pen' && v.home !== v.away) v.penaltyWinnerId = null;
      next.set(matchId, v);
      return next;
    });
  }

  const payload = useMemo<PredictionInput[]>(() => {
    const out: PredictionInput[] = [];
    for (const [match_id, v] of values) {
      if (v.home === null || v.away === null) continue;
      out.push({
        match_id,
        home_score_guess: v.home,
        away_score_guess: v.away,
        penalty_winner_id: v.penaltyWinnerId,
        is_autofilled: v.autofilled,
      });
    }
    return out;
  }, [values]);

  function handleSave() {
    setMessage(null);
    for (const [matchId, v] of values) {
      if (v.home === null || v.away === null) continue;
      const mt = allMatches.find((x) => x.id === matchId);
      if (mt && mt.stage !== 'group' && v.home === v.away && !v.penaltyWinnerId) {
        setMessage('Selecione quem vence nos pênaltis nos mata-matas empatados.');
        return;
      }
    }
    startTransition(async () => {
      const res = await savePredictions(payload);
      setMessage(res.ok ? 'Palpites salvos! 🍺' : res.error ?? 'Erro ao salvar.');
    });
  }

  const countdown = useCountdown(featured?.dateUTC ?? new Date().toISOString());

  if (!featured) {
    return (
      <div className="nx-card nx-empty">
        <CalendarClock size={26} />
        <p>Sem jogos abertos para palpitar agora. Volte quando a próxima rodada abrir!</p>
      </div>
    );
  }

  const fHome = getTeamById(featured.homeTeamId!);
  const fAway = getTeamById(featured.awayTeamId!);
  const fStadium = getStadiumById(featured.stadiumId);
  const fMult = multipliers[featured.id] ?? 1;
  const fVal = values.get(featured.id);
  // Prioriza a planilha do admin (match_probabilities); sem ela, cai na
  // estimativa por ranking FIFA.
  const featuredProb = matchProbabilities?.[featured.matchNumber];
  const wdw = featuredProb
    ? { home: Math.round(featuredProb.home), draw: Math.round(featuredProb.draw), away: Math.round(featuredProb.away) }
    : fHome && fAway
      ? toPercentParts(winDrawWin(fHome.fifaRanking, fAway.fifaRanking))
      : null;

  return (
    <>
      {profile.is_premium && !agreed && <RankingConsentModal onAccepted={() => setAgreed(true)} />}

      {/* ════ CARD PRINCIPAL — próximo jogo em destaque ════ */}
      <section className="nx-card nx-feature" aria-label="Próximo jogo">
        <header className="nx-feature-head">
          <span className="nx-pill">
            <Sparkles size={13} /> Próximo jogo
            {fMult > 1 && <em className="nx-pill-boost">{fMult}× pontos</em>}
          </span>
          <p className="nx-countdown-msg">
            O próximo jogo começa em <strong className="nx-countdown">{mounted ? countdown : '--:--:--'}</strong>!
            Não esqueça de salvar seu palpite e colocar sua MinduBier na geladeira!
          </p>
        </header>

        <div className="nx-match">
          <div className="nx-team nx-team-home">
            {fHome && <TeamFlag name={fHome.name} flagEmoji={fHome.flag} size={72} className="nx-hero-flag" />}
            <span className="nx-team-name">{fHome?.name}</span>
          </div>

          <div className="nx-score">
            <input
              type="number" min={0} max={20} inputMode="numeric"
              className="nx-score-input" aria-label={`Gols ${fHome?.name}`}
              disabled={!canEdit}
              value={fVal?.home ?? ''}
              onChange={(e) => setScore(featured.id, 'home', e.target.value)}
            />
            <span className="nx-score-x">×</span>
            <input
              type="number" min={0} max={20} inputMode="numeric"
              className="nx-score-input" aria-label={`Gols ${fAway?.name}`}
              disabled={!canEdit}
              value={fVal?.away ?? ''}
              onChange={(e) => setScore(featured.id, 'away', e.target.value)}
            />
          </div>

          <div className="nx-team nx-team-away">
            {fAway && <TeamFlag name={fAway.name} flagEmoji={fAway.flag} size={72} className="nx-hero-flag" />}
            <span className="nx-team-name">{fAway?.name}</span>
          </div>
        </div>

        {/* Pênaltis: Só mostra se for mata-mata e o palpite for empate */}
        {featured.stage !== 'group' && fVal?.home != null && fVal?.away != null && fVal.home === fVal.away && (
          <div className="bolao-penalties" style={{ marginTop: '0.5rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Vencedor dos pênaltis:</p>
            <select
              className="nx-score-input"
              style={{ width: 'auto', height: 'auto', padding: '6px 12px', fontSize: '1rem', background: '#fff', color: '#000' }}
              value={fVal?.penaltyWinnerId ?? ''}
              disabled={!canEdit}
              onChange={(e) => setScore(featured.id, 'pen', e.target.value)}
            >
              <option value="">Selecione...</option>
              {fHome && <option value={fHome.id}>{fHome.name}</option>}
              {fAway && <option value={fAway.id}>{fAway.name}</option>}
            </select>
          </div>
        )}

        <p className="nx-match-meta">
          {mounted ? formatKickoffDate(featured.dateUTC) : ''} · {mounted ? formatKickoffTime(featured.dateUTC) : '--:--'}
          {fStadium && <> · {fStadium.name}, {fStadium.city}</>}
        </p>

        {/* Harmonização / chopp */}
        <a className="nx-beer" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
          <Beer size={18} />
          <span>Esse jogo harmoniza com <strong>MinduIPA</strong>! Peça seu chopp aqui!</span>
        </a>

        {/* Barra Vitória — Empate — Vitória */}
        {wdw && (
          <div className="nx-wdw">
            <div className="nx-wdw-bar" role="img" aria-label={`Probabilidade: ${fHome?.name} ${wdw.home}%, empate ${wdw.draw}%, ${fAway?.name} ${wdw.away}%`}>
              <span className="nx-wdw-seg nx-wdw-home" style={{ width: `${wdw.home}%` }}>{wdw.home >= 12 && `${wdw.home}%`}</span>
              <span className="nx-wdw-seg nx-wdw-draw" style={{ width: `${wdw.draw}%` }}>{wdw.draw >= 12 && `${wdw.draw}%`}</span>
              <span className="nx-wdw-seg nx-wdw-away" style={{ width: `${wdw.away}%` }}>{wdw.away >= 12 && `${wdw.away}%`}</span>
            </div>
            <div className="nx-wdw-legend">
              <span><i className="nx-dot nx-dot-home" /> Vitória {fHome?.name}</span>
              <span><i className="nx-dot nx-dot-draw" /> Empate</span>
              <span><i className="nx-dot nx-dot-away" /> Vitória {fAway?.name}</span>
            </div>
          </div>
        )}
      </section>

      {/* ════ CARD SECUNDÁRIO — seleções do confronto em destaque ════ */}
      {fHome && fAway && (
        <section className="nx-section" aria-label="Seleções do próximo jogo">
          <h2 className="nx-h2"><Sparkles size={18} /> Conheça as seleções</h2>
          <SelecaoCompare home={fHome} away={fAway} probabilities={probabilities} />
        </section>
      )}

      {/* ════ PRÓXIMOS JOGOS — palpite + contagem, sem detalhes ════ */}
      {upcoming.length > 0 && (
        <section className="nx-section" aria-label="Próximos jogos">
          <h2 className="nx-h2"><CalendarClock size={18} /> Próximos jogos</h2>
          <div className="nx-upcoming">
            {upcoming.map((mt) => (
              <UpcomingRow
                key={mt.id}
                match={mt}
                value={values.get(mt.id)}
                canEdit={canEdit}
                multiplier={multipliers[mt.id] ?? 1}
                onScore={setScore}
                mounted={mounted}
              />
            ))}
          </div>
        </section>
      )}

      {/* Barra de salvar — fixa ao fluxo */}
      <div className="nx-savebar">
        {message && <span className="nx-save-msg">{message}</span>}
        <button className="btn btn-gold nx-save-btn" onClick={handleSave} disabled={pending || payload.length === 0}>
          {pending ? <Loader2 size={16} className="nx-spin" /> : <Save size={16} />}
          {pending ? 'Salvando…' : 'Salvar palpites'}
          {payload.length > 0 && <span className="nx-save-count">{payload.length}</span>}
        </button>
      </div>
    </>
  );
}

function UpcomingRow({
  match, value, canEdit, multiplier, onScore, mounted,
}: {
  match: Match;
  value: Value | undefined;
  canEdit: boolean;
  multiplier: number;
  onScore: (id: string, side: 'home' | 'away' | 'pen', v: string) => void;
  mounted: boolean;
}) {
  const home = getTeamById(match.homeTeamId!);
  const away = getTeamById(match.awayTeamId!);
  const stadium = getStadiumById(match.stadiumId);
  const cd = useCountdown(match.dateUTC);
  return (
    <div className="nx-up-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px', borderRadius: '18px', background: 'rgba(8, 6, 18, 0.30)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.72)', fontWeight: 600 }}>
        <span>Começa em {mounted && cd ? cd : '—'}</span>
        <span>{mounted ? formatKickoffDate(match.dateUTC) : ''} · {mounted ? formatKickoffTime(match.dateUTC) : ''}{stadium ? ` · ${stadium.name}, ${stadium.city}` : ''}</span>
      </div>
      <div className="nx-up-row" style={{ padding: 0, border: 'none', background: 'none', backdropFilter: 'none' }}>
        <span className="nx-up-team nx-up-home">
          <span className="nx-up-name">{home?.name}</span>
          {home && <TeamFlag name={home.name} flagEmoji={home.flag} size={22} />}
        </span>
        <span className="nx-up-scores">
          <input
            type="number" min={0} max={20} inputMode="numeric" className="nx-up-input"
            aria-label={`Gols ${home?.name}`} disabled={!canEdit}
            value={value?.home ?? ''} onChange={(e) => onScore(match.id, 'home', e.target.value)}
          />
          <span className="nx-up-x">×</span>
          <input
            type="number" min={0} max={20} inputMode="numeric" className="nx-up-input"
            aria-label={`Gols ${away?.name}`} disabled={!canEdit}
            value={value?.away ?? ''} onChange={(e) => onScore(match.id, 'away', e.target.value)}
          />
        </span>
        <span className="nx-up-team nx-up-away">
          {away && <TeamFlag name={away.name} flagEmoji={away.flag} size={22} />}
          <span className="nx-up-name">{away?.name}</span>
        </span>
        <span className="nx-up-cd">
          {multiplier > 1 && <em className="nx-up-boost">{multiplier}×</em>}
        </span>
      </div>
      {match.stage !== 'group' && value?.home != null && value?.away != null && value.home === value.away && (
        <div className="bolao-penalties" style={{ marginTop: '2px', textAlign: 'center' }}>
          <select
            className="nx-up-input"
            style={{ width: 'auto', height: 'auto', padding: '4px 10px', fontSize: '0.85rem', background: '#fff', color: '#000' }}
            value={value?.penaltyWinnerId ?? ''}
            disabled={!canEdit}
            onChange={(e) => onScore(match.id, 'pen', e.target.value)}
          >
            <option value="">Vencedor dos Pênaltis...</option>
            {home && <option value={home.id}>{home.name}</option>}
            {away && <option value={away.id}>{away.name}</option>}
          </select>
        </div>
      )}
    </div>
  );
}
