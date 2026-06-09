import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cookieless Supabase client for public, read-only data (workshops).
 * No cookies() call → pages that use it can stay Static + ISR.
 * Auth-aware operations use createServerClient() from ./server instead.
 */
export const supabasePublic = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});
