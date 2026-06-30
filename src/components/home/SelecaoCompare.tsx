'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Trophy, Medal, History, Globe2, Star, ArrowUpRight } from 'lucide-react';
import { getTeamProbability } from '@/data/ufmg-probabilities';
import { getKeyPlayer } from '@/data/key-players';
import { TeamFlag } from '@/components/ui/TeamFlag';
import type { Team } from '@/lib/types';

function stages(teamId: string) {
  const p = getTeamProbability(teamId);
  if (!p) return [];
  return [
    { label: 'Campeão', value: p.champion },
    { label: 'Final', value: p.final },
    { label: 'Semi', value: p.semifinal },
    { label: 'Quartas', value: p.quarterFinal },
    { label: 'Oitavas', value: p.roundOf16 },
    { label: '16 avos', value: p.roundOf32 },
  ];
}

function TeamPanel({ team }: { team: Team }) {
  const prob = getTeamProbability(team.id);
  const player = getKeyPlayer(team.id);
  const st = stages(team.id);
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
          <b>{prob.champion.toFixed(1)}%</b>
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
              <span className="nx-sel-stage-val">{s.value.toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function SelecaoCompare({ home, away }: { home: Team; away: Team }) {
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
        <TeamPanel team={home} />
        <TeamPanel team={away} />
      </div>

      <div className="nx-sel-dots" aria-hidden="true">
        {teams.map((t, i) => (
          <span key={t.id} className={`nx-sel-dot ${active === i ? 'is-active' : ''}`} />
        ))}
      </div>
    </div>
  );
}
