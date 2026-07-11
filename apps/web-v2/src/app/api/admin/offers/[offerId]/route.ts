import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/admin/offers/[offerId] — remove an offer (typo / mistake recovery).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }
  const { offerId } = await params;

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  const { data, error } = await admin
    .from("quote_offers")
    .delete()
    .eq("id", offerId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("offer delete error:", error);
    return NextResponse.json({ error: "تعذّر حذف العرض." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "العرض غير موجود." }, { status: 404 });

  return NextResponse.json({ success: true });
}
