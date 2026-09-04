-- Dedicated Google-Maps location link for a garage, editable from the admin
-- profile editor. Previously admins had no location field at all — the map on
-- the public page depended solely on lat/lng from catalog enrichment, so a
-- missing or wrong pin could not be fixed. map_url is a public field (a maps
-- link shown on the page), so it lives on the anon-readable workshops table.

alter table public.workshops
  add column if not exists map_url text;
alter table public.workshop_profile_overrides
  add column if not exists map_url text;

comment on column public.workshops.map_url is
  'Optional Google Maps link for the garage location (admin-editable). Powers the directions button on the public garage page.';

-- Extend the profile-override preserve trigger so an admin-set map_url survives
-- later bulk catalog refreshes, exactly like the other curated fields.
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
    if o.map_url is not null then new.map_url := o.map_url; end if;
  end if;

  return new;
end;
$$;

-- Trigger-only helper: never expose this SECURITY DEFINER function as a public RPC.
revoke execute on function public.preserve_workshop_profile_overrides() from public, anon, authenticated;
