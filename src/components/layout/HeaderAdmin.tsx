'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { triggerSync } from '@/app/admin/actions';

interface Props {
  variant: 'desktop' | 'mobile';
  /** Cor base dos ícones/labels (acompanha o estado do header no desktop). */
  onNavigate?: () => void;
}

/**
 * Controles exclusivos do admin no header: atalho para a Central de controle
 * e o botão de sincronização com a API de placares. Some para não-admins.
 * A detecção de admin acontece no client (browser) para manter o layout
 * estático — há um leve flash até a hidratação, aceitável por ser admin-only.
 */
export function HeaderAdmin({ variant, onNavigate }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !active) return;
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        if (active && data?.is_admin) setIsAdmin(true);
      } catch {
        // Sem Supabase / sem sessão → simplesmente não mostra os controles.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!isAdmin) return null;

  async function handleSync() {
    setLoading(true);
    setToast(null);
    const res = await triggerSync();
    setLoading(false);
    if (!res.ok) setToast({ ok: false, msg: `Erro: ${res.error}` });
    else if (res.skipped) setToast({ ok: false, msg: `Ignorado: ${res.reason}` });
    else
      setToast({
        ok: true,
        msg: `Sincronizado — ${res.matches} jogos · ${res.scoredPredictions} palpites pontuados`,
      });
  }

  const toastEl = toast ? (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 'calc(var(--header-height) + 10px)',
        right: 16,
        left: variant === 'mobile' ? 16 : 'auto',
        maxWidth: 360,
        zIndex: 140,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(255, 255, 244, 0.96)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 18px 48px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.12)',
        border: `1px solid ${toast.ok ? 'rgba(0,151,57,0.4)' : 'rgba(214,69,63,0.4)'}`,
        fontSize: '0.82rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
      }}
    >
      {toast.ok ? (
        <Check size={16} style={{ color: 'var(--copa-green)', flexShrink: 0 }} />
      ) : (
        <AlertCircle size={16} style={{ color: '#d6453f', flexShrink: 0 }} />
      )}
      {toast.msg}
    </div>
  ) : null;

  if (variant === 'mobile') {
    return (
      <div className="header-admin-mobile">
        <span className="header-admin-label">Admin</span>
        <Link href="/admin" className="btn btn-secondary btn-sm" onClick={onNavigate}>
          <ShieldCheck size={16} /> Central de controle
        </Link>
        <button
          className="btn btn-gold btn-sm"
          onClick={handleSync}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw
            size={15}
            style={loading ? { animation: 'spin 1s linear infinite' } : undefined}
          />
          {loading ? 'Sincronizando…' : 'Sincronizar placares'}
        </button>
        {toastEl}
      </div>
    );
  }

  return (
    <div className="header-admin-desktop">
      <Link href="/admin" className="header-admin-link" title="Central de controle">
        <ShieldCheck size={16} />
        <span>Central</span>
      </Link>
      <button
        className="header-admin-sync"
        onClick={handleSync}
        disabled={loading}
        title="Sincronizar placares com a API"
      >
        <RefreshCw
          size={15}
          style={loading ? { animation: 'spin 1s linear infinite' } : undefined}
        />
        <span>{loading ? 'Sincronizando…' : 'Sincronizar'}</span>
      </button>
      {toastEl}
    </div>
  );
}
