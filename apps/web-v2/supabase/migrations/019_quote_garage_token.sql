-- Garage self-service offer submission.
-- Adds a public, token-gated link per quote that lets a workshop submit its own
-- structured offer (no login) instead of the founder typing it in the admin.
-- The founder forwards this link to garages over WhatsApp.
--
-- Mirrors the customer_token pattern (migration 015): nullable, minted on demand,
-- unique via a partial index so the many NULLs don't collide.

alter table public.quotes add column if not exists garage_token text;

create unique index if not exists quotes_garage_token_key
  on public.quotes (garage_token) where garage_token is not null;
