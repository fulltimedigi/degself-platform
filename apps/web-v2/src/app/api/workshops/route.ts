import { NextRequest, NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/workshops?ids=a,b,c — workshops by place_id (for the saved list). */
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100); // place_id is case-sensitive — pass through verbatim

  if (!ids.length) return NextResponse.json({ workshops: [] });

  const { data, error } = await supabasePublic
    .from("workshops")
    .select("*")
    .in("place_id", ids)
    .eq("active", true)
    .eq("permanently_closed", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // preserve the caller's order (most-recently-saved last → reverse for newest-first)
  const byId = new Map((data ?? []).map((w: { place_id: string }) => [w.place_id, w]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean).reverse();
  return NextResponse.json({ workshops: ordered });
}
