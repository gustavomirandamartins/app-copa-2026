'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { HeaderAdmin } from './HeaderAdmin';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { logout } from '@/app/login/actions';

const navLinks = [
  { href: '/', label: 'Início' },
  { href: '/bolao', label: 'Bolão' },
  { href: '/ranking', label: 'Classificação' },
  { href: '/jogos', label: 'Jogos' },
  { href: '/grupos', label: 'Grupos' },
  { href: '/selecoes', label: 'Seleções' },
  { href: '/probabilidades', label: 'Probabilidades' },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (active && user) setIsAuthenticated(true);
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  // Links sempre brancos — header sempre escuro.
  const linkColor = (active: boolean) =>
    active ? '#ffffff' : 'rgba(255, 255, 255, 0.80)';

  const iconColor = '#ffffff';

  return (
    <>
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'calc(var(--header-height) + env(safe-area-inset-top))',
        paddingTop: 'env(safe-area-inset-top)',
        background: scrolled ? 'rgba(12, 10, 24, 0.72)' : 'transparent',
        backdropFilter: scrolled ? 'blur(28px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(28px) saturate(180%)' : 'none',
        boxShadow: scrolled
          ? '0 4px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06)'
          : 'none',
        // Acima do drawer (120) quando aberto, p/ o botão X seguir clicável.
        zIndex: isOpen ? 130 : 100,
        display: 'flex',
        alignItems: 'center',
        transition: 'background 0.45s ease, box-shadow 0.45s ease',
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
            filter: 'drop-shadow(0 2px 10px rgba(0, 0, 0, 0.40))',
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
                    active ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  textShadow: '0 1px 10px rgba(0, 0, 0, 0.40)',
                  transition: 'color 0.3s ease, background 0.3s ease',
                  textDecoration: 'none',
                }}
              >
                {link.label}
              </Link>
            );
          })}
          {isAuthenticated && (
            <form action={logout} style={{ display: 'inline' }}>
              <button
                type="submit"
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.80)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textShadow: '0 1px 10px rgba(0, 0, 0, 0.40)',
                  transition: 'color 0.3s ease, background 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <LogOut size={14} />
                Sair
              </button>
            </form>
          )}
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
            filter: isOpen ? 'none' : 'drop-shadow(0 1px 6px rgba(0,0,0,0.45))',
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

      {/* Mobile — drawer deslizando da direita, dark glass */}
      <nav
        className="hide-desktop"
        aria-hidden={!isOpen}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(80vw, 320px)',
          background: 'rgba(12, 10, 24, 0.72)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.10)',
          boxShadow:
            '-28px 0 72px rgba(0,0,0,0.55), -8px 0 24px rgba(0,0,0,0.35)',
          padding: 'calc(var(--header-height) + env(safe-area-inset-top) + var(--space-md)) var(--space-md) var(--space-lg)',
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
                color: active ? 'var(--gold)' : 'rgba(255,255,255,0.85)',
                background: active ? 'rgba(212,175,55,0.12)' : 'transparent',
                textDecoration: 'none',
                borderLeft: active ? '3px solid var(--gold)' : '3px solid transparent',
              }}
            >
              {link.label}
            </Link>
          );
        })}
        {isAuthenticated && (
          <form action={logout}>
            <button
              type="submit"
              onClick={() => setIsOpen(false)}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.98rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
                background: 'transparent',
                border: 'none',
                borderLeft: '3px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <LogOut size={16} />
              Sair
            </button>
          </form>
        )}
        <HeaderAdmin variant="mobile" onNavigate={() => setIsOpen(false)} />
      </nav>
    </>
  );
}
