-- Quote settlement / completion-verification layer (Phase A — data + auto-confirm).
--
-- Records, per accepted offer, whether the offline repair actually happened, so
-- the platform can confirm completion through neutral signals (the customer +
-- objective events) instead of trusting the garage's self-report. This table is
-- backend-only: RLS enabled, NO public policies, and direct Data API privileges
-- revoked from anon/authenticated — only the service role (server routes) touches
-- it. Nothing here bills or sends messages; that is gated in application code
-- behind SETTLEMENT_ENABLED (+ WHATSAPP_ENABLED) feature flags.
--
-- NOT YET APPLIED to production — this migration file is written for review and
-- is applied manually by the owner.

create table if not exists public.quote_settlements (
  id                     uuid primary key default gen_random_uuid(),
  quote_id               uuid not null references public.quotes(id) on delete cascade,
  offer_id               uuid not null references public.quote_offers(id) on delete cascade,
  -- Canonical workshop the accepted offer belongs to (nullable: legacy/admin offers).
  workshop_id            text references public.workshops(place_id) on delete set null,

  accepted_at            timestamptz not null,
  -- accepted_at + auto-confirm window. Silence past this ⇒ presumed completed.
  auto_confirm_after     timestamptz not null,

  -- wamids of the outbound confirmation / rating-request messages, so an inbound
  -- reply resolves by context.id back to THIS settlement (not "latest for phone").
  confirm_wamid          text,
  rating_wamid           text,
  -- Set once a verified review has been recorded for this settlement (Phase B),
  -- so we never solicit or create a second review for the same job.
  review_id              uuid,

  status                 text not null default 'pending_settlement'
                           check (status in (
                             'pending_settlement',
                             'completed_confirmed',
                             'no_show',
                             'disputed'
                           )),
  -- How the terminal state was reached (the customer is the neutral arbiter).
  completion_source      text
                           check (completion_source in ('customer','auto','admin','garage')),

  -- Neutral primary signal: the customer's own confirmation.
  customer_confirmed     boolean,
  customer_confirmed_at  timestamptz,
  customer_reported_amount_kwd numeric(8,3)
                           check (customer_reported_amount_kwd is null
                                  or customer_reported_amount_kwd >= 0),

  -- Interested-party signal (compared, never trusted over the customer).
  garage_report          text
                           check (garage_report in ('completed','not_completed','no_response')),
  garage_reported_at     timestamptz,

  -- Billing is decoupled from this layer; these only record intent for later phases.
  billable_event         text not null default 'none'
                           check (billable_event in ('none','offer_accepted','completion_confirmed')),
  billing_state          text not null default 'not_billable'
                           check (billing_state in ('not_billable','billable','invoiced','paid','waived')),

  anomaly_score          integer not null default 0 check (anomaly_score >= 0),
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- One settlement per accepted offer.
  unique (quote_id, offer_id),
  check (auto_confirm_after >= accepted_at),
  check (customer_confirmed_at is null or customer_confirmed_at >= accepted_at),
  check (garage_reported_at is null or garage_reported_at >= accepted_at)
);

-- The auto-confirm sweeper selects pending rows whose window has elapsed.
create index if not exists quote_settlements_due_idx
  on public.quote_settlements (auto_confirm_after)
  where status = 'pending_settlement';

create index if not exists quote_settlements_quote_idx
  on public.quote_settlements (quote_id);

-- Resolve an inbound reply by the message it replies to (context.id).
create index if not exists quote_settlements_confirm_wamid_idx
  on public.quote_settlements (confirm_wamid)
  where confirm_wamid is not null;
create index if not exists quote_settlements_rating_wamid_idx
  on public.quote_settlements (rating_wamid)
  where rating_wamid is not null;

-- Per-garage completion/anomaly analytics.
create index if not exists quote_settlements_workshop_idx
  on public.quote_settlements (workshop_id, status)
  where workshop_id is not null;

-- Backend-only: deny-all for anon/authenticated (RLS enabled + no policies), and
-- revoke direct Data API grants. Service role bypasses RLS for server routes.
alter table public.quote_settlements enable row level security;
revoke all on table public.quote_settlements from anon, authenticated;
grant all on table public.quote_settlements to service_role;
