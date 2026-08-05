-- Asaali rate limiting now uses public.rate_limits + bump_rate_limit RPC
-- (bucket = 'asaali', ip column stores the hashed IP). Drop the unused table.

drop function if exists public.asaali_cleanup_old_rate_limits();
drop table if exists public.asaali_rate_limit;
