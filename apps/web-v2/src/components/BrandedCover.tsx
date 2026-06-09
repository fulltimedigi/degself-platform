import { entityColor } from "@/lib/brand";

interface BrandedCoverProps {
  name: string;
  entityType?: string;
  specialty?: string; // kept for API compatibility (unused decoratively)
  className?: string;
}

/**
 * Decorative branded cover for cards/heroes — NO Google images, NO establishment
 * name text, NO big "degself" wordmark. Just a branded gradient, a faint first
 * letter, the ignition-key mark, and an entity-colored accent bar.
 */
export function BrandedCover({ name, entityType = "", className = "" }: BrandedCoverProps) {
  const accent = entityType ? entityColor(entityType) : "#FFD60A";
  const firstLetter = name?.trim()?.charAt(0) ?? "";

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      role="img"
      aria-label={name}
    >
      {/* branded amber → black gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #3a2c08 0%, #1c1607 55%, #0a0a0a 100%)",
        }}
      />

      {/* faint huge first letter */}
      {firstLetter && (
        <span
          aria-hidden
          className="absolute inset-0 flex select-none items-center justify-center text-[110px] font-black leading-none text-white/[0.05]"
        >
          {firstLetter}
        </span>
      )}

      {/* ignition-key mark, centered, small */}
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

      {/* entity-colored accent bar */}
      <span
        className="absolute inset-x-0 bottom-0 h-1.5"
        style={{ background: accent }}
      />
    </div>
  );
}
