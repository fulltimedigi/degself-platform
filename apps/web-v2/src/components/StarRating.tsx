/** Visual 5-star rating (no numeric value shown — golden rule: no raw numbers). */
export function StarRating({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span
      className="inline-flex items-center text-sm"
      aria-label={`تقييم ${rating} من 5`}
    >
      <span aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < full ? "text-primary" : "text-muted-foreground/40"}>
            ★
          </span>
        ))}
      </span>
    </span>
  );
}
