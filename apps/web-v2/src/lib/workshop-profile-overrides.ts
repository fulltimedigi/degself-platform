import { supabasePublic } from "@/lib/supabase/public";
import type { Workshop } from "@/lib/types";

export type WorkshopProfileOverride = {
  place_id: string;
  name: string | null;
  phone: string | null;
  phone_intl: string | null;
  website: string | null;
  address: string | null;
  area: string | null;
  reviewed_specialty: string | null;
  description: string | null;
  hero_image_url: string | null;
  gallery_image_urls: string[] | null;
};

export type WorkshopWithProfile = Workshop & {
  profile_description?: string | null;
  profile_hero_image_url?: string | null;
  profile_gallery_image_urls?: string[];
};

export function mergeWorkshopProfile(
  workshop: Workshop,
  override?: WorkshopProfileOverride | null
): WorkshopWithProfile {
  if (!override) return workshop;
  return {
    ...workshop,
    name: override.name ?? workshop.name,
    phone: override.phone ?? workshop.phone,
    phone_intl: override.phone_intl ?? workshop.phone_intl,
    website: override.website ?? workshop.website,
    address: override.address ?? workshop.address,
    area: override.area ?? workshop.area,
    reviewed_specialty: override.reviewed_specialty ?? workshop.reviewed_specialty,
    profile_description: override.description,
    profile_hero_image_url: override.hero_image_url,
    profile_gallery_image_urls: override.gallery_image_urls ?? [],
  };
}

export async function applyWorkshopProfileOverrides<T extends Workshop>(
  workshops: T[]
): Promise<(T & WorkshopWithProfile)[]> {
  if (!workshops.length) return workshops as (T & WorkshopWithProfile)[];
  const ids = [...new Set(workshops.map((w) => w.place_id))];
  const { data, error } = await supabasePublic
    .from("workshop_profile_overrides")
    .select(
      "place_id,name,phone,phone_intl,website,address,area,reviewed_specialty,description,hero_image_url,gallery_image_urls"
    )
    .in("place_id", ids);
  // Migration may briefly lag a preview deploy; never break the directory for an
  // optional curated overlay.
  if (error || !data?.length) return workshops as (T & WorkshopWithProfile)[];
  const byId = new Map(
    (data as WorkshopProfileOverride[]).map((row) => [row.place_id, row])
  );
  return workshops.map((w) => ({
    ...w,
    ...mergeWorkshopProfile(w, byId.get(w.place_id)),
  })) as (T & WorkshopWithProfile)[];
}

export async function getWorkshopProfileOverride(
  placeId: string
): Promise<WorkshopProfileOverride | null> {
  const { data, error } = await supabasePublic
    .from("workshop_profile_overrides")
    .select(
      "place_id,name,phone,phone_intl,website,address,area,reviewed_specialty,description,hero_image_url,gallery_image_urls"
    )
    .eq("place_id", placeId)
    .maybeSingle();
  if (error) return null;
  return (data as WorkshopProfileOverride | null) ?? null;
}
