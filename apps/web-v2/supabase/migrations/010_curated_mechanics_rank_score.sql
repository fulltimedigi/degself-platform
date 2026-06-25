-- ============================================================
-- Migration 010 — Give the 101 curated mechanics a rank_score
--                 so they stop sorting dead-last in browse/search.
-- Date: 2026-06-25
-- ============================================================
--
-- WHY: migration 008 inserted the curated mechanics without rank_score (it is
-- computed by scripts/compute-rank.ts, not at insert time), so all 101 carried
-- rank_score = NULL and fell to the very bottom of every rank_score-ordered
-- surface (/search default, /karaj-mutanaqil, the "rest" bucket in Path D).
--
-- FAITHFUL TO compute-rank.ts: that script computes
--     rank_score = bayes + 0.35*log10(1+reviews) + (reviewed_specialty='وكيل' ? 0.25 : 0)
--     bayes      = (reviews*rating + m*C) / (reviews + m)     [m=25, C=mean rating]
-- EVERY curated mechanic has google_reviews_count = NULL (→ reviews = 0) and
-- none are وكيل, so the formula collapses to:
--     bayes = (0 + 25*C) / 25 = C ,  vol = 0 ,  boost = 0  →  rank_score = C
-- i.e. all 101 land at the global mean rating — a fair middling rank: below
-- well-reviewed established centers (their log-volume term lifts them), above
-- thin/low-rated shops. This is exactly what `compute-rank.ts --commit` would
-- write for these rows; running that script remains the canonical full recompute.
--
-- C is computed live from the same population compute-rank.ts uses
-- (active, not permanently closed, has a google_rating).
--
-- Idempotent: only fills rows still missing rank_score.

WITH c AS (
  SELECT round(avg(google_rating)::numeric, 3) AS mean
  FROM public.workshops
  WHERE active = true
    AND permanently_closed = false
    AND google_rating IS NOT NULL
)
UPDATE public.workshops w
SET rank_score = (SELECT mean FROM c)
WHERE w.place_id LIKE 'degself-mech-%'
  AND w.rank_score IS NULL;

-- Verify after running:
--   SELECT count(*) FILTER (WHERE rank_score IS NULL) AS still_null,
--          count(*)                                   AS total,
--          min(rank_score), max(rank_score)
--   FROM public.workshops WHERE place_id LIKE 'degself-mech-%';
--   -- expect still_null = 0, and min = max = the mean rating C (~4.x)
