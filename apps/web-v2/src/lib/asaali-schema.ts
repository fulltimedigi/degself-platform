/**
 * asaali-schema.ts
 *
 * Type definitions for the /asaali (voice translator V2) feature.
 *
 * The OpenAI Chat Completions API is called with response_format: { type: "json_object" }
 * and the resulting JSON is validated/cast against these types at runtime via
 * isAsaaliResponse() in asaali-validate.ts.
 *
 * Status values:
 *   ok                  → diagnosis returned, all fields populated
 *   needs_more_info     → assistant asks the user a follow-up question
 *   needs_vehicle_info  → assistant requests vehicle make/model/year before diagnosing
 *   out_of_scope        → user asked about something unrelated to cars
 *   budget_exceeded     → monthly cost cap reached → dictionary fallback used
 *   rate_limited        → 5 req/hr cap hit
 */

// ============================================================
// Vehicle Context
// ============================================================
// يلتقطه VehicleSelector في الواجهة. كل الحقول اختيارية حتى يقدر المستخدم
// يبدأ بدون اختيار. الـ API يطلبه (needs_vehicle_info) عند الحاجة.

export type Transmission = "automatic" | "manual" | "cvt" | "unknown";

export interface VehicleContext {
  make?: string;        // مثال: "Toyota"
  model?: string;       // مثال: "Camry"
  year?: number;        // مثال: 2018
  transmission?: Transmission;
}

// ============================================================
// مكونات الرد
// ============================================================

export interface OfficialTerm {
  arabic: string;       // المصطلح الرسمي بالفصحى
  english: string;      // المقابل الإنجليزي
  transliteration?: string; // مثال: "alternator"
}

export type Severity = "safe" | "caution" | "urgent";

export interface Warning {
  severity: Severity;
  message: string;      // نص بالفصحى يشرح الخطورة
  action: string;       // ماذا تفعل (مثال: "أوقف السيارة فوراً")
}

export interface RecommendedWorkshop {
  id: string;
  name: string;
  area?: string;
  phone?: string;
  rating?: number;
  specialty?: string;
}

// ============================================================
// الرد الرئيسي
// ============================================================

export type AsaaliStatus =
  | "ok"
  | "needs_more_info"
  | "needs_vehicle_info"
  | "out_of_scope"
  | "budget_exceeded"
  | "rate_limited";

export interface AsaaliResponse {
  status: AsaaliStatus;

  // عند status === "ok"
  problem_summary?: string;        // ملخص بالفصحى المبسطة
  official_terms?: OfficialTerm[]; // المصطلحات الرسمية
  explanation?: string;            // شرح بسيط للمشكلة
  warning?: Warning;               // التحذير (لو فيه)
  recommended_workshops?: RecommendedWorkshop[];
  whatsapp_message?: string;       // رسالة جاهزة للكراج بالفصحى

  // عند status === "needs_more_info" أو "needs_vehicle_info"
  follow_up_question?: string;     // السؤال التالي

  // عند status === "budget_exceeded" أو "rate_limited"
  fallback_message?: string;       // رسالة للمستخدم
  retry_after_seconds?: number;    // عند rate_limited

  // metadata
  source?: "llm" | "cache" | "dictionary";
}

// ============================================================
// طلب الـ API
// ============================================================

export interface AsaaliRequest {
  text: string;                    // النص اللي قالته نورة (مفرّغ من Whisper أو Web Speech)
  vehicle?: VehicleContext;        // اختياري
  conversation_history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}
