import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client para componentes client (browser). Usa as variáveis
 * públicas (anon). Cookie-bound à sessão do usuário via @supabase/ssr.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
