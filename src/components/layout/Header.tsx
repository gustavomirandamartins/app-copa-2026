'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Início' },
  { href: '/jogos', label: 'Jogos' },
  { href: '/grupos', label: 'Grupos' },
  { href: '/selecoes', label: 'Seleções' },
  { href: '/probabilidades', label: 'Probabilidades' },
  { href: '/bolao', label: 'Bolão' },
  { href: '/ranking', label: 'Ranking' },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  const onScroll = useCallback(() => {
    setScrolled(window.scrollY > 24);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  // Cor dos links: branco no topo (sobre o fundo), escuro quando rolado.
  const linkColor = (active: boolean) =>
    scrolled
      ? active
        ? 'var(--copa-green)'
        : 'rgba(50, 50, 49, 0.70)'
      : active
        ? '#ffffff'
        : 'rgba(255, 255, 255, 0.80)';

  const iconColor = scrolled ? 'var(--text-primary)' : '#ffffff';

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--header-height)',
        background: scrolled ? 'rgba(255, 255, 244, 0.50)' : 'transparent',
        backdropFilter: scrolled ? 'blur(30px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(30px) saturate(180%)' : 'none',
        boxShadow: scrolled
          ? '0 28px 72px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)'
          : 'none',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        transition: 'background 0.45s ease, box-shadow 0.45s ease, backdrop-filter 0.45s ease',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo — cross-fade branco (topo) ↔ colorido (rolado) */}
        <Link
          href="/"
          className="app-header-logo"
          aria-label="Bolão da Mindu na Copa 2026"
          style={{
            filter: scrolled ? 'none' : 'drop-shadow(0 2px 10px rgba(0, 0, 0, 0.35))',
            transition: 'filter 0.45s ease',
          }}
        >
          <Image
            src="/logo-mindubier-horizontal-white.avif"
            alt="MinduBier"
            fill
            sizes="148px"
            priority
            unoptimized
            style={{
              objectFit: 'contain',
              objectPosition: 'left center',
              opacity: scrolled ? 0 : 1,
              transition: 'opacity 0.45s ease',
            }}
          />
          <Image
            src="/logo-mindubier-horizontal.avif"
            alt="MinduBier"
            fill
            sizes="148px"
            priority
            unoptimized
            style={{
              objectFit: 'contain',
              objectPosition: 'left center',
              opacity: scrolled ? 1 : 0,
              transition: 'opacity 0.45s ease',
            }}
          />
        </Link>

        {/* Desktop Nav */}
        <nav
          className="hide-mobile"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: linkColor(active),
                  background:
                    active && scrolled ? 'rgba(0, 151, 57, 0.08)' : 'transparent',
                  textShadow: scrolled ? 'none' : '0 1px 10px rgba(0, 0, 0, 0.30)',
                  transition: 'color 0.3s ease, background 0.3s ease',
                  textDecoration: 'none',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="hide-desktop"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Menu"
          style={{
            background: 'none',
            border: 'none',
            color: iconColor,
            cursor: 'pointer',
            padding: 8,
            filter: scrolled ? 'none' : 'drop-shadow(0 1px 6px rgba(0,0,0,0.35))',
            transition: 'color 0.3s ease',
          }}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div
          className="hide-desktop"
          style={{
            position: 'absolute',
            top: 'var(--header-height)',
            left: 0,
            right: 0,
            background: 'rgba(255, 255, 244, 0.96)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderBottom: '1px solid rgba(50, 50, 49, 0.08)',
            boxShadow: '0 20px 48px rgba(0,0,0,0.18)',
            padding: 'var(--space-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            animation: 'fade-in 0.2s ease-out',
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.95rem',
                fontWeight: 600,
                color:
                  pathname === link.href
                    ? 'var(--copa-green)'
                    : 'var(--text-secondary)',
                background:
                  pathname === link.href ? 'rgba(0, 151, 57, 0.08)' : 'transparent',
                textDecoration: 'none',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
