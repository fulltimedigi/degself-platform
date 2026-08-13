// Server-only data access for the settlement (completion-verification) layer.
// Uses the service-role client (quote_settlements is RLS deny-all). Every write is
// best-effort and never blocks the customer-facing accept flow. NOTHING here bills
// or sends WhatsApp — Phase A only records completion state.
//
// Server-only in practice: it imports the service-role admin client (which throws
// if constructed in the browser) and is never imported by a client component.
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendWhatsAppTemplate, type WaSendResult } from "@/lib/whatsapp";
import { kuwaitWhatsAppDigits } from "@/lib/utils";
import { settlementConfirmationTemplateComponents } from "@/lib/settlement-confirmation";
import {
  autoConfirmTransition,
  computeAutoConfirmAfter,
  customerReplyTransition,
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
  const { error } = await admin.from("quote_settlements").upsert(
    {
      quote_id: input.quoteId,
      offer_id: input.offerId,
      workshop_id: input.workshopId ?? null,
      accepted_at: input.acceptedAtIso,
      auto_confirm_after: computeAutoConfirmAfter(input.acceptedAtIso),
      status: "pending_settlement",
    },
    { onConflict: "quote_id,offer_id", ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message);
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
 * arbiter; a terminal settlement is immutable (returns false).
 */
export async function applyCustomerConfirmation(
  settlementId: string,
  confirmed: boolean
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data: row, error: readErr } = await admin
    .from("quote_settlements")
    .select("status")
    .eq("id", settlementId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!row) return false;

  const t = customerReplyTransition(row.status as SettlementStatus, confirmed);
  if (!t) return false;

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("quote_settlements")
    .update({
      status: t.status,
      completion_source: t.completion_source,
      customer_confirmed: confirmed,
      customer_confirmed_at: now,
      updated_at: now,
    })
    .eq("id", settlementId)
    .eq("status", "pending_settlement")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!updated;
}

/**
 * Resolve an inbound WhatsApp confirmation (from the customer's number) to their
 * most recent pending settlement and apply it. Best-effort suffix match on the
 * Kuwait local 8-digit number. Only ever reached from the webhook behind the flag.
 */
export async function applyCustomerConfirmationByPhone(
  waId: string | null | undefined,
  confirmed: boolean
): Promise<boolean> {
  const digits = (waId ?? "").replace(/\D/g, "");
  if (digits.length < 8) return false;
  const local8 = digits.slice(-8);

  const admin = getSupabaseAdmin();
  const { data: quotes, error: qErr } = await admin
    .from("quotes")
    .select("id")
    .ilike("customer_phone", `%${local8}%`);
  if (qErr) throw new Error(qErr.message);
  const quoteIds = (quotes ?? []).map((q) => (q as { id: string }).id);
  if (quoteIds.length === 0) return false;

  const { data: rows, error: sErr } = await admin
    .from("quote_settlements")
    .select("id")
    .in("quote_id", quoteIds)
    .eq("status", "pending_settlement")
    .order("accepted_at", { ascending: false })
    .limit(1);
  if (sErr) throw new Error(sErr.message);
  const settlementId = rows?.[0]?.id as string | undefined;
  if (!settlementId) return false;

  return applyCustomerConfirmation(settlementId, confirmed);
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
  return sendWhatsAppTemplate(to, template, components);
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
