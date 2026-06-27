-- ============================================================
-- Migration 011 — Soft-remove "كراج محمد الصهيبي - ألماني" (duplicate)
-- Date: 2026-06-27
-- ============================================================
--
-- WHY: place_id ChIJazwAcgCbzz8RgfwoM3ANZC4 is a duplicate listing of the
-- same physical workshop already covered by ChIJtdPVAF-bzz8RhSZ0yRsiuxs
-- ("كراج محمد الصهيبي" — main entry, 74 reviews, rating 4.3). The "ألماني"
-- entry only has 2 reviews and represents the same business under a slight
-- name variant on Google Maps.
--
-- Per migration 004's soft-removal contract:
--   - `active=false` hides it from the public app (fetchRows filters active=true)
--   - `removal_reason` records why (audit trail)
--   - `removed_at` records when
-- The row stays in the database — fully reversible.

update public.workshops
set
  active = false,
  removal_reason = 'duplicate',
  removed_at = now()
where place_id = 'ChIJazwAcgCbzz8RgfwoM3ANZC4'
  and active = true;

-- Verify after running:
--   select place_id, name, active, removal_reason, removed_at
--   from public.workshops
--   where name like '%الصهيبي%';
--
-- Expected:
--   ChIJtdPVAF-bzz8RhSZ0yRsiuxs | كراج محمد الصهيبي           | true  | null      | null
--   ChIJazwAcgCbzz8RgfwoM3ANZC4 | كراج محمد الصهيبي - ألماني | false | duplicate | <now()>
