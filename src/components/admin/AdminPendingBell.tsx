'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { AdminPendingPayments } from './AdminPaymentList';
import type { PaymentRequest } from '@/lib/bolao/types';
import './admin.css';

/**
 * Sininho de pendências ao lado do título — substitui a seção "Pendentes"
 * que antes ficava sempre aberta ocupando o topo da página. Badge soma Pix
 * pendentes + sorteios de desempate pendentes (children); a lista só
 * aparece ao clicar.
 */
export function AdminPendingBell({
  pending,
  badgeCount,
  children,
}: {
  pending: PaymentRequest[];
  badgeCount: number;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const total = pending.length + badgeCount;

  return (
    <div className="admin-pending-bell-wrap">
      <button
        type="button"
        className="admin-pending-bell"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Pendentes (${total})`}
      >
        <Bell size={20} />
        {total > 0 && <span className="admin-pending-bell-badge">{total}</span>}
      </button>

      {open && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          <AdminPendingPayments pending={pending}>{children}</AdminPendingPayments>
        </div>
      )}
    </div>
  );
}
