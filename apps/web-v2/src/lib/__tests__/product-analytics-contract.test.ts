import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const analytics = readFileSync(join(process.cwd(), "src/lib/product-analytics.ts"), "utf8");
const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");
const nextConfig = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

test("PostHog stays direct-capture, anonymous, and SDK-free", () => {
  const code = stripComments(analytics);
  assert.match(code, /\/i\/v0\/e\//);
  assert.match(code, /\$process_person_profile:\s*false/);
  assert.doesNotMatch(code, /from\s+["']posthog-js["']/);
  assert.doesNotMatch(code, /posthog\.identify|autocapture\s*:|session_recording\s*:/i);
});

test("only public PostHog project configuration is documented", () => {
  assert.match(envExample, /NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=/);
  assert.match(envExample, /NEXT_PUBLIC_POSTHOG_HOST=https:\/\/eu\.i\.posthog\.com/);
  assert.doesNotMatch(envExample, /POSTHOG_PERSONAL_API_KEY|POSTHOG_API_SECRET/);
});

test("CSP allows only the required PostHog EU capture origin", () => {
  const connectSrc = nextConfig.match(/"connect-src ([^"]+)"/)?.[1] ?? "";
  assert.match(connectSrc, /https:\/\/eu\.i\.posthog\.com/);
  assert.doesNotMatch(connectSrc, /https:\/\/\*\.posthog\.com/);
  assert.doesNotMatch(connectSrc, /https:\/\/us\.i\.posthog\.com/);
});

test("analytics implementation contains no database or migration capability", () => {
  for (const forbidden of [
    "getSupabaseAdmin",
    "SUPABASE_SECRET_KEY",
    "service_role",
    "ALTER TABLE",
    "ALTER EXTENSION",
    "CREATE TABLE",
  ]) {
    assert.equal(analytics.includes(forbidden), false, `unexpected capability: ${forbidden}`);
  }
});
