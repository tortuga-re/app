"use client";

import { useEffect, useState, useMemo } from "react";
import { triggerHaptic } from "@/lib/haptics";
import { pwaConfig } from "@/lib/config";
import { requestJson } from "@/lib/client";
import { useCustomerIdentity } from "@/lib/customer-identity";

type PushCardMode = "invite" | "standalone-required" | "blocked" | "enabled";

const isStandaloneDisplayMode = () => {
  if (typeof window === "undefined") return false;
  const standaloneMatch = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = Boolean((window.navigator as any).standalone);
  return standaloneMatch || iosStandalone;
};

export function PwaPushCard() {
  const { identity } = useCustomerIdentity();
  const [clientReady, setClientReady] = useState(false);
  const [swActive, setSwActive] = useState(false);
  const [pushStatus, setPushStatus] = useState<PermissionState | "unsupported" | "loading">("loading");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setClientReady(true);
    setIsStandalone(isStandaloneDisplayMode());

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("unsupported");
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      setSwActive(true);
      registration.pushManager.getSubscription().then((subscription) => {
        setIsSubscribed(Boolean(subscription));
        setPushStatus(Notification.permission);
      });
    });
  }, []);

  const mode = useMemo<PushCardMode | null>(() => {
    if (!clientReady || pushStatus === "unsupported" || pushStatus === "loading") return null;
    if (isSubscribed) return "enabled";
    if (pushStatus === "denied") return "blocked";
    if (!isStandalone) return "standalone-required";
    return "invite";
  }, [clientReady, pushStatus, isSubscribed, isStandalone]);

  const handleEnablePush = async () => {
    if (mode !== "invite") return;
    
    triggerHaptic();
    setSubmitting(true);
    setError("");

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID key from config or hardcoded if needed
      // Assuming PWA controller logic for VAPID is already in place
      // For now, we'll assume the user needs to click 'Enable' and the browser prompt appears
      
      const permission = await Notification.requestPermission();
      setPushStatus(permission);

      if (permission !== "granted") {
        throw new Error("Permesso notifiche non concesso.");
      }

      // Trigger the existing subscription logic by pinging the controller or calling the API
      // Since we want to be clean, we'll just show the user how to do it.
      // But actually, we should perform the subscription.
      
      // We'll use the public VAPID key (should be in env/config)
      const vapidKey = pwaConfig.vapidPublicKey;
      
      if (!vapidKey) {
        throw new Error("Configurazione push incompleta.");
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      await requestJson("/api/push/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          subscription,
          email: identity.email || undefined,
        }),
      });

      setIsSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'attivazione.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mode || mode === "enabled") return null;

  return (
    <div className="panel rounded-[1.9rem] px-5 py-5 border-2 border-[var(--accent-strong)]/20 bg-[var(--accent-soft)]/5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow text-[var(--accent-strong)]">Notifiche Push</p>
          <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Resta a bordo</h2>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Attiva le notifiche per scoprire le prossime serate e sapere quando stiamo per iniziare con gli spettacoli mentre sei al Tortuga.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {mode === "invite" ? (
          <button
            onClick={handleEnablePush}
            disabled={submitting}
            className="button-primary w-full py-3 text-xs font-bold uppercase tracking-widest"
          >
            {submitting ? "Attivazione..." : "Attiva Notifiche"}
          </button>
        ) : mode === "standalone-required" ? (
          <div className="rounded-xl bg-orange-500/10 p-4 border border-orange-500/20">
            <p className="text-xs leading-5 text-orange-200/80 italic">
              <span className="font-bold text-orange-400 block mb-1 uppercase tracking-wider">Nota Importante:</span>
              Per ricevere le notifiche push è necessario prima aver installato la nostra Web App sul tuo dispositivo.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-red-500/10 p-4 border border-red-500/20">
            <p className="text-xs leading-5 text-red-200/80 italic">
              Le notifiche sono bloccate dal tuo browser. Controlla le impostazioni del sito per sbloccarle.
            </p>
          </div>
        )}
        
        {error && (
          <p className="text-[10px] text-red-400 text-center uppercase tracking-wider font-semibold">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
