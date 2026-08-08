-- Flexible admin-curated sections for network workshop public profiles.
-- Stored as structured JSON so each garage can expose different factual fields
-- without adding a database column for every new label.

alter table public.workshop_profile_overrides
  add column if not exists custom_sections jsonb not null default '[]'::jsonb;

alter table public.workshop_profile_overrides
  drop constraint if exists workshop_profile_overrides_custom_sections_array;

alter table public.workshop_profile_overrides
  add constraint workshop_profile_overrides_custom_sections_array
  check (jsonb_typeof(custom_sections) = 'array');

comment on column public.workshop_profile_overrides.custom_sections is
  'Admin-curated public profile sections: [{title, items:[{label,value}]}].';
