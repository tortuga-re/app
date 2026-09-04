"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { pwaConfig, storageKeys } from "@/lib/config";
import { requestJson } from "@/lib/client";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import type { CoopertoCoupon, ProfileResponse } from "@/lib/cooperto/types";
import {
  ensureCurrentPushSubscription,
  isStandalonePwa,
} from "@/lib/push/client-subscription";
import { welcomeChestStartEvent } from "@/lib/welcome-chest/client-flow";

type InstallCardMode = "prompt" | "fallback-ios" | "fallback-browser";
const welcomeChestPendingKey = "tortuga-welcome-chest-pending";
const welcomeChestRequestedKey = "tortuga-welcome-chest-requested";
const welcomeChestIdentityKey = "tortuga-welcome-chest-identity";

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
  const [evaluationNow, setEvaluationNow] = useState(0);
  const [showAsPopup, setShowAsPopup] = useState(false);
  const [welcomeRequested, setWelcomeRequested] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [pushReady, setPushReady] = useState(false);
  const [chestPrepared, setChestPrepared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reward, setReward] = useState<{ coupon: CoopertoCoupon; profile: ProfileResponse; pointsAwarded: number } | null>(null);
  const welcomeChestPreview = scenario.enabled ? scenario.welcomeChestDevice : "none";
  const identityRef = useRef(identity);
  const welcomeRequestedRef = useRef(false);

  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    window.requestAnimationFrame(() => {
      setClientReady(true);
      const installed = isStandalonePwa();
      const dismissedAt = readTimestamp(storageKeys.installPromptDismissedAt);
      
      setIsInstalled(installed);
      setInstallDismissedAt(dismissedAt);
      setIsProbablyMobile(isProbablyMobileDevice());
      setIsIos(isIosDevice());
      setEvaluationNow(Date.now());

      const requestedIdentity = window.localStorage.getItem(welcomeChestIdentityKey);
      if (requestedIdentity) {
        try {
          const pending = JSON.parse(requestedIdentity) as { firstName?: string; email?: string };
          setFirstName(pending.firstName ?? "");
          setEmail(pending.email ?? "");
        } catch {
          window.localStorage.removeItem(welcomeChestIdentityKey);
        }
      }

      const pendingChest = window.localStorage.getItem(welcomeChestPendingKey);
      if (pendingChest) {
        try {
          const pending = JSON.parse(pendingChest) as { firstName?: string; email?: string };
          setFirstName(pending.firstName ?? "");
          setEmail(pending.email ?? "");
          setChestPrepared(true);
        } catch {
          window.localStorage.removeItem(welcomeChestPendingKey);
        }
      }
      const requested = window.localStorage.getItem(welcomeChestRequestedKey) === "true";
      welcomeRequestedRef.current = requested;
      setWelcomeRequested(requested);
      if (requested) setShowAsPopup(true);

      // Check URL parameters for post-booking handoff from website
      try {
        const url = new URL(window.location.href);
        const actionParam = url.searchParams.get("action");
        const emailParam = url.searchParams.get("email");
        const nameParam = url.searchParams.get("name") || url.searchParams.get("firstName");
        const phoneParam = url.searchParams.get("phone");

        if ((actionParam === "welcome-chest" || actionParam === "welcome_chest") && emailParam && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailParam.trim())) {
          const cleanEmail = emailParam.trim().toLowerCase();
          const cleanName = (nameParam || "").trim();
          const cleanPhone = (phoneParam || "").trim();

          setFirstName(cleanName);
          setEmail(cleanEmail);
          setWelcomeRequested(true);
          welcomeRequestedRef.current = true;
          setShowAsPopup(true);
          window.localStorage.removeItem(storageKeys.installPromptDismissedAt);
          setInstallDismissedAt(null);

          window.localStorage.setItem(welcomeChestRequestedKey, "true");
          window.localStorage.setItem(welcomeChestIdentityKey, JSON.stringify({ firstName: cleanName, email: cleanEmail }));
          window.localStorage.setItem(welcomeChestPendingKey, JSON.stringify({ firstName: cleanName, email: cleanEmail }));

          updateIdentity({
            email: cleanEmail,
            firstName: cleanName,
            phone: cleanPhone,
            marketingConsent: true,
          });

          // Clean URL params so they are not retained on reload
          url.searchParams.delete("action");
          url.searchParams.delete("email");
          url.searchParams.delete("name");
          url.searchParams.delete("firstName");
          url.searchParams.delete("phone");
          window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : "") + url.hash);

          // Background auto-login and prepare welcome chest
          void requestJson<{ profile: ProfileResponse; alreadyClaimed?: boolean }>('/api/welcome-chest/prepare', {
            method: "POST",
            body: JSON.stringify({
              firstName: cleanName,
              email: cleanEmail,
              phone: cleanPhone,
              marketingConsent: true,
            }),
          }).then((res) => {
            if (res?.alreadyClaimed) {
              window.localStorage.removeItem(welcomeChestRequestedKey);
              window.localStorage.removeItem(welcomeChestIdentityKey);
              welcomeRequestedRef.current = false;
              setWelcomeRequested(false);
              setShowAsPopup(false);
            } else if (res?.profile) {
              updateIdentity({
                email: cleanEmail,
                firstName: res.profile.contact?.Nome || cleanName,
                lastName: res.profile.contact?.Cognome || "",
                phone: res.profile.contact?.Telefono || cleanPhone,
                marketingConsent: true,
              });
              setChestPrepared(true);
            }
            window.dispatchEvent(new Event("tortuga:profile-updated"));
          }).catch((err) => {
            console.error("[Welcome Chest Auto-Prepare]", err);
          });
        }
      } catch (e) {
        console.error("[Welcome Chest URL Parsing]", e);
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

    const handleWelcomeChestStart = (event: Event) => {
      const currentIdentity = identityRef.current;
      const requestedIdentity = (event as CustomEvent<{ firstName?: string; email?: string }>).detail;
      window.localStorage.setItem(welcomeChestRequestedKey, "true");
      welcomeRequestedRef.current = true;
      setWelcomeRequested(true);
      setFirstName(requestedIdentity?.firstName ?? currentIdentity.firstName);
      setEmail(requestedIdentity?.email ?? currentIdentity.email);
      window.localStorage.setItem(welcomeChestIdentityKey, JSON.stringify({
        firstName: requestedIdentity?.firstName ?? currentIdentity.firstName,
        email: requestedIdentity?.email ?? currentIdentity.email,
      }));
      setChestPrepared(false);
      setReward(null);
      setPushReady(false);
      setError("");
      window.localStorage.removeItem(storageKeys.installPromptDismissedAt);
      setInstallDismissedAt(null);
      setShowAsPopup(true);
    };

    const handleProfileUpdate = () => {
      if (!welcomeRequestedRef.current) return;
      window.localStorage.removeItem(storageKeys.installPromptDismissedAt);
      setInstallDismissedAt(null);
      setShowAsPopup(true);
    };
 
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener(welcomeChestStartEvent, handleWelcomeChestStart);
    window.addEventListener("tortuga:profile-updated", handleProfileUpdate);
 
    const timer = setTimeout(() => setInstallFallbackReady(true), 1500);
 
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener(welcomeChestStartEvent, handleWelcomeChestStart);
      window.removeEventListener("tortuga:profile-updated", handleProfileUpdate);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (welcomeChestPreview === "none") return;
    const timer = window.setTimeout(() => setShowAsPopup(true), 0);
    return () => window.clearTimeout(timer);
  }, [welcomeChestPreview]);

  useEffect(() => {
    if (!clientReady || !isInstalled || welcomeRequestedRef.current) return;

    let cancelled = false;
    void fetch("/api/welcome-chest/status")
      .then((response) => response.ok ? response.json() : null)
      .then((data: { pending?: boolean; identity?: { firstName?: string; email?: string } } | null) => {
        if (cancelled || !data?.pending || !data.identity?.email) return;
        const restoredIdentity = {
          firstName: data.identity.firstName ?? "",
          email: data.identity.email,
        };
        window.localStorage.setItem(welcomeChestRequestedKey, "true");
        window.localStorage.setItem(welcomeChestIdentityKey, JSON.stringify(restoredIdentity));
        welcomeRequestedRef.current = true;
        setFirstName(restoredIdentity.firstName);
        setEmail(restoredIdentity.email);
        setWelcomeRequested(true);
        setShowAsPopup(true);
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [clientReady, isInstalled]);


  const prepareChest = useCallback(async (): Promise<boolean> => {
    setBusy(true); setError("");
    try {
      const response = await requestJson<{ profile: ProfileResponse; alreadyClaimed?: boolean }>('/api/welcome-chest/prepare', {
        method: "POST",
        body: JSON.stringify({
          firstName,
          email,
          phone: identityRef.current.phone,
          marketingConsent: true,
        }),
      });
      if (response.alreadyClaimed) {
        window.localStorage.removeItem(welcomeChestRequestedKey);
        window.localStorage.removeItem(welcomeChestIdentityKey);
        welcomeRequestedRef.current = false;
        setWelcomeRequested(false);
        setShowAsPopup(false);
        window.dispatchEvent(new Event("tortuga:profile-updated"));
        return true;
      }
      updateIdentity({
        email,
        firstName: response.profile.contact?.Nome || firstName,
        lastName: response.profile.contact?.Cognome || "",
        phone: response.profile.contact?.Telefono || identityRef.current.phone || "",
        marketingConsent: true,
      });
      window.localStorage.setItem(welcomeChestPendingKey, JSON.stringify({ firstName, email }));
      setChestPrepared(true);
      window.dispatchEvent(new Event("tortuga:profile-updated"));
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Non siamo riusciti a preparare il Baule.");
      return false;
    } finally { setBusy(false); }
  }, [email, firstName, updateIdentity]);

  const claimChest = useCallback(async () => {
    const response = await requestJson<{ profile: ProfileResponse; coupon: CoopertoCoupon; pointsAwarded: number }>('/api/welcome-chest/claim', { method: "POST", body: JSON.stringify({ firstName, email, marketingConsent: true }) });
    setReward({ profile: response.profile, coupon: response.coupon, pointsAwarded: response.pointsAwarded ?? 0 });
    window.localStorage.removeItem(welcomeChestPendingKey);
    window.localStorage.removeItem(welcomeChestIdentityKey);
    window.dispatchEvent(new CustomEvent("tortuga:profile-updated", { detail: { profile: response.profile } }));
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
    if (!chestPrepared && !await prepareChest()) return;
    setBusy(true); setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Le notifiche devono essere attivate per aprire il Baule.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await ensureCurrentPushSubscription(registration, pwaConfig.vapidPublicKey);
      await requestJson("/api/push/subscriptions", { method: "POST", body: JSON.stringify({ subscription: subscription.toJSON(), email: email.trim().toLowerCase(), permission, installed: true, standalone: isStandalonePwa(), userAgent: navigator.userAgent }) });
      setPushReady(true);
      await claimChest();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Non siamo riusciti ad attivare le notifiche.");
    } finally { setBusy(false); }
  }, [chestPrepared, claimChest, email, firstName, prepareChest]);

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
    if (!clientReady || isInstalled || (!welcomeRequested && installSnoozed) || (!welcomeRequested && !isProbablyMobile) || (!welcomeRequested && !installFallbackReady && !isIos)) {
      return null;
    }
    if (promptEvent) return "prompt";
    return isIos ? "fallback-ios" : "fallback-browser";
  }, [clientReady, isInstalled, installSnoozed, isProbablyMobile, installFallbackReady, promptEvent, isIos, welcomeChestPreview, welcomeRequested]);
  const showFullRewards = welcomeRequested || welcomeChestPreview !== "none" || !isInstalled;

  if ((welcomeRequested || welcomeChestPreview !== "none") && isInstalled && showAsPopup) {
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
          <div className="rounded-[1.6rem] border border-[rgba(216,176,106,.24)] bg-black/20 p-4 text-sm leading-6 text-[var(--text-muted)]">Il coupon con il QR code da mostrare al personale del Tortuga ti arriverà a breve sulla tua email.</div>
          <button type="button" className="button-primary w-full py-3" onClick={() => { window.localStorage.removeItem(welcomeChestRequestedKey); window.localStorage.removeItem(welcomeChestIdentityKey); welcomeRequestedRef.current = false; setWelcomeRequested(false); setShowAsPopup(false); }}>Vai alla mia Ciurma</button>
        </div> : <div className="space-y-5">
          <div><p className="eyebrow text-[var(--accent-strong)]">Baule di benvenuto</p><h2 className="mt-2 text-2xl font-black uppercase italic text-white">Completa l&apos;imbarco</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Attiva le notifiche e apri il tuo Baule con 5 Dobloni e un premio da mostrare al personale.</p></div>
          <p className="text-sm leading-6 text-[var(--text-muted)]">Un ultimo passo e il premio è tuo: attiva le notifiche push.</p>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <button type="button" className="button-primary w-full py-3" disabled={busy || pushReady} onClick={() => void enablePush()}>{busy ? "Preparazione..." : "Attiva notifiche"}</button>
        </div>}
      </section>
    </div>;
  }

  if (!welcomeRequested && welcomeChestPreview === "none") return null;
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
        {mode !== "fallback-ios" ? <Image
          src="/images/gift-card-treasure-chest-background.webp"
          alt="Baule aperto con monete e tesori"
          width={1536}
          height={1024}
          className="h-28 w-full rounded-2xl border border-[rgba(216,176,106,.24)] object-cover object-[74%_center]"
        /> : null}<h2 className="text-xl font-black text-white uppercase italic tracking-tight">Baule di benvenuto</h2>
          <ul className="space-y-1.5 text-[13px] font-bold leading-[1.25] text-[var(--accent-strong)]">
            <li>5 Dobloni - Pari a 50€ di spesa</li>
            <li>Porzione di Gnocco/Tigelle</li>
            {showFullRewards ? <>
              <li>Card Fidelity - ATTIVATA</li>
              <li>Prima visita - sblocca il rango Mozzo</li>
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
