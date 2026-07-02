'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Trophy, Medal, History, Globe2, Star, ArrowUpRight } from 'lucide-react';
import { getKeyPlayer } from '@/data/key-players';
import { TeamFlag } from '@/components/ui/TeamFlag';
import type { Team, UfmgProbability } from '@/lib/types';

type ProbMap = Record<string, UfmgProbability>;

/** Formata percentual com 1 casa decimal e vírgula (pt-BR): 3.7 → "3,7". */
function formatPct(n: number): string {
  return n.toFixed(1).replace('.', ',');
}

function stages(prob: UfmgProbability | undefined) {
  if (!prob) return [];
  return [
    { label: 'Campeão', value: prob.champion },
    { label: 'Final', value: prob.final },
    { label: 'Semi', value: prob.semifinal },
    { label: 'Quartas', value: prob.quarterFinal },
    { label: 'Oitavas', value: prob.roundOf16 },
    { label: '16 avos', value: prob.roundOf32 },
  ];
}

function TeamPanel({ team, prob }: { team: Team; prob: UfmgProbability | undefined }) {
  const player = getKeyPlayer(team.id);
  const st = stages(prob);
  return (
    <article className="nx-sel-panel">
      <header className="nx-sel-head">
        <TeamFlag name={team.name} flagEmoji={team.flag} size={44} />
        <div className="nx-sel-id">
          <Link href={`/selecoes/${team.id}`} className="nx-sel-name">
            {team.name} <ArrowUpRight size={14} />
          </Link>
          <span className="nx-sel-sub">Nº {team.fifaRanking} FIFA · Grupo {team.group} · {team.confederation}</span>
        </div>
      </header>

      <ul className="nx-sel-stats">
        <li><Trophy size={14} /> <span>Títulos</span> <b>{team.titles}</b></li>
        <li><History size={14} /> <span>Melhor campanha</span> <b>{team.bestResult}</b></li>
        <li><Globe2 size={14} /> <span>Participações</span> <b>{team.appearances}</b></li>
        {player && <li><Star size={14} /> <span>Destaque</span> <b>{player}</b></li>}
      </ul>

      {prob && (
        <div className="nx-sel-champ">
          <Medal size={15} />
          <span>Chance de título</span>
          <b>{formatPct(prob.champion)}%</b>
        </div>
      )}

      {st.length > 0 && (
        <ul className="nx-sel-stages">
          {st.map((s) => (
            <li key={s.label}>
              <span className="nx-sel-stage-label">{s.label}</span>
              <span className="nx-sel-stage-track">
                <span className="nx-sel-stage-fill" style={{ width: `${Math.min(100, s.value)}%` }} />
              </span>
              <span className="nx-sel-stage-val">{formatPct(s.value)}%</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function SelecaoCompare({ home, away, probabilities }: { home: Team; away: Team; probabilities: ProbMap }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const teams = [home, away];

  function go(i: number) {
    setActive(i);
    const track = trackRef.current;
    if (!track) return;
    const panel = track.children[i] as HTMLElement | undefined;
    panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== active) setActive(i);
  }

  return (
    <div className="nx-card nx-sel">
      <div className="nx-sel-tabs" role="tablist" aria-label="Selecionar seleção">
        {teams.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === i}
            className={`nx-sel-tab ${active === i ? 'is-active' : ''}`}
            onClick={() => go(i)}
          >
            <TeamFlag name={t.name} flagEmoji={t.flag} size={18} />
            <span>{t.name}</span>
          </button>
        ))}
      </div>

      <div className="nx-sel-track" ref={trackRef} onScroll={onScroll}>
        <TeamPanel team={home} prob={probabilities[home.id]} />
        <TeamPanel team={away} prob={probabilities[away.id]} />
      </div>

      <div className="nx-sel-dots" aria-hidden="true">
        {teams.map((t, i) => (
          <span key={t.id} className={`nx-sel-dot ${active === i ? 'is-active' : ''}`} />
        ))}
      </div>
    </div>
  );
}
