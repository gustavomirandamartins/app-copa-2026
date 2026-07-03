'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { getTeamById } from '@/data/teams';
import { TeamFlag } from '@/components/ui/TeamFlag';
import type { Match, MatchStage, MatchStatus } from '@/lib/types';
import { AnimatePresence, motion } from 'framer-motion';
import './bracket.css';

type ViewMode = 'focus' | 'full';
type Side = 'left' | 'right';

type KnockoutStage = 'round-of-32' | 'round-of-16' | 'quarter-final' | 'semi-final';

const STAGES: { key: MatchStage; label: string; short: string; count: number }[] = [
  { key: 'round-of-32', label: '16 Avos', short: '16 Avos', count: 16 },
  { key: 'round-of-16', label: 'Oitavas de Final', short: 'Oitavas', count: 8 },
  { key: 'quarter-final', label: 'Quartas de Final', short: 'Quartas', count: 4 },
  { key: 'semi-final', label: 'Semifinais', short: 'Semis', count: 2 },
  { key: 'final', label: 'Final', short: 'Final', count: 1 },
];

const STAGE_ORDER: MatchStage[] = STAGES.map((s) => s.key);
const KO_STAGE_ORDER: KnockoutStage[] = ['round-of-32', 'round-of-16', 'quarter-final', 'semi-final'];

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

interface BracketHalf {
  'round-of-32': Match[];
  'round-of-16': Match[];
  'quarter-final': Match[];
  'semi-final': Match[];
}

interface BracketSides {
  left: BracketHalf;
  right: BracketHalf;
  final: Match | null;
  thirdPlace: Match | null;
}

function buildBracketSides(matches: Match[]): BracketSides {
  const byNum = new Map(matches.map((m) => [m.matchNumber, m]));
  const left: BracketHalf = { 'round-of-32': [], 'round-of-16': [], 'quarter-final': [], 'semi-final': [] };
  const right: BracketHalf = { 'round-of-32': [], 'round-of-16': [], 'quarter-final': [], 'semi-final': [] };

  function expand(matchNum: number, side: Side) {
    const m = byNum.get(matchNum);
    if (!m) return;
    const hn = feederNum(m.homeTeamPlaceholder);
    const an = feederNum(m.awayTeamPlaceholder);
    if (hn) expand(hn, side);
    if (KO_STAGE_ORDER.includes(m.stage as KnockoutStage)) {
      (side === 'left' ? left : right)[m.stage as KnockoutStage].push(m);
    }
    if (an) expand(an, side);
  }

  const finalMatch = matches.find((m) => m.stage === 'final') ?? null;
  if (finalMatch) {
    const hn = feederNum(finalMatch.homeTeamPlaceholder);
    const an = feederNum(finalMatch.awayTeamPlaceholder);
    if (hn) expand(hn, 'left');
    if (an) expand(an, 'right');
  }

  for (const stage of KO_STAGE_ORDER) {
    right[stage].reverse();
  }

  const thirdPlace = matches.find((m) => m.stage === 'third-place') ?? null;
  return { left, right, final: finalMatch, thirdPlace };
}

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

const FOCUS_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: 0.02 },
    },
    exit: { opacity: 0, transition: { duration: 0.25 } },
  },
  column: {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: EASE_CUBIC },
    },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  },
};

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

/** Coluna de uma etapa usada tanto no Modo Foco quanto no Modo Completo mobile. */
function BracketStageColumn({
  stage,
  matches,
  thirdPlace,
  isSelected,
  onMatchClick,
  columnRef,
}: {
  stage: MatchStage;
  matches: Match[];
  thirdPlace?: Match[];
  isSelected: boolean;
  onMatchClick: (match: Match) => void;
  columnRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <motion.div
      variants={FOCUS_VARIANTS.column}
      ref={columnRef}
      className={`bracket-stage-column${isSelected ? ' is-selected' : ''}`}
      data-stage={stage}
    >
      <div className="bracket-stage-title">{STAGES.find((s) => s.key === stage)?.label}</div>
      <div className={`bracket-stage-matches${stage === 'final' ? ' is-final' : ''}`}>
        {matches.map((match) => (
          <div key={match.id} className={`bracket-full-card-wrapper stage-${match.stage}`}>
            <CompactMatchCard match={match} onClick={onMatchClick} />
          </div>
        ))}
        {stage === 'final' &&
          thirdPlace?.map((match) => (
            <div key={match.id} className={`bracket-full-card-wrapper stage-${match.stage}`}>
              <CompactMatchCard match={match} onClick={onMatchClick} />
            </div>
          ))}
      </div>
    </motion.div>
  );
}

