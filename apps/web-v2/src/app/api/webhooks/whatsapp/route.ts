import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminWhatsApp } from "@/lib/callmebot";
import { adminForwardText, offersUrl } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Meta WhatsApp webhook. PUBLIC (Meta calls it; not under /admin so middleware
// doesn't gate it). Two jobs:
//  GET  — one-time verification handshake (hub.challenge).
//  POST — delivery-status callbacks (sent/delivered/read/failed). On 'failed' we
//         fall back to the manual forward: ping Ahmed with the one-tap wa.me link
//         so a customer whose number isn't on WhatsApp still gets their offers.
// This route makes NO outbound Meta API calls, so it's inert while WABA is off.

// GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const mode = p.get("hub.mode");
  const token = p.get("hub.verify_token");
  const challenge = p.get("hub.challenge") ?? "";
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && token === expected) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

interface WaStatus {
  id?: string;
  status?: string;
  errors?: { title?: string; message?: string }[];
}

export async function POST(req: NextRequest) {
  const raw = await req.text();

  // Verify Meta's signature when the app secret is configured (recommended).
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const sig = req.headers.get("x-hub-signature-256") ?? "";
    const expected = "sha256=" + createHmac("sha256", appSecret).update(raw).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return new NextResponse("invalid signature", { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true }); // ack malformed bodies so Meta stops retrying
  }

  try {
    const statuses: WaStatus[] = [];
    const entries = (payload as { entry?: unknown[] })?.entry ?? [];
    for (const entry of entries) {
      const changes = (entry as { changes?: unknown[] })?.changes ?? [];
      for (const change of changes) {
        const value = (change as { value?: { statuses?: WaStatus[] } })?.value;
        if (Array.isArray(value?.statuses)) statuses.push(...value.statuses);
      }
    }
    if (statuses.length) await processStatuses(statuses);
  } catch (e) {
    console.error("whatsapp webhook processing error:", e);
  }

  // Always 200 — Meta retries aggressively on non-2xx.
  return NextResponse.json({ ok: true });
}

async function processStatuses(statuses: WaStatus[]) {
  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return;
  }

  for (const s of statuses) {
    const wamid = s.id;
    const status = s.status;
    if (!wamid || !status) continue;

    // Look up the quote this message belongs to (and whether we already handled a failure).
    const { data: quote } = await admin
      .from("quotes")
      .select("id,customer_name,customer_phone,service,customer_token,wa_status")
      .eq("wa_message_id", wamid)
      .maybeSingle();
    if (!quote) continue;

    const alreadyFailed = quote.wa_status === "failed";
    await admin.from("quotes").update({ wa_status: status }).eq("id", quote.id);

    // On failure, hand off to the manual path once (dedup on repeat callbacks).
    if (status === "failed" && !alreadyFailed) {
      const { count } = await admin
        .from("quote_offers")
        .select("id", { count: "exact", head: true })
        .eq("quote_id", quote.id as string);
      const url = offersUrl(quote.customer_token as string);
      const forward = adminForwardText(
        quote.customer_name as string,
        quote.service as string,
        count ?? 0,
        quote.customer_phone as string,
        url
      );
      try {
        await sendAdminWhatsApp("⚠️ فشل الإرسال التلقائي للعميل — أرسلها يدويًا:\n\n" + forward);
      } catch (e) {
        console.error("whatsapp fallback notify failed:", e);
      }
    }
  }
}
