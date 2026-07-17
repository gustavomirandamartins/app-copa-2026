'use client';

import { useEffect } from 'react';

const STORAGE_URL = 'https://sdyilmgixyynnmczsnhc.supabase.co/storage/v1/object/public/backgrounds';

const STAGE_FILES: Record<'bronze' | 'final', { desktop: string; mobile: string }> = {
  bronze: { desktop: 'bg-bolao-bronze-16x9.avif', mobile: 'bg-bolao-bronze-9x16.avif' },
  final: { desktop: 'bg-bolao-final-16x9.avif', mobile: 'bg-bolao-final-9x16.avif' },
};

export type StageBgKey = 'bronze' | 'final' | null;

/**
 * Troca o fundo global (<html>) para o tema do 3º lugar/final, via as
 * custom properties --stage-bg-desktop/--stage-bg-mobile que globals.css
 * usa no background-image do <html> (desktop) e do .app-bg (camada estática
 * do mobile) — uma troca de var() já move as duas. `key = null` restaura o
 * fundo padrão das Eliminatórias. Mesmo crossfade de SelecaoDetailClient.
 */
export function useStageBackground(key: StageBgKey) {
  useEffect(() => {
    if (!key) return;
    const html = document.documentElement;
    const files = STAGE_FILES[key];

    const makeCover = (bgImage: string) => {
      const el = document.createElement('div');
      Object.assign(el.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '9990',
        backgroundImage: bgImage,
        backgroundSize: 'cover',
        backgroundPosition: window.getComputedStyle(html).backgroundPosition,
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        opacity: '1',
        transition: 'opacity 0.75s ease',
        pointerEvents: 'none',
      });
      document.body.appendChild(el);
      return el;
    };

    const prevBgImage = window.getComputedStyle(html).backgroundImage;

    html.style.setProperty('--stage-bg-desktop', `url('${STORAGE_URL}/${files.desktop}')`);
    html.style.setProperty('--stage-bg-mobile', `url('${STORAGE_URL}/${files.mobile}')`);

    const cover = makeCover(prevBgImage);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      cover.style.opacity = '0';
    }));
    cover.addEventListener('transitionend', () => cover.remove(), { once: true });

    return () => {
      const activeBgImage = window.getComputedStyle(html).backgroundImage;
      html.style.removeProperty('--stage-bg-desktop');
      html.style.removeProperty('--stage-bg-mobile');
      const exitCover = makeCover(activeBgImage);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        exitCover.style.opacity = '0';
      }));
      exitCover.addEventListener('transitionend', () => exitCover.remove(), { once: true });
    };
  }, [key]);
}
