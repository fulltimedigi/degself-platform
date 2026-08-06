import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Guard: user-facing copy (FAQ tech-stack answer, etc.) must stay model-agnostic
// — it names "Claude" / "Anthropic" but must NOT pin a fast-moving version like
// "claude-haiku-4-5" or "Claude Haiku". Runtime model IDs live in code
// (asaali-cost-guard.ts / route handlers) and are intentionally NOT scanned here.
//
// Scope: the four locale message catalogs. If a pinned model name is ever
// re-introduced into copy, this test fails.

const here = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = join(here, "../../../messages");
const LOCALES = ["ar", "en", "hi", "ur"] as const;

// Version-pinned / tiered model names that must never appear in copy.
const FORBIDDEN: { label: string; re: RegExp }[] = [
  { label: "claude-haiku slug", re: /claude-haiku/i },
  { label: "claude-sonnet slug", re: /claude-sonnet/i },
  { label: "claude-opus slug", re: /claude-opus/i },
  // Any pinned versioned id, e.g. claude-haiku-4-5, claude-sonnet-5, claude-x-9.
  { label: "pinned claude-*-<version> slug", re: /claude-[a-z]+-\d/i },
  // Tiered family names, e.g. "Claude Haiku", "Claude Sonnet 5", "Claude Opus".
  { label: 'tiered "Claude <Tier>" name', re: /claude\s+(haiku|sonnet|opus)/i },
];

for (const locale of LOCALES) {
  test(`FAQ/copy in ${locale}.json pins no Claude model version`, () => {
    const raw = readFileSync(join(MESSAGES_DIR, `${locale}.json`), "utf8");
    // Ensure the catalog is valid JSON while we're here.
    assert.doesNotThrow(() => JSON.parse(raw), `${locale}.json must be valid JSON`);
    for (const { label, re } of FORBIDDEN) {
      assert.doesNotMatch(
        raw,
        re,
        `${locale}.json must not contain a ${label} (keep AI copy model-agnostic: "Claude models from Anthropic")`
      );
    }
  });
}
