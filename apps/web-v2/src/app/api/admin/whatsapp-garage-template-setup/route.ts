import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  GARAGE_RFQ_TEMPLATE_NAME,
  submitGarageRfqTemplate,
} from "@/lib/whatsapp-garage-template-setup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};

/** Temporary, one-shot admin action. Remove immediately after template submission. */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json(
      { ok: false, status: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const body = (await req.json().catch(() => null)) as { confirm?: unknown } | null;
  if (body?.confirm !== GARAGE_RFQ_TEMPLATE_NAME) {
    return NextResponse.json(
      { ok: false, status: "confirmation_required" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) {
    return NextResponse.json(
      {
        ok: false,
        status: "missing_credentials",
        configured: {
          token: Boolean(token),
          phone_number_id: Boolean(phoneNumberId),
        },
      },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  const result = await submitGarageRfqTemplate(token);
  return NextResponse.json(result, {
    status: result.ok ? 200 : 502,
    headers: NO_STORE_HEADERS,
  });
}
