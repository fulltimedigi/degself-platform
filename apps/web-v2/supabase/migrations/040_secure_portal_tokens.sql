-- Move the per-garage portal capability token OFF the public `workshops` table.
--
-- workshops carries an anon SELECT policy (`using (true)`) and the public site
-- reads it through the anon/publishable key with `select('*')`. A token column
-- there is therefore readable by anyone holding the publishable key: they could
-- enumerate every garage's magic link and opt-in / edit on its behalf. The token
-- must be a service-role-only secret, so it lives in a deny-all side table joined
-- by place_id. self_description / self_edited_at stay on workshops on purpose —
-- those are public profile fields.

create extension if not exists pgcrypto;

create table if not exists public.garage_portal_tokens (
  place_id text primary key references public.workshops(place_id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(20), 'hex'),
  created_at timestamptz not null default now()
);

-- Preserve tokens already generated on workshops (none distributed yet, but keep
-- them stable), then fill any remaining rows via the column default.
insert into public.garage_portal_tokens (place_id, token)
select place_id, portal_token
from public.workshops
where portal_token is not null
on conflict (place_id) do nothing;

insert into public.garage_portal_tokens (place_id)
select place_id from public.workshops
on conflict (place_id) do nothing;

alter table public.garage_portal_tokens enable row level security;
-- Deny-all: no policies. Only the service role (which bypasses RLS) reads/writes.
revoke all on public.garage_portal_tokens from anon, authenticated;

comment on table public.garage_portal_tokens is
  'Per-garage self-serve portal capability tokens. Service-role only (deny-all RLS): a token grants opt-in/edit on one garage, so it must never be anon-readable.';

-- Remove the exposed column + its index from the anon-readable public table.
drop index if exists public.workshops_portal_token_key;
alter table public.workshops drop column if exists portal_token;
