-- Cover the remaining foreign-key access paths reported by the Supabase
-- performance advisor. Both tables are currently tiny, so regular transactional
-- index creation is fast and keeps this migration compatible with db push.
create index if not exists user_favorites_place_id_idx
  on public.user_favorites (place_id);

create index if not exists quote_delivery_queue_outreach_idx
  on public.quote_delivery_queue (outreach_id)
  where outreach_id is not null;
