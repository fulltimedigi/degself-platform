import { entityColor } from "@/lib/brand";

export function EntityBadge({ type, className = "" }: { type: string; className?: string }) {
  const color = entityColor(type);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
      style={{
        backgroundColor: `${color}1f`,
        color,
        border: `1px solid ${color}40`,
      }}
      data-testid={`badge-type-${type}`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {type}
    </span>
  );
}
