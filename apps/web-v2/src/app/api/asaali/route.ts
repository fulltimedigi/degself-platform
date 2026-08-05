/**
 * /api/asaali — voice translator V2 (the flagship feature)
 *
 * Differences vs /api/translate:
 *   1. Multi-turn conversation_history support
 *   2. Vehicle context (make/model/year/transmission) injected into prompt
 *   3. Cost guard: monthly budget + per-IP rate limit + 7-day cache
 *   4. Structured response with status enum (see AsaaliResponse)
 *
 * The model is asked for JSON only. We validate at runtime.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { categoryToSpecialty, FAULT_CATEGORIES, CATEGORY_VALUES } from "@/lib/garageTranslator";
import {
  preflightCheck,
  logUsage,
  getCachedAnswer,
  setCachedAnswer,
  computeChatCost,
  hashIp,
} from "@/lib/asaali-cost-guard";
import { formatVehicleForPrompt } from "@/lib/vehicle-data";
import {
  quoteServiceForCategory,
  searchConciergeWorkshops,
} from "@/lib/partners";
import type {
  AsaaliRequest,
  AsaaliResponse,
  RecommendedWorkshop,
} from "@/lib/asaali-schema";

export const runtime = "nodejs";
export const maxDuration = 30;

// Sonnet 5 — أدق في فهم اللهجة الكويتية من Haiku. أغلى (~٣× للتوكن)، لكن
// حارس الميزانية + الكاش + حد المعدّل يضبطون التكلفة. راجع MONTHLY_BUDGET_USD.
const MODEL = "claude-sonnet-5";
const MAX_INPUT_CHARS = 800;
const MAX_HISTORY_TURNS = 6;

// ============================================================
// دعم اللغات — لغة الرد الظاهر للمستخدم تتبع لغة الواجهة.
// whatsapp_message تبقى بالعربية دائماً (تُرسل لكراج كويتي).
// ============================================================
const SUPPORTED_LOCALES = ["ar", "en", "hi", "ur"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

function normalizeLocale(input: unknown): Locale {
  return SUPPORTED_LOCALES.includes(input as Locale) ? (input as Locale) : "ar";
}

// اسم اللغة داخل الـ prompt (بالعربية) لتوجيه الموديل
const LANG_NAME: Record<Locale, string> = {
  ar: "العربية الفصحى المبسطة",
  en: "الإنجليزية (English)",
  hi: "الهندية (हिन्दी)",
  ur: "الأردية (اردو)",
};

// رسائل النظام الثابتة (غير مولّدة من الموديل) مترجمة لكل لغة
const FALLBACKS: Record<Locale, Record<string, string>> = {
  ar: {
    notConfigured: "الخدمة غير مهيّأة حالياً.",
    invalid: "طلب غير صالح.",
    empty: "اكتب مشكلة السيارة أولاً.",
    tooLong: `النص طويل جداً (الحد ${MAX_INPUT_CHARS} حرف).`,
    budget:
      "وصلنا الحد اليومي للخدمة. جرّب بعد ساعات. يمكنك الاتصال بأي كراج مباشرة من صفحة الكراجات.",
    rateLimited: "طلبات كثيرة في وقت قصير. حاول بعد ساعة.",
    refusal: "تعذّرت معالجة الطلب. حاول مرّة أخرى.",
    parseError: "حدث خطأ في معالجة الرد. حاول مرّة أخرى.",
    genericError: "حدث خطأ. حاول مرّة أخرى.",
  },
  en: {
    notConfigured: "The service is not available right now.",
    invalid: "Invalid request.",
    empty: "Describe your car's problem first.",
    tooLong: `The text is too long (limit ${MAX_INPUT_CHARS} characters).`,
    budget:
      "We've reached today's service limit. Try again in a few hours. You can also contact any garage directly from the garages page.",
    rateLimited: "Too many requests in a short time. Try again in an hour.",
    refusal: "Couldn't process the request. Try again.",
    parseError: "Something went wrong processing the reply. Try again.",
    genericError: "Something went wrong. Try again.",
  },
  hi: {
    notConfigured: "सेवा अभी उपलब्ध नहीं है।",
    invalid: "अमान्य अनुरोध।",
    empty: "पहले अपनी कार की समस्या बताएं।",
    tooLong: `पाठ बहुत लंबा है (सीमा ${MAX_INPUT_CHARS} अक्षर)।`,
    budget:
      "आज की सेवा सीमा पूरी हो गई। कुछ घंटों बाद फिर कोशिश करें। आप गैरेज पेज से किसी भी गैरेज से सीधे संपर्क कर सकते हैं।",
    rateLimited: "कम समय में बहुत सारे अनुरोध। एक घंटे बाद कोशिश करें।",
    refusal: "अनुरोध संसाधित नहीं हो सका। फिर से कोशिश करें।",
    parseError: "उत्तर संसाधित करने में समस्या हुई। फिर से कोशिश करें।",
    genericError: "कुछ गड़बड़ हो गई। फिर से कोशिश करें।",
  },
  ur: {
    notConfigured: "سروس اس وقت دستیاب نہیں۔",
    invalid: "غلط درخواست۔",
    empty: "پہلے اپنی گاڑی کا مسئلہ بتائیں۔",
    tooLong: `متن بہت طویل ہے (حد ${MAX_INPUT_CHARS} حروف)۔`,
    budget:
      "آج کی سروس کی حد پوری ہو گئی۔ چند گھنٹوں بعد دوبارہ کوشش کریں۔ آپ گیراج صفحے سے کسی بھی گیراج سے براہِ راست رابطہ کر سکتے ہیں۔",
    rateLimited: "کم وقت میں بہت زیادہ درخواستیں۔ ایک گھنٹے بعد کوشش کریں۔",
    refusal: "درخواست پر عمل نہ ہو سکا۔ دوبارہ کوشش کریں۔",
    parseError: "جواب پر عمل کرنے میں مسئلہ ہوا۔ دوبارہ کوشش کریں۔",
    genericError: "کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔",
  },
};

// ============================================================
// System prompt — يُحقن فيه vehicle context عند الحاجة
// ============================================================

// تصنيفات العطل = نفس قيم reviewed_specialty في قاعدة البيانات (مع تلميحات
// اللهجة الكويتية)، عشان الـ category اللي يختاره الموديل يربط كراجات فعلية.
// نعيد استخدام FAULT_CATEGORIES من مترجم الكراج بدل قائمة مبسطة لا تطابق الـ DB.
const CATEGORY_HINTS = FAULT_CATEGORIES.map((c) => `- ${c.value}: ${c.hint}`).join("\n");
const CATEGORY_ENUM = [...CATEGORY_VALUES, "none"].join("|");

// قاموس لهجة كويتية للمصطلحات الصعبة اللي ممكن الموديل يخطئ فيها. (التلميحات
// أعلاه تغطي أغلب المصطلحات؛ هذا يسدّ الفجوات الأصعب.)
const KUWAITI_GLOSSARY = `قاموس لهجة سريع (كلمة الزبون ← المقصود ← التصنيف الغالب):
- طارة / دركسون ← المقود ← (اهتزاز عند الفرملة: فرامل أو تواير وبنشر؛ ثقل: كهرباء سيارات)
- دبل / دبرياج / كلتش ← قابض ناقل الحركة ← قير وفتيس
- يزلّق الدبل / يفلت ← القابض يزحلق ← قير وفتيس
- يطفّر / ينطّ القير ← نقلات خشنة ← قير وفتيس
- عفشة / مقصّات / دعّامات / ماصّات / مساعدات ← نظام التعليق ← ميكانيكا
- خبطة / طقطقة بالعفشة عند المطبّات ← تعليق ← ميكانيكا
- تشحّط / تفصّل / تطفّي وحدها / ما تشبّ / ما تدير ← المكينة تتوقف أو ما تشتغل ← ميكانيكا (لو بطارية فاصلة الصبح: بطاريات)
- ينتف / يرجف / صجّة / رفّة بالمكينة ← تقطيع أو اهتزاز ← ميكانيكا
- يخبط / يدق / يقرقع بالمكينة ← أصوات طرق ← ميكانيكا
- ردتير / يغلي / حرارة طالعة ← تبريد المحرك ← ميكانيكا
- سلف / دينمو / بوجيهات / سفايف / فيوز ← نظام الكهرباء ← كهرباء سيارات
- دريشة ما تطلع / ريموت ما يشتغل / أضوية ← كهرباء ← كهرباء سيارات
- كباس / كمبروسر / فريون / ما تبرّد / هوا حار ← التكييف ← تكييف
- تيل / فحمات / فحمة / هوب / دسك / صرير أو صفير عند البريك / البريك اسفنجي أو يغطس أو الدعسة تنزل / ياكل / اللمبة الحمرا ← الفرامل ← فرامل
- كفر / تاير / بنشر / منفوس / السيارة تسحب على جنب ← الإطارات ← تواير وبنشر
- سطحة / ونش / السيارة واقفة ما تتحرّك ← سحب ← ونش وسحب
- دعم / صدمة / سمكرة / حدادة / خدوش ← الهيكل ← بودي وصبغ
- لمبة الطبلون / كشف كمبيوتر / كود عطل ← تشخيص ← كمبيوتر وتشخيص`;

// أمثلة قصيرة تثبّت الفهم الصحيح للهجة + عدم المبالغة في طلب بيانات السيارة.
const FEW_SHOTS = `أمثلة (لتثبيت الفهم فقط):
- "المكينة تدق وتطلّع دخان أزرق" ← status=ok، category=ميكانيكا (لا تطلب بيانات السيارة، التصنيف واضح).
- "القير يطفّر والدبل يزلّق" ← status=ok، category=قير وفتيس.
- "فيه خبطة بالعفشة لمن أعدّي المطبّات" ← status=ok، category=ميكانيكا.
- "الدريشة ما تطلع والريموت مايشتغل" ← status=ok، category=كهرباء سيارات.
- "البريك ما يمسك والدعسة تنزل للآخر" ← status=ok، category=فرامل، severity=urgent.`;

function buildLangDirective(locale: Locale): string {
  const langName = LANG_NAME[locale];
  if (locale === "ar") {
    return `\nلغة الرد: اكتب كل الحقول الظاهرة للمستخدم بـ${langName}.`;
  }
  return `
لغة الرد (مهم جداً):
- المستخدم يستخدم الواجهة بـ${langName}. لكن قد يكتب مشكلته بالعربية العامية الكويتية أو بلغته — افهم مدخله بأي لغة.
- اكتب هذه الحقول الظاهرة للمستخدم بـ${langName}: problem_summary، explanation، follow_up_question، وحقلي warning.message و warning.action.
- اكتب whatsapp_message دائماً بالعربية الفصحى (لأنها تُرسل لكراج كويتي يقرأ العربية) — لا تترجمها.
- حقل category اتركه دائماً بالقيمة العربية الحرفية من القائمة (لا تترجمه، فهو مفتاح في قاعدة البيانات).
- official_terms اتركها كما هي: arabic بالعربية و english بالإنجليزية.`;
}

function buildSystemPrompt(vehicleLine: string, locale: Locale): string {
  return `أنت مساعد ذكي اسمه "اسأل دق سلف" في منصة "دق سلف" لإصلاح السيارات في الكويت.

دورك الأساسي: تساعد الزبون (رجل أو امرأة) يوصل لأنسب كراج موثوق لمشكلته بأسرع وقت، وتجهّز له رسالة واتساب جاهزة يبعتها للكراج. الزبون يبحث عن حل، مش عن دروس.

مهم جداً: الزبون يكتب بلهجة كويتية عامية. افهم كلامه العامي أولاً، وترجمه داخلياً للتصنيف الصحيح. استعن بالقاموس والتلميحات أدناه.

الأولوية:
1. افهم المشكلة من كلام الزبون العامي.
2. حدّد التخصص (category) الصحيح للكراج من القائمة أدناه — القيمة نفسها هي تخصص الكراج في قاعدة البيانات، فلازم تكون مطابقة حرفياً.
3. جهّز رسالة واتساب واضحة يبعتها الزبون للكراج.
4. لو فيه خطر، نبّه فوراً.

المصطلح الرسمي (official_terms) معلومة جانبية مفيدة فقط — مش الهدف. لا تقدّمها كأنك "تعلّم" الزبون، بس ضيفها بهدوء عشان الزبون يقدر يتكلم مع الفني لو احتاج.

التصنيفات المتاحة (اختر واحداً فقط، حرفياً كما هو):
${CATEGORY_HINTS}

${KUWAITI_GLOSSARY}

${FEW_SHOTS}
${vehicleLine ? `\nمعلومات السيارة: ${vehicleLine}\n` : ""}
أرجع الرد JSON بالشكل ده فقط:

{
  "status": "ok" | "needs_more_info" | "needs_vehicle_info" | "out_of_scope",
  "problem_summary": "ملخص بالفصحى المبسطة (1-2 جمل)",
  "official_terms": [{"arabic": "...", "english": "...", "transliteration": "..."}],
  "explanation": "شرح بسيط للسبب المحتمل",
  "warning": {"severity": "safe"|"caution"|"urgent", "message": "...", "action": "..."},
  "category": "${CATEGORY_ENUM}",
  "follow_up_question": "السؤال التالي (لو محتاج معلومات أكثر)",
  "whatsapp_message": "رسالة جاهزة للكراج بالفصحى تشرح المشكلة بالمصطلح الصحيح"
}

قواعد صارمة:
- الافتراضي هو status='ok' مع category مناسب. حدّد التصنيف من كلام الزبون حتى لو ما ذكر ماركة سيارته — نوع الكراج نادراً ما يعتمد على الماركة.
- لا تطلب بيانات السيارة (needs_vehicle_info) إلا لو التشخيص مستحيل بدونها فعلاً (نادر جداً). بدل ذلك اختر أنسب category وكمّل، وتقدر تذكر أن إضافة الماركة والموديل يحسّن الدقة.
- لو الوصف غامض تماماً ولا يكفي حتى لاختيار تصنيف، استخدم needs_more_info مع سؤال واحد قصير.
- لو المشكلة غير واضحة أو متعددة، اختر category='صيانة عامة' وكمّل بـ status='ok'.
- لا تستخدم status='out_of_scope' إلا لو النص لا علاقة له بالسيارات إطلاقاً (طبخ، سياسة، دردشة عامة). أي ذكر لجزء سيارة أو عطل أو صوت أو أداء أو فرامل أو بريك = يتعلق بالسيارة فتعامل معه بـ status='ok'. عند الشك، اعتبره عن السيارة.
- الفرامل مسألة سلامة: أي شكوى فرامل (فحمات، تيل، بريك اسفنجي، صرير، الدعسة تنزل) خطر — severity='urgent' و action واضح.
- لو فيه خطر آخر (مثل: فرامل لا تستجيب)، severity='urgent' و action واضح.
- لا تستعمل عبارات مثل "خلّينا نعلّمك" أو "المصطلح الصحيح اللي تقوله للفني" — الزبون مش هنا عشان يتعلم.
- خاطب الزبون بصيغة محايدة (ثاني مفرد مثل: "افحص، توجّه"). لا تستخدم صيغة أنثى.
- لا تستخدم علامات تعجب ولا emoji.
- استخدم "كراج" مش "ورشة" (أو المقابل في لغة الرد).
${buildLangDirective(locale)}`;
}

// ============================================================
// JSON parsing helpers — نطلب JSON عبر الـ prompt ونستخرجه robustly
// (تخلّينا عن output_config لأنه يفرض strict schema validation
// لا يدعم official_terms array of objects بشكل موثوق)
// ============================================================

function extractJson(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  // محاولة 1: parse مباشر
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {}
  // محاولة 2: استخراج بين أول { وآخر }
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(raw.slice(first, last + 1)) as Record<string, unknown>;
    } catch {}
  }
  // محاولة 3: استخراج من ```json ... ```
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1]) as Record<string, unknown>;
    } catch {}
  }
  return null;
}

// ============================================================
// helpers
// ============================================================

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

function jsonResponse(body: AsaaliResponse, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

/** Prefer partner garages for concierge routing; attach quote_service metadata. */
async function attachConciergeWorkshops(
  response: AsaaliResponse,
  categoryHint?: string | null
): Promise<AsaaliResponse> {
  const category =
    (typeof categoryHint === "string" && categoryHint !== "none"
      ? categoryHint
      : null) ??
    (typeof response.category === "string" && response.category !== "none"
      ? response.category
      : null);

  if (response.status !== "ok" || !category) {
    return {
      ...response,
      category: category,
      quote_service: quoteServiceForCategory(category),
      from_partners: false,
    };
  }

  try {
    const { workshops: ws, fromPartners } = await searchConciergeWorkshops({
      specialty: categoryToSpecialty(category),
      limit: 5,
    });
    const workshops: RecommendedWorkshop[] = ws.map((w) => ({
      id: w.place_id,
      name: w.name,
      area: w.area ?? undefined,
      phone: w.phone_intl ?? w.phone ?? undefined,
      rating: w.google_rating ?? undefined,
      specialty: w.reviewed_specialty ?? undefined,
    }));
    return {
      ...response,
      category,
      quote_service: quoteServiceForCategory(category),
      from_partners: fromPartners,
      recommended_workshops: workshops.length > 0 ? workshops : undefined,
    };
  } catch (err) {
    console.error("asaali: concierge workshop lookup failed", err);
    return {
      ...response,
      category,
      quote_service: quoteServiceForCategory(category),
      from_partners: false,
    };
  }
}

