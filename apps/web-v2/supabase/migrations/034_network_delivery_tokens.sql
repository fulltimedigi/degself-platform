-- Reserve the garage offer link before calling the external WhatsApp provider.
-- The token alone is NOT active outreach. It becomes resolvable only after the
-- queue row is marked sent, then quote_workshop_outreach is materialized using
-- the provider-confirmed sent_at timestamp.

alter table public.quote_delivery_queue
  add column if not exists delivery_token text,
  add column if not exists provider_status text,
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz,
  add column if not exists failed_at timestamptz;

update public.quote_delivery_queue
set delivery_token = replace(gen_random_uuid()::text, '-', '')
where delivery_token is null;

alter table public.quote_delivery_queue
  alter column delivery_token set default replace(gen_random_uuid()::text, '-', ''),
  alter column delivery_token set not null;

create unique index if not exists quote_delivery_queue_delivery_token_key
  on public.quote_delivery_queue (delivery_token);
create index if not exists quote_delivery_queue_provider_message_idx
  on public.quote_delivery_queue (provider_message_id)
  where provider_message_id is not null;

comment on column public.quote_delivery_queue.delivery_token is
  'Reserved capability token for the garage offer URL; not valid until provider send succeeds.';
comment on column public.quote_delivery_queue.provider_status is
  'Latest Meta delivery receipt status such as sent, delivered, read, or failed.';
