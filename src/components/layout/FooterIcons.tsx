/**
 * Ícones customizados do footer (mobile), no estilo dos anexos:
 * silhuetas que herdam a cor via currentColor (claro sobre o glass escuro).
 */
import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': true as const,
    focusable: false as const,
  };
}

/** Início — casinha (preenchida). */
export function HomeIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" {...props}>
      <path d="M12 2.3 1.8 11a1 1 0 0 0 .66 1.75H4V21a1 1 0 0 0 1 1h4.4v-5.1a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 1V22H19a1 1 0 0 0 1-1v-8.25h1.54A1 1 0 0 0 22.2 11L12 2.3Z" />
    </svg>
  );
}

/** Bolão — bola de futebol (linha). */
export function BallIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      {...base(size)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.2 8.3 9.9l1.4 4.3h4.6l1.4-4.3z" />
      <path d="M12 7.2V3.1M8.3 9.9 4.7 8.3M9.7 14.2 7.2 17.8M14.3 14.2 16.8 17.8M15.7 9.9 19.3 8.3" />
    </svg>
  );
}

/** Classificação — pódio (3 - 1 - 2). */
export function PodiumIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" {...props}>
      <rect x="2.4" y="13" width="5.6" height="8" rx="0.7" />
      <rect x="9.2" y="6.3" width="5.6" height="14.7" rx="0.7" />
      <rect x="16" y="10" width="5.6" height="11" rx="0.7" />
    </svg>
  );
}

/** Jogos — campo de futebol (linha). */
export function PitchIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      {...base(size)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinejoin="round"
      {...props}
    >
      <rect x="2.3" y="5.5" width="19.4" height="13" rx="2.2" />
      <path d="M12 5.5v13" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M2.3 9.2h2.7v5.6H2.3M21.7 9.2h-2.7v5.6h2.7" />
    </svg>
  );
}

/** Grupos — troféu da Copa. */
export function TrophyCupIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path
        fill="currentColor"
        d="M7 3h10v4a5 5 0 0 1-3.9 4.88V14h2.4a1 1 0 0 1 1 1v1.5h1a1 1 0 1 1 0 2h-11a1 1 0 1 1 0-2h1V15a1 1 0 0 1 1-1h2.4v-2.12A5 5 0 0 1 7 7V3Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        d="M7 4.5H4.8A2.3 2.3 0 0 0 4.8 9H7M17 4.5h2.2A2.3 2.3 0 0 1 19.2 9H17"
      />
    </svg>
  );
}

/** Eliminatórias — chaveamento (linha). */
export function BracketIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      {...base(size)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 4h4M3 9h4M3 15h4M3 20h4M7 4v5M7 15v5M7 6.5h4M7 17.5h4M11 6.5v11M11 12h5" />
    </svg>
  );
}

/** Seleções — escudo. */
export function ShieldIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" {...props}>
      <path d="M12 2 4 4.6V11c0 5.05 3.4 8.78 8 10.95C16.6 19.78 20 16.05 20 11V4.6L12 2Z" />
    </svg>
  );
}
