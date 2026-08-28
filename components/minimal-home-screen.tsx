"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, CalendarDays, ChevronRight, Ticket, UtensilsCrossed, X } from "lucide-react";
import { LoyaltyJourney } from "@/components/loyalty-journey";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { useBookingOverlay } from "@/components/booking-overlay";
import { useCurrentCustomerStatus } from "@/components/customer-status-context";
import { FidelityQrCode } from "@/components/fidelity-qr-code";
import { formatCouponExpiry, getCouponDisplayCode, getCouponQrValue, sortActiveCoupons } from "@/lib/customer-profile";
import type { CoopertoCoupon } from "@/lib/cooperto/types";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { useMenuOverlay } from "@/components/menu-overlay";
import { PwaInstallCard } from "@/components/pwa-install-card";

export function MinimalHomeScreen() {
  const { scenario } = useDemoScenario();
  const { openBooking } = useBookingOverlay();
  const { openMenu } = useMenuOverlay();
  const customer = useCurrentCustomerStatus();
  const { hasAccess: hasOnPremiseAccess } = useOnPremiseAccess();
  const [couponOpen, setCouponOpen] = useState(false);
  const activeCoupons = sortActiveCoupons(customer.profile?.coupons ?? []);
  const coupon: CoopertoCoupon | null = scenario.enabled
    ? scenario.hasCoupon ? { CodiceCoupon: "COUPON-DEMO", CodiceCouponContatto: "COUPON-DEMO", Utilizzato: false } : null
    : activeCoupons[0] ?? null;
  const hasReservation = scenario.enabled ? scenario.hasReservation : customer.hasReservation;
  const onPremise = scenario.enabled ? scenario.onPremise : hasOnPremiseAccess;

  return <section className="minimal-home space-y-5">
    <LoyaltyJourney beforeHighlights={onPremise ? <button type="button" className="menu-context-button" onClick={openMenu}><BookOpen /><div className="flex flex-col text-left py-0.5"><span className="font-serif text-[1.08rem] font-bold text-[var(--text)] leading-tight">Apri menu</span><span className="text-[10px] text-[var(--text-muted)] font-normal leading-normal mt-1 pr-2">Al momento del conto puoi richiederlo e pagare direttamente dal tavolo (con carte e bancomat).</span></div><ChevronRight /></button> : null} />
    {(hasReservation || coupon) ? <div className="home-context-list">
      {hasReservation ? <article><div className="context-icon"><CalendarDays /></div><div><p className="minimal-eyebrow">Prossima prenotazione</p><h2>La tua rotta è confermata</h2><span>Controlla i dettagli della serata.</span></div><ChevronRight /></article> : null}
      {coupon ? <button type="button" onClick={() => setCouponOpen(true)}><div className="context-icon"><Ticket /></div><div><p className="minimal-eyebrow">Premio disponibile</p><h2>Hai un coupon da utilizzare</h2><span>Mostra codice e QR del coupon.</span></div><ChevronRight /></button> : null}
    </div> : null}
    <div className="home-actions">
      <button onClick={openBooking}><CalendarDays /><span><strong>Prenota</strong><small>Riserva il tuo tavolo</small></span><ChevronRight /></button>
      <Link href="/info#programmazione"><UtensilsCrossed /><span><strong>Menu e locale</strong><small>Scopri il Tortuga</small></span><ChevronRight /></Link>
    </div>
    {couponOpen && coupon ? <CouponModal coupon={coupon} onClose={() => setCouponOpen(false)} /> : null}
    <PwaInstallCard />
  </section>;
}

function CouponModal({ coupon, onClose }: { coupon: CoopertoCoupon; onClose: () => void }) {
  const code = getCouponDisplayCode(coupon);
  const qrValue = getCouponQrValue(coupon);
  return <div className="coupon-modal" role="dialog" aria-modal="true" aria-labelledby="coupon-modal-title" onClick={onClose}>
    <div className="coupon-modal-card" onClick={(event) => event.stopPropagation()}>
      <button className="coupon-modal-close" onClick={onClose} aria-label="Chiudi coupon"><X /></button>
      <p className="minimal-eyebrow">Il tuo coupon</p>
      <h2 id="coupon-modal-title">Pronto da utilizzare</h2>
      {qrValue ? <FidelityQrCode value={qrValue} label={`QR coupon ${code}`} variant="coupon" /> : null}
      <div className="coupon-code"><span>Codice coupon</span><strong>{code}</strong></div>
      {coupon.DataScadenza ? <p className="coupon-expiry">Valido fino al {formatCouponExpiry(coupon.DataScadenza)}</p> : null}
      <button className="minimal-primary coupon-modal-action" onClick={onClose}>Chiudi</button>
    </div>
  </div>;
}
