-- Migration 004 — Google Places enrichment + soft-removal tracking.
-- Run in Supabase SQL Editor (degself-v2). Idempotent / safe to re-run.
--
-- 1) `neighborhood` (الحي) — authoritative neighborhood from Google Places,
--    stored separately from the existing free-text `area`. Read-only enrichment.
-- 2) Soft-removal columns — we never hard-delete. `active=false` already hides a
--    row from the app (fetchRows filters active=true); these columns record WHY
--    and WHEN, so a removal is auditable and fully reversible.

alter table public.workshops add column if not exists neighborhood text;
alter table public.workshops add column if not exists removal_reason text;  -- not_found | non_automotive | permanently_closed | temporarily_closed
alter table public.workshops add column if not exists removed_at timestamptz;

-- Verify after running scripts/apply-places.ts:
--   select removal_reason, count(*) from public.workshops where active = false group by 1 order by 2 desc;
--   select count(*) from public.workshops where neighborhood is not null;  -- ~1760
--   select count(*) from public.workshops where active = true and permanently_closed = false;  -- ~1753
