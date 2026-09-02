import { NextRequest, NextResponse } from "next/server";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { optInGarage } from "@/lib/garage-portal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, token-gated endpoint. A garage taps "opt in to receive RFQs" on its
// own portal page (link delivered to its WhatsApp). No auth: possession of the
// per-garage token is the credential. Abuse is bounded by a per-IP hourly cap;
// the token itself scopes any effect to a single garage row.
const OPT_IN_PER_HOUR = 30;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;

  const ip = clientIp(req);
  if (!(await consumeRateLimit(ip, "garage-portal-optin", OPT_IN_PER_HOUR, { failClosed: true }))) {
    return NextResponse.json({ error: "محاولات كثيرة، حاول بعد قليل." }, { status: 429 });
  }

  let result;
  try {
    result = await optInGarage(token, { ip, userAgent: req.headers.get("user-agent") });
  } catch (e) {
    console.error("garage opt-in failed:", e);
    return NextResponse.json({ error: "تعذّر إتمام العملية، حاول مرة أخرى." }, { status: 500 });
  }

  if (!result) {
    return NextResponse.json({ error: "الرابط غير صالح." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, alreadyPartner: result.alreadyPartner });
}
