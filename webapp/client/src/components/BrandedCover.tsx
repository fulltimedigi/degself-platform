import { entityColor } from "@/lib/brand";

interface BrandedCoverProps {
  name: string;
  entityType: string;
  specialty: string;
  className?: string;
  /** square = badge style for detail page, banner = 16/10 for cards */
  variant?: "banner" | "square";
}

// Specialty icon glyphs (lucide-style minimal SVG paths)
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

// Generate a deterministic hash so each name gets a slightly different gradient angle
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function BrandedCover({
  name,
  entityType,
  specialty,
  className = "",
  variant = "banner",
}: BrandedCoverProps) {
  const color = entityColor(entityType);
  const angle = (hashCode(name) % 60) + 110; // 110-170deg
  const isSquare = variant === "square";
  // SVG viewBox: banner 320x200 ; square 200x200
  const w = isSquare ? 200 : 320;
  const h = 200;
  const iconPath = specialtyIcon(specialty);

  // Display up to ~28 chars on 2 lines for name
  const displayName = name.length > 60 ? name.slice(0, 57) + "..." : name;
  // Split name into 2 lines naturally on space
  const words = displayName.split(/\s+/);
  let line1 = "";
  let line2 = "";
  for (const w of words) {
    if ((line1 + " " + w).trim().length <= 22 && !line2) {
      line1 = (line1 + " " + w).trim();
    } else {
      line2 = (line2 + " " + w).trim();
    }
  }
  if (line2.length > 28) line2 = line2.slice(0, 25) + "...";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      className={`h-full w-full ${className}`}
      role="img"
      aria-label={`${name} - ${specialty}`}
    >
      <defs>
        <linearGradient id={`g-${hashCode(name)}`} gradientTransform={`rotate(${angle})`}>
          <stop offset="0%" stopColor="#0b0f1a" />
          <stop offset="100%" stopColor="#1a2540" />
        </linearGradient>
        <pattern id={`p-${hashCode(name)}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="1" fill="#ffffff" fillOpacity="0.05" />
        </pattern>
      </defs>
      {/* Background */}
      <rect width={w} height={h} fill={`url(#g-${hashCode(name)})`} />
      <rect width={w} height={h} fill={`url(#p-${hashCode(name)})`} />
      {/* Accent bar bottom */}
      <rect x="0" y={h - 6} width={w} height="6" fill={color} />
      {/* Specialty icon, top-right, faint */}
      <g transform={`translate(${w - 70}, 18) scale(2.2)`} fill="none" stroke={color} strokeOpacity="0.5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={iconPath} />
      </g>
      {/* degself wordmark, top-left */}
      <g transform="translate(16, 24)">
        <circle cx="6" cy="6" r="6" fill={color} />
        <text x="20" y="11" fill="#ffffff" fontSize="13" fontWeight="700" fontFamily="system-ui,sans-serif" letterSpacing="0.5">
          degself
        </text>
      </g>
      {/* Name (Arabic-aware, RTL) */}
      <text
        x={w - 16}
        y={line2 ? h - 56 : h - 42}
        fill="#ffffff"
        fontSize="16"
        fontWeight="700"
        fontFamily="system-ui,'Tajawal','Cairo',sans-serif"
        textAnchor="end"
        direction="rtl"
      >
        {line1}
      </text>
      {line2 && (
        <text
          x={w - 16}
          y={h - 36}
          fill="#ffffff"
          fontSize="14"
          fontWeight="600"
          fontFamily="system-ui,'Tajawal','Cairo',sans-serif"
          textAnchor="end"
          direction="rtl"
          opacity="0.85"
        >
          {line2}
        </text>
      )}
      {/* Type + specialty pill */}
      <text
        x={w - 16}
        y={h - 16}
        fill={color}
        fontSize="11"
        fontWeight="600"
        fontFamily="system-ui,'Tajawal',sans-serif"
        textAnchor="end"
        direction="rtl"
        opacity="0.95"
      >
        {entityType} · {specialty}
      </text>
    </svg>
  );
}
