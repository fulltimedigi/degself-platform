import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminWhatsApp } from "@/lib/callmebot";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { readJsonObject } from "@/lib/json-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPORT_LIMIT_PER_HOUR = 5;

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

/** POST /api/report-workshop — submit a missing-workshop report. */
export async function POST(req: NextRequest) {
  const b = await readJsonObject(req);
  if (!b) {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  // honeypot — bots fill hidden fields (before RL so bots don't burn quota).
  if (typeof b.website === "string" && b.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  if (
    !(await consumeRateLimit(clientIp(req), "report_workshop", REPORT_LIMIT_PER_HOUR, {
      failClosed: true,
    }))
  ) {
    return NextResponse.json({ error: "محاولات كثيرة، حاول بعد قليل." }, { status: 429 });
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
