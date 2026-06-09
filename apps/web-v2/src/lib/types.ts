// Workshop — mirrors the actual `public.workshops` table (33 columns).
// Source of truth: supabase/schema.sql + migrations/002_search_text.sql.

export interface Workshop {
  // primary key — case-sensitive Google Place ID (never transform)
  place_id: string;

  // core identity (NOT NULL)
  name: string;
  specialty: string;
  entity_type: string;
  service_mode: string; // 'fixed' | 'mobile' | 'tow'
  category_raw: string | null;
  specialty_hints: string[];

  // location
  area: string | null;
  governorate: string | null;
  address: string | null;
  street: string | null;
  lat: number | null;
  lng: number | null;

  // contact
  phone: string | null;
  phone_intl: string | null;
  website: string | null;

  // Google signals
  google_rating: number | null;
  google_reviews_count: number | null;

  // media / meta
  opening_hours: string | null;
  images_count: number | null;
  main_image: string | null;
  payments: string | null;
  emergency_service: boolean;
  permanently_closed: boolean;
  active: boolean;

  // v2 platform fields
  is_claimed: boolean;
  claimed_by: string | null;
  internal_rating_avg: number | null;
  internal_reviews_count: number;
  fb_mentions_count: number;

  // bookkeeping
  created_at: string;
  updated_at: string;

  // Arabic-normalized search blob (filled by trigger) — internal use
  search_text: string | null;
}
