"use client";

import { createContext, useContext, useState } from "react";
import { BookOpen, ExternalLink, X } from "lucide-react";
import { BrandedIframe } from "@/components/branded-iframe";

const VENUE_MENU_URL = "https://menu.cooperto.it/1f8ead94-cae9-453c-a0ac-2a5d1b134fb0";
const MenuContext = createContext<{ openMenu: () => void }>({ openMenu: () => undefined });

export const useMenuOverlay = () => useContext(MenuContext);

export function MenuOverlayProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <MenuContext.Provider value={{ openMenu: () => setOpen(true) }}>
    {children}
    {open ? <div className="booking-overlay" role="dialog" aria-modal="true" aria-label="Menu del locale Tortuga">
      <header><div><BookOpen size={19} /><span>Menu Tortuga</span></div><div className="flex gap-2"><a href={VENUE_MENU_URL} target="_blank" rel="noreferrer" aria-label="Apri il menu nel browser"><ExternalLink size={19} /></a><button onClick={() => setOpen(false)} aria-label="Chiudi menu"><X size={22} /></button></div></header>
      <BrandedIframe src={VENUE_MENU_URL} title="Menu del locale Tortuga" />
    </div> : null}
  </MenuContext.Provider>;
}
