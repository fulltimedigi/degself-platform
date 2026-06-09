import { entityColor } from "@/lib/brand";

interface BrandedCoverProps {
  name: string;
  entityType: string;
  specialty: string;
  className?: string;
  variant?: "banner" | "square";
}

// Specialty icon paths (lucide-style)
const SPECIALTY_ICONS: Record<string, string> = {
  "تواير وبنشر": "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12zm0 3a3 3 0 100 6 3 3 0 000-6z",
  "بطاريات": "M7 7h10v10H7zM10 4h4v3h-4zM11 11h2v2h-2z",
  "بودي وصبغ": "M3 12l9-9 9 9-9 9z M9 12l3-3 3 3-3 3z",
  "كهرباء سيارات": "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  "كمبيوتر وتشخيص": "M3 5h18v12H3zM7 21h10M12 17v4",
  "قير وفتيس": "M12 4v6m0 4v6 M4 12h6m4 0h6 M6 6l3 3 M15 15l3 3 M6 18l3-3 M15 9l3-3",
  "ميكانيكا": "M14 6l-4 4-4-4-2 2 4 4-4 4 2 2 4-4 4 4 2-2-4-4 4-4z",
  "صيانة عامة": "M14.7 6.3a4 4 0 00-5.7 5.7L3 18l3 3 6-6a4 4 0 005.7-5.7l-3 3-1.4-1.4 3-3z",
  "ونش وسحب": "M2 17h13l3-7h-2l-2 5h-2v-5h-2v5h-2l-2-5H4z M5 17a2 2 0 100 4 2 2 0 000-4z M14 17a2 2 0 100 4 2 2 0 000-4z",
  "تكييف": "M12 2v20 M2 12h20 M5 5l14 14 M19 5L5 19",
  "فرامل": "M12 4a8 8 0 100 16 8 8 0 000-16zM12 8v4l3 2",
  "زيوت وصيانة": "M9 2h6v4l3 3v11H6V9l3-3z",
  "غسيل وتلميع": "M5 3v6h14V3 M5 12h14v8H5z M9 16h2v2H9z",
  "قطع غيار": "M12 2l3 3-3 3-3-3z M2 12l3 3 3-3-3-3z M22 12l-3 3-3-3 3-3z M12 16l3 3-3 3-3-3z",
  "إكسسوارات": "M4 7h16v10H4z M8 7V5h8v2 M9 11h6 M9 14h6",
  "تظليل وزجاج": "M3 3h18v18H3z M3 12h18 M12 3v18",
  "دواسر وفرش": "M3 10h18v8H3z M5 18v3 M19 18v3 M5 10V7a3 3 0 013-3h8a3 3 0 013 3v3",
  "فحص فني": "M9 12l2 2 4-4 M12 2a10 10 0 100 20 10 10 0 000-20z",
  "كراج متنقل": "M3 7h13l3 5h2v5h-3a2 2 0 11-4 0H8a2 2 0 11-4 0H3z",
  "وكيل": "M12 2L2 7v7l10 5 10-5V7z",
  "وكلاء وكالات": "M12 2L2 7v7l10 5 10-5V7z",
};

function specialtyIcon(spec: string): string {
  return SPECIALTY_ICONS[spec] || SPECIALTY_ICONS["صيانة عامة"];
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Detect if string contains Arabic chars
function hasArabic(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s);
}

export function BrandedCover({
  name,
  entityType,
  specialty,
  className = "",
}: BrandedCoverProps) {
  const color = entityColor(entityType);
  const id = hashCode(name);
  const angle = (id % 60) + 110;
  const iconPath = specialtyIcon(specialty);
  const isAr = hasArabic(name);
  // Clip very long names
  const displayName = name.length > 70 ? name.slice(0, 67) + "…" : name;

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      role="img"
      aria-label={`${name} - ${specialty}`}
    >
      {/* Background SVG: gradient + dots pattern + accent bar + faint icon */}
      <svg
        viewBox="0 0 320 200"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id={`g-${id}`} gradientTransform={`rotate(${angle})`}>
            <stop offset="0%" stopColor="#0b0f1a" />
            <stop offset="60%" stopColor="#131b30" />
            <stop offset="100%" stopColor="#1a2540" />
          </linearGradient>
          <pattern
            id={`p-${id}`}
            x="0"
            y="0"
            width="22"
            height="22"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="11" cy="11" r="1" fill="#ffffff" fillOpacity="0.06" />
          </pattern>
        </defs>
        <rect width="320" height="200" fill={`url(#g-${id})`} />
        <rect width="320" height="200" fill={`url(#p-${id})`} />
        {/* Large faint icon on the left */}
        <g
          transform="translate(-10, 30) scale(7)"
          fill="none"
          stroke={color}
          strokeOpacity="0.08"
          strokeWidth="0.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={iconPath} />
        </g>
        {/* Accent bar bottom */}
        <rect x="0" y="194" width="320" height="6" fill={color} />
      </svg>

      {/* HTML overlay for proper text wrapping & RTL */}
      <div className="absolute inset-0 flex flex-col justify-between p-3">
        {/* Top: degself wordmark + entity color dot */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: color }}
            />
            <span className="text-[11px] font-bold tracking-wide text-white/90">
              degself
            </span>
          </div>
          {/* Specialty icon top-right (visible) */}
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke={color}
            strokeOpacity="0.75"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={iconPath} />
          </svg>
        </div>

        {/* Bottom: name + type/specialty */}
        <div className="flex flex-col gap-1" dir={isAr ? "rtl" : "ltr"}>
          <h4
            className="clamp-2 text-[15px] font-extrabold leading-tight text-white drop-shadow-sm"
            style={{ textAlign: isAr ? "right" : "left" }}
          >
            {displayName}
          </h4>
          <div
            className="text-[11px] font-semibold"
            style={{ color, textAlign: isAr ? "right" : "left" }}
          >
            {entityType} · {specialty}
          </div>
        </div>
      </div>
    </div>
  );
}
