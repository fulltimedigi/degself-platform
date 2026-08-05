-- 1) Atomic rate-limit bump (fixes read-then-update races under concurrency).
-- 2) admin_credentials.session_epoch — bumping it invalidates all admin cookies.

-- ── rate limit RPC ──────────────────────────────────────────────────────────
create or replace function public.bump_rate_limit(
  p_ip text,
  p_bucket text,
  p_window timestamptz,
  p_limit int
) returns table(allowed boolean, new_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  c int;
begin
  insert into public.rate_limits (ip, bucket, window_start, count)
  values (p_ip, p_bucket, p_window, 1)
  on conflict (ip, bucket, window_start)
  do update set count = public.rate_limits.count + 1
  returning public.rate_limits.count into c;

  return query select (c <= p_limit), c;
end;
$$;

revoke all on function public.bump_rate_limit(text, text, timestamptz, int) from public;
revoke all on function public.bump_rate_limit(text, text, timestamptz, int) from anon, authenticated;
-- service_role bypasses RLS/grants for RPC in Supabase; keep explicit grant for clarity.
grant execute on function public.bump_rate_limit(text, text, timestamptz, int) to service_role;

-- ── session epoch ───────────────────────────────────────────────────────────
alter table public.admin_credentials
  add column if not exists session_epoch integer not null default 1;

comment on column public.admin_credentials.session_epoch is
  'Incremented on password change; admin_session cookie is bound to this value.';
