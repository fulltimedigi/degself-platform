import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

// POST /api/admin/quotes/[id]/offers — add an offer a workshop sent back.
// Body: { workshop_name, workshop_phone?, price_kwd, estimated_duration?, notes? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const workshop_name = str(body.workshop_name, 120);
  if (!workshop_name) {
    return NextResponse.json({ error: "اكتب اسم الكراج." }, { status: 400 });
  }

  // price: accept number or numeric string; must be a finite value >= 0
  const priceRaw = typeof body.price_kwd === "string" ? body.price_kwd.trim() : body.price_kwd;
  const price_kwd = Number(priceRaw);
  if (!Number.isFinite(price_kwd) || price_kwd < 0) {
    return NextResponse.json({ error: "اكتب سعراً صحيحاً." }, { status: 400 });
  }

  const workshop_phone = str(body.workshop_phone, 20);
  const estimated_duration = str(body.estimated_duration, 60);
  const notes = str(body.notes, 500);

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  // Guard against orphan offers on a non-existent quote.
  const { data: quote } = await admin.from("quotes").select("id").eq("id", id).maybeSingle();
  if (!quote) return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });

  const { data: offer, error } = await admin
    .from("quote_offers")
    .insert({
      quote_id: id,
      workshop_name,
      workshop_phone,
      price_kwd,
      estimated_duration,
      notes,
    })
    .select("id,quote_id,workshop_name,workshop_phone,price_kwd,estimated_duration,notes,status,created_at,accepted_at")
    .single();

  if (error || !offer) {
    console.error("offer insert error:", error);
    return NextResponse.json({ error: "تعذّر إضافة العرض." }, { status: 500 });
  }

  return NextResponse.json({ success: true, offer });
}
