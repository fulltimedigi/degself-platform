// Pure builders/parsers for the post-service RATING step (Phase B). Sent only to
// customers who confirmed the job happened, inside the 24h window their "نعم" tap
// opened — so it is a free-form interactive LIST message (no template needed), is
// tied to the specific booking, and carries NO incentive (Meta/FTC compliant).
//
// A rating alone is the verified review (comment collection is a later refinement).
// The public rating path is offered to EVERY confirmer, happy or not — no gating.

export const RATING_ROW_PREFIX = "settlement_rate_";

/** Reply-row id for a given 1–5 rating. */
export function ratingRowId(n: number): string {
  return `${RATING_ROW_PREFIX}${n}`;
}

/** Parse a list-reply id back to a 1–5 rating (null if not ours / out of range). */
export function parseRatingListReply(id: string | null | undefined): number | null {
  if (typeof id !== "string" || !id.startsWith(RATING_ROW_PREFIX)) return null;
  const n = Number(id.slice(RATING_ROW_PREFIX.length));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

export function isValidRating(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5;
}

// Row titles must be <= 24 chars (WhatsApp list limit). Newest-first (5 → 1).
const RATING_ROWS = [
  { n: 5, title: "٥ نجوم — ممتاز" },
  { n: 4, title: "٤ نجوم — جيد جدًا" },
  { n: 3, title: "٣ نجوم — جيد" },
  { n: 2, title: "٢ نجمة — مقبول" },
  { n: 1, title: "١ نجمة — سيئ" },
] as const;

/**
 * Interactive LIST message asking the customer to rate the specific workshop.
 * Neutral wording (not "give us a positive review"), one required tap.
 */
export function buildRatingListInteractive(workshopName: string) {
  return {
    type: "list" as const,
    body: {
      text: `شكرًا لك 🙏\nكيف كانت تجربتك مع «${workshopName}»؟ اختر تقييمك:`,
    },
    action: {
      button: "اختر التقييم",
      sections: [
        {
          title: "قيّم من ١ إلى ٥",
          rows: RATING_ROWS.map((r) => ({
            id: ratingRowId(r.n),
            title: r.title,
          })),
        },
      ],
    },
  };
}
