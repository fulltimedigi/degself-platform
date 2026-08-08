# WABA — WhatsApp auto-send setup (flag-gated)

DEGSELF uses the **Meta WhatsApp Cloud API (direct, no BSP)** and keeps all sends
behind `WHATSAPP_ENABLED`. While the flag is off, no Meta API call is made.

## 1) Vercel environment variables

```bash
WHATSAPP_ENABLED=false
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_APP_SECRET=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=

# Customer notification when offers are ready
WHATSAPP_TEMPLATE_OFFERS=offers_ready_ar

# REQUIRED for automatic quote delivery to network garages.
# There is intentionally no runtime default: the exact approved template must be named.
WHATSAPP_TEMPLATE_GARAGE_RFQ=garage_quote_request_ar
WHATSAPP_TEMPLATE_LANG=ar
```

The existing CallMeBot founder alert remains separate and is not a garage-delivery provider.

## 2) Meta-side checklist

1. Meta Business Account + Business Verification.
2. Dedicated WABA phone number.
3. Meta for Developers app with WhatsApp product, Phone Number ID, permanent System-User token and App secret.
4. Submit/approve the required Utility templates.
5. Configure the webhook at `https://degself.com/api/webhooks/whatsapp` and subscribe to `messages`.

## 3) Customer offers template

- **Name:** `offers_ready_ar`
- **Language:** `ar`
- **Category:** Utility
- Body parameters: customer name, offer count.
- Dynamic URL button: `https://degself.com/offers/{{1}}` where the dynamic value is the customer token.

## 4) Garage RFQ template

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

## 5) Delivery truth and rollout

Automatic routing and automatic delivery are separate states:

1. Router selects network garages and creates `quote_delivery_queue` rows.
2. A reserved token is created but is not valid outreach yet.
3. Meta Cloud API must return a message id before the queue becomes `sent`.
4. Only then is `quote_workshop_outreach` created/updated using the provider-confirmed send time.
5. If the outreach write is temporarily missed after a successful send, reconciliation repairs it without resending or double-counting.

To activate garage auto-send, the garage template must be approved and
`WHATSAPP_TEMPLATE_GARAGE_RFQ` must be configured before setting `WHATSAPP_ENABLED=true`.
Turning `WHATSAPP_ENABLED=false` stops all automatic Meta sends immediately.

## Cost note

Direct Cloud API means Meta message charges only, with no BSP markup. Verify current Meta pricing before activation.
