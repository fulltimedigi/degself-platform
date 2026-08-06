import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/**
 * Refresh the end-user Supabase Auth session and return a NextResponse that
 * carries any rotated auth cookies. Call this before composing other middleware
 * (admin gate / next-intl) and copy cookies onto the final response.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  // Anonymous traffic (majority of pageviews) has no sb-* auth cookie — skip
  // Auth API round-trips so crawlers/spikes don't burn Supabase Auth RPS.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth"));
  if (!hasAuthCookie) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Touches/refreshes the session if needed.
  await supabase.auth.getUser();
  return response;
}

/** Copy Set-Cookie headers from `from` onto `to` (preserve attributes). */
export function copyCookies(from: NextResponse, to: NextResponse): NextResponse {
  // Prefer raw Set-Cookie so httpOnly/secure/sameSite/maxAge survive.
  const getSetCookie = from.headers.getSetCookie?.bind(from.headers);
  const raw = typeof getSetCookie === "function" ? getSetCookie() : [];
  if (raw.length > 0) {
    for (const cookie of raw) {
      to.headers.append("Set-Cookie", cookie);
    }
    return to;
  }
  // Fallback: name/value only (older runtimes without getSetCookie).
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value);
  });
  return to;
}
