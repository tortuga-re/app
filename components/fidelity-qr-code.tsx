"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function FidelityQrCode({
  value,
  label,
  variant = "default",
}: {
  value: string;
  label: string;
  variant?: "default" | "vip" | "coupon";
}) {
  const [svgMarkup, setSvgMarkup] = useState("");
  const isVip = variant === "vip";
  const isCoupon = variant === "coupon";

  useEffect(() => {
    let cancelled = false;

    void import("qrcode")
      .then(async (qrCode) =>
        qrCode.toString(value, {
          type: "svg",
          margin: 1,
          width: 240,
          color: {
            dark: isVip ? "#120d08" : "#0f0d0b",
            light: isVip ? "#f3d79e" : isCoupon ? "#f4ead8" : "#fcfaf5",
          },
        }),
      )
      .then((markup) => {
        if (!cancelled) {
          setSvgMarkup(markup);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSvgMarkup("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isCoupon, isVip, value]);

  return (
    <div className="mx-auto flex w-full max-w-[248px] flex-col items-center justify-center gap-2">
      <div
        className={cn(
          "relative w-full overflow-hidden p-[10px] shadow-[0_20px_46px_rgba(0,0,0,0.34)]",
          isVip
            ? "rounded-[2rem] border border-[rgba(226,194,122,0.5)] bg-[linear-gradient(145deg,#edd28d_0%,#b67c34_30%,#2c1c0e_37%,#090705_100%)]"
            : isCoupon
              ? "rounded-[1.45rem] border border-[rgba(171,128,63,0.3)] bg-[linear-gradient(145deg,#b78a46_0%,#5a3517_26%,#14100d_34%,#070605_100%)]"
              : "rounded-[2rem] border border-[rgba(171,128,63,0.32)] bg-[linear-gradient(145deg,#d8b06a_0%,#946027_29%,#1f150f_36%,#080706_100%)]",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(115deg,rgba(255,255,255,0.06)_0,rgba(255,255,255,0.06)_1px,transparent_1px,transparent_9px)] opacity-35" />
        <div
          className={cn(
            "relative border border-[rgba(255,255,255,0.09)] bg-[linear-gradient(180deg,rgba(255,248,230,0.14),rgba(255,248,230,0.025))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-14px_24px_rgba(0,0,0,0.18)]",
            isCoupon ? "rounded-[1.1rem]" : "rounded-[1.6rem]",
          )}
        >
          {svgMarkup ? (
            <div
              aria-label={label}
              className={cn(
                "aspect-square w-full overflow-hidden border border-[rgba(0,0,0,0.16)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24)] [&_svg]:block [&_svg]:h-full [&_svg]:w-full",
                isCoupon ? "rounded-[0.95rem]" : "rounded-[1.45rem]",
                isVip ? "bg-[#f1d39a]" : isCoupon ? "bg-[#f4ead8]" : "bg-[#faf6ee]",
              )}
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          ) : (
            <div
              className={cn(
                "flex aspect-square w-full items-center justify-center border border-[rgba(0,0,0,0.08)] text-center text-sm font-medium",
                isCoupon ? "rounded-[0.95rem]" : "rounded-[1.45rem]",
                isVip
                  ? "bg-[#f1d39a] text-[#2b1d10]"
                  : isCoupon
                    ? "bg-[#f4ead8] text-[#5f4421]"
                    : "bg-[#f2ede3] text-[#6f5b38]",
              )}
            >
              QR in preparazione
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-[rgba(216,176,106,0.7)]">
        {isCoupon ? "Chiave coupon" : isVip ? "Sigillo VIP" : "Sigillo fidelity"}
      </p>
    </div>
  );
}
