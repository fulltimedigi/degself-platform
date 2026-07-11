import { NextRequest, NextResponse } from "next/server";

// Gate every /admin/* route behind a single shared password (MODERATION_PASSWORD).
// The password itself is stored in the httpOnly "admin_session" cookie set by
// /api/admin/login. This is an MVP guard — plain string comparison, no crypto,
// no accounts. Fail CLOSED: if MODERATION_PASSWORD is unset, nobody gets in.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The login page must stay reachable without a session, or you could never
  // obtain one (the matcher below also excludes it, but guard here too).
  if (pathname === "/admin/login") return NextResponse.next();

  const expected = process.env.MODERATION_PASSWORD;
  const session = req.cookies.get("admin_session")?.value;

  if (expected && session && session === expected) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  // remember where they were headed so login can bounce them back
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

// Runs on /admin and everything under it, but NOT /admin/login (handled above)
// and NOT /api/admin/* (login endpoint stays open; other admin APIs guard
// themselves with their own Bearer auth).
export const config = {
  matcher: ["/admin/:path*"],
};
