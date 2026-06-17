import { visualFor } from "@/components/SpecialtyIcon";

/**
 * Compact square cover (default 80px) showing the workshop's specialty icon
 * over a tinted background that matches the specialty accent color.
 *
 * Designed for the horizontal WorkshopCard layout — sits on the logical
 * inline-start side (right in RTL).
 */
export function SpecialtyCover({
  specialty,
  size = 80,
}: {
  specialty: string | null | undefined;
  size?: number;
}) {
  const { Icon, color, label } = visualFor(specialty);
  // 10% alpha tint of the accent — works on both light + dark cards
  const bg = `${color}1A`; // hex + 1A (~10% alpha)

  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
      }}
      aria-label={label || "تخصص"}
    >
      <Icon
        width={Math.round(size * 0.5)}
        height={Math.round(size * 0.5)}
        style={{ color }}
      />
      {/* bottom accent bar — subtle visual anchor */}
      <span
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
