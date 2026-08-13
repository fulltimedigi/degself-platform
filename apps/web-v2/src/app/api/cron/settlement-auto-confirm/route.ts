import { NextResponse } from "next/server";
import { isSettlementEnabled, runAutoConfirmSweep } from "@/lib/settlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Auto-confirm sweeper: flips pending settlements whose window has elapsed to
// completed (silence ⇒ done). CRON_SECRET-gated like the other crons. It does NOT
// bill or send anything, and is a no-op unless SETTLEMENT_ENABLED is on.

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function verifyAuth(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  const auth = request.headers.get("authorization") ?? "";
  const got = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return timingSafeEqualStr(got, expected);
}

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSettlementEnabled()) {
    return NextResponse.json({ ok: true, enabled: false, confirmed: 0 });
  }
  try {
    const confirmed = await runAutoConfirmSweep();
    return NextResponse.json({ ok: true, enabled: true, confirmed });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("settlement auto-confirm sweep failed:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
