// Server-only data access for the settlement (completion-verification) layer.
// Uses the service-role client (quote_settlements is RLS deny-all). Every write is
// best-effort and never blocks the customer-facing accept flow. NOTHING here bills
// or sends WhatsApp — Phase A only records completion state.
//
// Server-only in practice: it imports the service-role admin client (which throws
// if constructed in the browser) and is never imported by a client component.
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  sendWhatsAppInteractive,
  sendWhatsAppTemplate,
  type WaSendResult,
} from "@/lib/whatsapp";
import { kuwaitWhatsAppDigits } from "@/lib/utils";
import { settlementConfirmationTemplateComponents } from "@/lib/settlement-confirmation";
import { buildRatingListInteractive } from "@/lib/settlement-review";
import { createVerifiedReview } from "@/lib/reviews-write";
import {
  autoConfirmTransition,
  computeAutoConfirmAfter,
  customerReplyTransition,
  type CompletionSource,
  type SettlementStatus,
} from "@/lib/settlement-status";

/**
 * Master flag for the whole settlement layer. Off by default, so on production
 * (where it is unset) nothing in this layer runs. The WhatsApp confirmation send
 * additionally requires WHATSAPP_ENABLED.
 */
export function isSettlementEnabled(): boolean {
  return process.env.SETTLEMENT_ENABLED?.trim().toLowerCase() === "true";
}

type CreateInput = {
  quoteId: string;
  offerId: string;
  workshopId?: string | null;
  acceptedAtIso: string;
};

/**
 * Create the pending settlement for a just-accepted offer. Idempotent via the
 * (quote_id, offer_id) unique constraint. No-op unless the layer is enabled.
 */
