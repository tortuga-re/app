"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import ReactDOM from "react-dom";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, ChevronRight, Clock3, Gift, Users, UtensilsCrossed } from "lucide-react";
import { LoyaltyJourney } from "@/components/loyalty-journey";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { useCurrentCustomerStatus } from "@/components/customer-status-context";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { useMenuOverlay } from "@/components/menu-overlay";
import { formatInRome, formatTime } from "@/lib/utils";

const LiveGameCard = dynamic(() => import("@/components/live-game-card").then((module) => module.LiveGameCard), { ssr: false });
const CiurmaSurveySection = dynamic(() => import("@/components/ciurma-survey-section").then((module) => module.CiurmaSurveySection), { ssr: false });
const PwaInstallCard = dynamic(() => import("@/components/pwa-install-card").then((module) => module.PwaInstallCard), { ssr: false });

export function HomeScreen() {
  ReactDOM.preload("/images/highlight-editorial.webp", {
    as: "image",
    fetchPriority: "high",
  });
  ReactDOM.preload("/images/rewards-food-table-background-fast.webp", {
    as: "image",
    fetchPriority: "high",
  });

  const [now] = useState(() => Date.now());
  const [liveFeaturesReady, setLiveFeaturesReady] = useState(false);
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

  useEffect(() => {
    const activate = () => setLiveFeaturesReady(true);
    const timer = window.setTimeout(activate, 15_000);
    window.addEventListener("pointerdown", activate, { once: true, passive: true });
    window.addEventListener("touchstart", activate, { once: true, passive: true });
    window.addEventListener("touchmove", activate, { once: true, passive: true });
    window.addEventListener("scroll", activate, { once: true, passive: true });
    window.addEventListener("keydown", activate, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", activate);
      window.removeEventListener("touchstart", activate);
      window.removeEventListener("touchmove", activate);
      window.removeEventListener("scroll", activate);
      window.removeEventListener("keydown", activate);
    };
  }, []);

  return (
    <section className="minimal-home space-y-5">
      <LoyaltyJourney beforeHighlights={beforeHighlights} />
      {liveFeaturesReady ? <LiveGameCard /> : null}
      {liveFeaturesReady ? <CiurmaSurveySection /> : null}
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
      {liveFeaturesReady ? <PwaInstallCard /> : null}
    </section>
  );
}
