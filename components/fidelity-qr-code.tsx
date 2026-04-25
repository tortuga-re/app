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
  variant?: "default" | "vip";
}) {
  const [svgMarkup, setSvgMarkup] = useState("");
  const isVip = variant === "vip";

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
            light: isVip ? "#f3d79e" : "#fcfaf5",
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
  }, [isVip, value]);

  return (
    <div className="mx-auto flex w-full max-w-[248px] justify-center">
      <div
        className={cn(
          "w-full rounded-[2rem] p-[10px] shadow-[0_18px_40px_rgba(0,0,0,0.26)]",
          isVip
            ? "border border-[rgba(226,194,122,0.44)] bg-[linear-gradient(145deg,#e9c87b_0%,#b67c34_32%,#2c1c0e_36%,#090705_100%)]"
            : "border border-[rgba(171,128,63,0.24)] bg-[linear-gradient(145deg,#d8b06a_0%,#946027_30%,#1f150f_34%,#080706_100%)]",
        )}
      >
        <div className="rounded-[1.6rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,248,230,0.12),rgba(255,248,230,0.02))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          {svgMarkup ? (
            <div
              aria-label={label}
              className={cn(
                "aspect-square w-full overflow-hidden rounded-[1.45rem] border border-[rgba(0,0,0,0.12)] [&_svg]:block [&_svg]:h-full [&_svg]:w-full",
                isVip ? "bg-[#f1d39a]" : "bg-[#faf6ee]",
              )}
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          ) : (
            <div
              className={cn(
                "flex aspect-square w-full items-center justify-center rounded-[1.45rem] border border-[rgba(0,0,0,0.08)] text-sm font-medium",
                isVip
                  ? "bg-[#f1d39a] text-[#2b1d10]"
                  : "bg-[#f2ede3] text-[#6f5b38]",
              )}
            >
              QR in preparazione
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
