'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Trophy, LogIn, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { login, signup } from './actions';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get('error') === 'callback';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (mode === 'login') {
        const result = await login(formData);
        if (result?.error) setError(result.error);
      } else {
        const result = await signup(formData);
        if (result?.error) setError(result.error);
        else if (result?.success) setSuccessMsg(result.message ?? '');
      }
    });
  }

  return (
    <div
      className="container"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-xl) var(--space-md)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div
          className="animate-fade-in"
          style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-md)',
              boxShadow: '0 4px 16px rgba(0,151,57,0.30)',
            }}
          >
            <Trophy size={28} color="#fff" strokeWidth={2.5} />
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.6rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: 4,
            }}
          >
            Bolão Copa 2026
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            MinduBier · Concorra a prêmios exclusivos
          </p>
        </div>

        {/* Tabs */}
        <div
          className="animate-fade-in glass-card-static"
          style={{ padding: 'var(--space-lg)' }}
        >
          <div
            style={{
              display: 'flex',
              gap: 4,
              background: 'rgba(0,0,0,0.05)',
              borderRadius: 'var(--radius-sm)',
              padding: 4,
              marginBottom: 'var(--space-lg)',
            }}
          >
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setSuccessMsg(null);
                }}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 'calc(var(--radius-sm) - 2px)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all var(--transition-fast)',
                  background: mode === m ? '#fff' : 'transparent',
                  color:
                    mode === m ? 'var(--copa-green)' : 'var(--text-tertiary)',
                  boxShadow:
                    mode === m ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {m === 'login' ? (
                  <>
                    <LogIn size={14} /> Entrar
                  </>
                ) : (
                  <>
                    <UserPlus size={14} /> Criar conta
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Callback error */}
          {callbackError && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(220,38,38,0.08)',
                color: '#dc2626',
                fontSize: '0.85rem',
                marginBottom: 'var(--space-md)',
              }}
            >
              <AlertCircle size={16} />
              Link de confirmação inválido ou expirado. Tente novamente.
            </div>
          )}

          {/* Form */}
          {successMsg ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-lg) 0',
                textAlign: 'center',
              }}
            >
              <CheckCircle size={40} style={{ color: 'var(--copa-green)' }} />
              <p style={{ fontWeight: 600 }}>{successMsg}</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Depois de confirmar, volte aqui e clique em{' '}
                <strong>Entrar</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {mode === 'signup' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Nome completo
                  </span>
                  <input
                    name="full_name"
                    type="text"
                    required
                    placeholder="Seu nome"
                    style={inputStyle}
                  />
                </label>
              )}

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  E-mail
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  style={inputStyle}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Senha
                </span>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
                  style={inputStyle}
                />
              </label>

              {error && (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(220,38,38,0.08)',
                    color: '#dc2626',
                    fontSize: '0.85rem',
                  }}
                >
                  <AlertCircle size={16} />
                  {translateError(error)}
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="btn btn-primary"
                style={{ marginTop: 4 }}
              >
                {pending
                  ? 'Aguarde…'
                  : mode === 'login'
                  ? 'Entrar'
                  : 'Criar conta'}
              </button>
            </form>
          )}
        </div>

        <p
          className="animate-fade-in"
          style={{
            textAlign: 'center',
            marginTop: 'var(--space-lg)',
            fontSize: '0.85rem',
            color: 'var(--text-tertiary)',
          }}
        >
          <Link
            href="/"
            style={{ color: 'var(--copa-green)', fontWeight: 600, textDecoration: 'none' }}
          >
            ← Voltar ao app
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid rgba(50,50,49,0.14)',
  background: 'rgba(255,255,255,0.7)',
  fontSize: '0.95rem',
  color: 'var(--text-primary)',
  outline: 'none',
  transition: 'border-color var(--transition-fast)',
  width: '100%',
};

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado.';
  if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
  if (msg.includes('Unable to validate email')) return 'E-mail inválido.';
  return msg;
}
