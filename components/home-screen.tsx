"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, CalendarDays, ChevronRight, Clock3, Gift, Users, UtensilsCrossed } from "lucide-react";
import { LoyaltyJourney } from "@/components/loyalty-journey";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { useCurrentCustomerStatus } from "@/components/customer-status-context";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { useMenuOverlay } from "@/components/menu-overlay";
import { PwaInstallCard } from "@/components/pwa-install-card";
import { formatInRome, formatTime } from "@/lib/utils";

export function HomeScreen() {
  const [now] = useState(() => Date.now());
  const { scenario } = useDemoScenario();
  const { openMenu, menuCtaRef } = useMenuOverlay();
  const customer = useCurrentCustomerStatus();
  const { hasAccess: hasOnPremiseAccess } = useOnPremiseAccess();
  const onPremise = scenario.enabled ? scenario.enabled && scenario.onPremise : hasOnPremiseAccess;
  const nextReservation = scenario.enabled && scenario.hasReservation
    ? { dateTime: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(), pax: 4, roomName: "Tavolo Tortuga", stateLabel: "Confermata" }
    : customer.profile?.upcomingReservations[0] ?? null;
  const reservationDate = nextReservation ? new Date(nextReservation.dateTime) : null;
  const reservationDateLabel = reservationDate && !Number.isNaN(reservationDate.getTime())
    ? formatInRome(reservationDate, { weekday: "short", day: "numeric", month: "short" })
    : "Data da confermare";
  const reservationTimeLabel = reservationDate && !Number.isNaN(reservationDate.getTime())
    ? formatTime(reservationDate.toISOString())
    : "Orario da confermare";
  const beforeHighlights = (
    <>
      {nextReservation ? (
        <article className="upcoming-reservation-card">
          <header>
            <p className="minimal-eyebrow">Prossima prenotazione</p>
          </header>
          <div className="reservation-details">
            <div>
              <CalendarDays aria-hidden="true" />
              <span>{reservationDateLabel}</span>
            </div>
            <div>
              <Clock3 aria-hidden="true" />
              <span>{reservationTimeLabel}</span>
            </div>
            <div>
              <Users aria-hidden="true" />
              <span>{nextReservation.pax ?? "—"}</span>
            </div>
          </div>
        </article>
      ) : null}
      {onPremise ? (
        <div className="home-context-stack">
          <button ref={menuCtaRef} type="button" className="menu-context-button" onClick={openMenu}>
            <BookOpen />
            <div className="flex flex-col text-left py-0.5">
              <span className="font-serif text-[1.08rem] font-bold text-[var(--text)] leading-tight">Apri menu</span>
              <span className="text-[10px] text-[var(--text-muted)] font-normal leading-normal mt-1 pr-2">
                Al momento del conto puoi richiederlo e pagare direttamente dal tavolo (con carte e bancomat).
              </span>
            </div>
            <ChevronRight />
          </button>
        </div>
      ) : null}
    </>
  );

  return (
    <section className="minimal-home space-y-5">
      <LoyaltyJourney beforeHighlights={beforeHighlights} />
      <div className="home-actions">
        <Link href="/gift">
          <Gift />
          <span>
            <strong>Gift</strong>
            <small>Regala Tortuga</small>
          </span>
          <ChevronRight />
        </Link>
        <Link href="/info#programmazione">
          <UtensilsCrossed />
          <span>
            <strong>Menu e locale</strong>
            <small>Scopri il Tortuga</small>
          </span>
          <ChevronRight />
        </Link>
      </div>
      <PwaInstallCard />
    </section>
  );
}
