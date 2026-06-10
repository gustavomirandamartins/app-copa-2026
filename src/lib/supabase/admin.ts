import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. Bypasses RLS — SERVER ONLY.
 * Use exclusively in trusted server contexts (e.g. the Stripe webhook),
 * never expose the service role key to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
