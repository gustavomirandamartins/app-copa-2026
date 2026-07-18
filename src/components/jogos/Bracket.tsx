'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Trophy, Medal, Maximize2 } from 'lucide-react';
import { getTeamById } from '@/data/teams';
import { TeamFlag } from '@/components/ui/TeamFlag';
import type { Match, MatchStage } from '@/lib/types';
import { motion } from 'framer-motion';
import './bracket.css';

const PAD = 48;

const KO_STAGES: KnockoutStage[] = ['round-of-32', 'round-of-16', 'quarter-final', 'semi-final'];
type KnockoutStage = 'round-of-32' | 'round-of-16' | 'quarter-final' | 'semi-final';

const STAGE_PILLS: { key: MatchStage; label: string }[] = [
  { key: 'round-of-32', label: '16 Avos' },
  { key: 'round-of-16', label: 'Oitavas' },
  { key: 'quarter-final', label: 'Quartas' },
  { key: 'semi-final', label: 'Semis' },
  { key: 'final', label: 'Final' },
];

function feederNum(placeholder?: string | null): number | null {
  if (!placeholder) return null;
  const hit = placeholder.match(/^(?:Vencedor|Perdedor) do Jogo (\d+)$/i);
  return hit ? Number(hit[1]) : null;
}

function abbrevPlaceholder(placeholder?: string | null): string {
  if (!placeholder) return 'TBD';
  const win = placeholder.match(/^Vencedor do Jogo (\d+)$/i);
  if (win) return `W${win[1]}`;
  const lose = placeholder.match(/^Perdedor do Jogo (\d+)$/i);
  if (lose) return `L${lose[1]}`;
  return placeholder;
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

  function expand(matchNum: number, side: 'left' | 'right') {
    const m = byNum.get(matchNum);
    if (!m) return;
    const hn = feederNum(m.homeTeamPlaceholder);
    const an = feederNum(m.awayTeamPlaceholder);
    if (hn) expand(hn, side);
    if (KO_STAGES.includes(m.stage as KnockoutStage)) {
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

  for (const stage of KO_STAGES) right[stage].reverse();

  const thirdPlace = matches.find((m) => m.stage === 'third-place') ?? null;
  return { left, right, final: finalMatch, thirdPlace };
}

/** Partidas que devem ficar destacadas quando um matchId é focado. */
function getFocusContext(focusId: string, matches: Match[]): Set<string> {
  const ids = new Set<string>([focusId]);
  const match = matches.find((m) => m.id === focusId);
  if (!match) return ids;

  //.próximo confronto (para onde o vencedor vai)
  const next = matches.find((m) => {
    const h = feederNum(m.homeTeamPlaceholder);
    const a = feederNum(m.awayTeamPlaceholder);
    return (h === match.matchNumber && /^Vencedor/i.test(m.homeTeamPlaceholder ?? ''))
        || (a === match.matchNumber && /^Vencedor/i.test(m.awayTeamPlaceholder ?? ''));
  });
  if (next) ids.add(next.id);

  // alimentadores (de onde veio)
  const hn = feederNum(match.homeTeamPlaceholder);
  const an = feederNum(match.awayTeamPlaceholder);
  if (hn) { const f = matches.find((m) => m.matchNumber === hn); if (f) ids.add(f.id); }
  if (an) { const f = matches.find((m) => m.matchNumber === an); if (f) ids.add(f.id); }

  return ids;
}

// ─── Card compacto (usado em toda a árvore) ───────────────────────
function BracketCard({
  match,
  isFinal,
  isThird,
  isMuted,
  onClick,
  cardRef,
}: {
  match: Match;
  isFinal?: boolean;
  isThird?: boolean;
  isMuted?: boolean;
  onClick: (match: Match) => void;
  cardRef?: (el: HTMLDivElement | null) => void;
}) {
  const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null;
  const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null;

  const teamRow = (team: typeof home, placeholder?: string, goals: number | null = null) => (
    <div className="bracket-tree-team">
      <div className="bracket-tree-team-left">
        {team ? (
          <>
            <TeamFlag name={team.name} flagEmoji={team.flag} size={isFinal ? 24 : 18} />
            <span className="bracket-tree-code">{isFinal || isThird ? team.code : team.code}</span>
          </>
        ) : (
          <>
            <span className="bracket-tree-flag-placeholder">🏳️</span>
            <span className="bracket-tree-code placeholder">{abbrevPlaceholder(placeholder)}</span>
          </>
        )}
      </div>
      <span className="bracket-tree-score">{goals !== null ? goals : '—'}</span>
    </div>
  );

  return (
    <div
      ref={cardRef}
      className={`bracket-tree-card${isFinal ? ' is-final' : ''}${isThird ? ' is-third' : ''}${isMuted ? ' muted' : ''}`}
      onClick={() => onClick(match)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(match)}
    >
      {isFinal && (
        <div className="bracket-tree-final-badge"><Trophy size={11} /> FINAL</div>
      )}
      {isThird && (
        <div className="bracket-tree-third-badge"><Medal size={10} /> 3º</div>
      )}
      <div className="bracket-tree-header">
        <span>#{match.matchNumber}</span>
        {match.status === 'live' && <span className="bracket-tree-live">●</span>}
      </div>
      {teamRow(home, match.homeTeamPlaceholder, match.homeGoals)}
      {teamRow(away, match.awayTeamPlaceholder, match.awayGoals)}
    </div>
  );
}

export function Bracket({
  matches,
  onMatchClick,
  defaultFocus = null,
}: {
  matches: Match[];
  onMatchClick?: (match: Match) => void;
  /** Foco inicial (ex.: "stage-final") — null mostra a árvore inteira. */
  defaultFocus?: string | null;
}) {
  const [focus, setFocus] = useState<string | null>(defaultFocus);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const cameraRef = useRef(camera);

  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const sides = useMemo(() => buildBracketSides(matches), [matches]);
  const focusHighlight = useMemo(() => {
    if (!focus || focus.startsWith('stage-')) return null;
    return getFocusContext(focus, matches);
  }, [focus, matches]);

  // ── Cálculo do transform da câmera ──────────────────────────────
  const localRect = useCallback((el: HTMLElement) => {
    const canvas = canvasRef.current!;
    const er = el.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();
    const s = cameraRef.current.scale || 1;
    return { x: (er.left - cr.left) / s, y: (er.top - cr.top) / s, w: er.width / s, h: er.height / s };
  }, []);

  const computeCamera = useCallback((): { x: number; y: number; scale: number } => {
    const vp = viewportRef.current;
    const canvas = canvasRef.current;
    if (!vp || !canvas) return { x: 0, y: 0, scale: 1 };

    if (!focus) {
      const scale = Math.min(
        (vp.clientWidth - PAD) / canvas.offsetWidth,
        (vp.clientHeight - PAD) / canvas.offsetHeight,
      ) || 1;
      const cx = canvas.offsetWidth / 2;
      const cy = canvas.offsetHeight / 2;
      return { scale, x: vp.clientWidth / 2 - cx * scale, y: vp.clientHeight / 2 - cy * scale };
    }

    if (focus.startsWith('stage-')) {
      const stage = focus.slice(6) as MatchStage;
      const els: HTMLElement[] = [];
      matchRefs.current.forEach((el, id) => {
        const m = matches.find((mm) => mm.id === id);
        if (m && m.stage === stage) els.push(el);
      });
      if (!els.length) return cameraRef.current;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const el of els) {
        const r = localRect(el);
        minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h);
      }
      const rect = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      const fit = Math.min((vp.clientWidth - PAD) / rect.w, (vp.clientHeight - PAD) / rect.h);
      const scale = Math.min(1.2, fit);
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      return { scale, x: vp.clientWidth / 2 - cx * scale, y: vp.clientHeight / 2 - cy * scale };
    }

    // Foco numa partida específica: amplia com contexto (3× largura, 2× altura)
    const el = matchRefs.current.get(focus);
    if (!el) return cameraRef.current;
    const r = localRect(el);
    const contextW = r.w * 3.5;
    const contextH = r.h * 2.5;
    const fit = Math.min((vp.clientWidth - PAD) / contextW, (vp.clientHeight - PAD) / contextH);
    const scale = Math.min(2.2, fit);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    return { scale, x: vp.clientWidth / 2 - cx * scale, y: vp.clientHeight / 2 - cy * scale };
  }, [focus, matches, localRect]);

  useLayoutEffect(() => {
    const next = computeCamera();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCamera(next);
    cameraRef.current = next;
  }, [computeCamera]);

  // Reenquadra ao redimensionar
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) { first = false; return; }
      const next = computeCamera();
      setCamera(next);
      cameraRef.current = next;
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, [computeCamera]);

  // ── Interação ────────────────────────────────────────────────────
  const handleStageClick = (stage: MatchStage) => {
    setFocus((prev) => (prev === `stage-${stage}` ? null : `stage-${stage}`));
  };

  const handleMatchClick = (match: Match) => {
    if (focus === match.id) {
      onMatchClick?.(match);
    } else {
      setFocus(match.id);
    }
  };

  const isMuted = (matchId: string, stage: MatchStage): boolean => {
    if (!focus) return false;
    if (focus.startsWith('stage-')) {
      return focus.slice(6) !== stage;
    }
    return !focusHighlight?.has(matchId);
  };

  return (
    <div className="bracket-shell">
      {/* Pills de etapa + Ver tudo */}
      <div className="bracket-roundnav">
        {STAGE_PILLS.map((s) => (
          <button
            key={s.key}
            className={`bracket-roundnav-btn${focus === `stage-${s.key}` ? ' active' : ''}`}
            onClick={() => handleStageClick(s.key)}
          >
            {s.label}
          </button>
        ))}
        <button
          className="bracket-overview-btn"
          onClick={() => setFocus(null)}
        >
          <Maximize2 size={14} /> Ver tudo
        </button>
      </div>

      {/* Viewport com câmera spring */}
      <div ref={viewportRef} className="bracket-viewport">
        <motion.div
          ref={canvasRef}
          className="bracket-canvas"
          animate={{ x: camera.x, y: camera.y, scale: camera.scale }}
          transition={{ type: 'spring', stiffness: 180, damping: 26, mass: 0.8 }}
          style={{ transformOrigin: '0 0' }}
        >
          <div className="bracket-tree">
            {/* Metade esquerda */}
            <div className="bracket-tree-half bracket-tree-left">
              {KO_STAGES.map((stage, stageIdx) => {
                const flexVal = Math.pow(2, stageIdx);
                return (
                  <div key={stage} className="bracket-tree-column">
                    <div className="bracket-tree-col-title">
                      {STAGE_PILLS.find((s) => s.key === stage)?.label}
                    </div>
                    <div className="bracket-tree-col-matches">
                      {sides.left[stage].map((match, matchIdx) => (
                        <div
                          key={match.id}
                          className={`bracket-tree-match-wrapper ${matchIdx % 2 === 0 ? 'pair-top' : 'pair-bot'}`}
                          style={{ flexGrow: flexVal, flexShrink: 0, flexBasis: 0 }}
                        >
                          <BracketCard
                            match={match}
                            isMuted={isMuted(match.id, match.stage)}
                            onClick={handleMatchClick}
                            cardRef={(el) => { if (el) matchRefs.current.set(match.id, el); }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Centro: Final + 3º lugar */}
            <div className="bracket-tree-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- asset
                  decorativo pequeno do Supabase Storage; next/image exigiria
                  dimensões fixas/loader sem ganho real aqui. */}
              <img
                src="https://sdyilmgixyynnmczsnhc.supabase.co/storage/v1/object/public/logos/trofeufifa.avif"
                alt="Troféu da Copa do Mundo FIFA"
                className="bracket-tree-trophy"
              />
              {sides.final && (
                <BracketCard
                  match={sides.final}
                  isFinal
                  isMuted={isMuted(sides.final.id, 'final')}
                  onClick={handleMatchClick}
                  cardRef={(el) => { if (el) matchRefs.current.set(sides.final!.id, el); }}
                />
              )}
              {sides.thirdPlace && (
                <BracketCard
                  match={sides.thirdPlace}
                  isThird
                  isMuted={isMuted(sides.thirdPlace.id, 'third-place')}
                  onClick={handleMatchClick}
                  cardRef={(el) => { if (el) matchRefs.current.set(sides.thirdPlace!.id, el); }}
                />
              )}
            </div>

            {/* Metade direita (espelhada) */}
            <div className="bracket-tree-half bracket-tree-right">
              {[...KO_STAGES].reverse().map((stage, stageIdx) => {
                const flexVal = Math.pow(2, stageIdx);
                return (
                  <div key={stage} className="bracket-tree-column">
                    <div className="bracket-tree-col-title">
                      {STAGE_PILLS.find((s) => s.key === stage)?.label}
                    </div>
                    <div className="bracket-tree-col-matches">
                      {sides.right[stage].map((match, matchIdx) => (
                        <div
                          key={match.id}
                          className={`bracket-tree-match-wrapper ${matchIdx % 2 === 0 ? 'pair-top' : 'pair-bot'}`}
                          style={{ flexGrow: flexVal, flexShrink: 0, flexBasis: 0 }}
                        >
                          <BracketCard
                            match={match}
                            isMuted={isMuted(match.id, match.stage)}
                            onClick={handleMatchClick}
                            cardRef={(el) => { if (el) matchRefs.current.set(match.id, el); }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}