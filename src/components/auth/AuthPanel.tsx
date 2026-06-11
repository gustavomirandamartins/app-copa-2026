'use client';

import { useState, useTransition } from 'react';
import {
  LogIn,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Crown,
  Check,
} from 'lucide-react';
import { login, signup } from '@/app/login/actions';
import './auth.css';

const OFFER = [
  'Você faz o palpite antes do início de cada partida.',
  'Acertou só o vencedor? Ganha 1 ponto.',
  'Acertou o vencedor e a diferença de placar? 3 pontos.',
  'Acertou o placar exato? 5 pontos!',
  'Ao final, quem fizer mais pontos vence.',
  'Prêmios exclusivos da MinduBier para os primeiros colocados.',
  'Acompanhe sua posição na classificação a qualquer momento.',
];

export function AuthPanel() {
  return (
    <div>
      {/* Oferta / valor */}
      <div className="glass-card-static auth-offer">
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--space-sm)',
            flexWrap: 'wrap',
          }}
        >
          <Crown size={22} style={{ color: 'var(--gold)', alignSelf: 'center' }} />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Bolão Premium</h2>
          <span className="auth-offer-price" style={{ marginLeft: 'auto' }}>
            R$ 39,90
          </span>
        </div>
        <p
          style={{
            margin: 'var(--space-sm) 0 0',
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
          }}
        >
          Participe e concorra a produtos exclusivos da MinduBier!
        </p>
        <ul>
          {OFFER.map((item) => (
            <li key={item}>
              <Check size={16} />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Cards lado a lado */}
      <div className="auth-grid">
        <LoginCard />
        <SignupCard />
      </div>
    </div>
  );
}

function LoginCard() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await login(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="glass-card-static auth-card">
      <h2>
        <LogIn size={18} style={{ color: 'var(--copa-green)' }} /> Entrar
      </h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <span className="auth-label">E-mail</span>
          <input
            name="email"
            type="email"
            required
            placeholder="seu@email.com"
            className="auth-input"
            autoComplete="email"
          />
        </div>
        <div className="auth-field">
          <span className="auth-label">Senha</span>
          <input
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="auth-input"
            autoComplete="current-password"
          />
        </div>
        {error && (
          <div className="auth-msg error">
            <AlertCircle size={16} />
            {translateError(error)}
          </div>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? 'Aguarde…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

function SignupCard() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await signup(formData);
      if (res?.error) setError(res.error);
      else if (res?.success) setSuccess(res.message ?? '');
    });
  }

  return (
    <div className="glass-card-static auth-card">
      <h2>
        <UserPlus size={18} style={{ color: 'var(--copa-green)' }} /> Criar conta
      </h2>
      {success ? (
        <div className="auth-success">
          <CheckCircle size={40} style={{ color: 'var(--copa-green)' }} />
          <p style={{ fontWeight: 600, margin: 0 }}>{success}</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            Confirme pelo link do e-mail para continuar o cadastro.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <span className="auth-label">Nome completo</span>
            <input
              name="full_name"
              type="text"
              required
              placeholder="Seu nome"
              className="auth-input"
              autoComplete="name"
            />
          </div>
          <div className="auth-field">
            <span className="auth-label">E-mail</span>
            <input
              name="email"
              type="email"
              required
              placeholder="seu@email.com"
              className="auth-input"
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <span className="auth-label">Senha</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="auth-input"
              autoComplete="new-password"
            />
          </div>
          {error && (
            <div className="auth-msg error">
              <AlertCircle size={16} />
              {translateError(error)}
            </div>
          )}
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? 'Aguarde…' : 'Criar conta'}
          </button>
        </form>
      )}
    </div>
  );
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado.';
  if (msg.includes('Password should be at least'))
    return 'A senha deve ter pelo menos 6 caracteres.';
  if (msg.includes('Unable to validate email')) return 'E-mail inválido.';
  return msg;
}
