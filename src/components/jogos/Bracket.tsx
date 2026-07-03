'use client';

import { useMemo, useState } from 'react';
import { Trophy, Medal, Maximize2, Minimize2 } from 'lucide-react';
import { getTeamById } from '@/data/teams';
import { TeamFlag } from '@/components/ui/TeamFlag';
import type { Match, MatchStage, MatchStatus } from '@/lib/types';
import { formatKickoffDate, formatKickoffTime } from '@/lib/datetime';
import { AnimatePresence, motion } from 'framer-motion';
import './bracket.css';

type ViewMode = 'focus' | 'full';

const STAGES: { key: MatchStage; label: string; short: string; count: number }[] = [
  { key: 'round-of-32', label: '16 Avos', short: '16 Avos', count: 16 },
  { key: 'round-of-16', label: 'Oitavas de Final', short: 'Oitavas', count: 8 },
  { key: 'quarter-final', label: 'Quartas de Final', short: 'Quartas', count: 4 },
  { key: 'semi-final', label: 'Semifinais', short: 'Semis', count: 2 },
  { key: 'final', label: 'Final', short: 'Final', count: 1 },
];

const STAGE_ORDER: MatchStage[] = STAGES.map((s) => s.key);

const EASE_CUBIC: [number, number, number, number] = [0.16, 1, 0.3, 1];

function feederNum(placeholder?: string | null): number | null {
  if (!placeholder) return null;
  const hit = placeholder.match(/^(?:Vencedor|Perdedor) do Jogo (\d+)$/i);
  return hit ? Number(hit[1]) : null;
}

function computeBracketOrder(matches: Match[]): Map<string, number> {
  const byNum = new Map(matches.map((m) => [m.matchNumber, m]));
  const order = new Map<string, number>();
  let pos = 0;

  function traverse(matchNum: number) {
    const m = byNum.get(matchNum);
    if (!m) return;
    const hn = feederNum(m.homeTeamPlaceholder);
    const an = feederNum(m.awayTeamPlaceholder);
    if (hn) traverse(hn);
    order.set(m.id, pos++);
    if (an) traverse(an);
  }

  const finalMatch = matches.find((m) => m.stage === 'final');
  if (finalMatch) traverse(finalMatch.matchNumber);

  const thirdPlace = matches.find((m) => m.stage === 'third-place');
  if (thirdPlace && !order.has(thirdPlace.id)) order.set(thirdPlace.id, pos++);

  return order;
}

function abbrevPlaceholder(placeholder?: string | null): string {
  if (!placeholder) return 'TBD';
  const win = placeholder.match(/^Vencedor do Jogo (\d+)$/i);
  if (win) return `W${win[1]}`;
  const lose = placeholder.match(/^Perdedor do Jogo (\d+)$/i);
  if (lose) return `L${lose[1]}`;
  return placeholder;
}

function getActiveStage(matches: Match[]): MatchStage {
  const stagesWithStatus = new Map<MatchStage, MatchStatus[]>();
  for (const m of matches) {
    if (!STAGE_ORDER.includes(m.stage)) continue;
    const list = stagesWithStatus.get(m.stage) ?? [];
    list.push(m.status);
    stagesWithStatus.set(m.stage, list);
  }

  for (const stage of STAGE_ORDER) {
    const statuses = stagesWithStatus.get(stage) ?? [];
    if (statuses.includes('live')) return stage;
  }

  for (const stage of STAGE_ORDER) {
    const statuses = stagesWithStatus.get(stage) ?? [];
    if (statuses.some((s) => s !== 'finished')) return stage;
  }

  return 'final';
}

const FOCUS_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.05 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.25, ease: EASE_CUBIC },
    },
  },
  card: {
    hidden: { opacity: 0, y: 24, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.45, ease: EASE_CUBIC },
    },
    exit: {
      opacity: 0,
      y: -16,
      scale: 0.98,
      transition: { duration: 0.25, ease: EASE_CUBIC },
    },
  },
};

const FULL_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.02 },
    },
    exit: { opacity: 0, transition: { duration: 0.3 } },
  },
  card: {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4, ease: EASE_CUBIC },
    },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  },
};

