"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type RefCallback } from "react";
import { CalendarDays, ExternalLink, X } from "lucide-react";
import { useCurrentCustomerStatus } from "@/components/customer-status-context";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { BrandedIframe } from "@/components/branded-iframe";

const BOOKING_URL = "https://prenotazioni.cooperto.it/in/510b3be7-ed1d-41";
type BookingContextValue = {
  openBooking: () => void;
  showBookingButton: boolean;
  hasUpcomingReservationSoon: boolean;
  bookingCtaRef: RefCallback<HTMLElement>;
};

const BookingContext = createContext<BookingContextValue>({
  openBooking: () => undefined,
  showBookingButton: false,
  hasUpcomingReservationSoon: false,
  bookingCtaRef: () => undefined,
});
export const useBookingOverlay = () => useContext(BookingContext);
 
export function BookingOverlayProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [preloaded, setPreloaded] = useState(false);
  const preloadTargets = useRef(new Set<HTMLElement>());
  const observerRef = useRef<IntersectionObserver | null>(null);
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

  const bookingCtaRef = useCallback<RefCallback<HTMLElement>>((node) => {
    if (!node) return;
    preloadTargets.current.add(node);
    observerRef.current?.observe(node);
  }, []);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setPreloaded(true);
      observer.disconnect();
    }, { rootMargin: "300px 0px" });
    observerRef.current = observer;
    preloadTargets.current.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, []);
 
  return <BookingContext.Provider value={{ openBooking: () => setOpen(true), showBookingButton, hasUpcomingReservationSoon, bookingCtaRef }}>
    {children}
    {open || preloaded ? <div className={open ? "booking-overlay" : "hidden"} role="dialog" aria-modal="true" aria-label="Prenotazione Tortuga">
      <header><div><CalendarDays size={19} /><span>Prenota al Tortuga</span></div><div className="flex gap-2"><a href={BOOKING_URL} target="_blank" rel="noreferrer" aria-label="Apri nel browser"><ExternalLink size={19} /></a><button onClick={() => setOpen(false)} aria-label="Chiudi prenotazione"><X size={22} /></button></div></header>
      <BrandedIframe src={BOOKING_URL} title="Prenotazione Tortuga" allow="payment" />
    </div> : null}
  </BookingContext.Provider>;
}
