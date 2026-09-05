import {
  createServerClient as createSupabaseServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { createClient, type User } from "@supabase/supabase-js";
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
 * Verify a native/mobile Bearer access token server-side and return its user,
 * or null. Uses the publishable (anon) key — NOT the service role — and asks
 * the Supabase auth server to validate the JWT, so signature, expiry, and
 * revocation are all enforced by Supabase. Never trusts a client-decoded JWT, a
 * body `user_id`, or a client-declared role. This is the Bearer counterpart to
 * the cookie session's `getUser()`, used by transports that carry no browser
 * cookie (the mobile account-deletion adapter).
 */
export async function getUserFromBearer(token: string): Promise<User | null> {
  if (!token) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
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
