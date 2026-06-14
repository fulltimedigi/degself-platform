import type { Workshop } from "@/lib/types";
import type { ReviewSummary } from "@/lib/reviews";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://degself.com";

/**
 * schema.org/AutoRepair structured data (no reviews yet — Phase 2).
 * Rendered as a JSON-LD <script>. Google reads JSON-LD anywhere in the document,
 * so placing it in the page body is valid.
 *
 * NOTE: opening_hours is stored as free Arabic text (e.g. "الإثنين: 8 AM to 8 PM | …")
 * which does NOT map to schema.org's "Mo-Su 08:00-20:00" format. Emitting it raw
 * would be invalid markup, so it is intentionally omitted until a parser is added.
 */
export function WorkshopJsonLd({
  workshop,
  reviews,
}: {
  workshop: Workshop;
  reviews?: ReviewSummary;
}) {
  const {
    place_id,
    name,
    street,
    address,
    area,
    governorate,
    lat,
    lng,
    phone_intl,
    phone,
    website,
  } = workshop;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name,
    url: `${SITE_URL}/workshop/${place_id}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: street || address || undefined,
      addressLocality: area || undefined,
      addressRegion: governorate || undefined,
      addressCountry: "KW",
    },
  };

  if (lat != null && lng != null) {
    data.geo = { "@type": "GeoCoordinates", latitude: lat, longitude: lng };
  }
  const tel = phone_intl || phone;
  if (tel) data.telephone = tel;
  if (website) data.sameAs = website;

  // Genuine, on-page visitor reviews → aggregateRating + a few Review items.
  if (reviews && reviews.count > 0 && reviews.avg != null) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviews.avg,
      reviewCount: reviews.count,
      bestRating: 5,
      worstRating: 1,
    };
    data.review = reviews.reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: { "@type": "Person", name: r.author_name || "زائر" },
      reviewBody: r.body,
      datePublished: r.created_at.slice(0, 10),
    }));
  }

  // Escape "<" so the JSON can't break out of the <script> element.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
