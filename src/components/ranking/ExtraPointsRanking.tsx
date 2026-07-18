'use client';

import { useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';

export interface ExtraCategoryBreakdown {
  label: string;
  pts: number;
}

export interface ExtraPointsRow {
  userId: string;
  fullName: string | null;
  isAdmin: boolean;
  total: number;
  categories: ExtraCategoryBreakdown[];
}

/**
 * Ranking público dos palpites extras (3º lugar + Final — as únicas
 * partidas em que valem pontos; as semis foram só teste). Reaproveita as
 * classes .ranking-* / .breakdown-* já usadas em RankingList, sem CSS novo.
 */
export function ExtraPointsRanking({ rows }: { rows: ExtraPointsRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const ranked = [...rows].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return (a.fullName ?? '').localeCompare(b.fullName ?? '');
  });

  let place = 0;

  return (
    <section style={{ marginBottom: 'var(--space-xl)' }}>
      <h3 style={{ marginBottom: 'var(--space-xs)' }}>
        <Sparkles size={18} style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 6 }} />
        Pontos extras — 3º lugar e Final
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
        Pontos conquistados nos palpites extras (placares parciais, cartões, faltas e mais)
        que valem na disputa do 3º lugar e na Final. Toque num participante para ver quais
        estatísticas ele acertou.
      </p>

      {ranked.length === 0 ? (
        <div className="glass-card-static" style={{ padding: 'var(--space-lg)' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Ninguém registrou palpites extras válidos ainda.
          </p>
        </div>
      ) : (
        <div className="ranking-list">
          {ranked.map((r) => {
            if (!r.isAdmin) place += 1;
            const displayPlace = r.isAdmin ? null : place;
            const isTop = displayPlace !== null && displayPlace <= 5;
            const isExpanded = expandedId === r.userId;
            const toggle = () => setExpandedId(isExpanded ? null : r.userId);

            return (
              <div key={r.userId} className="ranking-row-wrapper">
                <div
                  className={`glass-card-static ranking-row ranking-row-clickable${isTop ? ' top5' : ''}${r.isAdmin ? ' admin' : ''}${isExpanded ? ' row-open' : ''}`}
                  onClick={toggle}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle()}
                  aria-expanded={isExpanded}
                >
                  <div className="ranking-pos">
                    {displayPlace !== null ? `${displayPlace}º` : '—'}
                  </div>
                  <div className="ranking-name">
                    {r.fullName ?? 'Participante'}
                    {r.isAdmin && <span className="ranking-tag">fora de competição</span>}
                  </div>
                  <div className="ranking-row-end">
                    <div className="ranking-score">
                      {r.total}
                      <small>pts</small>
                    </div>
                    <ChevronDown
                      size={15}
                      className={`ranking-chevron${isExpanded ? ' rotated' : ''}`}
                    />
                  </div>
                </div>

                {isExpanded && (
                  <div className="ranking-breakdown">
                    <div className="breakdown-section">
                      <div className="breakdown-title">Estatísticas acertadas</div>
                      <div className="breakdown-rows">
                        {r.categories.length === 0 ? (
                          <div className="breakdown-row breakdown-miss">
                            <span className="breakdown-cat">Nenhuma estatística acertada ainda</span>
                            <span className="breakdown-pts">0 pts</span>
                          </div>
                        ) : (
                          r.categories.map((c) => (
                            <div key={c.label} className="breakdown-row breakdown-exact">
                              <span className="breakdown-cat">{c.label}</span>
                              <span className="breakdown-pts">+{c.pts} pts</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="breakdown-total">
                      <span>Total</span>
                      <span>{r.total} pts</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
