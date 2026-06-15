'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Flame, Target, Crown, Users, ArrowRight } from 'lucide-react';
import type { Verdict } from '@/lib/bolao/thermometer';

interface Props {
  pct: number;
  stillAchievable: number;
  leaderPoints: number;
  remainingMatches: number;
  remainingRounds: number;
  verdict: Verdict;
}

function mercuryColor(pct: number): string {
  if (pct >= 60) return 'var(--copa-green)';
  if (pct >= 35) return '#e8a000';
  return '#c0392b';
}

export function JoinThermometer({
  pct,
  stillAchievable,
  leaderPoints,
  remainingMatches,
  remainingRounds,
  verdict,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [fill, setFill] = useState(0);

  // Anima o enchimento quando o termômetro entra na viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setFill(pct);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          // pequeno atraso para o efeito "subir"
          requestAnimationFrame(() => setTimeout(() => setFill(pct), 120));
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pct]);

  const color = mercuryColor(pct);

  return (
    <div className="thermo-card glass-card-static" ref={ref}>
      <div className="thermo-head">
        <span className="thermo-eyebrow">
          <Flame size={14} /> Os jogos já começaram
        </span>
        <h3 className="thermo-q">Ainda vale a pena entrar?</h3>
      </div>

      <div className="thermo-body">
        {/* Termômetro */}
        <div className="thermo-gauge" aria-hidden="true">
          <div className="thermo-tube">
            <div className="thermo-ticks">
              <span style={{ bottom: '100%' }} data-l="100" />
              <span style={{ bottom: '75%' }} data-l="75" />
              <span style={{ bottom: '50%' }} data-l="50" />
              <span style={{ bottom: '25%' }} data-l="25" />
            </div>
            <div
              className="thermo-mercury"
              style={{ height: `${fill}%`, background: color }}
            />
          </div>
          <div className="thermo-bulb" style={{ background: color }}>
            <span className="thermo-bulb-pct">{pct}%</span>
          </div>
        </div>

        {/* Leitura + veredito */}
        <div className="thermo-readout">
          <div className={`thermo-verdict tone-${verdict.tone}`}>
            <strong>{verdict.title}</strong>
            <span>{verdict.text}</span>
          </div>

          <ul className="thermo-stats">
            <li>
              <Target size={15} />
              <span>
                <b>{stillAchievable.toLocaleString('pt-BR')}</b> pts ainda em disputa
              </span>
            </li>
            <li>
              <Crown size={15} />
              <span>
                Líder atual tem <b>{leaderPoints}</b> pts
              </span>
            </li>
            <li>
              <Flame size={15} />
              <span>
                <b>{remainingMatches}</b> jogos e <b>{remainingRounds}</b> rodadas por vir
              </span>
            </li>
            <li>
              <Users size={15} />
              <span>
                <b>+5</b> pts por indicação — <em>sem limite</em>
              </span>
            </li>
          </ul>

          <Link href="/bolao" className="btn btn-gold thermo-cta">
            Entrar agora e pontuar <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
