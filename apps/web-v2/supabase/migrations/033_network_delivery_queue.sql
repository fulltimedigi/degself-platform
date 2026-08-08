-- Deterministic network routing targets and delivery state for quote automation.
-- Selecting a workshop is NOT equivalent to contacting it. A row in this queue
-- records an intended delivery target; quote_workshop_outreach is created only
-- after a delivery provider confirms the send succeeded.

create table if not exists public.quote_delivery_queue (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  workshop_id text not null references public.workshops(place_id) on delete restrict,
  channel text not null default 'whatsapp' check (channel in ('whatsapp','manual')),
  status text not null default 'queued'
    check (status in ('queued','sending','sent','failed','blocked_no_channel','cancelled')),
  target_rank integer not null check (target_rank >= 1),
  selection_score integer not null default 0,
  selection_reason text not null,
  attempts integer not null default 0 check (attempts >= 0),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  outreach_id uuid references public.quote_workshop_outreach(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, workshop_id)
);

create index if not exists quote_delivery_queue_status_idx
  on public.quote_delivery_queue (status, created_at);
create index if not exists quote_delivery_queue_quote_idx
  on public.quote_delivery_queue (quote_id, target_rank);
create index if not exists quote_delivery_queue_workshop_idx
  on public.quote_delivery_queue (workshop_id, created_at desc);

alter table public.quote_delivery_queue enable row level security;
revoke all on table public.quote_delivery_queue from anon, authenticated;

comment on table public.quote_delivery_queue is
  'Backend-only intended quote deliveries. A successful provider send must create/link measured outreach before status becomes sent.';
