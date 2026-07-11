import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/login — { password }. On a match with MODERATION_PASSWORD we
// set the httpOnly "admin_session" cookie (value = the password) that middleware
// checks on every /admin/* request. MVP auth: one shared password, no accounts.

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

export async function POST(req: NextRequest) {
  const expected = process.env.MODERATION_PASSWORD;
  // Fail closed — an unset password must never mean "everyone is allowed in".
  if (!expected) {
    return NextResponse.json({ error: "لوحة التحكم غير مهيأة." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password !== expected) {
    return NextResponse.json({ error: "كلمة السر غير صحيحة" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_session", password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
