import {
  createServerClient as createSupabaseServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// New publishable key, falling back to the legacy anon key name.
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** A cookie mutation the Supabase client wants written to the response. */
export type CookieMutation = { name: string; value: string; options?: CookieOptions };

/**
 * Supabase client for a Route Handler where cookie writes must land on the
 * outgoing response deterministically. Reads come from the request; every write
 * the client makes (session refresh, and crucially the removals emitted by
 * `signOut`) is pushed into `sink` so the caller can apply them to its
 * `NextResponse`. This is the documented request→response cookie bridge and lets
 * us GUARANTEE (not best-effort) that a response clears the Supabase session,
 * without hard-coding any Supabase cookie name.
 */
export function createRouteHandlerClient(
  getAll: () => { name: string; value: string }[],
  sink: CookieMutation[]
) {
  return createSupabaseServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll,
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          sink.push({ name, value, options });
        }
      },
    },
  });
}

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
          // ignore. Session refresh is handled by middleware (updateSession).
        }
      },
    },
  });
}
