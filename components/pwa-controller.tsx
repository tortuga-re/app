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

        // Listen for updates – reload ONCE when a new SW takes control.
        // We use sessionStorage to prevent infinite reload loops: if the new
        // SW is installed but the page keeps erroring, we stop reloading.
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.onstatechange = () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              const RELOAD_KEY = "tortuga.sw-reload-at";
              const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? "0");
              const now = Date.now();

              // Guard: non ricaricare più di una volta ogni 30 secondi
              if (now - lastReload < 30_000) {
                console.log("SW update trovato ma reload troppo recente – skip.");
                return;
              }

              console.log("Nuova versione trovata. Ricarico l'app...");
              sessionStorage.setItem(RELOAD_KEY, String(now));
              window.location.reload();
            }
          };
        };

        // Forza il nuovo SW in attesa a prendere controllo immediatamente
        // (evita che rimanga bloccato in "waiting" per sempre)
        const waitingWorker = registration.waiting;
        if (waitingWorker) {
          waitingWorker.postMessage({ type: "SKIP_WAITING" });
        }

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

  const pushSnoozed =
    pushDismissedAt !== null &&
    evaluationNow - pushDismissedAt < pwaConfig.pushReminderWindowMs;

  const pushCardMode = (() => {
    if (clientReady && pushEnabled && !pushSnoozed) {
      return "enabled";
    }

    if (
      !clientReady ||
      pushSnoozed ||
      pushEnabled ||
      !serviceWorkerRegistration ||
      pushPermission === "unsupported"
    ) {
      return null;
    }

    if (pushPermission === "denied") {
      return "denied";
    }

    if (pushPermission === "granted") {
      return "retry";
    }

    return "invite";
  })();

  if (pushCardMode === "enabled" || !pushCardMode) {
    return null;
  }

  return null;
}
