import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { getTeamById } from '@/data/teams';
import { TeamFlag } from '@/components/ui/TeamFlag';
import type { Match, MatchStage } from '@/lib/types';
import './bracket.css';

type Transform = { scale: number; x: number; y: number };

// Espaçamento de respiro ao enquadrar (em px do espaço de tela).
const PAD = 48;
// Escala alvo ao focar uma única partida (tamanho confortável de leitura).
const MATCH_FOCUS_SCALE = 1.15;

/**
 * Traversal in-order da árvore do chaveamento a partir da Final, para que
 * cada rodada mostre os jogos na ordem visual correta (pares que se alimentam
 * do mesmo jogo seguinte ficam adjacentes, com linhas de bracket corretas).
 *
 * Sem isso, ordenar por matchNumber quebra o bracket: jogos atribuídos por
 * data de disputa, não por posição no chaveamento.
 */
function computeBracketOrder(matches: Match[]): Map<string, number> {
  const byNum = new Map(matches.map((m) => [m.matchNumber, m]));

  function feederNum(placeholder?: string | null): number | null {
    if (!placeholder) return null;
    const hit = placeholder.match(/^(?:Vencedor|Perdedor) do Jogo (\d+)$/i);
    return hit ? Number(hit[1]) : null;
  }

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

  // 3º lugar não está na árvore da Final — adiciona ao final
  const thirdPlace = matches.find((m) => m.stage === 'third-place');
  if (thirdPlace && !order.has(thirdPlace.id)) order.set(thirdPlace.id, pos++);

  return order;
}