export async function createSettlementForAcceptedOffer(
  input: CreateInput
): Promise<void> {
  if (!isSettlementEnabled()) return;
  const admin = getSupabaseAdmin();
  const workshopId =
    input.workshopId ?? (await resolveWorkshopIdForOffer(admin, input.offerId));
  const { error } = await admin.from("quote_settlements").upsert(
    {
      quote_id: input.quoteId,
      offer_id: input.offerId,
      workshop_id: workshopId,
      accepted_at: input.acceptedAtIso,
      auto_confirm_after: computeAutoConfirmAfter(input.acceptedAtIso),
      status: "pending_settlement",
    },
    { onConflict: "quote_id,offer_id", ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message);
}

/** Canonical workshop place_id for an accepted offer, via its outreach record. */
async function resolveWorkshopIdForOffer(
  admin: ReturnType<typeof getSupabaseAdmin>,
  offerId: string
): Promise<string | null> {
  const { data: offer } = await admin
    .from("quote_offers")
    .select("outreach_id")
    .eq("id", offerId)
    .maybeSingle();
  const outreachId = offer?.outreach_id as string | null | undefined;
  if (!outreachId) return null;
  const { data: outreach } = await admin
    .from("quote_workshop_outreach")
    .select("workshop_id")
    .eq("id", outreachId)
    .maybeSingle();
  return (outreach?.workshop_id as string | null | undefined) ?? null;
}

export type DueSettlement = {
  id: string;
  quote_id: string;
  status: SettlementStatus;
  auto_confirm_after: string;
};

/** Pending settlements whose auto-confirm window has elapsed. */
export async function listSettlementsDueForAutoConfirm(
  limit = 100,
  nowIso: string = new Date().toISOString()
): Promise<DueSettlement[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quote_settlements")
    .select("id,quote_id,status,auto_confirm_after")
    .eq("status", "pending_settlement")
    .lte("auto_confirm_after", nowIso)
    .order("auto_confirm_after", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as DueSettlement[];
}

/**
 * Flip a due pending settlement to completed via the silence-⇒-done default.
 * Conditional on status still being pending so concurrent runs can't double-apply.
 * Returns true if this call performed the transition. Does NOT bill.
 */
export async function autoConfirmSettlement(id: string): Promise<boolean> {
  const t = autoConfirmTransition("pending_settlement");
  if (!t) return false;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quote_settlements")
    .update({
      status: t.status,
      completion_source: t.completion_source,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending_settlement")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

/** Sweep all due settlements; returns how many were auto-confirmed. */
export async function runAutoConfirmSweep(limit = 100): Promise<number> {
  const due = await listSettlementsDueForAutoConfirm(limit);
  let confirmed = 0;
  for (const row of due) {
    try {
      if (await autoConfirmSettlement(row.id)) confirmed += 1;
    } catch (e) {
      console.error("auto-confirm failed for settlement", row.id, e);
    }
  }
  return confirmed;
}

/**
 * Record the customer's own yes/no confirmation. The customer is the neutral
 * arbiter: they may act while pending AND may override a silence-presumed
 * ('auto') completion. A human-settled or disputed row is immutable (returns
 * false). The UPDATE is guarded on the exact state we read, so it stays atomic
 * against a concurrent auto-confirm sweep.
 */
export async function applyCustomerConfirmation(
  settlementId: string,
  confirmed: boolean
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data: row, error: readErr } = await admin
    .from("quote_settlements")
    .select("status,completion_source")
    .eq("id", settlementId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!row) return false;

  const status = row.status as SettlementStatus;
  const source = (row.completion_source as CompletionSource | null) ?? null;
  const t = customerReplyTransition(status, source, confirmed);
  if (!t) return false;

  const now = new Date().toISOString();
  let update = admin
    .from("quote_settlements")
    .update({
      status: t.status,
      completion_source: t.completion_source,
      customer_confirmed: confirmed,
      customer_confirmed_at: now,
      updated_at: now,
    })
    .eq("id", settlementId);
  // Guard on the precise state observed so the transition is atomic.
  update =
    status === "pending_settlement"
      ? update.eq("status", "pending_settlement")
      : update.eq("status", "completed_confirmed").eq("completion_source", "auto");

  const { data: updated, error } = await update.select("id").maybeSingle();
  if (error) throw new Error(error.message);
  return !!updated;
}

function digitsOnly(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}

/**
 * Resolve an inbound confirmation reply to its settlement and apply it. Resolves
 * by context.id (the wamid of the confirmation message we sent) FIRST, so a
 * customer with multiple bookings confirms the exact one they replied to. Falls
 * back to a digit-normalized phone match against the most recent
 * customer-mutable settlement only when no context is present.
 */
export async function applyCustomerReply(
  contextWamid: string | null | undefined,
  waId: string | null | undefined,
  confirmed: boolean
): Promise<string | null> {
  const settlementId = await resolveSettlementForConfirm(contextWamid, waId);
  if (!settlementId) return null;
  const applied = await applyCustomerConfirmation(settlementId, confirmed);
  return applied ? settlementId : null;
}

/** Resolve a confirmation reply: by the message it replies to, else by phone. */
async function resolveSettlementForConfirm(
  contextWamid: string | null | undefined,
  waId: string | null | undefined
): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (contextWamid) {
    const { data, error } = await admin
      .from("quote_settlements")
      .select("id")
      .eq("confirm_wamid", contextWamid)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) return data.id as string;
  }
  return resolveByPhone(
    waId,
    ["pending_settlement", "completed_confirmed"],
    (r) =>
      r.status === "pending_settlement" ||
      (r.status === "completed_confirmed" && r.completion_source === "auto")
  );
}

type SettlementRowLite = {
  id: string;
  quote_id: string;
  status: SettlementStatus;
  completion_source: CompletionSource | null;
  review_id?: string | null;
  workshop_id?: string | null;
};

/** Most-recent settlement for a phone (digit-normalized) matching a predicate. */
async function resolveByPhone(
  waId: string | null | undefined,
  statuses: SettlementStatus[],
  predicate: (r: SettlementRowLite) => boolean,
  select = "id,quote_id,status,completion_source,accepted_at"
): Promise<string | null> {
  const local8 = digitsOnly(waId).slice(-8);
  if (local8.length < 8) return null;

  const admin = getSupabaseAdmin();
  const { data: rows, error } = await admin
    .from("quote_settlements")
    .select(select)
    .in("status", statuses)
    .order("accepted_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  const candidates = ((rows ?? []) as unknown as SettlementRowLite[]).filter(predicate);
  if (candidates.length === 0) return null;

  const quoteIds = [...new Set(candidates.map((r) => r.quote_id))];
  const { data: quotes, error: qErr } = await admin
    .from("quotes")
    .select("id,customer_phone")
    .in("id", quoteIds);
  if (qErr) throw new Error(qErr.message);
  const phoneByQuote = new Map(
    (quotes ?? []).map((q) => [q.id as string, digitsOnly(q.customer_phone as string)])
  );
  const match = candidates.find((r) =>
    (phoneByQuote.get(r.quote_id) ?? "").endsWith(local8)
  );
  return match?.id ?? null;
}

/**
 * Webhook orchestrator for a yes/no confirmation reply: apply it, and if the
 * customer confirmed completion, solicit the rating inside the window their tap
 * just opened. Flag-gated end to end.
 */
export async function handleConfirmationReply(
  contextWamid: string | null | undefined,
  waId: string | null | undefined,
  confirmed: boolean
): Promise<void> {
  const settlementId = await applyCustomerReply(contextWamid, waId, confirmed);
  if (settlementId && confirmed) {
    await sendRatingRequest(settlementId);
  }
}

/**
 * Send the post-service rating LIST to a confirmed-complete settlement, inside the
 * open 24h window, and persist its wamid. Gated by SETTLEMENT_ENABLED here and by
 * WHATSAPP_ENABLED inside the sender — inert in production. Skips if the settlement
 * has no canonical workshop (cannot attribute a review) or already has one.
 */
export async function sendRatingRequest(settlementId: string): Promise<WaSendResult | null> {
  if (!isSettlementEnabled()) return null;
  const admin = getSupabaseAdmin();

  const { data: s } = await admin
    .from("quote_settlements")
    .select("id,quote_id,offer_id,workshop_id,status,review_id")
    .eq("id", settlementId)
    .maybeSingle();
  if (!s || s.status !== "completed_confirmed" || !s.workshop_id || s.review_id) {
    return null;
  }

  const { data: q } = await admin
    .from("quotes")
    .select("customer_phone")
    .eq("id", s.quote_id)
    .maybeSingle();
  const { data: o } = await admin
    .from("quote_offers")
    .select("workshop_name")
    .eq("id", s.offer_id)
    .maybeSingle();

  const to = kuwaitWhatsAppDigits((q?.customer_phone as string) ?? null);
  if (!to) return { ok: false, skipped: true, reason: "no_recipient" };

  const interactive = buildRatingListInteractive((o?.workshop_name as string) ?? "الكراج");
  const result = await sendWhatsAppInteractive(to, interactive);
  if (result.ok) {
    await admin
      .from("quote_settlements")
      .update({ rating_wamid: result.messageId, updated_at: new Date().toISOString() })
      .eq("id", settlementId);
  }
  return result;
}

/**
 * Webhook orchestrator for a rating list reply: resolve the settlement (by the
 * rating message it replies to, else by phone), create the verified review, and
 * mark the settlement as reviewed. One review per job (unique index enforced).
 */
export async function handleRatingReply(
  contextWamid: string | null | undefined,
  waId: string | null | undefined,
  rating: number
): Promise<void> {
  if (!isSettlementEnabled()) return;
  const admin = getSupabaseAdmin();

  let settlementId: string | null = null;
  if (contextWamid) {
    const { data } = await admin
      .from("quote_settlements")
      .select("id")
      .eq("rating_wamid", contextWamid)
      .maybeSingle();
    settlementId = (data?.id as string | undefined) ?? null;
  }
  if (!settlementId) {
    settlementId = await resolveByPhone(
      waId,
      ["completed_confirmed"],
      (r) => !r.review_id && !!r.workshop_id,
      "id,quote_id,status,completion_source,accepted_at,review_id,workshop_id"
    );
  }
  if (!settlementId) return;

  const { data: s } = await admin
    .from("quote_settlements")
    .select("quote_id,workshop_id,review_id")
    .eq("id", settlementId)
    .maybeSingle();
  if (!s || !s.workshop_id || s.review_id) return;

  const reviewId = await createVerifiedReview({
    quoteId: s.quote_id as string,
    settlementId,
    placeId: s.workshop_id as string,
    rating,
  });
  if (reviewId) {
    await admin
      .from("quote_settlements")
      .update({ review_id: reviewId, updated_at: new Date().toISOString() })
      .eq("id", settlementId)
      .is("review_id", null);
  }
}

/**
 * Dispatch the Utility completion-confirmation template to the customer. Gated by
 * SETTLEMENT_ENABLED here and by WHATSAPP_ENABLED inside sendWhatsAppTemplate, so
 * it is inert in production. NOT auto-invoked in Phase A.
 */
export async function sendSettlementConfirmation(
  settlementId: string
): Promise<WaSendResult | null> {
  if (!isSettlementEnabled()) return null;
  const admin = getSupabaseAdmin();

  const { data: s } = await admin
    .from("quote_settlements")
    .select("id,quote_id,offer_id,status")
    .eq("id", settlementId)
    .maybeSingle();
  if (!s || s.status !== "pending_settlement") return null;

  const { data: q } = await admin
    .from("quotes")
    .select("customer_name,customer_phone,service")
    .eq("id", s.quote_id)
    .maybeSingle();
  const { data: o } = await admin
    .from("quote_offers")
    .select("workshop_name")
    .eq("id", s.offer_id)
    .maybeSingle();
  if (!q) return null;

  const to = kuwaitWhatsAppDigits(q.customer_phone as string | null);
  if (!to) return { ok: false, skipped: true, reason: "no_recipient" };

  const template = process.env.SETTLEMENT_CONFIRM_TEMPLATE?.trim() || "settlement_confirm_ar";
  const components = settlementConfirmationTemplateComponents({
    customerName: (q.customer_name as string) ?? "",
    service: (q.service as string) ?? "",
    workshopName: (o?.workshop_name as string) ?? "الكراج",
  });
  const result = await sendWhatsAppTemplate(to, template, components);
  // Persist the wamid so the customer's reply resolves back to THIS settlement.
  if (result.ok) {
    await admin
      .from("quote_settlements")
      .update({ confirm_wamid: result.messageId, updated_at: new Date().toISOString() })
      .eq("id", settlementId);
  }
  return result;
}

export type SettlementRow = {
  id: string;
  quote_id: string;
  status: SettlementStatus;
  completion_source: string | null;
  accepted_at: string;
  auto_confirm_after: string;
  customer_confirmed: boolean | null;
  created_at: string;
};

/** Read-only listing for the admin surface. */
export async function listRecentSettlements(limit = 100): Promise<SettlementRow[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quote_settlements")
    .select(
      "id,quote_id,status,completion_source,accepted_at,auto_confirm_after,customer_confirmed,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as SettlementRow[];
}
