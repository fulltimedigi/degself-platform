import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Schema contract for migration 029 (move pg_trgm + unaccent out of `public`).
// We assert on the migration TEXT so the guarantees hold in review before the
// migration is ever applied to a database. Comments are stripped first: the
// documentation header intentionally mentions forbidden verbs (reindex, drop
// index, search_path, the index names) while explaining what the migration must
// NOT do — so the executable-SQL contract is checked against code only.

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = join(
  here,
  "../../../supabase/migrations/029_move_search_extensions_to_extensions_schema.sql"
);

/** Strip `-- line comments`, then lowercase and collapse whitespace. */
function sqlCode(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

test("migration 029 file exists", () => {
  assert.ok(existsSync(MIGRATION_PATH), "029 migration file is present");
});

const RAW = readFileSync(MIGRATION_PATH, "utf8");
const CODE = sqlCode(RAW);

test("029 creates the extensions schema idempotently", () => {
  assert.match(CODE, /create schema if not exists extensions/);
});

test("029 relocates via ALTER EXTENSION ... SET SCHEMA extensions", () => {
  // Move is performed through a format() template over an array of both names.
  assert.match(CODE, /alter extension %i set schema extensions/);
});

test("029 targets both pg_trgm and unaccent", () => {
  assert.match(CODE, /array\s*\[\s*'pg_trgm'\s*,\s*'unaccent'\s*\]/);
});

test("029 guards on the current schema before moving", () => {
  // Reads real catalog state instead of assuming the extension is in public.
  assert.match(CODE, /pg_extension/);
  assert.match(CODE, /pg_namespace/);
  // Only moves when currently in public; aborts on unexpected/missing states.
  assert.match(CODE, /cur_schema\s*=\s*'public'/);
  assert.match(CODE, /raise exception/);
});

test("029 never drops or recreates an extension", () => {
  assert.doesNotMatch(CODE, /drop\s+extension/);
  assert.doesNotMatch(CODE, /create\s+extension\s+pg_trgm/);
  assert.doesNotMatch(CODE, /create\s+extension\s+unaccent/);
  assert.doesNotMatch(CODE, /create\s+extension\s+if\s+not\s+exists\s+pg_trgm/);
  assert.doesNotMatch(CODE, /create\s+extension\s+if\s+not\s+exists\s+unaccent/);
});

test("029 never drops or rebuilds an index", () => {
  assert.doesNotMatch(CODE, /drop\s+index/);
  assert.doesNotMatch(CODE, /\breindex\b/);
  assert.doesNotMatch(CODE, /create\s+(unique\s+)?index/);
});

test("029 does not touch the trigram indexes", () => {
  assert.doesNotMatch(CODE, /workshops_name_trgm_idx/);
  assert.doesNotMatch(CODE, /workshops_search_text_trgm_idx/);
});

test("029 does not alter search_path", () => {
  assert.doesNotMatch(CODE, /search_path/);
});
