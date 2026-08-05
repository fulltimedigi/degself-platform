import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

// The middleware gates the /admin/* PAGES, but /api/admin/* (and a few other
// admin APIs) are outside that matcher, so each route calls this to check the
// same opaque session cookie and return JSON 401 instead of an HTML redirect.
// Fail closed if the session secret is unset or the cookie is missing/invalid.
export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const session = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(session);
}
