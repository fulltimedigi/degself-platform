import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

// Two responsibilities, composed:
//  1) Admin gate — every /admin/* page (in any locale) requires a valid opaque
//     admin_session cookie; otherwise redirect to /admin/login.
//  2) Locale routing — next-intl maps the URL to a locale. Arabic (default)
//     stays unprefixed at "/"; en/hi/ur are prefixed.
//
// IMPORTANT: always hand page requests to intlMiddleware. Returning
// NextResponse.next() skips the default-locale rewrite into /[locale]/…,
// so unprefixed Arabic admin URLs 404 (while /en/admin/… still works).

const intlMiddleware = createMiddleware(routing);

// Remove a leading locale prefix (/en, /hi, /ur) to get the logical path.
function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/(en|hi|ur)(\/.*)?$/);
  return m ? m[2] ?? "/" : pathname;
}

export async function middleware(req: NextRequest) {
  const logical = stripLocale(req.nextUrl.pathname);

  if (logical === "/admin" || logical.startsWith("/admin/")) {
    // Login stays reachable without a session — but still needs locale rewrite.
    if (logical !== "/admin/login") {
      const session = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
      if (!(await verifyAdminSessionToken(session))) {
        const url = req.nextUrl.clone();
        url.pathname = "/admin/login"; // canonical (unprefixed) login
        url.search = "";
        url.searchParams.set("next", logical);
        return NextResponse.redirect(url);
      }
    }
    return intlMiddleware(req);
  }

  return intlMiddleware(req);
}

export const config = {
  // Run on all routes except API, Next internals, and any file with an
  // extension (feed.xml, sitemap.xml, robots.txt, images, …).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
