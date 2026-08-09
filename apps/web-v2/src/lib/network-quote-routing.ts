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

export type RfqRoutingWave = 1 | 2 | 3;

export type NetworkQuoteTarget = {
  place_id: string;
  name: string;
  phone?: string;
  rank: number;
  score: number;
  reason: string;
  wave: RfqRoutingWave;
};

/**
 * Wave 1 = precision, Wave 2 = recall, Wave 3 = marketplace safety net.
 * The marketplace safety net is still private 1:1 delivery; it is never a WhatsApp group.
 */
const SERVICE_SPECIALTIES: Record<string, { precision: string[]; recall: string[] }> = {
  "ميكانيكا ومكينة (توضيب، تجفيت، زيوت)": {
    precision: ["ميكانيكا"],
    recall: ["زيوت وصيانة", "صيانة عامة"],
  },
  "كهرباء وكمبيوتر السيارة": {
    precision: ["كهرباء سيارات", "كمبيوتر وتشخيص"],
    recall: ["صيانة عامة"],
  },
  "قير / جير (تصليح، تجفيت، برمجة)": {
    precision: ["قير وفتيس"],
    recall: ["ميكانيكا", "كمبيوتر وتشخيص", "صيانة عامة"],
  },
  "تكييف وفريون": {
    precision: ["تكييف"],
    recall: ["كهرباء سيارات", "صيانة عامة"],
  },
  "بنشر وتواير وبطاريات": {
    precision: ["تواير وبنشر", "بطاريات"],
    recall: ["كهرباء سيارات", "صيانة عامة"],
  },
  "فرامل (تيل، دسكات، ABS)": {
    precision: ["فرامل"],
    recall: ["ميكانيكا", "صيانة عامة"],
  },
  "حدادة وصبغ (سمكرة وحوادث)": {
    precision: ["بودي وصبغ"],
    recall: ["صيانة عامة"],
  },
  "ونش / سطحة": {
    precision: ["ونش وسحب"],
    recall: [],
  },
  "خدمة أخرى (اكتبها في وصف المشكلة)": {
    precision: ["صيانة عامة"],
    recall: [],
  },
};

export const RFQ_WAVE_LIMITS: Record<RfqRoutingWave, number> = { 1: 5, 2: 8, 3: 20 };
export const RFQ_TARGET_OFFERS = 3;
export const RFQ_WAVE2_AFTER_MINUTES = 15;
export const RFQ_WAVE3_AFTER_MINUTES = 30;
export const RFQ_ROUTING_WINDOW_MINUTES = 120;

