# WABA — WhatsApp auto-send setup (flag-gated)

DEGSELF uses the **Meta WhatsApp Cloud API (direct, no BSP)** and keeps all sends
behind `WHATSAPP_ENABLED`. While the flag is off, no Meta API call is made.

## Non-negotiable channel boundary

There are two different WhatsApp paths and they must never be mixed:

- **CallMeBot = DEGSELF admin/operator alerts only.** Its messages may contain `/admin/...` links.
- **Meta WABA = garage/customer delivery only.** A garage RFQ may contain only the garage capability path `/submit-offer/<opaque-token>`.

`src/lib/callmebot.ts` has a runtime fail-closed guard that refuses any message containing
`/submit-offer/`, so a future regression cannot accidentally send a garage capability through
the admin CallMeBot number.

## 1) Vercel environment variables

```bash
# Keep false until the activation checklist below is complete.
WHATSAPP_ENABLED=false
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_APP_SECRET=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
CRON_SECRET=

# Customer notification when offers are ready
WHATSAPP_TEMPLATE_OFFERS=offers_ready_ar

# REQUIRED for automatic quote delivery to network garages.
# There is intentionally no runtime default: the exact approved template must be named.
WHATSAPP_TEMPLATE_GARAGE_RFQ=garage_quote_request_ar
WHATSAPP_TEMPLATE_LANG=ar
```

The admin page `/admin/partners` exposes a safe readiness panel that reports only whether
these values exist. It never returns or renders secret values.

## 2) Partner activation gate

Being a DEGSELF network partner is not sufficient for automatic RFQ delivery. Every garage
must satisfy all of these before the router can select it:

1. `is_partner=true`.
2. Explicit RFQ consent is recorded (`rfq_opt_in_at` + source).
3. The WhatsApp phone is verified (`rfq_phone_verified_at`).
4. An admin deliberately enables `rfq_dispatch_enabled=true`.

All three routing waves filter on this gate. Delivery re-checks the gate immediately before
the Meta provider call, so revoking consent/readiness cancels an already queued unsent message.
Changing a partner phone invalidates the phone verification and disables RFQ until re-verified.

## 3) Meta-side checklist

1. Meta Business Account + Business Verification.
2. Dedicated WABA phone number.
3. Meta for Developers app with WhatsApp product, Phone Number ID, permanent System-User token and App secret.
4. Submit/approve the required Utility templates.
5. Configure the webhook at `https://degself.com/api/webhooks/whatsapp` and subscribe to `messages`.
6. Confirm signed webhook POSTs are accepted and invalid signatures are rejected.

Do not paste production secrets into Git, tickets, screenshots, or chat transcripts. Configure
them only in the production environment.

## 4) Customer offers template

- **Name:** `offers_ready_ar`
- **Language:** `ar`
- **Category:** Utility
- Body parameters: customer name, offer count.
- Dynamic URL button: `https://degself.com/offers/{{1}}` where the dynamic value is the customer token.

## 5) Garage RFQ template

Recommended approved template:

- **Name:** `garage_quote_request_ar`
- **Language:** `ar`
- **Category:** Utility
- **Body:**

```text
طلب عرض سعر جديد من دق سلف.
الخدمة: {{1}}
السيارة: {{2}}
المنطقة: {{3}}
افتح تفاصيل الطلب وأرسل عرضك من الرابط أدناه.
```

- **Button:** URL (dynamic), text `عرض الطلب`
- URL: `https://degself.com/submit-offer/{{1}}`

Runtime body values are service, car label and area. The WhatsApp template deliberately
contains **no customer name, customer phone, or free-text problem description**. The button
receives only a capability token; the server resolves it to the PII-safe garage quote view.

## 6) Multi-wave delivery

The private 1:1 rollout is:

- Wave 1 / precision: immediately, maximum 5.
- Wave 2 / recall: after 15 minutes if fewer than 3 offers, maximum 8 additional.
- Wave 3 / partner safety net: after 30 minutes if fewer than 3 offers, maximum 20 additional.
- Routing stops expanding once the target of 3 offers is reached.
- Old quotes age out of the automatic routing window; enabling WABA later must not blast stale requests.

`/api/cron/rfq-wave-routing` is protected by `CRON_SECRET`. The scheduler must call this endpoint
on a short interval only after a supported scheduler has been configured. Scheduling and provider
sending are separate gates: even if the scheduler runs, `WHATSAPP_ENABLED=false` prevents Meta sends.

## 7) Delivery truth and rollout

Automatic routing and automatic delivery are separate states:

1. Router selects eligible RFQ-ready network garages and creates `quote_delivery_queue` rows.
2. A reserved token is created but is not valid outreach yet.
3. Meta Cloud API must return a message id before the queue becomes `sent`.
4. Only then is `quote_workshop_outreach` created/updated using the provider-confirmed send time.
5. Webhook receipts attribute `sent`, `delivered`, `read`, and `failed` to the exact garage queue row.
6. If the outreach write is temporarily missed after a successful send, reconciliation repairs it without resending or double-counting.

## 8) Activation checklist — all must be true

- [ ] Partner list has at least one RFQ-ready garage.
- [ ] Garage RFQ template is approved by Meta and exact name is configured.
- [ ] `WHATSAPP_TOKEN` is configured with the required production permissions.
- [ ] `WHATSAPP_PHONE_NUMBER_ID` is configured.
- [ ] `WHATSAPP_APP_SECRET` is configured.
- [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN` is configured and webhook verification succeeds.
- [ ] `CRON_SECRET` is configured and scheduler is installed.
- [ ] Preview/CI is green and production readiness panel shows no missing prerequisite.
- [ ] One controlled E2E test garage succeeds: queued -> sent -> delivered/read -> `/submit-offer/` -> offer submitted.
- [ ] Negative E2E confirms CallMeBot admin notification never contains `/submit-offer/` and garage message never contains `/admin/`.
- [ ] Only then change `WHATSAPP_ENABLED=true`.

Turning `WHATSAPP_ENABLED=false` stops all automatic Meta sends immediately.

## Cost note

Direct Cloud API avoids BSP markup. Verify Meta's current pricing and template rules immediately
before activation because provider pricing/policy can change independently of this repository.
