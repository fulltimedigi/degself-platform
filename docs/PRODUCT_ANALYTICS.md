# DEGSELF Product Analytics

Status: **Privacy-safe analytics foundation**

This document defines the product-event contract used by `apps/web-v2`.
It is intentionally narrower than general web analytics: Vercel Analytics keeps
page/operational visibility, Snapchat keeps selected advertising conversions,
and PostHog is used for product funnels and marketplace-health measurement.

## Provider responsibilities

| Provider | Purpose | Raw form/search text? |
|---|---|---|
| Vercel Analytics | Existing operational/product events | No raw search query after this foundation |
| Snapchat Pixel | Existing mapped advertising conversions | Search text is provider-specific for the existing `SEARCH` event only |
| PostHog EU Cloud | Product funnels and marketplace-health analytics | **Never** |

PostHog receives events through its public Capture API, but the browser sends
only an allow-listed payload to the same-origin route `/api/ds-b1`. That server
route validates the event and properties a second time, injects the public
PostHog project token, and sends a new request to the fixed EU Capture endpoint
(`https://eu.i.posthog.com/i/v0/e/`). It does **not** forward inbound browser
headers, cookies, IP data, or request objects to PostHog.

The first-party bridge improves delivery reliability without adding an SDK and
does not proxy session replay, flags, assets, or any other PostHog traffic.
There is no autocapture, automatic pageview, session recording, survey,
feature-flag, exception, or form/input collection surface to disable or
accidentally re-enable. Because browser capture stays same-origin, the CSP does
not need to allow a PostHog origin in `connect-src`.

Every outbound PostHog event includes `$process_person_profile: false`, so these
remain anonymous events without PostHog person profiles. The public project
token is read by the server bridge from the configured environment; it is never
included in the browser-to-bridge event payload. A PostHog personal API key must
never be exposed in a `NEXT_PUBLIC_*` variable.

Required public environment variables:

- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`
- `NEXT_PUBLIC_POSTHOG_HOST` (`https://eu.i.posthog.com` for this project)

The host value is validated against the fixed EU origin. If either variable is
missing or invalid, PostHog analytics is a no-op/unavailable and the product
continues normally.

## Privacy rules

PostHog has a central allow-list in `src/lib/product-analytics.ts`. An event that
is not registered there is not sent to PostHog. For a registered event, any
property not explicitly allowed for that event is dropped. The server bridge
runs the same sanitizer again before forwarding the event.

Never send to PostHog:

- customer or workshop names
- phone numbers or email addresses
- quote/offer/garage tokens
- raw problem descriptions or notes
- raw search text
- WhatsApp messages
- image URLs or uploads
- addresses/free-text locations
- secrets or credentials
- quote IDs or offer IDs

Only shallow scalar values are accepted. Non-finite numbers, long strings, deep
objects, arrays, undefined values, and unexpected properties are dropped.

The public Google `place_id` for a workshop is allowed for workshop discovery
and contact attribution. It is catalog metadata, not a customer identifier.

## Event taxonomy

### Discovery

| Event | When | Allowed properties |
|---|---|---|
| `search` | Directory query/filter search | `has_query`, `query_length`, `result_count`, `filter_count`, `source`, `locale` |
| `search_nearby` | Nearby search | `result_count`, `source`, `locale` |
| `view_workshop` | Workshop page viewed | `place_id`, `source`, `locale` |

### Garage contact

| Event | When | Allowed properties |
|---|---|---|
| `call` | Phone CTA clicked | `place_id`, `source`, `locale`, `channel` |
| `whatsapp` | WhatsApp CTA clicked | `place_id`, `source`, `locale`, `channel` |
| `floating_widget` | Floating contact entry used | `source`, `locale`, `channel` |
| `map_directions` | Directions requested | `place_id`, `source`, `locale` |
| `share` | Workshop shared | `place_id`, `source`, `locale`, `channel` |
| `save` | Workshop saved | `place_id`, `source`, `locale` |

### Quote conversion

| Event | When | Allowed properties |
|---|---|---|
| `quote_form_view` | Quote form successfully rendered | `source`, `locale`, `service`, `with_image` |
| `quote_start` | First real interaction with the quote form | `source`, `locale`, `service`, `with_image` |
| `quote_submit` | Quote API returns success | `source`, `locale`, `service`, `with_image` |
| `offers_view` | Valid customer offers chooser rendered | `offer_count`, `status`, `quote_source`, `locale` |
| `offer_accept` | Offer-accept API returns success | `offer_count`, `status`, `quote_source`, `locale` |

### Workshop response

| Event | When | Allowed properties |
|---|---|---|
| `garage_offer_link_view` | Valid garage offer form rendered | `locale`, `status`, `surface` |
| `garage_offer_submit` | Garage offer API returns success | `locale`, `success`, `surface` |

These two events measure aggregate workshop participation. **Per-garage response
rate is not yet reliable** because the current operational flow does not retain a
separate delivery/response record for each workshop contacted. That belongs in a
separate database-backed phase, not this analytics foundation.

### AI / Concierge

Existing events such as `asaali_open`, `asaali_message`, `translate_used`, and
`concierge` may be sent to PostHog only with their allow-listed categorical or
boolean metadata. User messages, diagnoses, and conversation text are excluded.

## Planned product funnels

After production event ingestion is verified, the primary PostHog dashboard is:

**DEGSELF — Product & Marketplace Health**

The first saved funnels should be:

1. **Discovery → garage contact**
   - `search`
   - `view_workshop`
   - Garage Contact action (`call` OR `whatsapp` OR `floating_widget`)

2. **Quote conversion**
   - `quote_form_view`
   - `quote_start`
   - `quote_submit`
   - `offers_view`
   - `offer_accept`

3. **Workshop participation**
   - `garage_offer_link_view`
   - `garage_offer_submit`

Breakdowns should start with `locale`, `source`, and safe catalog properties.
Do not add user-level PII breakdowns.

## Existing PostHog objects

The project already contains these reusable Actions:

- DEGSELF — Directory Search
- DEGSELF — Workshop View
- DEGSELF — Garage Contact
- DEGSELF — Quote Submitted
- DEGSELF — Customer Viewed Offers
- DEGSELF — Offer Accepted
- DEGSELF — Garage Offer Submitted

Do not create duplicate Actions when building the dashboard.

## Release requirements

Any analytics change must keep these guarantees:

- Analytics failure never blocks the product action.
- Success events fire only after the corresponding API success.
- Raw search text never goes through generic Vercel/PostHog event properties.
- PostHog remains anonymous (`$process_person_profile: false`).
- Browser PostHog transport stays on the narrow same-origin server bridge.
- The bridge never forwards inbound browser cookies or headers to PostHog.
- No PostHog personal API key is exposed to the browser.
- No analytics PR may silently introduce database or migration changes.
