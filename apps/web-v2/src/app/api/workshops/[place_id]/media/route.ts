import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ place_id: string }> }
) {
  const { place_id } = await params;
  const { data: workshop, error: workshopError } = await supabasePublic
    .from("workshops")
    .select("place_id,is_partner,active,permanently_closed,main_image")
    .eq("place_id", place_id)
    .maybeSingle();
  if (
    workshopError ||
    !workshop ||
    workshop.is_partner !== true ||
    workshop.active !== true ||
    workshop.permanently_closed === true
  ) {
    return NextResponse.json({ hero_image_url: null, gallery_image_urls: [] });
  }

  const { data: override } = await supabasePublic
    .from("workshop_profile_overrides")
    .select("hero_image_url,gallery_image_urls")
    .eq("place_id", place_id)
    .maybeSingle();

  const gallery = Array.isArray(override?.gallery_image_urls)
    ? (override.gallery_image_urls as string[])
    : workshop.main_image
      ? [workshop.main_image]
      : [];
  return NextResponse.json({
    hero_image_url: override?.hero_image_url ?? workshop.main_image ?? null,
    gallery_image_urls: gallery,
  });
}
