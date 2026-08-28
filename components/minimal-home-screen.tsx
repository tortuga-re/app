"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, ChevronRight, Clock3, KeyRound, Users, UtensilsCrossed, Wifi } from "lucide-react";
import { LoyaltyJourney } from "@/components/loyalty-journey";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { useBookingOverlay } from "@/components/booking-overlay";
import { useCurrentCustomerStatus } from "@/components/customer-status-context";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { useMenuOverlay } from "@/components/menu-overlay";
import { PwaInstallCard } from "@/components/pwa-install-card";
import { liveGames, type LiveGameState } from "@/lib/live-game";

export function MinimalHomeScreen() {
  const [now] = useState(() => Date.now());
  const { scenario } = useDemoScenario();
  const { openBooking, showBookingButton } = useBookingOverlay();
  const { openMenu } = useMenuOverlay();
  const customer = useCurrentCustomerStatus();
  const { hasAccess: hasOnPremiseAccess } = useOnPremiseAccess();
  const [liveGame, setLiveGame] = useState<LiveGameState | null>(null);
  const hasReservation = scenario.enabled ? scenario.hasReservation : customer.hasReservation;
  const onPremise = scenario.enabled ? scenario.onPremise : hasOnPremiseAccess;
  useEffect(() => { fetch("/api/live-game").then((r) => r.ok ? r.json() : null).then((body) => setLiveGame(body?.game ?? null)).catch(() => setLiveGame(null)); }, []);
  const nextReservation = scenario.enabled && scenario.hasReservation
    ? { dateTime: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(), pax: 4, roomName: "Tavolo Tortuga", stateLabel: "Confermata" }
    : customer.profile?.upcomingReservations[0] ?? null;
  const reservationDate = nextReservation ? new Date(nextReservation.dateTime) : null;
  const reservationDateLabel = reservationDate && !Number.isNaN(reservationDate.getTime())
    ? new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" }).format(reservationDate)
    : "Data da confermare";
  const reservationTimeLabel = reservationDate && !Number.isNaN(reservationDate.getTime())
    ? new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(reservationDate)
    : "Orario da confermare";
  const beforeHighlights = <>
    {nextReservation ? <article className="upcoming-reservation-card"><header><p className="minimal-eyebrow">Prossima prenotazione</p></header><div className="reservation-details"><div><CalendarDays aria-hidden="true" /><span>{reservationDateLabel}</span></div><div><Clock3 aria-hidden="true" /><span>{reservationTimeLabel}</span></div><div><Users aria-hidden="true" /><span>{nextReservation.pax ?? "—"}</span></div></div></article> : null}
    {(onPremise || liveGame?.active_game) ? <div className="home-context-stack">
      {onPremise ? <button type="button" className="menu-context-button" onClick={openMenu}><BookOpen /><div className="flex flex-col text-left py-0.5"><span className="font-serif text-[1.08rem] font-bold text-[var(--text)] leading-tight">Apri menu</span><span className="text-[10px] text-[var(--text-muted)] font-normal leading-normal mt-1 pr-2">Al momento del conto puoi richiederlo e pagare direttamente dal tavolo (con carte e bancomat).</span></div><ChevronRight /></button> : null}
      {liveGame?.active_game ? <section className="game-context-card"><div className="game-context-heading"><div><p className="minimal-eyebrow">Come giocare</p><span>I passaggi vanno eseguiti in ordine</span></div></div><p className="game-wifi-label">COLLEGATI AL WI-FI</p><div className="game-wifi-row"><span><Wifi aria-hidden="true" />TORTUGA</span><span><KeyRound aria-hidden="true" />PERLANERA</span></div><a href={liveGames[liveGame.active_game].url} target="_blank" rel="noreferrer">POI CLICCA QUI <ChevronRight /></a></section> : null}
    </div> : null}
  </>;

  return <section className="minimal-home space-y-5">
    <LoyaltyJourney beforeHighlights={beforeHighlights} />
    <div className="home-actions">
      {showBookingButton ? <button onClick={openBooking}><CalendarDays /><span><strong>Prenota</strong><small>Riserva il tuo tavolo</small></span><ChevronRight /></button> : null}
      <Link href="/info#programmazione"><UtensilsCrossed /><span><strong>Menu e locale</strong><small>Scopri il Tortuga</small></span><ChevronRight /></Link>
    </div>
    <PwaInstallCard />
  </section>;
}