export function Bracket({ matches, onMatchClick }: { matches: Match[], onMatchClick?: (stage: MatchStage) => void }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const matchRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Transform aplicado ao canvas. Espelhado num ref para leituras síncronas
  // (medições com getBoundingClientRect precisam da escala corrente).
  const [transform, setTransformState] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const transformRef = useRef<Transform>(transform);
  const setTransform = useCallback((t: Transform) => {
    transformRef.current = t;
    setTransformState(t);
  }, []);

  const [focused, setFocused] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  // --- Drag para deslocar livremente (sem pinça) ---
  const dragRef = useRef<{
    active: boolean; moved: boolean; startX: number; startY: number; baseX: number; baseY: number;
  }>({ active: false, moved: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  // Filtra e ordena por fase (memoizado: identidade estável evita re-subscrição
  // do ResizeObserver e laços de reenquadramento).
  // Usa traversal in-order da árvore do chaveamento — não matchNumber, que
  // reflete ordem cronológica, não posição visual no bracket.
  const columns = useMemo(() => {
    const bracketOrder = computeBracketOrder(matches);
    const by = (stage: MatchStage) =>
      matches
        .filter((m) => m.stage === stage)
        .sort((a, b) => (bracketOrder.get(a.id) ?? 0) - (bracketOrder.get(b.id) ?? 0));
    const finalCol = [
      ...by('final'),
      ...by('third-place'),
    ];
    return [
      { title: '16 Avos', stage: 'round-of-32' as MatchStage, matches: by('round-of-32') },
      { title: 'Oitavas', stage: 'round-of-16' as MatchStage, matches: by('round-of-16') },
      { title: 'Quartas', stage: 'quarter-final' as MatchStage, matches: by('quarter-final') },
      { title: 'Semifinais', stage: 'semi-final' as MatchStage, matches: by('semi-final') },
      { title: 'Final / 3º Lugar', stage: 'final' as MatchStage, matches: finalCol },
    ];
  }, [matches]);

  // Retângulo de um elemento no espaço de layout (sem transform) do canvas.
  const localRect = useCallback((el: HTMLElement) => {
    const canvas = canvasRef.current!;
    const er = el.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();
    const s = transformRef.current.scale || 1;
    return { x: (er.left - cr.left) / s, y: (er.top - cr.top) / s, w: er.width / s, h: er.height / s };
  }, []);

  // Calcula o transform que enquadra um retângulo local (centro no viewport)
  // na escala desejada (limitada ao que cabe no viewport).
  const frameRect = useCallback(
    (rect: { x: number; y: number; w: number; h: number }, desiredScale: number) => {
      const vp = viewportRef.current!;
      const vpW = vp.clientWidth;
      const vpH = vp.clientHeight;
      const fit = Math.min((vpW - PAD) / rect.w, (vpH - PAD) / rect.h);
      const scale = Math.min(desiredScale, fit);
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      return { scale, x: vpW / 2 - cx * scale, y: vpH / 2 - cy * scale };
    },
    [],
  );

  const animateTo = useCallback((t: Transform) => {
    setAnimating(true);
    setTransform(t);
    window.setTimeout(() => setAnimating(false), 650);
  }, [setTransform]);

  // Enquadra o bracket inteiro (visão geral).
  const showOverview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setFocused(null);
    animateTo(frameRect({ x: 0, y: 0, w: canvas.offsetWidth, h: canvas.offsetHeight }, 1));
  }, [animateTo, frameRect]);

  const focusMatch = useCallback((id: string) => {
    const el = matchRefs.current.get(id);
    if (!el) return;
    setFocused(id);
    animateTo(frameRect(localRect(el), MATCH_FOCUS_SCALE));
  }, [animateTo, frameRect, localRect]);

  // Focar uma rodada. A coluna ocupa toda a altura do bracket (os jogos ficam
  // distribuídos/centralizados), então enquadramos a CAIXA dos jogos da rodada,
  // não a coluna inteira. Numa escala legível (até 1x): se a rodada couber na
  // vertical, centralizamos; se for alta demais (ex.: 16 avos), ancoramos no
  // topo e o usuário arrasta na vertical.
  const focusColumn = useCallback((idx: number) => {
    const ids = columns[idx].matches.map((m) => m.id);
    const els = ids.map((id) => matchRefs.current.get(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    els.forEach((el) => {
      const r = localRect(el);
      minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h);
    });
    const rect = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    const vp = viewportRef.current!;
    const scale = Math.min(1, (vp.clientWidth - PAD) / rect.w);
    const cx = rect.x + rect.w / 2;
    const x = vp.clientWidth / 2 - cx * scale;
    const fitsHeight = rect.h * scale <= vp.clientHeight - PAD;
    const y = fitsHeight
      ? vp.clientHeight / 2 - (rect.y + rect.h / 2) * scale // centraliza
      : PAD / 2 - rect.y * scale;                            // ancora no topo
    setFocused(`col-${idx}`);
    animateTo({ scale, x, y });
  }, [animateTo, columns, localRect]);

  // Visão geral inicial + reenquadre ao redimensionar.
  useLayoutEffect(() => {
    showOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reaplica o foco atual; guardado num ref para o ResizeObserver assinar uma
  // única vez (evita disconnect/observe a cada render e o laço de reenquadre).
  const reframeRef = useRef<() => void>(() => {});
  useEffect(() => {
    reframeRef.current = () => {
      if (focused && focused.startsWith('col-')) focusColumn(Number(focused.slice(4)));
      else if (focused) focusMatch(focused);
      else showOverview();
    };
  });

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) { first = false; return; } // ignora o disparo inicial do observe
      reframeRef.current();
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, []);

  // --- Pointer drag (pan) ---
  // Não usamos setPointerCapture: capturar o ponteiro no viewport redireciona
  // os eventos de clique para ele e impede que os onClick dos cards disparem.
  // Em vez disso, ouvimos move/up na window enquanto o arrasto está ativo.
  const [dragging, setDragging] = useState(false);
  const onPointerDown = (e: React.PointerEvent) => {
    const t = transformRef.current;
    dragRef.current = {
      active: true, moved: false,
      startX: e.clientX, startY: e.clientY, baseX: t.x, baseY: t.y,
    };
  };
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved && Math.hypot(dx, dy) > 5) { d.moved = true; setDragging(true); }
      if (d.moved) {
        const t = transformRef.current;
        setTransform({ scale: t.scale, x: d.baseX + dx, y: d.baseY + dy });
      }
    };
    const onUp = () => {
      const d = dragRef.current;
      if (!d.active) return;
      d.active = false;
      if (d.moved) { setFocused(null); setDragging(false); }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [setTransform]);

  const handleMatchClick = (match: Match) => {
    if (dragRef.current.moved) return; // foi um arrasto, não um clique
    if (focused === match.id) {
      onMatchClick?.(match.stage); // segundo toque → abre a fase
    } else {
      focusMatch(match.id);
    }
  };

  return (
    <div className="bracket-shell">
      <div className="bracket-roundnav">
        {columns.map((col, i) => (
          <button
            key={col.title}
            className={`bracket-roundnav-btn ${focused === `col-${i}` ? 'active' : ''}`}
            onClick={() => focusColumn(i)}
          >
            {col.title}
          </button>
        ))}
      </div>

      <div
        ref={viewportRef}
        className={`bracket-viewport ${dragging ? 'dragging' : ''}`}
        onPointerDown={onPointerDown}
      >
        <div
          ref={canvasRef}
          className={`bracket-canvas ${animating ? 'animating' : ''}`}
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          <div className="bracket-columns">
            {columns.map((col, colIdx) => (
              <div
                key={col.title}
                className="bracket-column"
                ref={(el) => { if (el) columnRefs.current.set(colIdx, el); }}
              >
                <div className="bracket-column-title">{col.title}</div>
                <div className={`bracket-column-matches ${colIdx === columns.length - 1 ? 'is-final' : ''}`}>
                  {col.matches.map((match) => {
                    const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null;
                    const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null;
                    const isActive = focused === match.id;
                    const isMuted = focused !== null && !focused.startsWith('col-') && focused !== match.id;

                    return (
                      <div className={`bracket-match-wrapper stage-${match.stage}`} key={match.id}>
                        <div
                          ref={(el) => { if (el) matchRefs.current.set(match.id, el); }}
                          className={`bracket-card glass-card ${isActive ? 'active' : ''} ${isMuted ? 'muted' : ''}`}
                          onClick={() => handleMatchClick(match)}
                          role="button"
                          tabIndex={0}
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
                            <span className="team-score">
                              {match.homeGoals !== null ? match.homeGoals : '-'}
                              {match.status === 'finished' && match.homePenalties != null && (
                                <span style={{ fontSize: '0.7em', opacity: 0.7 }}> ({match.homePenalties})</span>
                              )}
                            </span>
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
                            <span className="team-score">
                              {match.awayGoals !== null ? match.awayGoals : '-'}
                              {match.status === 'finished' && match.awayPenalties != null && (
                                <span style={{ fontSize: '0.7em', opacity: 0.7 }}> ({match.awayPenalties})</span>
                              )}
                            </span>
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

        {focused !== null && (
          <button className="bracket-overview-btn" onClick={showOverview}>
            <Maximize2 size={16} />
            Ver tudo
          </button>
        )}
      </div>
    </div>
  );
}
