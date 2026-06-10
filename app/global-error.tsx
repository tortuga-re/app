"use client";

import { useEffect } from "react";

const RECOVERY_KEY = "tortuga.global-error-recovery-at";
const RECOVERY_COOLDOWN_MS = 15_000;

const isChunkRecoveryError = (message: string) =>
  message.includes("chunk") ||
  message.includes("Load failed") ||
  message.includes("ChunkLoad") ||
  message.includes("404") ||
  message.includes("unexpected token '<'") ||
  message.includes("Failed to fetch dynamically imported module");

const recoverFromChunkError = async () => {
  if (typeof window === "undefined") {
    return false;
  }

  const lastRecovery = Number(sessionStorage.getItem(RECOVERY_KEY) ?? "0");
  const now = Date.now();

  if (now - lastRecovery < RECOVERY_COOLDOWN_MS) {
    return false;
  }

  sessionStorage.setItem(RECOVERY_KEY, String(now));

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Ignore cleanup failures and continue with reload.
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Ignore cache cleanup failures and continue with reload.
  }

  window.location.reload();
  return true;
};

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary caught:", error);

    if (!isChunkRecoveryError(error.message)) {
      return;
    }

    void recoverFromChunkError();
  }, [error]);

  const handleManualReload = () => {
    sessionStorage.removeItem(RECOVERY_KEY);
    void recoverFromChunkError();
  };

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-center text-white">
          <h2 className="mb-4 text-2xl font-bold text-[var(--accent-strong)]">
            Rotta smarrita...
          </h2>
          <p className="mb-8 text-sm text-white/60">
            Stiamo ricalcolando la rotta per te. Un attimo di pazienza.
          </p>
          <button onClick={handleManualReload} className="button-primary px-8 py-3">
            Ricarica ora
          </button>
        </div>
      </body>
    </html>
  );
}
