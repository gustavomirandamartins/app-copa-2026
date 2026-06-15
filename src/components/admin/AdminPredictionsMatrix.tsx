'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Search, Table2 } from 'lucide-react';

export interface MatrixUser {
  id: string;
  name: string;
  bonus: number;
  adjustment: number;
  referral: number;
  total: number;
  isAdmin: boolean;
}

export interface MatrixColumn {
  matchId: string;
  number: number;
  label: string;
  round: string;
  finished: boolean;
  homeCode?: string;
  awayCode?: string;
  homeScore?: number | null;
  awayScore?: number | null;
}

export interface MatrixCell {
  guess: string;
  points: number;
}

interface Props {
  users: MatrixUser[];
  columns: MatrixColumn[];
  cells: Record<string, Record<string, MatrixCell>>;
}

function pointsClass(p: number): string {
  if (p >= 5) return 'pm-pts pm-pts-5';
  if (p >= 3) return 'pm-pts pm-pts-3';
  if (p >= 1) return 'pm-pts pm-pts-1';
  return 'pm-pts pm-pts-0';
}

export function AdminPredictionsMatrix({ users, columns, cells }: Props) {
  const [query, setQuery] = useState('');
  const [onlyPlayed, setOnlyPlayed] = useState(true);

  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const visibleColumns = useMemo(
    () => (onlyPlayed ? columns.filter((c) => c.finished) : columns),
    [columns, onlyPlayed],
  );

  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q));
  }, [users, query]);

  // Sincroniza a altura de cada linha entre os dois painéis.
  useLayoutEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const leftRows = Array.from(left.querySelectorAll<HTMLTableRowElement>('tr'));
    const rightRows = Array.from(right.querySelectorAll<HTMLTableRowElement>('tr'));

    // Reseta antes de medir para não acumular alturas de renders anteriores.
    [...leftRows, ...rightRows].forEach((r) => (r.style.height = ''));

    const len = Math.max(leftRows.length, rightRows.length);
    for (let i = 0; i < len; i++) {
      const l = leftRows[i];
      const r = rightRows[i];
      if (!l || !r) continue;
      const max = Math.max(l.getBoundingClientRect().height, r.getBoundingClientRect().height);
      l.style.height = `${max}px`;
      r.style.height = `${max}px`;
    }
  }, [visibleUsers, visibleColumns]);

  const syncLeft = () => {
    if (leftRef.current && rightRef.current) {
      leftRef.current.scrollTop = rightRef.current.scrollTop;
    }
  };
  const syncRight = () => {
    if (leftRef.current && rightRef.current) {
      rightRef.current.scrollTop = leftRef.current.scrollTop;
    }
  };

  return (
    <section style={{ marginTop: 'var(--space-2xl)' }}>
      <h2 className="admin-section-title">
        <Table2 size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        Palpites e pontos por partida
      </h2>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
          alignItems: 'center',
          marginBottom: 'var(--space-md)',
        }}
      >
        <div className="admin-search" style={{ marginBottom: 0, flex: '1 1 220px' }}>
          <Search size={16} />
          <input
            type="search"
            placeholder="Buscar usuário…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="pm-toggle">
          <input
            type="checkbox"
            checked={onlyPlayed}
            onChange={(e) => setOnlyPlayed(e.target.checked)}
          />
          Só jogos finalizados ({columns.filter((c) => c.finished).length}/{columns.length})
        </label>
      </div>

      {visibleColumns.length === 0 ? (
        <p className="admin-empty">Nenhum jogo finalizado ainda.</p>
      ) : (
        <div className="pm-wrapper">
          {/* Colunas fixas: usuário, bônus, total */}
          <div className="pm-left" ref={leftRef} onScroll={syncRight}>
            <table className="pm-table">
              <thead>
                <tr>
                  <th className="pm-col-user">Usuário</th>
                  <th className="pm-col-bonus">Bônus</th>
                  <th className="pm-col-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((u) => (
                  <tr key={u.id} className={u.isAdmin ? 'pm-admin-row' : undefined}>
                    <td className="pm-col-user">
                      <span className="pm-user-name">{u.name}</span>
                      {u.isAdmin && <span className="pm-admin-tag">admin</span>}
                    </td>
                    <td className="pm-col-bonus">
                      {u.bonus > 0 && (
                        <span className="pm-bonus">{`+${u.bonus}`}</span>
                      )}
                      {u.adjustment !== 0 && (
                        <span className="pm-adjustment">
                          {u.adjustment > 0 ? `+${u.adjustment}` : u.adjustment} adj
                        </span>
                      )}
                      {u.referral > 0 && (
                        <span className="pm-referral">+{u.referral} ind</span>
                      )}
                      {u.bonus === 0 && u.adjustment === 0 && u.referral === 0 && (
                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td className="pm-col-total pm-total">{u.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Colunas de palpites: scroll horizontal */}
          <div className="pm-right" ref={rightRef} onScroll={syncLeft}>
            <table className="pm-table">
              <thead>
                <tr>
                  {visibleColumns.map((c) => {
                    const hasScore =
                      c.finished && c.homeScore != null && c.awayScore != null;
                    return (
                      <th
                        key={c.matchId}
                        className="pm-col-match"
                        title={`${c.round} · jogo ${c.number}`}
                      >
                        <span className="pm-match-num">#{c.number} · {c.round}</span>
                        {hasScore ? (
                          <span className="pm-match-result">
                            {c.homeCode} {c.homeScore}×{c.awayScore} {c.awayCode}
                          </span>
                        ) : (
                          <span className="pm-match-label">{c.label}</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((u) => {
                  const row = cells[u.id] ?? {};
                  return (
                    <tr key={u.id} className={u.isAdmin ? 'pm-admin-row' : undefined}>
                      {visibleColumns.map((c) => {
                        const cell = row[c.matchId];
                        return (
                          <td key={c.matchId} className="pm-col-match">
                            {cell ? (
                              <span className="pm-cell">
                                <span className="pm-guess">{cell.guess}</span>
                                {c.finished && (
                                  <span className={pointsClass(cell.points)}>{cell.points}</span>
                                )}
                              </span>
                            ) : (
                              <span className="pm-empty">·</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
