"use client";

import { createContext, useContext, useState } from "react";
import { CalendarDays, ExternalLink, X } from "lucide-react";
import { useCurrentCustomerStatus } from "@/components/customer-status-context";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { BrandedIframe } from "@/components/branded-iframe";

const BOOKING_URL = "https://prenotazioni.cooperto.it/in/510b3be7-ed1d-41";
const BookingContext = createContext<{ openBooking: () => void; showBookingButton: boolean; hasUpcomingReservationSoon: boolean }>({
  openBooking: () => undefined,
  showBookingButton: false,
  hasUpcomingReservationSoon: false,
});
export const useBookingOverlay = () => useContext(BookingContext);
 
export function BookingOverlayProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const customer = useCurrentCustomerStatus();
  const { scenario } = useDemoScenario();
  const { hasAccess: hasOnPremiseAccess } = useOnPremiseAccess();
  const fifteenDays = 15 * 24 * 60 * 60 * 1000;
  const hasUpcomingReservationSoon = scenario.enabled
    ? scenario.hasReservation
    : (customer.profile?.upcomingReservations ?? []).some((reservation) => {
        const timestamp = Date.parse(reservation.dateTime);
        const elapsed = timestamp - now;
        return Number.isFinite(timestamp) && elapsed >= 0 && elapsed <= fifteenDays;
      });
  const isOnPremise = scenario.enabled ? scenario.onPremise : hasOnPremiseAccess;
  const showBookingButton = scenario.enabled
    ? !hasUpcomingReservationSoon && !isOnPremise
    : !customer.loading && !hasUpcomingReservationSoon && !isOnPremise;
 
  return <BookingContext.Provider value={{ openBooking: () => setOpen(true), showBookingButton, hasUpcomingReservationSoon }}>
    {children}
    {open ? <div className="booking-overlay" role="dialog" aria-modal="true" aria-label="Prenotazione Tortuga">
      <header><div><CalendarDays size={19} /><span>Prenota al Tortuga</span></div><div className="flex gap-2"><a href={BOOKING_URL} target="_blank" rel="noreferrer" aria-label="Apri nel browser"><ExternalLink size={19} /></a><button onClick={() => setOpen(false)} aria-label="Chiudi prenotazione"><X size={22} /></button></div></header>
      <BrandedIframe src={BOOKING_URL} title="Prenotazione Tortuga" allow="payment" />
    </div> : null}
  </BookingContext.Provider>;
}
