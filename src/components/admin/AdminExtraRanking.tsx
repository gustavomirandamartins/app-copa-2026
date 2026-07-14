import { Sparkles } from 'lucide-react';
import { matches as allMatches } from '@/data/matches';
import { getTeamById } from '@/data/teams';
import {
  EXTRA_BET_MATCH_IDS,
  EXTRA_COUNTING_MATCH_IDS,
} from '@/lib/bolao/extra-bets';

export interface ExtraRankingRow {
  userId: string;
  name: string;
  /** match_id → points_earned apurado (semis inclusas, mesmo sem valer). */
  pointsByMatch: Record<string, number>;
}

function matchLabel(matchId: string): string {
  const m = allMatches.find((x) => x.id === matchId);
  if (!m) return matchId;
  const stage =
    m.stage === 'semi-final' ? 'Semi' : m.stage === 'third-place' ? '3º lugar' : 'Final';
  const home = m.homeTeamId ? getTeamById(m.homeTeamId)?.code : null;
  const away = m.awayTeamId ? getTeamById(m.awayTeamId)?.code : null;
  return home && away ? `${stage} · ${home}×${away}` : `${stage} · #${m.matchNumber}`;
}

/**
 * Ranking de VERIFICAÇÃO dos palpites extras (Central de controle).
 * Mostra os pontos apurados por jogo — inclusive as semifinais, que são
 * rodada de teste e NÃO somam no total_score. A coluna "Valendo" é a única
 * que entra na classificação real (3º lugar + final).
 * Sem 'use client': tabela estática renderizada no servidor.
 */
export function AdminExtraRanking({ rows }: { rows: ExtraRankingRow[] }) {
  const columns = EXTRA_BET_MATCH_IDS.map((id) => ({
    id,
    label: matchLabel(id),
    counting: EXTRA_COUNTING_MATCH_IDS.includes(id),
  }));

  const ranked = rows
    .map((r) => {
      const trial = columns
        .filter((c) => !c.counting)
        .reduce((s, c) => s + (r.pointsByMatch[c.id] ?? 0), 0);
      const counting = columns
        .filter((c) => c.counting)
        .reduce((s, c) => s + (r.pointsByMatch[c.id] ?? 0), 0);
      return { ...r, trial, counting };
    })
    .sort(
      (a, b) =>
        b.counting - a.counting ||
        b.trial - a.trial ||
        a.name.localeCompare(b.name),
    );

  return (
    <section className="glass-card-static" style={{ padding: 'var(--space-lg)' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-xs)', fontSize: '1.05rem' }}>
        <Sparkles size={18} style={{ color: 'var(--gold)' }} />
        Palpites extras — ranking de verificação
      </h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
        Pontos apurados por jogo. As colunas de semifinal são a rodada de
        teste — aparecem aqui para conferência, mas <strong>não somam</strong>{' '}
        na classificação. Só a coluna “Valendo” (3º lugar + final) entra no
        total dos participantes.
      </p>

      {ranked.length === 0 ? (
        <p className="admin-empty" style={{ padding: 0 }}>
          Ninguém registrou palpites extras ainda.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="standings-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>#</th>
                <th style={{ textAlign: 'left' }}>Participante</th>
                {columns.map((c) => (
                  <th key={c.id} title={c.counting ? 'Vale pontos' : 'Rodada de teste'}>
                    {c.label}
                    {!c.counting && ' 🧪'}
                  </th>
                ))}
                <th>Teste</th>
                <th>Valendo</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr key={r.userId}>
                  <td style={{ fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  {columns.map((c) => (
                    <td key={c.id}>{r.pointsByMatch[c.id] ?? '—'}</td>
                  ))}
                  <td style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{r.trial}</td>
                  <td className="pts">{r.counting}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
