import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { checkWhatsAppCredentials } from "../whatsapp-credentials-check";

test("credential check performs only the requested read-only Meta lookup", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  const result = await checkWhatsAppCredentials(
    "test-secret-token",
    "123456789",
    async (input, init) => {
      requestedUrl = input.toString();
      requestedInit = init;
      return Response.json({
        verified_name: "Degself",
        display_phone_number: "+965 5555 5555",
        quality_rating: "GREEN",
        id: "123456789",
      });
    }
  );

  const url = new URL(requestedUrl);
  assert.equal(url.origin, "https://graph.facebook.com");
  assert.equal(url.pathname, "/v21.0/123456789");
  assert.equal(
    url.searchParams.get("fields"),
    "verified_name,display_phone_number,quality_rating"
  );
  assert.equal(requestedInit?.method, "GET");
  assert.equal(requestedInit?.body, undefined);
  assert.equal(requestedInit?.cache, "no-store");
  assert.deepEqual(result, {
    ok: true,
    status: "valid",
    phone_number: {
      verified_name: "Degself",
      display_phone_number: "+965 5555 5555",
      quality_rating: "GREEN",
    },
  });
  assert.doesNotMatch(JSON.stringify(result), /test-secret-token|123456789/);
});

test("credential check does not expose Meta error details", async () => {
  const result = await checkWhatsAppCredentials(
    "test-secret-token",
    "123456789",
    async () =>
      Response.json(
        {
          error: {
            message: "OAuth token test-secret-token is invalid",
            type: "OAuthException",
          },
        },
        { status: 401 }
      )
  );

  assert.deepEqual(result, {
    ok: false,
    status: "invalid_credentials",
    provider_http_status: 401,
  });
  assert.doesNotMatch(JSON.stringify(result), /OAuth|test-secret-token/);
});

test("admin route is GET-only, session-protected, uncached, and independent of send flag", async () => {
  const route = await readFile(
    new URL("../../app/api/admin/whatsapp-credentials-check/route.ts", import.meta.url),
    "utf8"
  );

  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(route, /isAdminRequest\(req\)/);
  assert.match(route, /WHATSAPP_TOKEN/);
  assert.match(route, /WHATSAPP_PHONE_NUMBER_ID/);
  assert.doesNotMatch(route, /WHATSAPP_ENABLED/);
  assert.match(route, /private, no-store/);
});
