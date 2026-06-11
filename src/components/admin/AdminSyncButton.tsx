'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { triggerSync } from '@/app/admin/actions';

export function AdminSyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    const res = await triggerSync();
    setLoading(false);
    if (!res.ok) {
      setResult(`Erro: ${res.error}`);
    } else if (res.skipped) {
      setResult(`Ignorado: ${res.reason}`);
    } else {
      setResult(
        `OK — ${res.matches} jogos, ${res.standings} classificações, ${res.scoredPredictions} palpites pontuados (${new Date(res.syncedAt!).toLocaleTimeString('pt-BR')})`,
      );
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        className="btn btn-gold btn-sm"
        onClick={handleSync}
        disabled={loading}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <RefreshCw size={15} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
        {loading ? 'Sincronizando…' : 'Sincronizar agora'}
      </button>
      {result && (
        <p style={{ fontSize: '0.82rem', color: result.startsWith('Erro') ? 'var(--danger, #e55)' : 'var(--text-secondary)', margin: 0 }}>
          {result}
        </p>
      )}
    </div>
  );
}
