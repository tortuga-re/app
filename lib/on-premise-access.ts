"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

import { storageKeys } from "@/lib/config";

export const onPremiseAccessDurationMs = 4 * 60 * 60 * 1000;

const onPremiseAccessChangedEvent = "tortuga:menu-access-changed";

export const readStoredOnPremiseAccessExpiry = () => {
  if (typeof window === "undefined") {
    return 0;
  }

  const rawExpiry = window.localStorage.getItem(storageKeys.menuAccessExpiresAt);
  const parsedExpiry = Number(rawExpiry);
  return Number.isFinite(parsedExpiry) ? parsedExpiry : 0;
};

const readOnPremiseAccessSnapshot = () => {
  if (typeof window === "undefined") {
    return "inactive:0";
  }

  const rawExpiry = window.localStorage.getItem(storageKeys.menuAccessExpiresAt) ?? "0";
  const parsedExpiry = Number(rawExpiry);
  const status =
    Number.isFinite(parsedExpiry) && parsedExpiry > Date.now()
      ? "active"
      : "inactive";

  return `${status}:${rawExpiry}`;
};

const subscribeToOnPremiseAccess = (callback: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKeys.menuAccessExpiresAt) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(onPremiseAccessChangedEvent, callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(onPremiseAccessChangedEvent, callback);
  };
};

const notifyOnPremiseAccessChanged = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(onPremiseAccessChangedEvent));
};

export const writeStoredOnPremiseAccessExpiry = (expiresAt: number) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKeys.menuAccessExpiresAt, String(expiresAt));
  notifyOnPremiseAccessChanged();
};

export const clearStoredOnPremiseAccess = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKeys.menuAccessExpiresAt);
  notifyOnPremiseAccessChanged();
};

const hasCoopertoPresenceParams = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);

  return (
    searchParams.get("menu") === "1" &&
    searchParams.get("source") === "cooperto"
  );
};

export const useOnPremiseAccess = () => {
  const hasProcessedParamsRef = useRef(false);
  const snapshot = useSyncExternalStore(
    subscribeToOnPremiseAccess,
    readOnPremiseAccessSnapshot,
    () => "inactive:0",
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const now = Date.now();
    let expiresAt = readStoredOnPremiseAccessExpiry();

    if (hasCoopertoPresenceParams() && !hasProcessedParamsRef.current) {
      hasProcessedParamsRef.current = true;
      expiresAt = now + onPremiseAccessDurationMs;
      writeStoredOnPremiseAccessExpiry(expiresAt);
    }

    if (expiresAt <= now) {
      clearStoredOnPremiseAccess();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearStoredOnPremiseAccess();
    }, expiresAt - now);

    return () => window.clearTimeout(timeoutId);
  }, [snapshot]);

  const [, rawExpiresAt = "0"] = snapshot.split(":");
  const expiresAt = Number(rawExpiresAt);

  return {
    hasAccess: snapshot.startsWith("active:"),
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0,
  };
};
