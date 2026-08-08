import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { materializeSentDeliveryOutreachByToken } from "@/lib/quote-delivery";

const UNDEFINED_TABLE = "42P01";

export interface GarageOutreachResolution {
  outreachId: string | null;
  quoteId: string;
  workshopId: string | null;
}

/**
 * Resolve canonical measured outreach first. If a Meta-delivered queue token was
 * sent successfully but its outreach materialization lagged, repair it lazily on
 * first open. Reserved/queued tokens never resolve. Legacy shared garage_token
 * remains the final backwards-compatible fallback.
 */
export async function resolveGarageOutreachToken(
  token: string
): Promise<GarageOutreachResolution | null> {
  const admin = getSupabaseAdmin();

  const { data: outreach, error: outreachError } = await admin
    .from("quote_workshop_outreach")
    .select("id,quote_id,workshop_id")
    .eq("token", token)
    .maybeSingle();

  if (outreachError && outreachError.code !== UNDEFINED_TABLE) {
    throw new Error(outreachError.message);
  }

  if (outreach) {
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
    // During a staggered deploy before migration 034 exists, keep legacy links
    // working rather than failing the whole garage page.
    console.error("sent delivery token reconciliation failed:", e);
  }

  const { data: legacy, error: legacyError } = await admin
    .from("quotes")
    .select("id")
    .eq("garage_token", token)
    .maybeSingle();

  if (legacyError) throw new Error(legacyError.message);
  if (!legacy) return null;

  return {
    outreachId: null,
    quoteId: String(legacy.id),
    workshopId: null,
  };
}

export async function markGarageOutreachOpened(token: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error } = await admin
    .from("quote_workshop_outreach")
    .update({ first_opened_at: now, updated_at: now })
    .eq("token", token)
    .is("first_opened_at", null);

  if (error && error.code !== UNDEFINED_TABLE) throw new Error(error.message);
}
