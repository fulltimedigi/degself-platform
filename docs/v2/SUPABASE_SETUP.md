# Supabase Setup — Schema & Configuration

> شغّل هذا في Supabase SQL Editor بعد إنشاء الـ project. كل قسم منفصل — شغّلهم بالترتيب.

---

## 1. الإعدادات الأولية

### Region
- **Mumbai (ap-south-1)** — أقرب region لـ الكويت في Supabase

### Extensions
```sql
-- لـ Arabic full-text search
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- لـ UUID generation
create extension if not exists "uuid-ossp";
```

---

## 2. جدول users (extension لـ Supabase Auth)

Supabase تنشئ `auth.users` تلقائياً. هذا جدول إضافي للبيانات العامة:

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone_e164 text unique,           -- +965XXXXXXXX
  phone_verified_at timestamptz,
  avatar_url text,
  contributions_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;

create policy "profiles viewable by everyone"
  on public.profiles for select using (true);

create policy "users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Trigger: لما يتسجل user جديد، أنشئ profile تلقائياً
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, phone_e164)
  values (new.id, new.phone);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## 3. جدول workshops (المنشآت — 1801 record)

```sql
create table public.workshops (
  place_id text primary key,          -- ⚠️ case-sensitive من Google
  name text not null,
  specialty text not null,            -- كراج / ميكانيكي / وكلاء / سمكرة / كهرباء / إلخ
  entity_type text not null,          -- workshop / dealer / spare_parts / car_wash / tow
  service_mode text not null default 'fixed', -- fixed / mobile / tow
  area text,                          -- الشويخ / حولي / السالمية / إلخ
  governorate text,                   -- الأحمدي / حولي / العاصمة / إلخ
  lat double precision,
  lng double precision,
  phone text,
  website text,
  google_rating numeric(2,1),         -- من Google (0.0-5.0)
  google_reviews_count int,

  -- حقول v2 الجديدة
  is_claimed boolean default false,
  claimed_by uuid references public.profiles(id),
  internal_rating_avg numeric(3,2),   -- متوسط reviews ديال المنصة (محسوب)
  internal_reviews_count int default 0,
  fb_mentions_count int default 0,    -- "موصى به × مرات"

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes للبحث والـ filtering
create index workshops_area_idx on public.workshops(area);
create index workshops_specialty_idx on public.workshops(specialty);
create index workshops_service_mode_idx on public.workshops(service_mode);
create index workshops_location_idx on public.workshops(lat, lng);

-- Arabic-aware full-text search
create index workshops_name_trgm_idx on public.workshops using gin (name gin_trgm_ops);

-- RLS
alter table public.workshops enable row level security;

create policy "workshops viewable by everyone"
  on public.workshops for select using (true);

create policy "only admins can modify workshops"
  on public.workshops for all using (
    exists (select 1 from public.admins where user_id = auth.uid())
  );
```

---

## 4. جدول reviews (Phase 2 — schema جاهز لكن UI لاحقاً)

```sql
create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  workshop_id text not null references public.workshops(place_id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,

  rating int not null check (rating between 1 and 5),

  -- أبعاد فرعية اختيارية
  quality_rating int check (quality_rating between 1 and 5),
  price_rating int check (price_rating between 1 and 5),
  speed_rating int check (speed_rating between 1 and 5),

  body text not null check (char_length(body) >= 30),
  photos text[] default '{}',         -- URLs لـ Supabase Storage

  helpful_count int default 0,
  owner_response text,
  owner_response_at timestamptz,

  -- Moderation
  status text not null default 'visible',  -- visible / hidden / pending_review
  moderation_flags jsonb default '{}'::jsonb,
  hashed_ip text,                          -- للحماية القانونية (90 يوم)

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- مستخدم واحد = review واحد لكل منشأة
  unique (workshop_id, user_id)
);

create index reviews_workshop_idx on public.reviews(workshop_id);
create index reviews_user_idx on public.reviews(user_id);
create index reviews_created_idx on public.reviews(created_at desc);

-- Trigger لتحديث aggregate في workshops
create or replace function public.update_workshop_rating()
returns trigger as $$
begin
  update public.workshops
  set internal_rating_avg = (
    select avg(rating)::numeric(3,2)
    from public.reviews
    where workshop_id = coalesce(new.workshop_id, old.workshop_id)
      and status = 'visible'
  ),
  internal_reviews_count = (
    select count(*)
    from public.reviews
    where workshop_id = coalesce(new.workshop_id, old.workshop_id)
      and status = 'visible'
  )
  where place_id = coalesce(new.workshop_id, old.workshop_id);
  return new;
end;
$$ language plpgsql;

create trigger reviews_aggregate_trigger
  after insert or update or delete on public.reviews
  for each row execute function public.update_workshop_rating();

-- RLS
alter table public.reviews enable row level security;

create policy "visible reviews readable by everyone"
  on public.reviews for select using (status = 'visible');

create policy "users can insert own review"
  on public.reviews for insert with check (auth.uid() = user_id);

create policy "users can update own review"
  on public.reviews for update using (auth.uid() = user_id);

create policy "users can delete own review"
  on public.reviews for delete using (auth.uid() = user_id);
```

