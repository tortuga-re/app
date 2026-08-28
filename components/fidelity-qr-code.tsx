"use client";

import { useEffect, useRef, useState } from "react";

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
  const [shouldRenderQr, setShouldRenderQr] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const isVip = variant === "vip";
  const isCoupon = variant === "coupon";

  useEffect(() => {
    const element = viewportRef.current;

    if (!element || shouldRenderQr) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          setShouldRenderQr(true);
          observer.disconnect();
        }
      },
      {
        threshold: [0.55],
        rootMargin: "-18% 0px -18% 0px",
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [shouldRenderQr, value]);

  useEffect(() => {
    if (!shouldRenderQr) {
      return;
    }

    let cancelled = false;

    void import("qrcode")
      .then(async (qrCode) =>
        qrCode.toString(value, {
          type: "svg",
          margin: 2,
          width: 240,
          color: {
            dark: "#111311",
            light: "#fffdf8",
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
  }, [isCoupon, isVip, shouldRenderQr, value]);

  return (
    <div
      ref={viewportRef}
      className={cn(
        "fidelity-qr-code",
        isVip && "fidelity-qr-code-vip",
        isCoupon && "fidelity-qr-code-coupon",
      )}
    >
      <div className="fidelity-qr-frame">
          {svgMarkup && shouldRenderQr ? (
            <div
              aria-label={label}
              className="fidelity-qr-image"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          ) : (
            <div className="fidelity-qr-placeholder">
              {shouldRenderQr ? "QR in preparazione" : "Caricamento tessera"}
            </div>
          )}
      </div>
      <p>
        {isCoupon ? "Coupon Tortuga" : isVip ? "Tessera Fidelity · VIP" : "Tessera Fidelity Tortuga"}
      </p>
    </div>
  );
}
