'use client';

import { useState } from 'react';
import { Crown, ChevronDown } from 'lucide-react';
import { ROUND_BONUS_POINTS } from '@/lib/bolao/rounds';

export interface UserBreakdown {
  exact_pts: number;
  diff_pts: number;
  winner_pts: number;
  prediction_pts: number;
  round_bonuses: Array<{ roundKey: string; label: string; pts: number }>;
  referral_bonus: number;
  score_adjustment: number;
}

export interface RankedUserRow {
  id: string;
  full_name: string | null;
  score: number;
  is_admin: boolean;
  is_winner?: boolean;
  breakdown: UserBreakdown;
}

interface Props {
  users: RankedUserRow[];
  isRound?: boolean;
}

const ADMIN_NAME = 'Gustavo Martins';
const normalize = (s: string | null) => (s ?? '').trim().toLowerCase();
const isAdminUser = (u: RankedUserRow) => u.is_admin || normalize(u.full_name) === normalize(ADMIN_NAME);

function BreakdownPanel({ bd, score, isRound }: { bd: UserBreakdown; score: number; isRound: boolean }) {
  const exactCount  = bd.exact_pts  > 0 ? Math.round(bd.exact_pts  / 5) : 0;
  const diffCount   = bd.diff_pts   > 0 ? Math.round(bd.diff_pts   / 3) : 0;
  const winnerCount = bd.winner_pts;

  const hasBonus = !isRound && (bd.round_bonuses.length > 0 || bd.referral_bonus > 0 || bd.score_adjustment !== 0);

  return (
    <div className="ranking-breakdown">

      <div className="breakdown-section">
        <div className="breakdown-title">Palpites de partidas</div>
        <div className="breakdown-rows">
          {exactCount > 0 && (
            <div className="breakdown-row breakdown-exact">
              <span className="breakdown-cat">
                Placar exato
                <em> · {exactCount} acerto{exactCount !== 1 ? 's' : ''}</em>
              </span>
              <span className="breakdown-pts">+{bd.exact_pts} pts</span>
            </div>
          )}
          {diffCount > 0 && (
            <div className="breakdown-row breakdown-diff">
              <span className="breakdown-cat">
                Vencedor + diferença de gols
                <em> · {diffCount} acerto{diffCount !== 1 ? 's' : ''}</em>
              </span>
              <span className="breakdown-pts">+{bd.diff_pts} pts</span>
            </div>
          )}
          {winnerCount > 0 && (
            <div className="breakdown-row breakdown-winner">
              <span className="breakdown-cat">
                Apenas vencedor
                <em> · {winnerCount} acerto{winnerCount !== 1 ? 's' : ''}</em>
              </span>
              <span className="breakdown-pts">+{bd.winner_pts} pts</span>
            </div>
          )}
          {bd.prediction_pts === 0 && (
            <div className="breakdown-row breakdown-miss">
              <span className="breakdown-cat">Nenhum palpite pontuado ainda</span>
              <span className="breakdown-pts">0 pts</span>
            </div>
          )}
        </div>
        {hasBonus && (
          <div className="breakdown-subtotal">
            <span>Subtotal palpites</span>
            <span>{bd.prediction_pts} pts</span>
          </div>
        )}
      </div>

      {hasBonus && (
        <div className="breakdown-section">
          <div className="breakdown-title">Bônus e ajustes</div>
          <div className="breakdown-rows">
            {bd.round_bonuses.map((rb) => (
              <div key={rb.roundKey} className="breakdown-row breakdown-bonus">
                <span className="breakdown-cat">Bônus de rodada — {rb.label}</span>
                <span className="breakdown-pts">+{rb.pts} pts</span>
              </div>
            ))}
            {bd.referral_bonus > 0 && (
              <div className="breakdown-row breakdown-bonus">
                <span className="breakdown-cat">Bônus de indicação</span>
                <span className="breakdown-pts">+{bd.referral_bonus} pts</span>
              </div>
            )}
            {bd.score_adjustment !== 0 && (
              <div className="breakdown-row breakdown-bonus">
                <span className="breakdown-cat">Bônus especial</span>
                <span className="breakdown-pts">
                  {bd.score_adjustment > 0 ? '+' : ''}{bd.score_adjustment} pts
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="breakdown-total">
        <span>Total</span>
        <span>{score} pts</span>
      </div>

    </div>
  );
}

export function RankingList({ users, isRound = false }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  let place = 0;

  return (
    <div className="ranking-list">
      {users.map((user, i) => {
        const isAdmin = isAdminUser(user);
        let displayPlace: number | null = null;
        if (!isAdmin) {
          place += 1;
          displayPlace = place;
        }
        const isTop = isRound ? !!user.is_winner : (displayPlace !== null && displayPlace <= 5);
        const isExpanded = expandedId === user.id + String(i);
        const toggle = () => setExpandedId(isExpanded ? null : user.id + String(i));

        return (
          <div key={`${user.id}-${i}`} className="ranking-row-wrapper">
            <div
              className={`glass-card-static ranking-row ranking-row-clickable${isTop ? ' top5' : ''}${isAdmin ? ' admin' : ''}${isExpanded ? ' row-open' : ''}`}
              onClick={toggle}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle()}
              aria-expanded={isExpanded}
            >
              <div className="ranking-pos">
                {isRound && user.is_winner ? (
                  <Crown size={18} style={{ color: 'var(--gold)' }} />
                ) : displayPlace !== null ? (
                  `${displayPlace}º`
                ) : (
                  '—'
                )}
              </div>
              <div className="ranking-name">
                {user.full_name ?? 'Participante'}
                {isAdmin && <span className="ranking-tag">fora de competição</span>}
                {isRound && user.is_winner && (
                  <span className="ranking-tag tag-bonus">+{ROUND_BONUS_POINTS} bônus</span>
                )}
              </div>
              <div className="ranking-row-end">
                <div className="ranking-score">
                  {user.score}
                  <small>pts</small>
                </div>
                <ChevronDown
                  size={15}
                  className={`ranking-chevron${isExpanded ? ' rotated' : ''}`}
                />
              </div>
            </div>

            {isExpanded && (
              <BreakdownPanel bd={user.breakdown} score={user.score} isRound={isRound} />
            )}
          </div>
        );
      })}
    </div>
  );
}
