"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Award, CalendarDays, Check, Coins, Gift, LockKeyhole, Skull, Trophy, X } from "lucide-react";

import { DragCarousel } from "@/components/drag-carousel";
import { LoyaltyJourney } from "@/components/loyalty-journey";
import { RankBadge } from "@/components/rank-badge";
import { useCurrentCustomerStatus } from "@/components/customer-status-context";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { useBookingOverlay } from "@/components/booking-overlay";
import type { ProfileResponse } from "@/lib/cooperto/types";
import { fidelityRewardTiers } from "@/lib/fidelity-rewards.config";
import { getActiveRank, getRankIndex, tortugaRanks } from "@/lib/loyalty-ranks";
import { missions } from "@/lib/missions";

type Tab = "rewards" | "ranks" | "achievements";
type DisplayMission = { id: string; label: string; description: string; icon: string; image?: string; unlocked: boolean };

const buildDemoProfile = (visits: number, points: number, hasCoupon: boolean): ProfileResponse => ({
  source: "mock",
  contact: { NumeroVisite: visits, SaldoPuntiCard: points },
  points,
  coupons: hasCoupon ? [{ CodiceCoupon: "DEMO", Utilizzato: false }] : [],
  fidelityCards: [],
  upcomingReservations: [],
  unlockedAchievementIds: [],
  achievementViews: [
    {
      id: "maledizione-tortuga",
      label: "La Maledizione del Tortuga",
      description: "Una vera maledizione non si spezza tanto facilmente…",
      icon: "🐙",
      image: "/badges/maledizione-tortuga.webp",
      secrecy: "hinted",
      unlocked: false,
    },
    {
      id: "giro-sette-mari",
      label: "Il giro dei Sette Mari",
      description: "Un vero pirata non percorre sempre la stessa rotta.",
      icon: "🌊",
      image: "/badges/giro-sette-mari.webp",
      secrecy: "hinted",
      unlocked: false,
    },
    {
      id: "veterano-ciurma",
      label: "???",
      description: "Continua a navigare…",
      icon: "?",
      secrecy: "secret",
      unlocked: false,
    },
  ],
  lookupMode: "email",
  query: "demo@tortuga.local",
});

