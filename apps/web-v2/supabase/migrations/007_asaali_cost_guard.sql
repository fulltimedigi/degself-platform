-- ============================================================
-- Asaali (/asaali) — Cost Guard Migrations
-- Project: degself.com voice translator V2
-- Date: 2026-06-22
--
-- يحتوي على:
--   1. جدول asaali_usage    — لتتبع التكلفة الشهرية
--   2. جدول asaali_cache    — كاش الردود لمدة أسبوع
--   3. جدول asaali_rate_limit — تتبع المعدل لكل IP/ساعة
--   4. Indexes للأداء
--   5. RLS policies (Row Level Security)
--   6. Helper functions (اختياري)
--
-- التنفيذ: Supabase Dashboard → SQL Editor → الصق وشغّل
-- ============================================================


-- ============================================================
-- 1) جدول استهلاك التكلفة (asaali_usage)
-- ============================================================
-- يسجّل كل استدعاء لـ OpenAI مع تكلفته بالدولار
-- يُستخدم في isWithinBudget() لحساب المصروف الشهري

create table if not exists public.asaali_usage (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  ip_hash       text,                       -- sha256(ip) — مش الـ IP خام
  model         text not null,              -- 'gpt-4o-mini' | 'whisper-1'
  input_tokens  integer default 0,
  output_tokens integer default 0,
  audio_seconds numeric(10,2) default 0,    -- لـ Whisper
  cost_usd      numeric(10,6) not null,     -- التكلفة المحسوبة
  endpoint      text,                       -- 'chat' | 'transcribe'
  cache_hit     boolean default false,
  meta          jsonb                       -- أي بيانات إضافية
);

comment on table  public.asaali_usage           is 'سجل تكاليف OpenAI لميزة /asaali — يستخدمه cost guard';
comment on column public.asaali_usage.ip_hash   is 'sha256 hash لعنوان IP — لا نخزن الـ IP خام';
comment on column public.asaali_usage.cost_usd  is 'التكلفة بالدولار لهذا الاستدعاء';

-- index على created_at للاستعلام الشهري السريع
create index if not exists idx_asaali_usage_created_at
  on public.asaali_usage (created_at desc);

-- index على ip_hash + created_at لاحتساب rate limit إن لزم
create index if not exists idx_asaali_usage_ip_time
  on public.asaali_usage (ip_hash, created_at desc);


-- ============================================================
-- 2) جدول الكاش (asaali_cache)
-- ============================================================
-- يخزن ردود LLM بناءً على hash النص المُطبَّع
-- TTL = 7 أيام (يُحذف بـ cleanup function أو cron)

create table if not exists public.asaali_cache (
  query_hash    text primary key,           -- sha256(normalized_text)
  query_text    text,                       -- النص الأصلي للمراجعة
  response_json jsonb not null,             -- رد LLM المنظَّم (Zod schema)
  hits          integer default 0,          -- عدد مرات الاستخدام
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  last_hit_at   timestamptz
);

comment on table  public.asaali_cache               is 'كاش ردود /asaali — يوفّر ~30-50% من استدعاءات OpenAI';
comment on column public.asaali_cache.query_hash    is 'sha256 من النص بعد التطبيع (lib/normalize.ts)';
comment on column public.asaali_cache.expires_at    is 'TTL أسبوع من الإنشاء';

-- index على expires_at لتنظيف الكاش
create index if not exists idx_asaali_cache_expires
  on public.asaali_cache (expires_at);


-- ============================================================
-- 3) جدول حدّ المعدل (asaali_rate_limit)
-- ============================================================
-- نتبع IP + ساعة. سقف افتراضي: 5 طلبات/IP/ساعة
-- بديل: استخدم asaali_usage مع COUNT — لكن جدول مخصص أسرع

create table if not exists public.asaali_rate_limit (
  id           bigserial primary key,
  ip_hash      text not null,
  bucket_start timestamptz not null,        -- بداية الساعة (truncated)
  request_count integer not null default 1,
  created_at   timestamptz not null default now(),
  unique (ip_hash, bucket_start)
);

comment on table public.asaali_rate_limit is 'تتبع المعدل: 5 طلبات/IP/ساعة لميزة /asaali';

create index if not exists idx_asaali_rate_ip_bucket
  on public.asaali_rate_limit (ip_hash, bucket_start desc);


-- ============================================================
-- 4) Row Level Security (RLS)
-- ============================================================
-- كل الجداول دي backend-only. لا نسمح بأي وصول من الـ anon client.
-- فقط service_role key يقدر يقرأ/يكتب.

alter table public.asaali_usage      enable row level security;
alter table public.asaali_cache      enable row level security;
alter table public.asaali_rate_limit enable row level security;

-- ملاحظة: مش هنضيف أي policy، يعني فقط service_role يقدر يصل
-- (service_role bypasses RLS by default)


-- ============================================================
-- 5) دوال مساعدة (اختياري — يمكن استدعاؤها من TypeScript بدلاً منها)
-- ============================================================

-- 5.1) دالة لحساب المصروف الشهري الحالي
create or replace function public.asaali_current_month_cost()
returns numeric
language sql
security definer
as $$
  select coalesce(sum(cost_usd), 0)::numeric(10,4)
  from public.asaali_usage
  where created_at >= date_trunc('month', now())
    and cache_hit = false;
$$;

comment on function public.asaali_current_month_cost
  is 'يُرجع المصروف الكلي بالدولار للشهر الحالي (يستثني cache hits)';


-- 5.2) دالة لتنظيف الكاش المنتهي
create or replace function public.asaali_cleanup_expired_cache()
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  delete from public.asaali_cache
   where expires_at < now()
  returning 1 into deleted_count;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.asaali_cleanup_expired_cache
  is 'يحذف صفوف الكاش المنتهية. شغّلها يومياً عبر pg_cron أو من تطبيقك';


-- 5.3) دالة لتنظيف صفوف rate_limit القديمة (أكثر من 24 ساعة)
create or replace function public.asaali_cleanup_old_rate_limits()
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  delete from public.asaali_rate_limit
   where bucket_start < (now() - interval '24 hours')
  returning 1 into deleted_count;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;


-- ============================================================
-- 6) (اختياري) جدولة التنظيف عبر pg_cron
-- ============================================================
-- لو عندك pg_cron مفعّل في Supabase، تقدر تشغّل التنظيف يومياً:
--
-- select cron.schedule(
--   'asaali-cleanup-cache',
--   '0 3 * * *',  -- 3am UTC يومياً
--   $$ select public.asaali_cleanup_expired_cache(); $$
-- );
--
-- select cron.schedule(
--   'asaali-cleanup-rate-limits',
--   '0 4 * * *',
--   $$ select public.asaali_cleanup_old_rate_limits(); $$
-- );


-- ============================================================
-- 7) بيانات تحقق — تأكيد إن الجداول اتعملت
-- ============================================================
select
  'asaali_usage'       as table_name, count(*) as row_count from public.asaali_usage
union all
select 'asaali_cache',                   count(*) from public.asaali_cache
union all
select 'asaali_rate_limit',              count(*) from public.asaali_rate_limit;
