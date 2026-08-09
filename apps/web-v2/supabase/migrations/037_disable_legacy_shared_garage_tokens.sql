-- P0: no garage-facing shared quote capability remains valid.
-- We have not launched external garage outreach yet, so invalidate test/legacy
-- quote-level tokens before production WABA activation.

update public.quotes
   set garage_token = null,
       updated_at = now()
 where garage_token is not null;

comment on column public.quotes.garage_token is
  'Deprecated P0: shared garage tokens are disabled. Use quote_workshop_outreach per-workshop capabilities.';
