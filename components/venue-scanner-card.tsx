"use client";

import { useState } from "react";
import { triggerHaptic } from "@/lib/haptics";
import { QRScanner } from "@/components/QRScanner";

export function VenueScannerCard({
  onScanSuccess,
}: {
  onScanSuccess?: () => void;
}) {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <div className="panel parchment-texture rounded-[2.15rem] border border-[rgba(216,176,106,0.28)] bg-[radial-gradient(circle_at_top,rgba(255,216,156,0.16),rgba(19,14,10,0.98)_42%,rgba(10,8,7,1)_100%)] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow text-[var(--accent-strong)]">Sei al Tortuga?</p>
          <h2 className="text-2xl font-semibold leading-tight text-white">
            Scannerizza il QR del tavolo per sbloccare il menu ed i giochi live!
          </h2>
        </div>

        <span className="rounded-full border border-[rgba(255,216,156,0.24)] bg-[rgba(255,255,255,0.05)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          Live access
        </span>
      </div>

      <div className="mt-5 rounded-[1.6rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3">
        {showScanner ? (
          <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
            <QRScanner
              onSuccess={() => {
                setShowScanner(false);
                onScanSuccess?.();
              }}
              onCancel={() => setShowScanner(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            className="button-primary cta-glow inline-flex min-h-12 w-full items-center justify-center px-5 text-sm"
            onClick={() => {
              triggerHaptic();
              setShowScanner(true);
            }}
          >
            Scannerizza QR
          </button>
        )}
      </div>
    </div>
  );
}
