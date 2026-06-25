-- ============================================================
-- Migration 009 — Make the 101 curated mechanics visible on
--                 specialty-filtered surfaces.
-- Date: 2026-06-25
-- ============================================================
--
-- WHY: migration 008 inserted the curated mechanics with `specialty`
-- (e.g. "صيانة عامة"), but did NOT set `reviewed_specialty`. The public app
-- reads the AUDITED field everywhere it filters/groups by specialty:
--   • searchWorkshops()      → .eq("reviewed_specialty", specialty)
--   • bestCategories()       → groups /best by reviewed_specialty
--   • getDistinctSpecialties → populates the search dropdown from reviewed_specialty
-- With reviewed_specialty = NULL the mechanics were invisible on all of those
-- (they only appeared via free-text search / general browse).
--
-- These rows are hand-curated, so `specialty` already IS the audited value —
-- copy it across. `is_automotive`/`out_of_scope` keep their NOT NULL defaults
-- (true / false), and `search_text` is trigger-populated, so no other column
-- needs touching here.
--
-- Idempotent: only fills rows still missing reviewed_specialty.

UPDATE public.workshops
SET reviewed_specialty = specialty
WHERE place_id LIKE 'degself-mech-%'
  AND reviewed_specialty IS NULL;

-- Verify after running:
--   SELECT reviewed_specialty, count(*)
--   FROM public.workshops
--   WHERE place_id LIKE 'degself-mech-%'
--   GROUP BY 1 ORDER BY 2 DESC;
--   -- expect 0 rows with reviewed_specialty IS NULL
