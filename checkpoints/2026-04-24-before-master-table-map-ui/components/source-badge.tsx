import { cn } from "@/lib/utils";
import type { DataSource } from "@/lib/cooperto/types";

const labels: Record<DataSource, string> = {
  live: "Dati live",
  mock: "Mock locale",
  fallback: "Backup mock",
};

export function SourceBadge({
  source,
  className,
}: {
  source: DataSource;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[rgba(255,216,156,0.1)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(242,215,165,0.82)]",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
      {labels[source]}
    </span>
  );
}
