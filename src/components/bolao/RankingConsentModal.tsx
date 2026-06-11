'use client';

import { useState, useTransition } from 'react';
import { ShieldCheck } from 'lucide-react';
import { acceptRankingConsent } from '@/app/bolao/actions';

/**
 * Modal OBRIGATÓRIO de consentimento do ranking (Task 2).
 * Sem botão de fechar: só sai ao aceitar.
 */
export function RankingConsentModal({ onAccepted }: { onAccepted: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptRankingConsent();
      if (res.ok) onAccepted();
      else setError(res.error ?? 'Não foi possível registrar o aceite.');
    });
  }

  return (
    <div className="bolao-overlay" role="dialog" aria-modal="true">
      <div className="bolao-modal glass-card-static animate-slide-up">
        <ShieldCheck size={40} style={{ color: 'var(--gold)' }} />
        <h2 style={{ margin: 'var(--space-md) 0 var(--space-sm)' }}>
          Participe da classificação pública
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Para participar do bolão e concorrer aos prêmios MinduBier, você
          precisa aceitar que seu nome apareça na classificação pública.
        </p>

        {error && (
          <p style={{ color: 'var(--green)', marginTop: 'var(--space-sm)' }}>
            {error}
          </p>
        )}

        <button
          className="btn btn-primary"
          style={{ marginTop: 'var(--space-lg)', width: '100%' }}
          onClick={handleAccept}
          disabled={pending}
        >
          {pending ? 'Registrando…' : 'Aceito participar'}
        </button>
      </div>
    </div>
  );
}
