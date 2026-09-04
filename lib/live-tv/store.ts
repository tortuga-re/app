import "server-only";

import { randomUUID } from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getRomeTime, getRomeWeekday } from "@/lib/utils";

import { buildPresetPlaylist } from "./default-playlists";
import type {
  LiveTvItem,
  LiveTvOverlay,
  LiveTvScheduleEntry,
  LiveTvPresetId,
  LiveTvState,
  LiveTvUpsertItemInput,
  StageMode,
} from "./types";



const LIVE_TV_TABLE = "live_tv_state";
const LIVE_TV_CHANNEL = "live-tv";

const nowIso = () => new Date().toISOString();

const normalizeScheduleEntry = (entry: LiveTvScheduleEntry): LiveTvScheduleEntry => ({
  ...entry,
  presetId: entry.presetId ?? null,
  enabled: entry.enabled !== false,
  daysOfWeek: Array.isArray(entry.daysOfWeek)
    ? entry.daysOfWeek
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [],
});

const matchesScheduleEntry = (entry: LiveTvScheduleEntry, now: Date) => {
  if (!entry.enabled || entry.daysOfWeek.length === 0) {
    return false;
  }

  const currentDay = getRomeWeekday(now);
  if (!entry.daysOfWeek.includes(currentDay)) {
    return false;
  }

  const currentTime = getRomeTime(now);

  return entry.startTime <= currentTime && currentTime < entry.endTime;
};

const applyScheduledStageState = (state: LiveTvState, timestamp = nowIso()) => {
  const schedule = (state.schedule ?? []).map(normalizeScheduleEntry);

  if (!state.autoScheduleEnabled || schedule.length === 0) {
    return {
      ...state,
      schedule,
      activeScheduleId: null,
    };
  }

  const now = new Date(timestamp);
  const matchingEntry = schedule.find((entry) => matchesScheduleEntry(entry, now)) ?? null;

  if (!matchingEntry) {
    return {
      ...state,
      schedule,
      activeScheduleId: null,
    };
  }

  if (state.activeScheduleId === matchingEntry.id) {
    return {
      ...state,
      schedule,
      activeScheduleId: matchingEntry.id,
    };
  }

  const shouldSwitchPreset =
    matchingEntry.stageMode === "live_tv" &&
    matchingEntry.presetId &&
    matchingEntry.presetId !== state.activePresetId;

  return normalizeState(
    {
      ...state,
      stageMode: matchingEntry.stageMode,
      isBlackout: matchingEntry.stageMode === "blackout",
      activeScheduleId: matchingEntry.id,
      activePresetId:
        matchingEntry.stageMode === "live_tv"
          ? matchingEntry.presetId ?? state.activePresetId ?? null
          : state.activePresetId ?? null,
      playlist: shouldSwitchPreset
        ? buildPresetPlaylist(matchingEntry.presetId!)
        : state.playlist,
      currentItemIndex: shouldSwitchPreset ? 0 : state.currentItemIndex,
      currentItemStartedAt: timestamp,
    },
    timestamp,
  );
};

const createInitialState = (): LiveTvState => {
  const timestamp = nowIso();

  return {
    stageMode: "live_tv",
    activePresetId: "generica",
    playlist: buildPresetPlaylist("generica"),
    currentItemIndex: 0,
    currentItemStartedAt: timestamp,
    nowPlayingOverride: null,
    nowPlayingStartedAt: null,
    overlay: null,
    isBlackout: false,
    autoScheduleEnabled: false,
    activeScheduleId: null,
    schedule: [],
    greetingsEnabled: true,
    lastUpdateId: "init",
    updatedAt: timestamp,
  };
};

const stampUpdate = (state: LiveTvState, timestamp = nowIso()) => ({
  ...state,
  updatedAt: timestamp,
  lastUpdateId: Date.now(),
});

const sanitizeMediaUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (url.includes("LOGO-TORTUGA-2.png")) return "/images/LOGO-TORTUGA-2.png";
  if (url.includes("cropped-TORTUGA-FAVICON-SMALL.png")) return "/images/cropped-TORTUGA-FAVICON-SMALL.png";
  if (url.includes("TOP-3-TRIPADVISOR.png")) return "/images/TOP-3-TRIPADVISOR.png";
  if (url.startsWith("https://tortugabay.it/wp-content/uploads/")) {
    return url;
  }
  return url;
};

const reindexPlaylist = (playlist: LiveTvItem[]) =>
  [...playlist]
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
    .map((item, index) => ({
      ...item,
      mediaUrl: sanitizeMediaUrl(item.mediaUrl),
      order: index,
    }));

export const getEnabledPlaylistItems = (state: LiveTvState) =>
  reindexPlaylist(state.playlist).filter((item) => item.enabled);

const isExpiredAt = (value?: string | null) =>
  Boolean(value && new Date(value).getTime() <= Date.now());

const getDisplayedItem = (state: LiveTvState) => {
  if (state.nowPlayingOverride) {
    return state.nowPlayingOverride;
  }

  const enabledItems = getEnabledPlaylistItems(state);

  if (!enabledItems.length) {
    return null;
  }

  return enabledItems[state.currentItemIndex] ?? enabledItems[0] ?? null;
};

const normalizeState = (state: LiveTvState, timestamp = nowIso()) => {
  let nextState: LiveTvState = {
    ...state,
    playlist: reindexPlaylist(state.playlist),
    activePresetId: state.activePresetId ?? null,
    overlay: state.overlay ?? null,
    nowPlayingOverride: state.nowPlayingOverride
      ? {
          ...state.nowPlayingOverride,
          mediaUrl: sanitizeMediaUrl(state.nowPlayingOverride.mediaUrl),
        }
      : null,
    nowPlayingStartedAt: state.nowPlayingStartedAt ?? null,
    currentItemStartedAt: state.currentItemStartedAt || timestamp,
    updatedAt: state.updatedAt || timestamp,
    isBlackout: state.stageMode === "blackout",
    autoScheduleEnabled: Boolean(state.autoScheduleEnabled),
    activeScheduleId: state.activeScheduleId ?? null,
    schedule: (state.schedule ?? []).map(normalizeScheduleEntry),
    greetingsEnabled: state.greetingsEnabled !== false,
  };

  if (nextState.overlay && isExpiredAt(nextState.overlay.expiresAt)) {
    nextState = {
      ...nextState,
      overlay: null,
    };
  }

  if (nextState.nowPlayingOverride && nextState.nowPlayingStartedAt) {
    const overrideEndsAt =
      new Date(nextState.nowPlayingStartedAt).getTime() +
      nextState.nowPlayingOverride.durationSeconds * 1000;

    if (overrideEndsAt <= Date.now()) {
      nextState = {
        ...nextState,
        nowPlayingOverride: null,
        nowPlayingStartedAt: null,
      };
    }
  }

  const enabledItems = getEnabledPlaylistItems(nextState);

  if (!enabledItems.length) {
    nextState = {
      ...nextState,
      currentItemIndex: 0,
      currentItemStartedAt: nextState.currentItemStartedAt || timestamp,
    };
  } else if (nextState.currentItemIndex >= enabledItems.length || nextState.currentItemIndex < 0) {
    nextState = {
      ...nextState,
      currentItemIndex: 0,
      currentItemStartedAt: timestamp,
    };
  }

  return nextState;
};

