export type CaptainChallengeOutcomeType = "false_start" | "win" | "lose";

export type CaptainChallengeOffer = {
  title: string;
  description: string;
  durationSeconds: number;
};

export type CaptainChallengeStartResponse = {
  gameId: string;
  explosionDelayMs: number;
};

export type CaptainChallengeTapInput = {
  gameId: string;
};

export type CaptainChallengeTapResponse = {
  outcome: string;
  outcomeType: CaptainChallengeOutcomeType;
  reactionTimeMs: number;
  offer: CaptainChallengeOffer | null;
  offerDurationSeconds: number;
};

export type CaptainChallengeRoundStatus = "open" | "closed";

export type CaptainChallengeRound = {
  gameId: string;
  startedAt: number;
  explosionDelayMs: number;
  status: CaptainChallengeRoundStatus;
  closedAt?: number;
};
