import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin-auth";
import { parseWorkshopLink } from "@/lib/partner-workshop-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PARTNER_COLUMNS =
  "place_id, name, area, phone, reviewed_specialty, is_partner, partner_priority, partner_notes, google_rating, active";

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
    .select(PARTNER_COLUMNS)
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

// Paste a public DEGSELF workshop URL and promote that exact catalog row into the
// existing network. No workshop data is copied or duplicated.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }

  let body: { url?: unknown };
  try {
    body = (await req.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  if (typeof body.url !== "string") {
    return NextResponse.json({ error: "الصق رابط الكراج من دق سلف." }, { status: 400 });
  }

  const parsed = parseWorkshopLink(body.url);
  if (!parsed.ok) {
    return NextResponse.json({ error: "الرابط ليس رابط كراج صالح من دق سلف." }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  const { data: workshop, error: lookupError } = await admin
    .from("workshops")
    .select(
      "place_id, name, area, phone, reviewed_specialty, is_partner, partner_priority, partner_notes, google_rating, active, is_automotive, out_of_scope, permanently_closed"
    )
    .eq("place_id", parsed.placeId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }
  if (!workshop) {
    return NextResponse.json({ error: "الكراج غير موجود في الدليل الأساسي." }, { status: 404 });
  }
  if (
    workshop.active === false ||
    workshop.permanently_closed === true ||
    workshop.is_automotive === false ||
    workshop.out_of_scope === true
  ) {
    return NextResponse.json({ error: "الكراج موجود لكنه غير مؤهل للشبكة حاليًا." }, { status: 409 });
  }

  if (workshop.is_partner === true) {
    return NextResponse.json({ workshop, existing: true });
  }

  const { data, error } = await admin
    .from("workshops")
    .update({ is_partner: true, updated_at: new Date().toISOString() })
    .eq("place_id", parsed.placeId)
    .select(
      "place_id, name, area, phone, reviewed_specialty, is_partner, partner_priority, partner_notes, google_rating, active"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workshop: data, existing: false });
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
