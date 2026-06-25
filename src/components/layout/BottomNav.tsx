'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Medal, Users, Calendar, BarChart3 } from 'lucide-react';
import './bottomnav.css';

const tabs = [
  { href: '/', label: 'Início', icon: Home, match: (p: string) => p === '/' },
  { href: '/bolao', label: 'Bolão', icon: Trophy, match: (p: string) => p.startsWith('/bolao') },
  { href: '/ranking', label: 'Classificação', icon: Medal, match: (p: string) => p.startsWith('/ranking') },
  { href: '/jogos', label: 'Jogos', icon: Calendar, match: (p: string) => p.startsWith('/jogos') },
  { href: '/grupos', label: 'Grupos', icon: BarChart3, match: (p: string) => p.startsWith('/grupos') },
  { href: '/selecoes', label: 'Seleções', icon: Users, match: (p: string) => p.startsWith('/selecoes') },
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
            <Icon size={20} strokeWidth={active ? 2.6 : 2} />
            <span className="fnav-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
