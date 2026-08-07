import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface PartnerWorkshopRow {
  place_id: string;
  name: string;
  specialty: string;
  area: string | null;
  governorate: string | null;
  phone: string | null;
  phone_intl: string | null;
  active: boolean;
  added_at: string;
}

export async function fetchPartnerWorkshops(): Promise<PartnerWorkshopRow[]> {
  const admin = getSupabaseAdmin();
  const { data: partners, error: partnerError } = await admin
    .from("partner_workshops")
    .select("place_id,added_at")
    .order("added_at", { ascending: false });

  if (partnerError) throw new Error(partnerError.message);
  if (!partners?.length) return [];

  const placeIds = partners.map((p) => p.place_id as string);
  const { data: workshops, error: workshopError } = await admin
    .from("workshops")
    .select("place_id,name,specialty,area,governorate,phone,phone_intl,active")
    .in("place_id", placeIds);

  if (workshopError) throw new Error(workshopError.message);

  const byId = new Map((workshops ?? []).map((w) => [w.place_id as string, w]));
  return partners.flatMap((partner) => {
    const workshop = byId.get(partner.place_id as string);
    if (!workshop) return [];
    return [
      {
        place_id: workshop.place_id as string,
        name: workshop.name as string,
        specialty: workshop.specialty as string,
        area: (workshop.area as string | null) ?? null,
        governorate: (workshop.governorate as string | null) ?? null,
        phone: (workshop.phone as string | null) ?? null,
        phone_intl: (workshop.phone_intl as string | null) ?? null,
        active: workshop.active !== false,
        added_at: partner.added_at as string,
      },
    ];
  });
}
