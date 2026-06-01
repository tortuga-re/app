"use client";

import Link from "next/link";
import type { BookingCreateResponse } from "@/lib/cooperto/types";
import { triggerHaptic } from "@/lib/haptics";

type BookingSuccessViewProps = {
  success: BookingCreateResponse;
  successDateLabel: string;
  successTimeLabel: string;
  onReset: () => void;
};

export function BookingSuccessView({
  success,
  successDateLabel,
  successTimeLabel,
  onReset,
}: BookingSuccessViewProps) {
  return (
    <div
      id="prenotazione-completata"
      className="panel parchment-texture rounded-[2rem] p-6 text-center animate-in zoom-in duration-500"
    >
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(145deg,#ead092_0%,#b98036_100%)] shadow-[0_0_30px_rgba(216,176,106,0.4)]">
        <svg
          viewBox="0 0 24 24"
          className="h-10 w-10 text-[#21170e]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <div className="space-y-3">
        <p className="eyebrow text-[var(--accent-strong)]">Patto di Ciurma sigillato</p>
        <h2 className="text-3xl font-bold text-white">
          {success.reservation.LabelStato || "Ti aspettiamo a bordo!"}
        </h2>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          La tua richiesta e arrivata al capitano. Riceverai presto una pergamena di conferma via email.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="panel-muted rounded-[1.45rem] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Data
          </p>
          <p className="mt-1 text-sm font-bold text-white">{successDateLabel}</p>
        </div>
        <div className="panel-muted rounded-[1.45rem] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Ora
          </p>
          <p className="mt-1 text-sm font-bold text-white">{successTimeLabel}</p>
        </div>
        <div className="panel-muted rounded-[1.45rem] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Persone
          </p>
          <p className="mt-1 text-sm font-bold text-white">{success.reservation.Pax}</p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <Link
          href="/ciurma#riconoscimento"
          className="button-primary flex min-h-12 w-full items-center justify-center px-5 text-sm"
          onClick={() => triggerHaptic()}
        >
          Gestisci la tua prenotazione
        </Link>

        <button
          type="button"
          className="button-secondary flex min-h-12 w-full items-center justify-center px-5 text-sm"
          onClick={() => {
            triggerHaptic();
            onReset();
          }}
        >
          Fai un&apos;altra prenotazione
        </button>
      </div>
    </div>
  );
}
