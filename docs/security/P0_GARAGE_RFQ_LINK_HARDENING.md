# P0 — Garage RFQ link isolation and WABA-safe delivery

## Security invariant

A garage must never receive or need an `/admin/*` URL. Garage outreach must use only a token-gated public capability URL:

`https://degself.com/submit-offer/<opaque-token>`

The public page may expose only the minimum request information needed to quote (service, car, area, problem description, safe photos). It must never expose customer name/phone, admin navigation, admin APIs, or an authenticated admin session.

## Delivery model

- One token per `(quote_id, workshop_id)` via `quote_workshop_outreach`.
- Manual fallback: admin creates a link for a specific canonical workshop from the network section.
- WABA primary path: router creates `quote_delivery_queue`; Meta Cloud API confirms send; only then is outreach materialized and the token becomes measured delivery truth.
- No new shared quote-level `garage_token` links should be generated.
- Existing legacy links may remain resolvable only for backward compatibility until explicitly retired.

## WABA readiness

The codebase already separates automatic routing from automatic delivery and uses `WHATSAPP_TEMPLATE_GARAGE_RFQ` with a dynamic `submit-offer/<token>` button. Activation remains flag-gated by `WHATSAPP_ENABLED`.

## Acceptance criteria

1. Creating garage outreach without `workshop_id` is rejected.
2. Admin UI/manual fallback uses only per-workshop links.
3. Public garage page renders without AdminChrome and without customer PII.
4. Public offer submission remains server-side token gated and rate limited.
5. WABA delivery continues to use the same per-workshop capability-token path.
6. PR #120 (mobile) is untouched.
