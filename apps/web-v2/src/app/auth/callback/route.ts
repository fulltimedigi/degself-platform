import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth callback — Google redirects here with ?code=…
 * Exchanges the code for a session cookie, then sends the user onward.
 */

function safeInternalPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

/** Locale prefix from a next path like /en/account → /en (empty for Arabic). */
function localePrefixFromPath(path: string): string {
  const m = path.match(/^\/(en|hi|ur)(\/|\?|$)/);
  return m ? `/${m[1]}` : "";
}

function redirectToLogin(
  reqUrl: URL,
  next: string,
  error?: "auth"
): NextResponse {
  const prefix = localePrefixFromPath(next);
  const fail = new URL(reqUrl);
  fail.pathname = prefix ? `${prefix}/login` : "/login";
  fail.search = "";
  fail.searchParams.set("next", next);
  if (error) fail.searchParams.set("error", error);
  return NextResponse.redirect(fail);
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeInternalPath(url.searchParams.get("next"));

  // Cancelled / missing code — do not pretend login succeeded.
  if (!code) {
    return redirectToLogin(url, next, "auth");
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("auth callback exchange error:", error.message);
    return redirectToLogin(url, next, "auth");
  }

  // Preserve pathname + query from next (e.g. /en/search?q=…).
  const dest = new URL(next, url.origin);
  // Defense: never leave the origin.
  if (dest.origin !== url.origin) {
    return NextResponse.redirect(new URL("/", url.origin));
  }
  return NextResponse.redirect(dest);
}
