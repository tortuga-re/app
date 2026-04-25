"use client";

export function AppGreeting({
  greeting,
  statusLabel,
  points,
}: {
  greeting: string;
  statusLabel: string;
  points: number;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[rgba(242,215,165,0.72)]">
        Area Cliente
      </p>
      <p className="hero-title text-[1.85rem] font-semibold leading-none text-white">
        {greeting}
      </p>
      <p className="max-w-[15rem] text-xs leading-5 text-[var(--text-muted)]">
        Stato: {statusLabel} · Infamia: {points}
      </p>
    </div>
  );
}
