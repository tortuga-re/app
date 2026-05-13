"use client";

import { useEffect, useSyncExternalStore } from "react";

type ActiveGamesSnapshot = {
  buzzer: boolean;
  matchDrink: boolean;
  loading: boolean;
};

const defaultSnapshot: ActiveGamesSnapshot = {
  buzzer: false,
  matchDrink: false,
  loading: true,
};

let snapshot = defaultSnapshot;
let pollerStarted = false;
let pollerId: number | null = null;
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

const updateSnapshot = (nextSnapshot: ActiveGamesSnapshot) => {
  snapshot = nextSnapshot;
  notifyListeners();
};

const fetchSnapshot = async () => {
  try {
    const response = await fetch("/api/game/active-status", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Game status request failed");
    }

    const body = (await response.json()) as {
      buzzer?: boolean;
      matchDrink?: boolean;
    };

    updateSnapshot({
      buzzer: Boolean(body.buzzer),
      matchDrink: Boolean(body.matchDrink),
      loading: false,
    });
  } catch {
    updateSnapshot({
      ...snapshot,
      loading: false,
    });
  }
};

const ensurePoller = () => {
  if (typeof window === "undefined" || pollerStarted) {
    return;
  }

  pollerStarted = true;
  void fetchSnapshot();
  pollerId = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      void fetchSnapshot();
    }
  }, 10000);

  document.addEventListener("visibilitychange", handleVisibilityChange);
};

const handleVisibilityChange = () => {
  if (document.visibilityState === "visible") {
    void fetchSnapshot();
  }
};

const stopPollerIfIdle = () => {
  if (listeners.size > 0 || typeof window === "undefined") {
    return;
  }

  if (pollerId) {
    window.clearInterval(pollerId);
  }
  pollerId = null;
  pollerStarted = false;
  document.removeEventListener("visibilitychange", handleVisibilityChange);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  ensurePoller();

  return () => {
    listeners.delete(listener);
    stopPollerIfIdle();
  };
};

const getSnapshot = () => snapshot;

export const useActiveGamesStatus = () => {
  const storeSnapshot = useSyncExternalStore(subscribe, getSnapshot, () => defaultSnapshot);

  useEffect(() => {
    ensurePoller();
  }, []);

  return storeSnapshot;
};
