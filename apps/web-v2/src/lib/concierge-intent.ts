/**
 * Lightweight intent routing for the interactive concierge assistant.
 * Deterministic heuristics first; diagnosis falls through to /api/asaali.
 */

export type ConciergeIntent =
  | "greeting"
  | "quote"
  | "diagnose"
  | "emergency"
  | "find_garage"
  | "unknown";

const QUOTE_RE =
  /عرض\s*سعر|اسعار|أسعار|كم\s*يكلف|تكلفة|ابي\s*عرض|أبغى\s*عرض|اطلب\s*عرض|quote|price\s*quote|estimate/i;

const EMERGENCY_RE =
  /سطحة|ونش|طارئ|طوارئ|واقفة|ما\s*تدور|ما\s*تشغل|سحب|emergency|tow/i;

const FIND_RE =
  /أدور\s*كراج|ادور\s*كراج|وين\s*كراج|أقرب\s*كراج|ابحث|دليل|كراجات|find\s*garage|search/i;

const DIAGNOSE_RE =
  /عطل|خراب|مشكلة|صوت|دخان|حرارة|قير|بريك|فرامل|تكييف|بطارية|زيوت|مكينة|المحرك|يفصل|يهتز|diagnose|problem|noise|smoke/i;

const GREETING_RE =
  /^(هلا|هلو|مرحبا|السلام|سلام|hi|hello|hey|صباح|مساء)[\s!.]*$/i;

export function detectConciergeIntent(text: string): ConciergeIntent {
  const t = text.trim();
  if (!t) return "unknown";
  if (GREETING_RE.test(t)) return "greeting";
  // Quote before diagnose — "أبي عرض سعر للمكينة" is a quote ask.
  if (QUOTE_RE.test(t)) return "quote";
  if (EMERGENCY_RE.test(t)) return "emergency";
  if (FIND_RE.test(t) && !DIAGNOSE_RE.test(t)) return "find_garage";
  if (DIAGNOSE_RE.test(t)) return "diagnose";
  // Default: treat free text as a possible fault description (assistant can clarify).
  if (t.length >= 8) return "diagnose";
  return "unknown";
}