const syncPlaylistMutation = (
  state: LiveTvState,
  playlist: LiveTvItem[],
  timestamp = nowIso(),
) => {
  const previousCurrent = getEnabledPlaylistItems(state)[state.currentItemIndex] ?? null;
  const nextPlaylist = reindexPlaylist(playlist);
  const enabledNext = nextPlaylist.filter((item) => item.enabled);

  let nextIndex = 0;
  let nextStartedAt = state.currentItemStartedAt || timestamp;

  if (previousCurrent) {
    const preservedIndex = enabledNext.findIndex((item) => item.id === previousCurrent.id);

    if (preservedIndex >= 0) {
      nextIndex = preservedIndex;
    } else if (enabledNext.length) {
      nextIndex = Math.min(state.currentItemIndex, enabledNext.length - 1);
      nextStartedAt = timestamp;
    } else {
      nextStartedAt = timestamp;
    }
  } else if (enabledNext.length) {
    nextIndex = Math.min(state.currentItemIndex, enabledNext.length - 1);
  }

  return normalizeState(
    {
      ...state,
      playlist: nextPlaylist,
      currentItemIndex: nextIndex,
      currentItemStartedAt: nextStartedAt,
    },
    timestamp,
  );
};

const createLiveTvItem = (
  input: LiveTvUpsertItemInput,
  order: number,
  timestamp = nowIso(),
): LiveTvItem => ({
  id: randomUUID(),
  type: input.type,
  title: input.title,
  body: input.body,
  mediaUrl: input.mediaUrl,
  qrUrl: input.qrUrl,
  qrLabel: input.qrLabel,
  durationSeconds: input.durationSeconds,
  enabled: input.enabled,
  order,
  styleVariant: input.styleVariant ?? "default",
  createdAt: timestamp,
  updatedAt: timestamp,
});

const broadcastState = async (state: LiveTvState) => {
  try {
    const admin = getSupabaseAdmin();
    await admin.channel(LIVE_TV_CHANNEL).httpSend("state_update", state);
  } catch (error) {
    console.error("Live TV broadcast error:", error);
  }
};

const readSupabaseState = async (): Promise<LiveTvState | null> => {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = (await admin
      .from(LIVE_TV_TABLE)
      .select("state")
      .eq("id", 1)
      .single()) as {
      data: { state?: LiveTvState } | null;
      error: { message?: string } | null;
    };

    if (error || !data?.state) {
      return null;
    }

    return data.state;
  } catch (error) {
    console.error("Live TV read error:", error);
    return null;
  }
};

const writeSupabaseState = async (state: LiveTvState) => {
  try {
    const admin = getSupabaseAdmin();
    await admin
      .from(LIVE_TV_TABLE)
      .upsert({ id: 1, state, updated_at: state.updatedAt });
  } catch (error) {
    console.error("Live TV write error:", error);
  }
};

export const getLiveTvState = async (): Promise<LiveTvState> => {
  const storedState = (await readSupabaseState()) ?? createInitialState();
  const normalized = applyScheduledStageState(normalizeState(storedState));

  if (JSON.stringify(normalized) !== JSON.stringify(storedState)) {
    await writeSupabaseState(normalized);
  }

  return normalized;
};

export const updateLiveTvState = async (
  updater: (state: LiveTvState) => LiveTvState | Promise<LiveTvState>,
) => {
  const currentState = (await readSupabaseState()) ?? createInitialState();
  const sourceState = normalizeState(currentState);
  const timestamp = nowIso();
  const nextState = normalizeState(await updater(sourceState), timestamp);
  const stamped = stampUpdate(nextState, timestamp);

  await writeSupabaseState(stamped);
  await broadcastState(stamped);

  return stamped;
};

export const setStageMode = async (stageMode: StageMode) =>
  updateLiveTvState((state) => {
    const timestamp = nowIso();
    const leavingLiveTv = state.stageMode === "live_tv" && stageMode !== "live_tv";
    const enteringLiveTv = state.stageMode !== "live_tv" && stageMode === "live_tv";

    return {
      ...state,
      stageMode,
      isBlackout: stageMode === "blackout",
      activeScheduleId: null,
      currentItemStartedAt:
        leavingLiveTv || enteringLiveTv ? timestamp : state.currentItemStartedAt,
    };
  });

