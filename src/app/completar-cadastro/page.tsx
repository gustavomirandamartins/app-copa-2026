import { redirect } from 'next/navigation';
import { UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { Profile } from '@/lib/bolao/types';
import { OnboardingForm } from '@/components/onboarding/OnboardingForm';

/**
 * Página de onboarding pós-confirmação de e-mail. Coleta os dados
 * pessoais + endereço + consentimento LGPD e libera o pagamento.
 */
export default async function CompletarCadastroPage() {
  if (!isSupabaseConfigured()) redirect('/bolao');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/bolao');

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  const profile = (data as Profile) ?? null;

  // Já é premium → não precisa completar; vai direto ao Bolão.
  if (profile?.is_premium) redirect('/bolao');

  return (
    <div className="container">
      <div className="glass-card-static onb-card">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          <UserCheck size={32} style={{ color: 'var(--copa-green)' }} />
          <h1 style={{ fontSize: '1.5rem', marginTop: 'var(--space-sm)' }}>
            Complete seu cadastro
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Precisamos destes dados para o contato e a entrega dos prêmios.
            Depois de salvar, você segue para o pagamento.
          </p>
        </div>
        <OnboardingForm profile={profile} />
      </div>
    </div>
  );
}
