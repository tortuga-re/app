"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type RefCallback } from "react";
import { BookOpen, ExternalLink, X } from "lucide-react";
import { BrandedIframe } from "@/components/branded-iframe";
import { PirateSlotMenuGate } from "@/features/pirate-slot/components/PirateSlotMenuGate";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { readStoredOnPremiseAccessExpiry, useOnPremiseAccess } from "@/lib/on-premise-access";
import { hasPlayedPirateSlotToday } from "@/lib/pirate-slot/client-state";
import { isStandalonePwa } from "@/lib/push/client-subscription";

const VENUE_MENU_URL = "https://menu.cooperto.it/1f8ead94-cae9-453c-a0ac-2a5d1b134fb0";
const adventureDismissedKey = "tortuga.adventure-invitation-dismissed";
const MenuContext = createContext<{ openMenu: () => void; openMenuDirect: () => void; menuCtaRef: RefCallback<HTMLElement> }>({
  openMenu: () => undefined,
  openMenuDirect: () => undefined,
  menuCtaRef: () => undefined,
});

export const useMenuOverlay = () => useContext(MenuContext);

export function MenuOverlayProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateMode, setGateMode] = useState<"menu" | "adventure">("menu");
  const [adventureOpen, setAdventureOpen] = useState(false);
  const [preloaded, setPreloaded] = useState(false);
  const { scenario } = useDemoScenario();
  const { hasAccess: hasOnPremiseAccess } = useOnPremiseAccess();
  const { identity } = useCustomerIdentity();
  const onPremise = scenario.enabled ? scenario.onPremise : hasOnPremiseAccess;
  const preloadTargets = useRef(new Set<HTMLElement>());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const menuCtaRef = useCallback<RefCallback<HTMLElement>>((node) => {
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

  useEffect(() => {
    const handleDemoGate = () => {
      setGateMode("menu");
      setGateOpen(true);
    };
    window.addEventListener("tortuga_demo_open_slot_gate", handleDemoGate);
    return () => window.removeEventListener("tortuga_demo_open_slot_gate", handleDemoGate);
  }, []);

  useEffect(() => {
    const handleSlotRequest = () => {
      setGateMode("adventure");
      setGateOpen(true);
    };
    window.addEventListener("tortuga:open-pirate-slot", handleSlotRequest);
    return () => window.removeEventListener("tortuga:open-pirate-slot", handleSlotRequest);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (onPremise) return;
    if (identity.email || isStandalonePwa()) return;
    if (window.localStorage.getItem(adventureDismissedKey) === "true") return;
    const timer = window.setTimeout(() => setAdventureOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, [identity.email, onPremise]);

  const openMenuDirect = useCallback(() => {
    setGateOpen(false);
    setOpen(true);
  }, []);

  const openMenu = useCallback(() => {
    const hasLiveOnPremiseAccess = onPremise || readStoredOnPremiseAccessExpiry() > Date.now();
    if (hasLiveOnPremiseAccess && !hasPlayedPirateSlotToday(identity.email)) {
      setGateMode("menu");
      setGateOpen(true);
      return;
    }
    setOpen(true);
  }, [onPremise, identity.email]);

  return <MenuContext.Provider value={{ openMenu, openMenuDirect, menuCtaRef }}>
    {children}
    {adventureOpen && !onPremise ? <div className="profile-edit-overlay" role="dialog" aria-modal="true" aria-labelledby="adventure-invitation-title">
      <section className="profile-edit-modal">
        <header><div><p className="minimal-eyebrow">Ciao</p><h2 id="adventure-invitation-title">Che ne dici di iniziare l&apos;avventura al Tortuga tentando la fortuna?</h2></div><button type="button" onClick={() => { window.localStorage.setItem(adventureDismissedKey, "true"); setAdventureOpen(false); }} aria-label="Chiudi popup"><X size={18} /></button></header>
        <div className="mt-5 grid gap-3"><button type="button" className="minimal-primary w-full" onClick={() => { setAdventureOpen(false); setGateMode("adventure"); setGateOpen(true); }}>Sì, tentiamo la fortuna</button><button type="button" className="minimal-secondary w-full" onClick={() => { window.localStorage.setItem(adventureDismissedKey, "true"); setAdventureOpen(false); }}>No, grazie</button></div>
      </section>
    </div> : null}
    <PirateSlotMenuGate open={gateOpen} entryMode={gateMode} onClose={() => setGateOpen(false)} onOpenMenu={openMenuDirect} />
    {open || preloaded ? <div className={open ? "booking-overlay" : "hidden"} role="dialog" aria-modal="true" aria-label="Menu del locale Tortuga">
      <header><div><BookOpen size={19} /><span>Menu Tortuga</span></div><div className="flex gap-2"><a href={VENUE_MENU_URL} target="_blank" rel="noreferrer" aria-label="Apri il menu nel browser"><ExternalLink size={19} /></a><button onClick={() => setOpen(false)} aria-label="Chiudi menu"><X size={22} /></button></div></header>
      <BrandedIframe src={VENUE_MENU_URL} title="Menu del locale Tortuga" />
    </div> : null}
  </MenuContext.Provider>;
}