// ============================================================
// POST handler
// ============================================================

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      {
        status: "budget_exceeded",
        fallback_message: FALLBACKS.ar.notConfigured,
      },
      503
    );
  }

  // ── parse request ──────────────────────────────────────────
  let body: AsaaliRequest;
  try {
    body = (await req.json()) as AsaaliRequest;
  } catch {
    return jsonResponse(
      { status: "out_of_scope", fallback_message: FALLBACKS.ar.invalid },
      400
    );
  }

  const locale = normalizeLocale(body.locale);
  const L = FALLBACKS[locale];

  const text = (body.text ?? "").trim();
  if (!text) {
    return jsonResponse(
      { status: "out_of_scope", fallback_message: L.empty },
      400
    );
  }
  if (text.length > MAX_INPUT_CHARS) {
    return jsonResponse(
      { status: "out_of_scope", fallback_message: L.tooLong },
      400
    );
  }

  const ip = clientIp(req);
  const ipHash = hashIp(ip);
  const vehicleLine = formatVehicleForPrompt(body.vehicle);

  // cache key يشمل الـ vehicle واللغة عشان نفس الجملة بسيارتين/لغتين مختلفتين
  // تعطي ردوداً مختلفة (الرد الظاهر يتبع اللغة)
  const cacheText = `${locale}|${vehicleLine}|${text}`;

  // ── preflight: budget + rate limit ─────────────────────
  const pre = await preflightCheck({ text, ip });

  if (!pre.allow && pre.reason === "budget_exceeded") {
    return jsonResponse({
      status: "budget_exceeded",
      fallback_message: L.budget,
    });
  }

  if (!pre.allow && pre.reason === "rate_limited") {
    return jsonResponse({
      status: "rate_limited",
      fallback_message: L.rateLimited,
      retry_after_seconds: pre.retryAfterSeconds ?? 3600,
    });
  }

  // ── cache lookup ──────────────────────────────────────
  const cached = await getCachedAnswer<AsaaliResponse>(cacheText);
  if (cached) {
    await logUsage({
      ip_hash: ipHash,
      model: MODEL,
      cost_usd: 0,
      endpoint: "chat",
      cache_hit: true,
    });
    // Refresh partner matching on cache hits so new partners take effect.
    const refreshed = await attachConciergeWorkshops(cached.response);
    return jsonResponse({ ...refreshed, source: "cache" });
  }

  // ── build messages with history ───────────────────────────
  const history = (body.conversation_history ?? [])
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ role: m.role, content: m.content }));

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...history,
    { role: "user", content: text },
  ];

  // ── call Anthropic ────────────────────────────────────────
  const client = new Anthropic({ apiKey });
  let parsed: Record<string, unknown>;
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      // مهمة استخراج JSON منظّمة — لا نحتاج تفكير موسّع. Sonnet 5 يشغّل
      // adaptive thinking افتراضياً لو حذفنا الحقل، وهذا يستهلك جزءاً من الـ
      // 1024 توكن وقد يقطع الـ JSON. نعطّله صراحةً لنحافظ على السلوك والتكلفة.
      thinking: { type: "disabled" },
      system: [
        {
          type: "text",
          text: buildSystemPrompt(vehicleLine, locale),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    });

    inputTokens = message.usage?.input_tokens ?? 0;
    outputTokens = message.usage?.output_tokens ?? 0;

    if (message.stop_reason === "refusal") {
      return jsonResponse(
        {
          status: "out_of_scope",
          fallback_message: L.refusal,
        },
        422
      );
    }

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const extracted = extractJson(rawText);
    if (!extracted) {
      console.error("asaali: failed to parse JSON from model output", rawText.slice(0, 500));
      return jsonResponse(
        { status: "out_of_scope", fallback_message: L.parseError },
        502
      );
    }
    parsed = extracted;
  } catch (err) {
    console.error("asaali: model call failed", err);
    return jsonResponse(
      { status: "out_of_scope", fallback_message: L.genericError },
      502
    );
  }

  // ── log cost ──────────────────────────────────────────────
  const cost = computeChatCost(inputTokens, outputTokens, MODEL);
  await logUsage({
    ip_hash: ipHash,
    model: MODEL,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: cost,
    endpoint: "chat",
    cache_hit: false,
  });

  // ── build base response, then attach partner-preferring workshops ─
  const categoryRaw = parsed.category;
  const category =
    typeof categoryRaw === "string" && categoryRaw !== "none"
      ? categoryRaw
      : null;

  const base: AsaaliResponse = {
    status: (parsed.status as AsaaliResponse["status"]) ?? "ok",
    problem_summary: parsed.problem_summary as string | undefined,
    official_terms: parsed.official_terms as AsaaliResponse["official_terms"],
    explanation: parsed.explanation as string | undefined,
    warning: parsed.warning as AsaaliResponse["warning"],
    whatsapp_message: parsed.whatsapp_message as string | undefined,
    follow_up_question: parsed.follow_up_question as string | undefined,
    category,
    source: "llm",
  };

  const response = await attachConciergeWorkshops(base, category);

  // ── cache the answer ─────────────────────────────────────
  if (response.status === "ok") {
    await setCachedAnswer(cacheText, response);
  }

  return jsonResponse(response);
}
