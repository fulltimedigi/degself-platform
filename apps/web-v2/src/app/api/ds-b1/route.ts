import {
  sanitizeProductProperties,
  type AnalyticsInput,
} from "@/lib/product-analytics";

const POSTHOG_CAPTURE_URL = "https://eu.i.posthog.com/i/v0/e/";
const MAX_BODY_CHARS = 4096;
const DISTINCT_ID_PATTERN = /^[a-zA-Z0-9_-]{16,80}$/;

type CaptureEnvelope = {
  event?: unknown;
  distinct_id?: unknown;
  properties?: unknown;
};

function configuredProjectToken(): string | null {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  return token || null;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_CHARS) {
    return Response.json({ error: "payload_too_large" }, { status: 413 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!raw || raw.length > MAX_BODY_CHARS) {
    return Response.json(
      { error: raw ? "payload_too_large" : "invalid_body" },
      { status: raw ? 413 : 400 }
    );
  }

  let body: CaptureEnvelope;
  try {
    body = JSON.parse(raw) as CaptureEnvelope;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    typeof body.event !== "string" ||
    typeof body.distinct_id !== "string" ||
    !DISTINCT_ID_PATTERN.test(body.distinct_id)
  ) {
    return Response.json({ error: "invalid_event" }, { status: 400 });
  }

  const input = plainObject(body.properties)
    ? (body.properties as AnalyticsInput)
    : undefined;
  const properties = sanitizeProductProperties(body.event, input);
  if (properties === null) {
    return Response.json({ error: "unknown_event" }, { status: 400 });
  }

  const token = configuredProjectToken();
  if (!token) {
    return Response.json({ error: "analytics_unavailable" }, { status: 503 });
  }

  try {
    const upstream = await fetch(POSTHOG_CAPTURE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        api_key: token,
        event: body.event,
        distinct_id: body.distinct_id,
        properties: {
          $process_person_profile: false,
          ...properties,
        },
      }),
    });

    if (!upstream.ok) {
      return Response.json({ error: "analytics_upstream" }, { status: 502 });
    }
  } catch {
    return Response.json({ error: "analytics_upstream" }, { status: 502 });
  }

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
