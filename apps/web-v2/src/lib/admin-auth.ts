import type { NextRequest } from "next/server";

// The middleware gates the /admin/* PAGES, but /api/admin/* routes are not under
// that matcher, so each admin API route calls this to check the same session
// cookie itself (and return a JSON 401 rather than an HTML redirect). MVP auth:
// the cookie value IS the shared password. Fail closed if it's unset.
export function isAdminRequest(req: NextRequest): boolean {
  const expected = process.env.MODERATION_PASSWORD;
  if (!expected) return false;
  const session = req.cookies.get("admin_session")?.value;
  return !!session && session === expected;
}
