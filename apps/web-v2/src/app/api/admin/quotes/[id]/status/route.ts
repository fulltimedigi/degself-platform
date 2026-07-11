import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin-auth";
import { isValidQuoteStatus } from "@/lib/quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/admin/quotes/[id]/status — { status }. Change a quote's lifecycle
// status. Cookie-gated (same shared password as the admin panel).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const status = body.status;
  if (!isValidQuoteStatus(status)) {
    return NextResponse.json({ error: "حالة غير معروفة." }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  const { data, error } = await admin
    .from("quotes")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id,status")
    .maybeSingle();

  if (error) {
    console.error("status update error:", error);
    return NextResponse.json({ error: "تعذّر تحديث الحالة." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });

  return NextResponse.json({ success: true, status: data.status });
}