function norm(v: string | null | undefined): string {
  return (v ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function scorePartner(
  row: PartnerRow,
  service: string,
  area: string | null,
  wave: RfqRoutingWave
): { score: number; reason: string } | null {
  const specialty = row.reviewed_specialty ?? "";
  const mapping = SERVICE_SPECIALTIES[service] ?? {
    precision: ["صيانة عامة"],
    recall: [],
  };

  let specialtyScore = 0;
  let specialtyReason = "";
  if (wave === 1) {
    if (!mapping.precision.includes(specialty)) return null;
    specialtyScore = 120;
    specialtyReason = "الموجة 1 · تخصص دقيق";
  } else if (wave === 2) {
    if (!mapping.recall.includes(specialty)) return null;
    specialtyScore = specialty === "صيانة عامة" ? 70 : 90;
    specialtyReason = specialty === "صيانة عامة" ? "الموجة 2 · صيانة عامة احتياطية" : "الموجة 2 · تخصص قريب";
  } else {
    // Wave 3 is the broad partner-network safety net. Keep a specialty bonus where
    // possible but do not exclude a valid partner solely because classification was wrong.
    const isPrecision = mapping.precision.includes(specialty);
    const isRecall = mapping.recall.includes(specialty);
    specialtyScore = isPrecision ? 55 : isRecall ? 40 : 20;
    specialtyReason = "الموجة 3 · شبكة الشركاء الاحتياطية";
  }

  let score = specialtyScore;
  const reasons: string[] = [specialtyReason];

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
  wave?: RfqRoutingWave;
  excludePlaceIds?: string[];
  limit?: number;
}): Promise<NetworkQuoteTarget[]> {
  const admin = getSupabaseAdmin();
  const wave = input.wave ?? 1;
  const excluded = new Set(input.excludePlaceIds ?? []);
  const { data, error } = await admin
    .from("workshops")
    .select("place_id,name,phone,phone_intl,area,reviewed_specialty,partner_priority")
    .eq("is_partner", true)
    .eq("rfq_dispatch_enabled", true)
    .eq("active", true)
    .eq("permanently_closed", false)
    .eq("is_automotive", true)
    .eq("out_of_scope", false)
    .limit(500);
  if (error) throw new Error(`network target lookup failed: ${error.message}`);

  const ranked = ((data ?? []) as PartnerRow[])
    .filter((row) => !excluded.has(row.place_id))
    .map((row) => ({ row, scored: scorePartner(row, input.service, input.area, wave) }))
    .filter((x): x is { row: PartnerRow; scored: { score: number; reason: string } } => x.scored !== null)
    .sort((a, b) => b.scored.score - a.scored.score || a.row.name.localeCompare(b.row.name, "ar"));

  return ranked.slice(0, input.limit ?? RFQ_WAVE_LIMITS[wave]).map(({ row, scored }, index) => {
    const phone = row.phone_intl ?? row.phone ?? undefined;
    return {
      place_id: row.place_id,
      name: row.name,
      ...(phone ? { phone } : {}),
      rank: index + 1,
      score: scored.score,
      reason: scored.reason,
      wave,
    };
  });
}

type MatchedSnapshot = { place_id: string; name: string; phone?: string };

function parseMatchedSnapshot(raw: unknown): MatchedSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const place_id = typeof row.place_id === "string" ? row.place_id : "";
    const name = typeof row.name === "string" ? row.name : "";
    if (!place_id || !name) return [];
    const phone = typeof row.phone === "string" && row.phone ? row.phone : undefined;
    return [{ place_id, name, ...(phone ? { phone } : {}) }];
  });
}

export async function enqueueNetworkQuoteTargets(input: {
  quoteId: string;
  service: string;
  area: string | null;
  wave?: RfqRoutingWave;
  excludePlaceIds?: string[];
  limit?: number;
}): Promise<NetworkQuoteTarget[]> {
  const admin = getSupabaseAdmin();
  const wave = input.wave ?? 1;
  const targets = await selectNetworkQuoteTargets({ ...input, wave });
  if (targets.length === 0) return [];

  const rows = targets.map((target) => ({
    quote_id: input.quoteId,
    workshop_id: target.place_id,
    channel: "whatsapp",
    status: target.phone ? "queued" : "blocked_no_channel",
    target_rank: target.rank,
    selection_score: target.score,
    selection_reason: target.reason,
    routing_wave: wave,
  }));
  const { error: queueError } = await admin
    .from("quote_delivery_queue")
    .upsert(rows, { onConflict: "quote_id,workshop_id", ignoreDuplicates: true });
  if (queueError) throw new Error(`delivery queue insert failed: ${queueError.message}`);

  // Keep the admin snapshot additive across waves instead of replacing Wave 1.
  const { data: quote, error: quoteReadError } = await admin
    .from("quotes")
    .select("matched_workshops")
    .eq("id", input.quoteId)
    .maybeSingle();
  if (quoteReadError) throw new Error(`quote routing snapshot read failed: ${quoteReadError.message}`);
  const merged = new Map<string, MatchedSnapshot>();
  for (const item of parseMatchedSnapshot(quote?.matched_workshops)) merged.set(item.place_id, item);
  for (const { place_id, name, phone } of targets) {
    merged.set(place_id, { place_id, name, ...(phone ? { phone } : {}) });
  }
  const { error: quoteError } = await admin
    .from("quotes")
    .update({ matched_workshops: Array.from(merged.values()) })
    .eq("id", input.quoteId);
  if (quoteError) throw new Error(`quote routing snapshot failed: ${quoteError.message}`);

  return targets;
}
