import { Sparkles } from 'lucide-react';

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
 * Ranking público SIMPLES dos pontos extras (3º lugar + Final — as únicas
 * partidas em que valem pontos). Só nome + pontuação, sem o destaque nem
 * a distinção de top 5 da Classificação geral — é a que soma no total e
 * já tem esse destaque. O detalhamento por estatística acertada mora no
 * breakdown da Classificação geral (RankingList/BreakdownPanel).
 */
export function ExtraPointsRanking({ rows }: { rows: ExtraPointsRow[] }) {
  const ranked = [...rows].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return (a.fullName ?? '').localeCompare(b.fullName ?? '');
  });

  return (
    <section style={{ marginBottom: 'var(--space-xl)' }}>
      <h3 style={{ marginBottom: 'var(--space-xs)' }}>
        <Sparkles size={18} style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 6 }} />
        Pontos extras — 3º lugar e Final
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
        Pontuação de cada participante nos palpites extras (placares parciais, cartões, faltas e mais)
        que valem na disputa do 3º lugar e na Final — já soma no total da Classificação geral acima.
      </p>

      {ranked.length === 0 ? (
        <div className="glass-card-static" style={{ padding: 'var(--space-lg)' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Ninguém registrou palpites extras válidos ainda.
          </p>
        </div>
      ) : (
        <div className="glass-card-static extra-points-simple">
          {ranked.map((r) => (
            <div key={r.userId} className="extra-points-simple-row">
              <span className="extra-points-simple-name">
                {r.fullName ?? 'Participante'}
                {r.isAdmin && <span className="ranking-tag">fora de competição</span>}
              </span>
              <span className="extra-points-simple-score">{r.total} pts</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
