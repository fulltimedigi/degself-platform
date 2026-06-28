-- ============================================================
-- Migration 012 — GSC Indexing queue
-- Date: 2026-06-28
-- ============================================================
-- Tracks URLs submitted to the Google Indexing API by the daily Vercel cron
-- (/api/cron/gsc-indexing). One URL/day → well under the 200/day quota.

CREATE TABLE IF NOT EXISTS public.gsc_indexing_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url           TEXT NOT NULL UNIQUE,
  priority      INTEGER DEFAULT 5,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'submitted', 'error')),
  submitted_at  TIMESTAMPTZ,
  attempted_at  TIMESTAMPTZ,
  response      JSONB,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gsc_status
  ON public.gsc_indexing_queue (status, priority, created_at);

-- Seed the 6 pending landing-index URLs (Arabic slugs percent-encoded — all
-- verified live (HTTP 200) on 2026-06-28).
INSERT INTO public.gsc_indexing_queue (url, priority) VALUES
  ('https://degself.com/%D9%83%D8%B1%D8%A7%D8%AC/%D8%A8%D9%86%D8%B4%D8%B1', 5),
  ('https://degself.com/%D9%83%D8%B1%D8%A7%D8%AC/%D8%A8%D9%88%D8%AF%D9%8A', 5),
  ('https://degself.com/%D9%83%D8%B1%D8%A7%D8%AC/%D9%82%D9%8A%D8%B1', 5),
  ('https://degself.com/%D9%83%D8%B1%D8%A7%D8%AC/%D8%B2%D9%8A%D9%88%D8%AA', 5),
  ('https://degself.com/%D9%83%D8%B1%D8%A7%D8%AC/%D8%AA%D9%83%D9%8A%D9%8A%D9%81', 5),
  ('https://degself.com/%D9%83%D8%B1%D8%A7%D8%AC/%D8%A8%D8%B7%D8%A7%D8%B1%D9%8A%D8%A7%D8%AA', 5)
ON CONFLICT (url) DO NOTHING;

-- ملاحظة: ضع RLS لاحقاً إن لزم؛ الجدول يُقرأ/يُكتب من الخادم بمفتاح service_role فقط.
