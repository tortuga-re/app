"use client";

import { FidelityQrCode } from "@/components/fidelity-qr-code";
import { cn } from "@/lib/utils";

type FidelityStatusCardProps = {
  title: string;
  points: number;
  progressPercent: number;
  tierLabel: string;
  tierDescription: string;
  nextRewardLabel?: string;
  isVip: boolean;
  activeCardCode: string;
  qrLabel: string;
  className?: string;
};

const getBadgeLabel = (isVip: boolean, hasCard: boolean) => {
  if (isVip) {
    return "Leggenda";
  }

  if (hasCard) {
    return "Card attiva";
  }

  return "Ciurma";
};

export function FidelityStatusCard({
  title,
  points,
  progressPercent,
  tierLabel,
  tierDescription,
  nextRewardLabel,
  isVip,
  activeCardCode,
  qrLabel,
  className,
}: FidelityStatusCardProps) {
  const hasCard = Boolean(activeCardCode);

  return (
    <div
      className={cn(
        "panel rounded-[2rem] p-5",
        isVip &&
          "border-[rgba(194,148,74,0.42)] bg-[linear-gradient(160deg,rgba(141,103,46,0.28),rgba(0,0,0,0.98)_36%,rgba(45,31,14,0.9)_100%)] shadow-[0_26px_72px_rgba(0,0,0,0.48)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className={cn("eyebrow", isVip && "text-[#e6c27a]")}>{title}</p>
          <h2 className="text-2xl font-semibold text-white">{tierLabel}</h2>
          <p
            className={cn(
              "max-w-[18rem] text-sm leading-6 text-[var(--text-muted)]",
              isVip && "text-[rgba(226,197,135,0.82)]",
            )}
          >
            {tierDescription}
          </p>
        </div>

        <span
          className={cn(
            "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
            isVip
              ? "border-[rgba(214,176,96,0.34)] bg-[rgba(194,148,74,0.16)] text-[#f0d49d]"
              : "border-[rgba(194,148,74,0.18)] bg-[rgba(255,255,255,0.04)] text-[var(--accent-strong)]",
          )}
        >
          {getBadgeLabel(isVip, hasCard)}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_148px]">
        <div className="panel-muted rounded-[1.7rem] px-4 py-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Bottino accumulato
              </p>
              <p className="mt-2 text-4xl font-semibold text-white">{points}</p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Rango
              </p>
              <p className="mt-2 text-sm font-medium text-white">{tierLabel}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="h-3 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.42)]">
              <div
                className={cn(
                  "h-full rounded-full bg-[linear-gradient(90deg,#e3c37a_0%,#b98336_52%,#67431c_100%)] transition-[width] duration-200",
                  !nextRewardLabel &&
                    "bg-[linear-gradient(90deg,#f1db9a_0%,#d8a24f_52%,#8a5923_100%)]",
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm leading-6 text-[var(--text-muted)]">
              {nextRewardLabel
                ? `PROSSIMO PREMIO: ${nextRewardLabel}`
                : "Hai gia messo le mani sul premio massimo."}
            </p>
          </div>
        </div>

        {hasCard ? (
          <div className="panel-muted rounded-[1.7rem] px-3 py-3">
            <FidelityQrCode
              key={activeCardCode}
              value={activeCardCode}
              label={qrLabel}
              variant={isVip ? "vip" : "default"}
            />
          </div>
        ) : (
          <div className="panel-muted flex min-h-[172px] items-center justify-center rounded-[1.7rem] px-4 py-4 text-center text-sm leading-6 text-[var(--text-muted)]">
            Il medaglione compare appena la card viene agganciata al profilo.
          </div>
        )}
      </div>
    </div>
  );
}
