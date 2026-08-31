"use client";

import { Anchor, Camera, ChevronRight, Gift, KeyRound, QrCode, Send, Wifi } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { DragCarousel } from "@/components/drag-carousel";
import { useCurrentCustomerStatus } from "@/components/customer-status-context";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { formatCouponExpiry, sortActiveCoupons } from "@/lib/customer-profile";
import { tortugaInfoConfig } from "@/lib/config";
import type { HighlightContent } from "@/lib/highlight-content";
import { liveGames, type LiveGameState } from "@/lib/live-game";
import { useOnPremiseAccess } from "@/lib/on-premise-access";

export function TonightPage() {
  const { hasIdentity, updateIdentity } = useCustomerIdentity();
  const customer = useCurrentCustomerStatus();
  const { scenario } = useDemoScenario();
  const { hasAccess: hasOnPremiseAccess } = useOnPremiseAccess();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [liveGame, setLiveGame] = useState<LiveGameState | null>(null);
  const [editorial, setEditorial] = useState<HighlightContent | null>(null);

  useEffect(() => {
    void fetch("/api/live-game").then((response) => response.ok ? response.json() : null).then((body) => setLiveGame(body?.game ?? null)).catch(() => setLiveGame(null));
    void fetch("/api/highlights").then((response) => response.ok ? response.json() : null).then((body) => setEditorial(body?.highlight ?? null)).catch(() => setEditorial(null));
  }, []);

  const submitPhoto = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) { setMessage("Scegli una foto da inviare."); return; }
    setLoading(true); setMessage("");
    const body = new FormData();
    body.set("media", file);
    if (!hasIdentity) { body.set("uploaderName", name); body.set("uploaderEmail", email); }
    const response = await fetch("/api/live-tv/customer-upload", { method: "POST", body });
    const result = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) { setMessage(result?.error ?? "Non siamo riusciti a inviare la foto."); return; }
    if (!hasIdentity) updateIdentity({ firstName: name, email, lastName: "", phone: "", marketingConsent: false });
    setFile(null); if (inputRef.current) inputRef.current.value = "";
    setMessage("Foto inviata in diretta per 10 secondi. Grazie, ciurma!");
  };

  const activeCoupon = sortActiveCoupons(customer.profile?.coupons ?? [])[0];
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", weekday: "short" }).format(new Date());
  const realWeekday = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as const)[weekday as "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat"];
  const currentWeekday = scenario.enabled && scenario.demoWeekday >= 0 ? scenario.demoWeekday : realWeekday;
  const isUpcomingWednesday = currentWeekday === 1 || currentWeekday === 2;
  const programWeekday = isUpcomingWednesday ? 3 : currentWeekday;
  const currentProgram = tortugaInfoConfig.eveningProgram.find((event) => event.weekday === programWeekday);
  const activeGame = scenario.enabled ? (scenario.demoLiveGame === "none" ? null : scenario.demoLiveGame) : liveGame?.active_game;
  const isOnPremise = scenario.enabled ? scenario.onPremise : hasOnPremiseAccess;
  return <main className="minimal-page tonight-page pb-28">
    <div className="minimal-overlap-sheet tonight-sheet">
      <header className="overlap-sheet-intro tonight-intro"><p className="minimal-eyebrow">Al Tortuga si partecipa... sul serio.</p>{isOnPremise ? <p>Manda una foto in diretta.</p> : null}</header>
      <div className="space-y-7">
        {isOnPremise ? <section className="loyalty-summary space-y-4"><div className="flex items-center gap-2"><Camera size={19} className="text-[var(--accent-strong)]" /><div><p className="minimal-eyebrow">Foto Live</p><h2 className="tonight-section-title">Vai in onda per 10 secondi</h2></div></div><form onSubmit={submitPhoto} className="space-y-3">{!hasIdentity ? <><label className="block w-full text-[.73rem] font-bold text-[var(--text)]">Nome<input required value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="mt-2 block min-h-[3.15rem] w-full rounded-2xl border border-[rgba(40,35,28,.16)] bg-[#f2ebdf] px-4 py-3 text-[var(--text)] outline-none focus:border-[rgba(165,43,43,.52)] focus:ring-4 focus:ring-[rgba(165,43,43,.1)]" /></label><label className="block w-full text-[.73rem] font-bold text-[var(--text)]">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 block min-h-[3.15rem] w-full rounded-2xl border border-[rgba(40,35,28,.16)] bg-[#f2ebdf] px-4 py-3 text-[var(--text)] outline-none focus:border-[rgba(165,43,43,.52)] focus:ring-4 focus:ring-[rgba(165,43,43,.1)]" /></label><p className="text-xs leading-relaxed text-[var(--text-muted)]">Ci servono solo per poterti ricontattare se la tua foto sarà votata come la più bella del mese.</p></> : <p className="text-sm text-[var(--text-muted)]">La tua identita di ciurma e gia pronta: scegli la foto e mandala in onda.</p>}<label className="block w-full text-[.73rem] font-bold text-[var(--text)]">La tua foto<input ref={inputRef} required type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block min-h-[3.15rem] w-full rounded-2xl border border-[rgba(40,35,28,.16)] bg-[#f2ebdf] px-3 py-3 text-[var(--text)]" /></label><button type="submit" disabled={loading} className="minimal-primary w-full">{loading ? "Invio in corso..." : <><Send size={17} /> Invia Foto Live</>}</button>{message ? <p className={`text-sm ${message.startsWith("Foto") ? "text-[var(--accent-strong)]" : "text-[var(--danger)]"}`}>{message}</p> : null}</form></section> : null}
        {editorial || !hasIdentity || activeCoupon ? <section><div className="section-heading"><div><p className="minimal-eyebrow">In evidenza</p><h2>Da non perdere</h2></div></div><DragCarousel className="snap-slides" label="Contenuti in evidenza">{editorial ? <article className="feature-slide editorial-slide" style={editorial.background_image_url ? { backgroundImage: `linear-gradient(${editorial.overlay_color ?? "rgba(15,18,16,.62)"}, ${editorial.overlay_color ?? "rgba(15,18,16,.62)"}), url(${editorial.background_image_url})` } : undefined}><div className="slide-icon"><Anchor size={20} /></div><p>{editorial.eyebrow}</p><h3>{editorial.title}</h3><span>{editorial.description}</span><a href={editorial.cta_url}>{editorial.cta_label} <ChevronRight size={16} /></a></article> : null}{!hasIdentity ? <article className="feature-slide reward-slide"><div className="slide-icon"><Gift size={20} /></div><p>Fidelity Tortuga</p><h3>Inizia a conquistare premi</h3><span>Registrati per accumulare Dobloni ad ogni visita e sbloccare vantaggi.</span><Link href="/ciurma?recognition=1">Entra nella Ciurma <ChevronRight size={16} /></Link></article> : null}{activeCoupon ? <article className="feature-slide coupon-slide"><div className="slide-icon"><QrCode size={20} /></div><p>Coupon disponibile</p><h3>Usa il tuo coupon prima che scada</h3><span>{activeCoupon.DataScadenza ? `Valido fino al ${formatCouponExpiry(activeCoupon.DataScadenza)}` : "Il tuo coupon è pronto da utilizzare."}</span><Link href="/ciurma">Vedi coupon <ChevronRight size={16} /></Link></article> : null}</DragCarousel></section> : null}
        {currentProgram ? <section className="tonight-current-program"><article className="evening-program-card"><div className="evening-program-image"><img src={currentProgram.imageUrl} alt={currentProgram.title} /></div><div className="evening-program-copy"><p>{isUpcomingWednesday ? `Prossima serata · ${currentProgram.day}` : currentProgram.day}</p><h3>{currentProgram.title}</h3><span>{currentProgram.description}</span>{activeGame ? <div className="game-context-card"><div className="game-context-heading"><div><p className="minimal-eyebrow">Come giocare</p><span>I passaggi vanno eseguiti in ordine</span></div></div><p className="game-wifi-label">COLLEGATI AL WI-FI</p><div className="game-wifi-row"><span><Wifi aria-hidden="true" />TORTUGA</span><span><KeyRound aria-hidden="true" />PERLANERA</span></div><a href={liveGames[activeGame].url} target="_blank" rel="noreferrer">POI CLICCA QUI <ChevronRight /></a></div> : (currentWeekday === 0 || currentWeekday >= 5) ? <p className="tonight-game-pending">Quando sarà il momento qui appariranno le istruzioni per poter giocare. Si consiglia di fare più squadre possibili per aumentare le possibilità di vittoria.</p> : null}</div></article></section> : null}
      </div>
    </div>
  </main>;
}
