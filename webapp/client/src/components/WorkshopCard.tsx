import { Link } from "wouter";
import { MapPin, Phone, ImageOff } from "lucide-react";
import type { WorkshopCard as TCard } from "@/lib/types";
import { EntityBadge } from "./EntityBadge";
import { RatingStars } from "./RatingStars";

export function WorkshopCard({ w }: { w: TCard }) {
  const tel = w.phone_intl ? w.phone_intl.replace(/\s/g, "") : null;
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-card-border bg-card hover-elevate"
      data-testid={`card-workshop-${w.place_id}`}
    >
      <Link href={`/workshop/${w.place_id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
          {w.main_image ? (
            <img
              src={w.main_image}
              alt={w.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff size={28} />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <EntityBadge type={w.entity_type} className="backdrop-blur-sm" />
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <Link href={`/workshop/${w.place_id}`}>
          <h3
            className="clamp-2 text-sm font-bold leading-snug hover:text-primary"
            data-testid={`text-name-${w.place_id}`}
          >
            {w.name}
          </h3>
        </Link>

        <div className="flex items-center justify-between gap-2">
          <span className="clamp-1 text-xs text-primary/90 font-semibold">{w.specialty}</span>
          <RatingStars rating={w.rating} reviews={w.reviews_count} size={13} />
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin size={13} className="shrink-0" />
          <span className="clamp-1">
            {w.area} · {w.governorate}
          </span>
        </div>

        {tel && (
          <a
            href={`tel:${tel}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover-elevate active-elevate-2"
            data-testid={`button-call-${w.place_id}`}
          >
            <Phone size={15} />
            اتصل الآن
          </a>
        )}
      </div>
    </article>
  );
}

export function WorkshopCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-card-border bg-card">
      <div className="aspect-[16/10] animate-pulse bg-secondary" />
      <div className="flex flex-col gap-2 p-3.5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-secondary" />
        <div className="mt-1 h-9 w-full animate-pulse rounded-lg bg-secondary" />
      </div>
    </div>
  );
}
