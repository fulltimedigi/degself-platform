import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Two responsibilities, composed:
//  1) Admin gate — every /admin/* page (in any locale) requires the
//     admin_session cookie to equal MODERATION_PASSWORD; otherwise redirect to
//     /admin/login. (Same MVP guard as before; now locale-prefix aware so
//     /en/admin can't slip past the check.)
//  2) Locale routing — next-intl maps the URL to a locale. Arabic (default)
//     stays unprefixed at "/"; en/hi/ur are prefixed.

const intlMiddleware = createMiddleware(routing);

// Remove a leading locale prefix (/en, /hi, /ur) to get the logical path.
function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/(en|hi|ur)(\/.*)?$/);
  return m ? m[2] ?? "/" : pathname;
}

export function middleware(req: NextRequest) {
  const logical = stripLocale(req.nextUrl.pathname);

  if (logical === "/admin" || logical.startsWith("/admin/")) {
    // The login page must stay reachable without a session.
    if (logical === "/admin/login") return NextResponse.next();
    const expected = process.env.MODERATION_PASSWORD;
    const session = req.cookies.get("admin_session")?.value;
    if (expected && session && session === expected) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login"; // canonical (unprefixed) login
    url.search = "";
    url.searchParams.set("next", logical);
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  // Run on all routes except API, Next internals, and any file with an
  // extension (feed.xml, sitemap.xml, robots.txt, images, …).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
