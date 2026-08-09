-- P0: reserve 256-bit opaque capability tokens for new WABA delivery rows.
-- Existing reserved tokens remain valid; only the default for future rows changes.

create extension if not exists pgcrypto;

alter table public.quote_delivery_queue
  alter column delivery_token set default encode(gen_random_bytes(32), 'hex');