function FocusMatchCard({
  match,
  isFinal,
  isThird,
  onClick,
}: {
  match: Match;
  isFinal?: boolean;
  isThird?: boolean;
  onClick: (match: Match) => void;
}) {
  const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null;
  const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null;

  const teamRow = (
    team: typeof home,
    placeholder?: string,
    goals: number | null = null,
    penalties?: number | null,
    isWinner?: boolean,
  ) => (
    <div className={`bracket-focus-team${isWinner ? ' winner' : ''}`}>
      <div className="bracket-focus-team-left">
        {team ? (
          <>
            <TeamFlag name={team.name} flagEmoji={team.flag} size={isFinal ? 40 : 32} />
            <span className="bracket-focus-team-name">{team.name}</span>
          </>
        ) : (
          <>
            <span className="bracket-focus-flag-placeholder">🏳️</span>
            <span className="bracket-focus-team-name placeholder">{placeholder || 'A definir'}</span>
          </>
        )}
      </div>
      <span className="bracket-focus-score">
        {goals !== null ? goals : '—'}
        {match.status === 'finished' && penalties != null && (
          <span className="bracket-focus-pen">({penalties})</span>
        )}
      </span>
    </div>
  );

  const homeWinner =
    match.status === 'finished' && match.homeGoals != null && match.awayGoals != null
      ? match.homeGoals > match.awayGoals ||
        (match.homeGoals === match.awayGoals && (match.homePenalties ?? 0) > (match.awayPenalties ?? 0))
      : false;

  const awayWinner =
    match.status === 'finished' && match.homeGoals != null && match.awayGoals != null
      ? match.awayGoals > match.homeGoals ||
        (match.homeGoals === match.awayGoals && (match.awayPenalties ?? 0) > (match.homePenalties ?? 0))
      : false;

  return (
    <motion.div
      variants={FOCUS_VARIANTS.card}
      className={`glass-card bracket-focus-card${isFinal ? ' bracket-final-card' : ''}${isThird ? ' bracket-third-card' : ''}`}
      onClick={() => onClick(match)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(match)}
    >
      {isFinal && (
        <div className="bracket-final-ribbon">
          <Trophy size={16} />
          FINAL
        </div>
      )}
      {isThird && (
        <div className="bracket-third-ribbon">
          <Medal size={14} />
          3º Lugar
        </div>
      )}
      <div className="bracket-focus-card-header">
        <span className="bracket-focus-card-num">#{match.matchNumber}</span>
        {match.status === 'live' && (
          <span className="bracket-focus-live">
            <span className="bracket-focus-live-dot" /> AO VIVO
          </span>
        )}
        {match.status === 'finished' && (
          <span className="bracket-focus-finished">Encerrado</span>
        )}
      </div>
      <div className="bracket-focus-teams">
        {teamRow(home, match.homeTeamPlaceholder, match.homeGoals, match.homePenalties, homeWinner)}
        {teamRow(away, match.awayTeamPlaceholder, match.awayGoals, match.awayPenalties, awayWinner)}
      </div>
      <div className="bracket-focus-meta">
        <span>{formatKickoffDate(match.dateUTC)}</span>
        <span>·</span>
        <span>{formatKickoffTime(match.dateUTC)}</span>
      </div>
    </motion.div>
  );
}

function CompactMatchCard({ match, onClick }: { match: Match; onClick: (match: Match) => void }) {
  const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null;
  const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null;

  const teamRow = (team: typeof home, placeholder?: string, goals: number | null = null) => (
    <div className="bracket-full-team">
      <div className="bracket-full-team-left">
        {team ? (
          <>
            <TeamFlag name={team.name} flagEmoji={team.flag} size={20} />
            <span className="bracket-full-code">{team.code}</span>
          </>
        ) : (
          <>
            <span className="bracket-full-flag-placeholder">🏳️</span>
            <span className="bracket-full-code placeholder">{abbrevPlaceholder(placeholder)}</span>
          </>
        )}
      </div>
      <span className="bracket-full-score">{goals !== null ? goals : '—'}</span>
    </div>
  );

  return (
    <motion.div
      variants={FULL_VARIANTS.card}
      className={`glass-card bracket-full-card${match.stage === 'final' ? ' bracket-full-final' : ''}${match.stage === 'third-place' ? ' bracket-full-third' : ''}`}
      onClick={() => onClick(match)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(match)}
    >
      <div className="bracket-full-header">
        <span>#{match.matchNumber}</span>
        {match.status === 'live' && <span className="bracket-full-live">●</span>}
      </div>
      {teamRow(home, match.homeTeamPlaceholder, match.homeGoals)}
      {teamRow(away, match.awayTeamPlaceholder, match.awayGoals)}
    </motion.div>
  );
}

