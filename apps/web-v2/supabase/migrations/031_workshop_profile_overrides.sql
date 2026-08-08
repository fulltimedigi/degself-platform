-- Manual public-profile overrides for network workshops.
-- Base directory data remains in public.workshops; these fields take precedence
-- when present so future catalog refreshes cannot erase curated partner data.

create table if not exists public.workshop_profile_overrides (
  place_id text primary key references public.workshops(place_id) on delete cascade,
  name text,
  phone text,
  phone_intl text,
  website text,
  address text,
  area text,
  reviewed_specialty text,
  description text,
  hero_image_url text,
  gallery_image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workshop_profile_overrides enable row level security;

grant select on public.workshop_profile_overrides to anon, authenticated;
revoke insert, update, delete on public.workshop_profile_overrides from anon, authenticated;

create policy "public workshop profile overrides are readable"
  on public.workshop_profile_overrides
  for select
  to anon, authenticated
  using (true);

comment on table public.workshop_profile_overrides is
  'Manual DEGSELF-curated overrides for network workshop public profiles; writes are server-admin only.';
