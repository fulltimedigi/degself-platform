import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { searchWorkshops } from "@/lib/workshops";
import { kuwaitWhatsAppDigits } from "@/lib/utils";
import {
  SYSTEM_PROMPT,
  OUTPUT_SCHEMA,
  MAX_INPUT_CHARS,
  categoryToSpecialty,
  CATEGORY_VALUES,
  type TranslatorModelOutput,
  type TranslateResponse,
  type GarageSuggestion,
} from "@/lib/garageTranslator";

// الـ SDK محتاج Node runtime (مش edge).
export const runtime = "nodejs";

// ── rate limiting بسيط best-effort (في الذاكرة، لكل instance) ──
// instances الـ serverless مؤقتة فده حماية تقريبية فقط؛ نكمّل بـ Upstash لاحقاً لو احتجنا.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "الخدمة غير مهيّأة حالياً." },
      { status: 503 }
    );
  }

  if (rateLimited(clientIp(req))) {
    return NextResponse.json(
      { error: "طلبات كثيرة، حاول بعد دقيقة." },
      { status: 429 }
    );
  }

  let text = "";
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text.trim() : "";
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json(
      { error: "اكتب مشكلة سيارتك أولاً." },
      { status: 400 }
    );
  }
  if (text.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `النص طويل جداً (الحد ${MAX_INPUT_CHARS} حرف).` },
      { status: 400 }
    );
  }

  // ── نداء واحد لـ Haiku: الفلتر + التوليد (structured output) ──
  const client = new Anthropic({ apiKey });
  let parsed: TranslatorModelOutput;
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: text }],
      output_config: {
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
    });

    if (message.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "تعذّر معالجة الطلب." },
        { status: 422 }
      );
    }

    const jsonText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    parsed = JSON.parse(jsonText) as TranslatorModelOutput;
  } catch (err) {
    console.error("translate: model call failed", err);
    return NextResponse.json(
      { error: "حدث خطأ، حاول مرة أخرى." },
      { status: 502 }
    );
  }

  // مدخل خارج الموضوع → نرجّع الرفض بدون استعلام DB (توفير).
  if (!parsed.is_car_related) {
    const resp: TranslateResponse = {
      is_car_related: false,
      possible_causes: [],
      category: null,
      whatsapp_message: parsed.whatsapp_message,
      disclaimer: parsed.disclaimer,
      garages: [],
    };
    return NextResponse.json(resp);
  }

  // حارس إضافي: لو الموديل رجّع تصنيف خارج القائمة لأي سبب.
  const category = CATEGORY_VALUES.includes(parsed.category)
    ? parsed.category
    : null;

  // ── ربط الكراجات (read-only) عبر إعادة استخدام searchWorkshops ──
  let garages: GarageSuggestion[] = [];
  if (category) {
    try {
      // الترتيب الافتراضي (صلة/جودة عبر smart_score/rank_score) لا "الأعلى
      // تقييماً" الخام — وإلا محل بمراجعة واحدة 5 نجوم يتصدّر كراجاً حقيقياً
      // بمئات المراجعات، فتخرج اقتراحات ضعيفة الصلة للزبون.
      const { workshops } = await searchWorkshops({
        specialty: categoryToSpecialty(category),
        limit: 5,
      });
      garages = workshops.map((w) => ({
        place_id: w.place_id, // كما هو — حسّاس لحالة الأحرف
        name: w.name,
        area: w.area,
        google_rating: w.google_rating,
        entity_type: w.entity_type,
        wa_digits: kuwaitWhatsAppDigits(w.phone_intl ?? w.phone),
        phone: w.phone_intl ?? w.phone,
      }));
    } catch (err) {
      console.error("translate: garage lookup failed", err);
      // نكمّل بدون كراجات بدل ما نفشل الطلب كله.
    }
  }

  const resp: TranslateResponse = {
    is_car_related: true,
    possible_causes: parsed.possible_causes,
    category,
    whatsapp_message: parsed.whatsapp_message,
    disclaimer: parsed.disclaimer,
    garages,
  };
  return NextResponse.json(resp);
}
