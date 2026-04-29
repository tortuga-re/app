"use client";

import { useState } from "react";

import { FidelityQrCode } from "@/components/fidelity-qr-code";
import type {
  FidelityActivationResponse,
  ProfileResponse,
} from "@/lib/cooperto/types";
import { triggerHaptic } from "@/lib/haptics";

const automaticActivationError =
  "Non siamo riusciti ad attivare la card in automatico. Chiedi a un pirata.";

type FidelityActivationPanelProps = {
  contactCode: string;
  activeCardCode: string;
  qrLabel: string;
  onActivated: (profile: ProfileResponse) => void;
};

export function FidelityActivationPanel({
  contactCode,
  activeCardCode,
  qrLabel,
  onActivated,
}: FidelityActivationPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasCard = Boolean(activeCardCode);

  const activateCard = async () => {
    if (loading || hasCard) {
      return;
    }

    if (!contactCode.trim()) {
      setError(automaticActivationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/profile/fidelity/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contactCode }),
      });
      const body = (await response.json().catch(() => null)) as
        | (FidelityActivationResponse & { error?: string })
        | null;

      if (!response.ok || !body?.profile) {
        throw new Error(
          body?.error ||
            automaticActivationError,
        );
      }

      onActivated(body.profile);
    } catch (activationError) {
      setError(
        activationError instanceof Error
          ? activationError.message
          : automaticActivationError,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel-muted rounded-[1.7rem] px-4 py-4">
      {hasCard ? (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_148px] sm:items-center">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Ciurma Card attiva
            </p>
            <h3 className="text-xl font-semibold text-white">
              Il tuo QR personale e pronto.
            </h3>
            <p className="text-sm leading-6 text-[var(--text-muted)]">
              Mostralo quando serve per agganciare punti e riconoscimento.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[rgba(216,176,106,0.18)] bg-black/20 px-3 py-3">
            <FidelityQrCode
              key={activeCardCode}
              value={activeCardCode}
              label={qrLabel}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-[rgba(216,176,106,0.34)] bg-[radial-gradient(circle_at_35%_25%,rgba(242,215,165,0.18),rgba(35,20,12,0.92)_66%)] text-5xl font-light text-[var(--accent-strong)] shadow-[inset_0_0_24px_rgba(216,176,106,0.08),0_18px_44px_rgba(0,0,0,0.42)] sm:mx-0">
            +
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Attiva la tua Ciurma Card
              </p>
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                Ti assegniamo subito il tuo QR personale.
              </p>
            </div>

            {error ? (
              <p className="rounded-[1rem] border border-[rgba(240,139,117,0.22)] bg-[rgba(240,139,117,0.08)] px-3 py-2 text-sm leading-5 text-[var(--danger)]">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              className="button-primary inline-flex min-h-11 w-full items-center justify-center px-5 text-sm sm:w-auto"
              onClick={() => {
                triggerHaptic();
                void activateCard();
              }}
              disabled={loading}
            >
              {loading ? "Sto incidendo la tua Ciurma Card..." : "Attiva ora"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
