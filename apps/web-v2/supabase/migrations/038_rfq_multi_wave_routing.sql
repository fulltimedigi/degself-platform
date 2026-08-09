-- Multi-wave private RFQ routing.
-- Wave 1 = precision, Wave 2 = recall, Wave 3 = partner-network safety net.
-- Delivery remains private 1:1; this migration does not enable WhatsApp.

alter table public.quote_delivery_queue
  add column if not exists routing_wave smallint not null default 1;

alter table public.quote_delivery_queue
  drop constraint if exists quote_delivery_queue_routing_wave_check;

alter table public.quote_delivery_queue
  add constraint quote_delivery_queue_routing_wave_check
  check (routing_wave between 1 and 3);

comment on column public.quote_delivery_queue.routing_wave is
  'Private RFQ expansion wave: 1 precision, 2 recall, 3 broad partner safety net.';

create index if not exists quote_delivery_queue_quote_wave_idx
  on public.quote_delivery_queue (quote_id, routing_wave, target_rank);

create index if not exists quote_delivery_queue_pending_wave_idx
  on public.quote_delivery_queue (status, routing_wave, created_at)
  where status = 'queued';

-- Preserve backend-only posture.
revoke all on table public.quote_delivery_queue from anon, authenticated;
