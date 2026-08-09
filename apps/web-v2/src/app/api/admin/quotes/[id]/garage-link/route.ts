import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNDEFINED_TABLE = "42P01";

type MatchedWorkshop = {
  place_id?: unknown;
  name?: unknown;
  phone?: unknown;
};

function matchedPlaceIds(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(
    value
      .map((item) => (item && typeof item === "object" ? (item as MatchedWorkshop).place_id : null))
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  );
}

// POST /api/admin/quotes/[id]/garage-link
// Body is REQUIRED: { workshop_id }
//
// P0 security invariant: never create a quote-level shared garage link. Every new
// garage-facing capability is bound to one canonical workshop so it is safe for
// manual fallback today and for WABA automation later.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }
  const { id } = await params;

  let body: { workshop_id?: unknown } | null = null;
  try {
    body = (await req.json()) as { workshop_id?: unknown };
  } catch {
    // Missing/invalid JSON is rejected below. We intentionally do not fall back
    // to the old shared quotes.garage_token path.
  }
  const workshopId = typeof body?.workshop_id === "string" ? body.workshop_id.trim() : "";
  if (!workshopId) {
    return NextResponse.json(
      { error: "اختر كراجاً محدداً من الشبكة لإنشاء رابط آمن خاص به." },
      { status: 400 }
    );
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  const { data: quote, error: qErr } = await admin
    .from("quotes")
    .select("id,matched_workshops")
    .eq("id", id)
    .maybeSingle();
  if (qErr) {
    console.error("garage-link fetch error:", qErr);
    return NextResponse.json({ error: "تعذّر جلب الطلب." }, { status: 500 });
  }
  if (!quote) return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });

  // A link may only be created for a canonical workshop already listed in this
  // quote's matched_workshops. This prevents arbitrary workshop attribution.
  if (!matchedPlaceIds(quote.matched_workshops).has(workshopId)) {
    return NextResponse.json({ error: "الكراج غير موجود ضمن الكراجات الموجّه إليها." }, { status: 400 });
  }

  const { data: workshop, error: wErr } = await admin
    .from("workshops")
    .select("place_id,name")
    .eq("place_id", workshopId)
    .maybeSingle();
  if (wErr) {
    console.error("garage-link workshop fetch error:", wErr);
    return NextResponse.json({ error: "تعذّر جلب الكراج." }, { status: 500 });
  }
  if (!workshop) return NextResponse.json({ error: "الكراج غير موجود." }, { status: 404 });

  const { data: existing, error: existingErr } = await admin
    .from("quote_workshop_outreach")
    .select("id,token,outreach_count")
    .eq("quote_id", id)
    .eq("workshop_id", workshopId)
    .maybeSingle();

  if (existingErr) {
    if (existingErr.code === UNDEFINED_TABLE) {
      return NextResponse.json(
        { error: "قياس استجابة الكراجات لم يُفعّل في قاعدة البيانات بعد." },
        { status: 503 }
      );
    }
    console.error("garage-link outreach fetch error:", existingErr);
    return NextResponse.json({ error: "تعذّر إنشاء رابط قابل للقياس." }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";
  const now = new Date().toISOString();

  if (existing) {
    const { error: updateErr } = await admin
      .from("quote_workshop_outreach")
      .update({
        last_outreach_at: now,
        outreach_count: Number(existing.outreach_count ?? 1) + 1,
        updated_at: now,
      })
      .eq("id", existing.id);
    if (updateErr) {
      console.error("garage-link outreach update error:", updateErr);
      return NextResponse.json({ error: "تعذّر تحديث محاولة التواصل." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      measured: true,
      workshop_id: workshopId,
      workshop_name: workshop.name,
      url: `${siteUrl}/submit-offer/${existing.token}`,
    });
  }

  const token = randomBytes(16).toString("hex");
  const { error: insertErr } = await admin.from("quote_workshop_outreach").insert({
    quote_id: id,
    workshop_id: workshopId,
    token,
    channel: "whatsapp",
    first_outreach_at: now,
    last_outreach_at: now,
    outreach_count: 1,
    created_at: now,
    updated_at: now,
  });
  if (insertErr) {
    console.error("garage-link outreach insert error:", insertErr);
    return NextResponse.json({ error: "تعذّر إنشاء رابط قابل للقياس." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    measured: true,
    workshop_id: workshopId,
    workshop_name: workshop.name,
    url: `${siteUrl}/submit-offer/${token}`,
  });
}
