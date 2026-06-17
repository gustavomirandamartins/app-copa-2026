'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, BarChart3, Trophy, Users } from 'lucide-react';

const tabs = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/jogos', label: 'Jogos', icon: Calendar },
  { href: '/grupos', label: 'Grupos', icon: BarChart3 },
  { href: '/selecoes', label: 'Seleções', icon: Users },
  { href: '/bolao', label: 'Bolão', icon: Trophy },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="hide-desktop" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))',
      background: 'rgba(10, 8, 20, 0.85)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderTop: '1px solid rgba(255, 255, 255, 0.10)',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.40)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-around',
      paddingTop: '4px',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              padding: '6px 0',
              textDecoration: 'none',
              minWidth: 56,
              transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isActive ? 'rgba(212,175,55,0.15)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}>
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.8}
                color={isActive ? 'var(--gold)' : 'rgba(255,255,255,0.45)'}
              />
            </div>
            <span style={{
              fontSize: '0.6rem',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--gold)' : 'rgba(255,255,255,0.45)',
              letterSpacing: '0.02em',
            }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
