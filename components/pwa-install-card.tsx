"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { pwaConfig, storageKeys } from "@/lib/config";
import { requestJson } from "@/lib/client";
import { FidelityQrCode } from "@/components/fidelity-qr-code";
import { getCouponDisplayCode, getCouponQrValue, formatCouponExpiry } from "@/lib/customer-profile";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import type { CoopertoCoupon, ProfileResponse } from "@/lib/cooperto/types";

type InstallCardMode = "prompt" | "fallback-ios" | "fallback-browser";
const welcomeChestPendingKey = "tortuga-welcome-chest-pending";

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
  const { identity, updateIdentity } = useCustomerIdentity();
  const { scenario } = useDemoScenario();
  const [clientReady, setClientReady] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installDismissedAt, setInstallDismissedAt] = useState<number | null>(null);
  const [promptEvent, setPromptEvent] = useState<DeferredPromptEvent | null>(null);
  const [installFallbackReady, setInstallFallbackReady] = useState(false);
  const [isProbablyMobile, setIsProbablyMobile] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isIosChrome, setIsIosChrome] = useState(false);
  const [evaluationNow, setEvaluationNow] = useState(0);
  const [showAsPopup, setShowAsPopup] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [pushReady, setPushReady] = useState(false);
  const [chestPrepared, setChestPrepared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reward, setReward] = useState<{ coupon: CoopertoCoupon; profile: ProfileResponse; pointsAwarded: number } | null>(null);
  const welcomeChestPreview = scenario.enabled ? scenario.welcomeChestDevice : "none";

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
      setIsIosChrome(/crios/i.test(window.navigator.userAgent));
      setEvaluationNow(Date.now());

      const pendingChest = window.localStorage.getItem(welcomeChestPendingKey);
      if (installed && pendingChest) {
        try {
          const pending = JSON.parse(pendingChest) as { firstName?: string; email?: string };
          setFirstName(pending.firstName ?? "");
          setEmail(pending.email ?? "");
          setChestPrepared(true);
        } catch {
          window.localStorage.removeItem(welcomeChestPendingKey);
        }
      }

      // Se non è installata e non è mai stata rifiutata, mostriamo il popup
      if (!installed && dismissedAt === null) {
        setShowAsPopup(true);
      }
      if (installed) setShowAsPopup(true);
    });

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as DeferredPromptEvent);
    };
 
    const handleInstalled = () => {
      setIsInstalled(true);
      setShowAsPopup(false);
    };

    const handleProfileUpdate = () => {
      // Quando il profilo viene aggiornato (login o salvataggio), cancelliamo lo snooze
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKeys.installPromptDismissedAt);
      }
      setInstallDismissedAt(null);
      setShowAsPopup(true);
    };
 
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("tortuga:profile-updated", handleProfileUpdate);
 
    const timer = setTimeout(() => setInstallFallbackReady(true), 1500);
 
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("tortuga:profile-updated", handleProfileUpdate);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (welcomeChestPreview === "none") return;
    setShowAsPopup(true);
  }, [welcomeChestPreview]);


  const prepareChest = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const response = await requestJson<{ profile: ProfileResponse }>('/api/welcome-chest/prepare', { method: "POST", body: JSON.stringify({ firstName, email, marketingConsent: true }) });
      updateIdentity({ email, firstName: response.profile.contact?.Nome || firstName, lastName: response.profile.contact?.Cognome || "", phone: response.profile.contact?.Telefono || "", marketingConsent: true });
      window.localStorage.setItem(welcomeChestPendingKey, JSON.stringify({ firstName, email }));
      setChestPrepared(true);
      window.dispatchEvent(new Event("tortuga:profile-updated"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Non siamo riusciti a preparare il Baule.");
    } finally { setBusy(false); }
  }, [email, firstName, updateIdentity]);

  const claimChest = useCallback(async () => {
    const response = await requestJson<{ profile: ProfileResponse; coupon: CoopertoCoupon; pointsAwarded: number }>('/api/welcome-chest/claim', { method: "POST", body: JSON.stringify({ firstName, email, marketingConsent: true }) });
    setReward({ profile: response.profile, coupon: response.coupon, pointsAwarded: response.pointsAwarded ?? 0 });
    window.localStorage.removeItem(welcomeChestPendingKey);
    window.dispatchEvent(new Event("tortuga:profile-updated"));
  }, [email, firstName]);

  const enablePush = useCallback(async () => {
    if (!firstName.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Inserisci nome ed email per continuare.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !pwaConfig.vapidPublicKey) {
      setError("Le notifiche non sono supportate o configurate su questo dispositivo.");
      return;
    }
    setBusy(true); setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Le notifiche devono essere attivate per aprire il Baule.");
      const registration = await navigator.serviceWorker.ready;
      const padding = "=".repeat((4 - (pwaConfig.vapidPublicKey.length % 4)) % 4);
      const raw = atob(`${pwaConfig.vapidPublicKey}${padding}`.replace(/-/g, "+").replace(/_/g, "/"));
      const key = Uint8Array.from(raw, (char) => char.charCodeAt(0));
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await requestJson("/api/push/subscriptions", { method: "POST", body: JSON.stringify({ subscription: subscription.toJSON(), email: email.trim().toLowerCase(), permission, installed: true, userAgent: navigator.userAgent }) });
      setPushReady(true);
      await claimChest();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Non siamo riusciti ad attivare le notifiche.");
    } finally { setBusy(false); }
  }, [claimChest, email, firstName]);

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
    if (welcomeChestPreview === "iphone") return "fallback-ios";
    if (welcomeChestPreview === "android") return "prompt";
    if (!clientReady || isInstalled || installSnoozed || !isProbablyMobile || !installFallbackReady) {
      return null;
    }
    if (promptEvent) return "prompt";
    return isIos ? "fallback-ios" : "fallback-browser";
  }, [clientReady, isInstalled, installSnoozed, isProbablyMobile, installFallbackReady, promptEvent, isIos, welcomeChestPreview]);
  const showFullRewards = (welcomeChestPreview !== "none" || !isInstalled) && !identity.email;

  if (welcomeChestPreview === "none" && isInstalled && showAsPopup && (!identity.email || chestPrepared || reward)) {
    return <div className="fixed inset-0 z-[120] flex items-center justify-center px-5 py-6">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
      <section className="relative w-full max-w-sm panel rounded-[2.4rem] border border-[rgba(216,176,106,.28)] p-6 shadow-2xl">
        <button type="button" onClick={dismissPopup} className="absolute right-4 top-4 z-10 rounded-full p-2 text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-white" aria-label="Chiudi Baule di benvenuto">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        {reward && pushReady ? <div className="space-y-5 text-center">
          <p className="eyebrow text-[var(--accent-strong)]">Baule di benvenuto</p>
          <h2 className="text-3xl font-black uppercase italic text-white">Baule aperto</h2>
          <p className="text-sm leading-6 text-[var(--text-muted)]">Hai ricevuto {reward.pointsAwarded} Dobloni e il tuo premio da usare al Tortuga.</p>
          <div className="rounded-[1.6rem] border border-[rgba(216,176,106,.24)] bg-black/20 p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--accent-strong)]">{getCouponDisplayCode(reward.coupon).replace(/-/g, " ")}</p><div className="mx-auto mt-3 w-fit rounded-2xl bg-white p-3"><FidelityQrCode value={getCouponQrValue(reward.coupon)} label="QR coupon Baule di benvenuto" variant="coupon" /></div>{reward.coupon.DataScadenza ? <p className="mt-3 text-xs text-[var(--text-muted)]">Valido fino al {formatCouponExpiry(reward.coupon.DataScadenza)}</p> : null}</div>
          <button type="button" className="button-primary w-full py-3" onClick={() => setShowAsPopup(false)}>Vai alla mia Ciurma</button>
        </div> : <div className="space-y-5">
          <div><p className="eyebrow text-[var(--accent-strong)]">Baule di benvenuto</p><h2 className="mt-2 text-2xl font-black uppercase italic text-white">Completa l&apos;imbarco</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Attiva le notifiche e apri il tuo Baule con 5 Dobloni e un premio da mostrare al personale.</p></div>
          {!chestPrepared ? <><label className="block text-sm text-[var(--text-muted)]">Nome<input className="field mt-1" value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label><label className="block text-sm text-[var(--text-muted)]">Email<input className="field mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label></> : <p className="text-sm leading-6 text-[var(--text-muted)]">Un ultimo passo e il premio è tuo: attiva le notifiche push.</p>}
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <button type="button" className="button-primary w-full py-3" disabled={busy || pushReady} onClick={() => void (chestPrepared ? enablePush() : prepareChest())}>{busy ? "Preparazione..." : chestPrepared ? "Attiva notifiche" : "Richiedi premio"}</button>
        </div>}
      </section>
    </div>;
  }

  if (!mode) return null;

  const content = (
    <div className={showAsPopup ? "" : "panel rounded-[1.9rem] px-5 py-5 border-2 border-[var(--accent-strong)]/20 bg-[var(--accent-soft)]/5"}>
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow text-[var(--accent-strong)]">Inizia l&apos;imbarco</p>
        <button 
          onClick={showAsPopup ? dismissPopup : dismissPermanently} 
          className="text-[var(--text-muted)] hover:text-white transition-colors p-1"
          aria-label="Chiudi Baule di benvenuto"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="mt-2 space-y-2">
        <Image
          src="/images/gift-card-treasure-chest-background.png"
          alt="Baule aperto con monete e tesori"
          width={1536}
          height={1024}
          className="h-28 w-full rounded-2xl border border-[rgba(216,176,106,.24)] object-cover object-[74%_center]"
        /><h2 className="text-xl font-black text-white uppercase italic tracking-tight">Baule di benvenuto</h2>
          <ul className="space-y-1.5 text-[13px] font-bold leading-[1.25] text-[var(--accent-strong)]">
            <li>5 Dobloni - Pari a 50€ di spesa</li>
            <li>Porzione di Gnocco/Tigelle</li>
            {showFullRewards ? <>
              <li>Card Fidelity - ATTIVATA</li>
              <li>Rango Mozzo - CONQUISTATO</li>
              <li>2 Missioni - SBLOCCATE</li>
            </> : null}
          </ul>
          <p className="text-xs leading-5 text-[var(--text-muted)]">Per ricevere il Baule aggiungi l&apos;app alla Home e riaprila dall&apos;icona.</p>
      </div>

      <div className="mt-3 space-y-2">
        {mode === "prompt" ? (
          <button
            onClick={async () => {
              if (welcomeChestPreview === "android") return;
              if (!promptEvent) return;
              await promptEvent.prompt();
              const { outcome } = await promptEvent.userChoice;
              if (outcome === "accepted") {
                setIsInstalled(true);
                setShowAsPopup(false);
              }
              setPromptEvent(null);
            }}
            className="button-primary w-full py-2.5 text-xs font-bold uppercase tracking-widest"
          >
            Installa app
          </button>
        ) : mode === "fallback-ios" ? (
          <div className="space-y-3">
            <video className="aspect-square w-full rounded-2xl border border-[rgba(216,176,106,.24)] bg-black object-cover" autoPlay loop muted playsInline preload="auto">
              <source src="https://app.tortugabay.it/live-tv-media/video/1788114922343-il-mio-video-2.mp4" type="video/mp4" />
            </video>
            <p className="rounded-xl border border-white/5 bg-white/5 p-3 text-xs leading-5 text-[var(--text-muted)]">In Safari tocca <strong>Condividi</strong>, poi scorri e scegli <strong>Aggiungi alla schermata Home</strong>. Riapri quindi Tortuga dall&apos;icona appena creata.</p>
          </div>
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
            className="w-full py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-white transition-colors"
          >
            Lo faro piu tardi
          </button>
        )}
      </div>
    </div>
  );

  if (showAsPopup) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={dismissPopup} />
        <div className="relative w-full max-w-sm panel rounded-[2.5rem] p-6 border-t border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
