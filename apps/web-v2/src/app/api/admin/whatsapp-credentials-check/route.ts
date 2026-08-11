import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { checkWhatsAppCredentials } from "@/lib/whatsapp-credentials-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};

/** Temporary, read-only production credential check. Remove after verification. */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json(
      { ok: false, status: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
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

  const result = await checkWhatsAppCredentials(token, phoneNumberId);
  return NextResponse.json(result, {
    status: result.ok ? 200 : 502,
    headers: NO_STORE_HEADERS,
  });
}
