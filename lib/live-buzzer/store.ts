import type { BuzzerState, BuzzerResult } from "./types";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";

// ─── Utilities ───────────────────────────────────────────────────────────────

export const calculatePoints = (timeMs: number): number => {
  const seconds = timeMs / 1000;
  if (seconds <= 3.0) return 20;
  if (seconds <= 5.0) return 17;
  if (seconds <= 8.0) return 14;
  if (seconds <= 12.0) return 11;
  if (seconds <= 20.0) return 8;
  return 5;
};

const getInitialState = (): BuzzerState => ({
  status: "idle",
  currentRound: 0,
  roundOpenedAt: null,
  entries: [],
  leaderboard: [],
  currentResponderEntryId: null,
  leaderboardVisible: true,
  leaderboardRevealStep: null,
  frozenLeaderboard: null,
  roundEnded: false,
  lastUpdateId: "init",
  countdownStart: null,
  isLive: false,
  accumulatedTimeMs: 0,
  youtubePlaylistId: null,
  youtubeStatus: "stopped",
  youtubeCurrentIndex: 0,
  youtubeCommandId: 0,
  lastScoredEntry: null,
});

const newUpdateId = () => Date.now();

// ─── Supabase Read / Write ────────────────────────────────────────────────────

export async function getState(): Promise<BuzzerState> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = (await admin
      .from("buzzer_session")
      .select("state")
      .eq("id", 1)
      .single()) as any;

    if (error || !data) return getInitialState();
    return data.state as BuzzerState;
  } catch {
    return getInitialState();
  }
}

async function writeState(state: BuzzerState): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    
    // 1. Persistenza su DB
    await admin
      .from("buzzer_session")
      .upsert({ id: 1, state, updated_at: new Date().toISOString() });

    // 2. Broadcast Realtime per reattività istantanea
    await admin.channel("live-buzzer").send({
      type: "broadcast",
      event: "state_update",
      payload: state,
    });
  } catch (e) {
    console.error("BuzzerStore write error:", e);
  }
}

let updateQueue: Promise<any> = Promise.resolve();

/** Read current state, apply updater, write back. Returns new state. 
 * Serialized via a queue to prevent race conditions on shared host. */
export async function updateState(
  updater: (s: BuzzerState) => BuzzerState
): Promise<BuzzerState> {
  const result = updateQueue.then(async () => {
    const current = await getState();
    const next = { ...updater(current), lastUpdateId: newUpdateId() };
    await writeState(next);
    return next;
  });
  updateQueue = result.catch(() => {}); // Prevent queue from breaking on error
  return result;
}

// ─── Rank calculation (pure) ──────────────────────────────────────────────────

