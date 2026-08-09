import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { materializeSentDeliveryOutreachByToken } from "@/lib/quote-delivery";

const UNDEFINED_TABLE = "42P01";

export interface GarageOutreachResolution {
  outreachId: string | null;
  quoteId: string;
  workshopId: string | null;
}

function isExpired(value: unknown): boolean {
  if (typeof value !== "string" || !value) return true;
  const ts = Date.parse(value);
  return !Number.isFinite(ts) || ts <= Date.now();
}

/**
 * Resolve only a per-workshop capability. Provider-confirmed WABA delivery may
 * be reconciled lazily on first open, but quote-level shared garage tokens are
 * deliberately not accepted.
 */
export async function resolveGarageOutreachToken(
  token: string
): Promise<GarageOutreachResolution | null> {
  const admin = getSupabaseAdmin();

  const { data: outreach, error: outreachError } = await admin
    .from("quote_workshop_outreach")
    .select("id,quote_id,workshop_id,expires_at")
    .eq("token", token)
    .maybeSingle();

  if (outreachError && outreachError.code !== UNDEFINED_TABLE) {
    throw new Error(outreachError.message);
  }

  if (outreach) {
    if (isExpired(outreach.expires_at)) return null;
    return {
      outreachId: String(outreach.id),
      quoteId: String(outreach.quote_id),
      workshopId: String(outreach.workshop_id),
    };
  }

  try {
    const repaired = await materializeSentDeliveryOutreachByToken(token);
    if (repaired) return repaired;
  } catch (e) {
    console.error("sent delivery token reconciliation failed:", e);
  }

  return null;
}

export async function markGarageOutreachOpened(token: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error } = await admin
    .from("quote_workshop_outreach")
    .update({ first_opened_at: now, updated_at: now })
    .eq("token", token)
    .gt("expires_at", now)
    .is("first_opened_at", null);

  if (error && error.code !== UNDEFINED_TABLE) throw new Error(error.message);
}
