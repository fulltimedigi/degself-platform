-- ============================================================
-- Migration 011 — Consolidate "كراج محمد الصهيبي" duplicates
-- Date: 2026-06-27
-- ============================================================
--
-- WHY: Two place_ids represent the same physical workshop:
--   1. ChIJtdPVAF-bzz8RhSZ0yRsiuxs — كراج محمد الصهيبي (main, 74 reviews, 4.3★)
--   2. ChIJazwAcgCbzz8RgfwoM3ANZC4 — كراج محمد الصهيبي - ألماني (dup, 2 reviews)
--
-- The owner confirmed via direct contact:
--   - Active phone number: 99168778 (was previously on the duplicate entry)
--   - The "ألماني" listing is the duplicate and should be removed
--
-- Per migration 004's soft-removal contract:
--   - `active=false` hides from the public app (fetchRows filters active=true)
--   - `removal_reason` records why (audit trail)
--   - `removed_at` records when
-- The row stays in the database — fully reversible.

-- 1) Update phone on the canonical entry (verified directly with the owner)
update public.workshops
set phone = '99168778'
where place_id = 'ChIJtdPVAF-bzz8RhSZ0yRsiuxs';

-- 2) Soft-remove the duplicate "ألماني" entry
update public.workshops
set
  active = false,
  removal_reason = 'duplicate',
  removed_at = now()
where place_id = 'ChIJazwAcgCbzz8RgfwoM3ANZC4'
  and active = true;

-- Verify after running:
--   select place_id, name, phone, active, removal_reason, removed_at
--   from public.workshops
--   where name like '%الصهيبي%';
--
-- Expected:
--   ChIJtdPVAF-bzz8RhSZ0yRsiuxs | كراج محمد الصهيبي           | 99168778 | true  | null      | null
--   ChIJazwAcgCbzz8RgfwoM3ANZC4 | كراج محمد الصهيبي - ألماني | (old)    | false | duplicate | <now()>
