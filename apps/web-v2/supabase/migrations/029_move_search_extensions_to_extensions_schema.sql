-- Move search extensions out of the public schema (2026-08).
--
-- Goal: relocate the two full-text/trigram search extensions from `public`
-- into the dedicated `extensions` schema, clearing the Supabase security
-- advisor warning 0014_extension_in_public for each of them.
--
--   • pg_trgm  — trigram ops backing the GIN indexes on workshops.name /
--                workshops.search_text (ILIKE acceleration).
--   • unaccent — accent-stripping text-search dictionary.
--
-- Why this is safe (see the Dependency Audit in the PR description):
--   • Both extensions report extrelocatable = true.
--   • `ALTER EXTENSION … SET SCHEMA` relocates ALL member objects (functions,
--     operators, operator classes/families, types, ts_dict/ts_template) as a
--     unit, preserving their OIDs. Indexes reference the trigram operator class
--     by OID (pg_index.indclass), so they stay valid — NO reindex required.
--   • No function / view / materialized view / generated column / application
--     query calls similarity(), word_similarity(), show_trgm() or unaccent()
--     unqualified — search is exclusively ILIKE, resolved through the index
--     operator class by OID, independent of search_path. normalize_arabic()
--     uses only pg_catalog builtins (translate/regexp_replace/btrim).
--   • anon / authenticated / service_role already hold USAGE on `extensions`.
--
-- Scope guardrails: this migration ONLY relocates the two extensions. It does
-- NOT drop or (re)create any extension, does NOT drop/rebuild any index, does
-- NOT alter search_path, tables, functions, RLS, or grants.

-- Ensure the destination schema exists (idempotent; already present on Supabase).
create schema if not exists extensions;

-- Relocate each extension only when it currently lives in `public`. If it is
-- already in `extensions`, treat the desired state as met and do nothing. If it
-- is missing, or sits in some third, unexpected schema, stop with a clear error
-- instead of guessing.
do $do$
declare
  ext_name text;
  cur_schema text;
begin
  foreach ext_name in array array['pg_trgm', 'unaccent'] loop
    select n.nspname
      into cur_schema
      from pg_extension e
      join pg_namespace n on n.oid = e.extnamespace
      where e.extname = ext_name;

    if cur_schema is null then
      raise exception
        'Extension % is not installed; refusing to guess. Aborting migration.',
        ext_name;
    elsif cur_schema = 'extensions' then
      raise notice 'Extension % already in schema extensions — nothing to do.',
        ext_name;
    elsif cur_schema = 'public' then
      execute format('alter extension %I set schema extensions', ext_name);
      raise notice 'Moved extension % from public to extensions.', ext_name;
    else
      raise exception
        'Extension % is in unexpected schema %; refusing to move it. Aborting migration.',
        ext_name, cur_schema;
    end if;
  end loop;
end
$do$;
