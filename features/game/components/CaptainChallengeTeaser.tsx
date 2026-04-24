import Link from "next/link";

import { cn } from "@/lib/utils";

export function CaptainChallengeTeaser({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("panel rounded-[2rem] p-5", className)}>
      <p className="eyebrow">Sfida il Capitano</p>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold leading-tight text-white">
            Riflessi, miccia e sangue freddo.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            Aspetta il segnale, poi tappa. Il risultato viene validato dal
            backend, non dal telefono.
          </p>
        </div>
        {!compact ? (
          <span className="rounded-full border border-[rgba(240,139,117,0.22)] bg-[rgba(240,139,117,0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--danger)]">
            Live
          </span>
        ) : null}
      </div>
      <Link
        href="/game/sfida-capitano"
        className="button-primary mt-5 inline-flex min-h-12 items-center justify-center px-5 text-sm"
      >
        Gioca ora
      </Link>
    </div>
  );
}
