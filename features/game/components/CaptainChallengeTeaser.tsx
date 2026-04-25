import Link from "next/link";
import { useEffect, useState } from "react";

import { requestJson } from "@/lib/client";
import type { CaptainChallengeLivesResponse } from "@/lib/game/types";
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
  const [lives, setLives] = useState<number | null>(null);
  const [livesLoading, setLivesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadLives = async () => {
      try {
        const response = await requestJson<CaptainChallengeLivesResponse>(
          "/api/game/lives",
        );

        if (!cancelled) {
          setLives(response.lives);
        }
      } catch {
        if (!cancelled) {
          setLives(null);
        }
      } finally {
        if (!cancelled) {
          setLivesLoading(false);
        }
      }
    };

    void loadLives();

    return () => {
      cancelled = true;
    };
  }, []);

  const livesLabel = livesLoading
    ? "Vite in lettura"
    : lives === null
      ? ""
      : lives <= 0
        ? "Vite finite: arruola un pirata"
        : lives === 1
          ? "1 vita pronta"
          : `${lives} vite pronte`;

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
            Batti il segnale prima di tutti.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            Aspetta il via del Capitano e tappa al momento giusto. La sfida viene
            validata dal server, non dal telefono.
          </p>
        </div>

        {!compact ? (
          <span className="rounded-full border border-[rgba(240,139,117,0.22)] bg-[rgba(240,139,117,0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--danger)]">
            Live
          </span>
        ) : null}
      </div>

      {livesLabel ? (
        <div className="mt-4 inline-flex rounded-full border border-[rgba(255,216,156,0.12)] bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          {livesLabel}
        </div>
      ) : null}

      <Link
        href="/game/sfida-capitano"
        className="button-primary mt-5 inline-flex min-h-12 items-center justify-center px-5 text-sm"
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
