'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, BarChart3, Trophy, Users } from 'lucide-react';

const tabs = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/jogos', label: 'Jogos', icon: Calendar },
  { href: '/grupos', label: 'Grupos', icon: BarChart3 },
  { href: '/bolao', label: 'Bolão', icon: Trophy },
  { href: '/selecoes', label: 'Seleções', icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="hide-desktop" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'var(--bottom-nav-height)',
      background: 'rgba(255, 255, 244, 0.88)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderTop: '1px solid rgba(50, 50, 49, 0.08)',
      boxShadow: '0 -1px 0 rgba(255,255,255,0.70)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
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
              background: isActive ? 'rgba(0, 151, 57, 0.10)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}>
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.8}
                color={isActive ? 'var(--copa-green)' : 'var(--text-tertiary)'}
              />
            </div>
            <span style={{
              fontSize: '0.6rem',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--copa-green)' : 'var(--text-tertiary)',
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
