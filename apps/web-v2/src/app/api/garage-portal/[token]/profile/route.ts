import { NextRequest, NextResponse } from "next/server";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { readJsonObject } from "@/lib/json-body";
import { applyGarageSelfEdit, validateGarageEdit, type GarageEditInput } from "@/lib/garage-portal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, token-gated endpoint. A garage edits the safe fields of its own page.
// Possession of the per-garage token is the credential; every write is audited
// in workshop_edit_log and scoped to a single garage row.
const EDIT_PER_HOUR = 40;

function asStr(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;

  const ip = clientIp(req);
  if (!(await consumeRateLimit(ip, "garage-portal-edit", EDIT_PER_HOUR, { failClosed: true }))) {
    return NextResponse.json({ error: "محاولات كثيرة، حاول بعد قليل." }, { status: 429 });
  }

  const body = await readJsonObject(req);
  if (!body) {
    return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });
  }

  const rawHints = body.specialtyHints;
  const input: GarageEditInput = {
    whatsapp: asStr(body.whatsapp) ?? null,
    area: asStr(body.area) ?? null,
    specialty: asStr(body.specialty) ?? null,
    specialtyHints: Array.isArray(rawHints)
      ? rawHints.filter((h): h is string => typeof h === "string")
      : null,
    openingHours: asStr(body.openingHours) ?? null,
    description: asStr(body.description) ?? null,
  };

  const { patch, errors } = validateGarageEdit(input);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  let result;
  try {
    result = await applyGarageSelfEdit(token, patch, {
      ip,
      userAgent: req.headers.get("user-agent"),
    });
  } catch (e) {
    console.error("garage self-edit failed:", e);
    return NextResponse.json({ error: "تعذّر حفظ التعديل، حاول مرة أخرى." }, { status: 500 });
  }

  if (!result) {
    return NextResponse.json({ error: "الرابط غير صالح." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, applied: result.applied });
}
