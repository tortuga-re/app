"use client";

import { useCallback, useEffect, useState } from "react";

import { requestJson } from "@/lib/client";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { pwaConfig, storageKeys } from "@/lib/config";
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

const isStandaloneDisplayMode = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const standaloneMatch =
    window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );

  return standaloneMatch || iosStandalone;
};



const isPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const base64ToUint8Array = (value: string) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);

  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};

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
      setIsInstalled(isStandaloneDisplayMode());
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

        // Listen for updates and reload when a new worker takes control
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("Nuova versione trovata. Ricarico l'app...");
                window.location.reload();
              }
            };
          }
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
        const existingSubscription =
          (await readyRegistration.pushManager.getSubscription().catch(() => null)) ??
          null;

        const subscription =
          existingSubscription ??
          (await readyRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64ToUint8Array(pwaConfig.vapidPublicKey),
          }));

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
