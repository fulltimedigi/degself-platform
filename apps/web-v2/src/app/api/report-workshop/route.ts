import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminWhatsApp } from "@/lib/callmebot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// best-effort in-memory rate limit (per serverless instance)
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

/** POST /api/report-workshop — submit a missing-workshop report. */
export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "محاولات كثيرة، حاول بعد قليل." }, { status: 429 });
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  // honeypot — bots fill hidden fields
  if (typeof b.website === "string" && b.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = str(b.name, 200);
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "اكتب اسم الكراج." }, { status: 400 });
  }

  const payload = {
    name,
    area: str(b.area, 120),
    governorate: str(b.governorate, 60),
    specialty: str(b.specialty, 60),
    phone: str(b.phone, 40),
    google_maps_url: str(b.google_maps_url, 600),
    notes: str(b.notes, 1000),
    reporter_name: str(b.reporter_name, 80),
    reporter_phone: str(b.reporter_phone, 40),
    source_page: str(b.source_page, 300),
  };

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  const { error } = await supabaseAdmin.from("workshop_reports").insert(payload);
  if (error) {
    console.error("workshop_reports insert error:", error);
    return NextResponse.json({ error: "تعذر حفظ التبليغ، حاول لاحقاً." }, { status: 500 });
  }

  // Notify admin via CallMeBot. MUST be awaited — a non-awaited call is frozen by
  // the serverless runtime after the response and never completes. A notify
  // failure must not fail the report (it is already saved), so swallow errors.
  try {
    await notifyWhatsApp(payload);
  } catch (e) {
    console.error("CallMeBot notify failed:", e);
  }

  return NextResponse.json({ ok: true });
}

async function notifyWhatsApp(p: {
  name: string;
  area: string | null;
  governorate: string | null;
  specialty: string | null;
  phone: string | null;
  google_maps_url: string | null;
  notes: string | null;
  reporter_name: string | null;
  reporter_phone: string | null;
}) {
  const lines = [
    "🔔 تبليغ كراج ناقص في دق سلف",
    "",
    `🔧 الاسم: ${p.name}`,
  ];
  if (p.area) lines.push(`📍 المنطقة: ${p.area}`);
  if (p.governorate) lines.push(`🏛️ المحافظة: ${p.governorate}`);
  if (p.specialty) lines.push(`⚙️ التخصص: ${p.specialty}`);
  if (p.phone) lines.push(`📞 رقم الكراج: ${p.phone}`);
  if (p.google_maps_url) lines.push(`🗺️ Maps: ${p.google_maps_url}`);
  if (p.notes) lines.push(`📝 ${p.notes}`);
  if (p.reporter_name || p.reporter_phone) {
    lines.push("");
    lines.push(`👤 المبلّغ: ${p.reporter_name ?? "-"} | ${p.reporter_phone ?? "-"}`);
  }
  await sendAdminWhatsApp(lines.join("\n"));
}
