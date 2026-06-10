'use client';

import { useEffect, useRef } from 'react';

/**
 * Camada de background com efeito parallax.
 * A imagem preenche a largura (background-size: cover) e faz pan vertical
 * conforme o scroll: no topo da página vê-se o topo da imagem; ao chegar
 * ao fim, a base da imagem coincide com a base da página. Como o pan é uma
 * fração do scroll, o fundo "desce" mais devagar que o conteúdo.
 */
export function ParallaxBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      const el = ref.current;
      if (!el) return;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
      // 0% → topo da imagem; 100% → base da imagem.
      el.style.backgroundPositionY = `${progress * 100}%`;
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
  }, []);

  return <div ref={ref} className="parallax-bg" aria-hidden="true" />;
}
