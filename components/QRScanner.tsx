"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { writeStoredOnPremiseAccessExpiry, onPremiseAccessDurationMs } from "@/lib/on-premise-access";

const VENUE_QR_URL = "https://www.cooperto.link/ac6cdf";

interface QRScannerProps {
  /** Called when the venue QR is successfully scanned. Optionally receives the detected table number. */
  onSuccess: (tableNumber?: string) => void;
  /** Called if user cancels / closes the scanner */
  onCancel: () => void;
}

export function QRScanner({ onSuccess, onCancel }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const handleSuccess = useCallback((scannedUrl?: string) => {
    stopCamera();
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
  }, [stopCamera, onSuccess]);

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        scan();
      } catch {
        setError("Impossibile accedere alla fotocamera. Controlla i permessi.");
      }
    };

    const scan = () => {
      if (!mounted) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { rafRef.current = requestAnimationFrame(scan); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Try BarcodeDetector API (Chrome/Android)
      if ("BarcodeDetector" in window) {
        // @ts-expect-error BarcodeDetector not in TS lib
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        detector.detect(canvas).then((barcodes: Array<{ rawValue: string }>) => {
          if (!mounted) return;
          for (const barcode of barcodes) {
            const val = barcode.rawValue.trim();
            if (val === VENUE_QR_URL || val.startsWith(VENUE_QR_URL)) {
              handleSuccess(val);
              return;
            }
          }
          rafRef.current = requestAnimationFrame(scan);
        }).catch(() => {
          rafRef.current = requestAnimationFrame(scan);
        });
      } else {
        // Fallback: ask user to point to the QR - no native decode available
        // Show manual link instead
        setError("Il tuo browser non supporta la scansione automatica. Tocca il pulsante qui sotto.");
        stopCamera();
      }
    };

    startCamera();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [handleSuccess, stopCamera]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <span className="text-4xl">📷</span>
        <p className="text-sm text-[var(--text-muted)]">{error}</p>
        <a
          href={`${VENUE_QR_URL}?redirect=${encodeURIComponent(window.location.href)}`}
          className="button-primary block w-full py-3 text-sm font-black uppercase text-center"
          onClick={() => {
            // Grant access anyway since they clicked the link
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
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 relative">
            {/* Corners */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[var(--accent-strong)] rounded-tl-md" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[var(--accent-strong)] rounded-tr-md" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[var(--accent-strong)] rounded-bl-md" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[var(--accent-strong)] rounded-br-md" />
            {/* Scan line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--accent-strong)] animate-[scanline_2s_linear_infinite] shadow-[0_0_6px_2px_rgba(216,176,106,0.6)]" />
          </div>
        </div>

        {!scanning && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <span className="text-6xl">✅</span>
          </div>
        )}
      </div>

      <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest text-center">
        Punta la fotocamera sul QR del tuo tavolo
      </p>

      <button onClick={() => { stopCamera(); onCancel(); }} className="text-xs text-[var(--text-muted)] underline">
        Annulla
      </button>

      <style>{`
        @keyframes scanline {
          0% { top: 0; }
          50% { top: calc(100% - 2px); }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
}
