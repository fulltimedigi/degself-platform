-- Visitor reviews (no auth). Anonymous submissions land as 'pending' and are
-- published only after manual approval (set status='approved' in the Supabase
-- Table Editor, or via the moderation endpoint). RLS lets the public read ONLY
-- approved reviews; all writes go through our server (service role), never the
-- browser directly.

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  place_id    text not null,
  rating      smallint not null check (rating between 1 and 5),
  author_name text check (author_name is null or char_length(author_name) <= 60),
  body        text not null check (char_length(btrim(body)) between 3 and 1000),
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now(),
  approved_at timestamptz
);

-- fast lookups of approved reviews per workshop
create index if not exists reviews_place_approved_idx
  on public.reviews (place_id) where status = 'approved';
create index if not exists reviews_status_created_idx
  on public.reviews (status, created_at desc);

alter table public.reviews enable row level security;

-- Public (anon) may READ only approved reviews.
drop policy if exists "reviews_read_approved" on public.reviews;
create policy "reviews_read_approved" on public.reviews
  for select to anon, authenticated
  using (status = 'approved');

-- No anon INSERT/UPDATE/DELETE policies → the browser cannot write directly.
-- Our API uses the service-role key (bypasses RLS) to insert as 'pending' and to
-- moderate. The service role is never exposed to the client.
