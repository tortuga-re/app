"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  ACTIVE_GAMES_CHANNEL,
  ACTIVE_GAMES_STATUS_EVENT,
  type ActiveGamesStatusPatch,
} from "@/lib/game/active-games-channel";
import { getSupabase } from "@/lib/match-drink/supabase";

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
let statusListenerStarted = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let statusChannel: any = null;
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

const updateSnapshot = (nextSnapshot: ActiveGamesSnapshot) => {
  snapshot = nextSnapshot;
  notifyListeners();
};

const applyStatusPatch = (patch: ActiveGamesStatusPatch) => {
  const nextSnapshot = {
    buzzer: typeof patch.buzzer === "boolean" ? patch.buzzer : snapshot.buzzer,
    matchDrink:
      typeof patch.matchDrink === "boolean" ? patch.matchDrink : snapshot.matchDrink,
    loading: false,
  };

  if (
    nextSnapshot.buzzer === snapshot.buzzer &&
    nextSnapshot.matchDrink === snapshot.matchDrink &&
    nextSnapshot.loading === snapshot.loading
  ) {
    return;
  }

  updateSnapshot(nextSnapshot);
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

const ensureStatusListener = () => {
  if (typeof window === "undefined" || statusListenerStarted) {
    return;
  }

  statusListenerStarted = true;
  void fetchSnapshot();
  statusChannel = getSupabase()
    .channel(ACTIVE_GAMES_CHANNEL)
    .on(
      "broadcast",
      { event: ACTIVE_GAMES_STATUS_EVENT },
      ({ payload }: { payload: ActiveGamesStatusPatch }) => {
        if (payload) {
          applyStatusPatch(payload);
        }
      },
    )
    .subscribe();
  document.addEventListener("visibilitychange", handleVisibilityChange);
};

const handleVisibilityChange = () => {
  if (document.visibilityState === "visible") {
    void fetchSnapshot();
  }
};

const stopStatusListenerIfIdle = () => {
  if (listeners.size > 0 || typeof window === "undefined") {
    return;
  }

  statusListenerStarted = false;
  if (statusChannel) {
    void getSupabase().removeChannel(statusChannel);
    statusChannel = null;
  }
  document.removeEventListener("visibilitychange", handleVisibilityChange);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  ensureStatusListener();

  return () => {
    listeners.delete(listener);
    stopStatusListenerIfIdle();
  };
};

const getSnapshot = () => snapshot;

export const useActiveGamesStatus = () => {
  const storeSnapshot = useSyncExternalStore(subscribe, getSnapshot, () => defaultSnapshot);

  useEffect(() => {
    ensureStatusListener();
  }, []);

  return storeSnapshot;
};
