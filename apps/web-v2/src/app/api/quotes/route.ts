import { after, NextRequest, NextResponse } from "next/server";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminWhatsApp } from "@/lib/callmebot";
import { sanitizePhotoUrls } from "@/lib/safe-url";
import { enqueueNetworkQuoteTargets } from "@/lib/network-quote-routing";
import { dispatchQuoteDeliveryQueue } from "@/lib/quote-delivery";
import { readJsonObject } from "@/lib/json-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URGENCY = ["عادي", "مستعجل", "طارئ"] as const;
const SOURCES = ["quote_bar", "translator", "asaali", "concierge"] as const;
const RATE_LIMIT_PER_HOUR = 5;

type MatchedWorkshop = {
  place_id: string;
  name: string;
  phone?: string;
};

function parseMatchedWorkshops(raw: unknown): MatchedWorkshop[] {
  if (!Array.isArray(raw)) return [];
  const out: MatchedWorkshop[] = [];
  for (const item of raw.slice(0, 8)) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const place_id =
      typeof o.place_id === "string"
        ? o.place_id.trim()
        : typeof o.id === "string"
          ? o.id.trim()
          : "";
    const name = typeof o.name === "string" ? o.name.trim().slice(0, 120) : "";
    if (!place_id || !name) continue;
    const phone = typeof o.phone === "string" ? o.phone.trim().slice(0, 30) : undefined;
    out.push(phone ? { place_id, name, phone } : { place_id, name });
  }
  return out;
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

export async function POST(req: NextRequest) {
  const b = await readJsonObject(req);
  if (!b) {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  if (typeof b.website === "string" && b.website.trim() !== "") {
    return NextResponse.json({ id: null, status: "received", message: "وصلنا طلبك." });
  }

  const customer_name = str(b.customer_name, 60);
  if (!customer_name || customer_name.length < 2) {
    return NextResponse.json({ error: "اكتب اسمك (حرفين على الأقل)." }, { status: 400 });
  }
  const customer_phone = str(b.customer_phone, 15);
  if (!customer_phone || !/^[0-9+\s-]{7,15}$/.test(customer_phone)) {
    return NextResponse.json({ error: "اكتب رقم واتساب صحيح." }, { status: 400 });
  }
  const service = str(b.service, 60);
  if (!service || service.length < 2) {
    return NextResponse.json({ error: "اختر نوع الخدمة." }, { status: 400 });
  }
  const problem_description = str(b.problem_description, 1000);
  if (!problem_description || problem_description.length < 10) {
    return NextResponse.json({ error: "اشرح المشكلة (١٠ أحرف على الأقل)." }, { status: 400 });
  }

  const urgencyRaw = str(b.urgency, 10) ?? "عادي";
  const urgency = (URGENCY as readonly string[]).includes(urgencyRaw) ? urgencyRaw : "عادي";
  const sourceRaw = str(b.source, 20) ?? "quote_bar";
  const source = (SOURCES as readonly string[]).includes(sourceRaw) ? sourceRaw : "quote_bar";
  const photos = sanitizePhotoUrls(b.photos, 3);

  const car_make = str(b.car_make, 60);
  if (!car_make) return NextResponse.json({ error: "اكتب نوع السيارة." }, { status: 400 });
  const car_model = str(b.car_model, 60);
  if (!car_model) return NextResponse.json({ error: "اكتب موديل السيارة." }, { status: 400 });
  const car_year = str(b.car_year, 20);
  if (!car_year) return NextResponse.json({ error: "اختر سنة الصنع." }, { status: 400 });
  const area = str(b.area, 120);

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  try {
    const since = new Date(Date.now() - 30 * 60_000).toISOString();
    const { data: dup } = await admin
      .from("quotes")
      .select("id")
      .eq("customer_phone", customer_phone)
      .gte("created_at", since)
      .limit(1);
    if (dup && dup.length > 0) {
      return NextResponse.json(
        { error: "أرسلت طلباً قبل قليل — انتظر قليلاً قبل إرسال طلب جديد." },
        { status: 429 }
      );
    }
  } catch (e) {
    console.error("duplicate-phone check failed (allowing):", e);
  }

  const ip = clientIp(req);
  if (!(await consumeRateLimit(ip, "quotes", RATE_LIMIT_PER_HOUR, { failClosed: true }))) {
    return NextResponse.json({ error: "طلبات كثيرة، حاول بعد ساعة." }, { status: 429 });
  }

  let matchedWorkshops = parseMatchedWorkshops(b.matched_workshops);

  const { data: inserted, error } = await admin
    .from("quotes")
    .insert({
      customer_name,
      customer_phone,
      service,
      car_make,
      car_model,
      car_year,
      problem_description,
      area,
      urgency,
      photos,
      source,
      matched_workshops: matchedWorkshops,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("quotes insert error:", error);
    return NextResponse.json({ error: "تعذر حفظ طلبك، حاول لاحقاً." }, { status: 500 });
  }

  let routed = false;
  try {
    const targets = await enqueueNetworkQuoteTargets({
      quoteId: inserted.id,
      service,
      area,
      limit: 5,
    });
    if (targets.length > 0) {
      routed = true;
      matchedWorkshops = targets.map(({ place_id, name, phone }) => ({
        place_id,
        name,
        ...(phone ? { phone } : {}),
      }));
    }
  } catch (e) {
    console.error("network quote routing failed (quote retained):", e);
  }

  // Garage RFQ delivery is a completely separate provider path. It may use only
  // quote_delivery_queue -> Meta WABA -> /submit-offer/<opaque-token>.
  // The provider sender is hard-gated by WHATSAPP_ENABLED + approved garage template.
  // CallMeBot below is ADMIN-ONLY and must never be used to deliver an RFQ.
  if (routed) {
    after(async () => {
      try {
        await dispatchQuoteDeliveryQueue(inserted.id);
      } catch (e) {
        console.error("post-response network delivery failed:", e);
      }
    });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";
  const lines = [
    "🔐 إشعار إداري فقط — دق سلف",
    "⚠️ هذا ليس طلب عرض سعر للكراج ولا يجب إعادة توجيهه للكراجات.",
    "",
    `👤 ${customer_name} | ${customer_phone}`,
    `⚙️ الخدمة: ${service}`,
    `📝 ${problem_description}`,
    `🚗 ${[car_make, car_model, car_year].filter(Boolean).join(" ")}`,
  ];
  if (area) lines.push(`📍 ${area}`);
  lines.push(`⏱️ الإلحاح: ${urgency}`);
  lines.push(`📎 المصدر: ${source}`);
  if (matchedWorkshops.length > 0) {
    lines.push(`🤝 شبكة مستهدفة: ${matchedWorkshops.map((w) => w.name).join(" · ")}`);
  } else {
    lines.push("⚠️ لم يجد الـRouter كراج شبكة مؤهلاً بعد");
  }
  lines.push("");
  lines.push("🔐 رابط لوحة الإدارة:");
  lines.push(`${siteUrl}/admin/quotes/${inserted.id}`);

  try {
    await sendAdminWhatsApp(lines.join("\n"));
  } catch (e) {
    console.error("CallMeBot admin notify failed:", e);
  }

  return NextResponse.json({
    id: inserted.id,
    status: "received",
    message: "وصلنا طلبك — بنرسله لكراجات مختصة وتوصلك العروض قريباً.",
  });
}