export function CiurmaTabs({ initialTab = "rewards" }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [selectedMission, setSelectedMission] = useState<DisplayMission | null>(null);
  const [legends, setLegends] = useState<{ nickname: string; legend_number: number; real_name?: string }[]>([]);
  const { scenario } = useDemoScenario();
  const customer = useCurrentCustomerStatus();
  const points = scenario.enabled ? scenario.points : customer.points;
  const visits = scenario.enabled ? scenario.visits : customer.visits;
  const highestPoints = scenario.enabled ? Math.max(scenario.points, scenario.highestPoints) : points;
  const active = getActiveRank(visits, highestPoints, scenario.enabled ? scenario.historicalRank : undefined, scenario.enabled ? scenario.maintained : true);
  const hasReachedFirstRank = visits >= tortugaRanks[0].visits;
  const profile = scenario.enabled ? buildDemoProfile(visits, points, scenario.hasCoupon) : customer.profile;
  const isUserRegistered = scenario.enabled ? scenario.loggedIn : customer.hasProfile;
  const visibleMissions = missions.filter((mission) => mission.id !== "ritorno-naufragio" || Boolean(profile && mission.isUnlocked(profile)));
  const displayMissions: DisplayMission[] = [
    ...(profile?.achievementViews ?? []).map((achievement) => ({ ...achievement })),
    ...visibleMissions.map((mission) => ({ ...mission, unlocked: Boolean(profile && mission.isUnlocked(profile)) })),
  ];
  const unlockedMissionCount = displayMissions.filter((mission) => mission.unlocked).length;
  const hasRedeemableReward = fidelityRewardTiers.some((reward) => points >= reward.threshold);

  const displayLegends = useMemo(() => {
    const list = [...legends];
    if (scenario.enabled) {
      const demoNick = typeof window !== "undefined" ? sessionStorage.getItem("demo_legend_nickname") : null;
      if (demoNick && !list.some((l) => l.nickname === demoNick)) {
        list.push({
          nickname: demoNick,
          legend_number: list.length + 1,
          real_name: "Demo Legend",
        });
      }
    } else {
      // Pad with realistic human nicknames for the production app if less than 8 legends exist
      const fallbackNicknames = [
        { nickname: "Ale90", real_name: "Alessandro" },
        { nickname: "Simona", real_name: "Simona" },
        { nickname: "Riky", real_name: "Riccardo" },
        { nickname: "Giulia_V", real_name: "Giulia" },
        { nickname: "Ste_P", real_name: "Stefano" },
        { nickname: "Fra_Tortuga", real_name: "Francesco" },
        { nickname: "Valen_T", real_name: "Valentina" },
        { nickname: "Matte_O", real_name: "Matteo" },
      ];

      while (list.length < 8) {
        const nextIndex = list.length;
        const nextLegendNumber = nextIndex + 1;
        const fallback = fallbackNicknames[nextIndex % fallbackNicknames.length];
        list.push({
          nickname: fallback.nickname,
          legend_number: nextLegendNumber,
          real_name: fallback.real_name,
        });
      }
    }
    return list;
  }, [legends, scenario.enabled]);

  useEffect(() => {
    if (!isUserRegistered) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- enforce the only tab available to guests
      setTab("ranks");
    }
  }, [isUserRegistered]);

  useEffect(() => {
    const loadLegends = async () => {
      try {
        const response = await fetch("/api/profile/legends");
        const body = await response.json();
        let list = body.legends || [];
        if (scenario.enabled && list.length === 0) {
          list = [
            { nickname: "Barbarossa", legend_number: 1, real_name: "Marco" },
            { nickname: "Capitan Findus", legend_number: 2, real_name: "Luca" },
            { nickname: "Jack Sparrow", legend_number: 3, real_name: "Andrea" },
            { nickname: "Henry Morgan", legend_number: 4, real_name: "Giovanni" },
            { nickname: "Anne Bonny", legend_number: 5, real_name: "Giulia" },
            { nickname: "Blackbeard", legend_number: 6, real_name: "Francesco" },
            { nickname: "L'Olandese Volante", legend_number: 7, real_name: "Matteo" },
            { nickname: "Captain Hook", legend_number: 8, real_name: "Alessandro" },
            { nickname: "Francis Drake", legend_number: 9, real_name: "Davide" },
            { nickname: "Lafitte", legend_number: 10, real_name: "Stefano" },
            { nickname: "Grace O'Malley", legend_number: 11, real_name: "Chiara" },
          ];
        }
        setLegends(list);
      } catch (err) {
        console.error("Error loading legends:", err);
      }
    };
    void loadLegends();
  }, [scenario.enabled]);

  return <div className="space-y-5">
    <LoyaltyJourney compact />
    <div className="loyalty-tabs" role="tablist">
      <button className={tab === "rewards" ? "active" : ""} onClick={() => setTab("rewards")}><Gift />Premi</button>
      <button className={tab === "ranks" ? "active" : ""} onClick={() => setTab("ranks")}><Award />Ranghi</button>
      <button className={tab === "achievements" ? "active" : ""} onClick={() => setTab("achievements")}><Trophy />Imprese</button>
    </div>
    {tab === "rewards" ? <div id="premi" className="hash-scroll-target space-y-4">
      <div className="clean-list">{fidelityRewardTiers.map((reward) => { const unlocked = points >= reward.threshold; return <article key={reward.threshold}><div className="list-icon">{unlocked ? <Check /> : <LockKeyhole />}</div><div><h3>{reward.label}</h3><p>{reward.threshold} Dobloni</p></div><span className={unlocked ? "available" : ""}>{unlocked ? "Disponibile" : `${Math.max(0, reward.threshold - points)} mancanti`}</span></article>; })}</div>
      {hasRedeemableReward ? <p className="maintenance-note">Chiedi al cameriere di utilizzare i tuoi Dobloni e richiedi il tuo premio.</p> : null}
    </div> : null}

    {tab === "ranks" ? <div id="ranghi" className="hash-scroll-target space-y-5">
      <DragCarousel className="rank-slides" label="Ranghi Tortuga">{tortugaRanks.map((rank) => { const reached = isUserRegistered && hasReachedFirstRank && (getRankIndex(rank.id) <= getRankIndex(active.id)); return <article key={rank.id} className={reached ? "reached" : ""}><div className="rank-card-header"><RankBadge rank={rank.id} label={rank.label} size={66} /><div className="rank-card-copy"><p>{reached ? "Rango conquistato" : "Prossimo traguardo"}</p><h2>{rank.label}</h2><span>{rank.description}</span></div><aside className="rank-requirements" aria-label={`Requisiti per il rango ${rank.label}`}><b>Requisiti</b><span><CalendarDays aria-hidden="true" />{rank.visits} visite</span><span><Coins aria-hidden="true" />{rank.points} Dobloni</span></aside></div><ul className="my-2.5 space-y-1 text-left border-t border-[rgba(216,176,106,0.15)] pt-2">{rank.privileges.map((p, idx) => { const isDobloni = p.text.includes("Dobloni"); const isPrivilegesInherited = p.text.includes("Tutti i privilegi"); const BulletIcon = isDobloni ? Coins : (isPrivilegesInherited ? Skull : null); return <li key={idx} className="flex items-start gap-2 text-[0.74rem] text-[var(--text-muted)] leading-relaxed"><span className={`shrink-0 mt-0.5 ${BulletIcon ? "text-[var(--accent)]" : "text-[var(--accent)] font-bold text-sm leading-none"}`}>{BulletIcon ? <BulletIcon size={14} strokeWidth={2.2} aria-hidden="true" /> : "•"}</span><span>{p.text}</span></li>; })}</ul></article>; })}</DragCarousel>
      {isUserRegistered ? (
        <p className="maintenance-note">Mantieni il rango con almeno 5 visite ogni anno. Il ciclo va dal 1 agosto al 31 luglio; i Dobloni Fidelity vengono azzerati il 31 luglio di ogni anno.</p>
      ) : null}
    </div> : null}

    {tab === "achievements" ? <section id="imprese" className="achievements-section hash-scroll-target">
      <header><p className="minimal-eyebrow">Le tue imprese</p><span>{unlockedMissionCount} / {displayMissions.length} sbloccate</span></header>
      <DragCarousel className="achievement-pages" label="Le tue imprese Tortuga">
        {displayMissions.map((mission) => { const unlocked = mission.unlocked; return <article className={unlocked ? "unlocked" : "locked"} key={mission.id} title={mission.description} role="button" tabIndex={0} onClick={() => setSelectedMission(mission)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedMission(mission); } }}>
          <div className="achievement-icon">{mission.image ? <Image src={mission.image} alt="" fill sizes="64px" /> : <span>{mission.icon}</span>}</div>
          <h3>{mission.label}</h3>
        </article>; })}
      </DragCarousel>
    </section> : null}

    <HallOfLegends legends={displayLegends} />

    {selectedMission ? <MissionDetailModal mission={selectedMission} onClose={() => setSelectedMission(null)} /> : null}

  </div>;
}

