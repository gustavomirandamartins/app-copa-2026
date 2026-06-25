'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Trophy,
  Medal,
  Users,
  LayoutGrid,
  Calendar,
  BarChart3,
} from 'lucide-react';
import './bottomnav.css';

export function BottomNav() {
  const pathname = usePathname();
  const [copaOpen, setCopaOpen] = useState(false);
  const copaRef = useRef<HTMLDivElement>(null);

  // Fecha o menu "Copa" ao trocar de rota.
  useEffect(() => {
    setCopaOpen(false);
  }, [pathname]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!copaOpen) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (copaRef.current && !copaRef.current.contains(e.target as Node)) {
        setCopaOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [copaOpen]);

  const isHome = pathname === '/';
  const isBolao = pathname.startsWith('/bolao');
  const isRanking = pathname.startsWith('/ranking');
  const isCopa = pathname.startsWith('/jogos') || pathname.startsWith('/grupos');
  const isSelecoes = pathname.startsWith('/selecoes');

  return (
    <nav className="hide-desktop floating-nav" aria-label="Navegação principal">
      <Link href="/" className={`fnav-item ${isHome ? 'active' : ''}`}>
        <Home size={22} strokeWidth={isHome ? 2.6 : 2} />
        <span className="fnav-label">Início</span>
      </Link>

      <Link href="/bolao" className={`fnav-item ${isBolao ? 'active' : ''}`}>
        <Trophy size={22} strokeWidth={isBolao ? 2.6 : 2} />
        <span className="fnav-label">Bolão</span>
      </Link>

      <Link href="/ranking" className={`fnav-item ${isRanking ? 'active' : ''}`}>
        <Medal size={22} strokeWidth={isRanking ? 2.6 : 2} />
        <span className="fnav-label">Classificação</span>
      </Link>

      <div ref={copaRef} style={{ position: 'relative', display: 'flex' }}>
        <button
          type="button"
          className={`fnav-item ${isCopa ? 'active' : ''}`}
          aria-haspopup="menu"
          aria-expanded={copaOpen}
          onClick={() => setCopaOpen((v) => !v)}
        >
          <LayoutGrid size={22} strokeWidth={isCopa ? 2.6 : 2} />
          <span className="fnav-label">Copa</span>
        </button>

        {copaOpen && (
          <div className="fnav-pop" role="menu">
            <Link
              href="/jogos"
              role="menuitem"
              className={`fnav-pop-item ${pathname.startsWith('/jogos') ? 'active' : ''}`}
            >
              <Calendar size={18} /> Jogos
            </Link>
            <Link
              href="/grupos"
              role="menuitem"
              className={`fnav-pop-item ${pathname.startsWith('/grupos') ? 'active' : ''}`}
            >
              <BarChart3 size={18} /> Grupos
            </Link>
          </div>
        )}
      </div>

      <Link href="/selecoes" className={`fnav-item ${isSelecoes ? 'active' : ''}`}>
        <Users size={22} strokeWidth={isSelecoes ? 2.6 : 2} />
        <span className="fnav-label">Seleções</span>
      </Link>
    </nav>
  );
}
