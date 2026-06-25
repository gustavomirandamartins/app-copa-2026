'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * O background global (<html>) é ESTÁTICO em todas as páginas.
 * Exceção: as páginas de detalhe de seleção (/selecoes/<id>), onde o fundo
 * da seleção acompanha o scroll (parallax) — pedido do produto.
 *
 * O fundo vive no <html> (background-attachment: fixed) para que o
 * backdrop-filter dos cards de vidro consiga compô-lo no Chrome.
 */
export function ParallaxBackground() {
  const pathname = usePathname();
  // Detalhe de seleção: /selecoes/<algo> (a lista /selecoes não conta).
  const isTeamPage = /^\/selecoes\/.+/.test(pathname ?? '');

  useEffect(() => {
    const doc = document.documentElement;

    if (!isTeamPage) {
      // Fundo estático: limpa qualquer posição inline para a posição do CSS
      // valer (center top no desktop, center center no mobile).
      doc.style.backgroundPositionY = '';
      return;
    }

    let raf = 0;
    const update = () => {
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
      doc.style.backgroundPositionY = `${progress * 100}%`;
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [isTeamPage]);

  return null;
}
