"use client";

import { CalendarDays, ChevronDown, ChevronRight, Gamepad2, Music, Tv, Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { useBookingOverlay } from "@/components/booking-overlay";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { DirectionsCard } from "@/components/info/directions-card";
import { EveningProgram } from "@/components/info/evening-program";
import { SongVotingCard } from "@/components/tonight/song-voting-card";
import { PhotoLiveCard } from "@/components/tonight/photo-live-card";
import { LiveGreetingCard } from "@/components/tonight/live-greeting-card";
import { LiveGameCard } from "@/components/live-game-card";
import { CiurmaSurveySection } from "@/components/ciurma-survey-section";
import { LivePhotosCarousel } from "@/components/tonight/live-photos-carousel";
import { LiveGreetingModal } from "@/components/tonight/live-greeting-modal";
import { tortugaInfoConfig } from "@/lib/config";
import type { LiveGameState } from "@/lib/live-game";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { useCustomerIdentity } from "@/lib/customer-identity";

const weekdayCodes = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as const;

export type LivePageTab = "saluti" | "bottiglia" | "canzoni";

export function TonightExperience() {
  const { scenario } = useDemoScenario();
  const { hasAccess } = useOnPremiseAccess();
  const { identity } = useCustomerIdentity();
  const { openBooking, showBookingButton, bookingCtaRef } = useBookingOverlay();
  const [liveGame, setLiveGame] = useState<LiveGameState | null>(null);
  const [songVotingAdminEnabled, setSongVotingAdminEnabled] = useState(false);
  const [showGreetingModal, setShowGreetingModal] = useState(false);
  const [activeTab, setActiveTab] = useState<LivePageTab | null>("bottiglia");

  useEffect(() => {
    void fetch("/api/live-game")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setLiveGame(body?.game ?? null))
      .catch(() => setLiveGame(null));

    void fetch("/api/serata-live/canzoni")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setSongVotingAdminEnabled(Boolean(body?.songVoting?.enabled)))
      .catch(() => setSongVotingAdminEnabled(false));
  }, []);

  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", weekday: "short" }).format(new Date());
  const realWeekday = weekdayCodes[weekday as keyof typeof weekdayCodes];
  const currentWeekday = scenario.enabled && scenario.demoWeekday >= 0 ? scenario.demoWeekday : realWeekday;
  const isUpcomingWednesday = currentWeekday === 1 || currentWeekday === 2;
  const programWeekday = isUpcomingWednesday ? 3 : currentWeekday;
  const currentProgram = tortugaInfoConfig.eveningProgram.find((event) => event.weekday === programWeekday);
  const activeGame = scenario.enabled ? (scenario.demoLiveGame === "none" ? null : scenario.demoLiveGame) : liveGame?.active_game ?? null;
  const isOnPremise = Boolean(scenario.enabled ? scenario.onPremise : hasAccess);
  const [showSongNotice, setShowSongNotice] = useState(false);

  // Song voting is active if either Kantaquiz live game is running OR song voting is explicitly enabled in Admin Serata Live
  const isSongVotingActive = activeGame === "kantaquiz" || songVotingAdminEnabled;

  const handleTabClick = (tab: LivePageTab) => {
    if (tab === "canzoni" && !isSongVotingActive) {
      setShowSongNotice((prev) => !prev);
      return;
    }
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  return (
    <main className="minimal-page tonight-page pb-28">
      <div className="minimal-overlap-sheet tonight-sheet space-y-5">
        {isOnPremise ? (
          <>
            {/* Header con Frase d'Ingaggio (Mostrata solo quando NON c'è un gioco attivo) */}
            {!activeGame ? (
              <header className="overlap-sheet-intro tonight-intro space-y-1.5 border-b border-[rgba(40,35,28,.1)] pb-4">
                <p className="minimal-eyebrow">Al Tortuga si partecipa... sul serio.</p>
                <h1 className="tonight-section-title text-xl sm:text-2xl font-normal">
                  Mettiti in gioco e vivi la serata da protagonista!
                </h1>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Scegli come interagire dal tuo tavolo: manda i saluti sul maxi-schermo, sfida la sala per la bottiglia omaggio o scegli i brani da cantare.
                </p>
              </header>
            ) : null}

            {/* Quando c'è un gioco attivo (Cervellone / Kantaquiz in corso o in Demo), mostra il banner di gioco in cima alla pagina */}
            {activeGame ? (
              <LiveGameCard activeGameProp={activeGame} />
            ) : null}

            {/* Sondaggio attivo per Serata Live */}
            <CiurmaSurveySection placement="serata" />

            {/* Accordion Interattivo: 3 Opzioni che si espandono sotto a se stesse */}
            <div className="space-y-3">
              {/* 1. Saluti in TV */}
              <div
                className={`rounded-2xl border transition-all overflow-hidden ${
                  activeTab === "saluti"
                    ? "bg-[#fffdf8] border-[#c59a47] shadow-lg ring-2 ring-[#c59a47]/30"
                    : "bg-[#f3ecdf] border-[rgba(40,35,28,.14)] hover:border-[#c59a47]/50 text-[var(--text)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleTabClick("saluti")}
                  className={`w-full p-3.5 sm:p-4 flex items-center justify-between text-left cursor-pointer transition-colors ${
                    activeTab === "saluti"
                      ? "bg-gradient-to-r from-[#241a12] via-[#1a1612] to-[#151714] text-white"
                      : "hover:bg-[#ebdcc8]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                        activeTab === "saluti"
                          ? "bg-[#c59a47]/20 text-[#d9b66d]"
                          : "bg-[#fffdf8] text-[var(--accent-strong)] border border-[rgba(40,35,28,.1)]"
                      }`}
                    >
                      📺
                    </div>
                    <div>
                      <span className="block text-sm font-extrabold leading-tight">Saluti in TV</span>
                      <span className={`block text-xs ${activeTab === "saluti" ? "text-white/70" : "text-[var(--text-muted)]"}`}>
                        Messaggi Live
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeTab === "saluti" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#c59a47]/30 text-[#f4e0ad] uppercase tracking-wider">
                        Aperto
                      </span>
                    )}
                    <ChevronDown
                      size={18}
                      className={`transition-transform duration-300 ${
                        activeTab === "saluti" ? "rotate-180 text-[#c59a47]" : "text-[var(--text-muted)]"
                      }`}
                    />
                  </div>
                </button>

                {activeTab === "saluti" ? (
                  <div className="p-3.5 sm:p-5 border-t border-[rgba(40,35,28,.1)] bg-[#fffdf8] animate-in fade-in slide-in-from-top-2 duration-300">
                    <LiveGreetingCard defaultNickname={identity.email ? identity.email.split("@")[0] : ""} />
                  </div>
                ) : null}
              </div>

              {/* 2. Bottiglia Omaggio */}
              <div
                className={`rounded-2xl border transition-all overflow-hidden ${
                  activeTab === "bottiglia"
                    ? "bg-[#fffdf8] border-[#c59a47] shadow-lg ring-2 ring-[#c59a47]/30"
                    : "bg-[#f3ecdf] border-[rgba(40,35,28,.14)] hover:border-[#c59a47]/50 text-[var(--text)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleTabClick("bottiglia")}
                  className={`w-full p-3.5 sm:p-4 flex items-center justify-between text-left cursor-pointer transition-colors ${
                    activeTab === "bottiglia"
                      ? "bg-gradient-to-r from-[#241a12] via-[#1a1612] to-[#151714] text-white"
                      : "hover:bg-[#ebdcc8]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                        activeTab === "bottiglia"
                          ? "bg-[#c59a47]/20 text-[#d9b66d]"
                          : "bg-[#fffdf8] text-[var(--accent-strong)] border border-[rgba(40,35,28,.1)]"
                      }`}
                    >
                      🍾
                    </div>
                    <div>
                      <span className="block text-sm font-extrabold leading-tight">Bottiglia Omaggio</span>
                      <span className={`block text-xs ${activeTab === "bottiglia" ? "text-white/70" : "text-[var(--text-muted)]"}`}>
                        La foto più votata vince
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeTab === "bottiglia" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#c59a47]/30 text-[#f4e0ad] uppercase tracking-wider">
                        Aperto
                      </span>
                    )}
                    <ChevronDown
                      size={18}
                      className={`transition-transform duration-300 ${
                        activeTab === "bottiglia" ? "rotate-180 text-[#c59a47]" : "text-[var(--text-muted)]"
                      }`}
                    />
                  </div>
                </button>

                {activeTab === "bottiglia" ? (
                  <div className="p-3.5 sm:p-5 border-t border-[rgba(40,35,28,.1)] bg-[#fffdf8] animate-in fade-in slide-in-from-top-2 duration-300">
                    <PhotoLiveCard />
                  </div>
                ) : null}
              </div>

              {/* 3. Scegli canzoni */}
              <div
                className={`rounded-2xl border transition-all overflow-hidden ${
                  activeTab === "canzoni" && isSongVotingActive
                    ? "bg-[#fffdf8] border-[#c59a47] shadow-lg ring-2 ring-[#c59a47]/30"
                    : !isSongVotingActive
                    ? "bg-[#e8e0d2]/70 border-[rgba(40,35,28,.14)] hover:border-amber-700/40"
                    : "bg-[#f3ecdf] border-[rgba(40,35,28,.14)] hover:border-[#c59a47]/50 text-[var(--text)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleTabClick("canzoni")}
                  className={`w-full p-3.5 sm:p-4 flex items-center justify-between text-left cursor-pointer transition-colors ${
                    activeTab === "canzoni" && isSongVotingActive
                      ? "bg-gradient-to-r from-[#241a12] via-[#1a1612] to-[#151714] text-white"
                      : "hover:bg-[#ebdcc8]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                        activeTab === "canzoni" && isSongVotingActive
                          ? "bg-[#c59a47]/20 text-[#d9b66d]"
                          : "bg-[#fffdf8] text-[var(--accent-strong)] border border-[rgba(40,35,28,.1)]"
                      }`}
                    >
                      🎵
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="block text-sm font-extrabold leading-tight">Scegli canzoni</span>
                      </div>
                      <span className={`block text-xs ${activeTab === "canzoni" && isSongVotingActive ? "text-white/70" : "text-[var(--text-muted)]"}`}>
                        {isSongVotingActive ? "Vota i brani da cantare stasera" : "Disponibile durante Kantaquiz / Admin"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSongVotingActive ? (
                      activeTab === "canzoni" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#c59a47]/30 text-[#f4e0ad] uppercase tracking-wider">
                          Aperto
                        </span>
                      )
                    ) : (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-200/90 text-amber-900 font-extrabold uppercase tracking-wider flex items-center gap-1 border border-amber-400/40">
                        <Lock size={10} /> Inattivo
                      </span>
                    )}
                    <ChevronDown
                      size={18}
                      className={`transition-transform duration-300 ${
                        activeTab === "canzoni" && isSongVotingActive ? "rotate-180 text-[#c59a47]" : "text-[var(--text-muted)]"
                      }`}
                    />
                  </div>
                </button>

                {!isSongVotingActive && (showSongNotice || activeTab === "canzoni") ? (
                  <div className="p-3.5 bg-[#f5ebd9] border border-amber-500/30 rounded-xl text-xs text-[var(--text)] space-y-1.5 m-3 animate-in fade-in duration-200">
                    <p className="font-semibold text-amber-950 flex items-center gap-1.5">
                      <Lock size={13} className="text-amber-700" /> Votazione Canzoni Non Attiva
                    </p>
                    <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">
                      💡 La votazione delle canzoni rimane visibile ma si sblocca non appena il Capitano avvia il gioco <strong>Kantaquiz</strong> o la abilita dalla plancia Admin.
                    </p>
                  </div>
                ) : null}

                {isSongVotingActive && activeTab === "canzoni" ? (
                  <div className="p-3.5 sm:p-5 border-t border-[rgba(40,35,28,.1)] bg-[#fffdf8] animate-in fade-in slide-in-from-top-2 duration-300">
                    <SongVotingCard />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Ultima Sezione della Pagina Stasera: Carosello Foto Inviate con Like */}
            <div className="pt-2">
              <LivePhotosCarousel />
            </div>
          </>
        ) : (
          <>
            {/* Header Informazioni (Fuori dal locale) */}
            <header className="overlap-sheet-intro tonight-intro space-y-1.5 border-b border-[rgba(40,35,28,.1)] pb-4">
              <p className="minimal-eyebrow">Al Tortuga si partecipa... sul serio.</p>
              <h1 className="tonight-section-title text-xl sm:text-2xl font-normal">
                Stasera al Tortuga Risto Pub
              </h1>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Scopri la programmazione delle nostre serate, riserva il tuo tavolo o raggiungici in sala per vivere gli eventi dal vivo!
              </p>
            </header>

            <div className="space-y-6 pt-2">
              <section className="info-section">
                <EveningProgram />
              </section>

              {showBookingButton ? (
                <section className="loyalty-summary space-y-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={19} className="text-[var(--accent-strong)]" />
                    <div>
                      <p className="minimal-eyebrow">Prenotazione</p>
                      <h2 className="tonight-section-title">Riserva il tuo tavolo</h2>
                    </div>
                  </div>
                  <button
                    ref={bookingCtaRef}
                    type="button"
                    className="minimal-primary w-full"
                    onClick={openBooking}
                  >
                    Prenota <ChevronRight />
                  </button>
                </section>
              ) : null}

              <DirectionsCard compact />
            </div>
          </>
        )}
      </div>

      <LiveGreetingModal
        open={showGreetingModal}
        onClose={() => setShowGreetingModal(false)}
        defaultNickname={identity.email ? identity.email.split("@")[0] : ""}
      />
    </main>
  );
}

