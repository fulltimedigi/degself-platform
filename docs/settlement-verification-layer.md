# Settlement / completion-verification layer

Records, per accepted offer, whether the offline repair actually happened, so
monetization (later) can rest on a signal the platform can defend — instead of
trusting the garage's self-report. Grounded in the pricing/verification research:
the load-bearing pattern is a **short auto-confirm default** (silence ⇒ done) with
the **customer as the neutral arbiter**, and a fee model that removes the garage's
motive to under-report.

## Status: Phase A (data + auto-confirm) — behind flags, nothing live

- **`SETTLEMENT_ENABLED`** (default off) gates the whole layer. The customer
  confirmation **send** additionally requires **`WHATSAPP_ENABLED`** (also off in
  production). With both off, this layer is inert: no rows created, no messages,
  no billing.
- The migration `supabase/migrations/20260813120000_quote_settlements.sql` is
  **written but NOT applied** to production — apply it manually after review.
- **No billing** is performed in Phase A. It only records completion state.

## What Phase A contains

| Piece | File |
|---|---|
| Table `quote_settlements` (RLS deny-all, service-role only) — **unapplied** | `supabase/migrations/20260813120000_quote_settlements.sql` |
| Pure status logic (window, transitions, customer-wins reconciliation) | `src/lib/settlement-status.ts` |
| Pure WhatsApp confirmation builders/parser | `src/lib/settlement-confirmation.ts` |
| Server data access + flag + dispatcher + phone-resolution | `src/lib/settlements.ts` |
| Auto-confirm sweeper cron (CRON_SECRET-gated, no billing/send) | `src/app/api/cron/settlement-auto-confirm/route.ts` |
| Settlement created on offer-accept (flag-gated, best-effort) | `src/app/api/offers/[token]/accept/route.ts` |
| Inbound yes/no button reply → settlement (flag-gated) | `src/app/api/webhooks/whatsapp/route.ts` |
| Read-only admin view | `src/app/[locale]/admin/settlements/page.tsx` |
| Unit tests | `src/lib/__tests__/settlement-status.test.ts`, `settlement-confirmation.test.ts` |

## State machine

`accepted` → `pending_settlement` → one of:
- `completed_confirmed` — customer tapped "نعم" **or** auto-confirm after
  `AUTO_CONFIRM_DAYS` (5) of silence.
- `no_show` — customer tapped "لا".
- `disputed` — garage self-report contradicts a customer confirmation (admin
  review). The garage report **never** overrides the customer on its own.

Terminal states (`completed_confirmed`, `no_show`) are immutable; replays are no-ops.

## Compliance guardrails (baked into the design; enforced in later phases)

- **No review gating** (FTC 16 CFR 465 / Google): the public rating path — built
  in Phase B — must be open to happy and unhappy customers alike.
- **No incentivized reviews over WhatsApp** (Meta Community Feedback Policy): the
  confirmation/rating messages carry no reward. Any reward is for the *act*, is
  disclosed, first-party only, and decoupled from the WhatsApp template.
- Completion confirmation is tied to a specific booking → **Utility** template
  category (not Marketing).

## Not in Phase A (next phases)

- **Phase B:** rating Flow (1–5 + comment) sent inside the window the "نعم" tap
  opens; verified-transaction review linked to `reviews`; moderation/right-of-reply.
- **Phase C:** per-garage anomaly detection + priority penalties.
- **Phase D:** KNET deposit (owning the payment) → enforceable commission;
  number-masking for call-as-evidence and leakage detection.
