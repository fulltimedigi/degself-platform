import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client — SERVER ONLY. Bypasses RLS. Never import from a client
// component. Lazily created so a missing key never throws at import time (which
// would break the build); it only errors when actually used.
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin is not configured (missing SUPABASE_SECRET_KEY).");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
