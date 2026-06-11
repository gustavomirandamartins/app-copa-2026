'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  redirect('/bolao');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bolao.mindubier.com';

  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: { full_name: formData.get('full_name') as string },
      // Após confirmar o e-mail, cai na página de onboarding.
      emailRedirectTo: `${siteUrl}/auth/callback?next=/completar-cadastro`,
    },
  });

  if (error) return { error: error.message };

  return {
    success: true,
    message: 'Cadastro realizado! Verifique seu e-mail para confirmar a conta.',
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
