-- IP-based rate limiting for public write endpoints (Phase 0: /api/quotes).
-- Server-only, like reviews/quotes: RLS enabled with NO policies → the browser
-- can neither read nor write; the API uses the service-role key (bypasses RLS).
--
-- Bucketing: the API writes window_start = date_trunc('hour', now()), so all
-- requests from the same ip+bucket within one clock hour collide on the primary
-- key and increment `count`. A request is rejected once count exceeds the limit
-- (5/hour for 'quotes'). Old rows can be swept periodically; harmless if left.

create table if not exists public.rate_limits (
  ip           text not null,
  bucket       text not null,                 -- e.g. 'quotes'
  window_start timestamptz not null default now(),
  count        int not null default 1,
  primary key (ip, bucket, window_start)
);

create index if not exists rate_limits_lookup
  on public.rate_limits (ip, bucket, window_start desc);

alter table public.rate_limits enable row level security;
-- No policies → server-side (service-role) access only.
