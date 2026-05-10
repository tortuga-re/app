export type GameStatus = "idle" | "open" | "paused" | "closed" | "ended" | "result_screen" | "countdown";

export type BuzzerResult = "correct" | "wrong";

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
  accumulatedTimeMs: number;
  entries: BuzzerEntry[];
  leaderboard: Team[];
  userEntry?: BuzzerEntry | null;
  
  // Advanced Features
  currentResponderEntryId: string | null;
  leaderboardVisible: boolean;
  leaderboardRevealStep: number | null;
  frozenLeaderboard: Team[] | null;
  roundEnded: boolean;
  leaderboardRevealFinished?: boolean;
  lastUpdateId: string | number; // Unique ID to help client detect changes
  countdownStart?: number | null;
  lastScoredEntry?: BuzzerEntry | null;
  isLive?: boolean;

  // YouTube Integration
  youtubePlaylistId: string | null;
  youtubePlaylistName?: string;
  youtubeStatus: "playing" | "paused" | "stopped";
  youtubeCurrentIndex: number;
  youtubeCommandId: number;
  youtubeCommandType?: "next" | "prev" | "shuffle" | null;
  youtubeVideoTitle?: string;
};
