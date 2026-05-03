"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { requestJson } from "@/lib/client";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { pwaConfig, storageKeys } from "@/lib/config";
import type {
  DeletePushSubscriptionResponse,
  SavePushSubscriptionResponse,
} from "@/lib/push/types";
import { useOnPremiseAccess } from "@/lib/on-premise-access";
import { cn } from "@/lib/utils";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallCardMode = "prompt" | "fallback-ios" | "fallback-browser";
type PushCardMode = "invite" | "retry" | "denied" | "enabled";

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

const writeTimestamp = (key: string, value: number) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, String(value));
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

const isProbablyMobileDevice = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia?.("(max-width: 820px)").matches ||
    /android|iphone|ipad|ipod/i.test(window.navigator.userAgent)
  );
};

const isIosDevice = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
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
  const [installDismissedAt, setInstallDismissedAt] = useState<number | null>(null);
  const [pushDismissedAt, setPushDismissedAt] = useState<number | null>(null);
  const [promptEvent, setPromptEvent] = useState<DeferredPromptEvent | null>(null);
  const [installFallbackReady, setInstallFallbackReady] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isProbablyMobile, setIsProbablyMobile] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [pushPermission, setPushPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState("");
  const [evaluationNow, setEvaluationNow] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const initFrame = window.requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }

      setClientReady(true);
      setInstallDismissedAt(readTimestamp(storageKeys.installPromptDismissedAt));
      setPushDismissedAt(readTimestamp(storageKeys.pushPromptDismissedAt));
      setIsInstalled(isStandaloneDisplayMode());
      setIsProbablyMobile(isProbablyMobileDevice());
      setIsIos(isIosDevice());
      setPushPermission(isPushSupported() ? Notification.permission : "unsupported");
      setEvaluationNow(Date.now());
    });

    const installFallbackTimer = window.setTimeout(() => {
      if (!cancelled) {
        setInstallFallbackReady(true);
      }
    }, 1600);

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
      setInstallDismissedAt(null);
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
      window.clearTimeout(installFallbackTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismissInstallPrompt = useCallback(() => {
    const timestamp = Date.now();
    writeTimestamp(storageKeys.installPromptDismissedAt, timestamp);
    setInstallDismissedAt(timestamp);
    setEvaluationNow(timestamp);
  }, []);

  const dismissPushPrompt = useCallback(() => {
    const timestamp = Date.now();
    writeTimestamp(storageKeys.pushPromptDismissedAt, timestamp);
    setPushDismissedAt(timestamp);
    setEvaluationNow(timestamp);
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

  const disablePushSubscription = useCallback(async () => {
    if (!serviceWorkerRegistration || !isPushSupported()) {
      setPushEnabled(false);
      return;
    }

    setPushBusy(true);
    setPushError("");

    try {
      const readyRegistration = await navigator.serviceWorker.ready;
      const subscription = await readyRegistration.pushManager
        .getSubscription()
        .catch(() => null);

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe().catch(() => false);
        await requestJson<DeletePushSubscriptionResponse>(
          "/api/push/subscriptions",
          {
            method: "DELETE",
            body: JSON.stringify({ endpoint }),
          },
        );
      }

      setPushEnabled(false);
      setEvaluationNow(Date.now());
    } catch (error) {
      setPushError(
        error instanceof Error
          ? error.message
          : "Non sono riuscito a disattivare le notifiche.",
      );
    } finally {
      setPushBusy(false);
    }
  }, [serviceWorkerRegistration]);

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

  const installSnoozed =
    installDismissedAt !== null &&
    evaluationNow - installDismissedAt < pwaConfig.installReminderWindowMs;
  const pushSnoozed =
    pushDismissedAt !== null &&
    evaluationNow - pushDismissedAt < pwaConfig.pushReminderWindowMs;

  const installCardMode = useMemo<InstallCardMode | null>(() => {
    if (
      !clientReady ||
      !isProbablyMobile ||
      isInstalled ||
      installSnoozed ||
      !installFallbackReady
    ) {
      return null;
    }

    if (promptEvent) {
      return "prompt";
    }

    return isIos ? "fallback-ios" : "fallback-browser";
  }, [
    clientReady,
    installFallbackReady,
    installSnoozed,
    isInstalled,
    isIos,
    isProbablyMobile,
    promptEvent,
  ]);

  const pushCardMode = useMemo<PushCardMode | null>(() => {
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
  }, [
    clientReady,
    pushEnabled,
    pushPermission,
    pushSnoozed,
    serviceWorkerRegistration,
  ]);

  if (pushCardMode === "enabled" || !pushCardMode) {
    return null;
  }

  // Mostriamo solo la card delle notifiche se necessario (facoltativo, o possiamo nascondere anche questa)
  // Per ora manteniamo solo la logica silenziosa per l'installazione in questo controller globale.
  return null;
}