---

## 5. جدول community_mentions (FB Groups — Phase 3)

```sql
create table public.community_mentions (
  id uuid primary key default uuid_generate_v4(),
  workshop_id text not null references public.workshops(place_id) on delete cascade,
  source text not null,             -- 'facebook' / 'reddit' / 'q8car' / 'twitter'
  source_label text,                -- 'Kuwait Insiders' (للعرض، بدون رابط)
  matched_at timestamptz default now(),
  matched_by uuid references public.profiles(id),  -- admin اللي راجع الـ match
  confidence numeric(3,2),          -- 0.00 - 1.00 من AI matching

  -- ⛔ ممنوع تخزين: نص التعليق الأصلي، اسم المعلّق، رابط المنشور
  -- فقط عدد الـ mentions كـ aggregate
  unique (workshop_id, source)
);

create index mentions_workshop_idx on public.community_mentions(workshop_id);

-- Trigger لتحديث fb_mentions_count
create or replace function public.update_mentions_count()
returns trigger as $$
begin
  update public.workshops
  set fb_mentions_count = (
    select count(*) from public.community_mentions
    where workshop_id = coalesce(new.workshop_id, old.workshop_id)
  )
  where place_id = coalesce(new.workshop_id, old.workshop_id);
  return new;
end;
$$ language plpgsql;

create trigger mentions_count_trigger
  after insert or delete on public.community_mentions
  for each row execute function public.update_mentions_count();

alter table public.community_mentions enable row level security;
create policy "mentions viewable by everyone"
  on public.community_mentions for select using (true);
```

---

## 6. جدول admins (للموديريشن)

```sql
create table public.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'moderator',  -- 'moderator' / 'owner'
  added_at timestamptz default now()
);

-- Ahmed يضيف نفسه يدوياً بعد أول تسجيل دخول
-- insert into public.admins (user_id, role) values ('YOUR-UUID-HERE', 'owner');
```

---

## 7. Auth Configuration (في Supabase Dashboard)

### في Auth → Providers:
- ✅ **Phone:** Enable, provider = **Twilio Verify**
  - Account SID, Auth Token, Verify Service SID — من Twilio Console
  - **Country code whitelist:** `+965` فقط
- ✅ **Google:** Enable
  - Client ID + Secret من Google Cloud Console

### في Auth → Settings:
- **Site URL:** `https://degself.com` (لاحقاً) — للآن `http://localhost:3000`
- **Redirect URLs:** أضف Vercel preview URLs
- **JWT expiry:** 3600 (ساعة)
- **Refresh token rotation:** ✅ Enabled

---

## 8. Storage (للصور)

في Supabase Storage:

```sql
-- Bucket لصور reviews
insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true);

-- Policy: المستخدم يقدر يرفع لمجلده فقط
create policy "users upload own review photos"
  on storage.objects for insert
  with check (bucket_id = 'review-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "review photos publicly viewable"
  on storage.objects for select
  using (bucket_id = 'review-photos');
```

---

## 9. التحقق النهائي

شغّل هذه الـ queries للتأكد:

```sql
-- يجب أن ترجع 0 (قبل الاستيراد)
select count(*) from public.workshops;

-- يجب أن ترجع 5 tables
select tablename from pg_tables where schemaname = 'public';

-- يجب أن ترجع 'on' لكل جدول
select tablename, rowsecurity from pg_tables
where schemaname = 'public';
```

---

## بعد الـ Setup

1. شغّل سكريبت import-workshops.ts من `apps/web-v2/scripts/`
2. تأكد إن `select count(*) from public.workshops;` يرجع **1801**
3. اطلب من Ahmed إنشاء أول مستخدم (نفسه) ثم أضفه كـ admin:
   ```sql
   insert into public.admins (user_id, role)
   values ('UUID-FROM-AUTH-USERS-TABLE', 'owner');
   ```
