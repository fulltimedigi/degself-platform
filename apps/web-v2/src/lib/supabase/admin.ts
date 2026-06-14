import { createClient } from "@supabase/supabase-js";

// Service-role client — SERVER ONLY. Bypasses RLS. Never import from a client
// component. Used to insert pending reviews and to moderate.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});
