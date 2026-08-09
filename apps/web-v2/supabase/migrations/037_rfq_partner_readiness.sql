-- Explicit opt-in/readiness gate for automated RFQ delivery.
-- Existing partners are deliberately NOT auto-enabled.

alter table public.workshops
  add column if not exists rfq_dispatch_enabled boolean not null default false,
  add column if not exists rfq_opt_in_at timestamptz,
  add column if not exists rfq_opt_in_source text,
  add column if not exists rfq_phone_verified_at timestamptz;

alter table public.workshops
  drop constraint if exists workshops_rfq_opt_in_source_check;
alter table public.workshops
  add constraint workshops_rfq_opt_in_source_check
  check (
    rfq_opt_in_source is null
    or rfq_opt_in_source in ('whatsapp', 'written', 'verbal', 'other')
  );

alter table public.workshops
  drop constraint if exists workshops_rfq_dispatch_prerequisites_check;
alter table public.workshops
  add constraint workshops_rfq_dispatch_prerequisites_check
  check (
    rfq_dispatch_enabled = false
    or (
      is_partner = true
      and rfq_opt_in_at is not null
      and rfq_phone_verified_at is not null
    )
  );

create index if not exists workshops_rfq_dispatch_ready_idx
  on public.workshops (partner_priority desc, reviewed_specialty, area)
  where is_partner = true
    and rfq_dispatch_enabled = true
    and active = true
    and permanently_closed = false
    and is_automotive = true
    and out_of_scope = false;

comment on column public.workshops.rfq_dispatch_enabled is
  'Explicit kill-switch per partner. Automated RFQ routing may select this workshop only when true.';
comment on column public.workshops.rfq_opt_in_at is
  'When DEGSELF recorded the partner consent to receive automated RFQ WhatsApp messages.';
comment on column public.workshops.rfq_opt_in_source is
  'Audit source for RFQ WhatsApp consent: whatsapp, written, verbal, or other.';
comment on column public.workshops.rfq_phone_verified_at is
  'When the partner WhatsApp destination was operationally verified by DEGSELF.';
