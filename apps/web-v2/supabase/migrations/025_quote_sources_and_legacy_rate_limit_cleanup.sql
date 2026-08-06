-- Reconcile production schema with the quote API and remove dead Asaali limiter state.
-- Safe to re-run.

alter table public.quotes
  drop constraint if exists quotes_source_check;

alter table public.quotes
  add constraint quotes_source_check
  check (source in ('quote_bar', 'translator', 'asaali', 'concierge'))
  not valid;

alter table public.quotes
  validate constraint quotes_source_check;

-- Asaali now uses the shared atomic public.rate_limits table through
-- public.bump_rate_limit; the old dedicated table/function are dead state.
drop function if exists public.asaali_cleanup_old_rate_limits();
drop table if exists public.asaali_rate_limit;
