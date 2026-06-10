'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Trophy } from 'lucide-react';

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
  const pathname = usePathname();

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 'var(--header-height)',
      background: 'rgba(255, 255, 244, 0.80)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: '1px solid rgba(50, 50, 49, 0.08)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.60)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,151,57,0.30)',
          }}>
            <Trophy size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '1.1rem',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}>Copa 2026</span>
            <span style={{
              fontSize: '0.6rem',
              color: 'var(--copa-green)',
              display: 'block',
              marginTop: -2,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>🇺🇸 🇨🇦 🇲🇽</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hide-mobile" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: pathname === link.href ? 'var(--copa-green)' : 'var(--text-secondary)',
                background: pathname === link.href ? 'rgba(0, 151, 57, 0.08)' : 'transparent',
                transition: 'all var(--transition-fast)',
                textDecoration: 'none',
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="hide-desktop"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: 8,
          }}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="hide-desktop" style={{
          position: 'absolute',
          top: 'var(--header-height)',
          left: 0,
          right: 0,
          background: 'rgba(255, 255, 244, 0.96)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid rgba(50, 50, 49, 0.08)',
          padding: 'var(--space-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          animation: 'fade-in 0.2s ease-out',
        }}>
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
                color: pathname === link.href ? 'var(--copa-green)' : 'var(--text-secondary)',
                background: pathname === link.href ? 'rgba(0, 151, 57, 0.08)' : 'transparent',
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
