'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertCircle, Crown, Mail, Search, User, X } from 'lucide-react';
import { setPremium } from '@/app/admin/actions';
import './admin.css';

export interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_premium: boolean;
  is_admin: boolean;
  created_at: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function UserRow({ u }: { u: AdminUser }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await setPremium(u.id, !u.is_premium);
      if (!res.ok) setError(res.error ?? 'Erro ao atualizar.');
    });
  }

  return (
    <div className={`admin-row glass-card-static ${u.is_premium ? 'status-approved' : ''}`}>
      <div className="admin-row-main">
        <div className="admin-row-name">
          <User size={15} />
          <strong>{u.full_name ?? 'Sem nome'}</strong>
          {u.is_admin && <span className="admin-badge badge-pending">Admin</span>}
          <span className={`admin-badge ${u.is_premium ? 'badge-approved' : 'badge-rejected'}`}>
            {u.is_premium ? 'Premium' : 'Sem acesso'}
          </span>
        </div>
        <div className="admin-row-meta">
          {u.email && (
            <a href={`mailto:${u.email}`}>
              <Mail size={13} /> {u.email}
            </a>
          )}
          <span>Cadastro: {formatDate(u.created_at)}</span>
        </div>
        {error && (
          <div className="auth-msg error" style={{ marginTop: 8 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <div className="admin-row-actions">
        {u.is_premium ? (
          <button
            className="btn btn-secondary btn-sm"
            disabled={pending}
            onClick={toggle}
          >
            <X size={15} /> Remover acesso
          </button>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            disabled={pending}
            onClick={toggle}
          >
            <Crown size={15} /> Habilitar acesso
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminUserList({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.full_name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q),
    );
  }, [query, users]);

  const premiumCount = users.filter((u) => u.is_premium).length;

  return (
    <section>
      <h2 className="admin-section-title">
        Todos os usuários ({users.length}) · {premiumCount} com acesso
      </h2>

      <div className="admin-search">
        <Search size={16} />
        <input
          type="search"
          placeholder="Buscar por nome ou e-mail…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="admin-empty">Nenhum usuário encontrado.</p>
      ) : (
        filtered.map((u) => <UserRow key={u.id} u={u} />)
      )}
    </section>
  );
}
