import { NextResponse } from "next/server";
import { advanceRfqRoutingWaves } from "@/lib/rfq-wave-orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  try {
    const summary = await advanceRfqRoutingWaves();
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("RFQ wave scheduler failed:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
