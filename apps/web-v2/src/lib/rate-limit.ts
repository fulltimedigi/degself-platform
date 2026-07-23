// Server-only IP rate limiting on the existing public.rate_limits table
// (PK: ip, bucket, window_start). Fixed hourly buckets. Fail-OPEN on infra
// errors — a limiter hiccup must never lock out real users. NEVER import from a
// client component (uses the service-role Supabase client).
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

/** Read-only: is this IP already at/over `limit` for this bucket this hour? */
export async function isOverLimit(ip: string, bucket: string, limit: number): Promise<boolean> {
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
    console.error(`rate-limit read failed (${bucket}), allowing:`, e);
    return false; // fail-open
  }
}

/** Increment the counter for this IP+bucket in the current hour. */
export async function recordHit(ip: string, bucket: string): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const windowStart = hourBucketISO();
    const { data } = await admin
      .from("rate_limits")
      .select("count")
      .eq("ip", ip)
      .eq("bucket", bucket)
      .eq("window_start", windowStart)
      .maybeSingle();
    const current = (data?.count as number | undefined) ?? 0;
    if (data) {
      await admin
        .from("rate_limits")
        .update({ count: current + 1 })
        .eq("ip", ip)
        .eq("bucket", bucket)
        .eq("window_start", windowStart);
    } else {
      await admin.from("rate_limits").insert({ ip, bucket, window_start: windowStart, count: 1 });
    }
  } catch (e) {
    console.error(`rate-limit write failed (${bucket}):`, e);
  }
}
