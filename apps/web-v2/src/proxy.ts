import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import { copyCookies, updateSession } from "@/lib/supabase/middleware";

// Responsibilities, composed:
//  1) Refresh end-user Supabase Auth cookies
//  2) Admin gate — /admin/* (except login) needs opaque admin_session
//  3) Locale routing via next-intl
//
// /auth/* is excluded from the matcher (OAuth callback must not be rewritten).

const intlMiddleware = createMiddleware(routing);

function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/(en|hi|ur)(\/.*)?$/);
  return m ? m[2] ?? "/" : pathname;
}

// Public Arabic vanity URLs → internal ASCII routes.
//   /كراج/:specialty(/:area)  → /garage/…
//   /ماركة(/:brand)           → /make/…
// This lives in the proxy (not next.config `rewrites`) on purpose: Vercel matches
// a next.config rewrite `source` against the ENCODED request path, so a non-ASCII
// source never matches in production and 404s — while `next start` matches the
// decoded path, so CI couldn't catch it. The proxy runs identically on Vercel and
// locally and always sees the decoded `nextUrl.pathname`, so the rewrite is applied
// consistently and the CI smoke test exercises the same code path as production.
const KARAJ = "كراج";
const MARKA = "ماركة";

function safeDecodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname; // malformed %-sequence → match against the raw path
  }
}

function vanityRewrite(pathname: string): string | null {
  const p = safeDecodePath(pathname);
  if (p.startsWith(`/${KARAJ}/`)) return `/garage/${p.slice(KARAJ.length + 2)}`;
  if (p === `/${MARKA}`) return "/make";
  if (p.startsWith(`/${MARKA}/`)) return `/make/${p.slice(MARKA.length + 2)}`;
  return null;
}

export async function proxy(req: NextRequest) {
  // Rewrite Arabic vanity URLs up front by mutating the request URL the rest of
  // the pipeline reads (session refresh, admin gate, and next-intl locale
  // routing). next-intl then internally rewrites /garage/… to the default-locale
  // route, exactly as a direct /garage/… request does — the browser keeps the
  // pretty Arabic URL.
  const vanity = vanityRewrite(req.nextUrl.pathname);
  if (vanity) {
    req.nextUrl.pathname = vanity;
  }

  // Refresh user session first (may mutate request cookies + produce Set-Cookie).
  const sessionRes = await updateSession(req);

  const logical = stripLocale(req.nextUrl.pathname);

  if (logical === "/admin" || logical.startsWith("/admin/")) {
    if (logical !== "/admin/login") {
      const session = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
      if (!(await verifyAdminSessionToken(session))) {
        const url = req.nextUrl.clone();
        url.pathname = "/admin/login";
        url.search = "";
        url.searchParams.set("next", logical);
        const redirect = NextResponse.redirect(url);
        return copyCookies(sessionRes, redirect);
      }
    }
    const intlRes = intlMiddleware(req);
    return copyCookies(sessionRes, intlRes);
  }

  const intlRes = intlMiddleware(req);
  return copyCookies(sessionRes, intlRes);
}

export const config = {
  // Skip API, auth callback, Next internals, and static files.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
