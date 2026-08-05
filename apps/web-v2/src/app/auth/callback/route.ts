import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth callback — Google redirects here with ?code=…
 * Exchanges the code for a session cookie, then sends the user onward.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/";
  // Only allow relative internal redirects.
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("auth callback exchange error:", error.message);
      const fail = url.clone();
      fail.pathname = "/login";
      fail.search = "";
      fail.searchParams.set("error", "auth");
      return NextResponse.redirect(fail);
    }
  }

  const dest = url.clone();
  dest.pathname = next;
  dest.search = "";
  return NextResponse.redirect(dest);
}
