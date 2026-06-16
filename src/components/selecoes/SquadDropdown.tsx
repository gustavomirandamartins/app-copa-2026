'use client';

import { useState } from 'react';
import { ChevronDown, Users, Loader2 } from 'lucide-react';
import type { Squad, SquadPosition } from '@/data/squads';
import './squad.css';

const POS_GROUPS: { key: SquadPosition; label: string; color: string }[] = [
  { key: 'GK', label: 'Goleiros', color: '#e8a33d' },
  { key: 'DF', label: 'Defensores', color: '#2f6fb0' },
  { key: 'MF', label: 'Meio-campistas', color: '#1f9d57' },
  { key: 'FW', label: 'Atacantes', color: '#d6453f' },
];

interface Props {
  teamId: string;
  /** Cor de destaque da seleção (borda do toggle ao abrir). */
  accentColor: string;
}

export function SquadDropdown({ teamId, accentColor }: Props) {
  const [open, setOpen] = useState(false);
  // undefined = ainda não carregado · null = sem elenco · Squad = carregado
  const [squad, setSquad] = useState<Squad | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && squad === undefined && !loading) {
      setLoading(true);
      // Carrega o dataset (~170 KB) só ao abrir — fora do bundle inicial.
      const mod = await import('@/data/squads');
      setSquad(mod.getSquad(teamId) ?? null);
      setLoading(false);
    }
  }

  return (
    <div className="squad">
      <button
        className="squad-toggle"
        onClick={toggle}
        aria-expanded={open}
        style={{ borderColor: open ? accentColor : undefined }}
      >
        <Users size={16} style={{ color: 'var(--gold)' }} />
        <span>Ver elenco completo</span>
        <ChevronDown
          size={18}
          className="squad-chevron"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {open && (
        <div className="squad-panel">
          {loading && (
            <div className="squad-loading">
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Carregando elenco…
            </div>
          )}

          {squad === null && !loading && (
            <p className="squad-empty">Elenco ainda não disponível para esta seleção.</p>
          )}

          {squad && (
            <>
              {squad.coach && (
                <div className="squad-coach">
                  <span className="squad-coach-label">Técnico</span>
                  <span className="squad-coach-name">{squad.coach}</span>
                </div>
              )}

              {POS_GROUPS.map(({ key, label, color }) => {
                const players = squad.players
                  .filter((p) => p.pos === key)
                  .sort((a, b) => a.num - b.num);
                if (players.length === 0) return null;
                return (
                  <div key={key} className="squad-group">
                    <h4 className="squad-group-title">
                      <span className="squad-group-dot" style={{ background: color }} />
                      {label}
                      <span className="squad-group-count">{players.length}</span>
                    </h4>
                    <ul className="squad-list">
                      {players.map((p) => (
                        <li key={p.num} className="squad-player">
                          <span
                            className="squad-num"
                            style={{ background: color }}
                          >
                            {p.num}
                          </span>
                          <span className="squad-info">
                            <span className="squad-shirt">{p.shirt}</span>
                            <span className="squad-meta">
                              {p.name}
                              {p.name !== p.club && <> · {p.club}</>}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
