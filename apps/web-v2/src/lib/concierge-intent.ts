/**
 * Zero-cost, high-confidence routing for the interactive concierge assistant.
 *
 * Only explicit intents are handled here. Ambiguous free text returns `unknown`
 * so ConciergeChat can ask the strict Haiku tool router instead of guessing.
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

// Keep only explicit roadside/emergency wording in the free deterministic path.
// Phrases such as "ما تدور" or "وقفت فجأة" are intentionally ambiguous: they
// can mean diagnosis OR urgent roadside help, so the LLM router decides them.
const EMERGENCY_RE = /سطحة|ونش|طارئ|طوارئ|سحب|emergency|tow/i;

const FIND_RE =
  /أدور\s*كراج|ادور\s*كراج|وين\s*كراج|أقرب\s*كراج|اقرب\s*كراج|كراجات\s*(قريبة|قريبه)|find\s*(a\s*)?garage|nearest\s*garage|garage\s*near\s*me/i;

const DIAGNOSE_RE =
  /عطل|خراب|مشكلة|صوت|دخان|حرارة|قير|بريك|فرامل|تكييف|بطارية|زيوت|مكينة|المحرك|يفصل|يهتز|diagnose|car\s*problem|engine\s*noise|smoke/i;

const GREETING_RE =
  /^(هلا|هلو|مرحبا|السلام|السلام\s+عليكم|سلام|hi|hello|hey|صباح\s+الخير|مساء\s+الخير)[\s!.،]*$/i;

export function detectConciergeIntent(text: string): ConciergeIntent {
  const t = text.trim();
  if (!t) return "unknown";
  if (GREETING_RE.test(t)) return "greeting";
  // Quote before diagnose — "أبي عرض سعر للمكينة" is an explicit quote ask.
  if (QUOTE_RE.test(t)) return "quote";
  if (EMERGENCY_RE.test(t)) return "emergency";
  if (FIND_RE.test(t) && !DIAGNOSE_RE.test(t)) return "find_garage";
  if (DIAGNOSE_RE.test(t)) return "diagnose";

  // Do not guess based on message length. Ambiguous first-turn free text is the
  // only traffic that should pay for the Haiku tool router.
  return "unknown";
}
