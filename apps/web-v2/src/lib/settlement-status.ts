// Pure, client-safe settlement (completion-verification) logic. No server imports,
// so both server routes and any client surface can import it. Data access lives in
// ./settlements (server-only). Mirrors public.quote_settlements.
//
// Design (see the research/design doc): the load-bearing pattern is a short
// auto-confirm default — silence past the window ⇒ presumed completed — with the
// CUSTOMER as the neutral arbiter (the garage has a fee-avoidance motive, so its
// self-report never overrides the customer).

export const SETTLEMENT_STATUSES = [
  "pending_settlement",
  "completed_confirmed",
  "no_show",
  "disputed",
] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export type CompletionSource = "customer" | "auto" | "admin" | "garage";
export type GarageReport = "completed" | "not_completed" | "no_response";

/** Days after acceptance before silence is treated as "completed". */
export const AUTO_CONFIRM_DAYS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

const TERMINAL: ReadonlySet<SettlementStatus> = new Set([
  "completed_confirmed",
  "no_show",
]);

export function isTerminalSettlement(status: SettlementStatus): boolean {
  return TERMINAL.has(status);
}

/** accepted_at + window → the ISO instant after which auto-confirm may fire. */
export function computeAutoConfirmAfter(
  acceptedAtIso: string,
  days: number = AUTO_CONFIRM_DAYS
): string {
  const base = new Date(acceptedAtIso).getTime();
  if (!Number.isFinite(base)) throw new Error("invalid accepted_at");
  return new Date(base + days * DAY_MS).toISOString();
}

/** A still-pending settlement whose window has elapsed is due for auto-confirm. */
export function isDueForAutoConfirm(
  status: SettlementStatus,
  autoConfirmAfterIso: string,
  now: number = Date.now()
): boolean {
  if (status !== "pending_settlement") return false;
  const t = new Date(autoConfirmAfterIso).getTime();
  return Number.isFinite(t) && t <= now;
}

export type SettlementTransition = {
  status: SettlementStatus;
  completion_source: CompletionSource;
};

/**
 * Apply the customer's own confirmation. The customer is neutral, so "yes"
 * completes and "no" is a no-show — regardless of anything the garage claims.
 * A terminal settlement is immutable (idempotent replay returns null).
 */
export function customerReplyTransition(
  current: SettlementStatus,
  confirmed: boolean
): SettlementTransition | null {
  if (isTerminalSettlement(current)) return null;
  return confirmed
    ? { status: "completed_confirmed", completion_source: "customer" }
    : { status: "no_show", completion_source: "customer" };
}

/** Silence past the window ⇒ presumed completed. Only valid for pending rows. */
export function autoConfirmTransition(
  current: SettlementStatus
): SettlementTransition | null {
  if (current !== "pending_settlement") return null;
  return { status: "completed_confirmed", completion_source: "auto" };
}

/**
 * Reconcile a garage self-report against the current state WITHOUT letting the
 * garage override the customer. Only used to (a) advance an untouched pending row
 * toward evidence, or (b) FLAG a conflict as disputed when the garage contradicts
 * a customer confirmation. The customer's word always wins on its own.
 */
export function reconcileGarageReport(
  current: SettlementStatus,
  customerConfirmed: boolean | null,
  garage: GarageReport
): SettlementTransition | null {
  if (isTerminalSettlement(current)) {
    // Garage contradicting a settled customer confirmation → dispute for review.
    if (
      current === "completed_confirmed" &&
      garage === "not_completed"
    ) {
      return { status: "disputed", completion_source: "garage" };
    }
    return null;
  }
  // Pending, customer already said "yes" but not yet terminal shouldn't happen;
  // if the customer hasn't spoken, a garage report only raises a dispute flag when
  // it conflicts with a recorded customer signal — otherwise it waits for the
  // customer / auto-confirm. Never let "not_completed" self-close a job.
  if (customerConfirmed === true && garage === "not_completed") {
    return { status: "disputed", completion_source: "garage" };
  }
  return null;
}
