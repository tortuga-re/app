import type { BuzzerState, BuzzerResult } from "./types";

type SubscriptionCallback = (state: BuzzerState) => void;

type GlobalStore = {
  __tortugaBuzzerState?: BuzzerState;
  __tortugaBuzzerSubscriptions?: Set<SubscriptionCallback>;
};

const _global = globalThis as unknown as GlobalStore;

if (!_global.__tortugaBuzzerSubscriptions) {
  _global.__tortugaBuzzerSubscriptions = new Set();
}

export const subscribeToBuzzerState = (callback: SubscriptionCallback) => {
  _global.__tortugaBuzzerSubscriptions!.add(callback);
  return () => {
    _global.__tortugaBuzzerSubscriptions!.delete(callback);
  };
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
});

const startActiveTimer = (store: BuzzerState) => {
  store.roundOpenedAt = Date.now();
};

const stopActiveTimer = (store: BuzzerState) => {
  if (store.roundOpenedAt) {
    store.accumulatedTimeMs += (Date.now() - store.roundOpenedAt);
    store.roundOpenedAt = null;
  }
};

export const getBuzzerStore = (): BuzzerState => {
  if (!_global.__tortugaBuzzerState) {
    _global.__tortugaBuzzerState = getInitialState();
  }
  return _global.__tortugaBuzzerState;
};

export const calculatePoints = (timeMs: number): number => {
  const seconds = timeMs / 1000;
  if (seconds <= 3.0) return 20;
  if (seconds <= 5.0) return 17;
  if (seconds <= 8.0) return 14;
  if (seconds <= 12.0) return 11;
  if (seconds <= 20.0) return 8;
  return 5;
};

const notifyChange = () => {
  const store = getBuzzerStore();
  store.lastUpdateId = Math.random().toString(36).substring(7);
  _global.__tortugaBuzzerSubscriptions?.forEach((cb) => cb(store));
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
  store.status = "countdown";
  store.countdownStart = Date.now();
  store.roundEnded = false;
  store.currentResponderEntryId = null;
  notifyChange();

  setTimeout(() => {
    const currentStore = getBuzzerStore();
    if (currentStore.status === "countdown") {
      currentStore.status = "open";
      startActiveTimer(currentStore);
      currentStore.countdownStart = null;
      // Avvia la musica DOPO il countdown
      if (currentStore.youtubePlaylistId) {
        currentStore.youtubeStatus = "playing";
      }
      notifyChange();
    }
  }, 3000);
};

export const pauseBuzzer = () => {
  const store = getBuzzerStore();
  stopActiveTimer(store);
  store.status = "paused";
  notifyChange();
};

export const closeEntries = () => {
  const store = getBuzzerStore();
  stopActiveTimer(store);
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
  stopActiveTimer(store);
  store.status = "ended";
  store.roundEnded = true;
  store.leaderboardVisible = true;
  store.frozenLeaderboard = null;
  store.leaderboardRevealStep = null;
  notifyChange();
};

export const hideLeaderboard = () => {
  const store = getBuzzerStore();
  store.leaderboardVisible = false;
  store.leaderboardRevealStep = null;
  // Snapshot current leaderboard (without delta/movement from future changes)
  store.frozenLeaderboard = JSON.parse(JSON.stringify(store.leaderboard));
  notifyChange();
};

export const showLeaderboard = () => {
  const store = getBuzzerStore();
  store.leaderboardVisible = true;
  store.frozenLeaderboard = null;
  store.leaderboardRevealStep = null;
  notifyChange();
};

export const startLeaderboardReveal = () => {
  const store = getBuzzerStore();
  store.leaderboardVisible = true;
  store.frozenLeaderboard = null;
  store.leaderboardRevealStep = 1;
  notifyChange();
};

export const nextLeaderboardReveal = () => {
  const store = getBuzzerStore();
  if (store.leaderboardRevealStep !== null) {
    const totalTeams = store.leaderboard.length;
    store.leaderboardRevealStep += 1;
    // Se mancano 2 o meno squadre da svelare, svela tutto
    if (store.leaderboardRevealStep >= totalTeams - 1) {
      store.leaderboardRevealStep = null;
    }
  }
  notifyChange();
};

export const resetRound = () => {
  const store = getBuzzerStore();
  store.entries = [];
  store.currentResponderEntryId = null;
  store.roundEnded = false;
  store.accumulatedTimeMs = 0;
  store.leaderboardRevealStep = null;
  if (store.status === "open") {
    startActiveTimer(store);
  } else {
    store.roundOpenedAt = null;
  }
  notifyChange();
};

export const resetGame = () => {
  _global.__tortugaBuzzerState = getInitialState();
  notifyChange();
};

export const activateBuzzer = () => {
  const store = getBuzzerStore();
  store.isLive = true;
  notifyChange();
};

export const deactivateBuzzer = () => {
  const store = getBuzzerStore();
  store.isLive = false;
  notifyChange();
};

export const nextRound = () => {
  const store = getBuzzerStore();
  
  store.currentRound += 1;
  
  store.entries = [];
  store.status = "open";
  store.currentResponderEntryId = null;
  store.lastScoredEntry = null;
  store.countdownStart = null;
  store.roundEnded = false;
  store.accumulatedTimeMs = 0;
  store.leaderboardRevealStep = null;
  
  // Reset YouTube for new round if needed
  store.youtubeStatus = "playing";
  store.youtubeCommandId += 1; // Trigger next track automatically for next round
  
  startActiveTimer(store);
  notifyChange();
};

