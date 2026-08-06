-- Restore the Asaali cost-guard RPCs without recreating the retired
-- asaali_rate_limit table. These functions are backend-only and execute with
-- the caller's privileges; only service_role may invoke them.

create or replace function public.asaali_current_month_cost()
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(cost_usd), 0)::numeric(10,4)
  from public.asaali_usage
  where created_at >= date_trunc('month', now())
    and cache_hit is not true;
$$;

comment on function public.asaali_current_month_cost() is
  'Returns current-month Asaali AI spend in USD, excluding cache hits.';

revoke all on function public.asaali_current_month_cost() from public;
revoke all on function public.asaali_current_month_cost() from anon, authenticated;
grant execute on function public.asaali_current_month_cost() to service_role;

create or replace function public.asaali_cleanup_expired_cache()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.asaali_cache
  where expires_at < now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.asaali_cleanup_expired_cache() is
  'Deletes expired Asaali response-cache rows and returns the number removed.';

revoke all on function public.asaali_cleanup_expired_cache() from public;
revoke all on function public.asaali_cleanup_expired_cache() from anon, authenticated;
grant execute on function public.asaali_cleanup_expired_cache() to service_role;
