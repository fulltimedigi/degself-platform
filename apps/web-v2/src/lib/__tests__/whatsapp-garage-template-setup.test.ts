import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  GARAGE_RFQ_TEMPLATE_NAME,
  submitGarageRfqTemplate,
} from "../whatsapp-garage-template-setup";

test("garage template setup submits the fixed PII-safe Utility template", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  const result = await submitGarageRfqTemplate("test-secret-token", async (input, init) => {
    requestedUrl = input.toString();
    requestedInit = init;
    return Response.json({ id: "template-id", status: "PENDING", category: "UTILITY" });
  });

  assert.equal(
    requestedUrl,
    "https://graph.facebook.com/v21.0/1764023074761001/message_templates"
  );
  assert.equal(requestedInit?.method, "POST");
  assert.equal(requestedInit?.cache, "no-store");
  assert.equal(
    new Headers(requestedInit?.headers).get("Authorization"),
    "Bearer test-secret-token"
  );

  const payload = JSON.parse(String(requestedInit?.body));
  assert.equal(payload.name, GARAGE_RFQ_TEMPLATE_NAME);
  assert.equal(payload.language, "ar");
  assert.equal(payload.category, "UTILITY");
  assert.deepEqual(payload.components[0].example.body_text, [
    ["صيانة مكيف السيارة", "تويوتا كامري 2020", "الشويخ الصناعية"],
  ]);
  assert.equal(payload.components[1].buttons[0].text, "عرض الطلب");
  assert.equal(
    payload.components[1].buttons[0].url,
    "https://degself.com/submit-offer/{{1}}"
  );
  assert.doesNotMatch(JSON.stringify(payload), /customer|phone|اسم العميل|رقم العميل/i);

  assert.deepEqual(result, {
    ok: true,
    status: "submitted",
    template: {
      name: "garage_quote_request_ar",
      language: "ar",
      category: "UTILITY",
      review_status: "PENDING",
    },
  });
  assert.doesNotMatch(JSON.stringify(result), /test-secret-token|template-id/);
});

test("garage template setup sanitizes Meta errors", async () => {
  const result = await submitGarageRfqTemplate("test-secret-token", async () =>
    Response.json(
      {
        error: {
          message: "Invalid parameter",
          code: 190,
          error_subcode: 463,
          error_data: { details: "The URL button example is invalid: test-secret-token" },
        },
      },
      { status: 401 }
    )
  );

  assert.deepEqual(result, {
    ok: false,
    status: "invalid_credentials",
    provider_http_status: 401,
    provider_error_code: 190,
    provider_error_subcode: 463,
    provider_error_hint: "url_example",
  });
  assert.doesNotMatch(JSON.stringify(result), /test-secret-token/);
});

test("admin setup route is POST-only, session-protected, confirmed, and flag-independent", async () => {
  const route = await readFile(
    new URL("../../app/api/admin/whatsapp-garage-template-setup/route.ts", import.meta.url),
    "utf8"
  );

  assert.match(route, /export async function POST/);
  assert.doesNotMatch(route, /export async function (GET|PUT|PATCH|DELETE)/);
  assert.match(route, /isAdminRequest\(req\)/);
  assert.match(route, /body\?\.confirm !== GARAGE_RFQ_TEMPLATE_NAME/);
  assert.match(route, /WHATSAPP_TOKEN/);
  assert.match(route, /WHATSAPP_PHONE_NUMBER_ID/);
  assert.doesNotMatch(route, /WHATSAPP_ENABLED/);
  assert.match(route, /private, no-store/);
});
