import { NextRequest, NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { getWorkshop, searchWorkshops } from "@/lib/workshops";
import type { Workshop } from "@/lib/types";
import {
  isPublicMobileWorkshop,
  parseMobileWorkshopRequest,
  toMobileWorkshop,
} from "@/lib/mobile-workshops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=30, s-maxage=120, stale-while-revalidate=600",
};

export async function GET(request: NextRequest) {
  try {
    const parsed = parseMobileWorkshopRequest(request.nextUrl);

    if (parsed.kind === "detail") {
      const workshop = await getWorkshop(parsed.placeId);
      if (!workshop || !isPublicMobileWorkshop(workshop)) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json(
        { workshop: toMobileWorkshop(workshop) },
        { headers: CACHE_HEADERS }
      );
    }

    if (parsed.kind === "saved") {
      if (parsed.ids.length === 0) {
        return NextResponse.json({ workshops: [] }, { headers: CACHE_HEADERS });
      }
      const { data, error } = await supabasePublic
        .from("workshops")
        .select("*")
        .in("place_id", parsed.ids)
        .eq("active", true)
        .eq("permanently_closed", false)
        .eq("is_automotive", true)
        .eq("out_of_scope", false);
      if (error) throw error;

      const byId = new Map(
        ((data ?? []) as Workshop[]).map((workshop) => [workshop.place_id, workshop])
      );
      const workshops = parsed.ids
        .map((id) => byId.get(id))
        .filter((workshop): workshop is Workshop => !!workshop)
        .reverse()
        .map(toMobileWorkshop);
      return NextResponse.json({ workshops }, { headers: CACHE_HEADERS });
    }

    const result = await searchWorkshops({
      query: parsed.query || undefined,
      limit: parsed.limit,
      offset: parsed.offset,
    });
    return NextResponse.json(
      {
        workshops: result.workshops.map(toMobileWorkshop),
        total: result.total,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PLACE_ID") {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }
    console.error("mobile workshops read failed", error);
    return NextResponse.json({ error: "TEMPORARILY_UNAVAILABLE" }, { status: 503 });
  }
}
