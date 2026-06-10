"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { FidelityQrCode } from "@/components/fidelity-qr-code";
import { trackAppEvent } from "@/lib/analytics";
import { fidelityLoyaltyTiers } from "@/lib/fidelity-rewards.config";
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
  tierImage?: string;
  className?: string;
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
  tierImage,
  className,
}: FidelityStatusCardProps) {
  const hasCard = Boolean(activeCardCode);
  const viewedQrKeyRef = useRef("");
  const [isTierListOpen, setIsTierListOpen] = useState(false);

  useEffect(() => {
    if (!hasCard || viewedQrKeyRef.current === activeCardCode) {
      return;
    }

    viewedQrKeyRef.current = activeCardCode;
    trackAppEvent("view_fidelity_qr", {
      points,
      tier_label: tierLabel,
      is_vip: isVip,
      has_card: true,
    });
  }, [activeCardCode, hasCard, isVip, points, tierLabel]);

  const chipClassName = cn(
    "inline-flex items-center gap-1.5 rounded-full border pl-1 pr-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    isVip
      ? "border-[rgba(214,176,96,0.34)] bg-[rgba(194,148,74,0.16)] text-[#f0d49d]"
      : "border-[rgba(216,176,106,0.18)] bg-white/5 text-[var(--accent-strong)]",
  );

  const iconClassName = cn(
    "flex h-5 w-5 items-center justify-center rounded-full border text-[8px] font-black uppercase leading-none",
    isVip
      ? "border-[rgba(242,215,165,0.28)] bg-[rgba(242,215,165,0.12)] text-[#f6e0a8]"
      : "border-[rgba(216,176,106,0.22)] bg-[rgba(216,176,106,0.08)] text-[var(--accent-strong)]",
  );

  return (
    <div
      className={cn(
        "panel parchment-texture rounded-[2rem] p-5",
        isVip &&
          "border-[rgba(194,148,74,0.42)] bg-[linear-gradient(160deg,rgba(141,103,46,0.28),rgba(0,0,0,0.98)_36%,rgba(45,31,14,0.9)_100%)] shadow-[0_26px_72px_rgba(0,0,0,0.48)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {tierImage ? (
              <div className="relative h-12 w-12 flex-shrink-0 drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-110">
                <Image
                  src={tierImage}
                  alt={tierLabel}
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </div>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className={cn("h-5 w-5", isVip ? "text-[#e6c27a]" : "text-[var(--accent-strong)]")}
                fill="currentColor"
              >
                <path
                  d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z"
                  opacity="0.4"
                />
                <circle cx="12" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M10 12l2-2 2 2M12 7v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            )}
            <div className="space-y-0.5">
              <p className={cn("eyebrow leading-tight", isVip && "text-[#e6c27a]")}>{title}</p>
              <button
                type="button"
                className={chipClassName}
                onClick={() => setIsTierListOpen((value) => !value)}
                aria-expanded={isTierListOpen}
                aria-label={`Mostra i ranghi disponibili per ${tierLabel}`}
              >
                <span className={iconClassName}>✦</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                  {tierLabel}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            PTS.
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">{points}</p>
        </div>
      </div>

      <div className="mt-5 panel-muted rounded-[1.7rem] px-4 py-4">
        <div className="space-y-3">
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

      {isTierListOpen ? (
        <div className="mt-4 rounded-[1.25rem] border border-[rgba(216,176,106,0.18)] bg-[rgba(0,0,0,0.18)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Ranghi disponibili
          </p>
          <div className="mt-2 space-y-1.5">
            {fidelityLoyaltyTiers.map((tier, index) => (
              <div
                key={tier.label}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-full border px-3 py-1.5 text-sm",
                  tier.label === tierLabel
                    ? "border-[rgba(216,176,106,0.35)] bg-[rgba(216,176,106,0.12)] text-white"
                    : "border-white/5 bg-white/[0.03] text-[var(--text-muted)]",
                )}
              >
                <span className="font-semibold uppercase tracking-[0.08em]">{tier.label}</span>
                <span className="text-[11px] font-semibold text-[var(--accent-strong)]">
                  {index === 0 ? "> 0" : `> ${tier.minPoints}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-[1.7rem] bg-[rgba(255,255,255,0.03)] px-3 py-3">
        {hasCard ? (
          <FidelityQrCode
            key={activeCardCode}
            value={activeCardCode}
            label={qrLabel}
            variant={isVip ? "vip" : "default"}
          />
        ) : (
          <div className="flex min-h-[172px] items-center justify-center rounded-[1.45rem] px-4 py-4 text-center text-sm leading-6 text-[var(--text-muted)]">
            Il medaglione compare appena la card viene agganciata al profilo.
          </div>
        )}
      </div>
    </div>
  );
}
