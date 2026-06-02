import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for background server operations.
 * Bypasses RLS — only use in trusted server-side code.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
