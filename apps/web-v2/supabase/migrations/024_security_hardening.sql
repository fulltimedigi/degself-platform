-- Security hardening (2026-08):
-- 1) Lock gsc_indexing_queue when present (anon SSRF via cron)
-- 2) Revoke anon/authenticated execute on asaali SECURITY DEFINER helpers
-- 3) Profiles: stop world-readable PII + guard mass-assignment on update
--
-- Safe if gsc_indexing_queue was never created (migration 012 not applied).

-- ── 1) GSC indexing queue (skip entirely if table missing) ───────────────────
do $$
begin
  if to_regclass('public.gsc_indexing_queue') is null then
    raise notice 'gsc_indexing_queue missing — skipping GSC RLS (ok)';
    return;
  end if;

  execute 'alter table public.gsc_indexing_queue enable row level security';
  -- No policies for anon/authenticated ⇒ deny by default under RLS.
  -- service_role bypasses RLS (cron + admin tooling).
  execute 'revoke all on table public.gsc_indexing_queue from anon, authenticated';
  execute 'grant all on table public.gsc_indexing_queue to service_role';
end $$;

-- ── 2) Asaali cost-guard RPCs (service_role only) ────────────────────────────
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'asaali_current_month_cost'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    revoke all on function public.asaali_current_month_cost() from public;
    revoke all on function public.asaali_current_month_cost() from anon, authenticated;
    grant execute on function public.asaali_current_month_cost() to service_role;
    execute 'alter function public.asaali_current_month_cost() set search_path = public';
  end if;

  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'asaali_cleanup_expired_cache'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    revoke all on function public.asaali_cleanup_expired_cache() from public;
    revoke all on function public.asaali_cleanup_expired_cache() from anon, authenticated;
    grant execute on function public.asaali_cleanup_expired_cache() to service_role;
    execute 'alter function public.asaali_cleanup_expired_cache() set search_path = public';
  end if;
end $$;

-- ── 3) Profiles privacy (skip if table missing) ──────────────────────────────
do $$
begin
  if to_regclass('public.profiles') is null then
    raise notice 'profiles missing — skipping profiles policies (ok)';
    return;
  end if;

  execute 'drop policy if exists "profiles viewable by everyone" on public.profiles';
  execute 'drop policy if exists "profiles select own" on public.profiles';
  execute $p$
    create policy "profiles select own"
      on public.profiles for select
      using (auth.uid() = id)
  $p$;

  execute 'drop policy if exists "users can update own profile" on public.profiles';
  execute $p$
    create policy "users can update own profile"
      on public.profiles for update
      using (auth.uid() = id)
      with check (auth.uid() = id)
  $p$;

  execute $f$
    create or replace function public.profiles_guard_columns()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $fn$
    begin
      new.id := old.id;
      new.contributions_count := old.contributions_count;
      new.created_at := old.created_at;
      new.updated_at := now();
      return new;
    end;
    $fn$
  $f$;

  execute 'drop trigger if exists profiles_guard_columns on public.profiles';
  execute $t$
    create trigger profiles_guard_columns
      before update on public.profiles
      for each row execute function public.profiles_guard_columns()
  $t$;
end $$;