/** Visualização desktop do bracket completo: esquerda / centro / direita. */
function DesktopFullBracket({
  sides,
  onMatchClick,
}: {
  sides: BracketSides;
  onMatchClick: (match: Match) => void;
}) {
  return (
    <div className="bracket-full-desktop">
      <div className="bracket-full-desktop-half bracket-full-desktop-left">
        {KO_STAGE_ORDER.map((stage) => (
          <div key={stage} className="bracket-full-desktop-column">
            <div className="bracket-full-desktop-stage-title">
              {STAGES.find((s) => s.key === stage)?.label}
            </div>
            <div className="bracket-full-desktop-matches">
              {sides.left[stage].map((match) => (
                <div key={match.id} className={`bracket-full-card-wrapper stage-${match.stage}`}>
                  <CompactMatchCard match={match} onClick={onMatchClick} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bracket-full-desktop-center">
        {sides.final && (
          <div className="bracket-full-card-wrapper stage-final">
            <CompactMatchCard match={sides.final} onClick={onMatchClick} />
          </div>
        )}
        {sides.thirdPlace && (
          <div className="bracket-full-card-wrapper stage-third-place">
            <CompactMatchCard match={sides.thirdPlace} onClick={onMatchClick} />
          </div>
        )}
      </div>

      <div className="bracket-full-desktop-half bracket-full-desktop-right">
        {[...KO_STAGE_ORDER].reverse().map((stage) => (
          <div key={stage} className="bracket-full-desktop-column">
            <div className="bracket-full-desktop-stage-title">
              {STAGES.find((s) => s.key === stage)?.label}
            </div>
            <div className="bracket-full-desktop-matches">
              {sides.right[stage].map((match) => (
                <div key={match.id} className={`bracket-full-card-wrapper stage-${match.stage}`}>
                  <CompactMatchCard match={match} onClick={onMatchClick} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Bracket({
  matches,
  onMatchClick,
}: {
  matches: Match[];
  onMatchClick?: (match: Match) => void;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('focus');
  const [activeStage, setActiveStage] = useState<MatchStage>(() => getActiveStage(matches));
  const focusTrackRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Map<MatchStage, HTMLDivElement>>(new Map());

  const bracketOrder = useMemo(() => computeBracketOrder(matches), [matches]);
  const sides = useMemo(() => buildBracketSides(matches), [matches]);

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
    onMatchClick?.(match);
  };

  const handleStageClick = (stage: MatchStage) => {
    setActiveStage(stage);
    if (viewMode === 'full') setViewMode('focus');
  };

  // No Modo Foco, centraliza suavemente a coluna da etapa selecionada.
  useEffect(() => {
    if (viewMode !== 'focus') return;
    const el = columnRefs.current.get(activeStage);
    const track = focusTrackRef.current;
    if (!el || !track) return;
    const trackRect = track.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const scrollLeft = el.offsetLeft - (trackRect.width - elRect.width) / 2;
    track.scrollTo({ left: scrollLeft, behavior: 'smooth' });
  }, [activeStage, viewMode]);

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
              key="focus"
              variants={FOCUS_VARIANTS.container}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bracket-focus-view"
            >
              <div ref={focusTrackRef} className="bracket-focus-track">
                {STAGES.map((s) => (
                  <BracketStageColumn
                    key={s.key}
                    stage={s.key}
                    matches={stageData.byStage.get(s.key) ?? []}
                    thirdPlace={s.key === 'final' ? stageData.thirdPlace : undefined}
                    isSelected={activeStage === s.key}
                    onMatchClick={handleMatchClick}
                    columnRef={(el) => {
                      if (el) columnRefs.current.set(s.key, el);
                      else columnRefs.current.delete(s.key);
                    }}
                  />
                ))}
              </div>
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
              <div className="bracket-full-mobile">
                <div className="bracket-full-columns">
                  {STAGES.map((s) => (
                    <BracketStageColumn
                      key={s.key}
                      stage={s.key}
                      matches={stageData.byStage.get(s.key) ?? []}
                      thirdPlace={s.key === 'final' ? stageData.thirdPlace : undefined}
                      isSelected={false}
                      onMatchClick={handleMatchClick}
                    />
                  ))}
                </div>
              </div>
              <div className="bracket-full-desktop">
                <DesktopFullBracket sides={sides} onMatchClick={handleMatchClick} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