export const setYoutubePlaylist = (id: string) => {
  const store = getBuzzerStore();
  store.youtubePlaylistId = id;
  store.youtubeStatus = "stopped";
  store.youtubeCommandId += 1;
  notifyChange();
};

export const setYoutubeStatus = (status: "playing" | "paused" | "stopped", title?: string) => {
  const store = getBuzzerStore();
  store.youtubeStatus = status;
  if (title) store.youtubeVideoTitle = title;
  
  // Se la musica va...
  if (status === "playing") {
    if (
      store.status === "open" ||
      store.status === "ended" ||
      store.status === "closed" ||
      store.status === "countdown" ||
      store.status === "result_screen"
    ) {
      notifyChange();
      return;
    }
    
    // Altrimenti (pausa, idle, o risposta sbagliata), riapriamo i buzzer
    store.status = "open";
    store.countdownStart = null;
    startActiveTimer(store);
  }
  
  notifyChange();
};

export const triggerYoutubeCommand = (command: "next" | "prev" | "shuffle") => {
  const store = getBuzzerStore();

  if (command === "next") {
    // NUOVA CANZONE: Reset totale
    store.youtubeStatus = "playing";
    store.status = "open";
    store.entries = []; // Svuota la lista per il nuovo brano
    store.currentResponderEntryId = null;
    store.lastScoredEntry = null;
    store.countdownStart = null;
    startActiveTimer(store);
  }
  
  store.youtubeCommandId += 1;
  notifyChange();
};

export const assignScore = (email: string, points: number, result: BuzzerResult) => {
  const store = getBuzzerStore();
  
  // Find entry in current round
  const entry = store.entries.find(e => e.email === email && e.id === store.currentResponderEntryId);
  if (entry && !entry.scored) {
    entry.scored = true;
    entry.scoreAwarded = points;
    entry.result = result;
    store.lastScoredEntry = { ...entry };
  }

  // Update leaderboard
  const team = store.leaderboard.find(t => t.email === email);
  if (team) {
    team.totalPoints += points;
    team.totalAnswers += 1;
    updateRanks();
  }

  // Passa allo schermo dei risultati, se corretta facciamo andare il video
  store.status = "result_screen";
  if (result === "correct") {
    store.youtubeStatus = "playing";
  }
  notifyChange();

  setTimeout(() => {
    const currentStore = getBuzzerStore();
    // Allow progression if we are in result_screen
    if (currentStore.status !== "result_screen") return; 

    if (result === "wrong" && entry?.id === currentStore.currentResponderEntryId) {
      // Inizia il countdown per riaprire
      currentStore.status = "countdown";
      currentStore.countdownStart = Date.now();
      notifyChange();

      setTimeout(() => {
        const innerStore = getBuzzerStore();
        if (innerStore.status === "countdown") {
          innerStore.status = "open";
          startActiveTimer(innerStore);
          innerStore.currentResponderEntryId = null;
          innerStore.countdownStart = null;
          
          // AUTOPLAY: riavvia anche il video automaticamente
          innerStore.youtubeStatus = "playing";
          
          notifyChange();
        }
      }, 3000);
    }
  }, 4000); // 4 secondi per la risposta sbagliata
  
  if (result === "correct") {
    setTimeout(() => {
      const currentStore = getBuzzerStore();
      if (currentStore.status !== "result_screen") return; 

      // Dopo 10 secondi di result_screen per risposta corretta, chiudiamo il round,
      // e mostriamo la classifica lasciando il video in play.
      currentStore.status = "ended";
      currentStore.leaderboardVisible = true;
      currentStore.currentResponderEntryId = null;
      currentStore.lastScoredEntry = null;
      notifyChange();
    }, 10000); // 10 secondi di esultanza e musica
  }
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

export const kickTeam = (email: string) => {
  const store = getBuzzerStore();
  store.leaderboard = store.leaderboard.filter(t => t.email !== email);
  
  // Rimuovi anche la sua prenotazione se presente nel round corrente
  store.entries = store.entries.filter(e => e.email !== email);
  
  // Se stava rispondendo in questo momento
  if (store.currentResponderEntryId && store.entries.findIndex(e => e.id === store.currentResponderEntryId) === -1) {
    store.currentResponderEntryId = null;
    store.status = "open";
    startActiveTimer(store);
  }

  updateRanks();
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
  const entryId = `${store.currentRound}-${email}-${now}`;
  const relativeTime = store.accumulatedTimeMs + (now - store.roundOpenedAt);
  
  store.entries.push({
    id: entryId,
    roundId: store.currentRound,
    email: team.email,
    nickname: team.nickname,
    tableNumber: team.tableNumber,
    timestamp: now,
    relativeTimeMs: relativeTime,
    scored: false,
    result: null,
  });

  // Chiudi immediatamente il buzzer e imposta il responder
  stopActiveTimer(store);
  store.status = "closed";
  store.currentResponderEntryId = entryId;
  
  // Auto-pause YouTube
  store.youtubeStatus = "paused";

  notifyChange();
  return true;
};
