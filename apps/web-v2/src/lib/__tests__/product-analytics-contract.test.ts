import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const analytics = readFileSync(join(process.cwd(), "src/lib/product-analytics.ts"), "utf8");
const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");

test("PostHog stays direct-capture, anonymous, and SDK-free", () => {
  assert.match(analytics, /\/i\/v0\/e\//);
  assert.match(analytics, /\$process_person_profile:\s*false/);
  assert.doesNotMatch(analytics, /from\s+["']posthog-js["']/);
  assert.doesNotMatch(analytics, /posthog\.identify|autocapture|session_recording/i);
});

test("only public PostHog project configuration is documented", () => {
  assert.match(envExample, /NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=/);
  assert.match(envExample, /NEXT_PUBLIC_POSTHOG_HOST=https:\/\/eu\.i\.posthog\.com/);
  assert.doesNotMatch(envExample, /POSTHOG_PERSONAL_API_KEY|POSTHOG_API_SECRET/);
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
