"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type RefCallback } from "react";
import { BookOpen, ExternalLink, X } from "lucide-react";
import { BrandedIframe } from "@/components/branded-iframe";
import { PirateSlotMenuGate } from "@/features/pirate-slot/components/PirateSlotMenuGate";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { hasPlayedPirateSlotToday } from "@/lib/pirate-slot/client-state";

const VENUE_MENU_URL = "https://menu.cooperto.it/1f8ead94-cae9-453c-a0ac-2a5d1b134fb0";
const MenuContext = createContext<{ openMenu: () => void; openMenuDirect: () => void; menuCtaRef: RefCallback<HTMLElement> }>({
  openMenu: () => undefined,
  openMenuDirect: () => undefined,
  menuCtaRef: () => undefined,
});

export const useMenuOverlay = () => useContext(MenuContext);

export function MenuOverlayProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [preloaded, setPreloaded] = useState(false);
  const { hasAccess: hasOnPremiseAccess } = useOnPremiseAccess();
  const { identity } = useCustomerIdentity();
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

  const openMenuDirect = useCallback(() => {
    setGateOpen(false);
    setOpen(true);
  }, []);

  const openMenu = useCallback(() => {
    if (hasOnPremiseAccess && !hasPlayedPirateSlotToday(identity.email)) {
      setGateOpen(true);
      return;
    }
    setOpen(true);
  }, [hasOnPremiseAccess, identity.email]);

  return <MenuContext.Provider value={{ openMenu, openMenuDirect, menuCtaRef }}>
    {children}
    <PirateSlotMenuGate open={gateOpen} onClose={() => setGateOpen(false)} onOpenMenu={openMenuDirect} />
    {open || preloaded ? <div className={open ? "booking-overlay" : "hidden"} role="dialog" aria-modal="true" aria-label="Menu del locale Tortuga">
      <header><div><BookOpen size={19} /><span>Menu Tortuga</span></div><div className="flex gap-2"><a href={VENUE_MENU_URL} target="_blank" rel="noreferrer" aria-label="Apri il menu nel browser"><ExternalLink size={19} /></a><button onClick={() => setOpen(false)} aria-label="Chiudi menu"><X size={22} /></button></div></header>
      <BrandedIframe src={VENUE_MENU_URL} title="Menu del locale Tortuga" />
    </div> : null}
  </MenuContext.Provider>;
}
