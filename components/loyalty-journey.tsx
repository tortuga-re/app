"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Anchor, Award, CalendarCheck, ChevronRight, Gift, Pencil, QrCode, Shield, Coins, Cake } from "lucide-react";
import Link from "next/link";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { getActiveRank, getNextRank, getRankIndex, tortugaRanks } from "@/lib/loyalty-ranks";
import { fidelityRewardTiers } from "@/lib/fidelity-rewards.config";
import { RankBadge } from "@/components/rank-badge";
import { DragCarousel } from "@/components/drag-carousel";
import { FidelityQrCode } from "@/components/fidelity-qr-code";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { useCurrentCustomerStatus } from "@/components/customer-status-context";
import { ProfileEditModal } from "@/components/profile-edit-modal";
import { LegendNicknameModal } from "@/components/legend-nickname-modal";
import { useBookingOverlay } from "@/components/booking-overlay";
import { getBirthdayInsight } from "@/lib/customer-profile";

const CiurmaRecognition = dynamic(() => import("@/components/profile-screen").then((module) => module.CiurmaScreen), { ssr: false });

export function LoyaltyJourney({ compact = false, beforeHighlights }: { compact?: boolean; beforeHighlights?: React.ReactNode }) {
  const [cardOpen, setCardOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [legendModalOpen, setLegendModalOpen] = useState(false);
  const { scenario } = useDemoScenario();
  const { hasIdentity } = useCustomerIdentity();
  const customer = useCurrentCustomerStatus();
  const points = scenario.enabled ? scenario.points : customer.points;
  const highestPoints = scenario.enabled ? Math.max(scenario.highestPoints, points) : points;
  const visits = scenario.enabled ? scenario.visits : customer.visits;
  const historicalRank = scenario.enabled ? scenario.historicalRank : undefined;
  const maintained = scenario.enabled ? scenario.maintained : true;
  const isVip = scenario.enabled ? scenario.isVip : customer.isVip;
  const cardCode = scenario.enabled
    ? scenario.isVip ? "TORTUGA-VIP-DEMO-CARD" : "TORTUGA-DEMO-CARD"
    : customer.activeCardCode;
  const loggedIn = scenario.enabled ? scenario.loggedIn : hasIdentity;
  const hasCard = Boolean(cardCode);
  const activeRank = getActiveRank(visits, highestPoints, historicalRank, maintained);
  const nextRank = getNextRank(activeRank.id);
  const isLegend = activeRank.id === "leggenda";
  const registeredLegendNickname = scenario.enabled
    ? (typeof window !== "undefined" ? sessionStorage.getItem("demo_legend_nickname") : null)
    : customer.profile?.legendNickname;
  const missingVisits = Math.max(0, nextRank.visits - visits);
  const missingPoints = Math.max(0, nextRank.points - highestPoints);
  const nextReward = fidelityRewardTiers.find((reward) => reward.threshold > points);
  const missingBirthDate = loggedIn && customer.hasProfile && !customer.profile?.contact?.DataDiNascita;
  const { openBooking } = useBookingOverlay();

  /* ── Birthday promo: show for the 14 days before the birthday (and on the day itself).
     Hidden if there is already a future reservation. ── */
  const hasReservation = scenario.enabled ? scenario.hasReservation : customer.hasReservation;
  const birthdayPromo = useMemo(() => {
    if (scenario.enabled) {
      if (!scenario.demoBirthday || hasReservation) return null;
      return {
        date: new Date(),
        daysUntil: 0,
        label: "oggi! 🎂",
        isToday: true
      };
    }
    const birthDate = customer.profile?.contact?.DataDiNascita;
    if (!birthDate || hasReservation) return null;
    const insight = getBirthdayInsight(birthDate, 14);
    if (!insight) return null;
    return insight;
  }, [scenario.enabled, scenario.demoBirthday, hasReservation, customer.profile?.contact?.DataDiNascita]);

  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState("");

  const handleActivateFidelity = async () => {
    if (activationLoading || hasCard) return;

    const contactCode = customer.profile?.contact?.CodiceContatto ?? "";
    if (!contactCode.trim()) {
      setActivationError("Per attivare la Fidelity devi prima compilare o salvare il tuo profilo.");
      return;
    }

    setActivationLoading(true);
    setActivationError("");

    try {
      const response = await fetch("/api/profile/fidelity/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contactCode }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.profile) {
        throw new Error(
          body?.error || "Non siamo riusciti ad attivare la card in automatico. Chiedi a un pirata."
        );
      }

      window.dispatchEvent(new Event("tortuga:profile-updated"));
    } catch (err) {
      setActivationError(err instanceof Error ? err.message : "Errore durante l'attivazione della Fidelity.");
    } finally {
      setActivationLoading(false);
    }
  };

  if (!scenario.enabled && customer.loading && loggedIn) return <LoadingLoyalty />;

  return <section className="loyalty-journey">
    {!loggedIn ? (
      <GuestLoyalty compact={compact} />
    ) : (
      <div className="loyalty-summary">
      <div className="flex items-start justify-between gap-4">
        <div><p className="minimal-eyebrow">La tua Fidelity</p><div className="mt-2 flex items-baseline gap-2"><strong className="points-number">{points}</strong><span>Dobloni disponibili</span></div></div>
        <div className="relative"><RankBadge rank={activeRank.id} label={activeRank.label} size={72} />{isVip ? <span className="vip-ribbon">VIP</span> : null}</div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Metric icon={<CalendarCheck />} value={visits} label="visite annuali" />
        <Metric icon={<Coins />} value={highestPoints} label="massimo Dobloni" />
        <Metric icon={<Shield />} value={activeRank.label} label="rango attuale" />
      </div>
      <div className="rank-route">
        <div className="flex items-center justify-between"><div><p>{isLegend ? "La tua rotta è leggenda" : `Rotta verso ${nextRank.label}`}</p><span>{isLegend ? "Hai raggiunto il rango speciale" : `${missingVisits} visite e ${missingPoints} Dobloni mancanti`}</span></div><Award size={23} /></div>
        <div className="rank-track">{tortugaRanks.map((rank) => { const reached = getRankIndex(rank.id) <= getRankIndex(activeRank.id); return <div key={rank.id} className={reached ? "reached" : ""}><i /><span>{rank.label.replace(" del Tortuga", "")}</span></div>; })}</div>
      </div>
      <div className="mt-4 space-y-2">
        {isLegend && !registeredLegendNickname ? (
          <div className="p-3 rounded-2xl border border-[rgba(216,176,106,0.3)] bg-[rgba(216,176,106,0.06)] text-center space-y-2 animate-in fade-in duration-300">
            <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-strong)] flex items-center justify-center gap-1">
              <Award size={12} /> Sei una Leggenda!
            </h4>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Registra il tuo nickname per entrare nella Hall of Legends.
            </p>
            <button type="button" className="minimal-primary py-1.5 text-[10px] w-full" onClick={() => setLegendModalOpen(true)}>
              Scegli Nickname
            </button>
          </div>
        ) : null}
        {hasCard ? (
          <button type="button" className="minimal-primary w-full" onClick={() => setCardOpen(true)}>
            <QrCode size={18} /> Apri tessera
          </button>
        ) : (
          <button type="button" className="minimal-primary w-full" onClick={handleActivateFidelity} disabled={activationLoading}>
            {activationLoading ? "Sto incidendo la tua card..." : "Attiva la Fidelity"}
          </button>
        )}
        {compact && !scenario.enabled ? (
          <button type="button" className="profile-edit-trigger" onClick={() => setProfileOpen(true)}>
            <Pencil size={16} /> Modifica dati
          </button>
        ) : null}
        {activationError ? (
          <p className="mt-2 text-center text-xs text-[var(--danger)] bg-[var(--danger)]/5 border border-[var(--danger)]/20 rounded-xl px-3 py-2">
            {activationError}
          </p>
        ) : null}
      </div>
    </div>
    )}
    
    {!loggedIn ? beforeHighlights : null}

    {compact && missingBirthDate ? (
      <div className="mt-3 rounded-[1.5rem] border border-[rgba(216,176,106,0.18)] bg-[rgba(216,176,106,0.05)] p-4 flex flex-col gap-2.5 animate-in fade-in duration-300">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(216,176,106,0.22)] bg-[rgba(216,176,106,0.08)] text-[var(--accent-strong)]">
            <Cake size={16} />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-[0.15em] text-[var(--accent-strong)]">Completa la tua Ciurma</h4>
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">
              Non abbiamo ancora la tua data di nascita. Inseriscila per ricevere i regali del compleanno quando festeggi a bordo!
            </p>
          </div>
        </div>
        <button type="button" className="minimal-primary py-2 text-xs w-full" onClick={() => setProfileOpen(true)}>
          Inserisci la data di nascita
        </button>
      </div>
    ) : null}

    {!compact ? <>
      {beforeHighlights}
      <div className="section-heading"><div><p className="minimal-eyebrow">In evidenza</p><h2>Le tue prossime tappe</h2></div></div>
      <DragCarousel className="snap-slides" label="Contenuti in evidenza">
        {birthdayPromo ? (
          <article className="feature-slide birthday-slide">
            <div className="slide-icon"><Cake size={20} /></div>
            <p>{birthdayPromo.isToday ? "Buon compleanno! 🎉" : `Il tuo compleanno è il ${birthdayPromo.label}`}</p>
            <h3>{birthdayPromo.isToday ? "Stasera la cena è offerta da noi!" : "La cena del tuo compleanno è gratis!"}</h3>
            <span>Prenota da 10 persone in su e la tua cena di compleanno è offerta dal Tortuga.</span>
            <button type="button" onClick={openBooking}>
              Prenota ora <ChevronRight size={16} />
            </button>
          </article>
        ) : null}
        {missingBirthDate ? (
          <article className="feature-slide birthday-slide">
            <div className="slide-icon"><Cake size={20} /></div>
            <p>Festeggia a bordo</p>
            <h3>Quando compi gli anni?</h3>
            <span>Aggiungi la data di nascita per ricevere regali speciali per il tuo compleanno.</span>
            <button type="button" onClick={() => setProfileOpen(true)}>
              Inserisci ora <ChevronRight size={16} />
            </button>
          </article>
        ) : null}
        <article className="feature-slide reward-slide"><div className="slide-icon"><Gift /></div><p>Prossimo premio</p><h3>{nextReward?.label ?? "Tutti i premi sbloccati"}</h3><span>{nextReward ? `${nextReward.threshold - points} Dobloni per raggiungerlo` : "La Ciurma ti aspetta"}</span><Link href="/ciurma?tab=rewards#premi">Scopri i premi <ChevronRight size={16} /></Link></article>
        {hasCard ? <article className="feature-slide rank-slide"><div className="slide-icon"><Award /></div><p>Programma ranghi</p><h3>Ogni visita scrive la tua storia</h3><span>Scorri livelli, status e vantaggi dedicati alla Ciurma.</span><Link href="/ciurma?tab=ranks#ranghi">Vedi ranghi e status <ChevronRight size={16} /></Link></article> : loggedIn ? <article className="feature-slide rank-slide"><div className="slide-icon"><Award /></div><p>Fidelity Tortuga</p><h3>Attiva la tua Fidelity</h3><span>Inizia a conquistare ranghi, status e vantaggi dedicati.</span><Link href="/ciurma#attiva-fidelity">Attiva la Fidelity <ChevronRight size={16} /></Link></article> : <article className="feature-slide rank-slide"><div className="slide-icon"><Award /></div><p>Fidelity Tortuga</p><h3>Entra nella Ciurma</h3><span>Accedi e attiva la Fidelity per conquistare ranghi, status e vantaggi dedicati.</span><Link href="/ciurma?recognition=1">Accedi e iscriviti <ChevronRight size={16} /></Link></article>}
        <article className="feature-slide gift-slide"><div className="slide-icon"><Gift /></div><p>Regala Tortuga</p><h3>Gift card per la tua ciurma</h3><span>Scegli una copertina e invia un’esperienza.</span><Link href="/gift#gift-card">Apri Gift <ChevronRight size={16} /></Link></article>
      </DragCarousel>
    </> : null}
    {cardOpen ? <div className="qr-modal" role="dialog" aria-modal="true" aria-label="Tessera Fidelity Tortuga" onClick={() => setCardOpen(false)}><div className={isVip ? "vip-qr-shell" : ""} onClick={(event) => event.stopPropagation()}><div className="fidelity-card-heading"><div><p className="minimal-eyebrow">La tua Fidelity</p><h2>Tessera Tortuga</h2></div>{isVip ? <span>VIP</span> : null}</div>{cardCode ? <FidelityQrCode value={cardCode} label={isVip ? "QR Ciurma VIP Tortuga" : "QR Ciurma Tortuga"} variant={isVip ? "vip" : "default"} /> : <p className="maintenance-note">Nessuna tessera Fidelity associata a questo profilo.</p>}<button type="button" className="minimal-primary w-full" onClick={() => setCardOpen(false)}>Chiudi tessera</button></div></div> : null}
    <ProfileEditModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    <LegendNicknameModal open={legendModalOpen} onClose={() => setLegendModalOpen(false)} email={scenario.enabled ? "demo@tortugabay.it" : customer.email} onSuccess={() => window.dispatchEvent(new Event("tortuga:profile-updated"))} />
  </section>;
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) { return <div className="loyalty-metric"><div>{icon}</div><strong>{value}</strong><span>{label}</span></div>; }
function LoadingLoyalty() { return <section className="loyalty-journey"><div className="loyalty-summary" aria-busy="true"><p className="minimal-eyebrow">La tua Fidelity</p><h2 className="mt-2">Recupero i dati della tessera…</h2><p className="mt-2 text-sm text-[var(--text-muted)]">Sincronizzazione con Cooperto in corso.</p></div></section>; }
function GuestLoyalty({ compact = false }: { compact?: boolean }) {
  const [recognitionOpen, setRecognitionOpen] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("recognition") !== "1") return;
    const frame = window.requestAnimationFrame(() => setRecognitionOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const handleOpen = () => setRecognitionOpen(true);
    window.addEventListener("tortuga:open-recognition", handleOpen);
    return () => window.removeEventListener("tortuga:open-recognition", handleOpen);
  }, []);
  return <>
    <section id="accesso-fidelity" className="guest-loyalty hash-scroll-target">
      <div className="slide-icon"><Anchor /></div>
      <p className="minimal-eyebrow">Entra nella Ciurma</p>
      <h2>Inizia la tua scalata</h2>
      <p>Accedi o registrati per unirti alla Ciurma del Tortuga! Potrai accumulare Dobloni ad ogni visita, salire di rango e sbloccare premi e vantaggi esclusivi.</p>
      <button type="button" className="minimal-primary" onClick={() => setRecognitionOpen(true)}>
        Accedi o registrati
      </button>
    </section>
    {recognitionOpen ? <div className="recognition-overlay" role="dialog" aria-modal="true" aria-labelledby="recognition-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setRecognitionOpen(false); }}>
      <section className="recognition-modal">
        <header><div><p className="minimal-eyebrow">Riconoscimento Ciurma</p><h2 id="recognition-title">Sali a bordo</h2></div><button type="button" onClick={() => setRecognitionOpen(false)} aria-label="Chiudi riconoscimento"><span aria-hidden="true">×</span></button></header>
        <CiurmaRecognition />
      </section>
    </div> : null}
  </>;
}
