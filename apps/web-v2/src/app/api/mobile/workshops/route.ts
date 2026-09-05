import { NextRequest, NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { getWorkshop, searchWorkshops } from "@/lib/workshops";
import type { Workshop } from "@/lib/types";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
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

// Only the free-text search path runs the full multi-query ranking pipeline and
// is cacheable only per (q, offset) — so it is the abuse-amplification surface
// (iterate offset 0..MAX × arbitrary q to bypass the CDN and drive DB load).
// Detail/saved id-lookups are cheap and legitimately bursty (chunked saved
// hydration), so they are not throttled here. Fail-OPEN: this is a public read
// endpoint where availability outranks strictness, and the limiter already
// fails open when its backend is unavailable. Hourly bucket per IP.
const MOBILE_SEARCH_RATE_LIMIT_PER_HOUR = 300;

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
      // Existence-only check for the guest→account favorites handoff. It mirrors
      // the FK target (user_favorites.place_id → workshops.place_id): a row must
      // only EXIST to be insertable, regardless of public visibility. Returning
      // existence here (not the visibility-filtered catalog) prevents the handoff
      // from silently dropping favorites for temporarily-hidden workshops. No new
      // exposure: workshops is anon-readable by place_id already.
      if (request.nextUrl.searchParams.get("mode") === "exists") {
        if (parsed.ids.length === 0) {
          return NextResponse.json({ place_ids: [] }, { headers: CACHE_HEADERS });
        }
        const { data, error } = await supabasePublic
          .from("workshops")
          .select("place_id")
          .in("place_id", parsed.ids);
        if (error) throw error;
        const place_ids = ((data ?? []) as { place_id: string }[]).map(
          (row) => row.place_id
        );
        return NextResponse.json({ place_ids }, { headers: CACHE_HEADERS });
      }

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

    const withinLimit = await consumeRateLimit(
      clientIp(request),
      "mobile_workshops_search",
      MOBILE_SEARCH_RATE_LIMIT_PER_HOUR,
      { failClosed: false }
    );
    if (!withinLimit) {
      return NextResponse.json(
        { error: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }

    const result = await searchWorkshops({
      query: parsed.query || undefined,
      service_mode: parsed.serviceMode,
      specialty: parsed.specialty,
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
