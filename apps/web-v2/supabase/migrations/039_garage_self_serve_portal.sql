-- Garage self-serve RFQ opt-in portal.
--
-- Goal: turn the passive directory into a LIVE RFQ network. Each garage gets its
-- OWN page behind a unique, unguessable magic link that we send to its WhatsApp.
-- Opening the page lets the garage confirm its details and, with one tap, become
-- a partner that receives price-quote (RFQ) requests. This partner base is the
-- platform's core sellable asset, and today it is empty (0 partners).
--
-- Design:
--   * portal_token — persistent, per-garage 160-bit capability. Because the link
--     is delivered to the garage's OWN WhatsApp number, possession of the token
--     plus the tap is treated as operational verification of that destination.
--   * self_description / self_edited_at — garage-authored blurb + audit stamp.
--   * rfq_opt_in_source gains 'self_serve'.
--   * workshop_edit_log — append-only audit of every self-serve action, so a
--     leaked single link is fully traceable and reversible.
--
-- Blast radius of a leaked link is ONE garage (its own row) and every write is
-- logged, so the capability-URL model is appropriate here.

create extension if not exists pgcrypto;

alter table public.workshops
  add column if not exists portal_token text,
  add column if not exists self_description text,
  add column if not exists self_edited_at timestamptz;

-- Backfill a stable token for every existing row, then lock in a default so new
-- rows get one automatically. 20 bytes = 40 hex chars ≈ 160-bit, unguessable.
-- portal_token is not covered by any BEFORE UPDATE trigger, so this backfill does
-- not touch updated_at or rebuild search_text.
update public.workshops
  set portal_token = encode(gen_random_bytes(20), 'hex')
  where portal_token is null;

alter table public.workshops
  alter column portal_token set default encode(gen_random_bytes(20), 'hex');

-- gen_random_bytes has negligible collision odds at 160-bit, but the unique index
-- turns any collision into a hard failure rather than a silent cross-garage link.
create unique index if not exists workshops_portal_token_key
  on public.workshops (portal_token);

-- Extend the opt-in source audit vocabulary with the new self-serve channel.
alter table public.workshops
  drop constraint if exists workshops_rfq_opt_in_source_check;
alter table public.workshops
  add constraint workshops_rfq_opt_in_source_check
  check (
    rfq_opt_in_source is null
    or rfq_opt_in_source in ('whatsapp', 'written', 'verbal', 'other', 'self_serve')
  );

comment on column public.workshops.portal_token is
  'Per-garage capability token for the self-serve portal (/كراجي/<token>). Sent to the garage''s own WhatsApp; the tap is treated as WhatsApp-destination verification.';
comment on column public.workshops.self_description is
  'Short garage-authored description shown on its public page (set via the self-serve portal).';
comment on column public.workshops.self_edited_at is
  'Last time the garage edited its own page via the self-serve portal.';

-- Append-only audit of every self-serve portal action (opt-in, edit, opt-out).
create table if not exists public.workshop_edit_log (
  id bigint generated always as identity primary key,
  place_id text not null references public.workshops(place_id) on delete cascade,
  action text not null check (action in ('opt_in', 'edit', 'opt_out')),
  changes jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists workshop_edit_log_place_id_idx
  on public.workshop_edit_log (place_id, created_at desc);

alter table public.workshop_edit_log enable row level security;
-- Deny-all: no anon/authenticated access. Only the service role (which bypasses
-- RLS) reads/writes this from server routes. No policies are created on purpose.
revoke all on public.workshop_edit_log from anon, authenticated;

comment on table public.workshop_edit_log is
  'Append-only audit trail of garage self-serve portal actions (opt-in, profile edits). Service-role only.';
