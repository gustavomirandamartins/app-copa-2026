'use server';

import { createClient } from '@/lib/supabase/server';

export interface SaveOnboardingResult {
  ok: boolean;
  error?: string;
}

/**
 * Salva os dados do onboarding no profile do próprio usuário.
 * Protegido por RLS + column-grants (o usuário só altera a própria linha
 * e apenas as colunas concedidas). `lgpd_agreed_at` é carimbado por trigger.
 */
export async function saveOnboarding(
  formData: FormData,
): Promise<SaveOnboardingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'Não autenticado.' };

  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
  };

  const fields = {
    full_name: get('full_name'),
    birth_date: get('birth_date'),
    phone: get('phone'),
    postal_code: get('postal_code'),
    address_street: get('address_street'),
    address_number: get('address_number'),
    address_complement: get('address_complement'),
    address_district: get('address_district'),
    address_city: get('address_city'),
    address_state: get('address_state'),
    agreed_to_lgpd: formData.get('agreed_to_lgpd') === 'on',
  };

  // Validação server-side (espelha o isProfileComplete).
  const required: (keyof typeof fields)[] = [
    'full_name',
    'birth_date',
    'phone',
    'postal_code',
    'address_street',
    'address_number',
    'address_city',
    'address_state',
  ];
  for (const k of required) {
    if (!fields[k]) return { ok: false, error: 'Preencha todos os campos obrigatórios.' };
  }
  if (!fields.agreed_to_lgpd) {
    return { ok: false, error: 'É necessário aceitar o consentimento (LGPD).' };
  }

  const { error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', user.id);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
