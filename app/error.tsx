"use client";

import { useEffect } from "react";

const RECOVERY_KEY = "tortuga.error-recovery-at";
const RECOVERY_COOLDOWN_MS = 15_000; // Non più di 1 reload automatico ogni 15 secondi

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page Error Boundary caught:", error);

    const isChunkError =
      error.message.includes("chunk") ||
      error.message.includes("Load failed") ||
      error.message.includes("ChunkLoad") ||
      error.message.includes("404") ||
      error.message.includes("unexpected token '<'") ||
      error.message.includes("Failed to fetch dynamically imported module");

    if (!isChunkError) return;

    // Anti-loop guard: non ricaricare se abbiamo già provato di recente
    const lastRecovery = Number(sessionStorage.getItem(RECOVERY_KEY) ?? "0");
    const now = Date.now();

    if (now - lastRecovery < RECOVERY_COOLDOWN_MS) {
      // Siamo in loop — smetti di ricaricare e mostra il pulsante manuale
      console.warn("Rilevato possibile loop di ricarica. Recupero automatico sospeso.");
      return;
    }

    sessionStorage.setItem(RECOVERY_KEY, String(now));

    // Deregistra il SW e ricarica per forzare i nuovi chunk
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
        // Pulisci anche la cache del browser
        if ("caches" in window) {
          caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
        }
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  }, [error]);

  const handleManualReload = () => {
    // Click manuale: resetta il counter e ricarica sempre
    sessionStorage.removeItem(RECOVERY_KEY);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
        if ("caches" in window) {
          caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
        }
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center text-white">
      <h2 className="mb-4 text-xl font-bold text-[var(--accent-strong)]">
        Aggiornamento in corso
      </h2>
      <p className="mb-8 text-sm text-white/60">
        Stiamo caricando l&apos;ultima versione dell&apos;app per garantirti la massima stabilità.
      </p>
      <button
        onClick={handleManualReload}
        className="button-primary px-8 py-3"
      >
        Aggiorna ora
      </button>
    </div>
  );
}
