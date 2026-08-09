# DEGSELF RFQ multi-wave routing

## Product rule

Garage quote requests are distributed as **private 1:1 WhatsApp messages**, never as a shared WhatsApp group. Every contacted garage has its own queue row, provider message id, capability token, outreach/open/response timestamps, and attribution.

The design deliberately optimizes both precision and recall:

1. **Wave 1 — Precision (T+0):** only the strongest mapped specialty matches. Maximum 5 targets.
2. **Wave 2 — Recall (T+15 min):** adjacent/general partner specialties if fewer than 3 offers exist. Maximum 8 additional targets.
3. **Wave 3 — Marketplace safety net (T+30 min):** broader active partner pool, still ranked by area/contact/partner priority, if fewer than 3 offers exist. Maximum 20 additional targets.

A garage already selected in an earlier wave cannot be selected again because the delivery queue is unique per `(quote_id, workshop_id)` and each later selector explicitly excludes existing target ids.

## Stop / stale-send rules

- Target = 3 submitted offers.
- Once target is reached, unsent `queued` rows are changed to `cancelled`.
- Automatic expansion only considers quotes created in the last 120 minutes, not expired, and still in an actionable status.
- This routing window prevents old queued requests from being blasted when WABA is enabled after a long disabled period.

## Delivery safety

The existing provider contract remains unchanged:

- `WHATSAPP_ENABLED=false` is the kill switch and remains the default.
- `WHATSAPP_TEMPLATE_GARAGE_RFQ` must also be configured before any automatic garage send can happen.
- The sender addresses an **individual recipient phone number** and uses an approved WhatsApp template.
- A queue row becomes `sent` only after Meta returns a provider message id.
- Only a provider-confirmed send materializes measured `quote_workshop_outreach`.
- The garage receives `/submit-offer/<opaque-token>` and never an `/admin/*` URL.
- No customer name/phone is inserted into the garage template.

## Scheduler

The secured endpoint is:

`GET /api/cron/rfq-wave-routing`

It requires `Authorization: Bearer <CRON_SECRET>` and executes `advanceRfqRoutingWaves()`.

**Do not register a sub-daily Vercel cron blindly.** Vercel Hobby currently permits cron only once per day, while Pro/Enterprise support per-minute scheduling. At WABA activation, use one of:

- Vercel Pro/Enterprise cron every 5 minutes; or
- Supabase Cron (`pg_cron`) every 5 minutes invoking the secured endpoint/worker.

The scheduler is intentionally **not activated in `vercel.json` in this change** because WABA is intentionally OFF and the hosting plan must be confirmed before choosing the production scheduler. The routing engine, endpoint, schema, and tests are ready independently of that operational switch.

## Meta API rationale

Meta's WhatsApp Cloud API message examples target `recipient_type: individual` / a recipient phone number and return a unique `wamid` on successful sends. Interactive templates can include a website call-to-action button. That maps directly to DEGSELF's per-garage capability-link model and gives us per-recipient delivery/read/response measurement without exposing partner membership to other garages.

References:
- Meta official WhatsApp Business Platform Postman collection: https://www.postman.com/meta/whatsapp-business-platform/overview
- Meta Cloud API template example: https://www.postman.com/meta/whatsapp-business-platform/request/lwtlz1k/send-message-template-interactive
- Vercel cron usage/pricing: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Supabase Cron: https://supabase.com/docs/guides/cron
