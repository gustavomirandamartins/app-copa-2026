'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Crown,
  Mail,
  Pencil,
  Search,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { setPremium, updateDisplayName, adjustScore } from '@/app/admin/actions';
import './admin.css';

export interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_premium: boolean;
  is_admin: boolean;
  total_score: number;
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
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(u.full_name ?? '');
  const [deltaStr, setDeltaStr] = useState('');

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await setPremium(u.id, !u.is_premium);
      if (!res.ok) setError(res.error ?? 'Erro ao atualizar.');
    });
  }

  function saveName() {
    setError(null);
    startTransition(async () => {
      const res = await updateDisplayName(u.id, name);
      if (res.ok) {
        setEditing(false);
      } else {
        setError(res.error ?? 'Erro ao salvar o nome.');
      }
    });
  }

  function cancelEdit() {
    setName(u.full_name ?? '');
    setEditing(false);
    setError(null);
  }

  function applyAdjust() {
    setError(null);
    const delta = parseInt(deltaStr, 10);
    if (!Number.isInteger(delta) || delta === 0) {
      setError('Informe um número inteiro diferente de zero (ex.: 5 ou -3).');
      return;
    }
    startTransition(async () => {
      const res = await adjustScore(u.id, delta);
      if (res.ok) {
        setDeltaStr('');
      } else {
        setError(res.error ?? 'Erro ao corrigir a pontuação.');
      }
    });
  }

  return (
    <div className={`admin-row ${u.is_premium ? 'status-approved' : ''}`}>
      <div className="admin-row-main">
        <div className="admin-row-name">
          <User size={15} />
          {editing ? (
            <div className="admin-name-edit">
              <input
                className="admin-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Nome de exibição"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
              <button
                className="admin-icon-btn"
                title="Salvar"
                disabled={pending}
                onClick={saveName}
              >
                <Check size={15} />
              </button>
              <button
                className="admin-icon-btn"
                title="Cancelar"
                disabled={pending}
                onClick={cancelEdit}
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <>
              <strong>{u.full_name ?? 'Sem nome'}</strong>
              <button
                className="admin-icon-btn"
                title="Editar nome de exibição na classificação"
                onClick={() => setEditing(true)}
              >
                <Pencil size={13} />
              </button>
              {u.is_admin && <span className="admin-badge badge-pending">Admin</span>}
              <span className={`admin-badge ${u.is_premium ? 'badge-approved' : 'badge-rejected'}`}>
                {u.is_premium ? 'Premium' : 'Sem acesso'}
              </span>
            </>
          )}
        </div>
        <div className="admin-row-meta">
          {u.email && (
            <a href={`mailto:${u.email}`}>
              <Mail size={13} /> {u.email}
            </a>
          )}
          <span>Cadastro: {formatDate(u.created_at)}</span>
        </div>

        <div className="admin-score">
          <span className="admin-score-total">
            <Trophy size={13} /> {u.total_score} pts
          </span>
          <div className="admin-score-adjust">
            <span className="admin-score-label">Corrigir pontuação:</span>
            <input
              type="number"
              className="admin-delta-input"
              placeholder="±0"
              value={deltaStr}
              onChange={(e) => setDeltaStr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyAdjust();
              }}
            />
            <button
              className="btn btn-secondary btn-sm"
              disabled={pending}
              onClick={applyAdjust}
            >
              Aplicar
            </button>
          </div>
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
  const [open, setOpen] = useState(false);

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
    <section className="admin-glass-section">
      <button
        type="button"
        className="admin-history-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h2 className="admin-section-title" style={{ margin: 0 }}>
          Todos os usuários ({users.length}) · {premiumCount} com acesso
        </h2>
        <ChevronDown
          size={18}
          style={{
            transition: 'transform var(--dur-3) var(--ease-spring)',
            transform: open ? 'rotate(180deg)' : 'none',
            color: 'var(--text-tertiary)',
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <>
          <div className="admin-search" style={{ marginTop: 'var(--space-sm)' }}>
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
        </>
      )}
    </section>
  );
}
