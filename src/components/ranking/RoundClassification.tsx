'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import { RankingList, type RankedUserRow } from './RankingList';

export interface RoundOption {
  key: string;
  label: string;
  complete: boolean;
  endLabel: string | null;
  bonusTop: number; // bônus do 1º colocado (headline)
  rows: RankedUserRow[];
}

interface Props {
  rounds: RoundOption[];
  defaultKey: string;
}

/**
 * Classificação por rodada com seletor. Mostra em evidência a rodada
 * vigente (defaultKey), com os 5 primeiros em destaque, e permite trocar
 * para qualquer rodada que já tenha começado.
 */
export function RoundClassification({ rounds, defaultKey }: Props) {
  const initial = rounds.some((r) => r.key === defaultKey)
    ? defaultKey
    : rounds[rounds.length - 1]?.key ?? '';
  const [selected, setSelected] = useState(initial);

  const round = rounds.find((r) => r.key === selected) ?? rounds[0];
  if (!round) return null;

  return (
    <section style={{ marginBottom: 'var(--space-2xl)' }}>
      <div className="round-class-head">
        <h3 style={{ margin: 0 }}>
          <Zap size={18} style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 6 }} />
          Classificação por rodada
        </h3>
        {rounds.length > 1 && (
          <select
            className="round-class-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Selecionar rodada"
          >
            {rounds.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 'var(--space-xs) 0 var(--space-md)' }}>
        {round.complete
          ? `Rodada encerrada — os 5 primeiros levaram bônus (1º +50 · 2º +30 · 3º +20 · 4º +10 · 5º +5).`
          : `Rodada em andamento${round.endLabel ? ` · encerra em ${round.endLabel}` : ''}.`}
      </p>

      {round.rows.length === 0 ? (
        <div className="glass-card-static" style={{ padding: 'var(--space-lg)' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            A rodada está começando — a classificação aparece conforme os jogos terminam.
          </p>
        </div>
      ) : (
        <RankingList users={round.rows} isRound={true} />
      )}
    </section>
  );
}
