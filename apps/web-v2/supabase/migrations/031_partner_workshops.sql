-- Curated DEGSELF partner list.
--
-- Stores only the canonical workshop reference. All workshop identity/contact data
-- remains sourced from public.workshops so the partner list cannot drift from the
-- main catalog. Backend-only: admin/server routes use the service role.

create table if not exists public.partner_workshops (
  place_id    text primary key references public.workshops(place_id) on delete cascade,
  added_at    timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.partner_workshops enable row level security;
revoke all on table public.partner_workshops from anon, authenticated;
