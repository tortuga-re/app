"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page Error Boundary caught:", error);
    
    // Auto-recovery for common post-deploy errors + SW purge
    if (
      error.message.includes("chunk") || 
      error.message.includes("Load failed") ||
      error.message.includes("404") ||
      error.message.includes("unexpected token '<'")
    ) {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center text-white">
      <h2 className="mb-4 text-xl font-bold text-[var(--accent-strong)]">
        Aggiornamento in corso
      </h2>
      <p className="mb-8 text-sm text-white/60">
        Stiamo caricando l&apos;ultima versione dell&apos;app per garantirti la massima stabilità.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="button-primary px-8 py-3"
      >
        Aggiorna ora
      </button>
    </div>
  );
}
