import { NextRequest, NextResponse } from "next/server";
import {
  createRouteHandlerClient,
  getUserFromBearer,
  type CookieMutation,
} from "@/lib/supabase/server";
import { clientIp } from "@/lib/rate-limit";
import { isAllowedOrigin, parseBearerToken } from "@/lib/account-deletion";
import { performAccountDeletion } from "@/lib/account-deletion-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/account/delete — one route, ONE canonical deletion operation
 * (`performAccountDeletion`), two transports:
 *
 *   • Web (cookie): SSR-cookie-authenticated. Because a cookie is auto-attached
 *     cross-site, this path additionally enforces a same-origin Origin allow-list
 *     (CSRF) and deterministically clears the browser session on success.
 *   • Mobile (Bearer): `Authorization: Bearer <supabase access token>`, verified
 *     server-side via `getUserFromBearer`. A Bearer token is NOT auto-attached
 *     cross-site, so classic CSRF does not apply and no browser Origin exists to
 *     check — possession of the verified token IS the authentication. The client
 *     clears its own SecureStore session; deleting the user also cascades
 *     auth.sessions/refresh_tokens so the token can no longer be refreshed.
 *
 * The transport is chosen by the presence of a Bearer header. A CSRF attacker
 * cannot forge a victim's Bearer token, and supplying their own token only
 * deletes their own account — so preferring Bearer when present is safe, and the
 * cookie path keeps its Origin defense. Confirmation, recent-auth, rate limit,
 * and the privileged/claimed blockers live in the shared core for both.
 */
export async function POST(req: NextRequest) {
  const token = bearerToken(req);
  return token ? handleBearer(req, token) : handleCookie(req);
}

// ── transport: mobile Bearer ────────────────────────────────────────────────

async function handleBearer(req: NextRequest, token: string) {
  const user = await getUserFromBearer(token);
  if (!user) return json({ ok: false, code: "NOT_AUTHENTICATED" }, 401);

  const result = await performAccountDeletion({
    userId: user.id,
    lastSignInAt: user.last_sign_in_at,
    confirmation: await readConfirmation(req),
    rateLimitKey: rateLimitKey(user.id, req),
  });

  return result.ok
    ? json({ ok: true }, 200)
    : json({ ok: false, code: result.code }, result.status);
}

// ── transport: web cookie ───────────────────────────────────────────────────

async function handleCookie(req: NextRequest) {
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

  // Authenticated user, resolved server-side (never from the request body).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return respond({ ok: false, code: "NOT_AUTHENTICATED" }, 401);

  // Same-origin / CSRF: destructive + cookie-authenticated → require Origin.
  if (!isAllowedOrigin(req.headers.get("origin"), allowedOrigins(req))) {
    return respond({ ok: false, code: "INVALID_ORIGIN" }, 403);
  }

  const result = await performAccountDeletion({
    userId: user.id,
    lastSignInAt: user.last_sign_in_at,
    confirmation: await readConfirmation(req),
    rateLimitKey: rateLimitKey(user.id, req),
  });

  if (!result.ok) return respond({ ok: false, code: result.code }, result.status);

  // Deterministically clear the browser session. signOut({scope:"local"}) emits
  // the session-cookie removals through the client's setAll → cookieSink, which
  // `respond()` writes onto the response. (supabase-js may also issue a
  // local-scope /logout call, but our guaranteed cookie clearing does NOT depend
  // on that call succeeding — the removals are applied to the response either way.)
  await supabase.auth.signOut({ scope: "local" });
  return respond({ ok: true }, 200);
}

// ── shared transport helpers ────────────────────────────────────────────────

const json = (body: unknown, status: number) =>
  NextResponse.json(body, { status });

/** Extract a non-empty `Authorization: Bearer <token>`, else null. */
function bearerToken(req: NextRequest): string | null {
  return parseBearerToken(req.headers.get("authorization"));
}

/**
 * Read the typed confirmation from a JSON body. A non-JSON/malformed body yields
 * `undefined`, which the core rejects as INVALID_CONFIRMATION — matching the
 * original route's behavior.
 */
async function readConfirmation(req: NextRequest): Promise<unknown> {
  try {
    const body = await req.json();
    return (body as { confirmation?: unknown } | null)?.confirmation;
  } catch {
    return undefined;
  }
}

/**
 * Rate-limit key: server-derived user identity + network signal. Per-user
 * scoping means shared-NAT native clients don't collide across accounts, while a
 * single account still can't exceed the per-hour ceiling.
 */
function rateLimitKey(userId: string, req: NextRequest): string {
  return `${userId}:${clientIp(req)}`;
}

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
