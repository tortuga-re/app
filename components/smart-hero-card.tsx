"use client";

import Link from "next/link";
import { triggerHaptic } from "@/lib/haptics";
import type { UpcomingReservation } from "@/lib/cooperto/types";

export function SmartHeroCard({
  hasMenuAccess,
  reservation,
  activeCouponsCount,
}: {
  hasMenuAccess: boolean;
  reservation: UpcomingReservation | null;
  activeCouponsCount: number;
}) {
  const hasFutureReservation = Boolean(reservation);
  const isTonight = reservation
    ? new Date(reservation.dateTime).toDateString() === new Date().toDateString()
    : false;

  const title = hasMenuAccess
    ? "Sei a bordo."
    : hasFutureReservation
      ? isTonight
        ? "Hai una prenotazione stasera."
        : "Hai una rotta gia fissata."
      : activeCouponsCount > 0 ? `Hai ${activeCouponsCount} coupon pronti.` : "Pronti a salpare di nuovo?";

  const description = hasMenuAccess
    ? "Modalita locale attiva: menu, giochi e promo sono a un tap dalla tua mano."
    : hasFutureReservation
      ? isTonight
        ? "Controlla la tua rotta, arriva al tavolo giusto e tieniti pronto per i giochi live."
        : "Hai gia una prenotazione futura: qui sotto trovi tutti i dettagli della tua prossima rotta."
      : activeCouponsCount > 0
        ? "Hai già bottino da spendere: tieni d'occhio la prossima serata utile."
        : "Prenotazioni, coupon e giochi live compariranno qui nel momento giusto.";

  return (
    <div className="panel rounded-[2rem] border-[var(--accent-strong)]/25 bg-[var(--accent-soft)]/6 p-5">
      <div className="space-y-2">
        <p className="eyebrow">Rotta del momento</p>
        <h2 className="text-2xl font-semibold leading-tight text-white">{title}</h2>
        <p className="text-sm leading-6 text-[var(--text-muted)]">{description}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {hasMenuAccess ? (
          <>
            <Link
              href="/ciurma#sfide"
              className="button-primary inline-flex min-h-12 items-center justify-center px-5 text-sm"
              onClick={() => triggerHaptic()}
            >
              Apri modalita locale
            </Link>
            <Link
              href="/sedi"
              className="button-secondary inline-flex min-h-12 items-center justify-center px-5 text-sm"
              onClick={() => triggerHaptic()}
            >
              Info tavoli e spazi
            </Link>
          </>
        ) : hasFutureReservation ? (
          <>
            <Link
              href="#prossima-prenotazione"
              className="button-primary inline-flex min-h-12 items-center justify-center px-5 text-sm"
              onClick={() => triggerHaptic()}
            >
              Vedi prenotazione
            </Link>
            {isTonight ? (
              <Link
                href="/sedi"
                className="button-secondary inline-flex min-h-12 items-center justify-center px-5 text-sm"
                onClick={() => triggerHaptic()}
              >
                Come arrivare
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <Link
              href="/prenota#booking-form"
              className="button-primary inline-flex min-h-12 items-center justify-center px-5 text-sm"
              onClick={() => triggerHaptic()}
            >
              Prenota adesso
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
