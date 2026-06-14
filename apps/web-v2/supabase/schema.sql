-- degself v2 — full database schema
-- Run in Supabase SQL Editor (Mumbai project).
-- Sections are ordered to avoid forward references (e.g. admins before workshops RLS).
-- Based on docs/v2/SUPABASE_SETUP.md, with the workshops table EXTENDED to keep all 25
-- data fields from webapp/client/public/data/workshops.json.

-- =========================================================
-- 1. Extensions
-- =========================================================
create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists "uuid-ossp";

-- =========================================================
-- 2. profiles (extends Supabase auth.users)
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone_e164 text unique,            -- +965XXXXXXXX
  phone_verified_at timestamptz,
  avatar_url text,
  contributions_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles viewable by everyone"
  on public.profiles for select using (true);

create policy "users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create a profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, phone_e164)
  values (new.id, new.phone);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- 3. admins (created BEFORE workshops — its RLS references this table)
-- =========================================================
create table public.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'moderator',   -- 'moderator' / 'owner'
  added_at timestamptz default now()
);

alter table public.admins enable row level security;

create policy "admins viewable by everyone"
  on public.admins for select using (true);

-- =========================================================
-- 4. workshops (EXTENDED — all 25 data fields + v2 platform fields)
--    place_id is case-sensitive — NEVER lowercase it.
-- =========================================================
create table public.workshops (
  place_id text primary key,                    -- ⚠️ case-sensitive (Google Place ID)

  -- core identity
  name text not null,
  specialty text not null,                      -- كراج / ميكانيكا / بودي وصبغ / ...
  entity_type text not null,                    -- كراج / مركز / محل / خدمة / وكيل / ...
  service_mode text not null default 'fixed',   -- fixed / mobile / tow (tow = سطحة)
  category_raw text,                            -- raw Google category
  specialty_hints text[] default '{}',          -- secondary specialties

  -- location
  area text,
  governorate text,
  address text,
  street text,
  lat double precision,                         -- from JSON `latitude`
  lng double precision,                         -- from JSON `longitude`

  -- contact
  phone text,                                   -- raw, e.g. 9651822500
  phone_intl text,                              -- formatted, e.g. +965 1822 500
  website text,

  -- Google signals
  google_rating numeric(2,1),                   -- from JSON `rating` (0.0-5.0)
  google_reviews_count int,                     -- from JSON `reviews_count`

  -- media / meta
  opening_hours text,                           -- pipe-separated AR string
  images_count int,
  main_image text,
  payments text,
  emergency_service boolean default false,
  permanently_closed boolean default false,
  active boolean default true,

  -- v2 platform fields (computed / filled later)
  is_claimed boolean default false,
  claimed_by uuid references public.profiles(id),
  internal_rating_avg numeric(3,2),
  internal_reviews_count int default 0,
  fb_mentions_count int default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index workshops_area_idx on public.workshops(area);
create index workshops_specialty_idx on public.workshops(specialty);
create index workshops_service_mode_idx on public.workshops(service_mode);
create index workshops_location_idx on public.workshops(lat, lng);
create index workshops_name_trgm_idx on public.workshops using gin (name gin_trgm_ops);

alter table public.workshops enable row level security;

create policy "workshops viewable by everyone"
  on public.workshops for select using (true);

create policy "only admins can modify workshops"
  on public.workshops for all using (
    exists (select 1 from public.admins where user_id = auth.uid())
  );

-- =========================================================
-- 5. reviews (Phase 2 — schema ready, UI later)
-- =========================================================
-- Anonymous + manually-moderated reviews (canonical def in migration 005_reviews.sql).
-- Replaced the original auth-based design (which required a registered user_id);
-- the chosen model needs no login — submissions are 'pending' until approved, and
-- aggregate rating is computed in-app (no trigger needed).
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  place_id    text not null,
  rating      smallint not null check (rating between 1 and 5),
  author_name text check (author_name is null or char_length(author_name) <= 60),
  body        text not null check (char_length(btrim(body)) between 3 and 1000),
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now(),
  approved_at timestamptz
);

create index reviews_place_approved_idx on public.reviews (place_id) where status = 'approved';
create index reviews_status_created_idx on public.reviews (status, created_at desc);

alter table public.reviews enable row level security;

-- Public (anon) reads ONLY approved reviews; writes go through the server (service role).
create policy "reviews_read_approved"
  on public.reviews for select to anon, authenticated
  using (status = 'approved');

-- =========================================================
-- 6. community_mentions (Phase 3 — FB groups, aggregate only)
-- =========================================================
create table public.community_mentions (
  id uuid primary key default uuid_generate_v4(),
  workshop_id text not null references public.workshops(place_id) on delete cascade,
  source text not null,                 -- 'facebook' / 'reddit' / 'q8car' / 'twitter'
  source_label text,                    -- display only, no link
  matched_at timestamptz default now(),
  matched_by uuid references public.profiles(id),
  confidence numeric(3,2),
  -- ⛔ never store: original comment text, commenter name, post link
  unique (workshop_id, source)
);

create index mentions_workshop_idx on public.community_mentions(workshop_id);

create or replace function public.update_mentions_count()
returns trigger as $$
begin
  update public.workshops
  set fb_mentions_count = (
    select count(*) from public.community_mentions
    where workshop_id = coalesce(new.workshop_id, old.workshop_id)
  )
  where place_id = coalesce(new.workshop_id, old.workshop_id);
  return new;
end;
$$ language plpgsql;

create trigger mentions_count_trigger
  after insert or delete on public.community_mentions
  for each row execute function public.update_mentions_count();

alter table public.community_mentions enable row level security;
create policy "mentions viewable by everyone"
  on public.community_mentions for select using (true);

-- =========================================================
-- 7. Storage bucket for review photos
-- =========================================================
insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

create policy "users upload own review photos"
  on storage.objects for insert
  with check (bucket_id = 'review-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "review photos publicly viewable"
  on storage.objects for select
  using (bucket_id = 'review-photos');
