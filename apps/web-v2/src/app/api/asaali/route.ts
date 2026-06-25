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
import { searchWorkshops } from "@/lib/workshops";
import { categoryToSpecialty } from "@/lib/garageTranslator";
import {
  preflightCheck,
  logUsage,
  getCachedAnswer,
  setCachedAnswer,
  computeChatCost,
  hashIp,
} from "@/lib/asaali-cost-guard";
import { formatVehicleForPrompt } from "@/lib/vehicle-data";
import type {
  AsaaliRequest,
  AsaaliResponse,
  RecommendedWorkshop,
} from "@/lib/asaali-schema";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "claude-haiku-4-5";
const MAX_INPUT_CHARS = 800;
const MAX_HISTORY_TURNS = 6;

// ============================================================
// System prompt — يُحقن فيه vehicle context عند الحاجة
// ============================================================

function buildSystemPrompt(vehicleLine: string): string {
  return `أنت مساعد ذكي اسمه "اسألي" في منصة "دق سلف" لإصلاح السيارات في الكويت.

دورك: تساعد المرأة (نورة) اللي عندها مشكلة في سيارتها وتخاف تروح للكراج لأنها مش متأكدة من المصطلح. تشرحلها المشكلة بالفصحى المبسطة، تعطيها المصطلح الرسمي، وترشّحلها كراج موثوق.

${vehicleLine ? `معلومات السيارة: ${vehicleLine}\n` : ""}

أرجع الرد JSON بالشكل ده فقط:

{
  "status": "ok" | "needs_more_info" | "needs_vehicle_info" | "out_of_scope",
  "problem_summary": "ملخص بالفصحى المبسطة (1-2 جمل)",
  "official_terms": [{"arabic": "...", "english": "...", "transliteration": "..."}],
  "explanation": "شرح بسيط للسبب المحتمل",
  "warning": {"severity": "safe"|"caution"|"urgent", "message": "...", "action": "..."},
  "category": "بنشر|بودي|قير|زيوت|تكييف|بطاريات|كهرباء|محرك|فرامل|null",
  "follow_up_question": "السؤال التالي (لو محتاج معلومات أكثر)",
  "whatsapp_message": "رسالة جاهزة للكراج بالفصحى تشرح المشكلة بالمصطلح الصح"
}

قواعد صارمة:
- ${!vehicleLine ? "لو ما عندك معلومات السيارة وكانت ضرورية للتشخيص الدقيق، رجّع status='needs_vehicle_info' و follow_up_question يطلب الماركة والموديل والسنة." : "استخدم معلومات السيارة في التشخيص."}
- لو السؤال مش عن السيارات، status='out_of_scope'.
- لو محتاج توضيح بسيط، status='needs_more_info'.
- لو فيه خطر (مثل: فرامل لا تستجيب)، severity='urgent' و action واضح.
- لا تستخدم علامات تعجب.
- لا تستخدم emoji.
- استخدم "كراج" مش "ورشة".
- كل النصوص بالفصحى المبسطة.`;
}

// ============================================================
// JSON schema for Anthropic structured output
// ============================================================

const OUTPUT_SCHEMA = {
  type: "object",
  required: ["status"],
  properties: {
    status: {
      type: "string",
      enum: ["ok", "needs_more_info", "needs_vehicle_info", "out_of_scope"],
    },
    problem_summary: { type: "string" },
    official_terms: {
      type: "array",
      items: {
        type: "object",
        properties: {
          arabic: { type: "string" },
          english: { type: "string" },
          transliteration: { type: "string" },
        },
        required: ["arabic", "english"],
      },
    },
    explanation: { type: "string" },
    warning: {
      type: "object",
      properties: {
        severity: { type: "string", enum: ["safe", "caution", "urgent"] },
        message: { type: "string" },
        action: { type: "string" },
      },
    },
    category: {
      type: ["string", "null"],
      enum: ["بنشر", "بودي", "قير", "زيوت", "تكييف", "بطاريات", "كهرباء", "محرك", "فرامل", null],
    },
    follow_up_question: { type: "string" },
    whatsapp_message: { type: "string" },
  },
};

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

