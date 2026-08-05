import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const partnersOnly = searchParams.get("partners_only") === "1";

  let query = admin
    .from("workshops")
    .select(
      "place_id, name, area, phone, reviewed_specialty, is_partner, partner_priority, partner_notes, google_rating, active"
    )
    .eq("active", true)
    .eq("is_automotive", true)
    .eq("out_of_scope", false)
    .order("is_partner", { ascending: false })
    .order("partner_priority", { ascending: false })
    .order("name", { ascending: true })
    .limit(200);

  if (partnersOnly) {
    query = query.eq("is_partner", true);
  }

  if (q) {
    // Escape commas/periods that break PostgREST or() filters.
    const safe = q.replace(/[%_,.]/g, " ").trim();
    if (safe) {
      query = query.or(
        `name.ilike.%${safe}%,area.ilike.%${safe}%,phone.ilike.%${safe}%,reviewed_specialty.ilike.%${safe}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workshops: data || [] });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }

  let body: {
    place_id?: string;
    is_partner?: boolean;
    partner_priority?: number;
    partner_notes?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const placeId = typeof body.place_id === "string" ? body.place_id.trim() : "";
  if (!placeId) {
    return NextResponse.json({ error: "place_id مطلوب." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.is_partner === "boolean") {
    updates.is_partner = body.is_partner;
  }
  if (typeof body.partner_priority === "number" && Number.isFinite(body.partner_priority)) {
    updates.partner_priority = Math.max(0, Math.min(1000, Math.round(body.partner_priority)));
  }
  if (body.partner_notes !== undefined) {
    updates.partner_notes =
      typeof body.partner_notes === "string" ? body.partner_notes.trim().slice(0, 500) : null;
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: "لا يوجد ما يُحدَّث." }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  const { data, error } = await admin
    .from("workshops")
    .update(updates)
    .eq("place_id", placeId)
    .select(
      "place_id, name, area, phone, reviewed_specialty, is_partner, partner_priority, partner_notes"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workshop: data });
}
