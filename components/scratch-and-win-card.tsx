"use client";

import { triggerHaptic } from "@/lib/haptics";
import { scratchAndWinConfig } from "@/lib/scratch-and-win";
import { cn } from "@/lib/utils";

export function ScratchAndWinCard({
  className,
  compact = false,
  framed = true,
  onClick,
}: {
  className?: string;
  compact?: boolean;
  framed?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{scratchAndWinConfig.eyebrow}</p>
          <h2
            className={cn(
              "mt-3 font-semibold leading-tight text-white",
              compact ? "text-[1.75rem]" : "text-2xl",
            )}
          >
            {scratchAndWinConfig.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            {scratchAndWinConfig.description}
          </p>
        </div>

        {!compact ? (
          <span className="rounded-full border border-[rgba(216,176,106,0.28)] bg-[rgba(216,176,106,0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            {scratchAndWinConfig.badgeLabel}
          </span>
        ) : null}
      </div>

      <a
        href={scratchAndWinConfig.url}
        target="_blank"
        rel="noreferrer"
        className="button-primary cta-glow mt-5 flex w-full min-h-12 items-center justify-center px-5 text-sm"
        onClick={() => {
          triggerHaptic();
          onClick?.();
        }}
      >
        {scratchAndWinConfig.buttonLabel}
      </a>
    </>
  );

  if (!framed) {
    return <div className={cn("space-y-1", className)}>{content}</div>;
  }

  return (
    <div className={cn("panel parchment-texture rounded-[2rem] p-5", className)}>
      {content}
    </div>
  );
}
