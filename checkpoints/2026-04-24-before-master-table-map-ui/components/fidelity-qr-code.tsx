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
          "w-full rounded-[2rem] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.2)]",
          isVip
            ? "border border-[rgba(242,215,165,0.4)] bg-[linear-gradient(145deg,#f6ddb0_0%,#d5a55f_32%,#2b1d10_34%,#0d0906_100%)]"
            : "border border-[rgba(15,13,11,0.08)] bg-[#fcfaf5]",
        )}
      >
        {svgMarkup ? (
          <div
            aria-label={label}
            className={cn(
              "aspect-square w-full overflow-hidden rounded-[1.5rem] [&_svg]:block [&_svg]:h-full [&_svg]:w-full",
              isVip ? "bg-[#f3d79e]" : "bg-[#fcfaf5]",
            )}
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        ) : (
          <div
            className={cn(
              "flex aspect-square w-full items-center justify-center rounded-[1.5rem] text-sm font-medium",
              isVip
                ? "bg-[#f3d79e] text-[#2b1d10]"
                : "bg-[#f2ede3] text-[#6f5b38]",
            )}
          >
            QR in preparazione
          </div>
        )}
      </div>
    </div>
  );
}
