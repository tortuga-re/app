import type { BuzzerState, BuzzerResult } from "./types";

type GlobalStore = {
  __tortugaBuzzerState?: BuzzerState;
};

const _global = globalThis as unknown as GlobalStore;

const getInitialState = (): BuzzerState => ({
  status: "idle",
  currentRound: 1,
  roundOpenedAt: null,
  entries: [],
  leaderboard: [],
  currentResponderEntryId: null,
  leaderboardVisible: true,
  frozenLeaderboard: null,
  roundEnded: false,
  lastUpdateId: "init",
});

export const getBuzzerStore = (): BuzzerState => {
  if (!_global.__tortugaBuzzerState) {
    _global.__tortugaBuzzerState = getInitialState();
  }
  return _global.__tortugaBuzzerState;
};

const notifyChange = () => {
  const store = getBuzzerStore();
  store.lastUpdateId = Math.random().toString(36).substring(7);
};

const updateRanks = () => {
  const store = getBuzzerStore();
  
  // Create a copy and sort by points
  const sorted = [...store.leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);
  
  sorted.forEach((team, index) => {
    const currentRank = index + 1;
    const previousRank = team.previousRank || currentRank;
    
    team.rankDelta = previousRank - currentRank;
    if (team.rankDelta > 0) team.movement = "up";
    else if (team.rankDelta < 0) team.movement = "down";
    else team.movement = "same";
    
    team.previousRank = currentRank; // Store for next time
  });

  store.leaderboard = sorted;
};

// Admin Actions
export const openBuzzer = () => {
  const store = getBuzzerStore();
  store.status = "open";
  store.roundOpenedAt = Date.now();
  store.roundEnded = false;
  store.currentResponderEntryId = null;
  notifyChange();
};

export const pauseBuzzer = () => {
  const store = getBuzzerStore();
  store.status = "paused";
  notifyChange();
};

export const closeEntries = () => {
  const store = getBuzzerStore();
  store.status = "closed";
  
  // Set current responder to the first one in queue
  const firstResponder = [...store.entries]
    .sort((a, b) => a.relativeTimeMs - b.relativeTimeMs)
    .find(e => !e.scored);
  
  store.currentResponderEntryId = firstResponder?.id || null;
  notifyChange();
};

export const endRound = () => {
  const store = getBuzzerStore();
  store.status = "ended";
  store.roundEnded = true;
  store.leaderboardVisible = true;
  store.frozenLeaderboard = null;
  notifyChange();
};

export const hideLeaderboard = () => {
  const store = getBuzzerStore();
  store.leaderboardVisible = false;
  // Snapshot current leaderboard (without delta/movement from future changes)
  store.frozenLeaderboard = JSON.parse(JSON.stringify(store.leaderboard));
  notifyChange();
};

export const showLeaderboard = () => {
  const store = getBuzzerStore();
  store.leaderboardVisible = true;
  store.frozenLeaderboard = null;
  notifyChange();
};

export const resetRound = () => {
  const store = getBuzzerStore();
  store.entries = [];
  store.currentResponderEntryId = null;
  store.roundEnded = false;
  if (store.status === "open") {
    store.roundOpenedAt = Date.now();
  }
  notifyChange();
};

export const resetGame = () => {
  _global.__tortugaBuzzerState = getInitialState();
  notifyChange();
};

export const nextRound = () => {
  const store = getBuzzerStore();
  store.currentRound += 1;
  store.entries = [];
  store.status = "idle";
  store.roundOpenedAt = null;
  store.currentResponderEntryId = null;
  store.roundEnded = false;
  notifyChange();
};

const findNextResponder = () => {
  const store = getBuzzerStore();
  const next = [...store.entries]
    .sort((a, b) => a.relativeTimeMs - b.relativeTimeMs)
    .find(e => !e.scored);
  store.currentResponderEntryId = next?.id || null;
};

export const assignScore = (email: string, points: number, result: BuzzerResult) => {
  const store = getBuzzerStore();
  
  // Find entry in current round
  const entry = store.entries.find(e => e.email === email);
  if (entry && !entry.scored) {
    entry.scored = true;
    entry.scoreAwarded = points;
    entry.result = result;
  }

  // Update leaderboard
  const team = store.leaderboard.find(t => t.email === email);
  if (team) {
    team.totalPoints += points;
    team.totalAnswers += 1;
    updateRanks();
  }

  // If wrong and was current responder, find next
  if (result === "wrong" && entry?.id === store.currentResponderEntryId) {
    findNextResponder();
  } else if (result !== "wrong" && entry?.id === store.currentResponderEntryId) {
    // Optional: stay as responder until admin chooses next round? 
    // The request says "Se una squadra sbaglia, passa alla successiva".
    // If they are correct, we don't pass automatically.
  }

  notifyChange();
};

// User Actions
export const registerOrUpdateTeam = (email: string, nickname: string, tableNumber: string) => {
  const store = getBuzzerStore();
  const existingTeam = store.leaderboard.find(t => t.email === email);

  if (existingTeam) {
    existingTeam.nickname = nickname;
    existingTeam.tableNumber = tableNumber;
  } else {
    store.leaderboard.push({
      email,
      nickname,
      tableNumber,
      totalPoints: 0,
      totalAnswers: 0,
      previousRank: store.leaderboard.length + 1,
      rankDelta: 0,
      movement: "same",
    });
    updateRanks();
  }
  notifyChange();
};

export const addBuzzerEntry = (email: string): boolean => {
  const store = getBuzzerStore();
  
  if (store.status !== "open" || !store.roundOpenedAt) return false;

  const team = store.leaderboard.find(t => t.email === email);
  if (!team) return false;

  const alreadyBuzzed = store.entries.some(e => e.email === email);
  if (alreadyBuzzed) return false;

  const now = Date.now();
  store.entries.push({
    id: `${store.currentRound}-${email}-${now}`,
    roundId: store.currentRound,
    email: team.email,
    nickname: team.nickname,
    tableNumber: team.tableNumber,
    timestamp: now,
    relativeTimeMs: now - store.roundOpenedAt,
    scored: false,
    result: null,
  });

  notifyChange();
  return true;
};
