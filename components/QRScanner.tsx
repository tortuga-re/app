"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { writeStoredOnPremiseAccessExpiry, onPremiseAccessDurationMs } from "@/lib/on-premise-access";

const VENUE_QR_URL = "https://www.cooperto.link/ac6cdf";

interface QRScannerProps {
  /** Called when the venue QR is successfully scanned. Optionally receives the detected table number. */
  onSuccess: (tableNumber?: string) => void;
  /** Called if user cancels / closes the scanner */
  onCancel: () => void;
}

export function QRScanner({ onSuccess, onCancel }: QRScannerProps) {
  const qrRef = useRef<Html5Qrcode | null>(null);
  const stopRequestedRef = useRef(false);
  const containerId = "qr-reader-container";

  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  const handleSuccess = useCallback((scannedUrl: string) => {
    stopRequestedRef.current = true;
    if (qrRef.current) {
      qrRef.current.stop().catch(() => {
        // The scanner may already have been stopped by a concurrent cleanup.
      });
    }
    setScanning(false);

    // Extract table number if present
    let tableNumber = "";
    if (scannedUrl) {
      try {
        const url = new URL(scannedUrl);
        tableNumber = url.searchParams.get("t") || url.searchParams.get("table") || "";
      } catch (e) {
        console.error("Error parsing scanned URL", e);
      }
    }

    // Grant 4h venue access
    writeStoredOnPremiseAccessExpiry(Date.now() + onPremiseAccessDurationMs);
    setTimeout(() => onSuccess(tableNumber), 600);
  }, [onSuccess]);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(containerId);
    qrRef.current = html5QrCode;
    stopRequestedRef.current = false;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        if (decodedText === VENUE_QR_URL || decodedText.startsWith(VENUE_QR_URL)) {
          handleSuccess(decodedText);
        }
      },
      undefined
    ).catch((err) => {
      console.error("QR Error", err);
      setError("Impossibile avviare la fotocamera. Controlla i permessi o prova a ricaricare.");
    });

    return () => {
      stopRequestedRef.current = true;
      if (qrRef.current) {
        qrRef.current.stop().catch(() => {
          // React dev mode can unmount twice or stop after success; ignore.
        });
      }
    };
  }, [handleSuccess]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <span className="text-4xl">📷</span>
        <p className="text-sm text-[var(--text-muted)]">{error}</p>
        <a
          href={`${VENUE_QR_URL}?redirect=${encodeURIComponent(window.location.href)}`}
          className="button-primary block w-full py-3 text-sm font-black uppercase text-center"
          onClick={() => {
            writeStoredOnPremiseAccessExpiry(Date.now() + onPremiseAccessDurationMs);
          }}
        >
          Apri Check-in Manuale
        </a>
        <button onClick={onCancel} className="text-xs text-[var(--text-muted)] underline">Annulla</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full aspect-square max-w-[300px] rounded-2xl overflow-hidden bg-black border-2 border-[var(--accent-strong)]">
        <div id={containerId} className="w-full h-full" />
        
        {/* Viewfinder overlay (css only) */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-48 h-48 relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[var(--accent-strong)] rounded-tl-md" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[var(--accent-strong)] rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[var(--accent-strong)] rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[var(--accent-strong)] rounded-br-md" />
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--accent-strong)] animate-[scanline_2s_linear_infinite] shadow-[0_0_6px_2px_rgba(216,176,106,0.6)]" />
            </div>
          </div>
        )}

        {!scanning && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center z-20">
            <span className="text-6xl">✅</span>
          </div>
        )}
      </div>

      <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest text-center">
        Punta la fotocamera sul QR del tuo tavolo
      </p>

      <button onClick={onCancel} className="text-xs text-[var(--text-muted)] underline">
        Annulla
      </button>

      <style>{`
        @keyframes scanline {
          0% { top: 0; }
          50% { top: calc(100% - 2px); }
          100% { top: 0; }
        }
        #qr-reader-container video {
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
}
