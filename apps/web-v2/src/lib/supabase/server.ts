import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// New publishable key, falling back to the legacy anon key name.
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Uses the publishable (anon) key — public read access is governed by RLS.
 *
 * Must be awaited: Next.js `cookies()` is async in the App Router.
 *
 *   const supabase = await createServerClient();
 *   const { data } = await supabase.from("workshops").select("*");
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component where cookies are read-only — safe to
          // ignore. Session refresh will be handled by middleware in Checkpoint 5.
        }
      },
    },
  });
}
