import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { verifyAdminPassword, setAdminPassword } from "@/lib/admin-password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_LEN = 8;

// POST /api/admin/password — change the admin login password.
// Body: { current, next, confirm }. Gated by the admin session; verifies the
// current password server-side before writing the new hash. The session cookie
// is unaffected, so the admin stays logged in after a change.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";
  const confirm = typeof body.confirm === "string" ? body.confirm : "";

  if (next.length < MIN_LEN) {
    return NextResponse.json(
      { error: `كلمة السر الجديدة يجب ألا تقل عن ${MIN_LEN} أحرف.` },
      { status: 400 }
    );
  }
  if (next !== confirm) {
    return NextResponse.json({ error: "تأكيد كلمة السر لا يطابق." }, { status: 400 });
  }
  if (next === current) {
    return NextResponse.json(
      { error: "كلمة السر الجديدة يجب أن تختلف عن الحالية." },
      { status: 400 }
    );
  }

  try {
    if (!(await verifyAdminPassword(current))) {
      return NextResponse.json({ error: "كلمة السر الحالية غير صحيحة." }, { status: 401 });
    }
    await setAdminPassword(next);
  } catch (e) {
    console.error("admin password change error:", e);
    return NextResponse.json({ error: "تعذّر تغيير كلمة السر." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
