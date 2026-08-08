import { NextRequest, NextResponse } from "next/server";
import {
  createRouteHandlerClient,
  type CookieMutation,
} from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import {
  isValidConfirmation,
  isAllowedOrigin,
  isAuthFresh,
  parseTimestampMs,
  deletionBlocker,
  type AccountDeleteCode,
} from "@/lib/account-deletion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_PER_HOUR = 5;

/** Origins allowed to POST this destructive, cookie-authenticated action. */
function allowedOrigins(req: NextRequest): string[] {
  const out: string[] = [];
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (host) out.push(`${proto}://${host}`);
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      out.push(new URL(site).origin);
    } catch {
      /* ignore malformed env */
    }
  }
  try {
    out.push(new URL(req.url).origin);
  } catch {
    /* ignore */
  }
  return out;
}

/**
 * POST /api/account/delete — self-service deletion starting from the Supabase
 * Auth identity. Guarded in order: auth → same-origin → typed confirmation →
 * recent-auth → fail-closed rate limit → privileged-role → claimed-workshop.
 *
 * Session invalidation is deterministic: every cookie mutation the Supabase
 * client makes — including the removals from signOut — is collected in
 * `cookieSink` and applied to the returned response, so the browser session is
 * guaranteed cleared. (Deleting the auth user also CASCADE-removes the server's
 * auth.sessions + auth.refresh_tokens, so the token cannot be refreshed and
 * getUser() rejects it — but we do not rely on that alone.)
 */
export async function POST(req: NextRequest) {
  const cookieSink: CookieMutation[] = [];
  const supabase = createRouteHandlerClient(
    () => req.cookies.getAll(),
    cookieSink
  );

  // Build every response through here so collected cookie mutations (session
  // refresh, and the signOut removals on success) always reach the client.
  const respond = (body: unknown, status: number) => {
    const res = NextResponse.json(body, { status });
    for (const { name, value, options } of cookieSink) {
      res.cookies.set(name, value, options);
    }
    return res;
  };
  const fail = (code: AccountDeleteCode, status: number) =>
    respond({ ok: false, code }, status);

  // 1) Authenticated user, resolved server-side (never from the request body).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("NOT_AUTHENTICATED", 401);

  // 2) Same-origin / CSRF: destructive + cookie-authenticated → require Origin.
  if (!isAllowedOrigin(req.headers.get("origin"), allowedOrigins(req))) {
    return fail("INVALID_ORIGIN", 403);
  }

  // 3) JSON only + explicit typed confirmation (canonical, translation-free).
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_CONFIRMATION", 400);
  }
  const confirmation = (body as { confirmation?: unknown } | null)?.confirmation;
  if (!isValidConfirmation(confirmation)) {
    return fail("INVALID_CONFIRMATION", 400);
  }

  // 4) Recent-auth gate — Google OAuth has no password re-auth, so require a
  //    fresh sign-in (last_sign_in_at within the window).
  const lastSignInMs = parseTimestampMs(user.last_sign_in_at);
  if (!isAuthFresh(lastSignInMs, Date.now())) {
    return fail("AUTH_TOO_OLD", 401);
  }

  // 5) Fail-closed rate limit (deny if the limiter backend is unavailable).
  const ip = clientIp(req);
  const ok = await consumeRateLimit(ip, "account_delete", RATE_LIMIT_PER_HOUR, {
    failClosed: true,
  });
  if (!ok) return fail("RATE_LIMITED", 429);

  // 6) Pre-delete blockers via the service-role boundary. These ownership /
  //    privilege states are resolved by separate workflows, never silently
  //    mutated as a side effect of account deletion.
  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return fail("SERVER_ERROR", 500);
  }

  let isPrivilegedAdmin = false;
  let hasClaimedWorkshop = false;
  try {
    const { data: adminRow, error: adminErr } = await admin
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (adminErr) throw adminErr;
    isPrivilegedAdmin = Boolean(adminRow);

    const { data: claimed, error: claimErr } = await admin
      .from("workshops")
      .select("place_id")
      .eq("claimed_by", user.id)
      .limit(1);
    if (claimErr) throw claimErr;
    hasClaimedWorkshop = Array.isArray(claimed) && claimed.length > 0;
  } catch (e) {
    console.error("account-delete blocker check failed:", e);
    return fail("SERVER_ERROR", 500);
  }

  const blocker = deletionBlocker({ isPrivilegedAdmin, hasClaimedWorkshop });
  if (blocker) return fail(blocker, 409);

  // 7) Delete the Auth identity itself. profiles + user_favorites cascade;
  //    eligible community_mentions survive with matched_by = NULL (migration 035);
  //    auth.sessions + auth.refresh_tokens cascade (server-side session death).
  try {
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) throw delErr;
  } catch (e) {
    console.error("account-delete auth.admin.deleteUser failed:", e);
    return fail("SERVER_ERROR", 500);
  }

  // 8) Deterministically clear the browser session. signOut({scope:"local"})
  //    makes no network call; it emits cookie removals through the client's
  //    setAll → cookieSink, which `respond()` writes onto the response. No
  //    hard-coded cookie names, no swallowed failure.
  await supabase.auth.signOut({ scope: "local" });

  return respond({ ok: true }, 200);
}
