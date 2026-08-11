const GRAPH_VERSION = "v21.0";
const META_TIMEOUT_MS = 10_000;

export type WhatsAppCredentialsCheck =
  | {
      ok: true;
      status: "valid";
      phone_number: {
        verified_name: string;
        display_phone_number: string;
        quality_rating: string;
      };
    }
  | {
      ok: false;
      status:
        | "invalid_credentials"
        | "phone_number_not_found"
        | "rate_limited"
        | "provider_error"
        | "provider_unavailable";
      provider_http_status?: number;
    };

type MetaPhoneNumber = {
  verified_name?: unknown;
  display_phone_number?: unknown;
  quality_rating?: unknown;
};

type WhatsAppCredentialsErrorStatus = Extract<
  WhatsAppCredentialsCheck,
  { ok: false }
>["status"];

function providerStatus(httpStatus: number): WhatsAppCredentialsErrorStatus {
  if (httpStatus === 401 || httpStatus === 403) return "invalid_credentials";
  if (httpStatus === 404) return "phone_number_not_found";
  if (httpStatus === 429) return "rate_limited";
  return "provider_error";
}

/**
 * Performs a read-only phone-number lookup. The token stays in the Authorization
 * header and neither the token nor Meta's raw error body is returned or logged.
 */
export async function checkWhatsAppCredentials(
  token: string,
  phoneNumberId: string,
  request: typeof fetch = fetch
): Promise<WhatsAppCredentialsCheck> {
  const fields = "verified_name,display_phone_number,quality_rating";
  const endpoint = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(phoneNumberId)}`
  );
  endpoint.searchParams.set("fields", fields);

  try {
    const response = await request(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(META_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        ok: false,
        status: providerStatus(response.status),
        provider_http_status: response.status,
      };
    }

    const body = (await response.json().catch(() => null)) as MetaPhoneNumber | null;
    if (
      !body ||
      typeof body.verified_name !== "string" ||
      typeof body.display_phone_number !== "string" ||
      typeof body.quality_rating !== "string"
    ) {
      return {
        ok: false,
        status: "provider_error",
        provider_http_status: response.status,
      };
    }

    return {
      ok: true,
      status: "valid",
      phone_number: {
        verified_name: body.verified_name,
        display_phone_number: body.display_phone_number,
        quality_rating: body.quality_rating,
      },
    };
  } catch {
    return { ok: false, status: "provider_unavailable" };
  }
}
