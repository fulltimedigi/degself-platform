/**
 * asaali-cost-guard.ts
 *
 * طبقة الحماية المالية لميزة /asaali (المترجم الصوتي)
 *
 * الاستراتيجية الثلاثية:
 *   1. Budget Guard  — سقف $25/شهر، فوقه نرجع dictionary fallback
 *   2. Rate Limit    — 5 طلبات/IP/ساعة (للحماية من الإساءة)
 *   3. Cache Layer   — sha256 على النص المُطبّع، TTL أسبوع
 *
 * تسلسل الاستخدام في /api/asaali/route.ts:
 *   1. const budget = await isWithinBudget();
 *      if (!budget.ok) return { status: 'budget_exceeded', ... };
 *
 *   2. const rl = await checkRateLimit(ipHash);
 *      if (!rl.ok) return { status: 'rate_limited', retryAfter: rl.retryAfter };
 *
 *   3. const cached = await getCachedAnswer(normalizedText);
 *      if (cached) return { ...cached, status: 'ok', source: 'cache' };
 *
 *   4. const llmResult = await callOpenAI(...);
 *      await setCachedAnswer(normalizedText, llmResult);
 *      await logUsage({ cost_usd, model, ip_hash, ... });
 *      return llmResult;
 *
 * ⚠️ ملاحظة: استخدم getSupabaseAdmin() من lib/supabase/admin.ts
 * ⚠️ استخدم lib/normalize.ts للتطبيع — لا تُنشئ normalizer جديد
 */

import crypto from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { normalizeArabic } from '@/lib/normalize';
import { consumeRateLimit } from '@/lib/rate-limit';

// ============================================================
// إعدادات قابلة للضبط
// ============================================================
export const ASAALI_CONFIG = {
  MONTHLY_BUDGET_USD: 25,        // السقف الشهري الصلب
  RATE_LIMIT_PER_HOUR: 5,        // طلبات/IP/ساعة
  CACHE_TTL_HOURS: 24 * 7,       // أسبوع
  WARN_AT_PERCENT: 80,           // تحذير عند 80% من الميزانية
} as const;

// أسعار LLM (يونيو 2026) — راجعها كل فترة
const PRICING = {
  'gpt-4o-mini': {
    input_per_1k: 0.00015,         // $0.15 / 1M tokens
    output_per_1k: 0.0006,         // $0.60 / 1M tokens
  },
  // Anthropic Claude Haiku 4.5 — مستخدم في /api/translate
  'claude-haiku-4-5': {
    input_per_1k: 0.001,           // $1.00 / 1M tokens
    output_per_1k: 0.005,          // $5.00 / 1M tokens
  },
  // Anthropic Claude Sonnet 5 — مستخدم في /api/asaali (فهم لهجة أدق).
  // نستخدم السعر القياسي $3/$15 (لا السعر التمهيدي $2/$10) عمداً حتى يوقف
  // حارس الميزانية أبكر قليلاً من الإنفاق الحقيقي — أأمن لسقف صلب.
  'claude-sonnet-5': {
    input_per_1k: 0.003,           // $3.00 / 1M tokens
    output_per_1k: 0.015,          // $15.00 / 1M tokens
  },
  'whisper-1': {
    per_minute: 0.006,             // $0.006 / minute
  },
} as const;

export type ChatModel = 'gpt-4o-mini' | 'claude-haiku-4-5' | 'claude-sonnet-5';

// ============================================================
// Types
// ============================================================
export interface UsageRow {
  ip_hash?: string;
  model: 'gpt-4o-mini' | 'claude-haiku-4-5' | 'claude-sonnet-5' | 'whisper-1';
  input_tokens?: number;
  output_tokens?: number;
  audio_seconds?: number;
  cost_usd: number;
  endpoint?: 'chat' | 'transcribe';
  cache_hit?: boolean;
  meta?: Record<string, unknown>;
}

export interface BudgetCheck {
  ok: boolean;
  spent_usd: number;
  budget_usd: number;
  percent_used: number;
  warn: boolean;
}

