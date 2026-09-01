"use client";

import { useCallback, useEffect, useState } from "react";

import { requestJson } from "@/lib/client";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { pwaConfig, storageKeys } from "@/lib/config";
import {
  ensureCurrentPushSubscription,
  isStandalonePwa,
} from "@/lib/push/client-subscription";
import type {
  SavePushSubscriptionResponse,
} from "@/lib/push/types";
import { useOnPremiseAccess } from "@/lib/on-premise-access";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};



const readTimestamp = (key: string) => {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(key);
  if (!stored) {
    return null;
  }

  const parsed = Number(stored);
  return Number.isFinite(parsed) ? parsed : null;
};



const clearTimestamp = (key: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
};

const isPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export function PwaController() {
  const { identity } = useCustomerIdentity();
  const { expiresAt: venueExpiresAt } = useOnPremiseAccess();
  const [clientReady, setClientReady] = useState(false);
  const [pushDismissedAt, setPushDismissedAt] = useState<number | null>(null);
  const [, setPromptEvent] = useState<DeferredPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [pushPermission, setPushPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [, setPushBusy] = useState(false);
  const [, setPushError] = useState("");
  const [evaluationNow, setEvaluationNow] = useState(0);

  const [updateAvailable, setUpdateAvailable] = useState(false);

  const applyUpdate = useCallback(() => {
    if (serviceWorkerRegistration?.waiting) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          window.location.reload();
        },
        { once: true },
      );
      serviceWorkerRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  }, [serviceWorkerRegistration]);

  useEffect(() => {
    let cancelled = false;
    const initFrame = window.requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }

      setClientReady(true);
      setPushDismissedAt(readTimestamp(storageKeys.pushPromptDismissedAt));
      setIsInstalled(isStandalonePwa());
      setPushPermission(isPushSupported() ? Notification.permission : "unsupported");
      setEvaluationNow(Date.now());
    });

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (!cancelled) {
        setPromptEvent(event as DeferredPromptEvent);
      }
    };

    const handleInstalled = () => {
      if (cancelled) {
        return;
      }

      clearTimestamp(storageKeys.installPromptDismissedAt);
      setPromptEvent(null);
      setIsInstalled(true);
      setEvaluationNow(Date.now());
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    const registerServiceWorker = async () => {
      if (!("serviceWorker" in navigator)) {
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        if (cancelled) {
          return;
        }

        // Force an update check on registration
        void registration.update();

        // Se un nuovo worker è già in attesa (es. download completato in precedenza)
        if (registration.waiting && navigator.serviceWorker.controller) {
          setUpdateAvailable(true);
        }

        // Intercetta quando un nuovo Service Worker finisce il download
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.onstatechange = () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setUpdateAvailable(true);
            }
          };
        };

        setServiceWorkerRegistration(registration);

        if (!isPushSupported()) {
          setPushPermission("unsupported");
          return;
        }

        const existingSubscription = await registration.pushManager
          .getSubscription()
          .catch(() => null);

        if (cancelled) {
          return;
        }

        setPushEnabled(Boolean(existingSubscription));
      } catch {
        if (!cancelled) {
          setPushPermission("unsupported");
        }
      }
    };

    void registerServiceWorker();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(initFrame);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const persistSubscription = useCallback(
    async (subscription: PushSubscription) => {
      const payload = subscription.toJSON();

      if (!payload.endpoint) {
        throw new Error("Subscription push non valida.");
      }

      await requestJson<SavePushSubscriptionResponse>("/api/push/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          subscription: payload,
          email: identity.email || undefined,
          permission: Notification.permission,
          userAgent: navigator.userAgent,
          installed: isInstalled,
          standalone: isStandalonePwa(),
          venueAccessExpiresAt: venueExpiresAt,
        }),
      });
    },
    [identity.email, isInstalled, venueExpiresAt],
  );

  const ensurePushSubscription = useCallback(
    async (requestPermission: boolean) => {
      if (!serviceWorkerRegistration || !isPushSupported()) {
        setPushPermission("unsupported");
        setPushError("Questo browser non supporta ancora le notifiche push.");
        return false;
      }

      let nextPermission = Notification.permission;

      if (requestPermission && nextPermission === "default") {
        nextPermission = await Notification.requestPermission();
      }

      setPushPermission(nextPermission);

      if (nextPermission === "denied") {
        setPushEnabled(false);
        setPushError("");
        return false;
      }

      if (nextPermission !== "granted") {
        return false;
      }

      if (!pwaConfig.vapidPublicKey) {
        setPushEnabled(false);
        setPushError(
          "Configura NEXT_PUBLIC_VAPID_PUBLIC_KEY per completare l'attivazione delle notifiche.",
        );
        return false;
      }

      try {
        const readyRegistration = await navigator.serviceWorker.ready;
        const subscription = await ensureCurrentPushSubscription(
          readyRegistration,
          pwaConfig.vapidPublicKey,
        );

        await persistSubscription(subscription);
        clearTimestamp(storageKeys.pushPromptDismissedAt);
        setPushDismissedAt(null);
        setPushEnabled(true);
        setPushError("");
        setEvaluationNow(Date.now());
        return true;
      } catch (error) {
        setPushEnabled(false);
        setPushError(
          error instanceof Error
            ? error.message
            : "Non sono riuscito ad attivare le notifiche.",
        );
        return false;
      }
    },
    [persistSubscription, serviceWorkerRegistration],
  );

  useEffect(() => {
    if (!clientReady || !serviceWorkerRegistration || pushPermission !== "granted") {
      return;
    }

    let cancelled = false;

    const syncGrantedSubscription = async () => {
      setPushBusy(true);
      await ensurePushSubscription(false);
      if (!cancelled) {
        setPushBusy(false);
      }
    };

    void syncGrantedSubscription();

    return () => {
      cancelled = true;
    };
  }, [clientReady, ensurePushSubscription, pushPermission, serviceWorkerRegistration, venueExpiresAt]);

  useEffect(() => {
    if (!clientReady || pushPermission !== "granted") return;

    let lastSyncAt = 0;
    const syncWhenActive = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastSyncAt < 30_000) return;
      lastSyncAt = now;
      void ensurePushSubscription(false);
    };

    window.addEventListener("pageshow", syncWhenActive);
    document.addEventListener("visibilitychange", syncWhenActive);
    return () => {
      window.removeEventListener("pageshow", syncWhenActive);
      document.removeEventListener("visibilitychange", syncWhenActive);
    };
  }, [clientReady, ensurePushSubscription, pushPermission]);

  // Controllo proattivo periodico degli aggiornamenti Service Worker
  useEffect(() => {
    if (!serviceWorkerRegistration) return;

    const checkForUpdates = () => {
      serviceWorkerRegistration.update().catch(() => undefined);
    };

    // Controlla ogni 15 minuti in background
    const intervalId = window.setInterval(checkForUpdates, 15 * 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", checkForUpdates);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", checkForUpdates);
    };
  }, [serviceWorkerRegistration]);

  if (updateAvailable) {
    return (
      <aside
        role="alert"
        aria-live="polite"
        className="fixed bottom-[calc(var(--bottom-nav-clearance)+0.75rem)] inset-x-3 z-[99] mx-auto max-w-sm flex items-center justify-between gap-3 p-3.5 bg-[#151714]/95 text-[#fffdf8] border border-[#c59a47]/50 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl shrink-0">🦜</span>
          <div className="text-xs leading-tight">
            <strong className="block text-sm text-[#d9b66d]">Nuova rotta pronta!</strong>
            <span className="text-white/70">Aggiorna per caricare le novità.</span>
          </div>
        </div>
        <button
          type="button"
          onClick={applyUpdate}
          className="px-3.5 py-1.5 rounded-xl bg-[#a52b2b] hover:bg-[#852222] text-white text-xs font-bold shrink-0 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          Aggiorna
        </button>
      </aside>
    );
  }

  return null;
}
