-- Per-workshop quote outreach attribution for trustworthy garage response metrics.
--
-- The legacy quotes.garage_token is one shared link per quote. It remains intact
-- for backwards compatibility, but cannot identify which workshop was contacted,
-- opened the request, or responded. New outreach records use one capability token
-- per quote + canonical workshop (workshops.place_id).
--
-- This table is backend-only: RLS enabled, no public policies, and direct Data API
-- privileges revoked from anon/authenticated. Server routes use the service role.

create table if not exists public.quote_workshop_outreach (
  id                 uuid primary key default gen_random_uuid(),
  quote_id           uuid not null references public.quotes(id) on delete cascade,
  workshop_id        text not null references public.workshops(place_id) on delete restrict,
  token              text not null unique,
  channel            text not null default 'whatsapp'
                       check (channel in ('whatsapp','manual')),
  first_outreach_at  timestamptz not null default now(),
  last_outreach_at   timestamptz not null default now(),
  outreach_count     integer not null default 1 check (outreach_count >= 1),
  first_opened_at    timestamptz,
  responded_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (quote_id, workshop_id),
  check (last_outreach_at >= first_outreach_at),
  check (first_opened_at is null or first_opened_at >= first_outreach_at),
  check (responded_at is null or responded_at >= first_outreach_at)
);

create index if not exists quote_workshop_outreach_quote_idx
  on public.quote_workshop_outreach (quote_id, first_outreach_at);
create index if not exists quote_workshop_outreach_workshop_idx
  on public.quote_workshop_outreach (workshop_id, first_outreach_at desc);
create index if not exists quote_workshop_outreach_response_idx
  on public.quote_workshop_outreach (responded_at)
  where responded_at is not null;

alter table public.quote_workshop_outreach enable row level security;
revoke all on table public.quote_workshop_outreach from anon, authenticated;

-- Tie a submitted offer to the exact outreach record. Legacy/admin-created offers
-- keep outreach_id NULL and continue working unchanged.
alter table public.quote_offers
  add column if not exists outreach_id uuid
  references public.quote_workshop_outreach(id) on delete set null;

create unique index if not exists quote_offers_outreach_id_key
  on public.quote_offers (outreach_id)
  where outreach_id is not null;

-- Mark response time transactionally with the offer insert. Keeping this in the DB
-- avoids a successful offer followed by a failed analytics/update request.
create or replace function public.mark_quote_workshop_outreach_responded()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.outreach_id is not null then
    update public.quote_workshop_outreach
       set responded_at = coalesce(responded_at, new.created_at),
           updated_at = now()
     where id = new.outreach_id
       and quote_id = new.quote_id;
  end if;
  return new;
end;
$$;

revoke all on function public.mark_quote_workshop_outreach_responded() from public, anon, authenticated;

drop trigger if exists quote_offer_marks_outreach_responded on public.quote_offers;
create trigger quote_offer_marks_outreach_responded
  after insert on public.quote_offers
  for each row
  when (new.outreach_id is not null)
  execute function public.mark_quote_workshop_outreach_responded();
