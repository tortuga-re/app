"use client";

import { useEffect, useMemo, useState } from "react";
import { useOnPremiseAccess } from "@/lib/on-premise-access";

export function KantaquizTeaser() {
  const { hasAccess } = useOnPremiseAccess();
  const [deviceOS, setDeviceOS] = useState<"ios" | "android" | "other" | null>(null);
  const [kantaquizStart, setKantaquizStart] = useState<string | null>(null);

  useEffect(() => {
    const detectOS = () => {
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) return "ios";
      if (/android/.test(ua)) return "android";
      return "other";
    };

    window.requestAnimationFrame(() => {
      setDeviceOS(detectOS());
    });
  }, []);

  useEffect(() => {
    const checkKantaquiz = async () => {
      try {
        const res = await fetch("/api/game/kantaquiz");
        if (res.ok) {
          const { startTime } = await res.json();
          setKantaquizStart(startTime);
        }
      } catch {
        // Silently fail
      }
    };
    checkKantaquiz();
  }, []);

  const isKantaquizActive = useMemo(() => {
    if (!kantaquizStart) return false;
    const start = new Date(kantaquizStart).getTime();
    const now = new Date().getTime();
    const threeHours = 3 * 60 * 60 * 1000;
    return now - start < threeHours;
  }, [kantaquizStart]);

  if (!isKantaquizActive || !hasAccess) {
    return null;
  }

  return (
    <div id="dr-why" className="panel hash-scroll-target rounded-[2rem] p-5 border-2 border-orange-500/30 bg-orange-500/5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <div>
          <p className="eyebrow text-orange-500">Evento Live</p>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Guida Rapida Dr. Why</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Segui questi passi per sfidare gli altri tavoli al Kantaquiz!</p>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex gap-4">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-black">1</div>
            <div>
              <p className="text-sm font-bold text-white uppercase text-balance">Scarica l&apos;App Ufficiale</p>
              <div className="mt-2 flex gap-3">
                {(deviceOS === "ios" || deviceOS === "other") && (
                  <a 
                    href="https://apps.apple.com/it/app/dr-why/id1465720345" 
                    target="_blank" 
                    rel="noreferrer"
                    className="button-secondary flex-1 py-2 text-[10px] font-bold uppercase text-center"
                  >
                    App Store
                  </a>
                )}
                {(deviceOS === "android" || deviceOS === "other") && (
                  <a 
                    href="https://play.google.com/store/apps/details?id=it.drwhy.quizonlineapp" 
                    target="_blank" 
                    rel="noreferrer"
                    className="button-secondary flex-1 py-2 text-[10px] font-bold uppercase text-center"
                  >
                    Play Store
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-black">2</div>
            <div>
              <p className="text-sm font-bold text-white uppercase">Configura la Rete</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Stacca i <span className="text-orange-400 font-bold">dati mobili</span> e collegati al Wi-Fi: <br/>
                <span className="text-white font-black text-sm tracking-widest uppercase">&quot;DR WI-FI&quot;</span>
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-black">3</div>
            <div>
              <p className="text-sm font-bold text-white uppercase">Accedi al Gioco</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Apri l&apos;app, premi <span className="text-white font-bold">NON ORA</span>, poi <span className="text-white font-bold">CONTROLLER</span> e inserisci il tuo Nickname in alto.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={() => {
              window.location.href = "drwhy://";
              setTimeout(() => {
                if (document.hasFocus()) {
                  const storeUrl = deviceOS === "android" 
                    ? "https://play.google.com/store/apps/details?id=it.drwhy.quizonlineapp"
                    : "https://apps.apple.com/it/app/dr-why/id1465720345";
                  window.open(storeUrl, "_blank");
                }
              }, 1500);
            }}
            className="button-primary w-full py-3 text-xs font-black uppercase tracking-widest"
          >
            APRI APP DR. WHY
          </button>
        </div>
      </div>
    </div>
  );
}
