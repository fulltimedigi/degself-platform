-- Partner / network garages (~50) used by the concierge chatbot for quote routing.
-- Directory search still shows all workshops; Asaali + auto-match prefer partners.

alter table public.workshops
  add column if not exists is_partner boolean not null default false;

alter table public.workshops
  add column if not exists partner_priority integer not null default 0;

alter table public.workshops
  add column if not exists partner_notes text;

create index if not exists workshops_is_partner_idx
  on public.workshops (is_partner)
  where is_partner = true;

create index if not exists workshops_partner_priority_idx
  on public.workshops (partner_priority desc)
  where is_partner = true;

comment on column public.workshops.is_partner is
  'Network partner — eligible for concierge chatbot / quote auto-routing';
comment on column public.workshops.partner_priority is
  'Higher = preferred when matching partners (0 = default)';
