import { Trophy, Medal, Award } from 'lucide-react';
import './podium.css';

export interface PodiumUser {
  id: string;
  fullName: string | null;
  place: number;
  score: number;
}

const PLACE_ICON = { 1: Trophy, 2: Medal, 3: Award } as const;

/**
 * Pódio dos 5 primeiros da Classificação geral — aparece automaticamente
 * ao fim da última partida da Copa (ver finalFinished em page.tsx e
 * ranking/page.tsx). 1º-3º em degraus, 4º/5º numa lista abaixo.
 */
export function Podium({
  users,
  title = 'Campeões do Bolão',
}: {
  users: PodiumUser[];
  title?: string;
}) {
  if (users.length === 0) return null;

  const [first, second, third, fourth, fifth] = users;
  const steps = [second, first, third].filter((u): u is PodiumUser => Boolean(u));
  const rest = [fourth, fifth].filter((u): u is PodiumUser => Boolean(u));

  return (
    <section className="podium-section">
      <h2 className="podium-title">
        <Trophy size={22} />
        {title}
      </h2>
      <div className="podium-stage">
        {steps.map((u) => {
          const Icon = PLACE_ICON[u.place as 1 | 2 | 3] ?? Award;
          return (
            <div key={u.id} className={`podium-col podium-place-${u.place}`}>
              <Icon size={u.place === 1 ? 30 : 22} className="podium-icon" />
              <div className="podium-name">{u.fullName ?? 'Participante'}</div>
              <div className="podium-score">{u.score} pts</div>
              <div className="podium-bar">
                <span>{u.place}º</span>
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="podium-rest">
          {rest.map((u) => (
            <div key={u.id} className="glass-card-static podium-rest-row">
              <span className="podium-rest-pos">{u.place}º</span>
              <span className="podium-rest-name">{u.fullName ?? 'Participante'}</span>
              <span className="podium-rest-score">{u.score} pts</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
