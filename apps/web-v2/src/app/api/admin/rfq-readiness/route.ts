import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function present(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }

  const config = {
    whatsapp_enabled: process.env.WHATSAPP_ENABLED === "true",
    token_configured: present("WHATSAPP_TOKEN"),
    phone_number_id_configured: present("WHATSAPP_PHONE_NUMBER_ID"),
    garage_template_configured: present("WHATSAPP_TEMPLATE_GARAGE_RFQ"),
    webhook_verify_token_configured: present("WHATSAPP_WEBHOOK_VERIFY_TOKEN"),
    app_secret_configured: present("WHATSAPP_APP_SECRET"),
    cron_secret_configured: present("CRON_SECRET"),
  };

  let partners = { total: 0, consented: 0, phone_verified: 0, rfq_ready: 0 };
  try {
    const admin = getSupabaseAdmin();
    const [total, consented, verified, ready] = await Promise.all([
      admin.from("workshops").select("place_id", { count: "exact", head: true }).eq("is_partner", true),
      admin.from("workshops").select("place_id", { count: "exact", head: true }).eq("is_partner", true).not("rfq_opt_in_at", "is", null),
      admin.from("workshops").select("place_id", { count: "exact", head: true }).eq("is_partner", true).not("rfq_phone_verified_at", "is", null),
      admin.from("workshops").select("place_id", { count: "exact", head: true }).eq("is_partner", true).eq("rfq_dispatch_enabled", true),
    ]);
    partners = {
      total: total.count ?? 0,
      consented: consented.count ?? 0,
      phone_verified: verified.count ?? 0,
      rfq_ready: ready.count ?? 0,
    };
  } catch (e) {
    console.error("rfq readiness counts failed:", e);
  }

  const providerConfigured =
    config.token_configured &&
    config.phone_number_id_configured &&
    config.garage_template_configured &&
    config.webhook_verify_token_configured &&
    config.app_secret_configured;

  return NextResponse.json({
    config,
    partners,
    provider_configured: providerConfigured,
    scheduler_configured: config.cron_secret_configured,
    activation_ready: providerConfigured && config.cron_secret_configured && partners.rfq_ready > 0,
    sending_active: config.whatsapp_enabled,
  });
}
