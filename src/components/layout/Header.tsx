'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { HeaderAdmin } from './HeaderAdmin';

const navLinks = [
  { href: '/', label: 'Início' },
  { href: '/jogos', label: 'Jogos' },
  { href: '/grupos', label: 'Grupos' },
  { href: '/selecoes', label: 'Seleções' },
  { href: '/probabilidades', label: 'Probabilidades' },
  { href: '/bolao', label: 'Bolão' },
  { href: '/ranking', label: 'Classificação' },
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

  // Trava o scroll do body enquanto o drawer estiver aberto.
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fecha o drawer com a tecla Esc.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Cor dos links: branco no topo (sobre o fundo), escuro quando rolado.
  const linkColor = (active: boolean) =>
    scrolled
      ? active
        ? 'var(--copa-green)'
        : 'rgba(50, 50, 49, 0.70)'
      : active
        ? '#ffffff'
        : 'rgba(255, 255, 255, 0.80)';

  // Drawer aberto → ícone escuro (fica sobre o glass claro do menu).
  const iconColor = scrolled || isOpen ? 'var(--text-primary)' : '#ffffff';

  return (
    <>
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
        // Acima do drawer (120) quando aberto, p/ o botão X seguir clicável.
        zIndex: isOpen ? 130 : 100,
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
            filter: scrolled
              ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.55)) drop-shadow(0 1px 3px rgba(0,0,0,0.40))'
              : 'drop-shadow(0 2px 10px rgba(0, 0, 0, 0.35))',
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
          <HeaderAdmin variant="desktop" />
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="hide-desktop"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Menu"
          style={{
            position: 'relative',
            zIndex: 102,
            background: 'none',
            border: 'none',
            color: iconColor,
            cursor: 'pointer',
            padding: 8,
            filter: scrolled || isOpen ? 'none' : 'drop-shadow(0 1px 6px rgba(0,0,0,0.35))',
            transition: 'color 0.3s ease',
          }}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </header>

      {/* Mobile — backdrop (fecha ao tocar). Fora do <header> de propósito:
          o header tem backdrop-filter, que o tornaria containing-block dos
          elementos fixed e colapsaria a altura do drawer. */}
      <div
        className="hide-desktop"
        onClick={() => setIsOpen(false)}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
          zIndex: 110,
        }}
      />

      {/* Mobile — drawer deslizando da direita, com glass do header */}
      <nav
        className="hide-desktop"
        aria-hidden={!isOpen}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(80vw, 320px)',
          background: 'rgba(255, 255, 244, 0.88)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.55)',
          boxShadow:
            '-28px 0 72px rgba(0,0,0,0.22), -8px 0 24px rgba(0,0,0,0.14)',
          padding: 'calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)',
          zIndex: 120,
        }}
      >
        {navLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              tabIndex={isOpen ? 0 : -1}
              style={{
                padding: '13px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.98rem',
                fontWeight: 600,
                color: active ? 'var(--copa-green)' : 'var(--text-primary)',
                background: active ? 'rgba(0, 151, 57, 0.10)' : 'transparent',
                textDecoration: 'none',
              }}
            >
              {link.label}
            </Link>
          );
        })}
        <HeaderAdmin variant="mobile" onNavigate={() => setIsOpen(false)} />
      </nav>
    </>
  );
}