// ============================================================
// POST handler
// ============================================================

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      {
        status: "budget_exceeded",
        fallback_message: "الخدمة غير مهيّأة حالياً.",
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
      { status: "out_of_scope", fallback_message: "طلب غير صالح." },
      400
    );
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return jsonResponse(
      { status: "out_of_scope", fallback_message: "اكتب مشكلة سيارتك أولاً." },
      400
    );
  }
  if (text.length > MAX_INPUT_CHARS) {
    return jsonResponse(
      {
        status: "out_of_scope",
        fallback_message: `النص طويل جداً (الحد ${MAX_INPUT_CHARS} حرف).`,
      },
      400
    );
  }

  const ip = clientIp(req);
  const ipHash = hashIp(ip);
  const vehicleLine = formatVehicleForPrompt(body.vehicle);

  // cache key يشمل الـ vehicle عشان نفس الجملة بسيارتين مختلفتين تعطي ردين
  const cacheText = `${vehicleLine}|${text}`;

  // ── preflight: budget + rate limit ─────────────────────
  const pre = await preflightCheck({ text, ip });

  if (!pre.allow && pre.reason === "budget_exceeded") {
    return jsonResponse({
      status: "budget_exceeded",
      fallback_message:
        "وصلنا الحد اليومي للخدمة، جرّبي بعد ساعات. تقدرين تتصلين بأي كراج مباشرة من صفحة الكراجات.",
    });
  }

  if (!pre.allow && pre.reason === "rate_limited") {
    return jsonResponse({
      status: "rate_limited",
      fallback_message: "طلبات كثيرة في وقت قصير، جرّبي بعد ساعة.",
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
    return jsonResponse({ ...cached.response, source: "cache" });
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
      system: [
        {
          type: "text",
          text: buildSystemPrompt(vehicleLine),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
      // Anthropic structured output
      output_config: {
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
    });

    inputTokens = message.usage?.input_tokens ?? 0;
    outputTokens = message.usage?.output_tokens ?? 0;

    if (message.stop_reason === "refusal") {
      return jsonResponse(
        {
          status: "out_of_scope",
          fallback_message: "تعذّر معالجة الطلب.",
        },
        422
      );
    }

    const jsonText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    parsed = JSON.parse(jsonText) as Record<string, unknown>;
  } catch (err) {
    console.error("asaali: model call failed", err);
    return jsonResponse(
      { status: "out_of_scope", fallback_message: "حدث خطأ، حاولي مرة أخرى." },
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

  // ── attach workshops if we have a category ───────────────
  const categoryRaw = parsed.category;
  const category = typeof categoryRaw === "string" ? categoryRaw : null;

  let workshops: RecommendedWorkshop[] = [];
  if (category && parsed.status === "ok") {
    try {
      const { workshops: ws } = await searchWorkshops({
        specialty: categoryToSpecialty(category),
        sort: "top-rated",
        limit: 5,
      });
      workshops = ws.map((w) => ({
        id: w.place_id,
        name: w.name,
        area: w.area ?? undefined,
        phone: w.phone_intl ?? w.phone ?? undefined,
        rating: w.google_rating ?? undefined,
      }));
    } catch (err) {
      console.error("asaali: workshop lookup failed", err);
    }
  }

  // ── build final response ─────────────────────────────────
  const response: AsaaliResponse = {
    status: (parsed.status as AsaaliResponse["status"]) ?? "ok",
    problem_summary: parsed.problem_summary as string | undefined,
    official_terms: parsed.official_terms as AsaaliResponse["official_terms"],
    explanation: parsed.explanation as string | undefined,
    warning: parsed.warning as AsaaliResponse["warning"],
    recommended_workshops: workshops.length > 0 ? workshops : undefined,
    whatsapp_message: parsed.whatsapp_message as string | undefined,
    follow_up_question: parsed.follow_up_question as string | undefined,
    source: "llm",
  };

  // ── cache the answer ─────────────────────────────────────
  if (response.status === "ok") {
    await setCachedAnswer(cacheText, response);
  }

  return jsonResponse(response);
}
