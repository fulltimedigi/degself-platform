-- Device push-token registry for the DEGSELF native shell.
--
-- The native app (a WebView around degself.com) obtains an Expo push token per
-- device and registers it here via /api/mobile/push/register. A token is a
-- capability to notify a device, so this table is service-role only (deny-all
-- RLS): the register endpoint writes with the service key, and only server code
-- (admin send flows) reads it. It must never be anon/authenticated readable or
-- writable through the publishable key.

create table if not exists public.push_tokens (
  token text primary key,
  platform text not null check (platform in ('ios', 'android', 'web')),
  -- Optional owner: set once we tie a device to a signed-in user (phase 2b).
  -- ON DELETE SET NULL so deleting a user account keeps the device row (it just
  -- becomes anonymous) rather than cascading away a still-valid device token.
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Set when Expo reports the token as DeviceNotRegistered so we stop sending to
  -- it; NULL means active.
  disabled_at timestamptz
);

create index if not exists push_tokens_user_id_idx
  on public.push_tokens (user_id) where user_id is not null;
create index if not exists push_tokens_active_idx
  on public.push_tokens (platform) where disabled_at is null;

alter table public.push_tokens enable row level security;
-- Deny-all: no policies. Only the service role (which bypasses RLS) reads/writes.
revoke all on public.push_tokens from anon, authenticated;

comment on table public.push_tokens is
  'Expo push tokens for the native shell. Service-role only (deny-all RLS): a token grants the ability to notify a device, so it must never be anon-readable/writable. Written by /api/mobile/push/register.';
