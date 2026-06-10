"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { pwaConfig, storageKeys } from "@/lib/config";

type InstallCardMode = "prompt" | "fallback-ios" | "fallback-browser";

interface DeferredPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const readTimestamp = (key: string) => {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(key);
  if (!stored) return null;
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? parsed : null;
};

const writeTimestamp = (key: string, value: number) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(value));
};

const isStandaloneDisplayMode = () => {
  if (typeof window === "undefined") return false;
  const standaloneMatch = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return standaloneMatch || iosStandalone;
};

const isProbablyMobileDevice = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(max-width: 820px)").matches || /android|iphone|ipad|ipod/i.test(window.navigator.userAgent);
};

const isIosDevice = () => {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
};

export function PwaInstallCard() {
  const [clientReady, setClientReady] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installDismissedAt, setInstallDismissedAt] = useState<number | null>(null);
  const [promptEvent, setPromptEvent] = useState<DeferredPromptEvent | null>(null);
  const [installFallbackReady, setInstallFallbackReady] = useState(false);
  const [isProbablyMobile, setIsProbablyMobile] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [evaluationNow, setEvaluationNow] = useState(0);
  const [showAsPopup, setShowAsPopup] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    window.requestAnimationFrame(() => {
      setClientReady(true);
      const installed = isStandaloneDisplayMode();
      const dismissedAt = readTimestamp(storageKeys.installPromptDismissedAt);
      
      setIsInstalled(installed);
      setInstallDismissedAt(dismissedAt);
      setIsProbablyMobile(isProbablyMobileDevice());
      setIsIos(isIosDevice());
      setEvaluationNow(Date.now());

      // Se non è installata e non è mai stata rifiutata, mostriamo il popup
      if (!installed && dismissedAt === null) {
        setShowAsPopup(true);
      }
    });

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as DeferredPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setShowAsPopup(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    const timer = setTimeout(() => setInstallFallbackReady(true), 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
      clearTimeout(timer);
    };
  }, []);

  const dismissPopup = useCallback(() => {
    setShowAsPopup(false);
    // Salviamo un timestamp "finto" o speciale per dire che il popup è stato visto
    // ma vogliamo ancora vedere la card inline.
    // Usiamo il valore '1' come flag.
    writeTimestamp(storageKeys.installPromptDismissedAt, 1);
    setInstallDismissedAt(1);
  }, []);

  const dismissPermanently = useCallback(() => {
    const now = Date.now();
    writeTimestamp(storageKeys.installPromptDismissedAt, now);
    setInstallDismissedAt(now);
  }, []);

  const installSnoozed = useMemo(() => {
    if (installDismissedAt === null || installDismissedAt === 1) return false;
    // Se è un timestamp reale (> 1), applichiamo lo snooze di 7 giorni
    return evaluationNow - installDismissedAt < pwaConfig.installReminderWindowMs;
  }, [installDismissedAt, evaluationNow]);

  const mode = useMemo<InstallCardMode | null>(() => {
    if (!clientReady || isInstalled || installSnoozed || !isProbablyMobile || !installFallbackReady) {
      return null;
    }
    if (promptEvent) return "prompt";
    return isIos ? "fallback-ios" : "fallback-browser";
  }, [clientReady, isInstalled, installSnoozed, isProbablyMobile, installFallbackReady, promptEvent, isIos]);

  if (!mode) return null;

  const content = (
    <div className={showAsPopup ? "" : "panel rounded-[1.9rem] px-5 py-5 border-2 border-[var(--accent-strong)]/20 bg-[var(--accent-soft)]/5"}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow text-[var(--accent-strong)]">Installazione App</p>
          <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Porta il Tortuga con te</h2>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            {mode === "prompt"
              ? "Installa l'app per accedere velocemente a giochi, prenotazioni e premi."
              : mode === "fallback-ios"
                ? "Premi il tasto Condividi in Safari e scegli 'Aggiungi alla schermata Home'."
                : "Apri il menu del browser e scegli 'Installa app' o 'Aggiungi a Home'."}
          </p>
        </div>
        <button 
          onClick={showAsPopup ? dismissPopup : dismissPermanently} 
          className="text-[var(--text-muted)] hover:text-white transition-colors p-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {mode === "prompt" ? (
          <button
            onClick={async () => {
              if (!promptEvent) return;
              await promptEvent.prompt();
              const { outcome } = await promptEvent.userChoice;
              if (outcome === "accepted") {
                setIsInstalled(true);
                setShowAsPopup(false);
              }
              setPromptEvent(null);
            }}
            className="button-primary w-full py-3 text-xs font-bold uppercase tracking-widest"
          >
            Installa Ora
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 text-xs text-[var(--text-muted)] border border-white/5 italic">
            <svg className="w-4 h-4 shrink-0 text-[var(--accent-strong)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Usa il comando nativo del tuo browser per aggiungere l&apos;icona alla Home.
          </div>
        )}
        
        {showAsPopup && (
          <button 
            onClick={dismissPopup}
            className="w-full py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-white transition-colors"
          >
            Continua nel browser
          </button>
        )}
      </div>
    </div>
  );

  if (showAsPopup) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={dismissPopup} />
        <div className="relative w-full max-w-sm panel rounded-[2.5rem] p-8 border-t border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
