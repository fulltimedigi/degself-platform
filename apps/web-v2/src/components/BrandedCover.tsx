"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { entityColor } from "@/lib/brand";

interface BrandedCoverProps {
  name: string;
  entityType?: string;
  specialty?: string;
  className?: string;
}

function placeIdFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const i = parts.indexOf("workshop");
  if (i < 0 || !parts[i + 1]) return null;
  try {
    return decodeURIComponent(parts[i + 1]);
  } catch {
    return parts[i + 1];
  }
}

/**
 * Workshop hero. Network garages with curated real photos get an image carousel;
 * every other workshop keeps the existing branded fallback cover.
 */
export function BrandedCover({ name, entityType = "", className = "" }: BrandedCoverProps) {
  const accent = entityType ? entityColor(entityType) : "#FFD60A";
  const firstLetter = name?.trim()?.charAt(0) ?? "";
  const pathname = usePathname();
  const placeId = useMemo(() => placeIdFromPath(pathname), [pathname]);
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!placeId) return;
    let cancelled = false;
    fetch(`/api/workshops/${encodeURIComponent(placeId)}/media`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const urls = Array.isArray(data.gallery_image_urls)
          ? data.gallery_image_urls.filter((u: unknown): u is string => typeof u === "string" && u.length > 0)
          : [];
        setImages(urls);
        setIndex(0);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      role="img"
      aria-label={name}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #3a2c08 0%, #1c1607 55%, #0a0a0a 100%)",
        }}
      />

      {images.length > 0 ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[index]}
            alt={`${name} — صورة ${index + 1}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="الصورة السابقة"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + images.length) % images.length);
                }}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-xl font-bold text-white backdrop-blur-sm"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="الصورة التالية"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % images.length);
                }}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-xl font-bold text-white backdrop-blur-sm"
              >
                ›
              </button>
              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`الصورة ${i + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIndex(i);
                    }}
                    className={`h-2 rounded-full transition-all ${i === index ? "w-5 bg-[#FFD60A]" : "w-2 bg-white/70"}`}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {firstLetter && (
            <span
              aria-hidden
              className="absolute inset-0 flex select-none items-center justify-center text-[110px] font-black leading-none text-white/[0.05]"
            >
              {firstLetter}
            </span>
          )}
          <svg
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            width="42"
            height="42"
            viewBox="0 0 24 24"
            fill="none"
            stroke={accent}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="7.5" cy="15.5" r="4.5" />
            <path d="M10.7 12.3 19 4" />
            <path d="M15.5 7.5l2.5 2.5" />
            <path d="M17.5 5.5l2.5 2.5" />
          </svg>
          <span
            className="absolute inset-x-0 bottom-0 h-1.5"
            style={{ background: accent }}
          />
        </>
      )}
    </div>
  );
}
