'use server';

import { createClient } from '@/lib/supabase/server';
import { isProfileComplete } from '@/lib/bolao/profile';
import type { Profile } from '@/lib/bolao/types';

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

  // .select().single() devolve a linha gravada. Importante: o supabase-js
  // NÃO retorna erro quando o UPDATE casa 0 linhas (perfil inexistente ou
  // bloqueado por RLS) — sem o .single(), a gravação "falha em silêncio" e
  // o checkout depois reclama de cadastro incompleto. Com .single(), 0
  // linhas vira erro PGRST116, que tratamos explicitamente.
  const { data, error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        ok: false,
        error: 'Não encontramos seu perfil. Saia e entre novamente para continuar.',
      };
    }
    // Ex.: coluna inexistente (migração não aplicada) → mostra a causa real.
    return { ok: false, error: error.message };
  }

  // Confirma que a gravação realmente deixou o cadastro completo antes de
  // liberar o pagamento (mesma regra usada no guard do /api/checkout).
  if (!isProfileComplete(data as Profile)) {
    return {
      ok: false,
      error: 'Os dados não foram salvos corretamente. Tente novamente.',
    };
  }

  return { ok: true };
}
