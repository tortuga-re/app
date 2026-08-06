"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { FidelityQrCode } from "@/components/fidelity-qr-code";
import { trackAppEvent } from "@/lib/analytics";
import { fidelityLoyaltyTiers } from "@/lib/fidelity-rewards.config";
import { cn } from "@/lib/utils";
import { CollapsibleWrapper } from "@/components/collapsible-wrapper";

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
    <CollapsibleWrapper
      title={title}
      subtitle={`${tierLabel} • ${points} Punti`}
      defaultOpen={false}
      className={className}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {tierImage ? (
                <div className="relative h-12 w-12 flex-shrink-0 drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
                  <Image
                    src={tierImage}
                    alt={tierLabel}
                    fill
                    sizes="48px"
                    className="object-contain"
                  />
                </div>
              ) : null}
              <div className="space-y-0.5">
                <button
                  type="button"
                  className={chipClassName}
                  onClick={() => setIsTierListOpen((prev) => !prev)}
                >
                  <span className={iconClassName}>{isVip ? "VIP" : "CRU"}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.22em]">
                    Livello {tierLabel}
                  </span>
                  <span className="ml-1 text-[9px] opacity-60">
                    {isTierListOpen ? "▲" : "▼"}
                  </span>
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
              {tierDescription}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-strong)]">
              Punti Card
            </p>
            <p className="mt-1 text-3xl font-black text-white">{points}</p>
          </div>
        </div>

        {/* Level List */}
        {isTierListOpen && (
          <div className="mt-3 rounded-[1.2rem] border border-white/10 bg-black/40 p-3 space-y-2 animate-in fade-in duration-200">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-strong)] mb-2">
              Livelli Ciurma
            </p>
            <div className="grid gap-2">
              {fidelityLoyaltyTiers.map((tier) => {
                const isCurrent = tier.label.toLowerCase() === tierLabel.toLowerCase();
                return (
                  <div
                    key={tier.label}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-xs border",
                      isCurrent
                        ? "border-[var(--accent-strong)] bg-[var(--accent-soft)]/20 text-white font-bold"
                        : "border-white/5 bg-white/5 text-[var(--text-muted)] opacity-80"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {tier.image ? (
                        <div className="relative h-6 w-6 shrink-0">
                          <Image src={tier.image} alt={tier.label} fill sizes="24px" className="object-contain" />
                        </div>
                      ) : null}
                      <span>{tier.label}</span>
                    </div>
                    <span className="text-[10px] font-mono">{tier.minPoints} punti</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            <span>Progresso Livello</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent-soft)] to-[var(--accent-strong)] transition-all duration-500"
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
        ) : null}
      </div>
    </CollapsibleWrapper>
  );
}
