import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/quotes/[id]/garage-link — mint (once) the public garage
// submission token for this quote and return the shareable link. The founder
// forwards this link to garages over WhatsApp; they open it and submit their own
// structured offer without a login. Reuses an existing token so the link is stable.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }
  const { id } = await params;

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "النظام غير مهيأ." }, { status: 500 });
  }

  const { data: quote, error: qErr } = await admin
    .from("quotes")
    .select("id,garage_token")
    .eq("id", id)
    .maybeSingle();
  if (qErr) {
    console.error("garage-link fetch error:", qErr);
    return NextResponse.json({ error: "تعذّر جلب الطلب." }, { status: 500 });
  }
  if (!quote) return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });

  let token = quote.garage_token as string | null;
  if (!token) {
    token = randomBytes(16).toString("hex");
    const { error: uErr } = await admin
      .from("quotes")
      .update({ garage_token: token, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (uErr) {
      console.error("garage-link update error:", uErr);
      return NextResponse.json({ error: "تعذّر إنشاء الرابط." }, { status: 500 });
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";
  return NextResponse.json({ success: true, url: `${siteUrl}/submit-offer/${token}` });
}
