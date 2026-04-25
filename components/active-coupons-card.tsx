"use client";

import { useState } from "react";

import { FidelityQrCode } from "@/components/fidelity-qr-code";
import {
  formatCouponExpiry,
  getCouponDisplayCode,
  getCouponQrValue,
} from "@/lib/customer-profile";
import type { CoopertoCoupon } from "@/lib/cooperto/types";
import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type ActiveCouponsCardProps = {
  coupons: CoopertoCoupon[];
  description?: string;
  emptyMessage: string;
  title?: string;
  className?: string;
};

const getCouponTitle = (coupon: CoopertoCoupon) =>
  coupon.CodiceCoupon?.trim() || getCouponDisplayCode(coupon);

function CouponPreview({
  coupon,
  compact = false,
}: {
  coupon: CoopertoCoupon;
  compact?: boolean;
}) {
  const title = getCouponTitle(coupon);
  const displayCode = getCouponDisplayCode(coupon);
  const qrValue = getCouponQrValue(coupon);

  return (
    <div
      className={cn(
        "rounded-[1.7rem] border border-[rgba(255,216,156,0.12)] bg-[rgba(255,255,255,0.04)] px-4 py-4",
        compact && "rounded-[1.5rem]",
      )}
    >
      <div
        className={cn(
          "grid items-center gap-4",
          qrValue ? "sm:grid-cols-[minmax(0,1fr)_152px]" : "",
        )}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[rgba(255,216,156,0.12)] bg-white/6 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
              Coupon attivo
            </span>
            {coupon.DataScadenza ? (
              <span className="rounded-full border border-[rgba(255,216,156,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Scade {formatCouponExpiry(coupon.DataScadenza)}
              </span>
            ) : null}
          </div>

          <div>
            <p className="text-lg font-semibold text-white">{title}</p>
            {displayCode !== title ? (
              <p className="mt-1 break-all text-sm leading-6 text-[var(--text-muted)]">
                Codice: <span className="text-white">{displayCode}</span>
              </p>
            ) : null}
          </div>
        </div>

        {qrValue ? (
          <div className="mx-auto w-full max-w-[152px]">
            <FidelityQrCode
              key={`${displayCode}-${coupon.DataScadenza ?? "no-date"}`}
              value={qrValue}
              label={`QR coupon ${displayCode}`}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ActiveCouponsCard({
  coupons,
  description,
  emptyMessage,
  title = "Coupon attivi",
  className,
}: ActiveCouponsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const primaryCoupon = coupons[0] ?? null;
  const extraCoupons = coupons.slice(1);

  return (
    <div className={cn("panel rounded-[2rem] p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">{title}</p>
            <span className="rounded-full border border-[rgba(255,216,156,0.1)] bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              {coupons.length}
            </span>
          </div>
          {description ? (
            <p className="text-sm leading-6 text-[var(--text-muted)]">{description}</p>
          ) : null}
        </div>

        {extraCoupons.length > 0 ? (
          <button
            type="button"
            className="button-secondary inline-flex min-h-10 items-center justify-center px-4 text-xs"
            onClick={() => {
              triggerHaptic();
              setIsExpanded((current) => !current);
            }}
          >
            {isExpanded ? "Richiudi" : `Apri +${extraCoupons.length}`}
          </button>
        ) : null}
      </div>

      {primaryCoupon ? (
        <div className="mt-4 space-y-3">
          <CouponPreview coupon={primaryCoupon} />

          {isExpanded
            ? extraCoupons.map((coupon) => (
                <CouponPreview
                  key={`${getCouponDisplayCode(coupon)}-${coupon.DataScadenza ?? "no-date"}`}
                  coupon={coupon}
                  compact
                />
              ))
            : null}
        </div>
      ) : (
        <div className="mt-4 rounded-[1.6rem] border border-[rgba(255,216,156,0.12)] bg-white/4 px-4 py-4">
          <p className="text-sm leading-6 text-[var(--text-muted)]">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
