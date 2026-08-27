"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Award, Check, Gift, LockKeyhole, Trophy, X } from "lucide-react";

import { DragCarousel } from "@/components/drag-carousel";
import { LoyaltyJourney } from "@/components/loyalty-journey";
import { RankBadge } from "@/components/rank-badge";
import { useCurrentCustomerStatus } from "@/components/customer-status-context";
import { useDemoScenario } from "@/components/demo-scenario-provider";
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
      image: "/badges/maledizione-tortuga.png",
      secrecy: "hinted",
      unlocked: false,
    },
    {
      id: "giro-sette-mari",
      label: "Il giro dei Sette Mari",
      description: "Un vero pirata non percorre sempre la stessa rotta.",
      icon: "🌊",
      image: "/badges/giro-sette-mari.png",
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
  const [legends, setLegends] = useState<{ nickname: string; legend_number: number }[]>([]);
  const { scenario } = useDemoScenario();
  const customer = useCurrentCustomerStatus();
  const points = scenario.enabled ? scenario.points : customer.points;
  const visits = scenario.enabled ? scenario.visits : customer.visits;
  const highestPoints = scenario.enabled ? Math.max(scenario.points, scenario.highestPoints) : points;
  const active = getActiveRank(visits, highestPoints, scenario.enabled ? scenario.historicalRank : undefined, scenario.enabled ? scenario.maintained : true);
  const profile = scenario.enabled ? buildDemoProfile(visits, points, scenario.hasCoupon) : customer.profile;
  const isUserRegistered = scenario.enabled ? scenario.loggedIn : customer.hasProfile;
  const visibleMissions = missions.filter((mission) => mission.id !== "ritorno-naufragio" || Boolean(profile && mission.isUnlocked(profile)));
  const displayMissions: DisplayMission[] = [
    ...(profile?.achievementViews ?? []).map((achievement) => ({ ...achievement })),
    ...visibleMissions.map((mission) => ({ ...mission, unlocked: Boolean(profile && mission.isUnlocked(profile)) })),
  ];
  const unlockedMissionCount = displayMissions.filter((mission) => mission.unlocked).length;
  const hasRedeemableReward = fidelityRewardTiers.some((reward) => points >= reward.threshold);

  useEffect(() => {
    if (!isUserRegistered) {
      setTab("ranks");
    }
  }, [isUserRegistered]);

  useEffect(() => {
    const loadLegends = async () => {
      try {
        const response = await fetch("/api/profile/legends");
        const body = await response.json();
        if (response.ok && body.legends) {
          setLegends(body.legends);
        }
      } catch (err) {
        console.error("Error loading legends:", err);
      }
    };
    void loadLegends();
  }, []);

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
      <DragCarousel className="rank-slides" label="Ranghi Tortuga">{tortugaRanks.map((rank) => { const reached = isUserRegistered && (getRankIndex(rank.id) <= getRankIndex(active.id)); return <article key={rank.id} className={reached ? "reached" : ""}><RankBadge rank={rank.id} label={rank.label} size={66} /><p>{reached ? "Rango conquistato" : "Prossimo traguardo"}</p><h2>{rank.label}</h2><span>{rank.description}</span><dl><div><dt>Visite</dt><dd>{rank.visits}</dd></div><div><dt>Dobloni raggiunti</dt><dd>{rank.points}</dd></div></dl></article>; })}</DragCarousel>
      {/* Hall of Legends Section */}
      <div className="hall-of-legends p-4 rounded-[1.5rem] border border-[rgba(216,176,106,0.18)] bg-[rgba(12,9,7,0.4)] space-y-4 mt-6">
        <div className="text-center space-y-1">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--accent-strong)] flex items-center justify-center gap-1.5">
            <Trophy size={14} /> Hall of Legends
          </h3>
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            I leggendari pirati che hanno conquistato il massimo rango a bordo del Tortuga.
          </p>
        </div>

        {legends.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
            {legends.map((legend) => (
              <div key={legend.legend_number} className="flex items-center gap-2 p-2.5 rounded-xl bg-[rgba(216,176,106,0.05)] border border-[rgba(216,176,106,0.08)]">
                <span className="text-[10px] font-black font-mono text-[var(--accent-strong)]">
                  #{String(legend.legend_number).padStart(4, "0")}
                </span>
                <span className="text-xs font-bold text-white truncate">
                  {legend.nickname}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-[var(--text-muted)] text-center py-4 italic">
            Nessun pirata ha ancora inciso il proprio nome nella storia...
          </p>
        )}
      </div>

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

    {selectedMission ? <MissionDetailModal mission={selectedMission} onClose={() => setSelectedMission(null)} /> : null}
  </div>;
}

function MissionDetailModal({ mission, onClose }: { mission: DisplayMission; onClose: () => void }) {
  const { unlocked } = mission;
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
      <button className="minimal-primary achievement-modal-action" onClick={onClose}>Chiudi</button>
    </div>
  </div>;
}
