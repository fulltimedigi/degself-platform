-- Migration 003 — non-destructive audit columns (data-accuracy review).
-- Run in Supabase SQL Editor (degself-v2). Idempotent / safe to re-run.
--
-- These columns store the audit results WITHOUT touching the original `specialty`,
-- so everything is reviewable and fully reversible (drop the columns to undo).
-- The ranking/translator should read `reviewed_specialty` and filter on
-- `is_automotive = true AND coalesce(out_of_scope,false) = false`.

alter table public.workshops add column if not exists reviewed_specialty text;
alter table public.workshops add column if not exists is_automotive boolean not null default true;
alter table public.workshops add column if not exists out_of_scope boolean not null default false;
alter table public.workshops add column if not exists audit_confidence text;  -- HIGH | MEDIUM | LOW | NON_CAR | OOS
alter table public.workshops add column if not exists audit_reviewed_at timestamptz;

-- helpful partial index for the live, automotive, in-scope set
create index if not exists workshops_reviewed_idx
  on public.workshops (reviewed_specialty)
  where is_automotive = true and out_of_scope = false;

-- Verify after running scripts/apply-audit.ts:
--   select audit_confidence, count(*) from public.workshops group by 1 order by 2 desc;
--   select count(*) from public.workshops where is_automotive = false;   -- ~152
