-- Search relevance score (Task #6): surface trusted, established centers/dealers
-- instead of letting thin 5.0-with-3-reviews shops bury الساير/البابطين/الغانم.
--
-- Plain column populated by scripts/compute-rank.ts (recompute after bulk data
-- changes). We avoided a GENERATED column because the Bayesian prior (global mean
-- rating C) is better computed from live data than hardcoded, and to sidestep
-- generated-expression immutability quirks across Postgres versions.
--
-- rank_score = Bayesian-adjusted rating + log-weighted review volume + dealer boost
--   • Bayesian (prior m=25, C=mean rating ≈4.0): a 5.0 (3 reviews) can't outrank
--     a 4.1 (1700 reviews).
--   • 0.35 * log10(1+reviews): rewards established, well-reviewed places.
--   • +0.25 when reviewed_specialty='وكيل': modest authorized-dealer boost.

ALTER TABLE workshops ADD COLUMN IF NOT EXISTS rank_score double precision;

CREATE INDEX IF NOT EXISTS workshops_rank_score_idx ON workshops (rank_score DESC);
