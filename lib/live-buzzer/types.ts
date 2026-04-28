export type GameStatus = "idle" | "open" | "paused" | "closed" | "ended";

export type BuzzerResult = "perfect" | "partial2" | "partial1" | "wrong";

export type Team = {
  email: string;
  tableNumber: string;
  nickname: string;
  totalPoints: number;
  totalAnswers: number;
  previousRank: number;
  rankDelta: number;
  movement: "up" | "down" | "same";
};

export type BuzzerEntry = {
  id: string;
  roundId: number;
  email: string;
  nickname: string;
  tableNumber: string;
  timestamp: number;
  relativeTimeMs: number;
  scored: boolean;
  scoreAwarded?: number;
  result?: BuzzerResult | null;
};

export type BuzzerState = {
  status: GameStatus;
  currentRound: number;
  roundOpenedAt: number | null;
  entries: BuzzerEntry[];
  leaderboard: Team[];
  userEntry?: BuzzerEntry | null;
  
  // Advanced Features
  currentResponderEntryId: string | null;
  leaderboardVisible: boolean;
  frozenLeaderboard: Team[] | null;
  roundEnded: boolean;
  lastUpdateId: string; // Unique ID to help client detect changes
};
