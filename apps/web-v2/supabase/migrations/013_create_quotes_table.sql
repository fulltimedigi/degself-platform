-- RFQ quote requests (Phase 0). Car owners submit a request for quotes; there is
-- NO garage-facing surface yet — the founder routes each request to matched
-- garages manually over WhatsApp (concierge model). The table holds customer PII
-- (phone), so RLS is enabled with NO policies at all: anon/authenticated can
-- neither read nor write. All access is server-side via the service-role / secret
-- key (bypasses RLS), exactly like the reviews table. The browser never touches
-- this table directly.

create table if not exists public.quotes (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),     -- set by admin updates
  expires_at          timestamptz not null default (now() + interval '7 days'),

  -- customer PII — never exposed to garages
  customer_name       text not null,
  customer_phone      text not null,

  -- the request
  service             text not null,           -- a reviewed_specialty value, or 'غير محدد'
  car_make            text,
  car_model           text,
  car_year            text,                    -- free text, not int (allows "قديم"/blank)
  problem_description text not null,
  area                text,
  urgency             text not null default 'عادي'
                        check (urgency in ('عادي','مستعجل','طارئ')),
  photos              text[] not null default '{}',  -- optional URLs

  -- lifecycle (managed from /admin/quotes)
  status              text not null default 'new'
                        check (status in ('new','matched','quoted','won','lost')),
  matched_workshops   jsonb not null default '[]',   -- [{place_id,name,phone,quoted_price?}]
  admin_notes         text,

  -- entry point, for conversion measurement
  source              text not null default 'quote_bar'
                        check (source in ('quote_bar','translator'))
);

-- admin list: newest first per status; expiry filter for hiding dead requests
create index if not exists quotes_status_created_idx
  on public.quotes (status, created_at desc);
create index if not exists quotes_expires_idx
  on public.quotes (expires_at);

alter table public.quotes enable row level security;

-- No policies at all → anon/authenticated can neither read nor write. The API and
-- the /admin/quotes page use the service-role / secret key (bypasses RLS). Customer
-- PII (phone) stays strictly server-side.
