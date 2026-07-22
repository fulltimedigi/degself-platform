-- Unified offer system — structured quote offers.
-- Extends public.quote_offers (created in 015) with the structured pricing,
-- parts, validity and warranty fields from the "نظام العرض الموحد" spec (v1.1).
--
-- NOT a parallel table: this migration ONLY adds columns + CHECK constraints to
-- the existing quote_offers table. Every legacy row keeps working as a plain
-- fixed-price offer (pricing_type defaults to 'fixed', all new fields NULL).
--
-- NOTE: apply AFTER PR review — do not run against prod as part of the PR.

-- 1) Pricing type — the garage picks ONE of three ------------------------------
-- Default 'fixed' so every existing row is a valid fixed-price offer.
alter table public.quote_offers
  add column if not exists pricing_type text not null default 'fixed';

alter table public.quote_offers drop constraint if exists quote_offers_pricing_type_check;
alter table public.quote_offers
  add constraint quote_offers_pricing_type_check
  check (pricing_type in ('fixed', 'range', 'conditional'));

-- price_kwd semantics by type (column already exists from 015):
--   fixed       → the price
--   range       → the LOWER bound (upper bound lives in price_max_kwd)
--   conditional → the single price (no range allowed on a conditional offer)

-- 2) Range upper bound ---------------------------------------------------------
alter table public.quote_offers
  add column if not exists price_max_kwd numeric;

-- 3) Conditional-offer fields --------------------------------------------------
-- assumed_diagnosis: "بناءً على شرح العميل، الأقرب إن المشكلة: ___"
-- inspection_fee_kwd: declared up-front, 0 = free (مجاني). Never a surprise.
alter table public.quote_offers
  add column if not exists assumed_diagnosis text;
alter table public.quote_offers
  add column if not exists inspection_fee_kwd numeric;

-- 4) Parts type — the single biggest driver of price differences ---------------
-- Nullable so legacy rows survive; required for NEW offers server-side.
alter table public.quote_offers
  add column if not exists parts_type text;

alter table public.quote_offers drop constraint if exists quote_offers_parts_type_check;
alter table public.quote_offers
  add constraint quote_offers_parts_type_check
  check (
    parts_type is null
    or parts_type in ('original', 'commercial_a', 'commercial', 'used', 'labor_only')
  );

-- 5) Offer validity + warranty -------------------------------------------------
-- validity_days: how long the offer stays live (created_at + validity_days).
alter table public.quote_offers
  add column if not exists validity_days integer not null default 3;
alter table public.quote_offers
  add column if not exists warranty_days integer;
alter table public.quote_offers
  add column if not exists warranty_note text;

alter table public.quote_offers drop constraint if exists quote_offers_validity_days_check;
alter table public.quote_offers
  add constraint quote_offers_validity_days_check
  check (validity_days >= 1);

-- 6) Structural rules — enforced in the database itself ------------------------

-- Range rule: upper bound must be present, ≥ lower bound, and ≤ lower × 1.3.
-- The form rejects any wider range; the DB is the backstop.
alter table public.quote_offers drop constraint if exists quote_offers_range_rule_check;
alter table public.quote_offers
  add constraint quote_offers_range_rule_check
  check (
    pricing_type <> 'range'
    or (
      price_max_kwd is not null
      and price_max_kwd >= price_kwd
      and price_max_kwd <= price_kwd * 1.3
    )
  );

-- Conditional rule: a diagnosis is required, and the inspection fee must be
-- declared up-front (0 = free). No range is allowed on a conditional offer.
alter table public.quote_offers drop constraint if exists quote_offers_conditional_rule_check;
alter table public.quote_offers
  add constraint quote_offers_conditional_rule_check
  check (
    pricing_type <> 'conditional'
    or (
      assumed_diagnosis is not null
      and length(btrim(assumed_diagnosis)) > 0
      and inspection_fee_kwd is not null
      and inspection_fee_kwd >= 0
    )
  );

-- Warranty rule: network minimum is 7 days. NULL is allowed so legacy rows (no
-- warranty recorded) stay valid; new offers always carry a warranty (API-enforced).
alter table public.quote_offers drop constraint if exists quote_offers_warranty_min_check;
alter table public.quote_offers
  add constraint quote_offers_warranty_min_check
  check (warranty_days is null or warranty_days >= 7);
