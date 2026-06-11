import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { Profile, PaymentRequest } from '@/lib/bolao/types';
import { AdminPaymentList } from '@/components/admin/AdminPaymentList';

/**
 * Central de controle (somente admin). Lista as solicitações de pagamento
 * manual via Pix e permite liberar/rejeitar o acesso Premium.
 */
export default async function AdminPage() {
  if (!isSupabaseConfigured()) redirect('/bolao');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/bolao');

  const { data: me } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!(me as Pick<Profile, 'is_admin'> | null)?.is_admin) {
    redirect('/bolao');
  }

  // service_role: lê todas as solicitações (ignora RLS).
  const admin = createAdminClient();
  const { data } = await admin
    .from('payment_requests')
    .select('*')
    .order('created_at', { ascending: false });

  const all = (data as PaymentRequest[]) ?? [];
  const pending = all.filter((r) => r.status === 'pending');
  const reviewed = all.filter((r) => r.status !== 'pending').slice(0, 50);

  return (
    <div className="container">
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 style={{ marginBottom: 'var(--space-sm)' }}>
          <ShieldCheck
            size={28}
            style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }}
          />
          Central de controle
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Confira o comprovante recebido por e-mail e aprove para liberar o
          acesso Premium do participante.
        </p>
      </section>

      <AdminPaymentList pending={pending} reviewed={reviewed} />
    </div>
  );
}
