import "server-only";

import { randomUUID } from "node:crypto";

import { createPersistentJsonStore } from "@/lib/server/persistent-json-store";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";

import { buildPresetPlaylist } from "./default-playlists";
import type {
  LiveTvItem,
  LiveTvOverlay,
  LiveTvPresetId,
  LiveTvState,
  LiveTvUpsertItemInput,
  StageMode,
} from "./types";

const LIVE_TV_STORAGE = createPersistentJsonStore<LiveTvState>({
  key: "live-tv:state",
  localFile: ".codex/live-tv-state.json",
  initialState: () => createInitialState(),
});

const LIVE_TV_TABLE = "live_tv_state";
const LIVE_TV_CHANNEL = "live-tv";

const nowIso = () => new Date().toISOString();

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
    autoReturnAfterBuzzer: false,
    autoReturnAfterMatchDrink: false,
    lastUpdateId: "init",
    updatedAt: timestamp,
  };
};

const stampUpdate = (state: LiveTvState, timestamp = nowIso()) => ({
  ...state,
  updatedAt: timestamp,
  lastUpdateId: Date.now(),
});

const reindexPlaylist = (playlist: LiveTvItem[]) =>
  [...playlist]
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
    .map((item, index) => ({
      ...item,
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
    nowPlayingOverride: state.nowPlayingOverride ?? null,
    nowPlayingStartedAt: state.nowPlayingStartedAt ?? null,
    currentItemStartedAt: state.currentItemStartedAt || timestamp,
    updatedAt: state.updatedAt || timestamp,
    isBlackout: state.stageMode === "blackout",
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
  subtitle: input.subtitle,
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
    await admin.channel(LIVE_TV_CHANNEL).send({
      type: "broadcast",
      event: "state_update",
      payload: state,
    });
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
  const storedState = (await readSupabaseState()) ?? (await LIVE_TV_STORAGE.read());
  const normalized = normalizeState(storedState);

  if (JSON.stringify(normalized) !== JSON.stringify(storedState)) {
    await LIVE_TV_STORAGE.write(normalized);
    await writeSupabaseState(normalized);
  }

  return normalized;
};

export const updateLiveTvState = async (
  updater: (state: LiveTvState) => LiveTvState | Promise<LiveTvState>,
) => {
  return LIVE_TV_STORAGE.update(async (currentState) => {
    const sourceState = normalizeState((await readSupabaseState()) ?? currentState);
    const timestamp = nowIso();
    const nextState = normalizeState(await updater(sourceState), timestamp);
    const stamped = stampUpdate(nextState, timestamp);

    await writeSupabaseState(stamped);
    await broadcastState(stamped);

    return stamped;
  });
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
      currentItemStartedAt:
        leavingLiveTv || enteringLiveTv ? timestamp : state.currentItemStartedAt,
    };
  });

export const setActivePreset = async (presetId: LiveTvPresetId) =>
  updateLiveTvState((state) => {
    const timestamp = nowIso();
    return normalizeState(
      {
        ...state,
        activePresetId: presetId,
        playlist: buildPresetPlaylist(presetId),
        currentItemIndex: 0,
        currentItemStartedAt: timestamp,
        nowPlayingOverride: null,
        nowPlayingStartedAt: null,
      },
      timestamp,
    );
  });

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
