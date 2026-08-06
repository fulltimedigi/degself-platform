-- Security hardening (2026-08):
-- 1) Lock gsc_indexing_queue (was wide open → anon SSRF via cron)
-- 2) Revoke anon/authenticated execute on asaali SECURITY DEFINER helpers
-- 3) Profiles: stop world-readable PII + guard mass-assignment on update

-- ── 1) GSC indexing queue ────────────────────────────────────────────────────
alter table if exists public.gsc_indexing_queue enable row level security;

-- No policies for anon/authenticated ⇒ deny by default under RLS.
-- service_role bypasses RLS (cron + admin tooling).
revoke all on table public.gsc_indexing_queue from anon, authenticated;
grant all on table public.gsc_indexing_queue to service_role;

-- ── 2) Asaali cost-guard RPCs (service_role only) ────────────────────────────
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'asaali_current_month_cost'
  ) then
    revoke all on function public.asaali_current_month_cost() from public;
    revoke all on function public.asaali_current_month_cost() from anon, authenticated;
    grant execute on function public.asaali_current_month_cost() to service_role;
  end if;

  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'asaali_cleanup_expired_cache'
  ) then
    revoke all on function public.asaali_cleanup_expired_cache() from public;
    revoke all on function public.asaali_cleanup_expired_cache() from anon, authenticated;
    grant execute on function public.asaali_cleanup_expired_cache() to service_role;
  end if;
end $$;

-- Tighten search_path on the helpers if present.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'asaali_current_month_cost'
  ) then
    execute 'alter function public.asaali_current_month_cost() set search_path = public';
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'asaali_cleanup_expired_cache'
  ) then
    execute 'alter function public.asaali_cleanup_expired_cache() set search_path = public';
  end if;
end $$;

-- ── 3) Profiles privacy ──────────────────────────────────────────────────────
drop policy if exists "profiles viewable by everyone" on public.profiles;
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Prevent clients from bumping contributions_count / swapping id via update.
create or replace function public.profiles_guard_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.id := old.id;
  new.contributions_count := old.contributions_count;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_guard_columns on public.profiles;
create trigger profiles_guard_columns
  before update on public.profiles
  for each row execute function public.profiles_guard_columns();
