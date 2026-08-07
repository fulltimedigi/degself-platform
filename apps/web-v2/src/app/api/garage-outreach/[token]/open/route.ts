import { NextResponse } from "next/server";
import { markGarageOutreachOpened } from "@/lib/garage-outreach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/garage-outreach/[token]/open
// Privacy-safe, token-gated, idempotent first-open beacon. It stores no IP,
// browser fingerprint, user identity, or request metadata.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await params;
  if (!token || token.length > 128) return new Response(null, { status: 204 });

  try {
    await markGarageOutreachOpened(token);
  } catch {
    // Measurement must never block the garage workflow.
  }

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
