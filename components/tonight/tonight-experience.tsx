"use client";

import { CalendarDays, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { useBookingOverlay } from "@/components/booking-overlay";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { DirectionsCard } from "@/components/info/directions-card";
import { EveningProgram } from "@/components/info/evening-program";
import { CurrentEveningCard } from "@/components/tonight/current-evening-card";
import { PhotoLiveCard } from "@/components/tonight/photo-live-card";
import { tortugaInfoConfig } from "@/lib/config";
import type { LiveGameState } from "@/lib/live-game";
import { useOnPremiseAccess } from "@/lib/on-premise-access";

const weekdayCodes = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as const;

export function TonightExperience() {
  const { scenario } = useDemoScenario();
  const { hasAccess } = useOnPremiseAccess();
  const { openBooking, showBookingButton, bookingCtaRef } = useBookingOverlay();
  const [liveGame, setLiveGame] = useState<LiveGameState | null>(null);

  useEffect(() => {
    void fetch("/api/live-game")
      .then((response) => response.ok ? response.json() : null)
      .then((body) => setLiveGame(body?.game ?? null))
      .catch(() => setLiveGame(null));
  }, []);

  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", weekday: "short" }).format(new Date());
  const realWeekday = weekdayCodes[weekday as keyof typeof weekdayCodes];
  const currentWeekday = scenario.enabled && scenario.demoWeekday >= 0 ? scenario.demoWeekday : realWeekday;
  const isUpcomingWednesday = currentWeekday === 1 || currentWeekday === 2;
  const programWeekday = isUpcomingWednesday ? 3 : currentWeekday;
  const currentProgram = tortugaInfoConfig.eveningProgram.find((event) => event.weekday === programWeekday);
  const activeGame = scenario.enabled ? (scenario.demoLiveGame === "none" ? null : scenario.demoLiveGame) : liveGame?.active_game ?? null;
  const isOnPremise = scenario.enabled ? scenario.onPremise : hasAccess;

  return <main className="minimal-page tonight-page pb-28">
    <div className="minimal-overlap-sheet tonight-sheet">
      <header className="overlap-sheet-intro tonight-intro"><p className="minimal-eyebrow">Al Tortuga si partecipa... sul serio.</p>{isOnPremise ? <p>Manda una foto in diretta.</p> : null}</header>
      <div className="space-y-7">
        {isOnPremise ? <>
          <PhotoLiveCard />
          {currentProgram ? <CurrentEveningCard program={currentProgram} upcoming={isUpcomingWednesday} activeGame={activeGame} showPending={currentWeekday === 0 || currentWeekday >= 5} /> : null}
        </> : <>
          {currentProgram ? <CurrentEveningCard program={currentProgram} upcoming activeGame={null} showPending={false} /> : null}
          <section className="info-section"><EveningProgram /></section>
          {showBookingButton ? <section className="loyalty-summary space-y-4"><div className="flex items-center gap-2"><CalendarDays size={19} className="text-[var(--accent-strong)]" /><div><p className="minimal-eyebrow">Prenotazione</p><h2 className="tonight-section-title">Riserva il tuo tavolo</h2></div></div><button ref={bookingCtaRef} type="button" className="minimal-primary w-full" onClick={openBooking}>Prenota <ChevronRight /></button></section> : null}
          <DirectionsCard compact />
        </>}
      </div>
    </div>
  </main>;
}
