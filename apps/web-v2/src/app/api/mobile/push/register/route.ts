import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { parseRegisterBody } from "@/lib/push-tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The native shell registers/refreshes its device token on launch, so a handful
// of calls per device per hour is plenty. Fail-OPEN: losing a registration is a
// missed notification, not a security event, and the limiter already fails open
// when its backend is down.
const REGISTER_RATE_LIMIT_PER_HOUR = 60;

export async function POST(request: NextRequest) {
  try {
    const withinLimit = await consumeRateLimit(
      clientIp(request),
      "push_register",
      REGISTER_RATE_LIMIT_PER_HOUR,
      { failClosed: false },
    );
    if (!withinLimit) {
      return NextResponse.json(
        { error: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = parseRegisterBody(body);
    if (!parsed) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const now = new Date().toISOString();
    // Upsert on the token PK: a re-register refreshes last_seen/updated and
    // re-activates a previously disabled token, without duplicating rows.
    // created_at is omitted so it keeps its insert-time default on update.
    const { error } = await getSupabaseAdmin()
      .from("push_tokens")
      .upsert(
        {
          token: parsed.token,
          platform: parsed.platform,
          updated_at: now,
          last_seen_at: now,
          disabled_at: null,
        },
        { onConflict: "token" },
      );
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("push token register failed", error);
    return NextResponse.json({ error: "TEMPORARILY_UNAVAILABLE" }, { status: 503 });
  }
}
