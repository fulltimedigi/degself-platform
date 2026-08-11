-- Align lifecycle flags that already exclude these rows from the public catalog.
update public.workshops
set
  active = false,
  removal_reason = coalesce(removal_reason, 'data-quality: non-automotive or out of scope'),
  removed_at = coalesce(removed_at, now()),
  updated_at = now()
where active is true
  and (is_automotive is false or out_of_scope is true);

-- Imported reference/phone digits were glued to a small number of area names.
update public.workshops
set
  area = regexp_replace(area, '^[0-9]{5,}[[:space:]]*', ''),
  updated_at = now()
where area ~ '^[0-9]{5,}[[:space:]]*[ء-يA-Za-z]';

-- Remove punctuation introduced by source address formatting, but only when
-- the area contains a real Arabic or Latin name (so numbered districts remain).
update public.workshops
set
  area = trim(regexp_replace(area, '[،,؛;:]+$', '', 'g')),
  updated_at = now()
where area ~ '[ء-يA-Za-z]'
  and area ~ '[،,؛;:]+$';
