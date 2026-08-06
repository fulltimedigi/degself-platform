-- RLS and Data API hardening (2026-08).
--
-- Goals:
-- 1) Make profile policies explicit to authenticated users and cache auth.uid()
--    once per statement through an initPlan.
-- 2) Keep workshops publicly readable while forcing all mutations through the
--    server-side service-role APIs used by the current application.
-- 3) Remove public exposure of the legacy, currently-empty admins registry.
-- 4) Revoke direct Data API access to backend-only operational tables.
-- 5) Add the missing indexes for foreign-key maintenance paths.

-- ── Profiles: authenticated users may read/update only their own row ────────
drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;

create policy "profiles select own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on table public.profiles from anon, authenticated;
grant select, update on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- ── Workshops: public read, server-only mutations ───────────────────────────
-- The active admin experience uses custom signed sessions and server routes
-- backed by getSupabaseAdmin(); the legacy public.admins registry is empty.
drop policy if exists "only admins can modify workshops" on public.workshops;
drop policy if exists "workshops viewable by everyone" on public.workshops;

create policy "workshops viewable by everyone"
  on public.workshops for select
  to anon, authenticated
  using (true);

revoke all on table public.workshops from anon, authenticated;
grant select on table public.workshops to anon, authenticated;
grant all on table public.workshops to service_role;

-- ── Legacy admins registry: no direct Data API access ───────────────────────
drop policy if exists "admins viewable by everyone" on public.admins;
revoke all on table public.admins from anon, authenticated;
grant all on table public.admins to service_role;

-- ── Backend-only operational tables ─────────────────────────────────────────
do $do$
declare
  table_name text;
begin
  foreach table_name in array array[
    'admin_credentials',
    'asaali_cache',
    'asaali_usage',
    'quote_offers',
    'quotes',
    'rate_limits'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format(
        'revoke all on table public.%I from anon, authenticated',
        table_name
      );
      execute format(
        'grant all on table public.%I to service_role',
        table_name
      );
    end if;
  end loop;
end
$do$;

-- ── Foreign-key support indexes ─────────────────────────────────────────────
create index if not exists community_mentions_matched_by_idx
  on public.community_mentions (matched_by);

create index if not exists workshops_claimed_by_idx
  on public.workshops (claimed_by);
