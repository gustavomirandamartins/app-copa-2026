'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trophy, Crown, ArrowRight, Zap } from 'lucide-react';

interface RankRow {
  full_name: string | null;
  total_score: number;
}

interface RoundRow {
  full_name: string | null;
  points: number;
}

interface Props {
  rows: RankRow[];
  meName: string | null;
  mePoints: number;
  roundRows?: RoundRow[];
  currentRoundLabel?: string;
  meRoundPoints?: number;
}

const ADMIN_NAME = 'gustavo martins';
const norm = (s: string | null) => (s ?? '').trim().toLowerCase();
const isAdminRow = (s: string | null) => norm(s) === ADMIN_NAME;

export function RankingSnapshot({
  rows,
  meName,
  mePoints,
  roundRows,
  currentRoundLabel,
  meRoundPoints = 0,
}: Props) {
  // Toggle rodada/geral continua disponível, mas na reta final da Copa o
  // que importa é a geral — abre nela por padrão (era a rodada vigente).
  const hasRound = !!currentRoundLabel;
  const [tab, setTab] = useState<'round' | 'general'>('general');

  // ── Classificação geral ──────────────────────────────────────
  let place = 0;
  const ranked = rows.map((r) => {
    const admin = isAdminRow(r.full_name);
    const pos = admin ? null : ++place;
    return { ...r, pos, admin };
  });
  const generalTop = ranked.slice(0, 7);
  const me = meName ? ranked.find((r) => norm(r.full_name) === norm(meName)) : undefined;
  const meInTop = me ? me.pos !== null && me.pos <= 7 : false;

  // ── Classificação da rodada ──────────────────────────────────
  let roundPlace = 0;
  const rankedRound = (roundRows ?? []).map((r) => {
    const admin = isAdminRow(r.full_name);
    const pos = admin ? null : ++roundPlace;
    return { ...r, pos, admin };
  });
  const roundTop = rankedRound.slice(0, 7);
  const meRound = meName
    ? rankedRound.find((r) => norm(r.full_name) === norm(meName))
    : undefined;
  const meRoundPos = meRound?.pos ?? null;
  const meRoundInTop = meRoundPos !== null && meRoundPos <= 7;

  const meIsAdmin = isAdminRow(meName);
  const activePoints = tab === 'round' ? meRoundPoints : mePoints;
  const activePosLabel = meIsAdmin
    ? 'Fora da competição'
    : tab === 'round'
      ? meRoundPos !== null
        ? `${meRoundPos}º lugar`
        : 'sem pontuação'
      : me && me.pos !== null
      ? `${me.pos}º lugar`
      : 'fora da classificação';

  return (
    <div className="dash-rank glass-card-static">
      <div className="dash-rank-head">
        <h3 className="dash-card-title">
          <Trophy size={17} /> Classificação
        </h3>
        <Link href="/ranking" className="dash-rank-all">
          Ver completa <ArrowRight size={13} />
        </Link>
      </div>

      {/* Toggle rodada / geral */}
      {hasRound && (
        <div className="dash-rank-tabs">
          <button
            type="button"
            className={`dash-rank-tab${tab === 'round' ? ' active' : ''}`}
            onClick={() => setTab('round')}
          >
            <Zap size={12} />
            {currentRoundLabel ? currentRoundLabel.split('·')[0].trim() : 'Rodada'}
          </button>
          <button
            type="button"
            className={`dash-rank-tab${tab === 'general' ? ' active' : ''}`}
            onClick={() => setTab('general')}
          >
            Geral
          </button>
        </div>
      )}

      {/* Sua posição */}
      <div className="dash-me">
        <span className="dash-me-label">Você</span>
        <span className="dash-me-pos">{activePosLabel}</span>
        <span className="dash-me-pts">
          {activePoints}
          <small>pts</small>
        </span>
      </div>

      {/* Lista */}
      {tab === 'round' ? (
        roundTop.length === 0 ? (
          <p className="dash-rank-empty">A rodada está começando — os pontos aparecem conforme os jogos terminam.</p>
        ) : (
          <ol className="dash-rank-list">
            {roundTop.map((r, i) => {
              const mine = meName && norm(r.full_name) === norm(meName);
              const top5 = r.pos !== null && r.pos <= 5;
              return (
                <li key={`${r.full_name}-${i}`} className={`dash-rank-row${top5 ? ' is-top5' : ''}${mine ? ' is-me' : ''}`}>
                  <span className={`dash-rank-pos${i === 0 ? ' gold' : ''}`}>
                    {i === 0 ? <Crown size={15} /> : r.pos !== null ? `${r.pos}º` : '-'}
                  </span>
                  <span className="dash-rank-name">
                    {r.full_name ?? 'Participante'}
                    {r.admin && <span className="dash-rank-tag">fora de competição</span>}
                  </span>
                  <span className="dash-rank-score">{r.points}</span>
                </li>
              );
            })}
          </ol>
        )
      ) : generalTop.length === 0 ? (
        <p className="dash-rank-empty">A classificação começa com os primeiros jogos.</p>
      ) : (
        <ol className="dash-rank-list">
          {generalTop.map((r, i) => {
            const mine = meName && norm(r.full_name) === norm(meName);
            const top5 = r.pos !== null && r.pos <= 5;
            return (
              <li key={`${r.full_name}-${i}`} className={`dash-rank-row${top5 ? ' is-top5' : ''}${mine ? ' is-me' : ''}`}>
                <span className={`dash-rank-pos${i === 0 ? ' gold' : ''}`}>
                  {i === 0 ? <Crown size={15} /> : r.pos !== null ? `${r.pos}º` : '-'}
                </span>
                <span className="dash-rank-name">
                  {r.full_name ?? 'Participante'}
                  {r.admin && <span className="dash-rank-tag">fora de competição</span>}
                </span>
                <span className="dash-rank-score">{r.total_score}</span>
              </li>
            );
          })}
        </ol>
      )}

      {tab === 'general' && me && !meInTop && me.pos !== null && (
        <p className="dash-rank-foot">
          Você está em <strong>{me.pos}º</strong> — falta pouco para o pódio!
        </p>
      )}
      {tab === 'round' && meRound && !meRoundInTop && meRoundPos !== null && (
        <p className="dash-rank-foot">
          Você está em <strong>{meRoundPos}º</strong> na rodada.
        </p>
      )}
    </div>
  );
}
