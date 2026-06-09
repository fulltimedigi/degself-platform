-- Migration 002 — Arabic-normalized search_text column for pg_trgm search
-- Run in Supabase SQL Editor (degself-v2). Depends on migration 001 (schema.sql).
--
-- Strategy: a TRIGGER-maintained plain text column (not a generated column).
-- Generated columns require a fully IMMUTABLE expression; lower() is only STABLE,
-- and SQL functions get inlined and re-checked. A trigger has no such constraint.
-- normalize_arabic is plpgsql/immutable/strict and uses literal Arabic characters.

-- =========================================================
-- 0. Cleanup — idempotent (safe to re-run after partial failures).
--    Order: trigger → trigger fn → index → column → normalize fn.
-- =========================================================
drop trigger if exists workshops_search_text_trg on public.workshops;
drop function if exists public.workshops_update_search_text();
drop index if exists workshops_search_text_trgm_idx;
alter table public.workshops drop column if exists search_text;
drop function if exists public.normalize_arabic(text);

-- =========================================================
-- 1. normalize_arabic(text) — plpgsql, IMMUTABLE, STRICT, literal Arabic.
-- =========================================================
create or replace function public.normalize_arabic(input text)
returns text
language plpgsql
immutable
strict
as $$
declare
  s text := input;
begin
  -- a) lowercase ASCII letters (Arabic has no case)
  s := translate(s, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz');

  -- b) strip tashkeel (tatweel + the 8 harakat/tanwin/shadda/sukun) by deleting them
  s := translate(s, 'ـًٌٍَُِّْ', '');

  -- c) unify letters:
  --    أ إ آ ٱ → ا  |  ى ی → ي  |  ة → ه  |  ک → ك  |  ؤ → و  |  ئ → ي
  s := translate(s, 'أإآٱىیةکؤئ', 'ااااييهكوي');

  -- d) drop standalone hamza ء
  s := regexp_replace(s, 'ء', '', 'g');

  -- e) Kuwaiti garage variants: كراج / قراج / جراج → كراج
  s := regexp_replace(s, '[كقج]راج', 'كراج', 'g');

  -- f) collapse repeated whitespace
  s := regexp_replace(s, '\s+', ' ', 'g');

  -- g) trim
  return btrim(s);
end;
$$;

-- =========================================================
-- 2. Plain search_text column (filled by trigger, not generated).
-- =========================================================
alter table public.workshops add column search_text text;

-- =========================================================
-- 3. Trigger function — recompute search_text from the source fields.
-- =========================================================
create or replace function public.workshops_update_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := public.normalize_arabic(
    coalesce(new.name, '') || ' ' ||
    coalesce(new.specialty, '') || ' ' ||
    coalesce(array_to_string(new.specialty_hints, ' '), '') || ' ' ||
    coalesce(new.address, '') || ' ' ||
    coalesce(new.governorate, '') || ' ' ||
    coalesce(new.area, '')
  );
  return new;
end;
$$;

-- =========================================================
-- 4. Trigger — fires before insert, or update of any source field.
-- =========================================================
create trigger workshops_search_text_trg
  before insert or update of name, specialty, specialty_hints, address, governorate, area
  on public.workshops
  for each row
  execute function public.workshops_update_search_text();

-- =========================================================
-- 5. Backfill the 1801 existing rows (trigger does NOT fire retroactively).
-- =========================================================
update public.workshops set search_text = public.normalize_arabic(
  coalesce(name, '') || ' ' ||
  coalesce(specialty, '') || ' ' ||
  coalesce(array_to_string(specialty_hints, ' '), '') || ' ' ||
  coalesce(address, '') || ' ' ||
  coalesce(governorate, '') || ' ' ||
  coalesce(area, '')
);

-- =========================================================
-- 6. Trigram index for fast fuzzy search on search_text.
-- =========================================================
create index workshops_search_text_trgm_idx
  on public.workshops using gin (search_text gin_trgm_ops);

-- =========================================================
-- 7. Verification (run separately) — both should return 1801:
-- =========================================================
-- select count(*) from public.workshops where search_text is not null;
-- select count(*) from public.workshops;
