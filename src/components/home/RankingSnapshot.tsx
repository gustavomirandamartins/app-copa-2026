import Link from 'next/link';
import { Trophy, Crown, ArrowRight } from 'lucide-react';

interface RankRow {
  full_name: string | null;
  total_score: number;
}

interface Props {
  rows: RankRow[];
  meName: string | null;
  mePoints: number;
}

// Mesmo critério da página de Classificação: o admin aparece fora de
// competição (não ocupa colocação).
const ADMIN_NAME = 'gustavo martins';
const norm = (s: string | null) => (s ?? '').trim().toLowerCase();
const isAdmin = (s: string | null) => norm(s) === ADMIN_NAME;

export function RankingSnapshot({ rows, meName, mePoints }: Props) {
  // Coloca posições ignorando o admin.
  let place = 0;
  const ranked = rows.map((r) => {
    const admin = isAdmin(r.full_name);
    const pos = admin ? null : ++place;
    return { ...r, pos, admin };
  });

  const top = ranked.slice(0, 5);
  const me = meName ? ranked.find((r) => norm(r.full_name) === norm(meName)) : undefined;
  const meInTop = me ? me.pos !== null && me.pos <= 5 : false;

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

      {/* Sua posição */}
      <div className="dash-me">
        <span className="dash-me-label">Você</span>
        <span className="dash-me-pos">
          {me && me.pos !== null ? `${me.pos}º lugar` : 'fora da classificação'}
        </span>
        <span className="dash-me-pts">
          {mePoints}
          <small>pts</small>
        </span>
      </div>

      {top.length === 0 ? (
        <p className="dash-rank-empty">A classificação começa com os primeiros jogos.</p>
      ) : (
        <ol className="dash-rank-list">
          {top.map((r, i) => {
            const mine = me && norm(r.full_name) === norm(meName);
            return (
              <li key={`${r.full_name}-${i}`} className={`dash-rank-row ${mine ? 'is-me' : ''}`}>
                <span className={`dash-rank-pos ${i === 0 ? 'gold' : ''}`}>
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

      {me && !meInTop && me.pos !== null && (
        <p className="dash-rank-foot">
          Você está em <strong>{me.pos}º</strong> — falta pouco para o pódio!
        </p>
      )}
    </div>
  );
}