export const savePresetOverride = async (presetId: LiveTvPresetId) => {
  const state = await getLiveTvState();
  const items = state.playlist;

  try {
    const admin = getSupabaseAdmin();
    await admin
      .from("live_tv_preset_overrides")
      .upsert({ preset_id: presetId, items: JSON.stringify(items), updated_at: nowIso() });
  } catch (error) {
    console.error("Live TV preset override save error:", error);
    throw new Error("Impossibile salvare l'override del preset.");
  }
};

const getPresetOverride = async (presetId: LiveTvPresetId): Promise<LiveTvItem[] | null> => {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = (await admin
      .from("live_tv_preset_overrides")
      .select("items")
      .eq("preset_id", presetId)
      .single()) as {
      data: { items?: string | LiveTvItem[] } | null;
      error: { message?: string } | null;
    };

    if (error || !data?.items) {
      return null;
    }

    const raw = typeof data.items === "string" ? JSON.parse(data.items) : data.items;
    return Array.isArray(raw) ? (raw as LiveTvItem[]) : null;
  } catch {
    return null;
  }
};

export const setActivePreset = async (presetId: LiveTvPresetId) =>
  updateLiveTvState(async (state) => {
    const timestamp = nowIso();
    const override = await getPresetOverride(presetId);
    const playlist = override ?? buildPresetPlaylist(presetId);

    return normalizeState(
      {
        ...state,
        activePresetId: presetId,
        playlist,
        currentItemIndex: 0,
        currentItemStartedAt: timestamp,
        nowPlayingOverride: null,
        nowPlayingStartedAt: null,
        activeScheduleId: null,
      },
      timestamp,
    );
  });

export const setLiveTvSchedule = async (payload: {
  autoScheduleEnabled: boolean;
  schedule: LiveTvScheduleEntry[];
}) =>
  updateLiveTvState((state) =>
    applyScheduledStageState(
      {
        ...state,
        autoScheduleEnabled: payload.autoScheduleEnabled,
        schedule: payload.schedule.map(normalizeScheduleEntry),
      },
      nowIso(),
    ),
  );

export const replacePlaylist = async (items: LiveTvUpsertItemInput[]) =>
  updateLiveTvState((state) => {
    const timestamp = nowIso();
    const playlist = items.map((item, index) => createLiveTvItem(item, index, timestamp));
    return syncPlaylistMutation(
      {
        ...state,
        activePresetId: null,
      },
      playlist,
      timestamp,
    );
  });

export const addPlaylistItem = async (input: LiveTvUpsertItemInput) =>
  updateLiveTvState((state) => {
    const timestamp = nowIso();
    const order = typeof input.order === "number" ? input.order : state.playlist.length;
    const nextItems = [...state.playlist];
    nextItems.splice(order, 0, createLiveTvItem(input, order, timestamp));

    return syncPlaylistMutation(
      {
        ...state,
        activePresetId: null,
      },
      nextItems,
      timestamp,
    );
  });

export const updatePlaylistItem = async (id: string, patch: Partial<LiveTvItem>) =>
  updateLiveTvState((state) => {
    const timestamp = nowIso();
    const nextItems = state.playlist.map((item) =>
      item.id === id
        ? {
            ...item,
            ...patch,
            id: item.id,
            createdAt: item.createdAt,
            updatedAt: timestamp,
          }
        : item,
    );

    return syncPlaylistMutation(
      {
        ...state,
        activePresetId: null,
      },
      nextItems,
      timestamp,
    );
  });

export const deletePlaylistItem = async (id: string) =>
  updateLiveTvState((state) => {
    const timestamp = nowIso();
    return syncPlaylistMutation(
      {
        ...state,
        activePresetId: null,
      },
      state.playlist.filter((item) => item.id !== id),
      timestamp,
    );
  });

export const togglePlaylistItem = async (id: string, enabled: boolean) =>
  updatePlaylistItem(id, { enabled });

