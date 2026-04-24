"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { requestJson } from "@/lib/client";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { pwaConfig, storageKeys } from "@/lib/config";
import type { SavePushSubscriptionResponse } from "@/lib/push/types";
import { cn } from "@/lib/utils";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallCardMode = "prompt" | "fallback-ios" | "fallback-browser";
type PushCardMode = "invite" | "retry" | "denied";

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
        }),
      });
    },
    [identity.email, isInstalled],
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
  }, [clientReady, ensurePushSubscription, pushPermission, serviceWorkerRegistration]);

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

  if (!installCardMode && !pushCardMode) {
    return null;
  }

  return (
    <div className="space-y-3">
      {installCardMode ? (
        <div className="panel rounded-[1.9rem] px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="eyebrow">Aggiungi alla Home</p>
              <h2 className="hero-title text-[1.45rem] font-semibold text-white">
                Aggiungi Tortuga alla Home
              </h2>
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                {installCardMode === "prompt"
                  ? "Apri Tortuga con un tap e tieni la tua area cliente sempre a portata di mano."
                  : installCardMode === "fallback-ios"
                    ? "Su iPhone apri Condividi in Safari e scegli Aggiungi a Home."
                    : "Dal menu del browser scegli Installa app oppure Aggiungi alla schermata Home."}
              </p>
            </div>

            <button
              type="button"
              className="button-secondary inline-flex min-h-10 items-center justify-center px-4 text-sm"
              onClick={dismissInstallPrompt}
            >
              Dopo
            </button>
          </div>

          {installCardMode === "prompt" ? (
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="button-primary inline-flex min-h-11 items-center justify-center px-5 text-sm"
                onClick={async () => {
                  if (!promptEvent) {
                    return;
                  }

                  await promptEvent.prompt();
                  const choice = await promptEvent.userChoice;

                  if (choice.outcome === "accepted") {
                    setIsInstalled(true);
                  } else {
                    dismissInstallPrompt();
                  }

                  setPromptEvent(null);
                }}
              >
                Aggiungi
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-[1.4rem] border border-[rgba(255,216,156,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm leading-6 text-[var(--text-muted)]">
              Un passaggio rapido, nessun popup finto: usi il comando nativo del tuo browser.
            </div>
          )}
        </div>
      ) : null}

      {pushCardMode ? (
        <div
          className={cn(
            "panel rounded-[1.9rem] px-5 py-5",
            pushCardMode === "denied" &&
              "border-[rgba(255,216,156,0.12)] bg-[linear-gradient(180deg,rgba(57,43,30,0.94),rgba(17,13,11,0.98))]",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="eyebrow">Notifiche Tortuga</p>
              <h2 className="hero-title text-[1.45rem] font-semibold text-white">
                {pushCardMode === "denied"
                  ? "Notifiche disattivate"
                  : "Attiva le notifiche"}
              </h2>
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                {pushCardMode === "denied"
                  ? "Puoi riattivarle dalle impostazioni del browser quando vuoi ricevere promemoria, vantaggi e disponibilita."
                  : "Attiva le notifiche per non perdere aggiornamenti, vantaggi e disponibilita."}
              </p>
            </div>

            <button
              type="button"
              className="button-secondary inline-flex min-h-10 items-center justify-center px-4 text-sm"
              onClick={dismissPushPrompt}
            >
              Dopo
            </button>
          </div>

          {pushError ? (
            <div className="mt-4 rounded-[1.4rem] border border-[rgba(240,139,117,0.24)] bg-[rgba(240,139,117,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
              {pushError}
            </div>
          ) : null}

          {pushCardMode !== "denied" ? (
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="button-primary inline-flex min-h-11 items-center justify-center px-5 text-sm"
                onClick={async () => {
                  setPushBusy(true);
                  await ensurePushSubscription(true);
                  setPushBusy(false);
                }}
                disabled={pushBusy}
              >
                {pushBusy
                  ? "Attivo le notifiche..."
                  : pushCardMode === "retry"
                    ? "Riprova"
                    : "Attiva notifiche"}
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-[1.4rem] border border-[rgba(255,216,156,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm leading-6 text-[var(--text-muted)]">
              Su alcuni browser mobile serve HTTPS e, su iPhone, la web app deve essere aggiunta alla Home prima di poter ricevere push.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
