'use client';

import { useMemo, useState } from 'react';
import { Search, Table2 } from 'lucide-react';

export interface MatrixUser {
  id: string;
  name: string;
  bonus: number;
  total: number;
  isAdmin: boolean;
}

export interface MatrixColumn {
  matchId: string;
  number: number;
  /** Ex.: "BRA × MAR" */
  label: string;
  /** Ex.: "R1 Grupos" ou "Oitavas" */
  round: string;
  finished: boolean;
}

export interface MatrixCell {
  /** Palpite formatado, ex.: "2×1". */
  guess: string;
  points: number;
}

interface Props {
  users: MatrixUser[];
  columns: MatrixColumn[];
  /** cells[userId][matchId] = palpite + pontos. */
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

  const visibleColumns = useMemo(
    () => (onlyPlayed ? columns.filter((c) => c.finished) : columns),
    [columns, onlyPlayed],
  );

  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q));
  }, [users, query]);

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
        <div className="pm-scroll">
          <table className="pm-table">
            <thead>
              <tr>
                <th className="pm-sticky pm-col-user">Usuário</th>
                <th className="pm-sticky pm-col-bonus">Bônus</th>
                <th className="pm-sticky pm-col-total">Total</th>
                {visibleColumns.map((c) => (
                  <th key={c.matchId} className="pm-col-match" title={`${c.round} · jogo ${c.number}`}>
                    <span className="pm-match-num">#{c.number}</span>
                    <span className="pm-match-label">{c.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => {
                const row = cells[u.id] ?? {};
                return (
                  <tr key={u.id} className={u.isAdmin ? 'pm-admin-row' : undefined}>
                    <td className="pm-sticky pm-col-user">
                      <span className="pm-user-name">{u.name}</span>
                      {u.isAdmin && <span className="pm-admin-tag">admin</span>}
                    </td>
                    <td className="pm-sticky pm-col-bonus pm-bonus">
                      {u.bonus > 0 ? `+${u.bonus}` : '—'}
                    </td>
                    <td className="pm-sticky pm-col-total pm-total">{u.total}</td>
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
      )}
    </section>
  );
}
