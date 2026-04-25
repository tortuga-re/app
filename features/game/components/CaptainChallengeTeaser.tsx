import Link from "next/link";

import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export function CaptainChallengeTeaser({
  className,
  compact = false,
  framed = true,
}: {
  className?: string;
  compact?: boolean;
  framed?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Sfida il Capitano</p>
          <h2
            className={cn(
              "mt-3 font-semibold leading-tight text-white",
              compact ? "text-[1.75rem]" : "text-2xl",
            )}
          >
            Ferma il cannone prima che spari!
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            Vinci i premi in palio, una sfida di velocita contro il Capitano.
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
        onClick={() => triggerHaptic()}
      >
        Gioca ora
      </Link>
    </>
  );

  if (!framed) {
    return <div className={cn("space-y-1", className)}>{content}</div>;
  }

  return <div className={cn("panel rounded-[2rem] p-5", className)}>{content}</div>;
}
