import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const analytics = readFileSync(join(process.cwd(), "src/lib/product-analytics.ts"), "utf8");
const bridge = readFileSync(join(process.cwd(), "src/app/api/ds-b1/route.ts"), "utf8");
const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");
const nextConfig = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

test("PostHog stays first-party, anonymous, and SDK-free", () => {
  const clientCode = stripComments(analytics);
  const bridgeCode = stripComments(bridge);

  assert.match(clientCode, /POSTHOG_CAPTURE_PATH\s*=\s*["']\/api\/ds-b1["']/);
  assert.match(clientCode, /credentials:\s*["']same-origin["']/);
  assert.doesNotMatch(clientCode, /api_key\s*:/);
  assert.match(bridgeCode, /\$process_person_profile:\s*false/);
  assert.doesNotMatch(clientCode, /from\s+["']posthog-js["']/);
  assert.doesNotMatch(clientCode, /posthog\.identify|autocapture\s*:|session_recording\s*:/i);
});

test("only public PostHog project configuration is documented", () => {
  assert.match(envExample, /NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=/);
  assert.match(envExample, /NEXT_PUBLIC_POSTHOG_HOST=https:\/\/eu\.i\.posthog\.com/);
  assert.doesNotMatch(envExample, /POSTHOG_PERSONAL_API_KEY|POSTHOG_API_SECRET/);
});

test("server bridge re-sanitizes and forwards only to the fixed EU capture endpoint", () => {
  const bridgeCode = stripComments(bridge);
  const connectSrc = nextConfig.match(/"connect-src ([^"]+)"/)?.[1] ?? "";

  assert.match(connectSrc, /'self'/);
  assert.doesNotMatch(connectSrc, /posthog\.com/i);
  assert.doesNotMatch(nextConfig, /destination:\s*["']https:\/\/.*posthog\.com/i);
  assert.match(
    bridgeCode,
    /POSTHOG_EU_ORIGIN\s*=\s*["']https:\/\/eu\.i\.posthog\.com["']/
  );
  assert.match(bridgeCode, /sanitizeProductProperties\(body\.event,\s*input\)/);
  assert.match(bridgeCode, /api_key:\s*token/);
  assert.match(bridgeCode, /\$process_person_profile:\s*false/);
  assert.match(bridgeCode, /MAX_BODY_CHARS\s*=\s*4096/);
  assert.match(bridgeCode, /DISTINCT_ID_PATTERN/);
  assert.doesNotMatch(bridgeCode, /headers:\s*request\.headers|headers:\s*req\.headers/i);
  assert.doesNotMatch(bridgeCode, /cookie\s*:/i);
});

test("analytics implementation contains no database or migration capability", () => {
  const code = `${analytics}\n${bridge}`;
  for (const forbidden of [
    "getSupabaseAdmin",
    "SUPABASE_SECRET_KEY",
    "service_role",
    "ALTER TABLE",
    "ALTER EXTENSION",
    "CREATE TABLE",
  ]) {
    assert.equal(code.includes(forbidden), false, `unexpected capability: ${forbidden}`);
  }
});
