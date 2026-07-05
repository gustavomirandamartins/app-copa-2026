'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  variant?: 'up' | 'left' | 'right' | 'scale';
  delay?: number;
  /** Revela os FILHOS em cascata (classe sr-group no globals.css) em vez do
   *  bloco inteiro de uma vez. Os filhos não podem conter vidro aninhado —
   *  a cascata usa transform neles. Ver [[transform-breaks-backdrop-filter]]. */
  group?: boolean;
}

export function ScrollReveal({ children, className = '', variant = 'up', delay = 0, group = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transitionDelay = `${delay}ms`;
          el.classList.add('sr-visible');
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  const base = group ? 'sr-group' : `sr-${variant}`;
  return (
    <div ref={ref} className={`${base}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
