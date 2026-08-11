const GRAPH_VERSION = "v21.0";
const DEGSELF_WABA_ID = "1764023074761001";
const META_TIMEOUT_MS = 10_000;

export const GARAGE_RFQ_TEMPLATE_NAME = "garage_quote_request_ar";

export type GarageTemplateSetupResult =
  | {
      ok: true;
      status: "submitted";
      template: {
        name: typeof GARAGE_RFQ_TEMPLATE_NAME;
        language: "ar";
        category: "UTILITY";
        review_status: string;
      };
    }
  | {
      ok: false;
      status:
        | "invalid_credentials"
        | "invalid_template"
        | "rate_limited"
        | "provider_error"
        | "provider_unavailable";
      provider_http_status?: number;
      provider_error_code?: number;
      provider_error_subcode?: number;
    };

type MetaTemplateResponse = {
  id?: unknown;
  status?: unknown;
  category?: unknown;
  error?: {
    code?: unknown;
    error_subcode?: unknown;
  };
};

function providerStatus(httpStatus: number): Extract<GarageTemplateSetupResult, { ok: false }>["status"] {
  if (httpStatus === 401 || httpStatus === 403) return "invalid_credentials";
  if (httpStatus === 400 || httpStatus === 422) return "invalid_template";
  if (httpStatus === 429) return "rate_limited";
  return "provider_error";
}

/**
 * Submits exactly one fixed, PII-safe Utility template for Meta review.
 * The production token stays in the Authorization header and raw Meta errors
 * are never returned or logged.
 */
export async function submitGarageRfqTemplate(
  token: string,
  request: typeof fetch = fetch
): Promise<GarageTemplateSetupResult> {
  const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${DEGSELF_WABA_ID}/message_templates`;
  const payload = {
    name: GARAGE_RFQ_TEMPLATE_NAME,
    language: "ar",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text:
          "طلب عرض سعر جديد من دق سلف.\n" +
          "الخدمة: {{1}}\n" +
          "السيارة: {{2}}\n" +
          "المنطقة: {{3}}\n" +
          "افتح تفاصيل الطلب وأرسل عرضك من الرابط أدناه.",
        example: {
          body_text: [["صيانة مكيف السيارة", "تويوتا كامري 2020", "الشويخ الصناعية"]],
        },
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: "عرض الطلب",
            url: "https://degself.com/submit-offer/{{1}}",
            example: ["example-token"],
          },
        ],
      },
    ],
  };

  try {
    const response = await request(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(META_TIMEOUT_MS),
    });

    const body = (await response.json().catch(() => null)) as MetaTemplateResponse | null;

    if (!response.ok) {
      return {
        ok: false,
        status: providerStatus(response.status),
        provider_http_status: response.status,
        ...(typeof body?.error?.code === "number"
          ? { provider_error_code: body.error.code }
          : {}),
        ...(typeof body?.error?.error_subcode === "number"
          ? { provider_error_subcode: body.error.error_subcode }
          : {}),
      };
    }

    if (!body || typeof body.id !== "string") {
      return {
        ok: false,
        status: "provider_error",
        provider_http_status: response.status,
      };
    }

    return {
      ok: true,
      status: "submitted",
      template: {
        name: GARAGE_RFQ_TEMPLATE_NAME,
        language: "ar",
        category: "UTILITY",
        review_status: typeof body.status === "string" ? body.status : "PENDING",
      },
    };
  } catch {
    return { ok: false, status: "provider_unavailable" };
  }
}
