-- Manual public-profile overrides for network workshops.
-- Base directory rows remain the canonical catalog identity, while these values
-- lock fields that DEGSELF intentionally curated so later bulk refreshes cannot
-- silently overwrite partner-page edits.

create table if not exists public.workshop_profile_overrides (
  place_id text primary key references public.workshops(place_id) on delete cascade,
  name text,
  phone text,
  phone_intl text,
  website text,
  address text,
  area text,
  reviewed_specialty text,
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

create or replace function public.preserve_workshop_profile_overrides()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.workshop_profile_overrides%rowtype;
begin
  select * into o
  from public.workshop_profile_overrides
  where place_id = new.place_id;

  if found then
    if o.name is not null then new.name := o.name; end if;
    if o.phone is not null then new.phone := o.phone; end if;
    if o.phone_intl is not null then new.phone_intl := o.phone_intl; end if;
    if o.website is not null then new.website := o.website; end if;
    if o.address is not null then new.address := o.address; end if;
    if o.area is not null then new.area := o.area; end if;
    if o.reviewed_specialty is not null then new.reviewed_specialty := o.reviewed_specialty; end if;
    if o.hero_image_url is not null then new.main_image := o.hero_image_url; end if;
  end if;

  return new;
end;
$$;

drop trigger if exists preserve_workshop_profile_overrides_trigger on public.workshops;
create trigger preserve_workshop_profile_overrides_trigger
before update on public.workshops
for each row execute function public.preserve_workshop_profile_overrides();

comment on table public.workshop_profile_overrides is
  'Manual DEGSELF-curated overrides for network workshop public profiles; writes are server-admin only.';
