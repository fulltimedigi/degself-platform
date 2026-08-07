import { getSupabaseAdmin } from "@/lib/supabase/admin";

const UNDEFINED_TABLE = "42P01";

export interface GarageOutreachResolution {
  outreachId: string | null;
  quoteId: string;
  workshopId: string | null;
}

/**
 * Resolve a new per-workshop outreach token first, then fall back to the legacy
 * shared quotes.garage_token. The undefined-table fallback deliberately keeps
 * old garage links working during the rollout window before migration 030 is
 * applied to Production.
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

/**
 * Record the first real browser open for a measured outreach. This is idempotent
 * and intentionally no-ops for legacy shared tokens and during pre-migration
 * rollout. Link-preview crawlers do not execute the client beacon that calls it.
 */
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