function recalcRanks(state: BuzzerState): BuzzerState {
  const sorted = [...state.leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);
  sorted.forEach((team, index) => {
    const currentRank = index + 1;
    const previousRank = team.previousRank || currentRank;
    team.rankDelta = previousRank - currentRank;
    team.movement = team.rankDelta > 0 ? "up" : team.rankDelta < 0 ? "down" : "same";
    team.previousRank = currentRank;
  });
  return { ...state, leaderboard: sorted };
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

export const activateBuzzer = () =>
  updateState(s => ({ ...s, isLive: true }));

export const deactivateBuzzer = () =>
  updateState(s => ({ ...s, isLive: false }));

export const openBuzzer = async () => {
  const state = await updateState(s => ({
    ...s,
    status: "countdown" as const,
    countdownStart: Date.now(),
    roundEnded: false,
    currentResponderEntryId: null,
  }));

  // After 3s countdown, switch to open
  setTimeout(async () => {
    await updateState(s => {
      // Importante: verifichiamo che siamo ancora in countdown e che l'ID update sia coerente
      // Se l'admin ha fatto altro nel frattempo, non forziamo 'open'
      if (s.status !== "countdown") return s;
      return {
        ...s,
        status: "open" as const,
        roundOpenedAt: Date.now(),
        countdownStart: null,
        youtubeStatus: s.youtubePlaylistId ? "playing" as const : s.youtubeStatus,
      };
    });
  }, 3000);

  return state;
};

export const pauseBuzzer = () =>
  updateState(s => {
    const extra = s.roundOpenedAt
      ? { accumulatedTimeMs: s.accumulatedTimeMs + (Date.now() - s.roundOpenedAt), roundOpenedAt: null }
      : {};
    return { ...s, ...extra, status: "paused" as const };
  });

export const closeEntries = () =>
  updateState(s => {
    const extra = s.roundOpenedAt
      ? { accumulatedTimeMs: s.accumulatedTimeMs + (Date.now() - s.roundOpenedAt), roundOpenedAt: null }
      : {};
    const firstResponder = [...s.entries]
      .sort((a, b) => a.relativeTimeMs - b.relativeTimeMs)
      .find(e => !e.scored);
    return {
      ...s, ...extra,
      status: "closed" as const,
      currentResponderEntryId: firstResponder?.id ?? null,
    };
  });

export const endRound = () =>
  updateState(s => {
    const extra = s.roundOpenedAt
      ? { accumulatedTimeMs: s.accumulatedTimeMs + (Date.now() - s.roundOpenedAt), roundOpenedAt: null }
      : {};
    return {
      ...s, ...extra,
      status: "ended" as const,
      roundEnded: true,
      leaderboardVisible: true,
      frozenLeaderboard: null,
      leaderboardRevealStep: null,
      leaderboardRevealFinished: false,
    };
  });

export const hideLeaderboard = () =>
  updateState(s => ({
    ...s,
    leaderboardVisible: false,
    leaderboardRevealStep: null,
    frozenLeaderboard: JSON.parse(JSON.stringify(s.leaderboard)),
  }));

export const showLeaderboard = () =>
  updateState(s => ({
    ...s,
    leaderboardVisible: true,
    frozenLeaderboard: null,
    leaderboardRevealStep: null,
  }));

export const startLeaderboardReveal = () =>
  updateState(s => ({
    ...s,
    leaderboardVisible: true,
    frozenLeaderboard: null,
    leaderboardRevealStep: 1,
    leaderboardRevealFinished: false,
  }));

export const nextLeaderboardReveal = () =>
  updateState(s => {
    if (s.leaderboardRevealStep === null) return s;
    
    // Se siamo già nella modalità sommario finale, chiudiamo il reveal
    if (s.leaderboardRevealStep === 999) return { ...s, leaderboardRevealStep: null };

    const next = s.leaderboardRevealStep + 1;
    
    // Se abbiamo finito di mostrare tutte le squadre (inclusa la 1ª)
    if (next > s.leaderboard.length) {
      return { ...s, leaderboardRevealStep: 999, leaderboardRevealFinished: true }; // Attiviamo il sommario finale
    }
    
    return {
      ...s,
      leaderboardRevealStep: next,
      // Se abbiamo appena mostrato la prima posizione, consideriamo il reveal finito per i telefoni
      leaderboardRevealFinished: next >= s.leaderboard.length
    };
  });

export const resetRound = () =>
  updateState(s => ({
    ...s,
    entries: [],
    currentResponderEntryId: null,
    roundEnded: false,
    accumulatedTimeMs: 0,
    leaderboardRevealStep: null,
    leaderboardRevealFinished: false,
    roundOpenedAt: s.status === "open" ? Date.now() : null,
  }));

export const resetGame = () =>
  updateState(() => getInitialState());

export const nextRound = () =>
  updateState(s => ({
    ...s,
    currentRound: s.currentRound + 1,
    entries: [],
    status: "open" as const,
    currentResponderEntryId: null,
    lastScoredEntry: null,
    countdownStart: null,
    roundEnded: false,
    accumulatedTimeMs: 0,
    leaderboardRevealStep: null,
    roundOpenedAt: Date.now(),
    youtubeStatus: "playing" as const,
    youtubeCommandId: s.youtubeCommandId + 1,
    youtubeCommandType: "next" as const,
  }));

export const kickTeam = (email: string) =>
  updateState(s => {
    const newLeaderboard = s.leaderboard.filter(t => t.email !== email);
    const newEntries = s.entries.filter(e => e.email !== email);
    const responderKicked = s.currentResponderEntryId &&
      !newEntries.find(e => e.id === s.currentResponderEntryId);
    return recalcRanks({
      ...s,
      leaderboard: newLeaderboard,
      entries: newEntries,
      currentResponderEntryId: responderKicked ? null : s.currentResponderEntryId,
      status: responderKicked ? "open" as const : s.status,
      roundOpenedAt: responderKicked && !s.roundOpenedAt ? Date.now() : s.roundOpenedAt,
    });
  });

// ─── YouTube ──────────────────────────────────────────────────────────────────

export const setYoutubePlaylist = (id: string, name?: string) =>
  updateState(s => ({
    ...s,
    youtubePlaylistId: id,
    youtubePlaylistName: name,
    youtubeStatus: "stopped" as const,
    youtubeCommandId: s.youtubeCommandId + 1,
  }));

export const setYoutubeStatus = (status: "playing" | "paused" | "stopped", title?: string) =>
  updateState(s => {
    const base = { ...s, youtubeStatus: status, youtubeVideoTitle: title ?? s.youtubeVideoTitle };
    if (status === "playing") {
      const alreadyActive = ["open", "ended", "closed", "countdown", "result_screen"].includes(s.status);
      if (!alreadyActive && s.status !== "idle") {
        return { ...base, status: "open" as const, countdownStart: null, roundOpenedAt: Date.now() };
      }
    }
    return base;
  });

export const triggerYoutubeCommand = (command: "next" | "prev" | "shuffle") =>
  updateState(s => {
    if (command === "next") {
      return {
        ...s,
        youtubeStatus: "playing" as const,
        status: "open" as const,
        entries: [],
        currentResponderEntryId: null,
        lastScoredEntry: null,
        countdownStart: null,
        roundOpenedAt: Date.now(),
        youtubeCommandId: s.youtubeCommandId + 1,
        youtubeCommandType: "next" as const,
      };
    }
    return { ...s, youtubeCommandId: s.youtubeCommandId + 1, youtubeCommandType: command };
  });

// ─── Score ────────────────────────────────────────────────────────────────────

export const assignScore = async (email: string, points: number, result: BuzzerResult) => {
  // Salviamo l'UpdateID generato per validare i timeout successivi
  const state = await updateState(s => {
    const entries = s.entries.map(e => {
      if (e.id === s.currentResponderEntryId && e.email === email && !e.scored) {
        return { ...e, scored: true, scoreAwarded: points, result };
      }
      return e;
    });
    const scoredEntry = entries.find(e => e.id === s.currentResponderEntryId && e.email === email);
    const leaderboard = s.leaderboard.map(t =>
      t.email === email
        ? { ...t, totalPoints: t.totalPoints + points, totalAnswers: t.totalAnswers + 1 }
        : t
    );
    const sorted = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);
    sorted.forEach((team, i) => {
      const prev = team.previousRank || i + 1;
      team.rankDelta = prev - (i + 1);
      team.movement = team.rankDelta > 0 ? "up" : team.rankDelta < 0 ? "down" : "same";
      team.previousRank = i + 1;
    });
    return {
      ...s,
      entries,
      leaderboard: sorted,
      lastScoredEntry: scoredEntry ? { ...scoredEntry } : s.lastScoredEntry,
      status: "result_screen" as const,
      youtubeStatus: result === "correct" ? "playing" as const : s.youtubeStatus,
    };
  });

  const triggerUpdateId = state.lastUpdateId;

  // After-score timeouts
  setTimeout(async () => {
    // Verifichiamo se nel frattempo lo stato è cambiato o se un altro update ha sovrascritto questo
    const current = await getState();
    if (current.status !== "result_screen" || current.lastUpdateId !== triggerUpdateId) return;

    if (result === "wrong") {
      await updateState(s => {
        if (s.status !== "result_screen" || s.lastUpdateId !== triggerUpdateId) return s;
        return { ...s, status: "countdown" as const, countdownStart: Date.now() };
      });
      
      const countdownUpdateId = (await getState()).lastUpdateId;
      
      setTimeout(async () => {
        await updateState(s => {
          if (s.status !== "countdown" || s.lastUpdateId !== countdownUpdateId) return s;
          return {
            ...s,
            status: "open" as const,
            currentResponderEntryId: null,
            countdownStart: null,
            roundOpenedAt: Date.now(),
            youtubeStatus: "playing" as const,
          };
        });
      }, 3000);
    }
  }, 4000);

  if (result === "correct") {
    setTimeout(async () => {
      await updateState(s => {
        if (s.status !== "result_screen" || s.lastUpdateId !== triggerUpdateId) return s;
        return {
          ...s,
          status: "ended" as const,
          leaderboardVisible: false,
          currentResponderEntryId: null,
          lastScoredEntry: null,
        };
      });
    }, 10000);
  }

  return state;
};

