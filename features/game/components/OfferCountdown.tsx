"use client";

import { useEffect, useState } from "react";

const formatRemaining = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
};

export function OfferCountdown({ durationSeconds }: { durationSeconds: number }) {
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);

  useEffect(() => {
    const deadline = Date.now() + durationSeconds * 1000;
    const intervalId = window.setInterval(() => {
      setRemainingSeconds(
        Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
      );
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [durationSeconds]);

  return (
    <div className="rounded-[1.4rem] border border-[rgba(255,216,156,0.16)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
        Tempo offerta
      </p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-white">
        {formatRemaining(remainingSeconds)}
      </p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--danger)]">
        Mostra il telefono a un pirata. SBRIGATI!
      </p>
    </div>
  );
}
