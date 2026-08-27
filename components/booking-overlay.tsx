"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CalendarDays, ExternalLink, Flag, X } from "lucide-react";
import { useCurrentCustomerStatus } from "@/components/customer-status-context";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { useOnPremiseAccess } from "@/lib/on-premise-access";

const BOOKING_URL = "https://prenotazioni.cooperto.it/in/510b3be7-ed1d-41";
const BookingContext = createContext<{ openBooking: () => void }>({ openBooking: () => undefined });
export const useBookingOverlay = () => useContext(BookingContext);

export function BookingOverlayProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const customer = useCurrentCustomerStatus();
  const { scenario } = useDemoScenario();
  const { hasAccess: hasOnPremiseAccess } = useOnPremiseAccess();
  const hasActiveReservation = scenario.enabled ? scenario.hasReservation : customer.hasReservation;
  const isOnPremise = scenario.enabled ? scenario.onPremise : hasOnPremiseAccess;
  const showBookingButton = scenario.enabled
    ? !hasActiveReservation && !isOnPremise
    : !customer.loading && !hasActiveReservation && !isOnPremise;

  useEffect(() => {
    let expandTimer: number | undefined;
    const handleScroll = () => {
      setCompact(true);
      if (expandTimer) window.clearTimeout(expandTimer);
      expandTimer = window.setTimeout(() => setCompact(false), 1500);
    };
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      if (expandTimer) window.clearTimeout(expandTimer);
    };
  }, []);

  return <BookingContext.Provider value={{ openBooking: () => setOpen(true) }}>
    {children}
    {showBookingButton ? <button className={`booking-fab${compact ? " compact" : ""}`} onClick={() => setOpen(true)} aria-label="Prenota"><Flag size={19} fill="currentColor" /><span>PRENOTA</span></button> : null}
    {open ? <div className="booking-overlay" role="dialog" aria-modal="true" aria-label="Prenotazione Tortuga">
      <header><div><CalendarDays size={19} /><span>Prenota al Tortuga</span></div><div className="flex gap-2"><a href={BOOKING_URL} target="_blank" rel="noreferrer" aria-label="Apri nel browser"><ExternalLink size={19} /></a><button onClick={() => setOpen(false)} aria-label="Chiudi prenotazione"><X size={22} /></button></div></header>
      <iframe src={BOOKING_URL} title="Prenotazione Tortuga" allow="payment" />
    </div> : null}
  </BookingContext.Provider>;
}
