type AnalyticsScalar = string | number | boolean;
export type AnalyticsInput = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * PostHog receives only events declared here and only the listed properties.
 * This is intentionally an allow-list, not a blacklist-only sanitizer.
 */
export const PRODUCT_EVENT_PROPERTIES = {
  search: [
    "has_query",
    "query_length",
    "result_count",
    "filter_count",
    "source",
    "locale",
  ],
  search_nearby: ["result_count", "source", "locale"],
  view_workshop: ["place_id", "source", "locale"],
  call: ["place_id", "source", "locale", "channel"],
  whatsapp: ["place_id", "source", "locale", "channel"],
  floating_widget: ["source", "locale", "channel"],
  map_directions: ["place_id", "source", "locale"],
  share: ["place_id", "source", "locale", "channel"],
  save: ["place_id", "source", "locale"],
  translate_used: ["source", "locale", "status"],
  asaali_open: ["source", "locale"],
  asaali_message: ["source", "locale", "status"],
  concierge: [
    "action",
    "intent",
    "status",
    "router",
    "source",
    "from_partners",
    "locale",
  ],
  quote_form_view: ["source", "locale", "service", "with_image"],
  quote_start: ["source", "locale", "service", "with_image"],
  quote_submit: ["source", "locale", "service", "with_image"],
  offers_view: ["offer_count", "status", "quote_source", "locale"],
  offer_accept: ["offer_count", "status", "quote_source", "locale"],
  garage_offer_link_view: ["locale", "status", "surface"],
  garage_offer_submit: ["locale", "success", "surface"],
} as const;

export type ProductEvent = keyof typeof PRODUCT_EVENT_PROPERTIES;

const MAX_STRING_LENGTH = 120;
const ANALYTICS_ID_KEY = "degself_product_analytics_id";
const SAFE_DERIVED_QUERY_KEYS = new Set(["has_query", "query_length"]);

// Defense in depth: these names must never reach PostHog even if someone
// accidentally adds them to an allow-list later. The two explicitly derived
// query properties above are exceptions because they contain no query text.
const FORBIDDEN_PROPERTY_NAME =
  /(^|_)(phone|mobile|email|customer|workshop_name|problem|description|notes?|message|image|image_url|token|secret|query|search_term|searchstring|address|location_text)($|_)/i;

const eventNames = new Set<string>(Object.keys(PRODUCT_EVENT_PROPERTIES));

export function isProductEvent(event: string): event is ProductEvent {
  return eventNames.has(event);
}

function safeScalar(value: unknown): AnalyticsScalar | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_STRING_LENGTH) return undefined;
  return trimmed;
}

/**
 * Returns null for an unknown event. Known events get a shallow scalar-only
 * payload containing only explicitly approved keys.
 */
export function sanitizeProductProperties(
  event: string,
  input: AnalyticsInput | undefined
): Record<string, AnalyticsScalar> | null {
  if (!isProductEvent(event)) return null;

  const allowed = new Set<string>(PRODUCT_EVENT_PROPERTIES[event]);
  const out: Record<string, AnalyticsScalar> = {};

  for (const [key, raw] of Object.entries(input ?? {})) {
    if (!allowed.has(key)) continue;
    if (!SAFE_DERIVED_QUERY_KEYS.has(key) && FORBIDDEN_PROPERTY_NAME.test(key)) {
      continue;
    }
    const value = safeScalar(raw);
    if (value !== undefined) out[key] = value;
  }

  return out;
}

function browserDistinctId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.localStorage.getItem(ANALYTICS_ID_KEY);
    if (existing && /^[a-zA-Z0-9_-]{16,80}$/.test(existing)) return existing;

    const generated =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 18)}`;
    window.localStorage.setItem(ANALYTICS_ID_KEY, generated);
    return generated;
  } catch {
    // Storage can be disabled. A per-page anonymous ID is still enough to keep
    // analytics non-blocking; it simply cannot join that visitor across pages.
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 18)}`;
  }
}

function posthogConfig(): { token: string; host: string } | null {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  const rawHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  if (!token || !rawHost) return null;

  try {
    const url = new URL(rawHost);
    if (url.protocol !== "https:") return null;
    return { token, host: url.origin };
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget anonymous PostHog capture. No SDK means no automatic
 * pageviews, autocapture, session replay, surveys, flags, or input collection.
 * The public project token is expected here; personal API keys must never be
 * supplied through NEXT_PUBLIC_* variables.
 */
export function captureProductEvent(event: string, input?: AnalyticsInput): void {
  const properties = sanitizeProductProperties(event, input);
  if (properties === null) return;

  const config = posthogConfig();
  const distinctId = browserDistinctId();
  if (!config || !distinctId || typeof fetch !== "function") return;

  void fetch(`${config.host}/i/v0/e/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    keepalive: true,
    referrerPolicy: "no-referrer",
    body: JSON.stringify({
      api_key: config.token,
      event,
      distinct_id: distinctId,
      properties: {
        $process_person_profile: false,
        ...properties,
      },
    }),
  }).catch(() => {
    // Analytics must never break a product action or navigation.
  });
}
