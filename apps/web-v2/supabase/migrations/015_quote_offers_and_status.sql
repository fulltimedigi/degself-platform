-- Phase 1: quote offers tracking + expanded quote lifecycle.
-- Depends on 013_create_quotes_table.sql.
--
-- NOTE ON NUMBERING: the spec asked for `010_quote_offers_and_status.sql`, but
-- `010_curated_mechanics_rank_score.sql` already exists and 010 sorts BEFORE the
-- quotes table's own creation migration (013) — which this depends on. Named 015
-- to keep migration order correct. Applied via Supabase MCP (no local stack).

-- 1) Expand the quotes.status lifecycle -------------------------------------
-- Old CHECK allowed new/matched/quoted/won/lost. Map any legacy values to the
-- new vocabulary first, then swap the CHECK. (Current prod rows: all 'new'.)
update public.quotes set status = 'forwarded'   where status = 'matched';
update public.quotes set status = 'offers_sent' where status = 'quoted';
update public.quotes set status = 'accepted'    where status = 'won';
update public.quotes set status = 'declined'    where status = 'lost';

alter table public.quotes drop constraint if exists quotes_status_check;
alter table public.quotes alter column status set default 'new';
alter table public.quotes
  add constraint quotes_status_check
  check (status in ('new','forwarded','awaiting_offers','offers_sent','accepted','declined','expired'));

-- 2) Public customer token for the /offers/{token} page ---------------------
alter table public.quotes add column if not exists customer_token text;
-- Unique, but a partial index so the many NULLs (tokens are minted on demand at
-- send-offers time) don't collide with each other.
create unique index if not exists quotes_customer_token_key
  on public.quotes (customer_token) where customer_token is not null;

-- 3) Offers workshops send back for a quote ---------------------------------
create table if not exists public.quote_offers (
  id                 uuid primary key default gen_random_uuid(),
  quote_id           uuid not null references public.quotes(id) on delete cascade,
  workshop_name      text not null,               -- free text — founder types it
  workshop_phone     text,                        -- optional, for post-accept contact
  price_kwd          numeric not null,
  estimated_duration text,                        -- e.g. "3 أيام" / "أسبوع"
  notes              text,                        -- parts included, warranty, etc.
  status             text not null default 'pending'
                       check (status in ('pending','accepted','rejected')),
  created_at         timestamptz not null default now(),
  accepted_at        timestamptz
);

create index if not exists quote_offers_quote_id_idx on public.quote_offers (quote_id);

-- Same PII posture as quotes: RLS on, NO policies → server-only (service key).
-- Offers reach customers ONLY through the token-gated /offers page, which reads
-- them via the service role, never the anon client.
alter table public.quote_offers enable row level security;
