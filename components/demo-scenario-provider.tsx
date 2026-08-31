"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ChevronDown, FlaskConical, RotateCcw, X } from "lucide-react";
import type { TortugaRankId } from "@/lib/loyalty-ranks";

export type DemoScenario = {
  enabled: boolean;
  loggedIn: boolean;
  points: number;
  highestPoints: number;
  visits: number;
  historicalRank: TortugaRankId;
  maintained: boolean;
  isVip: boolean;
  hasReservation: boolean;
  hasCoupon: boolean;
  onPremise: boolean;
  demoBirthday: boolean;
  demoEditorial: boolean;
  demoReceiptPending: boolean;
  demoLastVisitDate: string;
  welcomeChestDevice: "none" | "iphone" | "android";
  demoWeekday: number;
  demoLiveGame: "none" | "kantaquiz" | "cervellone";
  demoLiveGameSession: number;
};

const defaults: DemoScenario = {
  enabled: false,
  loggedIn: true,
  points: 42,
  highestPoints: 42,
  visits: 7,
  historicalRank: "corsaro",
  maintained: true,
  isVip: false,
  hasReservation: false,
  hasCoupon: true,
  onPremise: false,
  demoBirthday: false,
  demoEditorial: false,
  demoReceiptPending: false,
  demoLastVisitDate: "",
  welcomeChestDevice: "none",
  demoWeekday: -1,
  demoLiveGame: "none",
  demoLiveGameSession: 0,
};

const DemoContext = createContext<{ scenario: DemoScenario; update: (patch: Partial<DemoScenario>) => void } | null>(null);
const STORAGE_KEY = "tortuga.dev-scenario.v1";

export function useDemoScenario() {
  return useContext(DemoContext) ?? { scenario: { ...defaults, enabled: false }, update: () => undefined };
}

export function DemoScenarioProvider({ children }: { children: React.ReactNode }) {
  // Server and browser must start from the same snapshot. The saved demo is
  // restored only after hydration so persisted values cannot change the HTML.
  const [scenario, setScenario] = useState<DemoScenario>(defaults);
  const [open, setOpen] = useState(false);
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!isDev) return;

    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setScenario({ ...defaults, ...JSON.parse(saved) });
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isDev]);

  const update = useCallback((patch: Partial<DemoScenario>) => {
    setScenario((value) => {
      const isNewDemoGameActivation = Boolean(
        patch.demoLiveGame &&
        patch.demoLiveGame !== "none" &&
        patch.demoLiveGame !== value.demoLiveGame,
      );
      const next = {
        ...value,
        ...patch,
        ...(isNewDemoGameActivation
          ? { demoLiveGameSession: value.demoLiveGameSession + 1 }
          : {}),
      };
      if (isDev) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [isDev]);

  const value = useMemo(() => ({ scenario, update }), [scenario, update]);

  return (
    <DemoContext.Provider value={value}>
      {children}
      {isDev ? (
        <div className="fixed bottom-[calc(var(--bottom-nav-clearance)+.75rem)] left-3 z-[80] max-w-[calc(100vw-1.5rem)]">
          {!open ? (
            <button className="demo-launcher" onClick={() => setOpen(true)} aria-label="Apri scenari demo">
              <FlaskConical size={18} /> Scenari
            </button>
          ) : (
            <aside className="demo-panel w-[min(22rem,calc(100vw-1.5rem))]">
              <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
                <div><strong>Laboratorio scenari</strong><p>Le modifiche sono immediate.</p></div>
                <button className="icon-button" onClick={() => setOpen(false)}><X size={18} /></button>
              </div>
              <div className="max-h-[55vh] space-y-4 overflow-y-auto px-4 py-4">
                <Toggle label="Usa dati demo" checked={scenario.enabled} onChange={(enabled) => update({ enabled })} />
                <div className="grid grid-cols-2 gap-2">
                  <Toggle label="Login" checked={scenario.loggedIn} onChange={(loggedIn) => update({ loggedIn })} />
                  <Toggle label="Rango mantenuto" checked={scenario.maintained} onChange={(maintained) => update({ maintained })} />
                  <Toggle label="Cliente VIP" checked={scenario.isVip} onChange={(isVip) => update({ isVip })} />
                  <Toggle label="Prenotazione" checked={scenario.hasReservation} onChange={(hasReservation) => update({ hasReservation })} />
                  <Toggle label="Coupon" checked={scenario.hasCoupon} onChange={(hasCoupon) => update({ hasCoupon })} />
                  <Toggle label="Nel locale" checked={scenario.onPremise} onChange={(onPremise) => update({ onPremise })} />
                  <Toggle label="Compleanno" checked={scenario.demoBirthday} onChange={(demoBirthday) => update({ demoBirthday })} />
                  <Toggle label="Contenuto editoriale" checked={scenario.demoEditorial} onChange={(demoEditorial) => update({ demoEditorial })} />
                  <Toggle label="Scontrino da caricare" checked={scenario.demoReceiptPending} onChange={(demoReceiptPending) => update({ demoReceiptPending })} />
                <label className="demo-field"><span>Data ultima visita</span><input type="date" value={scenario.demoLastVisitDate} onChange={(event) => update({ demoLastVisitDate: event.target.value })} /></label>
                <label className="demo-field"><span>Anteprima Baule</span><select value={scenario.welcomeChestDevice} onChange={(event) => update({ welcomeChestDevice: event.target.value as DemoScenario["welcomeChestDevice"] })}><option value="none">Nessuna</option><option value="iphone">iPhone</option><option value="android">Android</option></select><ChevronDown size={16} /></label>
                <label className="demo-field"><span>Giorno simulato</span><select value={scenario.demoWeekday} onChange={(event) => update({ demoWeekday: Number(event.target.value) })}><option value={-1}>Reale</option><option value={1}>Lunedi</option><option value={2}>Martedi</option><option value={3}>Mercoledi</option><option value={4}>Giovedi</option><option value={5}>Venerdi</option><option value={6}>Sabato</option><option value={0}>Domenica</option></select><ChevronDown size={16} /></label>
                <label className="demo-field"><span>Istruzioni gioco</span><select value={scenario.demoLiveGame} onChange={(event) => update({ demoLiveGame: event.target.value as DemoScenario["demoLiveGame"] })}><option value="none">Nessuna</option><option value="kantaquiz">Dr Why</option><option value="cervellone">Cervellone</option></select><ChevronDown size={16} /></label>
                </div>
                <Range label="Dobloni disponibili" value={scenario.points} max={130} onChange={(points) => update({ points })} />
                <Range label="Massimo Dobloni raggiunto" value={scenario.highestPoints} max={130} onChange={(highestPoints) => update({ highestPoints })} />
                <Range label="Visite annuali" value={scenario.visits} max={25} onChange={(visits) => update({ visits })} />
                <label className="demo-field"><span>Massimo rango storico</span><select value={scenario.historicalRank} onChange={(e) => update({ historicalRank: e.target.value as TortugaRankId })}><option value="mozzo">Mozzo</option><option value="corsaro">Corsaro</option><option value="capitano">Capitano</option><option value="leggenda">Leggenda</option></select><ChevronDown size={16} /></label>
                <button className="demo-reset" onClick={() => update(defaults)}><RotateCcw size={15} /> Ripristina esempio</button>
              </div>
            </aside>
          )}
        </div>
      ) : null}
    </DemoContext.Provider>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="demo-toggle"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}

function Range({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  return <label className="demo-range"><span>{label}<strong>{value}</strong></span><input type="range" min="0" max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}
