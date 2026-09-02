# Garage self-serve RFQ opt-in portal

Turns the passive directory into a **live RFQ network** by letting each garage
open its own page via a unique magic link, confirm its details, and opt in to
receive price-quote (RFQ) requests with one tap. The partner base this builds is
the platform's core sellable asset — before this it was empty (0 partners).

## How it works

- Every garage row has a stable, unguessable **portal token** (160-bit) stored
  in the deny-all `garage_portal_tokens` table — **never** on the anon-readable
  `workshops` table, so a token is a service-role-only secret.
- The garage receives a link to its own page and can:
  1. **Opt in** with one tap → becomes an RFQ partner and starts receiving
     requests. Because the link was delivered to the garage's own WhatsApp, the
     tap is treated as verification of that WhatsApp destination, so the row is
     set live immediately (`is_partner`, `rfq_opt_in_at`,
     `rfq_opt_in_source='self_serve'`, `rfq_phone_verified_at`,
     `rfq_dispatch_enabled`). A human can still flip the dispatch kill-switch
     off later without losing the consent record.
  2. **Edit** the safe fields of its page: WhatsApp number, area, primary
     specialty, additional specialties, opening hours, short description.
     Overridden fields are written to `workshop_profile_overrides` so a later
     bulk directory refresh can't silently revert a garage's own correction.
- Every opt-in and edit is recorded in the append-only `workshop_edit_log`
  (service-role only). A leaked link's blast radius is a single garage row and
  is fully auditable and reversible.

### URLs

- Public page: `https://degself.com/كراجي/<token>` (vanity rewrite of the
  internal `/garage-portal/<token>` route). `noindex` — never in search results.
- Opt-in API: `POST /api/garage-portal/<token>/opt-in` (rate-limited, token-gated)
- Edit API: `POST /api/garage-portal/<token>/profile` (rate-limited, token-gated)

## Sending the outreach batch

1. Sign in to `/admin`, then download the CSV from
   **`/api/admin/garage-portal-export`** (admin-gated). It lists every
   WhatsApp-reachable listable garage: `name, area, whatsapp, portal_url,
   is_partner`. Treat the file like a secret — each `portal_url` is a
   capability link. Tokens are stable, so you can re-download anytime (e.g. as
   you add garages).
2. Mail-merge the message below, substituting `{name}` and `{portal_url}` from
   the CSV, and send from the business WhatsApp line. Sending is **manual** —
   the WhatsApp API is not used for this.

### The message (first contact — explains who we are)

```
مرحبا {name} 👋

معاك فريق «دق سلف» 🔧 — منصة كويتية تجمع أصحاب السيارات بالكراجات الموثوقة.

فكرتنا بسيطة: صاحب السيارة يكتب مشكلته مرة وحدة، واحنا نوصّلها للكراجات
المتخصصة في المنطقة، فترجع له كذا عرض سعر ويختار الأنسب — من دون ما يلف
على الكراجات بنفسه.

كراجك موجود عندنا في الدليل، وجهّزنا لك صفحة خاصة تقدر منها:
✅ تفعّل استقبال طلبات عروض الأسعار بضغطة وحدة — الخدمة مجانية.
✏️ تراجع بيانات كراجك وتعدّل أي شي ناقص أو غير دقيق.

رابط صفحتك 👇
{portal_url}

الرابط خاص فيك وحدك، لا تشاركه مع أحد. وتقدر توقف الخدمة بأي وقت.
أي استفسار؟ رد على هالرسالة ونساعدك 🌟
```

**Why this wording:** garages are hearing about degself for the first time, so
the message leads with who we are and the value to *them* (leads, not fees),
states the service is free and stoppable, and drives to their personal link.
