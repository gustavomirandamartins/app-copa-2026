'use client';

import { useEffect } from 'react';

/**
 * Pans the <html> background-image vertically as the user scrolls.
 * The image lives on <html> (background-attachment: fixed) so that
 * backdrop-filter on glass cards can read it in Chrome.
 */
export function ParallaxBackground() {
  useEffect(() => {
    let raf = 0;

    const update = () => {
      const doc = document.documentElement;
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
  }, []);

  return null;
}
