import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPassword } from "@/lib/admin-password";
import {
  ADMIN_SESSION_COOKIE,
  mintAdminSessionToken,
} from "@/lib/admin-session";
import { clientIp, isOverLimit, recordHit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Brute-force guard: max failed login attempts per IP per hour.
const MAX_FAILED_LOGINS = 10;

// POST /api/admin/login — { password }. The login password is verified against
// the DB-stored hash (public.admin_credentials), falling back to the
// MODERATION_PASSWORD env bootstrap until a hash is first written.
//
// On success we set an opaque HMAC session cookie (ADMIN_SESSION_SECRET, or
// MODERATION_PASSWORD used only as key material). The cookie never equals the
// typed password or the raw bootstrap secret.

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

export async function POST(req: NextRequest) {
  const sessionToken = await mintAdminSessionToken();
  // Fail closed — an unset session secret must never mean "everyone is allowed in".
  if (!sessionToken) {
    return NextResponse.json({ error: "لوحة التحكم غير مهيأة." }, { status: 503 });
  }

  // Block IPs that have already burned through the failed-attempt budget.
  const ip = clientIp(req);
  if (await isOverLimit(ip, "admin_login", MAX_FAILED_LOGINS)) {
    return NextResponse.json(
      { error: "محاولات دخول كثيرة — حاول بعد ساعة." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";

  let ok = false;
  try {
    ok = await verifyAdminPassword(password);
  } catch (e) {
    console.error("admin login verify error:", e);
    return NextResponse.json({ error: "تعذّر التحقق، حاول مرة أخرى." }, { status: 500 });
  }
  if (!ok) {
    // Count only FAILED attempts — a correct login never consumes the budget.
    await recordHit(ip, "admin_login");
    return NextResponse.json({ error: "كلمة السر غير صحيحة" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
