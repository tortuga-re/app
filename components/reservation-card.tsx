"use client";

import Link from "next/link";
import { triggerHaptic } from "@/lib/haptics";
import type { UpcomingReservation } from "@/lib/cooperto/types";

export type RouteFallback = {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

const getReservationManageHref = () => null;

const formatRouteDate = (value: string) =>
  new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(value));

const formatRouteTime = (value: string) =>
  new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

function ReservationStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-muted rounded-[1.45rem] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export function ReservationCard({
  reservation,
  fallback,
}: {
  reservation: UpcomingReservation | null;
  fallback: RouteFallback;
}) {
  const manageHref = getReservationManageHref();

  return (
    <div className="panel parchment-texture rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">Prossima prenotazione</p>
          {!reservation ? (
            <>
              <h2 className="text-2xl font-semibold leading-tight text-white">
                {fallback.title}
              </h2>
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                {fallback.description}
              </p>
            </>
          ) : null}
        </div>

        {reservation?.stateLabel ? (
          <span className="rounded-full border border-[rgba(171,128,63,0.22)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            {reservation.stateLabel}
          </span>
        ) : null}
      </div>

      {reservation ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <ReservationStat label="Stato" value={reservation.stateLabel} />
            <ReservationStat label="Data" value={formatRouteDate(reservation.dateTime)} />
            <ReservationStat label="Ora" value={formatRouteTime(reservation.dateTime)} />
            <ReservationStat
              label="Persone"
              value={
                reservation.pax ? `${reservation.pax} persone` : "Dato non disponibile"
              }
            />
            {reservation.roomName ? (
              <div className="col-span-2">
                <ReservationStat label="Sala" value={reservation.roomName} />
              </div>
            ) : null}
          </div>

          {manageHref ? (
            <a
              href={manageHref}
              target="_blank"
              rel="noreferrer"
              className="button-primary mt-5 inline-flex min-h-12 items-center justify-center px-5 text-sm"
              onClick={() => triggerHaptic()}
            >
              Modifica/Annulla prenotazione
            </a>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
              Modifica e annullo compariranno qui appena Cooperto espone un link diretto.
            </p>
          )}
        </>
      ) : (
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={fallback.primaryHref}
            className="button-primary inline-flex min-h-12 items-center justify-center px-5 text-sm"
            onClick={() => triggerHaptic()}
          >
            {fallback.primaryLabel}
          </Link>
          {fallback.secondaryHref ? (
            <Link
              href={fallback.secondaryHref}
              className="button-secondary inline-flex min-h-12 items-center justify-center px-5 text-sm"
              onClick={() => triggerHaptic()}
            >
              {fallback.secondaryLabel}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