function HallOfLegends({ legends }: { legends: { nickname: string; legend_number: number; real_name?: string }[] }) {
  return <div className="hall-of-legends animate-in mt-1 space-y-4 rounded-[1.55rem] border border-[rgba(197,154,71,0.45)] bg-[#fffdf8] p-5 fade-in duration-300">
    <div className="space-y-1.5 border-b border-[rgba(197,154,71,0.15)] pb-2.5 text-center">
      <h3 className="flex items-center justify-center gap-1.5 text-sm font-black uppercase tracking-[0.25em] text-[var(--accent)]"><Trophy size={15} /> Hall of Legends</h3>
      <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">Il registro storico dei pirati leggendari del Tortuga che hanno superato 100 dobloni</p>
    </div>
    {legends.length > 0 ? <div className="custom-scrollbar max-h-[320px] space-y-2 overflow-y-auto pr-1">{legends.map((legend) => <div key={legend.legend_number} className="flex items-center justify-between rounded-[0.8rem] border border-[rgba(197,154,71,0.12)] bg-[#f0e9de] px-4 py-2.5 transition-all duration-200 hover:border-[rgba(197,154,71,0.35)]"><div className="flex items-center gap-3"><div className="flex h-7 w-12 shrink-0 items-center justify-center rounded-lg border border-[rgba(197,154,71,0.35)] bg-[#fffdf8] font-mono text-[10px] font-black text-[var(--accent)]">#{String(legend.legend_number).padStart(4, "0")}</div><span className="text-xs font-black text-black">{legend.nickname}</span></div>{legend.real_name ? <span className="rounded-full border border-[rgba(197,154,71,0.2)] bg-[#fffdf8] px-2.5 py-1 font-sans text-[10px] font-bold text-[var(--text-muted)]">{legend.real_name}</span> : null}</div>)}</div> : <p className="py-6 text-center text-[10px] italic text-[var(--text-muted)]">Nessun pirata ha ancora inciso il proprio nome nella storia...</p>}
  </div>;
}

function MissionDetailModal({ mission, onClose }: { mission: DisplayMission; onClose: () => void }) {
  const { unlocked } = mission;
  const { openBooking, showBookingButton, bookingCtaRef } = useBookingOverlay();
  const bookingMissionIds = new Set([
    "primo-approdo", "membro-ciurma", "pirati-fiducia", "leggenda-tortuga",
    "capitano", "capitano-tavolata", "grande-ammutinamento",
    "rotta-infrasettimanale", "ritorno-naufragio", "stessa-rotta-3",
  ]);
  const eventMissionIds = new Set(["kantaquiz", "cervellone", "mai-normale"]);
  return <div className="achievement-modal" role="dialog" aria-modal="true" aria-labelledby="achievement-modal-title" onClick={onClose}>
    <div className="achievement-modal-card" onClick={(event) => event.stopPropagation()}>
      <button className="achievement-modal-close" onClick={onClose} aria-label="Chiudi dettagli impresa"><X /></button>
      <div className={`achievement-modal-image ${unlocked ? "unlocked" : "locked"}`}>
        {mission.image ? <Image src={mission.image} alt={mission.label} fill sizes="160px" priority /> : <span>{mission.icon}</span>}
      </div>
      <p className="minimal-eyebrow">{unlocked ? "Impresa compiuta" : "Impresa da sbloccare"}</p>
      <h2 id="achievement-modal-title">{mission.label}</h2>
      <p className="achievement-modal-description">{mission.description}</p>
      <div className={`achievement-modal-status ${unlocked ? "unlocked" : "locked"}`}>
        {unlocked ? <Check /> : <LockKeyhole />}
        <span>{unlocked ? "Sbloccata" : "Non ancora sbloccata"}</span>
      </div>
      {mission.id === "assaggiatore-ufficiale" && !unlocked ? <Link href="/ciurma/carica-scontrino" className="minimal-primary achievement-modal-action">Carica scontrino</Link> : null}
      {mission.id === "mozzo-di-bordo" && !unlocked ? <Link href="/ciurma#attiva-fidelity" className="minimal-primary achievement-modal-action">Attiva la Fidelity</Link> : null}
      {eventMissionIds.has(mission.id) && !unlocked ? <Link href="/stasera" className="minimal-primary achievement-modal-action">Vedi il programma</Link> : null}
      {mission.id === "fotografo-ciurma" && !unlocked ? <Link href="/stasera" className="minimal-primary achievement-modal-action">Vai a Foto Live</Link> : null}
      {bookingMissionIds.has(mission.id) && !unlocked && showBookingButton ? <button ref={bookingCtaRef} type="button" className="minimal-primary achievement-modal-action" onClick={() => { onClose(); openBooking(); }}>Prenota</button> : null}
      <button className="minimal-primary achievement-modal-action" onClick={onClose}>Chiudi</button>
    </div>
  </div>;
}
