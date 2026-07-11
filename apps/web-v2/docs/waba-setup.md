# WABA — WhatsApp auto-send setup (flag-gated)

Phase 2 ships the code for automatically WhatsApp-ing customers their offers via
the **Meta WhatsApp Cloud API (direct, no BSP)** — but it is **OFF by default**.
While `WHATSAPP_ENABLED != true`, nothing changes: the manual wa.me forward flow
runs exactly as before and **no Meta API call is ever made**.

## 1) Vercel environment variables (empty — fill when Meta assets are ready)

Add these in Vercel → Project → Settings → Environment Variables (Production, and
Preview if you want to test there). Leave them blank/unset to keep WABA off.

```
# Master switch. Keep OFF until everything below is ready and tested.
WHATSAPP_ENABLED=

# Meta Cloud API credentials
WHATSAPP_TOKEN=                 # permanent System-User access token
WHATSAPP_PHONE_NUMBER_ID=       # numeric Phone Number ID of the NEW WABA sending number
WHATSAPP_APP_SECRET=            # Meta App secret — used to verify webhook signatures

# Approved template (defaults shown; only set to override)
WHATSAPP_TEMPLATE_OFFERS=offers_ready_ar
WHATSAPP_TEMPLATE_LANG=ar

# Webhook verification (pick any random string; enter the SAME value in Meta)
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

> The existing manual flow uses `CALLMEBOT_PHONE` / `CALLMEBOT_APIKEY` (Ahmed's
> number `96565799195`) and is **untouched**. WABA uses a **separate new number**.

## 2) Meta-side checklist (do in parallel; longest lead time)

1. Meta Business Account + **Business Verification**.
2. New dedicated phone number for WABA (must NOT be active on the WhatsApp app).
3. Meta for Developers app → add **WhatsApp** product → grab `Phone Number ID`
   and mint a **permanent System-User token**; copy the **App secret**.
4. Submit the message template below and wait for approval (**Utility** category).
5. Configure the webhook (step 3 here).

## 3) Webhook (Meta → us)

- **Callback URL:** `https://degself.com/api/webhooks/whatsapp`
- **Verify token:** the value you put in `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- **Subscribe to:** the `messages` field (delivery statuses).

On a `failed` delivery the webhook auto-notifies Ahmed with the one-tap manual
forward link, so a customer whose number isn't on WhatsApp still gets their offers.

## 4) Message template to submit

- **Name:** `offers_ready_ar`  ·  **Language:** `ar`  ·  **Category:** Utility
- **Body:**
  ```
  مرحباً {{1}} 👋
  وصلتك {{2}} عروض أسعار جاهزة لطلبك في دق سلف. اطّلع عليها واختر الأنسب لك.
  ```
- **Button:** type **URL (dynamic)**, text `اعرض العروض`,
  URL `https://degself.com/offers/{{1}}` (the dynamic part receives the token).

Runtime params sent by the code: body `{{1}}`=customer name, `{{2}}`=offers count;
button `{{1}}`=customer_token.

## 5) Flip the switch (when ready)

1. Fill all env vars above, set `WHATSAPP_ENABLED=true`, redeploy.
2. Add a real quote → add offers → **إرسال العروض للعميل**.
3. The customer gets the template automatically; Ahmed gets a "sent" confirmation.
4. To roll back instantly: set `WHATSAPP_ENABLED=false` (or clear it) and redeploy —
   the manual forward flow resumes with zero code changes.

## Cost note

Direct Cloud API = pay Meta per message only (Utility rate for Kuwait, a few
cents each). No BSP markup, no monthly fee. Verify current rates on Meta's pricing
page before enabling.
