export interface WorkshopCard {
  place_id: string;
  name: string;
  entity_type: string;
  specialty: string;
  governorate: string;
  area: string;
  rating: number | null;
  reviews_count: number;
  latitude: number;
  longitude: number;
  main_image: string | null;
  phone_intl: string | null;
}

export interface OpeningHour {
  day: string;
  hours: string;
}

export interface WorkshopDetail extends WorkshopCard {
  phone?: string | null;
  website?: string | null;
  address?: string;
  street?: string;
  google_url?: string;
  opening_hours_raw?: OpeningHour[];
  payments?: string;
  specialty_hints?: string[];
  category_raw?: string;
  images_count?: number;
  open_now?: boolean;
}

export interface WorkshopsResponse {
  total: number;
  limit: number;
  offset: number;
  results: WorkshopCard[];
}

export interface MapPoint {
  place_id: string;
  name: string;
  entity_type: string;
  specialty: string;
  rating: number | null;
  area: string;
  latitude: number;
  longitude: number;
}

export interface Stats {
  total: number;
  governorate_count: number;
  specialty_count: number;
  by_governorate: Record<string, number>;
  by_specialty: Record<string, number>;
  by_entity_type: Record<string, number>;
}

export interface CountItem {
  name: string;
  count: number;
}

export interface GovernorateItem {
  name: string;
  count: number;
  areas: { area: string; count: number }[];
}
