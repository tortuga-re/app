"use client";

import { useMemo, useSyncExternalStore } from "react";

import { storageKeys } from "@/lib/config";

const pendingVisitChangedEvent = "tortuga:pending-visit-changed";

export type PendingVisit = {
  id: string;
  detectedAt: number;
  expiresAt: number;
  source: "on-premise";
};

const notifyPendingVisitChanged = () => {
  window.dispatchEvent(new Event(pendingVisitChangedEvent));
};

const parsePendingVisit = (raw: string | null): PendingVisit | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingVisit>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.detectedAt !== "number" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.source !== "on-premise"
    ) {
      return null;
    }
    return parsed as PendingVisit;
  } catch {
    return null;
  }
};

export const readPendingVisit = () => {
  if (typeof window === "undefined") return null;

  const pending = parsePendingVisit(
    window.localStorage.getItem(storageKeys.pendingVisit),
  );

  if (!pending || pending.expiresAt <= Date.now()) {
    if (window.localStorage.getItem(storageKeys.pendingVisit)) {
      window.localStorage.removeItem(storageKeys.pendingVisit);
    }
    return null;
  }

  return pending;
};

export const rememberPendingVisit = (expiresAt: number) => {
  if (typeof window === "undefined" || expiresAt <= Date.now()) return;

  const existing = readPendingVisit();
  const pending: PendingVisit = existing
    ? { ...existing, expiresAt: Math.max(existing.expiresAt, expiresAt) }
    : {
        id: crypto.randomUUID(),
        detectedAt: Date.now(),
        expiresAt,
        source: "on-premise",
      };

  window.localStorage.setItem(storageKeys.pendingVisit, JSON.stringify(pending));
  notifyPendingVisitChanged();
};

export const clearPendingVisit = (expectedId?: string) => {
  if (typeof window === "undefined") return;

  const current = readPendingVisit();
  if (expectedId && current?.id !== expectedId) return;

  window.localStorage.removeItem(storageKeys.pendingVisit);
  notifyPendingVisitChanged();
};

const subscribe = (callback: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKeys.pendingVisit) callback();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(pendingVisitChangedEvent, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(pendingVisitChangedEvent, callback);
  };
};

const getSnapshot = () =>
  typeof window === "undefined"
    ? ""
    : window.localStorage.getItem(storageKeys.pendingVisit) ?? "";

export const usePendingVisit = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "");
  return useMemo(() => parsePendingVisit(snapshot), [snapshot]);
};
