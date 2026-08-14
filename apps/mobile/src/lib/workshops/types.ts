export type Workshop = {
  place_id: string;
  name: string;
  reviewed_specialty: string | null;
  entity_type: string;
  service_mode: string;
  area: string | null;
  neighborhood: string | null;
  governorate: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  phone_intl: string | null;
  website: string | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  opening_hours: string | null;
  main_image: string | null;
  emergency_service: boolean;
  is_partner: boolean;
};

export type WorkshopListResponse = { workshops: Workshop[]; total?: number };
export type WorkshopDetailResponse = { workshop: Workshop };