export function Bracket({
  matches,
  onMatchClick,
}: {
  matches: Match[];
  onMatchClick?: (stage: MatchStage) => void;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('focus');
  const [activeStage, setActiveStage] = useState<MatchStage>(() => getActiveStage(matches));

  const bracketOrder = useMemo(() => computeBracketOrder(matches), [matches]);

  const stageData = useMemo(() => {
    const byStage = new Map<MatchStage, Match[]>();
    for (const stage of STAGE_ORDER) {
      const list = matches
        .filter((m) => m.stage === stage)
        .sort((a, b) => (bracketOrder.get(a.id) ?? 0) - (bracketOrder.get(b.id) ?? 0));
      byStage.set(stage, list);
    }
    const thirdPlace = matches.filter((m) => m.stage === 'third-place');
    return { byStage, thirdPlace };
  }, [matches, bracketOrder]);

  const handleMatchClick = (match: Match) => {
    onMatchClick?.(match.stage);
  };

  const handleStageClick = (stage: MatchStage) => {
    setActiveStage(stage);
    if (viewMode === 'full') setViewMode('focus');
  };

  const currentMatches = stageData.byStage.get(activeStage) ?? [];
  const isFinalStage = activeStage === 'final';

  return (
    <div className="bracket-shell">
      <div className="bracket-roundnav">
        {STAGES.map((s) => {
          const isActive = activeStage === s.key;
          const hasMatches = (stageData.byStage.get(s.key)?.length ?? 0) > 0;
          return (
            <button
              key={s.key}
              className={`bracket-roundnav-btn${isActive ? ' active' : ''}${!hasMatches ? ' disabled' : ''}`}
              onClick={() => hasMatches && handleStageClick(s.key)}
              disabled={!hasMatches}
            >
              {viewMode === 'full' ? s.short : s.label}
              <span className="bracket-roundnav-count">{s.count}</span>
            </button>
          );
        })}
      </div>

      <button
        className="bracket-toggle-btn"
        onClick={() => setViewMode(viewMode === 'focus' ? 'full' : 'focus')}
      >
        {viewMode === 'focus' ? (
          <>
            <Maximize2 size={14} /> Ver bracket completo
          </>
        ) : (
          <>
            <Minimize2 size={14} /> Focar etapa
          </>
        )}
      </button>

      <div className="bracket-content">
        <AnimatePresence mode="wait">
          {viewMode === 'focus' ? (
            <motion.div
              key={`focus-${activeStage}`}
              variants={FOCUS_VARIANTS.container}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bracket-focus-view"
            >
              {isFinalStage ? (
                <div className="bracket-focus-final-area">
                  <div className="bracket-focus-final-wrapper">
                    {currentMatches
                      .filter((m) => m.stage === 'final')
                      .map((match) => (
                        <FocusMatchCard
                          key={match.id}
                          match={match}
                          isFinal
                          onClick={handleMatchClick}
                        />
                      ))}
                  </div>
                  <div className="bracket-focus-third-wrapper">
                    {stageData.thirdPlace.map((match) => (
                      <FocusMatchCard
                        key={match.id}
                        match={match}
                        isThird
                        onClick={handleMatchClick}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`bracket-focus-grid bracket-grid-${activeStage.replace(/-/g, '')}`}>
                  {currentMatches.map((match) => (
                    <FocusMatchCard
                      key={match.id}
                      match={match}
                      onClick={handleMatchClick}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="full"
              variants={FULL_VARIANTS.container}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bracket-full-view"
            >
              <div className="bracket-full-columns">
                {STAGES.map((s) => {
                  const colMatches = stageData.byStage.get(s.key) ?? [];
                  const isLast = s.key === 'final';
                  return (
                    <div key={s.key} className="bracket-full-column">
                      <div className="bracket-full-column-title">{s.label}</div>
                      <div className={`bracket-full-column-matches${isLast ? ' is-final' : ''}`}>
                        {colMatches.map((match) => (
                          <div key={match.id} className={`bracket-full-card-wrapper stage-${match.stage}`}>
                            <CompactMatchCard
                              match={match}
                              onClick={handleMatchClick}
                            />
                          </div>
                        ))}
                        {isLast &&
                          stageData.thirdPlace.map((match) => (
                            <div key={match.id} className={`bracket-full-card-wrapper stage-${match.stage}`}>
                              <CompactMatchCard
                                match={match}
                                onClick={handleMatchClick}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
