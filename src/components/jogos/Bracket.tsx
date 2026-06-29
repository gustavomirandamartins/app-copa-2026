import { useState } from 'react';
import { getTeamById } from '@/data/teams';
import { TeamFlag } from '@/components/ui/TeamFlag';
import type { Match, MatchStage } from '@/lib/types';
import './bracket.css';

export function Bracket({ matches, onMatchClick }: { matches: Match[], onMatchClick?: (stage: MatchStage) => void }) {
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // Filter and sort matches by stage and match number
  const roundOf32 = matches.filter(m => m.stage === 'round-of-32').sort((a, b) => a.matchNumber - b.matchNumber);
  const roundOf16 = matches.filter(m => m.stage === 'round-of-16').sort((a, b) => a.matchNumber - b.matchNumber);
  const quarters = matches.filter(m => m.stage === 'quarter-final').sort((a, b) => a.matchNumber - b.matchNumber);
  const semis = matches.filter(m => m.stage === 'semi-final').sort((a, b) => a.matchNumber - b.matchNumber);
  const final = matches.filter(m => m.stage === 'final').sort((a, b) => a.matchNumber - b.matchNumber);
  const thirdPlace = matches.filter(m => m.stage === 'third-place').sort((a, b) => a.matchNumber - b.matchNumber);

  const columns = [
    { title: '16 Avos', matches: roundOf32 },
    { title: 'Oitavas', matches: roundOf16 },
    { title: 'Quartas', matches: quarters },
    { title: 'Semifinais', matches: semis },
    { title: 'Final / 3º Lugar', matches: [...final, ...thirdPlace] },
  ];

  return (
    <div className="bracket-container">
      <div className="bracket-scroll-area">
        <div className="bracket-canvas">
          <div className="bracket-columns">
            {columns.map((col, colIdx) => (
              <div key={col.title} className="bracket-column">
                <div className="bracket-column-title">{col.title}</div>
                <div className="bracket-column-matches">
                  {col.matches.map((match) => {
                    const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null;
                    const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null;
                    const isActive = hoveredPath === match.id;
                    const isMuted = hoveredPath !== null && hoveredPath !== match.id;

                    return (
                      <div className={`bracket-match-wrapper stage-${match.stage}`} key={match.id}>
                        {/* CSS-based connecting lines drawn from here */}
                        <div 
                          className={`bracket-card glass-card ${isActive ? 'active' : ''} ${isMuted ? 'muted' : ''}`}
                          onMouseEnter={() => setHoveredPath(match.id)}
                          onMouseLeave={() => setHoveredPath(null)}
                          onClick={() => onMatchClick?.(match.stage)}
                          style={{ cursor: onMatchClick ? 'pointer' : 'default' }}
                        >
                          <div className="bracket-card-header">
                            <span className="match-num">#{match.matchNumber}</span>
                            {match.status === 'live' && <span className="match-live">●</span>}
                          </div>
                          
                          <div className="bracket-card-team">
                            {home ? (
                              <>
                                <TeamFlag name={home.name} flagEmoji={home.flag} size={20} />
                                <span className="team-name">{home.name}</span>
                              </>
                            ) : (
                              <>
                                <span className="team-flag-placeholder">🏳️</span>
                                <span className="team-name placeholder">{match.homeTeamPlaceholder || 'A definir'}</span>
                              </>
                            )}
                            <span className="team-score">{match.homeGoals !== null ? match.homeGoals : '-'}</span>
                          </div>
                          
                          <div className="bracket-card-team">
                            {away ? (
                              <>
                                <TeamFlag name={away.name} flagEmoji={away.flag} size={20} />
                                <span className="team-name">{away.name}</span>
                              </>
                            ) : (
                              <>
                                <span className="team-flag-placeholder">🏳️</span>
                                <span className="team-name placeholder">{match.awayTeamPlaceholder || 'A definir'}</span>
                              </>
                            )}
                            <span className="team-score">{match.awayGoals !== null ? match.awayGoals : '-'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
