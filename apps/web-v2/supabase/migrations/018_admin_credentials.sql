-- Self-service admin password change.
-- Moves the admin login password OUT of the MODERATION_PASSWORD env var and into
-- the database (stored as a scrypt hash, never plaintext), so it can be rotated
-- from the admin panel instead of a Vercel redeploy.
--
-- The MODERATION_PASSWORD env var KEEPS being the internal session-cookie token
-- (middleware/admin-auth are unchanged) and the bootstrap password used only
-- until the first DB row exists. Login now verifies against this table first.
--
-- Single-row table: id is pinned to 1.

create table if not exists public.admin_credentials (
  id            smallint primary key default 1,
  password_hash text not null,
  updated_at    timestamptz not null default now(),
  constraint admin_credentials_singleton check (id = 1)
);

-- Same posture as quotes/quote_offers: RLS on, NO policies → server-only
-- (service-role key). The hash is never exposed to the anon/authenticated client.
alter table public.admin_credentials enable row level security;

-- Seed the initial password (scrypt: "<saltHex>:<keyHex>", key len 64).
-- Value chosen by the owner; only the hash is stored here.
insert into public.admin_credentials (id, password_hash)
values (
  1,
  '1d6e6aad47c53094e9ca8f26ac26e971:449340e7fc4be545849f312f415e24a2dbf3a91517f7ebdebdfed21512d5dccc4db42f64df3e1cfb66b48ee452797534e4141296b53b0a865e69ba02a8780e53'
)
on conflict (id) do nothing;
