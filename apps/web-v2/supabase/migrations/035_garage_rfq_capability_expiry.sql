-- P0: expire per-workshop garage RFQ capability links.
-- Existing rows are grandfathered with a 48h window from migration time; every
-- resend/refresh extends the capability by another 48h. Public routes must reject
-- expired capabilities server-side.

alter table public.quote_workshop_outreach
  add column if not exists expires_at timestamptz;

update public.quote_workshop_outreach
   set expires_at = now() + interval '48 hours'
 where expires_at is null;

alter table public.quote_workshop_outreach
  alter column expires_at set default (now() + interval '48 hours'),
  alter column expires_at set not null;

create index if not exists quote_workshop_outreach_expires_idx
  on public.quote_workshop_outreach (expires_at);

alter table public.quote_workshop_outreach
  drop constraint if exists quote_workshop_outreach_expiry_after_outreach;

alter table public.quote_workshop_outreach
  add constraint quote_workshop_outreach_expiry_after_outreach
  check (expires_at > first_outreach_at);
