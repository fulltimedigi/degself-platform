import { searchWorkshops, type WorkshopWithEnrichment } from "@/lib/workshops";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Map Asaali / fault category → quote form service value (Arabic-canonical). */
export const CATEGORY_TO_QUOTE_SERVICE: Record<string, string> = {
  ميكانيكا: "ميكانيكا ومكينة (توضيب، تجفيت، زيوت)",
  "كهرباء سيارات": "كهرباء وكمبيوتر السيارة",
  "قير وفتيس": "قير / جير (تصليح، تجفيت، برمجة)",
  تكييف: "تكييف وفريون",
  "تواير وبنشر": "بنشر وتواير وبطاريات",
  فرامل: "فرامل (تيل، دسكات، ABS)",
  "بودي وصبغ": "حدادة وصبغ (سمكرة وحوادث)",
  "كمبيوتر وتشخيص": "كهرباء وكمبيوتر السيارة",
  بطاريات: "بنشر وتواير وبطاريات",
  "زيوت وصيانة": "ميكانيكا ومكينة (توضيب، تجفيت، زيوت)",
  "ونش وسحب": "ونش / سطحة",
  "صيانة عامة": "خدمة أخرى (اكتبها في وصف المشكلة)",
};

export function quoteServiceForCategory(category: string | null | undefined): string {
  if (!category) return "";
  return CATEGORY_TO_QUOTE_SERVICE[category] ?? "خدمة أخرى (اكتبها في وصف المشكلة)";
}

/**
 * Prefer partner garages for concierge routing. Falls back to the general
 * top-rated directory when no partners match the specialty (so the bot never
 * returns an empty list while the network is still being filled).
 */
export async function searchConciergeWorkshops(opts: {
  specialty: string;
  area?: string;
  limit?: number;
}): Promise<{ workshops: WorkshopWithEnrichment[]; fromPartners: boolean }> {
  const limit = opts.limit ?? 5;
  const partners = await searchWorkshops({
    specialty: opts.specialty,
    area: opts.area,
    partners_only: true,
    sort: "top-rated",
    limit,
  });
  if (partners.workshops.length > 0) {
    // Prefer higher partner_priority within the partner set.
    const sorted = [...partners.workshops].sort(
      (a, b) => (b.partner_priority ?? 0) - (a.partner_priority ?? 0)
    );
    return { workshops: sorted.slice(0, limit), fromPartners: true };
  }
  const fallback = await searchWorkshops({
    specialty: opts.specialty,
    area: opts.area,
    sort: "top-rated",
    limit,
  });
  return { workshops: fallback.workshops, fromPartners: false };
}

/** Admin: list current partners (service-role). */
export async function listPartners(): Promise<
  {
    place_id: string;
    name: string;
    area: string | null;
    reviewed_specialty: string | null;
    partner_priority: number;
    partner_notes: string | null;
    phone: string | null;
  }[]
> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("workshops")
    .select(
      "place_id,name,area,reviewed_specialty,partner_priority,partner_notes,phone"
    )
    .eq("is_partner", true)
    .eq("active", true)
    .order("partner_priority", { ascending: false })
    .order("name", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}
