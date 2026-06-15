'use client';

import { useState, useTransition } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  Mail,
  Phone,
  User,
  X,
} from 'lucide-react';
import { approvePayment, rejectPayment } from '@/app/admin/actions';
import type { PaymentRequest } from '@/lib/bolao/types';
import './admin.css';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

const STATUS_LABEL: Record<PaymentRequest['status'], string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

function Row({ req }: { req: PaymentRequest }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isPending = req.status === 'pending';

  function run(action: 'approve' | 'reject') {
    setError(null);
    startTransition(async () => {
      const res =
        action === 'approve'
          ? await approvePayment(req.id)
          : await rejectPayment(req.id);
      if (!res.ok) setError(res.error ?? 'Erro ao processar.');
    });
  }

  return (
    <div className={`admin-row status-${req.status}`}>
      <div className="admin-row-main">
        <div className="admin-row-name">
          <User size={15} />
          <strong>{req.contact_name ?? 'Sem nome'}</strong>
          <span className={`admin-badge badge-${req.status}`}>
            {STATUS_LABEL[req.status]}
          </span>
        </div>
        <div className="admin-row-meta">
          {req.contact_email && (
            <a href={`mailto:${req.contact_email}`}>
              <Mail size={13} /> {req.contact_email}
            </a>
          )}
          {req.contact_phone && (
            <span>
              <Phone size={13} /> {req.contact_phone}
            </span>
          )}
          <span>
            <Clock size={13} /> {formatDate(req.created_at)}
          </span>
        </div>
        {req.note && <p className="admin-row-note">“{req.note}”</p>}
        <div className="admin-row-amount">{formatAmount(req.amount_cents)}</div>
        {error && (
          <div className="auth-msg error" style={{ marginTop: 8 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      {isPending && (
        <div className="admin-row-actions">
          <button
            className="btn btn-primary btn-sm"
            disabled={pending}
            onClick={() => run('approve')}
          >
            <Check size={15} /> Aprovar
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={pending}
            onClick={() => run('reject')}
          >
            <X size={15} /> Rejeitar
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminPaymentList({
  pending,
  reviewed,
}: {
  pending: PaymentRequest[];
  reviewed: PaymentRequest[];
}) {
  return (
    <div className="admin-list">
      <section>
        <h2 className="admin-section-title">
          Pendentes ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="admin-empty">Nenhuma solicitação aguardando aprovação.</p>
        ) : (
          pending.map((req) => <Row key={req.id} req={req} />)
        )}
      </section>

      {reviewed.length > 0 && (
        <section>
          <h2 className="admin-section-title">Histórico recente</h2>
          {reviewed.map((req) => (
            <Row key={req.id} req={req} />
          ))}
        </section>
      )}
    </div>
  );
}
