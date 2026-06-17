import type { SVGProps } from "react";

/**
 * Inline SVG icons for the 10 known automotive specialties.
 * Lightweight (no external icon library), RTL-friendly, and colored via
 * currentColor so the parent controls the accent.
 *
 * Each icon is 24x24 and draws with stroke="currentColor" — match the parent
 * font color or wrap in a colored element.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

// 🔧 wrench
const Wrench = (p: IconProps) => (
  <Base {...p}>
    <path d="M14.7 6.3a4 4 0 0 0 5 5l-2.4 2.4a2 2 0 0 0 0 2.8l3 3a2 2 0 0 1-2.8 2.8l-3-3a2 2 0 0 0-2.8 0L9.3 21.7a4 4 0 0 1-5-5L6.7 14.3a2 2 0 0 0 0-2.8l-3-3a2 2 0 0 1 2.8-2.8l3 3a2 2 0 0 0 2.8 0z" />
  </Base>
);

// ⚡ bolt
const Bolt = (p: IconProps) => (
  <Base {...p}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10" />
  </Base>
);

// ❄ snowflake
const Snowflake = (p: IconProps) => (
  <Base {...p}>
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="4.9" y1="4.9" x2="19.1" y2="19.1" />
    <line x1="19.1" y1="4.9" x2="4.9" y2="19.1" />
    <polyline points="8 5 12 9 16 5" />
    <polyline points="16 19 12 15 8 19" />
    <polyline points="5 8 9 12 5 16" />
    <polyline points="19 16 15 12 19 8" />
  </Base>
);

// 🛞 tire
const Tire = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
    <line x1="12" y1="3" x2="12" y2="9" />
    <line x1="12" y1="15" x2="12" y2="21" />
    <line x1="3" y1="12" x2="9" y2="12" />
    <line x1="15" y1="12" x2="21" y2="12" />
  </Base>
);

// 🛢️ oil drop
const Drop = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2.5c4 5 7 9 7 13a7 7 0 1 1-14 0c0-4 3-8 7-13z" />
  </Base>
);

// 🔩 puncture / lug
const Puncture = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7l2.5 4.3-2.5 1.5-2.5-1.5L12 7z" />
    <line x1="12" y1="13" x2="12" y2="17" />
  </Base>
);

// 🔋 battery
const Battery = (p: IconProps) => (
  <Base {...p}>
    <rect x="2" y="7" width="18" height="11" rx="2" />
    <line x1="22" y1="11" x2="22" y2="14" />
    <line x1="6" y1="11" x2="6" y2="14" />
    <line x1="4.5" y1="12.5" x2="7.5" y2="12.5" />
    <line x1="11" y1="11" x2="11" y2="14" />
    <line x1="9.5" y1="12.5" x2="12.5" y2="12.5" />
  </Base>
);

// 🧰 gear (mechanic / general)
const Gear = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Base>
);

// 🚗 car (body / paint default)
const Car = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 17h14M3 17v-4l2-5h14l2 5v4M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z" />
  </Base>
);

// 🧪 paint brush (body & paint)
const Paint = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="18" height="6" rx="1" />
    <path d="M19 9v5a2 2 0 0 1-2 2h-5v3a2 2 0 0 1-4 0v-3a2 2 0 0 1 2-2h7" />
  </Base>
);

// Map from specialty (slug or label, matched loosely) to icon + accent color.
// Accent is the icon foreground color; background is a tinted version (10% alpha).
export interface SpecialtyVisual {
  Icon: (p: IconProps) => React.ReactNode;
  color: string; // hex
  label: string;
}

const VISUALS: SpecialtyVisual[] = [
  { Icon: Gear, color: "#FFD60A", label: "صيانة" },        // yellow — brand
  { Icon: Wrench, color: "#F59E0B", label: "ميكانيكا" },   // orange
  { Icon: Bolt, color: "#3B82F6", label: "كهرباء" },       // blue
  { Icon: Tire, color: "#10B981", label: "تواير" },        // green
  { Icon: Puncture, color: "#14B8A6", label: "بنشر" },     // teal
  { Icon: Paint, color: "#EC4899", label: "بودي" },        // pink
  { Icon: Car, color: "#8B5CF6", label: "قير" },           // purple
  { Icon: Drop, color: "#A16207", label: "زيوت" },         // amber-dark
  { Icon: Snowflake, color: "#06B6D4", label: "تكييف" },   // cyan
  { Icon: Battery, color: "#EF4444", label: "بطاريات" },   // red
];

const FALLBACK: SpecialtyVisual = { Icon: Gear, color: "#FFD60A", label: "" };

/**
 * Pick the icon + color for a workshop given its `specialty` field
 * (which may be the audited reviewed_specialty or the legacy one).
 * Matching is substring-based on Arabic — robust to suffixes like
 * "صيانة عامة" → matches "صيانة".
 */
export function visualFor(specialty: string | null | undefined): SpecialtyVisual {
  if (!specialty) return FALLBACK;
  const s = specialty.trim();
  // Order matters — "بنشر" must be checked before "تواير" if a label contains
  // both, but our labels are simple so substring search is enough.
  for (const v of VISUALS) {
    if (s.includes(v.label)) return v;
  }
  return FALLBACK;
}