export interface RateLimitCheck {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface CachedAnswer<T = unknown> {
  response: T;
  hits: number;
  cached_at: string;
}

// ============================================================
// Helpers
// ============================================================

/** Hash لعنوان IP — لا نخزن الـ IP خام */
export function hashIp(ip: string): string {
  // Prefer a dedicated salt; fall back to other server secrets so we never use
  // a public default string that would make hashes rainbow-tableable.
  const salt =
    process.env.IP_HASH_SALT?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.MODERATION_PASSWORD?.trim();
  if (!salt) {
    console.error('[asaali-cost-guard] IP_HASH_SALT unset — configure it in env');
  }
  return crypto
    .createHash('sha256')
    .update(`${salt || 'asaali-unconfigured'}:${ip}`)
    .digest('hex')
    .slice(0, 32);
}

/** Hash للنص المُطبَّع — مفتاح الكاش */
export function hashQuery(text: string): string {
  const normalized = normalizeArabic(text).trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/** يحسب تكلفة استدعاء chat model */
export function computeChatCost(
  inputTokens: number,
  outputTokens: number,
  model: ChatModel = 'claude-haiku-4-5'
): number {
  const p = PRICING[model];
  return (inputTokens / 1000) * p.input_per_1k + (outputTokens / 1000) * p.output_per_1k;
}

/** يحسب تكلفة استدعاء Whisper */
export function computeWhisperCost(audioSeconds: number): number {
  return (audioSeconds / 60) * PRICING['whisper-1'].per_minute;
}

// ============================================================
// 1) Budget Guard
// ============================================================
export async function isWithinBudget(): Promise<BudgetCheck> {
  const supabase = getSupabaseAdmin();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('asaali_usage')
    .select('cost_usd')
    .gte('created_at', monthStart.toISOString())
    .eq('cache_hit', false);

  if (error) {
    console.error('[asaali-cost-guard] budget check failed:', error);
    // Fail-CLOSED on infra errors — a blind allow can blow the hard $25 cap.
    return {
      ok: false,
      spent_usd: 0,
      budget_usd: ASAALI_CONFIG.MONTHLY_BUDGET_USD,
      percent_used: 100,
      warn: true,
    };
  }

  const spent = (data ?? []).reduce((sum, r) => sum + Number(r.cost_usd ?? 0), 0);
  const budget = ASAALI_CONFIG.MONTHLY_BUDGET_USD;
  const percent = (spent / budget) * 100;

  return {
    ok: spent < budget,
    spent_usd: Number(spent.toFixed(4)),
    budget_usd: budget,
    percent_used: Number(percent.toFixed(2)),
    warn: percent >= ASAALI_CONFIG.WARN_AT_PERCENT,
  };
}

// ============================================================
// 2) Rate Limit — atomic via public.rate_limits / bump_rate_limit RPC
// ============================================================
export async function checkRateLimit(ipHash: string): Promise<RateLimitCheck> {
  const max = ASAALI_CONFIG.RATE_LIMIT_PER_HOUR;
  // Store the hash in rate_limits.ip (text) — never the raw IP.
  const allowed = await consumeRateLimit(ipHash, 'asaali', max);
  if (!allowed) {
    const now = new Date();
    const bucketStart = new Date(now);
    bucketStart.setUTCMinutes(0, 0, 0);
    const nextHour = new Date(bucketStart.getTime() + 60 * 60 * 1000);
    const retryAfter = Math.max(0, Math.floor((nextHour.getTime() - now.getTime()) / 1000));
    return { ok: false, remaining: 0, retryAfterSeconds: retryAfter };
  }
  return { ok: true, remaining: Math.max(0, max - 1), retryAfterSeconds: 0 };
}

// ============================================================
// 3) Cache Layer
// ============================================================
export async function getCachedAnswer<T = unknown>(
  text: string,
): Promise<CachedAnswer<T> | null> {
  const supabase = getSupabaseAdmin();
  const queryHash = hashQuery(text);

  const { data, error } = await supabase
    .from('asaali_cache')
    .select('response_json, hits, created_at, expires_at')
    .eq('query_hash', queryHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error('[asaali-cost-guard] cache get failed:', error);
    return null;
  }
  if (!data) return null;

  // increment hits + last_hit_at (fire-and-forget)
  supabase
    .from('asaali_cache')
    .update({ hits: (data.hits ?? 0) + 1, last_hit_at: new Date().toISOString() })
    .eq('query_hash', queryHash)
    .then(({ error: e }) => {
      if (e) console.error('[asaali-cost-guard] cache bump failed:', e);
    });

  return {
    response: data.response_json as T,
    hits: data.hits ?? 0,
    cached_at: data.created_at,
  };
}

export async function setCachedAnswer(
  text: string,
  response: unknown,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const queryHash = hashQuery(text);
  const expiresAt = new Date(Date.now() + ASAALI_CONFIG.CACHE_TTL_HOURS * 60 * 60 * 1000);

  const { error } = await supabase
    .from('asaali_cache')
    .upsert({
      query_hash: queryHash,
      query_text: text.slice(0, 500), // أول 500 حرف للمراجعة فقط
      response_json: response,
      expires_at: expiresAt.toISOString(),
      hits: 0,
    });

  if (error) console.error('[asaali-cost-guard] cache set failed:', error);
}

// ============================================================
// 4) Usage Logger
// ============================================================
export async function logUsage(row: UsageRow): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('asaali_usage').insert({
    ip_hash: row.ip_hash,
    model: row.model,
    input_tokens: row.input_tokens ?? 0,
    output_tokens: row.output_tokens ?? 0,
    audio_seconds: row.audio_seconds ?? 0,
    cost_usd: row.cost_usd,
    endpoint: row.endpoint,
    cache_hit: row.cache_hit ?? false,
    meta: row.meta,
  });
  if (error) console.error('[asaali-cost-guard] usage log failed:', error);
}

// ============================================================
// 5) دالة شاملة (اختياري — للاستخدام السهل)
// ============================================================
/**
 * يفحص الحالة الثلاثية قبل استدعاء LLM
 * يُرجع { allow: true } لو كل شي تمام، وإلا { allow: false, reason, ... }
 */
export async function preflightCheck(opts: {
  text: string;
  ip: string;
}): Promise<
  | { allow: true; ipHash: string; budget: BudgetCheck }
  | { allow: false; reason: 'budget_exceeded'; budget: BudgetCheck }
  | { allow: false; reason: 'rate_limited'; retryAfterSeconds: number }
> {
  const ipHash = hashIp(opts.ip);

  const budget = await isWithinBudget();
  if (!budget.ok) {
    return { allow: false, reason: 'budget_exceeded', budget };
  }

  const rl = await checkRateLimit(ipHash);
  if (!rl.ok) {
    return { allow: false, reason: 'rate_limited', retryAfterSeconds: rl.retryAfterSeconds };
  }

  return { allow: true, ipHash, budget };
}
