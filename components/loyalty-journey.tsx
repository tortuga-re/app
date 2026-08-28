"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Anchor, Award, CalendarCheck, ChevronRight, Gift, Pencil, QrCode, Shield, Coins, Cake, X } from "lucide-react";
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
import { BrandedIframe } from "@/components/branded-iframe";
import { getBirthdayInsight, sortActiveCoupons, formatCouponExpiry, getCouponDisplayCode, getCouponQrValue } from "@/lib/customer-profile";
import type { HighlightContent } from "@/lib/highlight-content";

const CiurmaRecognition = dynamic(() => import("@/components/profile-screen").then((module) => module.CiurmaScreen), { ssr: false });

export function LoyaltyJourney({ compact = false, beforeHighlights }: { compact?: boolean; beforeHighlights?: React.ReactNode }) {
  const [now] = useState(() => Date.now());
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
  const { openBooking, hasUpcomingReservationSoon } = useBookingOverlay();
  const [editorial, setEditorial] = useState<HighlightContent | null>(null);
  const demoEditorial: HighlightContent = { id: "demo", eyebrow: "Novità a bordo", title: "Una rotta da non perdere", description: "Scopri il prossimo appuntamento della Ciurma.", cta_label: "Prenota", cta_url: "/prenota", starts_at: "", ends_at: null, background_image_url: null, overlay_color: null, priority: 999 };
  const visibleEditorial = scenario.enabled && scenario.demoEditorial ? demoEditorial : editorial;
  const editorialHasBookingCta = Boolean(visibleEditorial && /prenot|booking|cooperto\.it\/in/i.test(`${visibleEditorial.cta_label} ${visibleEditorial.cta_url}`));
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [editorialLinkOpen, setEditorialLinkOpen] = useState(false);
  const editorialCtaExternal = Boolean(visibleEditorial && /^https?:\/\//i.test(visibleEditorial.cta_url));
  const [couponOpen, setCouponOpen] = useState(false);
  const activeCoupons = useMemo(() => sortActiveCoupons(scenario.enabled ? (scenario.hasCoupon ? [{ CodiceCoupon: "DEMO", Utilizzato: false }] : []) : (customer.profile?.coupons ?? [])), [scenario.enabled, scenario.hasCoupon, customer.profile?.coupons]);
  const receiptMissionPending = useMemo(() => {
    if (!loggedIn) return false;

    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const lastVisit = scenario.enabled ? scenario.demoLastVisitDate : customer.profile?.contact?.DataUltimaVisita;
    const timestamp = Date.parse(lastVisit ?? "");
    if (Number.isNaN(timestamp)) return false;

    const elapsed = now - timestamp;
    const isInReceiptWindow = elapsed > threeDays && elapsed <= thirtyDays;
    if (!isInReceiptWindow) return false;

    return scenario.enabled
      ? scenario.demoReceiptPending
      : !customer.profile?.unlockedAchievementIds?.includes("assaggiatore-ufficiale");
  }, [loggedIn, now, scenario.enabled, scenario.demoLastVisitDate, scenario.demoReceiptPending, customer.profile?.contact?.DataUltimaVisita, customer.profile?.unlockedAchievementIds]);
  const surveyEligible = useMemo(() => { if (!loggedIn) return false; const lastVisit = customer.profile?.contact?.DataUltimaVisita; if (scenario.enabled) { const demoTime = Date.parse(scenario.demoLastVisitDate); return !Number.isNaN(demoTime) && now - demoTime <= 3 * 24 * 60 * 60 * 1000 && now >= demoTime; } if (!lastVisit) return false; const elapsed = now - Date.parse(lastVisit); return Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 3 * 24 * 60 * 60 * 1000; }, [loggedIn, now, scenario.enabled, scenario.demoLastVisitDate, customer.profile?.contact?.DataUltimaVisita]);
  useEffect(() => { if (scenario.enabled) return; fetch("/api/highlights").then((r) => r.ok ? r.json() : null).then((body) => setEditorial(body?.highlight ?? null)).catch(() => setEditorial(null)); }, [scenario.enabled]);

  /* â”€â”€ Birthday promo: show for the 14 days before the birthday (and on the day itself).
     Hidden if there is already a future reservation. â”€â”€ */
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
        <Metric icon={<Coins />} value={highestPoints} label="record dobloni" />
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
      {loggedIn ? beforeHighlights : null}
      <div className="section-heading"><div><p className="minimal-eyebrow">In evidenza</p><h2>Le tue prossime tappe</h2></div></div>
      <DragCarousel className="snap-slides" label="Contenuti in evidenza">
        {visibleEditorial ? <article className="feature-slide editorial-slide" style={visibleEditorial.background_image_url ? { backgroundImage: `linear-gradient(${visibleEditorial.overlay_color ?? "rgba(15,18,16,.62)"}, ${visibleEditorial.overlay_color ?? "rgba(15,18,16,.62)"}), url(${visibleEditorial.background_image_url})` } : undefined}><div className="slide-icon"><Anchor size={20} /></div><p>{visibleEditorial.eyebrow}</p><h3>{visibleEditorial.title}</h3><span>{visibleEditorial.description}</span>{!hasUpcomingReservationSoon || !editorialHasBookingCta ? editorialCtaExternal ? <button type="button" onClick={() => setEditorialLinkOpen(true)}>{visibleEditorial.cta_label} <ChevronRight size={16} /></button> : <a href={visibleEditorial.cta_url}>{visibleEditorial.cta_label} <ChevronRight size={16} /></a> : null}</article> : null}
        {loggedIn && activeCoupons[0] ? <article className="feature-slide coupon-slide"><div className="slide-icon"><QrCode size={20} /></div><p>Coupon disponibile</p><h3>Usa il tuo coupon prima che scada</h3><span>{hasUpcomingReservationSoon ? "Potrai usarlo durante la tua prossima visita già confermata." : activeCoupons[0].DataScadenza ? `Valido fino al ${formatCouponExpiry(activeCoupons[0].DataScadenza)}` : "Il tuo coupon è pronto da utilizzare."}</span><div className="slide-actions"><button type="button" onClick={() => setCouponOpen(true)}>Vedi coupon <ChevronRight size={16} /></button>{!hasUpcomingReservationSoon ? <button type="button" onClick={openBooking}>Prenota <ChevronRight size={16} /></button> : null}</div></article> : null}
        {surveyEligible ? <article className="feature-slide survey-slide"><div className="slide-icon"><Gift size={20} /></div><p>La tua opinione conta</p><h3>Raccontaci la tua visita</h3><span>Compila un breve sondaggio: al termine riceverai un regalo di ringraziamento.</span><button type="button" onClick={() => setSurveyOpen(true)}>Compila il sondaggio <ChevronRight size={16} /></button></article> : null}
        {receiptMissionPending ? <article className="feature-slide receipt-slide"><div className="slide-icon"><QrCode size={20} /></div><p>Impresa da conquistare</p><h3>Il tuo bottino è quasi completo</h3><span>La tua visita è registrata: carica lo scontrino per sbloccare Assaggiatore Ufficiale.</span><Link href="/ciurma/carica-scontrino">Carica scontrino <ChevronRight size={16} /></Link></article> : null}
        {loggedIn && birthdayPromo ? (
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
        {loggedIn ? <article className="feature-slide reward-slide"><div className="slide-icon"><Gift /></div><p>Prossimo premio</p><h3>{nextReward?.label ?? "Tutti i premi sbloccati"}</h3><span>{nextReward ? `${nextReward.threshold - points} Dobloni per raggiungerlo` : "La Ciurma ti aspetta"}</span><Link href="/ciurma?tab=rewards#premi">Scopri i premi <ChevronRight size={16} /></Link></article> : <article className="feature-slide reward-slide"><div className="slide-icon"><Gift /></div><p>Fidelity Tortuga</p><h3>Inizia a conquistare premi</h3><span>Registrati per accumulare Dobloni ad ogni visita e sbloccare vantaggi.</span><Link href="/ciurma?recognition=1">Entra nella Ciurma <ChevronRight size={16} /></Link></article>}
        {loggedIn && hasCard && !isLegend ? <article className="feature-slide rank-progress-slide"><div className="slide-icon"><Award size={20} /></div><p>Rotta verso {nextRank.label}</p><h3>Il prossimo rango è vicino</h3><span>{hasUpcomingReservationSoon ? `La tua prossima visita già confermata ti porterà più vicina al rango di ${nextRank.label}.` : `Ti mancano ${missingVisits} ${missingVisits === 1 ? "visita" : "visite"} e ${missingPoints} Dobloni per raggiungere il rango di ${nextRank.label}.`}</span>{!hasUpcomingReservationSoon ? <button type="button" onClick={openBooking}>Prenota <ChevronRight size={16} /></button> : null}</article> : !hasCard && loggedIn ? <article className="feature-slide rank-slide"><div className="slide-icon"><Award /></div><p>Fidelity Tortuga</p><h3>Attiva la tua Fidelity</h3><span>Inizia a conquistare ranghi, status e vantaggi dedicati.</span><Link href="/ciurma#attiva-fidelity">Attiva la Fidelity <ChevronRight size={16} /></Link></article> : !loggedIn ? <article className="feature-slide rank-slide"><div className="slide-icon"><Award /></div><p>Fidelity Tortuga</p><h3>Entra nella Ciurma</h3><span>Accedi e attiva la Fidelity per conquistare ranghi, status e vantaggi dedicati.</span><Link href="/ciurma?recognition=1">Accedi e iscriviti <ChevronRight size={16} /></Link></article> : null}
        <article className="feature-slide gift-slide"><div className="slide-icon"><Gift /></div><p>Regala Tortuga</p><h3>Gift card per la tua ciurma</h3><span>Scegli una copertina e invia un’esperienza.</span><Link href="/gift#gift-card">Apri Gift <ChevronRight size={16} /></Link></article>
      </DragCarousel>
    </> : null}
    {cardOpen ? <div className="qr-modal" role="dialog" aria-modal="true" aria-label="Tessera Fidelity Tortuga" onClick={() => setCardOpen(false)}><div className={isVip ? "vip-qr-shell" : ""} onClick={(event) => event.stopPropagation()}><div className="fidelity-card-heading"><div><p className="minimal-eyebrow">La tua Fidelity</p><h2>Tessera Tortuga</h2></div>{isVip ? <span>VIP</span> : null}</div>{cardCode ? <FidelityQrCode value={cardCode} label={isVip ? "QR Ciurma VIP Tortuga" : "QR Ciurma Tortuga"} variant={isVip ? "vip" : "default"} /> : <p className="maintenance-note">Nessuna tessera Fidelity associata a questo profilo.</p>}<button type="button" className="minimal-primary w-full" onClick={() => setCardOpen(false)}>Chiudi tessera</button></div></div> : null}
    {couponOpen && activeCoupons[0] ? <div className="coupon-modal" role="dialog" aria-modal="true" aria-labelledby="coupon-modal-title" onClick={() => setCouponOpen(false)}><div className="coupon-modal-card" onClick={(event) => event.stopPropagation()}><button className="coupon-modal-close" type="button" onClick={() => setCouponOpen(false)} aria-label="Chiudi coupon"><X /></button><p className="minimal-eyebrow">Il tuo coupon</p><h2 id="coupon-modal-title">Pronto da utilizzare</h2><FidelityQrCode value={getCouponQrValue(activeCoupons[0])} label={`QR coupon ${getCouponDisplayCode(activeCoupons[0])}`} variant="coupon" /><div className="coupon-code"><span>Codice coupon</span><strong>{getCouponDisplayCode(activeCoupons[0])}</strong></div>{activeCoupons[0].DataScadenza ? <p className="coupon-expiry">Valido fino al {formatCouponExpiry(activeCoupons[0].DataScadenza)}</p> : null}{!hasUpcomingReservationSoon ? <button type="button" className="minimal-primary coupon-modal-action" onClick={() => { setCouponOpen(false); openBooking(); }}>Prenota</button> : <button type="button" className="minimal-primary coupon-modal-action" onClick={() => setCouponOpen(false)}>Chiudi</button>}</div></div> : null}
    <ProfileEditModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    <LegendNicknameModal open={legendModalOpen} onClose={() => setLegendModalOpen(false)} email={scenario.enabled ? "demo@tortugabay.it" : customer.email} onSuccess={() => window.dispatchEvent(new Event("tortuga:profile-updated"))} />
    {surveyOpen ? <div className="booking-overlay" role="dialog" aria-modal="true" aria-label="Sondaggio Tortuga"><header><div><Gift size={18} /><strong>Sondaggio Tortuga</strong></div><button type="button" onClick={() => setSurveyOpen(false)} aria-label="Chiudi sondaggio"><X size={18} /></button></header><BrandedIframe src="https://sondaggi.cooperto.it/in/4463def3" title="Sondaggio Tortuga" /></div> : null}
    {editorialLinkOpen && visibleEditorial && editorialCtaExternal ? <div className="booking-overlay" role="dialog" aria-modal="true" aria-label={visibleEditorial.title}><header><div><Anchor size={18} /><strong>{visibleEditorial.title}</strong></div><button type="button" onClick={() => setEditorialLinkOpen(false)} aria-label="Chiudi contenuto"><X size={18} /></button></header><BrandedIframe src={visibleEditorial.cta_url} title={visibleEditorial.title} /></div> : null}
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
