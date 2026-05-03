"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log dell'errore per debug (opzionale)
    console.error("Global Error Boundary caught:", error);
    
    // Se è un errore di caricamento (tipico post-deploy), ricarichiamo la pagina
    if (
      error.message.includes("chunk") || 
      error.message.includes("Load failed") ||
      error.message.includes("404") ||
      error.message.includes("unexpected token '<'")
    ) {
      window.location.reload();
    }
  }, [error]);

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
          <button
            onClick={() => window.location.reload()}
            className="button-primary px-8 py-3"
          >
            Ricarica ora
          </button>
        </div>
      </body>
    </html>
  );
}
