'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  BallIcon,
  PodiumIcon,
  PitchIcon,
  BracketIcon,
  ShieldIcon,
} from './FooterIcons';
import './bottomnav.css';

const tabs = [
  { href: '/', label: 'Início', icon: HomeIcon, match: (p: string) => p === '/' },
  { href: '/bolao', label: 'Bolão', icon: BallIcon, match: (p: string) => p.startsWith('/bolao') },
  { href: '/ranking', label: 'Classificação', icon: PodiumIcon, match: (p: string) => p.startsWith('/ranking') },
  { href: '/jogos', label: 'Jogos', icon: PitchIcon, match: (p: string) => p.startsWith('/jogos') },
  { href: '/eliminatorias', label: 'Eliminatórias', icon: BracketIcon, match: (p: string) => p.startsWith('/eliminatorias') },
  { href: '/selecoes', label: 'Seleções', icon: ShieldIcon, match: (p: string) => p.startsWith('/selecoes') },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="hide-desktop floating-nav" aria-label="Navegação principal">
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link key={tab.href} href={tab.href} className={`fnav-item ${active ? 'active' : ''}`}>
            <Icon size={24} />
            <span className="fnav-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
