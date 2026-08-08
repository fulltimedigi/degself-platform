-- Reserve the garage offer link before calling the external WhatsApp provider.
-- The token alone is NOT active outreach. It becomes resolvable only after the
-- queue row is marked sent, then quote_workshop_outreach is materialized using
-- the provider-confirmed sent_at timestamp.

alter table public.quote_delivery_queue
  add column if not exists delivery_token text;

update public.quote_delivery_queue
set delivery_token = replace(gen_random_uuid()::text, '-', '')
where delivery_token is null;

alter table public.quote_delivery_queue
  alter column delivery_token set default replace(gen_random_uuid()::text, '-', ''),
  alter column delivery_token set not null;

create unique index if not exists quote_delivery_queue_delivery_token_key
  on public.quote_delivery_queue (delivery_token);

comment on column public.quote_delivery_queue.delivery_token is
  'Reserved capability token for the garage offer URL; not valid until provider delivery succeeds.';
