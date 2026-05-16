"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type VerifyStatus =
  | { status: "idle" }
  | { status: "scanning" }
  | { status: "verifying" }
  | { status: "valid"; couponName: string | null; contactName: string | null; couponCode: string }
  | { status: "already_used"; usedAt: string | null; couponCode: string }
  | { status: "expired"; expiredAt: string | null; couponCode: string }
  | { status: "not_found"; couponCode: string }
  | { status: "error"; message: string };

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function VerificaCouponPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [verify, setVerify] = useState<VerifyStatus>({ status: "idle" });
  const [scannerReady, setScannerReady] = useState(false);
  const isScanningRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore
      }
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    isScanningRef.current = false;
  }, []);

  const verifyCoupon = useCallback(
    async (code: string) => {
      if (isScanningRef.current) return;
      isScanningRef.current = true;

      await stopScanner();
      setVerify({ status: "verifying" });

      try {
        const response = await fetch("/api/admin/verify-coupon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codiceCouponContatto: code }),
        });

        const result = (await response.json()) as {
          status: string;
          coupon?: { CodiceCoupon?: string; NomeCoupon?: string; DescrizioneCoupon?: string };
          contactName?: string | null;
          usedAt?: string | null;
          expiredAt?: string | null;
          message?: string;
        };

        if (result.status === "valid") {
          setVerify({
            status: "valid",
            couponName: result.coupon?.NomeCoupon ?? result.coupon?.DescrizioneCoupon ?? null,
            contactName: result.contactName ?? null,
            couponCode: code,
          });
        } else if (result.status === "already_used") {
          setVerify({ status: "already_used", usedAt: result.usedAt ?? null, couponCode: code });
        } else if (result.status === "expired") {
          setVerify({ status: "expired", expiredAt: result.expiredAt ?? null, couponCode: code });
        } else if (result.status === "not_found") {
          setVerify({ status: "not_found", couponCode: code });
        } else {
          setVerify({ status: "error", message: result.message ?? "Errore imprevisto." });
        }
      } catch {
        setVerify({ status: "error", message: "Impossibile raggiungere il server." });
      }
    },
    [stopScanner],
  );

  const startScanner = useCallback(async () => {
    setVerify({ status: "scanning" });
    isScanningRef.current = false;
    setScannerReady(false);

    await new Promise((r) => setTimeout(r, 100));

    const element = document.getElementById("qr-reader");
    if (!element) return;

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (text) => {
          void verifyCoupon(text);
        },
        undefined,
      );
      setScannerReady(true);
    } catch {
      setVerify({ status: "error", message: "Impossibile accedere alla fotocamera." });
    }
  }, [verifyCoupon]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  const reset = useCallback(async () => {
    await stopScanner();
    setVerify({ status: "idle" });
  }, [stopScanner]);

  const isResult = ["valid", "already_used", "expired", "not_found", "error"].includes(
    verify.status,
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-[var(--bg)] px-4 pb-16 pt-12">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="space-y-1 text-center">
          <p className="eyebrow">Plancia Tortuga</p>
          <h1 className="text-3xl font-black text-white">Verifica Coupon</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Scansiona il QR code del coupon per verificarlo e marcarlo come utilizzato.
          </p>
        </div>

        {/* Idle state */}
        {verify.status === "idle" && (
          <div className="panel rounded-[2rem] p-8 text-center space-y-6">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent-soft)]/10 text-5xl">
              🎟️
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Pronto per la scansione</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Premi il pulsante per attivare la fotocamera e scansionare il QR code del coupon.
              </p>
            </div>
            <button
              className="button-primary mx-auto flex min-h-14 w-full items-center justify-center gap-3 text-base"
              onClick={() => void startScanner()}
            >
              <span>📷</span>
              <span>Avvia scanner</span>
            </button>
          </div>
        )}

        {/* Scanner active */}
        {verify.status === "scanning" && (
          <div className="panel rounded-[2rem] p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Scanner attivo</p>
                <h2 className="text-lg font-black text-white">Inquadra il QR code</h2>
              </div>
              <button
                className="button-secondary text-xs"
                onClick={() => void reset()}
              >
                Annulla
              </button>
            </div>

            <div
              className="relative overflow-hidden rounded-[1.5rem] bg-black"
              style={{ aspectRatio: "1/1" }}
            >
              {/* Scanner container — Html5Qrcode injects its video here */}
              <div id="qr-reader" className="h-full w-full" />

              {/* Scan frame overlay */}
              {scannerReady && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-52 w-52 rounded-[1.2rem] border-2 border-[var(--accent-strong)] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                </div>
              )}
            </div>

            <p className="text-center text-xs text-[var(--text-muted)]">
              Il riconoscimento avviene automaticamente quando il QR è inquadrato correttamente.
            </p>
          </div>
        )}

        {/* Verifying */}
        {verify.status === "verifying" && (
          <div className="panel rounded-[2rem] p-8 text-center space-y-6">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[var(--accent-strong)]" />
            <div>
              <h2 className="text-xl font-black text-white">Verifica in corso…</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Controllo validità su Cooperto.
              </p>
            </div>
          </div>
        )}

        {/* VALID */}
        {verify.status === "valid" && (
          <div className="rounded-[2rem] border border-green-500/30 bg-green-500/10 p-8 space-y-5">
            <div className="flex items-start gap-4">
              <span className="text-4xl">✅</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-green-300">
                  Coupon valido — marcato come utilizzato
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  {verify.couponName ?? "Coupon promozionale"}
                </h2>
                {verify.contactName && (
                  <p className="mt-1 text-sm text-green-300">Intestatario: {verify.contactName}</p>
                )}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-green-500/20 bg-black/20 px-4 py-3">
              <p className="text-[11px] text-green-400/70">Codice</p>
              <p className="font-mono text-sm font-bold text-white">{verify.couponCode}</p>
            </div>
            <button className="button-primary w-full" onClick={() => void reset()}>
              Scansiona un altro
            </button>
          </div>
        )}

        {/* ALREADY USED */}
        {verify.status === "already_used" && (
          <div className="rounded-[2rem] border border-yellow-500/30 bg-yellow-500/10 p-8 space-y-5">
            <div className="flex items-start gap-4">
              <span className="text-4xl">⚠️</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">
                  Già utilizzato
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Questo coupon è già stato consumato
                </h2>
                {verify.usedAt && (
                  <p className="mt-2 text-sm text-yellow-300">
                    Utilizzato il: {formatDate(verify.usedAt)}
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-yellow-500/20 bg-black/20 px-4 py-3">
              <p className="text-[11px] text-yellow-400/70">Codice</p>
              <p className="font-mono text-sm font-bold text-white">{verify.couponCode}</p>
            </div>
            <button className="button-secondary w-full" onClick={() => void reset()}>
              Scansiona un altro
            </button>
          </div>
        )}

        {/* EXPIRED */}
        {verify.status === "expired" && (
          <div className="rounded-[2rem] border border-red-500/30 bg-red-500/10 p-8 space-y-5">
            <div className="flex items-start gap-4">
              <span className="text-4xl">⏰</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-300">
                  Scaduto
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Il coupon è scaduto
                </h2>
                {verify.expiredAt && (
                  <p className="mt-2 text-sm text-red-300">
                    Scaduto il: {formatDate(verify.expiredAt)}
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-red-500/20 bg-black/20 px-4 py-3">
              <p className="text-[11px] text-red-400/70">Codice</p>
              <p className="font-mono text-sm font-bold text-white">{verify.couponCode}</p>
            </div>
            <button className="button-secondary w-full" onClick={() => void reset()}>
              Scansiona un altro
            </button>
          </div>
        )}

        {/* NOT FOUND */}
        {verify.status === "not_found" && (
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 space-y-5">
            <div className="flex items-start gap-4">
              <span className="text-4xl">🔍</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Non trovato
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Coupon non riconosciuto
                </h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Il codice scansionato non corrisponde a nessun coupon nel sistema.
                </p>
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[11px] text-[var(--text-muted)]">Codice scansionato</p>
              <p className="font-mono text-sm font-bold text-white break-all">{verify.couponCode}</p>
            </div>
            <button className="button-secondary w-full" onClick={() => void reset()}>
              Riprova
            </button>
          </div>
        )}

        {/* ERROR */}
        {verify.status === "error" && (
          <div className="rounded-[2rem] border border-red-500/20 bg-red-500/5 p-8 space-y-5">
            <div className="flex items-start gap-4">
              <span className="text-4xl">🚨</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--danger)]">
                  Errore
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Qualcosa è andato storto
                </h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{verify.message}</p>
              </div>
            </div>
            <button className="button-secondary w-full" onClick={() => void reset()}>
              Riprova
            </button>
          </div>
        )}

        {/* Tip when result shown */}
        {isResult && verify.status !== "valid" && (
          <p className="text-center text-xs text-[var(--text-muted)]">
            ℹ️ Il coupon{" "}
            {verify.status === "already_used"
              ? "è già stato consumato e non può essere riutilizzato."
              : verify.status === "expired"
                ? "non è più valido per data di scadenza."
                : "non è stato marcato come utilizzato."}
          </p>
        )}
      </div>
    </main>
  );
}
