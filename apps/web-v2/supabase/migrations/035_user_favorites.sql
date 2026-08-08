-- User favorites for authenticated end-users + account-deletion FK correction.
--
-- Two capabilities land here:
--   1) public.user_favorites — the source of truth for a signed-in user's saved
--      workshops (guests keep using localStorage; see src/lib/favorites.ts).
--   2) community_mentions.matched_by → ON DELETE SET NULL, so deleting an
--      account clears attribution WITHOUT destroying the mention record.
--
-- Safe to re-run: IF NOT EXISTS / DROP … IF EXISTS before create.
-- Verified against the live database (2026-08-08) before writing:
--   • community_mentions.matched_by is NULLABLE and was ON DELETE NO ACTION.
--   • workshops.claimed_by is intentionally NOT touched here (see PR body).

-- =========================================================
-- 1. user_favorites
--    Identity of a favorite = (user, workshop). No surrogate id:
--    the composite PK makes duplicates structurally impossible and
--    inserts/upserts naturally idempotent.
-- =========================================================
create table if not exists public.user_favorites (
  user_id    uuid not null references auth.users(id)        on delete cascade,
  place_id   text not null references public.workshops(place_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

-- Per-user newest-first listing.
create index if not exists user_favorites_user_created_idx
  on public.user_favorites (user_id, created_at desc);

-- =========================================================
-- 2. RLS — a user may only ever see/insert/delete their OWN rows.
--    Normal favorites access uses the browser's authenticated session
--    (publishable key); RLS is the authorization boundary.
--    auth.uid() is wrapped in a scalar subselect so it is evaluated once
--    per statement (initPlan), matching migration 028's hardened style.
-- =========================================================
alter table public.user_favorites enable row level security;

drop policy if exists "user_favorites select own" on public.user_favorites;
create policy "user_favorites select own"
  on public.user_favorites for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_favorites insert own" on public.user_favorites;
create policy "user_favorites insert own"
  on public.user_favorites for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_favorites delete own" on public.user_favorites;
create policy "user_favorites delete own"
  on public.user_favorites for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- No UPDATE policy: a favorite is created or removed, never mutated.
-- No anon policy: guests use localStorage, never this table.

-- Least-privilege grants (hardened style from migration 028).
revoke all on table public.user_favorites from anon, authenticated;
grant select, insert, delete on table public.user_favorites to authenticated;
grant all on table public.user_favorites to service_role;

-- =========================================================
-- 3. community_mentions.matched_by → ON DELETE SET NULL
--    Attribution metadata may safely become unknown when an account is
--    deleted; the mention record itself must survive. matched_by is nullable
--    and verified NO ACTION on the live DB before this change.
--    (workshops.claimed_by is deliberately left as-is — unclaiming a workshop
--     is an ownership transition, not FK cleanup. See PR body.)
-- =========================================================
alter table public.community_mentions
  drop constraint if exists community_mentions_matched_by_fkey;

alter table public.community_mentions
  add constraint community_mentions_matched_by_fkey
  foreign key (matched_by) references public.profiles(id)
  on delete set null;
