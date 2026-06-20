-- User-submitted reports of missing workshops. Anonymous, server-side writes
-- only (service role bypasses RLS). Used to discover gaps in our directory.

create table if not exists public.workshop_reports (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(btrim(name)) between 2 and 200),
  area            text check (area is null or char_length(area) <= 120),
  governorate     text check (governorate is null or char_length(governorate) <= 60),
  specialty       text check (specialty is null or char_length(specialty) <= 60),
  phone           text check (phone is null or char_length(phone) <= 40),
  google_maps_url text check (google_maps_url is null or char_length(google_maps_url) <= 600),
  notes           text check (notes is null or char_length(notes) <= 1000),
  reporter_name   text check (reporter_name is null or char_length(reporter_name) <= 80),
  reporter_phone  text check (reporter_phone is null or char_length(reporter_phone) <= 40),
  source_page     text check (source_page is null or char_length(source_page) <= 300),
  status          text not null default 'pending' check (status in ('pending','reviewed','added','rejected','duplicate')),
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz
);

create index if not exists workshop_reports_status_created_idx
  on public.workshop_reports (status, created_at desc);

alter table public.workshop_reports enable row level security;

-- No anon policies: all writes go through the server using the service role.
-- No anon reads either — this is internal data.
