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

export async function proxy(req: NextRequest) {
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
