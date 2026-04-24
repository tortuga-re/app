"use client";

import { OfferCountdown } from "@/features/game/components/OfferCountdown";
import { ReferralLifeCard } from "@/features/game/components/ReferralLifeCard";
import type { CaptainChallengeTapResponse } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const formatReaction = (reactionTimeMs: number) => {
  if (reactionTimeMs < 0) {
    return `${Math.abs(reactionTimeMs)} ms prima del segnale`;
  }

  return `${reactionTimeMs} ms dopo il segnale`;
};

export function GameResultCard({
  result,
  referralUrl,
  referralLoading,
  onCreateReferral,
}: {
  result: CaptainChallengeTapResponse;
  referralUrl: string;
  referralLoading: boolean;
  onCreateReferral: () => void;
}) {
  const isWin = result.outcomeType === "win";
  const isFalseStart = result.outcomeType === "false_start";
  const resultCopy = isFalseStart
    ? "Hai bruciato la miccia troppo presto."
    : isWin
      ? "Il Capitano ha visto il tuo riflesso."
      : "Il Capitano non regala seconde possibilita.";

  return (
    <div
      className={cn(
        "panel rounded-[2rem] p-5",
        isWin &&
          "border-[rgba(242,215,165,0.36)] bg-[linear-gradient(160deg,rgba(242,215,165,0.18),rgba(15,12,10,0.98)_42%,rgba(68,45,20,0.84)_100%)]",
        !isWin &&
          "border-[rgba(240,139,117,0.38)] bg-[linear-gradient(160deg,rgba(240,139,117,0.16),rgba(15,9,8,0.98)_40%,rgba(58,20,16,0.72)_100%)]",
      )}
    >
      <p
        className={cn(
          "eyebrow",
          !isWin && "text-[var(--danger)]",
          isWin && "text-[#f5deb0]",
        )}
      >
        Esito validato
      </p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
        {result.outcome}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
        {resultCopy}
      </p>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
        Tempo server:{" "}
        <span className="font-semibold text-white">
          {formatReaction(result.reactionTimeMs)}
        </span>
      </p>

      {result.offer ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-[1.5rem] border border-[rgba(255,216,156,0.14)] bg-white/4 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              {isWin ? "Offerta sbloccata" : "Offerta consolazione"}
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {result.offer.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {result.offer.description}
            </p>
          </div>
          <OfferCountdown
            key={`${result.outcomeType}-${result.reactionTimeMs}`}
            durationSeconds={result.offerDurationSeconds}
          />
        </div>
      ) : null}

      <div className="mt-5">
        <ReferralLifeCard
          referralUrl={referralUrl}
          referralLoading={referralLoading}
          onCreateReferral={onCreateReferral}
          variant={isWin ? "challenge" : "life"}
        />
      </div>
    </div>
  );
}
