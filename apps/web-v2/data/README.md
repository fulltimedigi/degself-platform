# Offline / pipeline artifacts (not runtime)

Files here are **not** imported by the Next.js app.

Runtime JSON lives under `src/data/` (imported as `@/data/...`):
- `src/data/workshops_enriched_lookup.json`
- `src/data/dialect_dictionary_cleaned.json`
- `src/data/filter_options.json`
- `src/data/audit-corrections.json`

The JSON blobs in this folder (`workshops_enriched.json`, `workshop_scores.json`, etc.) are enrichment pipeline outputs kept for reprocessing/audit — not the live catalog (Supabase is).
