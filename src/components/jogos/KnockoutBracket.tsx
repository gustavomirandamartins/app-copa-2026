'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { getTeamById } from '@/data/teams';
import { getStadiumById } from '@/data/stadiums';
import { TeamFlag } from '@/components/ui/TeamFlag';
import type { Match } from '@/lib/types';
import { formatKickoffTime, formatKickoffDate } from '@/lib/datetime';

interface Props {
  matches: Match[];
  stage: 'round-of-32' | 'round-of-16' | 'quarter-final' | 'semi-final' | 'final' | 'third-place';
}

const STAGE_LABELS: Record<string, string> = {
  'round-of-32': '16 Avos de Final',
  'round-of-16': 'Oitavas de Final',
  'quarter-final': 'Quartas de Final',
  'semi-final': 'Semifinais',
  'third-place': 'Disputa de 3º Lugar',
  'final': 'Final',
};

function BracketMatch({ match }: { match: Match }) {
  const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null;
  const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null;
  const stadium = getStadiumById(match.stadiumId);

  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  const homeWon = isFinished && match.homeGoals !== null && match.awayGoals !== null && match.homeGoals > match.awayGoals;
  const awayWon = isFinished && match.homeGoals !== null && match.awayGoals !== null && match.awayGoals > match.homeGoals;

  return (
    <div className={`bracket-match ${isLive ? 'is-live' : ''} ${isFinished ? 'is-finished' : ''}`}>
      <div className="bracket-match-header">
        <span className="bracket-match-number">Jogo {match.matchNumber}</span>
        {isLive && <span className="bracket-live-badge">AO VIVO</span>}
        {isFinished && <span className="bracket-finished-badge">Encerrado</span>}
      </div>

      <div className="bracket-teams">
        <div className={`bracket-team ${homeWon ? 'is-winner' : ''}`}>
          <div className="bracket-team-info">
            {home ? (
              <Link href={`/selecoes/${match.homeTeamId}`} className="bracket-team-link">
                <TeamFlag name={home.name} flagEmoji={home.flag} size={20} />
                <span className="bracket-team-name">{home.name}</span>
              </Link>
            ) : (
              <>
                <span className="bracket-flag-placeholder">🏳️</span>
                <span className="bracket-team-name bracket-placeholder">{match.homeTeamPlaceholder || 'A definir'}</span>
              </>
            )}
          </div>
          {(isFinished || isLive) && match.homeGoals !== null && (
            <span className={`bracket-score ${homeWon ? 'winner' : ''}`}>{match.homeGoals}</span>
          )}
        </div>

        <div className={`bracket-team ${awayWon ? 'is-winner' : ''}`}>
          <div className="bracket-team-info">
            {away ? (
              <Link href={`/selecoes/${match.awayTeamId}`} className="bracket-team-link">
                <TeamFlag name={away.name} flagEmoji={away.flag} size={20} />
                <span className="bracket-team-name">{away.name}</span>
              </Link>
            ) : (
              <>
                <span className="bracket-flag-placeholder">🏳️</span>
                <span className="bracket-team-name bracket-placeholder">{match.awayTeamPlaceholder || 'A definir'}</span>
              </>
            )}
          </div>
          {(isFinished || isLive) && match.awayGoals !== null && (
            <span className={`bracket-score ${awayWon ? 'winner' : ''}`}>{match.awayGoals}</span>
          )}
        </div>
      </div>

      <div className="bracket-match-footer">
        <MapPin size={11} />
        <span>{stadium?.city || ''}</span>
        <span className="bracket-match-date">{formatKickoffDate(match.dateUTC)}</span>
        <span className="bracket-match-time">{formatKickoffTime(match.dateUTC)}</span>
      </div>
    </div>
  );
}

function BracketRound({ title, matches }: { title: string; matches: Match[] }) {
  return (
    <div className="bracket-round">
      <h4 className="bracket-round-title">{title}</h4>
      <div className="bracket-round-matches">
        {matches.map((match) => (
          <BracketMatch key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}

export function KnockoutBracket({ matches, stage }: Props) {
  const stageLabel = STAGE_LABELS[stage] || stage;

  const isTwoColumnStage = stage === 'round-of-32' || stage === 'round-of-16';

  const leftMatches = useMemo(() => {
    if (stage === 'round-of-32') return matches.slice(0, 8);
    if (stage === 'round-of-16') return matches.slice(0, 4);
    return [];
  }, [matches, stage]);

  const rightMatches = useMemo(() => {
    if (stage === 'round-of-32') return matches.slice(8, 16);
    if (stage === 'round-of-16') return matches.slice(4, 8);
    return [];
  }, [matches, stage]);

  if (isTwoColumnStage) {
    return (
      <div className="bracket-container">
        <h2 className="bracket-stage-title">{stageLabel}</h2>
        <div className="bracket-two-columns">
          <div className="bracket-column">
            <BracketRound title="Lado Esquerdo" matches={leftMatches} />
          </div>
          <div className="bracket-column">
            <BracketRound title="Lado Direito" matches={rightMatches} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bracket-container">
      <h2 className="bracket-stage-title">{stageLabel}</h2>
      <div className="bracket-single-column">
        <BracketRound title={stageLabel} matches={matches} />
      </div>
    </div>
  );
}
