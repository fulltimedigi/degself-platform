import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quote_delivery_queue")
    .select(
      "id,workshop_id,status,channel,target_rank,selection_score,selection_reason,attempts,sent_at,last_error,outreach_id,workshop:workshops(name,phone,phone_intl)"
    )
    .eq("quote_id", id)
    .order("target_rank", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
