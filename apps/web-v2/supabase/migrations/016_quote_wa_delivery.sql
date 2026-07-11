-- Phase 2 (WABA, flag-gated): delivery-tracking columns for the automatic
-- WhatsApp offers message. All additive + nullable → zero effect on the existing
-- manual-forward flow. Populated only when WHATSAPP_ENABLED=true and Cloud API
-- actually sends; the webhook updates wa_status as Meta reports delivery.

alter table public.quotes add column if not exists offers_sent_at timestamptz;
alter table public.quotes add column if not exists wa_message_id  text; -- Meta wamid of the offers message
alter table public.quotes add column if not exists wa_status      text; -- sent | delivered | read | failed (free text — Meta may add states)

-- Webhook looks quotes up by the Meta message id on each status callback.
create index if not exists quotes_wa_message_id_idx
  on public.quotes (wa_message_id) where wa_message_id is not null;
