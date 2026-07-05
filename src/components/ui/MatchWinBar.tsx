import { winDrawWin, toPercentParts } from '@/lib/bolao/winProbability';
import { formatPct } from '@/lib/format';
import type { Team } from '@/lib/types';
import type { MatchWinProbability } from '@/lib/bolao/probabilities';

/**
 * Barra Vitória-Empate-Vitória de um confronto. Usa a probabilidade oficial
 * (tabela match_probabilities, via prop) quando existe; senão cai na
 * estimativa por ranking FIFA. Compartilhada por /jogos e /bolao.
 */
export function MatchWinBar({
  home,
  away,
  matchNumber,
  matchProbabilities,
}: {
  home: Team;
  away: Team;
  matchNumber: number;
  matchProbabilities: Record<number, MatchWinProbability>;
}) {
  const prob = matchProbabilities[matchNumber];
  const wdw = prob
    ? { home: prob.home, draw: prob.draw, away: prob.away }
    : toPercentParts(winDrawWin(home.fifaRanking, away.fifaRanking));

  return (
    <div className="nx-wdw">
      <div
        className="nx-wdw-bar"
        role="img"
        aria-label={`Probabilidade: ${home.name} ${formatPct(wdw.home)}%, empate ${formatPct(wdw.draw)}%, ${away.name} ${formatPct(wdw.away)}%`}
      >
        <span className="nx-wdw-seg nx-wdw-home" style={{ width: `${wdw.home}%` }}>
          {wdw.home >= 12 && `${formatPct(wdw.home)}%`}
        </span>
        <span className="nx-wdw-seg nx-wdw-draw" style={{ width: `${wdw.draw}%` }}>
          {wdw.draw >= 12 && `${formatPct(wdw.draw)}%`}
        </span>
        <span className="nx-wdw-seg nx-wdw-away" style={{ width: `${wdw.away}%` }}>
          {wdw.away >= 12 && `${formatPct(wdw.away)}%`}
        </span>
      </div>
      <div className="nx-wdw-legend">
        <span>
          <i className="nx-dot nx-dot-home" /> Vitória {home.name}
        </span>
        <span>
          <i className="nx-dot nx-dot-draw" /> Empate
        </span>
        <span>
          <i className="nx-dot nx-dot-away" /> Vitória {away.name}
        </span>
      </div>
    </div>
  );
}
