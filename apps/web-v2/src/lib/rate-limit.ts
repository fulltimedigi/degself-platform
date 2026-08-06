// Server-only IP rate limiting on public.rate_limits via atomic RPC
// bump_rate_limit (migration 020). NEVER import from a client component.
import type { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export function clientIp(req: NextRequest): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
}

// Fixed clock-hour bucket so hits in the same hour collide on the PK.
function hourBucketISO(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

type BumpRow = { allowed: boolean; new_count: number };

async function bump(
  ip: string,
  bucket: string,
  limit: number
): Promise<BumpRow | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("bump_rate_limit", {
    p_ip: ip,
    p_bucket: bucket,
    p_window: hourBucketISO(),
    p_limit: limit,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const allowed = Boolean((row as BumpRow).allowed);
  const new_count = Number((row as BumpRow).new_count);
  return { allowed, new_count };
}

export type ConsumeRateLimitOpts = {
  /**
   * Paid / spam-sensitive paths should fail closed when the limiter is down —
   * otherwise a Supabase blip during a traffic spike opens Anthropic/CallMeBot.
   * Default false preserves fail-open for harmless endpoints.
   */
  failClosed?: boolean;
};

/**
 * Atomically increment and return whether the IP is still within `limit`
 * for this bucket this hour.
 */
export async function consumeRateLimit(
  ip: string,
  bucket: string,
  limit: number,
  opts: ConsumeRateLimitOpts = {}
): Promise<boolean> {
  try {
    const row = await bump(ip, bucket, limit);
    if (!row) return !opts.failClosed;
    return row.allowed;
  } catch (e) {
    console.error(
      `rate-limit consume failed (${bucket}), ${opts.failClosed ? "denying" : "allowing"}:`,
      e
    );
    return opts.failClosed ? false : true;
  }
}

/** Read-only: is this IP already at/over `limit` for this bucket this hour? */
export async function isOverLimit(
  ip: string,
  bucket: string,
  limit: number,
  opts: ConsumeRateLimitOpts = {}
): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("rate_limits")
      .select("count")
      .eq("ip", ip)
      .eq("bucket", bucket)
      .eq("window_start", hourBucketISO())
      .maybeSingle();
    return ((data?.count as number | undefined) ?? 0) >= limit;
  } catch (e) {
    console.error(
      `rate-limit read failed (${bucket}), ${opts.failClosed ? "treating as over" : "allowing"}:`,
      e
    );
    return opts.failClosed ? true : false;
  }
}

/** Atomically increment the counter (e.g. failed login attempts only). */
export async function recordHit(ip: string, bucket: string): Promise<void> {
  try {
    // Limit unused for counting-only bumps; pass a huge ceiling.
    await bump(ip, bucket, Number.MAX_SAFE_INTEGER);
  } catch (e) {
    console.error(`rate-limit write failed (${bucket}):`, e);
  }
}
