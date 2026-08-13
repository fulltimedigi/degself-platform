-- Phase B: tie a review to a real completed booking (verified-transaction review).
--
-- A review created from the post-service confirmation is linked to the quote +
-- settlement it came from and flagged `verified`. This is the marketplace analogue
-- of a "verified purchase" badge and the strongest anti-fake control: a review can
-- only exist for a completed job of a real customer, one per job. It also enables
-- a garage right-of-reply. Public read stays limited to approved reviews (RLS
-- unchanged); the app selects only display columns.
--
-- NOT YET APPLIED to production — written for review, applied manually.

alter table public.reviews
  add column if not exists quote_id       uuid references public.quotes(id) on delete set null,
  add column if not exists settlement_id  uuid references public.quote_settlements(id) on delete set null,
  add column if not exists verified       boolean not null default false,
  add column if not exists source         text
                             check (source in ('public_form','whatsapp_flow')),
  add column if not exists garage_reply   text
                             check (garage_reply is null or char_length(garage_reply) <= 1000),
  add column if not exists garage_reply_at timestamptz;

-- Allow a rating-only verified review (no written comment). The existing CHECK
-- `char_length(btrim(body)) between 3 and 1000` is satisfied by NULL (a CHECK only
-- fails on FALSE), so dropping NOT NULL is sufficient and safe for existing rows.
alter table public.reviews alter column body drop not null;

-- Exactly one review per completed job.
create unique index if not exists reviews_quote_verified_key
  on public.reviews (quote_id)
  where quote_id is not null;

create index if not exists reviews_settlement_idx
  on public.reviews (settlement_id)
  where settlement_id is not null;
