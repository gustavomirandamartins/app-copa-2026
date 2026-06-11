import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { Profile, PaymentRequest } from '@/lib/bolao/types';
import { AdminPaymentList } from '@/components/admin/AdminPaymentList';
import { AdminUserList, type AdminUser } from '@/components/admin/AdminUserList';
import { AdminSyncButton } from '@/components/admin/AdminSyncButton';

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

  // Todos os usuários cadastrados (profiles) + e-mails (auth.users).
  const { data: profilesData } = await admin
    .from('profiles')
    .select('id, full_name, phone, is_premium, is_admin, total_score, created_at')
    .order('created_at', { ascending: false });
  const profiles = (profilesData as Array<
    Pick<
      Profile,
      'id' | 'full_name' | 'phone' | 'is_premium' | 'is_admin' | 'total_score'
    > & {
      created_at: string | null;
    }
  >) ?? [];

  // Mapa id → e-mail vindo do Auth (profiles não guarda e-mail).
  const emailById = new Map<string, string | null>();
  const { data: authList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  for (const u of authList?.users ?? []) {
    emailById.set(u.id, u.email ?? null);
  }

  const users: AdminUser[] = profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: emailById.get(p.id) ?? null,
    phone: p.phone,
    is_premium: p.is_premium,
    is_admin: p.is_admin,
    total_score: p.total_score ?? 0,
    created_at: p.created_at,
  }));

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
        <div style={{ marginTop: 'var(--space-sm)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
          <Link href="/admin/jogos" className="btn btn-gold btn-sm">
            <Zap size={16} /> Jogos turbinados (multiplicadores)
          </Link>
          <AdminSyncButton />
        </div>
      </section>

      <AdminPaymentList pending={pending} reviewed={reviewed} />

      <div style={{ marginTop: 'var(--space-2xl)' }}>
        <AdminUserList users={users} />
      </div>
    </div>
  );
}
