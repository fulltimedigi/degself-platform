import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPassword } from "@/lib/admin-password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/login — { password }. The login password is verified against
// the DB-stored hash (public.admin_credentials), falling back to the
// MODERATION_PASSWORD env bootstrap until a hash is first written.
//
// The "admin_session" cookie value is ALWAYS the MODERATION_PASSWORD env token —
// NOT the typed password — so middleware/admin-auth stay unchanged and existing
// sessions keep working even after the password is rotated.

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

export async function POST(req: NextRequest) {
  const sessionToken = process.env.MODERATION_PASSWORD;
  // Fail closed — an unset session token must never mean "everyone is allowed in".
  if (!sessionToken) {
    return NextResponse.json({ error: "لوحة التحكم غير مهيأة." }, { status: 503 });
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
    return NextResponse.json({ error: "كلمة السر غير صحيحة" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