export const reorderPlaylist = async (ids: string[]) =>
  updateLiveTvState((state) => {
    const timestamp = nowIso();
    const known = new Map(state.playlist.map((item) => [item.id, item]));
    const reordered = ids
      .map((id, index) => {
        const item = known.get(id);
        if (!item) return null;
        return {
          ...item,
          order: index,
          updatedAt: timestamp,
        };
      })
      .filter(Boolean) as LiveTvItem[];
    const remaining = state.playlist.filter((item) => !ids.includes(item.id));

    return syncPlaylistMutation(
      {
        ...state,
        activePresetId: null,
      },
      [...reordered, ...remaining],
      timestamp,
    );
  });

export const sendNowPlaying = async (
  input: LiveTvUpsertItemInput,
  addToPlaylist = false,
) =>
  updateLiveTvState((state) => {
    const timestamp = nowIso();
    const override = createLiveTvItem(input, state.playlist.length, timestamp);

    return normalizeState(
      {
        ...state,
        activePresetId: addToPlaylist ? null : state.activePresetId,
        playlist: addToPlaylist ? [...state.playlist, override] : state.playlist,
        nowPlayingOverride: override,
        nowPlayingStartedAt: timestamp,
      },
      timestamp,
    );
  });

export const clearNowPlaying = async () =>
  updateLiveTvState((state) => ({
    ...state,
    nowPlayingOverride: null,
    nowPlayingStartedAt: null,
    currentItemStartedAt: nowIso(),
  }));

export const setOverlay = async (overlay: LiveTvOverlay) =>
  updateLiveTvState((state) => ({
    ...state,
    overlay,
  }));

export const clearOverlay = async () =>
  updateLiveTvState((state) => ({
    ...state,
    overlay: null,
  }));

export const resetLiveTvDefaults = async () => setActivePreset("generica");

export const advanceLiveTv = async (payload: {
  expectedIndex?: number;
  expectedStartedAt?: string;
  expectedOverrideStartedAt?: string;
}) =>
  updateLiveTvState((state) => {
    const timestamp = nowIso();

    if (state.nowPlayingOverride && state.nowPlayingStartedAt) {
      if (
        payload.expectedOverrideStartedAt &&
        payload.expectedOverrideStartedAt === state.nowPlayingStartedAt
      ) {
        const overrideEndsAt =
          new Date(state.nowPlayingStartedAt).getTime() +
          state.nowPlayingOverride.durationSeconds * 1000;

        if (overrideEndsAt <= Date.now()) {
          return {
            ...state,
            nowPlayingOverride: null,
            nowPlayingStartedAt: null,
            currentItemStartedAt: timestamp,
          };
        }
      }

      return state;
    }

    if (state.stageMode !== "live_tv") {
      return state;
    }

    const enabledItems = getEnabledPlaylistItems(state);

    if (!enabledItems.length) {
      return {
        ...state,
        currentItemIndex: 0,
        currentItemStartedAt: timestamp,
      };
    }

    if (
      payload.expectedIndex !== undefined &&
      payload.expectedIndex !== state.currentItemIndex
    ) {
      return state;
    }

    if (
      payload.expectedStartedAt &&
      payload.expectedStartedAt !== state.currentItemStartedAt
    ) {
      return state;
    }

    const currentItem = enabledItems[state.currentItemIndex] ?? enabledItems[0];
    const currentEndsAt =
      new Date(state.currentItemStartedAt).getTime() +
      currentItem.durationSeconds * 1000;

    if (currentEndsAt > Date.now()) {
      return state;
    }

    return {
      ...state,
      currentItemIndex: (state.currentItemIndex + 1) % enabledItems.length,
      currentItemStartedAt: timestamp,
    };
  });

export const forceStageCompatibilityMode = async (stageMode: StageMode) => {
  const currentState = await getLiveTvState();
  if (currentState.stageMode === stageMode) {
    return currentState;
  }

  return setStageMode(stageMode);
};

export const getLiveTvDisplayedItem = async () => {
  const state = await getLiveTvState();
  return getDisplayedItem(state);
};

export const setLiveTvGreetingsEnabled = async (enabled: boolean) =>
  updateLiveTvState((state) => ({
    ...state,
    greetingsEnabled: enabled,
  }));
