import { getSupabaseAdmin } from "@/lib/supabase/admin";

type PartnerRow = {
  place_id: string;
  name: string;
  phone: string | null;
  phone_intl: string | null;
  area: string | null;
  reviewed_specialty: string | null;
  partner_priority: number | null;
};

export type NetworkQuoteTarget = {
  place_id: string;
  name: string;
  phone?: string;
  rank: number;
  score: number;
  reason: string;
};

const SERVICE_SPECIALTIES: Record<string, string[]> = {
  "ميكانيكا ومكينة (توضيب، تجفيت، زيوت)": ["ميكانيكا", "زيوت وصيانة", "صيانة عامة"],
  "كهرباء وكمبيوتر السيارة": ["كهرباء سيارات", "كمبيوتر وتشخيص", "صيانة عامة"],
  "قير / جير (تصليح، تجفيت، برمجة)": ["قير وفتيس", "صيانة عامة"],
  "تكييف وفريون": ["تكييف", "صيانة عامة"],
  "بنشر وتواير وبطاريات": ["تواير وبنشر", "بطاريات", "صيانة عامة"],
  "فرامل (تيل، دسكات، ABS)": ["فرامل", "صيانة عامة"],
  "حدادة وصبغ (سمكرة وحوادث)": ["بودي وصبغ", "صيانة عامة"],
  "ونش / سطحة": ["ونش وسحب"],
  "خدمة أخرى (اكتبها في وصف المشكلة)": ["صيانة عامة"],
};

function norm(v: string | null | undefined): string {
  return (v ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function scorePartner(row: PartnerRow, service: string, area: string | null): { score: number; reason: string } | null {
  const allowed = SERVICE_SPECIALTIES[service] ?? ["صيانة عامة"];
  const specialty = row.reviewed_specialty ?? "";
  const specialtyIndex = allowed.indexOf(specialty);
  if (specialtyIndex < 0) return null;

  let score = specialtyIndex === 0 ? 100 : specialty === "صيانة عامة" ? 60 : 80;
  const reasons: string[] = [specialtyIndex === 0 ? "تخصص مطابق" : specialty === "صيانة عامة" ? "صيانة عامة" : "تخصص قريب"];

  if (area && row.area && norm(area) === norm(row.area)) {
    score += 30;
    reasons.push("نفس المنطقة");
  }
  if (row.phone_intl || row.phone) {
    score += 10;
    reasons.push("قناة تواصل متاحة");
  }
  const priority = Math.max(-20, Math.min(20, row.partner_priority ?? 0));
  score += priority;
  if (priority !== 0) reasons.push(`أولوية الشبكة ${priority > 0 ? "+" : ""}${priority}`);

  return { score, reason: reasons.join(" · ") };
}

export async function selectNetworkQuoteTargets(input: {
  service: string;
  area: string | null;
  limit?: number;
}): Promise<NetworkQuoteTarget[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("workshops")
    .select("place_id,name,phone,phone_intl,area,reviewed_specialty,partner_priority")
    .eq("is_partner", true)
    .eq("active", true)
    .eq("permanently_closed", false)
    .eq("is_automotive", true)
    .eq("out_of_scope", false)
    .limit(500);
  if (error) throw new Error(`network target lookup failed: ${error.message}`);

  const ranked = ((data ?? []) as PartnerRow[])
    .map((row) => ({ row, scored: scorePartner(row, input.service, input.area) }))
    .filter((x): x is { row: PartnerRow; scored: { score: number; reason: string } } => x.scored !== null)
    .sort((a, b) => b.scored.score - a.scored.score || a.row.name.localeCompare(b.row.name, "ar"));

  return ranked.slice(0, input.limit ?? 5).map(({ row, scored }, index) => {
    const phone = row.phone_intl ?? row.phone ?? undefined;
    return {
      place_id: row.place_id,
      name: row.name,
      ...(phone ? { phone } : {}),
      rank: index + 1,
      score: scored.score,
      reason: scored.reason,
    };
  });
}

export async function enqueueNetworkQuoteTargets(input: {
  quoteId: string;
  service: string;
  area: string | null;
  limit?: number;
}): Promise<NetworkQuoteTarget[]> {
  const admin = getSupabaseAdmin();
  const targets = await selectNetworkQuoteTargets(input);
  if (targets.length === 0) return [];

  const rows = targets.map((target) => ({
    quote_id: input.quoteId,
    workshop_id: target.place_id,
    channel: "whatsapp",
    status: target.phone ? "queued" : "blocked_no_channel",
    target_rank: target.rank,
    selection_score: target.score,
    selection_reason: target.reason,
  }));
  const { error: queueError } = await admin
    .from("quote_delivery_queue")
    .upsert(rows, { onConflict: "quote_id,workshop_id", ignoreDuplicates: true });
  if (queueError) throw new Error(`delivery queue insert failed: ${queueError.message}`);

  const matched = targets.map(({ place_id, name, phone }) => ({ place_id, name, ...(phone ? { phone } : {}) }));
  const { error: quoteError } = await admin
    .from("quotes")
    .update({ matched_workshops: matched })
    .eq("id", input.quoteId);
  if (quoteError) throw new Error(`quote routing snapshot failed: ${quoteError.message}`);

  return targets;
}
