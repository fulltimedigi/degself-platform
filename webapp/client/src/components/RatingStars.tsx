import { Star } from "lucide-react";

export function RatingStars({
  rating,
  reviews,
  size = 14,
  showCount = true,
}: {
  rating: number | null;
  reviews?: number;
  size?: number;
  showCount?: boolean;
}) {
  if (rating == null) {
    return <span className="text-xs text-muted-foreground">لا يوجد تقييم</span>;
  }
  return (
    <span className="inline-flex items-center gap-1" data-testid="rating-stars">
      <Star size={size} className="fill-primary text-primary" />
      <span className="font-en font-bold tabular-nums leading-none">
        {rating.toFixed(1)}
      </span>
      {showCount && reviews != null && reviews > 0 && (
        <span className="text-xs text-muted-foreground">
          ({reviews.toLocaleString("en-US")})
        </span>
      )}
    </span>
  );
}