// ─── User Actions ─────────────────────────────────────────────────────────────

export const registerOrUpdateTeam = (email: string, nickname: string, tableNumber: string) =>
  updateState(s => {
    const existing = s.leaderboard.find(t => t.email === email);
    if (existing) {
      return {
        ...s,
        leaderboard: s.leaderboard.map(t =>
          t.email === email ? { ...t, nickname, tableNumber } : t
        ),
      };
    }
    const newTeam = {
      email, nickname, tableNumber,
      totalPoints: 0, totalAnswers: 0,
      previousRank: s.leaderboard.length + 1,
      rankDelta: 0, movement: "same" as const,
    };
    return recalcRanks({ ...s, leaderboard: [...s.leaderboard, newTeam] });
  });

export const addBuzzerEntry = async (email: string): Promise<boolean> => {
  let success = false;
  await updateState(s => {
    if (s.status !== "open" || !s.roundOpenedAt) return s;
    const team = s.leaderboard.find(t => t.email === email);
    if (!team) return s;
    if (s.entries.some(e => e.email === email)) return s;

    const now = Date.now();
    const entryId = `${s.currentRound}-${email}-${now}`;
    const relativeTime = s.accumulatedTimeMs + (now - s.roundOpenedAt);
    const newEntry = {
      id: entryId,
      roundId: s.currentRound,
      email: team.email,
      nickname: team.nickname,
      tableNumber: team.tableNumber,
      timestamp: now,
      relativeTimeMs: relativeTime,
      scored: false,
      result: null as null,
    };
    success = true;
    return {
      ...s,
      entries: [...s.entries, newEntry],
      status: "closed" as const,
      currentResponderEntryId: entryId,
      accumulatedTimeMs: s.accumulatedTimeMs + (now - s.roundOpenedAt),
      roundOpenedAt: null,
      youtubeStatus: "paused" as const,
    };
  });
  return success;
};

// ─── Legacy compat (getBuzzerStore removed - use getState() async) ─────────────
// The SSE stream and state route now use getState() directly.
