import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { getTeamById } from '@/data/teams';
import { TeamFlag } from '@/components/ui/TeamFlag';
import type { Match, MatchStage } from '@/lib/types';
import './bracket.css';

type Transform = { scale: number; x: number; y: number };
type Side = 'left' | 'right';

// Espaçamento de respiro ao enquadrar (em px do espaço de tela).
const PAD = 48;
// Escala alvo ao focar uma única partida (tamanho confortável de leitura).
const MATCH_FOCUS_SCALE = 1.15;

const KO_STAGES: MatchStage[] = ['round-of-32', 'round-of-16', 'quarter-final', 'semi-final'];
const STAGE_TITLES: Record<MatchStage, string> = {
  group: 'Grupos',
  'round-of-32': '16 Avos',
  'round-of-16': 'Oitavas',
  'quarter-final': 'Quartas',
  'semi-final': 'Semifinais',
  'third-place': '3º Lugar',
  final: 'Final',
};

interface BracketData {
  /** Cada rodada, com os confrontos de cada metade do chaveamento já na
   * ordem visual correta (pares que se alimentam do mesmo jogo seguinte
   * ficam adjacentes). */
  stages: Array<{ stage: MatchStage; title: string; left: Match[]; right: Match[] }>;
  finalMatch: Match | null;
  thirdPlace: Match | null;
}

function feederNum(placeholder?: string | null): number | null {
  if (!placeholder) return null;
  const hit = placeholder.match(/^(?:Vencedor|Perdedor) do Jogo (\d+)$/i);
  return hit ? Number(hit[1]) : null;
}

/**
 * Constrói as duas metades do chaveamento (esquerda/direita), espelhadas e
 * convergindo para a Final ao centro — como um chaveamento de mata-mata
 * tradicional. Faz um traversal in-order da árvore a partir dos dois
 * alimentadores da Final (não por matchNumber, que reflete ordem
 * cronológica, não posição visual no bracket).
 */
function buildBracketData(matches: Match[]): BracketData {
  const byNum = new Map(matches.map((m) => [m.matchNumber, m]));
  const buckets: Record<Side, Record<string, Match[]>> = {
    left: { 'round-of-32': [], 'round-of-16': [], 'quarter-final': [], 'semi-final': [] },
    right: { 'round-of-32': [], 'round-of-16': [], 'quarter-final': [], 'semi-final': [] },
  };

  function expand(matchNum: number, side: Side) {
    const m = byNum.get(matchNum);
    if (!m) return;
    const hn = feederNum(m.homeTeamPlaceholder);
    const an = feederNum(m.awayTeamPlaceholder);
    if (hn) expand(hn, side);
    buckets[side][m.stage]?.push(m);
    if (an) expand(an, side);
  }

  const finalMatch = matches.find((m) => m.stage === 'final') ?? null;
  if (finalMatch) {
    const hn = feederNum(finalMatch.homeTeamPlaceholder);
    const an = feederNum(finalMatch.awayTeamPlaceholder);
    if (hn) expand(hn, 'left');
    if (an) expand(an, 'right');
  }
  const thirdPlace = matches.find((m) => m.stage === 'third-place') ?? null;

  const stages = KO_STAGES.map((stage) => ({
    stage,
    title: STAGE_TITLES[stage],
    left: buckets.left[stage] ?? [],
    right: buckets.right[stage] ?? [],
  }));

  return { stages, finalMatch, thirdPlace };
}

export function Bracket({ matches, onMatchClick }: { matches: Match[], onMatchClick?: (stage: MatchStage) => void }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
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

  const data = useMemo(() => buildBracketData(matches), [matches]);

  // Itens de navegação por rodada: as 4 fases de mata-mata (cada uma cobrindo
  // os jogos das duas metades) + a Final/3º lugar ao centro.
  const navItems = useMemo(() => {
    const items = data.stages.map((s) => ({
      title: s.title,
      matchIds: [...s.left, ...s.right].map((m) => m.id),
    }));
    const finalIds = [data.finalMatch?.id, data.thirdPlace?.id].filter((id): id is string => !!id);
    if (finalIds.length > 0) items.push({ title: 'Final / 3º Lugar', matchIds: finalIds });
    return items;
  }, [data]);

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

  // Focar uma rodada: enquadra a CAIXA que envolve todos os jogos daquela
  // rodada (as duas metades, quando aplicável), numa escala legível (até 1x).
  const focusRound = useCallback((idx: number) => {
    const ids = navItems[idx]?.matchIds ?? [];
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
    setFocused(`round-${idx}`);
    animateTo({ scale, x, y });
  }, [animateTo, localRect, navItems]);

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
      if (focused && focused.startsWith('round-')) focusRound(Number(focused.slice(6)));
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

  const renderCard = (match: Match) => {
    const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null;
    const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null;
    const isActive = focused === match.id;
    const isMuted = focused !== null && !focused.startsWith('round-') && focused !== match.id;

    return (
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
    );
  };

  // Uma metade do chaveamento: 4 colunas (rodadas), cada uma com os slots de
  // altura duplicada a cada rodada (técnica clássica de bracket em CSS puro —
  // sem medir pixels via JS, o dobro de altura por rodada já alinha cada jogo
  // exatamente no meio dos dois jogos que o alimentam).
  const renderSide = (side: Side) => {
    // Do lado direito, a rodada mais próxima do centro (Semis) vem primeiro
    // no layout visual (mais perto do meio da tela).
    const orderedStages = side === 'left' ? data.stages : [...data.stages].reverse();
    return (
      <div className={`bracket-side bracket-side-${side}`}>
        {orderedStages.map((s) => {
          const stageIdx = KO_STAGES.indexOf(s.stage); // 0=16avos .. 3=semis
          const isOuter = stageIdx === 0; // sem linha de entrada
          const isInner = stageIdx === 3; // conecta direto à Final, sem "cotovelo"
          const roundMatches = side === 'left' ? s.left : s.right;
          return (
            <div
              key={s.stage}
              className={`bracket-col stage-idx-${stageIdx} ${isOuter ? 'is-outer' : ''} ${isInner ? 'is-inner' : ''}`}
            >
              <div className="bracket-col-title">{s.title}</div>
              <div className="bracket-col-slots">
                {roundMatches.map((match, i) => (
                  <div
                    key={match.id}
                    className={`bracket-slot stage-h-${stageIdx} ${i % 2 === 0 ? 'slot-a' : 'slot-b'}`}
                  >
                    {renderCard(match)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bracket-shell">
      <div className="bracket-roundnav">
        {navItems.map((item, i) => (
          <button
            key={item.title}
            className={`bracket-roundnav-btn ${focused === `round-${i}` ? 'active' : ''}`}
            onClick={() => focusRound(i)}
          >
            {item.title}
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
          <div className="bracket-mirror">
            {renderSide('left')}

            <div className="bracket-center">
              {data.finalMatch && (
                <div className="bracket-center-block">
                  <div className="bracket-col-title">Final</div>
                  {renderCard(data.finalMatch)}
                </div>
              )}
              {data.thirdPlace && (
                <div className="bracket-center-block third-place">
                  <div className="bracket-col-title">Decisão do 3º lugar</div>
                  {renderCard(data.thirdPlace)}
                </div>
              )}
            </div>

            {renderSide('right')}
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
