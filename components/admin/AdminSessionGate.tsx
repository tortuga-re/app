"use client";

import { useState } from "react";
import Link from "next/link";

import { StatusBlock } from "@/components/status-block";
import { useAdminSession } from "@/lib/admin/use-admin-session";
import { triggerHaptic } from "@/lib/haptics";

export function AdminSessionGate({ children }: { children: React.ReactNode }) {
  const { authenticated, loading, error, login } = useAdminSession();
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <StatusBlock
          variant="loading"
          title="Sto preparando la plancia"
          description="Verifico la sessione admin e carico gli strumenti di bordo."
        />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6">
        <div className="panel w-full rounded-[2.4rem] p-8 text-center">
          <div className="space-y-3">
            <p className="eyebrow">Plancia Admin</p>
            <h1 className="text-3xl font-black uppercase italic text-white">
              Accesso Capitano
            </h1>
            <p className="text-sm leading-6 text-[var(--text-muted)]">
              Inserisci il PIN admin unico per sbloccare tutta la console operativa.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="••••"
              className="field text-center text-3xl font-black tracking-[0.6em]"
            />

            {error ? (
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--danger)]">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              className="button-primary w-full py-4 text-sm font-black uppercase tracking-[0.2em]"
              disabled={submitting || !pin.trim()}
              onClick={async () => {
                triggerHaptic();
                setSubmitting(true);
                await login(pin);
                setSubmitting(false);
              }}
            >
              {submitting ? "Verifica in corso..." : "Apri plancia"}
            </button>
          </div>

          <Link
            href="/"
            className="mt-5 inline-flex text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-strong)] hover:underline"
          >
            Torna alla base
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
