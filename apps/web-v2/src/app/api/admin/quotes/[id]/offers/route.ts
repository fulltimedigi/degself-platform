import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin-auth";
import { validateOffer } from "@/lib/offer-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/quotes/[id]/offers — add a structured offer a workshop sent back.
// Body: { workshop_name, workshop_phone?, pricing_type, price_kwd, price_max_kwd?,
//         assumed_diagnosis?, inspection_fee_kwd?, parts_type, validity_days,
//         warranty_days, warranty_note?, estimated_duration?, notes? }
//
// Validation is AUTHORITATIVE here (server-side) — the client mirrors these rules
// for live feedback, but is never trusted. Same rules as the DB CHECK constraints
// in migration 017 (1.3 range rule, ≥7-day warranty, conditional needs a
// diagnosis + declared inspection fee).
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

  const result = validateOffer(body);
  if (result.errors) {
    // Surface the first field error as the human message, keep the map for the UI.
    const firstError = Object.values(result.errors)[0] ?? "بيانات العرض غير صحيحة.";
    return NextResponse.json({ error: firstError, fields: result.errors }, { status: 400 });
  }
  const offer = result.value;

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  // Guard against orphan offers on a non-existent quote.
  const { data: quote } = await admin.from("quotes").select("id").eq("id", id).maybeSingle();
  if (!quote) return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });

  const { data: inserted, error } = await admin
    .from("quote_offers")
    .insert({
      quote_id: id,
      workshop_name: offer.workshop_name,
      workshop_phone: offer.workshop_phone,
      pricing_type: offer.pricing_type,
      price_kwd: offer.price_kwd,
      price_max_kwd: offer.price_max_kwd,
      assumed_diagnosis: offer.assumed_diagnosis,
      inspection_fee_kwd: offer.inspection_fee_kwd,
      parts_type: offer.parts_type,
      validity_days: offer.validity_days,
      warranty_days: offer.warranty_days,
      warranty_note: offer.warranty_note,
      estimated_duration: offer.estimated_duration,
      notes: offer.notes,
    })
    .select(
      "id,quote_id,workshop_name,workshop_phone,pricing_type,price_kwd,price_max_kwd," +
        "assumed_diagnosis,inspection_fee_kwd,parts_type,validity_days,warranty_days," +
        "warranty_note,estimated_duration,notes,status,created_at,accepted_at"
    )
    .single();

  if (error || !inserted) {
    console.error("offer insert error:", error);
    return NextResponse.json({ error: "تعذّر إضافة العرض." }, { status: 500 });
  }

  return NextResponse.json({ success: true, offer: inserted });
}
